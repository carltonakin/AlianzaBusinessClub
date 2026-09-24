import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  ImageSourcePropType,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Mic, RefreshCw } from 'lucide-react-native';
import { supabase } from '@/utils/supabase';
import { COLORS } from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { DrawerHeader } from '@/components/DrawerHeader';
import { MembershipGate } from '@/components/MembershipGate';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { CardSkeleton } from '@/components/SkeletonLoader';
import { Interview } from '@/types';
import { getInitials } from '@/utils/helpers';

function resolveImageSource(source: string | number | ImageSourcePropType | null | undefined): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

export default function InterviewsScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const hasAccess = profile?.membership_tier === 'paid';

  useEffect(() => {
    if (hasAccess) fetchInterviews();
  }, [hasAccess]);

  const fetchInterviews = async () => {
    console.log('[Interviews] Fetching interviews');
    setLoading(true);
    setError('');
    try {
      const { data, error: dbError } = await supabase
        .from('interviews')
        .select('*')
        .eq('is_published', true)
        .order('created_at', { ascending: false });
      if (dbError) {
        console.error('[Interviews] DB error:', dbError.message);
        setError(dbError.message);
        return;
      }
      console.log('[Interviews] Fetched:', data?.length ?? 0, 'interviews');
      setInterviews((data as Interview[]) || []);
    } catch (err: any) {
      console.error('[Interviews] Unexpected error:', err);
      setError('Failed to load interviews.');
    } finally {
      setLoading(false);
    }
  };

  if (!hasAccess) {
    return (
      <View style={styles.container}>
        <DrawerHeader title="AB Club - Interviews" />
        <MembershipGate featureName="Expert Interviews" />
      </View>
    );
  }

  const handleInterviewPress = (item: Interview) => {
    console.log('[Interviews] Interview pressed:', item.title, 'id:', item.id);
    router.push(`/(drawer)/interviews/${item.id}` as any);
  };

  const renderInterview = ({ item }: { item: Interview }) => {
    const guestInitials = getInitials(item.guest_name);
    return (
      <AnimatedPressable
        onPress={() => handleInterviewPress(item)}
        style={styles.card}
      >
        <Image source={resolveImageSource(item.thumbnail_url)} style={styles.thumbnail} />
        <View style={styles.cardBody}>
          <View style={styles.guestRow}>
            <View style={styles.guestAvatar}>
              <Text style={styles.guestAvatarText}>{guestInitials}</Text>
            </View>
            <View style={styles.guestInfo}>
              <Text style={styles.guestName}>{item.guest_name}</Text>
              <Text style={styles.guestTitle}>{item.guest_title}</Text>
            </View>
          </View>
          <Text style={styles.interviewTitle} numberOfLines={2}>{item.title}</Text>
          {item.description ? (
            <Text style={styles.interviewDesc} numberOfLines={2}>{item.description}</Text>
          ) : null}
        </View>
      </AnimatedPressable>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Mic size={48} color={COLORS.textTertiary} />
      <Text style={styles.emptyTitle}>No Interviews Yet</Text>
      <Text style={styles.emptySubtitle}>Expert interviews will appear here.</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <DrawerHeader title="AB Club - Interviews" />
      {loading ? (
        <View style={styles.loadingContainer}>
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <AnimatedPressable onPress={fetchInterviews} style={styles.retryButton}>
            <RefreshCw size={16} color="#FFFFFF" />
            <Text style={styles.retryText}>Retry</Text>
          </AnimatedPressable>
        </View>
      ) : (
        <FlatList
          data={interviews}
          renderItem={renderInterview}
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
  thumbnail: {
    width: '100%',
    height: 180,
    backgroundColor: COLORS.surfaceSecondary,
  },
  cardBody: {
    padding: 16,
  },
  guestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  guestAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guestAvatarText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Outfit_700Bold',
  },
  guestInfo: {
    flex: 1,
  },
  guestName: {
    fontSize: 14,
    fontFamily: 'Outfit_600SemiBold',
    color: COLORS.text,
  },
  guestTitle: {
    fontSize: 12,
    fontFamily: 'Outfit_400Regular',
    color: COLORS.textTertiary,
  },
  interviewTitle: {
    fontSize: 16,
    fontFamily: 'Outfit_700Bold',
    color: COLORS.text,
    marginBottom: 6,
    lineHeight: 22,
  },
  interviewDesc: {
    fontSize: 13,
    fontFamily: 'Outfit_400Regular',
    color: COLORS.textSecondary,
    lineHeight: 19,
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
