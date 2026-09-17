import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Shield, Users, Bell, RefreshCw, Send } from 'lucide-react-native';
import { supabase } from '@/utils/supabase';
import { COLORS } from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { DrawerHeader } from '@/components/DrawerHeader';
import { MembershipBadge } from '@/components/MembershipBadge';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { ListItemSkeleton } from '@/components/SkeletonLoader';
import { Profile } from '@/types';
import { getInitials } from '@/utils/helpers';

type TargetTier = 'all' | 'free' | 'paid';

interface Stats {
  total: number;
  paid: number;
  free: number;
}

export default function AdminScreen() {
  const { profile } = useAuth();
  const [members, setMembers] = useState<Profile[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, paid: 0, free: 0 });
  const [loading, setLoading] = useState(true);
  const [notifTitle, setNotifTitle] = useState('');
  const [notifBody, setNotifBody] = useState('');
  const [targetTier, setTargetTier] = useState<TargetTier>('all');
  const [sendingNotif, setSendingNotif] = useState(false);
  const [contentCounts, setContentCounts] = useState({
    training: 0,
    events: 0,
    interviews: 0,
    webinars: 0,
  });

  const isAdmin = profile?.role === 'admin';

  useEffect(() => {
    if (isAdmin) {
      fetchData();
    }
  }, [isAdmin]);

  const fetchData = async () => {
    console.log('[Admin] Fetching admin data');
    setLoading(true);
    try {
      const [membersRes, trainingRes, eventsRes, interviewsRes, webinarsRes] = await Promise.all([
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('training_posts').select('id', { count: 'exact' }),
        supabase.from('events').select('id', { count: 'exact' }),
        supabase.from('interviews').select('id', { count: 'exact' }),
        supabase.from('webinars').select('id', { count: 'exact' }),
      ]);

      if (membersRes.data) {
        const allMembers = membersRes.data as Profile[];
        setMembers(allMembers);
        setStats({
          total: allMembers.length,
          paid: allMembers.filter((m) => m.membership_tier === 'paid').length,
          free: allMembers.filter((m) => m.membership_tier === 'free').length,
        });
        console.log('[Admin] Members loaded:', allMembers.length);
      }

      setContentCounts({
        training: trainingRes.data?.length ?? 0,
        events: eventsRes.data?.length ?? 0,
        interviews: interviewsRes.data?.length ?? 0,
        webinars: webinarsRes.data?.length ?? 0,
      });
    } catch (err) {
      console.error('[Admin] Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendNotification = async () => {
    if (!notifTitle.trim() || !notifBody.trim() || !profile?.id) return;
    console.log('[Admin] Send notification pressed, title:', notifTitle, 'target:', targetTier);
    setSendingNotif(true);
    try {
      const { error } = await supabase.from('push_notifications').insert({
        title: notifTitle.trim(),
        body: notifBody.trim(),
        target_tier: targetTier,
        sent_by: profile.id,
      });
      if (error) {
        console.error('[Admin] Notification insert error:', error.message);
        Alert.alert('Error', 'Failed to send notification.');
        return;
      }
      console.log('[Admin] Notification sent successfully');
      Alert.alert('Success', 'Notification sent successfully!');
      setNotifTitle('');
      setNotifBody('');
      setTargetTier('all');
    } catch (err) {
      console.error('[Admin] Unexpected error sending notification:', err);
    } finally {
      setSendingNotif(false);
    }
  };

  if (!isAdmin) {
    return (
      <View style={styles.container}>
        <DrawerHeader title="Admin Panel" />
        <View style={styles.accessDenied}>
          <Shield size={48} color={COLORS.danger} />
          <Text style={styles.accessDeniedTitle}>Access Denied</Text>
          <Text style={styles.accessDeniedSubtitle}>
            You don't have permission to access the admin panel.
          </Text>
        </View>
      </View>
    );
  }

  const renderMember = ({ item }: { item: Profile }) => {
    const initials = getInitials(item.full_name, item.email);
    const displayName = item.full_name || item.email;
    return (
      <View style={styles.memberRow}>
        <View style={styles.memberAvatar}>
          <Text style={styles.memberAvatarText}>{initials}</Text>
        </View>
        <View style={styles.memberInfo}>
          <Text style={styles.memberName} numberOfLines={1}>{displayName}</Text>
          <Text style={styles.memberEmail} numberOfLines={1}>{item.email}</Text>
        </View>
        <View style={styles.memberBadges}>
          <MembershipBadge tier={item.membership_tier} size="sm" />
          {item.role === 'admin' ? (
            <View style={styles.adminBadge}>
              <Text style={styles.adminBadgeText}>ADMIN</Text>
            </View>
          ) : null}
        </View>
      </View>
    );
  };

  const TIER_OPTIONS: { label: string; value: TargetTier }[] = [
    { label: 'All', value: 'all' },
    { label: 'Free', value: 'free' },
    { label: 'Paid', value: 'paid' },
  ];

  return (
    <View style={styles.container}>
      <DrawerHeader title="Admin Panel" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { borderLeftColor: COLORS.primary }]}>
            <Text style={styles.statNumber}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total Members</Text>
          </View>
          <View style={[styles.statCard, { borderLeftColor: COLORS.paid }]}>
            <Text style={styles.statNumber}>{stats.paid}</Text>
            <Text style={styles.statLabel}>Paid</Text>
          </View>
          <View style={[styles.statCard, { borderLeftColor: COLORS.free }]}>
            <Text style={styles.statNumber}>{stats.free}</Text>
            <Text style={styles.statLabel}>Free</Text>
          </View>
        </View>

        {/* Members List */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Members</Text>
            <AnimatedPressable onPress={fetchData} style={styles.refreshButton}>
              <RefreshCw size={16} color={COLORS.primary} />
            </AnimatedPressable>
          </View>
          {loading ? (
            <>
              <ListItemSkeleton />
              <ListItemSkeleton />
              <ListItemSkeleton />
            </>
          ) : (
            <FlatList
              data={members}
              renderItem={renderMember}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
          )}
        </View>

        {/* Send Notification */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Bell size={18} color={COLORS.text} />
            <Text style={styles.sectionTitle}>Send Notification</Text>
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Title</Text>
            <TextInput
              style={styles.textInput}
              value={notifTitle}
              onChangeText={setNotifTitle}
              placeholder="Notification title"
              placeholderTextColor={COLORS.textTertiary}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Message</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={notifBody}
              onChangeText={setNotifBody}
              placeholder="Notification message"
              placeholderTextColor={COLORS.textTertiary}
              multiline
              textAlignVertical="top"
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Target Audience</Text>
            <View style={styles.tierPicker}>
              {TIER_OPTIONS.map((opt) => (
                <AnimatedPressable
                  key={opt.value}
                  onPress={() => {
                    console.log('[Admin] Target tier selected:', opt.value);
                    setTargetTier(opt.value);
                  }}
                  style={[
                    styles.tierOption,
                    targetTier === opt.value && styles.tierOptionActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.tierOptionText,
                      targetTier === opt.value && styles.tierOptionTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </AnimatedPressable>
              ))}
            </View>
          </View>
          <AnimatedPressable
            onPress={handleSendNotification}
            disabled={!notifTitle.trim() || !notifBody.trim() || sendingNotif}
            style={[
              styles.sendButton,
              (!notifTitle.trim() || !notifBody.trim() || sendingNotif) && styles.sendButtonDisabled,
            ]}
          >
            {sendingNotif ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Send size={16} color="#FFFFFF" />
                <Text style={styles.sendButtonText}>Send Notification</Text>
              </>
            )}
          </AnimatedPressable>
        </View>

        {/* Content Management */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Content Management</Text>
          <View style={styles.contentGrid}>
            {[
              { label: 'Training Posts', count: contentCounts.training, color: COLORS.primary },
              { label: 'Events', count: contentCounts.events, color: COLORS.accent },
              { label: 'Interviews', count: contentCounts.interviews, color: COLORS.success },
              { label: 'Webinars', count: contentCounts.webinars, color: COLORS.danger },
            ].map((item) => (
              <View key={item.label} style={[styles.contentCard, { borderTopColor: item.color }]}>
                <Text style={[styles.contentCount, { color: item.color }]}>{item.count}</Text>
                <Text style={styles.contentLabel}>{item.label}</Text>
              </View>
            ))}
          </View>
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
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  accessDenied: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 32,
  },
  accessDeniedTitle: {
    fontSize: 22,
    fontFamily: 'Outfit_700Bold',
    color: COLORS.text,
  },
  accessDeniedSubtitle: {
    fontSize: 14,
    fontFamily: 'Outfit_400Regular',
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderLeftWidth: 4,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 28,
    fontFamily: 'Outfit_700Bold',
    color: COLORS.text,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: 'Outfit_500Medium',
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 2,
  },
  section: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Outfit_700Bold',
    color: COLORS.text,
    flex: 1,
  },
  refreshButton: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: COLORS.primaryMuted,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  memberAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberAvatarText: {
    color: COLORS.primary,
    fontSize: 13,
    fontFamily: 'Outfit_700Bold',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 14,
    fontFamily: 'Outfit_600SemiBold',
    color: COLORS.text,
  },
  memberEmail: {
    fontSize: 12,
    fontFamily: 'Outfit_400Regular',
    color: COLORS.textTertiary,
  },
  memberBadges: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
  },
  adminBadge: {
    backgroundColor: COLORS.accentMuted,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  adminBadgeText: {
    color: COLORS.accent,
    fontSize: 9,
    fontFamily: 'Outfit_700Bold',
    letterSpacing: 0.5,
  },
  separator: {
    height: 1,
    backgroundColor: COLORS.divider,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 12,
    fontFamily: 'Outfit_500Medium',
    color: COLORS.textTertiary,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  textInput: {
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    fontFamily: 'Outfit_400Regular',
    color: COLORS.text,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  tierPicker: {
    flexDirection: 'row',
    gap: 8,
  },
  tierOption: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: COLORS.surfaceSecondary,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  tierOptionActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  tierOptionText: {
    fontSize: 13,
    fontFamily: 'Outfit_500Medium',
    color: COLORS.textSecondary,
  },
  tierOptionTextActive: {
    color: '#FFFFFF',
    fontFamily: 'Outfit_600SemiBold',
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 13,
    marginTop: 4,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'Outfit_600SemiBold',
  },
  contentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  contentCard: {
    width: '47%',
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: 12,
    padding: 14,
    borderTopWidth: 3,
    alignItems: 'center',
  },
  contentCount: {
    fontSize: 28,
    fontFamily: 'Outfit_700Bold',
  },
  contentLabel: {
    fontSize: 12,
    fontFamily: 'Outfit_500Medium',
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
});
