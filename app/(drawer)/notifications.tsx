import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { Bell } from 'lucide-react-native';
import { supabase } from '@/utils/supabase';
import { COLORS } from '@/constants/Colors';
import { DrawerHeader } from '@/components/DrawerHeader';

interface PushNotification {
  id: string;
  title: string;
  body: string;
  target_tier: string;
  sent_at: string;
}

function getRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return diffMins === 1 ? '1 minute ago' : `${diffMins} minutes ago`;
  if (diffHours < 24) return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
  if (diffDays < 30) return diffDays === 1 ? '1 day ago' : `${diffDays} days ago`;
  const diffMonths = Math.floor(diffDays / 30);
  return diffMonths === 1 ? '1 month ago' : `${diffMonths} months ago`;
}

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<PushNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNotifications = async () => {
      console.log('[Notifications] Fetching push notifications');
      const { data, error } = await supabase
        .from('push_notifications')
        .select('id, title, body, target_tier, sent_at')
        .order('sent_at', { ascending: false });
      if (error) {
        console.error('[Notifications] Error fetching notifications:', error.message);
      } else {
        console.log('[Notifications] Fetched:', data?.length ?? 0, 'notifications');
      }
      setNotifications((data as PushNotification[]) ?? []);
      setLoading(false);
    };
    fetchNotifications();
  }, []);

  const renderItem = ({ item }: { item: PushNotification }) => {
    const relativeTime = getRelativeTime(item.sent_at);
    return (
      <View style={styles.card}>
        <View style={styles.iconCircle}>
          <Bell size={16} color={COLORS.primary} />
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <Text style={styles.cardBody2}>{item.body}</Text>
          <Text style={styles.cardTime}>{relativeTime}</Text>
        </View>
      </View>
    );
  };

  const emptyComponent = (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconCircle}>
        <Bell size={32} color={COLORS.textTertiary} />
      </View>
      <Text style={styles.emptyText}>No notifications yet</Text>
      <Text style={styles.emptySubtext}>You'll see past announcements here.</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <DrawerHeader title="Notifications" />
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={emptyComponent}
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
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
    flexGrow: 1,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    marginBottom: 10,
    gap: 12,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardBody: {
    flex: 1,
    gap: 3,
  },
  cardTitle: {
    fontSize: 14,
    fontFamily: 'Outfit_600SemiBold',
    color: COLORS.text,
  },
  cardBody2: {
    fontSize: 13,
    fontFamily: 'Outfit_400Regular',
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  cardTime: {
    fontSize: 11,
    fontFamily: 'Outfit_400Regular',
    color: COLORS.textTertiary,
    marginTop: 2,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: 12,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 17,
    fontFamily: 'Outfit_600SemiBold',
    color: COLORS.text,
  },
  emptySubtext: {
    fontSize: 13,
    fontFamily: 'Outfit_400Regular',
    color: COLORS.textTertiary,
  },
});
