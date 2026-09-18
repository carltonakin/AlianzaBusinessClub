import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  ImageSourcePropType,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { Video, RefreshCw, Calendar, Play } from 'lucide-react-native';
import { supabase } from '@/utils/supabase';
import { COLORS } from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { DrawerHeader } from '@/components/DrawerHeader';
import { MembershipGate } from '@/components/MembershipGate';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { CardSkeleton } from '@/components/SkeletonLoader';
import { Webinar } from '@/types';
import { formatEventDate } from '@/utils/helpers';

function resolveImageSource(source: string | number | ImageSourcePropType | null | undefined): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

export default function WebinarsScreen() {
  const { profile } = useAuth();
  const [webinars, setWebinars] = useState<Webinar[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const isPaid = profile?.membership_tier === 'paid';
  const isAdmin = profile?.role === 'admin';
  const hasAccess = isPaid || isAdmin;

  useEffect(() => {
    if (hasAccess) fetchWebinars();
  }, [hasAccess]);

  const fetchWebinars = async () => {
    console.log('[Webinars] Fetching webinars');
    setLoading(true);
    setError('');
    try {
      const { data, error: dbError } = await supabase
        .from('webinars')
        .select('*')
        .eq('is_published', true)
        .order('webinar_date', { ascending: false });
      if (dbError) {
        console.error('[Webinars] DB error:', dbError.message);
        setError(dbError.message);
        return;
      }
      console.log('[Webinars] Fetched:', data?.length ?? 0, 'webinars');
      setWebinars((data as Webinar[]) || []);
    } catch (err: any) {
      console.error('[Webinars] Unexpected error:', err);
      setError('Failed to load webinars.');
    } finally {
      setLoading(false);
    }
  };

  if (!hasAccess) {
    return (
      <View style={styles.container}>
        <DrawerHeader title="Webinars" />
        <MembershipGate featureName="Live Webinars" />
      </View>
    );
  }

  const upcoming = webinars.filter((w) => !w.is_recorded);
  const recorded = webinars.filter((w) => w.is_recorded);

  const handleRegister = async (webinar: Webinar) => {
    console.log('[Webinars] Register pressed for:', webinar.title, 'URL:', webinar.webinar_url);
    if (webinar.webinar_url) {
      await WebBrowser.openBrowserAsync(webinar.webinar_url);
    }
  };

  const handleWatchRecording = async (webinar: Webinar) => {
    console.log('[Webinars] Watch recording pressed for:', webinar.title, 'URL:', webinar.recording_url);
    if (webinar.recording_url) {
      await WebBrowser.openBrowserAsync(webinar.recording_url);
    }
  };

  const renderUpcoming = ({ item }: { item: Webinar }) => {
    const dateDisplay = item.webinar_date ? formatEventDate(item.webinar_date) : 'TBD';
    return (
      <View style={styles.card}>
        {item.thumbnail_url ? (
          <Image source={resolveImageSource(item.thumbnail_url)} style={styles.thumbnail} />
        ) : null}
        <View style={styles.cardBody}>
          <View style={styles.upcomingBadge}>
            <Calendar size={11} color={COLORS.primary} />
            <Text style={styles.upcomingBadgeText}>Upcoming</Text>
          </View>
          <Text style={styles.cardTitle}>{item.title}</Text>
          {item.description ? (
            <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>
          ) : null}
          <View style={styles.metaRow}>
            <Calendar size={14} color={COLORS.textTertiary} />
            <Text style={styles.metaText}>{dateDisplay}</Text>
          </View>
          {item.webinar_url ? (
            <AnimatedPressable
              onPress={() => handleRegister(item)}
              style={styles.actionButton}
            >
              <Text style={styles.actionButtonText}>Register Now</Text>
            </AnimatedPressable>
          ) : null}
        </View>
      </View>
    );
  };

  const renderRecorded = ({ item }: { item: Webinar }) => (
    <View style={styles.card}>
      {item.thumbnail_url ? (
        <View style={styles.thumbnailContainer}>
          <Image source={resolveImageSource(item.thumbnail_url)} style={styles.thumbnail} />
          <View style={styles.playOverlay}>
            <View style={styles.playButton}>
              <Play size={20} color="#FFFFFF" fill="#FFFFFF" />
            </View>
          </View>
        </View>
      ) : null}
      <View style={styles.cardBody}>
        <View style={styles.recordedBadge}>
          <Play size={11} color={COLORS.success} />
          <Text style={styles.recordedBadgeText}>Recorded</Text>
        </View>
        <Text style={styles.cardTitle}>{item.title}</Text>
        {item.description ? (
          <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>
        ) : null}
        {item.recording_url ? (
          <AnimatedPressable
            onPress={() => handleWatchRecording(item)}
            style={[styles.actionButton, styles.watchButton]}
          >
            <Play size={14} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Watch Recording</Text>
          </AnimatedPressable>
        ) : null}
      </View>
    </View>
  );

  const allItems = [
    ...(upcoming.length > 0 ? [{ type: 'header', label: 'Upcoming', id: 'header-upcoming' }] : []),
    ...upcoming.map((w) => ({ type: 'upcoming', ...w })),
    ...(recorded.length > 0 ? [{ type: 'header', label: 'Recorded', id: 'header-recorded' }] : []),
    ...recorded.map((w) => ({ type: 'recorded', ...w })),
  ];

  const renderItem = ({ item }: { item: any }) => {
    if (item.type === 'header') {
      return <Text style={styles.sectionHeader}>{item.label}</Text>;
    }
    if (item.type === 'upcoming') return renderUpcoming({ item });
    if (item.type === 'recorded') return renderRecorded({ item });
    return null;
  };

  return (
    <View style={styles.container}>
      <DrawerHeader title="Webinars" />
      {loading ? (
        <View style={styles.loadingContainer}>
          <CardSkeleton />
          <CardSkeleton />
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <AnimatedPressable onPress={fetchWebinars} style={styles.retryButton}>
            <RefreshCw size={16} color="#FFFFFF" />
            <Text style={styles.retryText}>Retry</Text>
          </AnimatedPressable>
        </View>
      ) : (
        <FlatList
          data={allItems}
          renderItem={renderItem}
          keyExtractor={(item) => item.id || item.label}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Video size={48} color={COLORS.textTertiary} />
              <Text style={styles.emptyTitle}>No Webinars Yet</Text>
              <Text style={styles.emptySubtitle}>Webinars will appear here.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    padding: 16,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  sectionHeader: {
    fontSize: 18,
    fontFamily: 'Outfit_700Bold',
    color: COLORS.text,
    marginBottom: 14,
    marginTop: 8,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  thumbnailContainer: {
    position: 'relative',
  },
  thumbnail: {
    width: '100%',
    height: 180,
    backgroundColor: COLORS.surfaceSecondary,
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  playButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: {
    padding: 16,
  },
  upcomingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primaryMuted,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  upcomingBadgeText: {
    color: COLORS.primary,
    fontSize: 11,
    fontFamily: 'Outfit_600SemiBold',
  },
  recordedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16,185,129,0.1)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  recordedBadgeText: {
    color: COLORS.success,
    fontSize: 11,
    fontFamily: 'Outfit_600SemiBold',
  },
  cardTitle: {
    fontSize: 17,
    fontFamily: 'Outfit_700Bold',
    color: COLORS.text,
    marginBottom: 6,
  },
  cardDesc: {
    fontSize: 14,
    fontFamily: 'Outfit_400Regular',
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  metaText: {
    fontSize: 13,
    fontFamily: 'Outfit_400Regular',
    color: COLORS.textSecondary,
  },
  actionButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  watchButton: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Outfit_600SemiBold',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'Outfit_700Bold',
    color: COLORS.text,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: 'Outfit_400Regular',
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 32,
  },
  errorText: {
    fontSize: 14,
    fontFamily: 'Outfit_400Regular',
    color: COLORS.danger,
    textAlign: 'center',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Outfit_600SemiBold',
  },
});
