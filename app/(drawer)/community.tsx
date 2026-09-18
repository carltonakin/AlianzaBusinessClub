import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Users, Heart, MessageCircle, Plus, X, RefreshCw, Send } from 'lucide-react-native';
import { supabase } from '@/utils/supabase';
import { COLORS } from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { DrawerHeader } from '@/components/DrawerHeader';
import { MembershipGate } from '@/components/MembershipGate';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { ListItemSkeleton } from '@/components/SkeletonLoader';
import { CommunityPost } from '@/types';
import { timeAgo, getInitials } from '@/utils/helpers';

export default function CommunityScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [composeVisible, setComposeVisible] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const hasAccess = true;

  useEffect(() => {
    if (hasAccess) {
      fetchPosts();
      fetchLikedPosts();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasAccess]);

  const fetchPosts = async () => {
    console.log('[Community] Fetching community posts');
    setLoading(true);
    setError('');
    try {
      const { data, error: dbError } = await supabase
        .from('community_posts')
        .select('*, author:profiles(id, full_name, email, membership_tier, role, avatar_url, created_at, updated_at)')
        .eq('is_published', true)
        .order('created_at', { ascending: false });
      if (dbError) {
        console.error('[Community] DB error:', dbError.message);
        setError(dbError.message);
        return;
      }
      console.log('[Community] Fetched:', data?.length ?? 0, 'posts');
      setPosts((data as CommunityPost[]) || []);
    } catch (err: any) {
      console.error('[Community] Unexpected error:', err);
      setError('Failed to load community posts.');
    } finally {
      setLoading(false);
    }
  };

  const fetchLikedPosts = async () => {
    if (!profile?.id) return;
    console.log('[Community] Fetching liked posts for user:', profile.id);
    try {
      const { data } = await supabase
        .from('community_likes')
        .select('post_id')
        .eq('user_id', profile.id);
      if (data) {
        setLikedPosts(new Set(data.map((l: any) => l.post_id)));
      }
    } catch (err) {
      console.error('[Community] Error fetching likes:', err);
    }
  };

  const handleLike = async (post: CommunityPost) => {
    if (!profile?.id) return;
    const isLiked = likedPosts.has(post.id);
    console.log('[Community] Like button pressed for post:', post.id, 'currently liked:', isLiked);

    // Optimistic update
    const newLiked = new Set(likedPosts);
    const newPosts = posts.map((p) => {
      if (p.id !== post.id) return p;
      return { ...p, likes_count: isLiked ? p.likes_count - 1 : p.likes_count + 1 };
    });
    if (isLiked) {
      newLiked.delete(post.id);
    } else {
      newLiked.add(post.id);
    }
    setLikedPosts(newLiked);
    setPosts(newPosts);

    try {
      if (isLiked) {
        await supabase
          .from('community_likes')
          .delete()
          .eq('post_id', post.id)
          .eq('user_id', profile.id);
      } else {
        await supabase
          .from('community_likes')
          .insert({ post_id: post.id, user_id: profile.id });
      }
    } catch (err) {
      console.error('[Community] Error toggling like:', err);
      // Revert on error
      setLikedPosts(likedPosts);
      setPosts(posts);
    }
  };

  const handlePostPress = (post: CommunityPost) => {
    console.log('[Community] Post pressed:', post.id);
    router.push(`/(drawer)/community/${post.id}` as any);
  };

  const handleCompose = () => {
    console.log('[Community] Compose button pressed');
    setComposeVisible(true);
  };

  const handleSubmitPost = async () => {
    if (!newContent.trim() || !profile?.id) return;
    console.log('[Community] Submitting new post, title:', newTitle, 'content length:', newContent.length);
    setSubmitting(true);
    try {
      const { error: insertError } = await supabase.from('community_posts').insert({
        author_id: profile.id,
        title: newTitle.trim() || null,
        content: newContent.trim(),
      });
      if (insertError) {
        console.error('[Community] Insert error:', insertError.message);
        return;
      }
      console.log('[Community] Post submitted successfully');
      setNewTitle('');
      setNewContent('');
      setComposeVisible(false);
      fetchPosts();
    } catch (err) {
      console.error('[Community] Unexpected error submitting post:', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (!hasAccess) {
    return (
      <View style={styles.container}>
        <DrawerHeader title="AB Club - Community" />
        <MembershipGate featureName="Community Forum" />
      </View>
    );
  }

  const composeButton = (
    <Pressable
      onPress={handleCompose}
      style={styles.composeButton}
      hitSlop={8}
    >
      <Plus size={22} color={COLORS.primary} />
    </Pressable>
  );

  const renderPost = ({ item }: { item: CommunityPost }) => {
    const isLiked = likedPosts.has(item.id);
    const authorName = item.author?.full_name || item.author?.email || 'Member';
    const authorInitials = getInitials(item.author?.full_name, item.author?.email);
    const timeDisplay = timeAgo(item.created_at);

    return (
      <AnimatedPressable onPress={() => handlePostPress(item)} style={styles.postCard}>
        <View style={styles.postHeader}>
          <View style={styles.authorAvatar}>
            <Text style={styles.authorAvatarText}>{authorInitials}</Text>
          </View>
          <View style={styles.authorInfo}>
            <Text style={styles.authorName}>{authorName}</Text>
            <Text style={styles.postTime}>{timeDisplay}</Text>
          </View>
        </View>
        {item.title ? (
          <Text style={styles.postTitle}>{item.title}</Text>
        ) : null}
        <Text style={styles.postContent} numberOfLines={3}>{item.content}</Text>
        <View style={styles.postActions}>
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              handleLike(item);
            }}
            style={styles.actionButton}
            hitSlop={8}
          >
            <Heart
              size={18}
              color={isLiked ? COLORS.danger : COLORS.textTertiary}
              fill={isLiked ? COLORS.danger : 'transparent'}
            />
            <Text style={[styles.actionCount, isLiked && styles.actionCountLiked]}>
              {item.likes_count}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => handlePostPress(item)}
            style={styles.actionButton}
            hitSlop={8}
          >
            <MessageCircle size={18} color={COLORS.textTertiary} />
            <Text style={styles.actionCount}>{item.comments_count}</Text>
          </Pressable>
        </View>
      </AnimatedPressable>
    );
  };

  return (
    <View style={styles.container}>
      <DrawerHeader title="AB Club - Community" rightElement={composeButton} />

      {loading ? (
        <View style={styles.loadingContainer}>
          <ListItemSkeleton />
          <ListItemSkeleton />
          <ListItemSkeleton />
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <AnimatedPressable onPress={fetchPosts} style={styles.retryButton}>
            <RefreshCw size={16} color="#FFFFFF" />
            <Text style={styles.retryText}>Retry</Text>
          </AnimatedPressable>
        </View>
      ) : (
        <FlatList
          data={posts}
          renderItem={renderPost}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Users size={48} color={COLORS.textTertiary} />
              <Text style={styles.emptyTitle}>No Posts Yet</Text>
              <Text style={styles.emptySubtitle}>Be the first to post in the community!</Text>
              <AnimatedPressable onPress={handleCompose} style={styles.emptyButton}>
                <Text style={styles.emptyButtonText}>Create Post</Text>
              </AnimatedPressable>
            </View>
          }
        />
      )}

      {/* Compose Modal */}
      <Modal
        visible={composeVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          console.log('[Community] Compose modal closed');
          setComposeVisible(false);
        }}
      >
        <KeyboardAvoidingView
          style={styles.modalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>New Post</Text>
            <Pressable
              onPress={() => {
                console.log('[Community] Close compose modal pressed');
                setComposeVisible(false);
              }}
              hitSlop={8}
            >
              <X size={22} color={COLORS.text} />
            </Pressable>
          </View>
          <View style={styles.modalBody}>
            <TextInput
              style={styles.titleInput}
              value={newTitle}
              onChangeText={setNewTitle}
              placeholder="Title (optional)"
              placeholderTextColor={COLORS.textTertiary}
            />
            <TextInput
              style={styles.contentInput}
              value={newContent}
              onChangeText={setNewContent}
              placeholder="What's on your mind?"
              placeholderTextColor={COLORS.textTertiary}
              multiline
              textAlignVertical="top"
            />
          </View>
          <View style={styles.modalFooter}>
            <AnimatedPressable
              onPress={handleSubmitPost}
              disabled={!newContent.trim() || submitting}
              style={[styles.submitButton, (!newContent.trim() || submitting) && styles.submitButtonDisabled]}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Send size={16} color="#FFFFFF" />
                  <Text style={styles.submitButtonText}>Post</Text>
                </>
              )}
            </AnimatedPressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  composeButton: {
    padding: 4,
    borderRadius: 8,
  },
  loadingContainer: {
    padding: 16,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  postCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  authorAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  authorAvatarText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: 'Outfit_700Bold',
  },
  authorInfo: {
    flex: 1,
  },
  authorName: {
    fontSize: 14,
    fontFamily: 'Outfit_600SemiBold',
    color: COLORS.text,
  },
  postTime: {
    fontSize: 12,
    fontFamily: 'Outfit_400Regular',
    color: COLORS.textTertiary,
  },
  postTitle: {
    fontSize: 15,
    fontFamily: 'Outfit_700Bold',
    color: COLORS.text,
    marginBottom: 6,
  },
  postContent: {
    fontSize: 14,
    fontFamily: 'Outfit_400Regular',
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  postActions: {
    flexDirection: 'row',
    gap: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
    paddingTop: 10,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  actionCount: {
    fontSize: 13,
    fontFamily: 'Outfit_500Medium',
    color: COLORS.textTertiary,
  },
  actionCountLiked: {
    color: COLORS.danger,
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
  emptyButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: 8,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Outfit_600SemiBold',
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
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Outfit_700Bold',
    color: COLORS.text,
  },
  modalBody: {
    flex: 1,
    padding: 20,
    gap: 12,
  },
  titleInput: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: 'Outfit_500Medium',
    color: COLORS.text,
  },
  contentInput: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: 'Outfit_400Regular',
    color: COLORS.text,
    minHeight: 120,
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 14,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Outfit_600SemiBold',
  },
});
