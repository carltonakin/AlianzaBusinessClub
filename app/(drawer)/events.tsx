import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  ImageSourcePropType,
  ActivityIndicator,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { Calendar, MapPin, Wifi, RefreshCw } from 'lucide-react-native';
import { supabase } from '@/utils/supabase';
import { COLORS } from '@/constants/Colors';
import { DrawerHeader } from '@/components/DrawerHeader';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { CardSkeleton } from '@/components/SkeletonLoader';
import { Event } from '@/types';
import { formatEventDate } from '@/utils/helpers';

function resolveImageSource(source: string | number | ImageSourcePropType | null | undefined): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

export default function EventsScreen() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    console.log('[Events] Fetching events');
    setLoading(true);
    setError('');
    try {
      const { data, error: dbError } = await supabase
        .from('events')
        .select('*')
        .eq('is_published', true)
        .order('event_date');
      if (dbError) {
        console.error('[Events] DB error:', dbError.message);
        setError(dbError.message);
        return;
      }
      console.log('[Events] Fetched:', data?.length ?? 0, 'events');
      setEvents((data as Event[]) || []);
    } catch (err: any) {
      console.error('[Events] Unexpected error:', err);
      setError('Failed to load events.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (event: Event) => {
    console.log('[Events] Register pressed for event:', event.title, 'URL:', event.event_url);
    if (event.event_url) {
      await WebBrowser.openBrowserAsync(event.event_url);
    }
  };

  const renderEvent = ({ item, index }: { item: Event; index: number }) => {
    const dateDisplay = formatEventDate(item.event_date);
    return (
      <View style={styles.card}>
        <Image source={resolveImageSource(item.image_url)} style={styles.cardImage} />
        <View style={styles.cardBody}>
          <View style={styles.badgeRow}>
            {item.is_virtual ? (
              <View style={styles.virtualBadge}>
                <Wifi size={11} color="#FFFFFF" />
                <Text style={styles.virtualBadgeText}>Virtual</Text>
              </View>
            ) : (
              <View style={styles.inPersonBadge}>
                <MapPin size={11} color={COLORS.primary} />
                <Text style={styles.inPersonBadgeText}>In Person</Text>
              </View>
            )}
          </View>
          <Text style={styles.cardTitle}>{item.title}</Text>
          {item.description ? (
            <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>
          ) : null}
          <View style={styles.metaRow}>
            <Calendar size={14} color={COLORS.textTertiary} />
            <Text style={styles.metaText}>{dateDisplay}</Text>
          </View>
          {item.location ? (
            <View style={styles.metaRow}>
              <MapPin size={14} color={COLORS.textTertiary} />
              <Text style={styles.metaText}>{item.location}</Text>
            </View>
          ) : null}
          {item.event_url ? (
            <AnimatedPressable
              onPress={() => handleRegister(item)}
              style={styles.registerButton}
            >
              <Text style={styles.registerButtonText}>Register Now</Text>
            </AnimatedPressable>
          ) : null}
        </View>
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Calendar size={48} color={COLORS.textTertiary} />
      <Text style={styles.emptyTitle}>No Events Yet</Text>
      <Text style={styles.emptySubtitle}>Check back soon for upcoming events.</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <DrawerHeader title="Events" />
      {loading ? (
        <View style={styles.loadingContainer}>
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <AnimatedPressable onPress={fetchEvents} style={styles.retryButton}>
            <RefreshCw size={16} color="#FFFFFF" />
            <Text style={styles.retryText}>Retry</Text>
          </AnimatedPressable>
        </View>
      ) : (
        <FlatList
          data={events}
          renderItem={renderEvent}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmpty}
          showsVerticalScrollIndicator={false}
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
  cardImage: {
    width: '100%',
    height: 180,
    backgroundColor: COLORS.surfaceSecondary,
  },
  cardBody: {
    padding: 16,
  },
  badgeRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  virtualBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primary,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  virtualBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontFamily: 'Outfit_600SemiBold',
  },
  inPersonBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primaryMuted,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  inPersonBadgeText: {
    color: COLORS.primary,
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
    marginBottom: 6,
  },
  metaText: {
    fontSize: 13,
    fontFamily: 'Outfit_400Regular',
    color: COLORS.textSecondary,
  },
  registerButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  registerButtonText: {
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
