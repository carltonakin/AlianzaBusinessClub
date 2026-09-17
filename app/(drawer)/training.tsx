import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { GraduationCap, RefreshCw } from 'lucide-react-native';
import { supabase } from '@/utils/supabase';
import { COLORS } from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { DrawerHeader } from '@/components/DrawerHeader';
import { MembershipGate } from '@/components/MembershipGate';
import { ContentCard } from '@/components/ContentCard';
import { CardSkeleton } from '@/components/SkeletonLoader';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { TrainingPost } from '@/types';

const CATEGORIES = ['All', 'Sales', 'Marketing', 'Social Media'];

export default function TrainingScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const [posts, setPosts] = useState<TrainingPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const isPaid = profile?.membership_tier === 'paid';

  useEffect(() => {
    if (isPaid) fetchPosts();
  }, [isPaid]);

  const fetchPosts = async () => {
    console.log('[Training] Fetching training posts');
    setLoading(true);
    setError('');
    try {
      const { data, error: dbError } = await supabase
        .from('training_posts')
        .select('*')
        .eq('is_published', true)
        .order('created_at', { ascending: false });
      if (dbError) {
        console.error('[Training] DB error:', dbError.message);
        setError(dbError.message);
        return;
      }
      console.log('[Training] Fetched:', data?.length ?? 0, 'posts');
      setPosts((data as TrainingPost[]) || []);
    } catch (err: any) {
      console.error('[Training] Unexpected error:', err);
      setError('Failed to load training content.');
    } finally {
      setLoading(false);
    }
  };

  if (!isPaid) {
    return (
      <View style={styles.container}>
        <DrawerHeader title="Training" />
        <MembershipGate featureName="Training Library" />
      </View>
    );
  }

  const filteredPosts = selectedCategory === 'All'
    ? posts
    : posts.filter((p) => p.category === selectedCategory);

  const handleCategorySelect = (cat: string) => {
    console.log('[Training] Category filter selected:', cat);
    setSelectedCategory(cat);
  };

  const handlePostPress = (post: TrainingPost) => {
    console.log('[Training] Post pressed:', post.title, 'id:', post.id);
    router.push(`/(drawer)/training/${post.id}` as any);
  };

  const renderPost = ({ item }: { item: TrainingPost }) => (
    <ContentCard
      title={item.title}
      description={item.description}
      thumbnailUrl={item.thumbnail_url}
      badge={item.category}
      badgeColor={COLORS.primary}
      onPress={() => handlePostPress(item)}
    />
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <GraduationCap size={48} color={COLORS.textTertiary} />
      <Text style={styles.emptyTitle}>No Training Posts</Text>
      <Text style={styles.emptySubtitle}>Training content will appear here.</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <DrawerHeader title="Training" />

      {/* Category Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
        style={styles.filterScroll}
      >
        {CATEGORIES.map((cat) => (
          <Pressable
            key={cat}
            onPress={() => handleCategorySelect(cat)}
            style={[
              styles.filterChip,
              selectedCategory === cat && styles.filterChipActive,
            ]}
          >
            <Text
              style={[
                styles.filterChipText,
                selectedCategory === cat && styles.filterChipTextActive,
              ]}
            >
              {cat}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {loading ? (
        <View style={styles.loadingContainer}>
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
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
          data={filteredPosts}
          renderItem={renderPost}
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
  filterScroll: {
    flexGrow: 0,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  filterRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: COLORS.surfaceSecondary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterChipText: {
    fontSize: 13,
    fontFamily: 'Outfit_500Medium',
    color: COLORS.textSecondary,
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontFamily: 'Outfit_600SemiBold',
  },
  loadingContainer: {
    padding: 16,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
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
