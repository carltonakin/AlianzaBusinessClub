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
import { TrainingPost } from '@/types';

export default function TrainingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [post, setPost] = useState<TrainingPost | null>(null);
  const [loading, setLoading] = useState(true);

  const player = useVideoPlayer(post?.video_url ?? null, (p) => {
    p.loop = false;
  });

  useEffect(() => {
    if (id) fetchPost();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchPost = async () => {
    console.log('[TrainingDetail] Fetching post id:', id);
    try {
      const { data, error } = await supabase
        .from('training_posts')
        .select('*')
        .eq('id', id)
        .single();
      if (error) {
        console.error('[TrainingDetail] DB error:', error.message);
        return;
      }
      console.log('[TrainingDetail] Post loaded:', data?.title);
      setPost(data as TrainingPost);
    } catch (err) {
      console.error('[TrainingDetail] Unexpected error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    console.log('[TrainingDetail] Back button pressed');
    router.back();
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!post) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
        <Text style={styles.errorText}>Post not found.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Stack Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <AnimatedPressable onPress={handleBack} style={styles.backButton}>
          <ArrowLeft size={22} color={COLORS.text} />
        </AnimatedPressable>
        <Text style={styles.headerTitle} numberOfLines={1}>{post.title}</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Video Player */}
        {post.video_url ? (
          <VideoView
            player={player}
            style={styles.video}
            allowsFullscreen
            allowsPictureInPicture
          />
        ) : null}

        <View style={styles.content}>
          {post.category ? (
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeText}>{post.category}</Text>
            </View>
          ) : null}
          <Text style={styles.title}>{post.title}</Text>
          {post.description ? (
            <Text style={styles.description}>{post.description}</Text>
          ) : null}
          {post.content ? (
            <View style={styles.contentSection}>
              <Text style={styles.contentSectionTitle}>About this training</Text>
              <Text style={styles.contentText}>{post.content}</Text>
            </View>
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
  categoryBadge: {
    backgroundColor: COLORS.primaryMuted,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  categoryBadgeText: {
    color: COLORS.primary,
    fontSize: 12,
    fontFamily: 'Outfit_600SemiBold',
  },
  title: {
    fontSize: 22,
    fontFamily: 'Outfit_700Bold',
    color: COLORS.text,
    marginBottom: 10,
    lineHeight: 30,
  },
  description: {
    fontSize: 15,
    fontFamily: 'Outfit_400Regular',
    color: COLORS.textSecondary,
    lineHeight: 22,
    marginBottom: 20,
  },
  contentSection: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  contentSectionTitle: {
    fontSize: 15,
    fontFamily: 'Outfit_600SemiBold',
    color: COLORS.text,
    marginBottom: 10,
  },
  contentText: {
    fontSize: 14,
    fontFamily: 'Outfit_400Regular',
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
});
