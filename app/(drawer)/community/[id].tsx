import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Send, Heart, MessageCircle } from 'lucide-react-native';
import { supabase } from '@/utils/supabase';
import { COLORS } from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { CommunityPost, CommunityComment } from '@/types';
import { timeAgo, getInitials } from '@/utils/helpers';

export default function CommunityPostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const [post, setPost] = useState<CommunityPost | null>(null);
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isLiked, setIsLiked] = useState(false);

  useEffect(() => {
    if (id) {
      fetchPost();
      fetchComments();
      checkLiked();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchPost = async () => {
    console.log('[CommunityDetail] Fetching post id:', id);
    try {
      const { data, error } = await supabase
        .from('community_posts')
        .select('*, author:profiles(id, full_name, email, membership_tier, role, avatar_url, created_at, updated_at)')
        .eq('id', id)
        .single();
      if (error) {
        console.error('[CommunityDetail] DB error:', error.message);
        return;
      }
      console.log('[CommunityDetail] Post loaded');
      setPost(data as CommunityPost);
    } catch (err) {
      console.error('[CommunityDetail] Unexpected error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async () => {
    console.log('[CommunityDetail] Fetching comments for post:', id);
    try {
      const { data, error } = await supabase
        .from('community_comments')
        .select('*, author:profiles(id, full_name, email, membership_tier, role, avatar_url, created_at, updated_at)')
        .eq('post_id', id)
        .order('created_at');
      if (error) {
        console.error('[CommunityDetail] Comments error:', error.message);
        return;
      }
      console.log('[CommunityDetail] Fetched:', data?.length ?? 0, 'comments');
      setComments((data as CommunityComment[]) || []);
    } catch (err) {
      console.error('[CommunityDetail] Unexpected error fetching comments:', err);
    }
  };

  const checkLiked = async () => {
    if (!profile?.id) return;
    const { data } = await supabase
      .from('community_likes')
      .select('id')
      .eq('post_id', id)
      .eq('user_id', profile.id)
      .single();
    setIsLiked(!!data);
  };

  const handleLike = async () => {
    if (!profile?.id || !post) return;
    console.log('[CommunityDetail] Like button pressed, currently liked:', isLiked);
    const newLiked = !isLiked;
    setIsLiked(newLiked);
    setPost({ ...post, likes_count: newLiked ? post.likes_count + 1 : post.likes_count - 1 });
    try {
      if (isLiked) {
        await supabase.from('community_likes').delete().eq('post_id', id).eq('user_id', profile.id);
      } else {
        await supabase.from('community_likes').insert({ post_id: id, user_id: profile.id });
      }
    } catch (err) {
      console.error('[CommunityDetail] Error toggling like:', err);
      setIsLiked(isLiked);
      setPost(post);
    }
  };

  const handleSubmitComment = async () => {
    if (!commentText.trim() || !profile?.id) return;
    console.log('[CommunityDetail] Submitting comment, length:', commentText.length);
    setSubmitting(true);
    try {
      const { error } = await supabase.from('community_comments').insert({
        post_id: id,
        author_id: profile.id,
        content: commentText.trim(),
      });
      if (error) {
        console.error('[CommunityDetail] Comment insert error:', error.message);
        return;
      }
      console.log('[CommunityDetail] Comment submitted successfully');
      setCommentText('');
      fetchComments();
    } catch (err) {
      console.error('[CommunityDetail] Unexpected error submitting comment:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleBack = () => {
    console.log('[CommunityDetail] Back button pressed');
    router.back();
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const authorName = post?.author?.full_name || post?.author?.email || 'Member';
  const authorInitials = getInitials(post?.author?.full_name, post?.author?.email);
  const timeDisplay = post ? timeAgo(post.created_at) : '';

  const renderComment = ({ item }: { item: CommunityComment }) => {
    const commentAuthorName = item.author?.full_name || item.author?.email || 'Member';
    const commentInitials = getInitials(item.author?.full_name, item.author?.email);
    const commentTime = timeAgo(item.created_at);
    return (
      <View style={styles.commentCard}>
        <View style={styles.commentAvatar}>
          <Text style={styles.commentAvatarText}>{commentInitials}</Text>
        </View>
        <View style={styles.commentBody}>
          <View style={styles.commentHeader}>
            <Text style={styles.commentAuthor}>{commentAuthorName}</Text>
            <Text style={styles.commentTime}>{commentTime}</Text>
          </View>
          <Text style={styles.commentContent}>{item.content}</Text>
        </View>
      </View>
    );
  };

  const ListHeader = () => (
    <View>
      {/* Post */}
      {post ? (
        <View style={styles.postCard}>
          <View style={styles.postHeader}>
            <View style={styles.authorAvatar}>
              <Text style={styles.authorAvatarText}>{authorInitials}</Text>
            </View>
            <View style={styles.authorInfo}>
              <Text style={styles.authorName}>{authorName}</Text>
              <Text style={styles.postTime}>{timeDisplay}</Text>
            </View>
          </View>
          {post.title ? (
            <Text style={styles.postTitle}>{post.title}</Text>
          ) : null}
          <Text style={styles.postContent}>{post.content}</Text>
          <View style={styles.postActions}>
            <Pressable onPress={handleLike} style={styles.actionBtn} hitSlop={8}>
              <Heart
                size={18}
                color={isLiked ? COLORS.danger : COLORS.textTertiary}
                fill={isLiked ? COLORS.danger : 'transparent'}
              />
              <Text style={[styles.actionCount, isLiked && styles.actionCountLiked]}>
                {post.likes_count}
              </Text>
            </Pressable>
            <View style={styles.actionBtn}>
              <MessageCircle size={18} color={COLORS.textTertiary} />
              <Text style={styles.actionCount}>{comments.length}</Text>
            </View>
          </View>
        </View>
      ) : null}

      {/* Comments header */}
      <Text style={styles.commentsHeader}>
        Comments ({comments.length})
      </Text>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <AnimatedPressable onPress={handleBack} style={styles.backButton}>
          <ArrowLeft size={22} color={COLORS.text} />
        </AnimatedPressable>
        <Text style={styles.headerTitle}>Post</Text>
      </View>

      <FlatList
        data={comments}
        renderItem={renderComment}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={<ListHeader />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.noComments}>
            <Text style={styles.noCommentsText}>No comments yet. Be the first!</Text>
          </View>
        }
      />

      {/* Comment Input */}
      <View style={[styles.inputBar, { paddingBottom: insets.bottom + 8 }]}>
        <TextInput
          style={styles.commentInput}
          value={commentText}
          onChangeText={setCommentText}
          placeholder="Write a comment..."
          placeholderTextColor={COLORS.textTertiary}
          multiline
        />
        <AnimatedPressable
          onPress={handleSubmitComment}
          disabled={!commentText.trim() || submitting}
          style={[styles.sendButton, (!commentText.trim() || submitting) && styles.sendButtonDisabled]}
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Send size={18} color="#FFFFFF" />
          )}
        </AnimatedPressable>
      </View>
    </KeyboardAvoidingView>
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
  listContent: {
    padding: 16,
    paddingBottom: 20,
  },
  postCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  authorAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  authorAvatarText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'Outfit_700Bold',
  },
  authorInfo: {
    flex: 1,
  },
  authorName: {
    fontSize: 15,
    fontFamily: 'Outfit_600SemiBold',
    color: COLORS.text,
  },
  postTime: {
    fontSize: 12,
    fontFamily: 'Outfit_400Regular',
    color: COLORS.textTertiary,
  },
  postTitle: {
    fontSize: 18,
    fontFamily: 'Outfit_700Bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  postContent: {
    fontSize: 15,
    fontFamily: 'Outfit_400Regular',
    color: COLORS.textSecondary,
    lineHeight: 22,
    marginBottom: 14,
  },
  postActions: {
    flexDirection: 'row',
    gap: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
    paddingTop: 12,
  },
  actionBtn: {
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
  commentsHeader: {
    fontSize: 16,
    fontFamily: 'Outfit_700Bold',
    color: COLORS.text,
    marginBottom: 12,
  },
  commentCard: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  commentAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  commentAvatarText: {
    color: COLORS.primary,
    fontSize: 12,
    fontFamily: 'Outfit_700Bold',
  },
  commentBody: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  commentAuthor: {
    fontSize: 13,
    fontFamily: 'Outfit_600SemiBold',
    color: COLORS.text,
  },
  commentTime: {
    fontSize: 11,
    fontFamily: 'Outfit_400Regular',
    color: COLORS.textTertiary,
  },
  commentContent: {
    fontSize: 14,
    fontFamily: 'Outfit_400Regular',
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  noComments: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  noCommentsText: {
    fontSize: 14,
    fontFamily: 'Outfit_400Regular',
    color: COLORS.textTertiary,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  commentInput: {
    flex: 1,
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: 'Outfit_400Regular',
    color: COLORS.text,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});
