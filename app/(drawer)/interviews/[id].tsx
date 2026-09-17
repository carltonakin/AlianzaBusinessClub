import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { supabase } from '@/utils/supabase';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { Interview } from '@/types';
import { getInitials } from '@/utils/helpers';

export default function InterviewDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [interview, setInterview] = useState<Interview | null>(null);
  const [loading, setLoading] = useState(true);

  const player = useVideoPlayer(interview?.video_url ?? null, (p) => {
    p.loop = false;
  });

  useEffect(() => {
    if (id) fetchInterview();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchInterview = async () => {
    console.log('[InterviewDetail] Fetching interview id:', id);
    try {
      const { data, error } = await supabase
        .from('interviews')
        .select('*')
        .eq('id', id)
        .single();
      if (error) {
        console.error('[InterviewDetail] DB error:', error.message);
        return;
      }
      console.log('[InterviewDetail] Interview loaded:', data?.title);
      setInterview(data as Interview);
    } catch (err) {
      console.error('[InterviewDetail] Unexpected error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    console.log('[InterviewDetail] Back button pressed');
    router.back();
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!interview) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
        <Text style={styles.errorText}>Interview not found.</Text>
      </View>
    );
  }

  const guestInitials = getInitials(interview.guest_name);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <AnimatedPressable onPress={handleBack} style={styles.backButton}>
          <ArrowLeft size={22} color={COLORS.text} />
        </AnimatedPressable>
        <Text style={styles.headerTitle} numberOfLines={1}>Interview</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Video */}
        {interview.video_url ? (
          <VideoView
            player={player}
            style={styles.video}
            allowsFullscreen
            allowsPictureInPicture
          />
        ) : null}

        <View style={styles.content}>
          {/* Guest Info */}
          <View style={styles.guestCard}>
            <View style={styles.guestAvatar}>
              <Text style={styles.guestAvatarText}>{guestInitials}</Text>
            </View>
            <View style={styles.guestInfo}>
              <Text style={styles.guestName}>{interview.guest_name}</Text>
              <Text style={styles.guestTitle}>{interview.guest_title}</Text>
            </View>
          </View>

          <Text style={styles.title}>{interview.title}</Text>
          {interview.description ? (
            <Text style={styles.description}>{interview.description}</Text>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
  },
  errorText: {
    fontSize: 16,
    fontFamily: 'Outfit_400Regular',
    color: COLORS.textSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 12,
  },
  backButton: {
    padding: 4,
    borderRadius: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontFamily: 'Outfit_600SemiBold',
    color: COLORS.text,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  video: {
    width: '100%',
    height: 220,
    backgroundColor: '#000000',
  },
  content: {
    padding: 20,
  },
  guestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  guestAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guestAvatarText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontFamily: 'Outfit_700Bold',
  },
  guestInfo: {
    flex: 1,
  },
  guestName: {
    fontSize: 17,
    fontFamily: 'Outfit_700Bold',
    color: COLORS.text,
    marginBottom: 3,
  },
  guestTitle: {
    fontSize: 13,
    fontFamily: 'Outfit_400Regular',
    color: COLORS.textSecondary,
  },
  title: {
    fontSize: 22,
    fontFamily: 'Outfit_700Bold',
    color: COLORS.text,
    marginBottom: 12,
    lineHeight: 30,
  },
  description: {
    fontSize: 15,
    fontFamily: 'Outfit_400Regular',
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
});
