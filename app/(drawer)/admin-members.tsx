import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Shield, Search, Pencil, Trash2, X, Check } from 'lucide-react-native';
import { supabase } from '@/utils/supabase';
import { COLORS } from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { DrawerHeader } from '@/components/DrawerHeader';
import { MembershipBadge } from '@/components/MembershipBadge';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { ListItemSkeleton } from '@/components/SkeletonLoader';
import { getInitials } from '@/utils/helpers';

interface MemberProfile {
  id: string;
  full_name: string | null;
  email: string;
  membership_tier: 'free' | 'paid';
  role: string;
  created_at: string;
  membership_number?: string | null;
}

interface EditForm {
  full_name: string;
  email: string;
  membership_tier: 'free' | 'paid';
  role: string;
}

export default function AdminMembersScreen() {
  const { profile } = useAuth();
  const [members, setMembers] = useState<MemberProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingMember, setEditingMember] = useState<MemberProfile | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({ full_name: '', email: '', membership_tier: 'free', role: 'member' });
  const [saving, setSaving] = useState(false);

  const isAdmin = profile?.role === 'admin';

  const fetchMembers = useCallback(async () => {
    console.log('[AdminMembers] Fetching all members');
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) {
        console.error('[AdminMembers] Fetch error:', error.message);
      } else {
        console.log('[AdminMembers] Fetched:', data?.length ?? 0, 'members');
        setMembers((data as MemberProfile[]) ?? []);
      }
    } catch (err) {
      console.error('[AdminMembers] Unexpected error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) fetchMembers();
  }, [isAdmin, fetchMembers]);

  const handleEdit = (member: MemberProfile) => {
    console.log('[AdminMembers] Edit pressed for member:', member.id);
    setEditForm({
      full_name: member.full_name ?? '',
      email: member.email,
      membership_tier: member.membership_tier,
      role: member.role,
    });
    setEditingMember(member);
  };

  const handleSave = async () => {
    if (!editingMember) return;
    console.log('[AdminMembers] Save pressed for member:', editingMember.id, 'form:', editForm);
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: editForm.full_name.trim() || null,
          email: editForm.email.trim(),
          membership_tier: editForm.membership_tier,
          role: editForm.role,
        })
        .eq('id', editingMember.id);
      if (error) {
        console.error('[AdminMembers] Save error:', error.message);
        Alert.alert('Error', error.message);
        return;
      }
      console.log('[AdminMembers] Member saved successfully');
      setEditingMember(null);
      fetchMembers();
    } catch (err) {
      console.error('[AdminMembers] Unexpected save error:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (member: MemberProfile) => {
    const displayName = member.full_name || member.email;
    console.log('[AdminMembers] Delete pressed for member:', member.id, displayName);
    Alert.alert(
      'Delete Member',
      `Are you sure you want to delete ${displayName}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            console.log('[AdminMembers] Confirming delete for member:', member.id);
            try {
              // Optimistically remove from local state immediately
              setMembers((prev) => prev.filter((m) => m.id !== member.id));

              const { data: { session } } = await supabase.auth.getSession();
              const response = await supabase.functions.invoke('delete-user', {
                body: { userId: member.id },
                headers: session?.access_token
                  ? { Authorization: `Bearer ${session.access_token}` }
                  : {},
              });

              if (response.error) {
                console.error('[AdminMembers] Delete error:', response.error.message);
                Alert.alert('Error', response.error.message || 'Failed to delete user.');
                // Revert optimistic update on error
                fetchMembers();
                return;
              }

              console.log('[AdminMembers] Member deleted successfully:', member.id);
              // Background refresh to confirm
              fetchMembers();
            } catch (err: any) {
              console.error('[AdminMembers] Unexpected delete error:', err);
              Alert.alert('Error', 'Failed to delete user.');
              fetchMembers();
            }
          },
        },
      ]
    );
  };

  if (!isAdmin) {
    return (
      <View style={styles.container}>
        <DrawerHeader title="Members" />
        <View style={styles.accessDenied}>
          <Shield size={48} color={COLORS.danger} />
          <Text style={styles.accessDeniedTitle}>Access Denied</Text>
          <Text style={styles.accessDeniedSubtitle}>
            You don't have permission to view this page.
          </Text>
        </View>
      </View>
    );
  }

  const lowerQuery = searchQuery.toLowerCase();
  const filteredMembers = searchQuery.trim()
    ? members.filter((m) => {
        const name = (m.full_name ?? '').toLowerCase();
        const email = m.email.toLowerCase();
        return name.includes(lowerQuery) || email.includes(lowerQuery);
      })
    : members;

  const renderMember = ({ item }: { item: MemberProfile }) => {
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
        <View style={styles.memberActions}>
          <MembershipBadge tier={item.membership_tier} size="sm" />
          {item.role === 'admin' && (
            <View style={styles.adminRoleBadge}>
              <Text style={styles.adminRoleBadgeText}>ADMIN</Text>
            </View>
          )}
          <AnimatedPressable
            onPress={() => handleEdit(item)}
            style={styles.iconBtn}
          >
            <Pencil size={15} color={COLORS.primary} />
          </AnimatedPressable>
          <AnimatedPressable
            onPress={() => handleDelete(item)}
            style={[styles.iconBtn, styles.iconBtnDanger]}
          >
            <Trash2 size={15} color={COLORS.danger} />
          </AnimatedPressable>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <DrawerHeader title="Members" />

      {/* Search bar */}
      <View style={styles.searchContainer}>
        <Search size={16} color={COLORS.textTertiary} />
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={(text) => {
            console.log('[AdminMembers] Search query changed:', text);
            setSearchQuery(text);
          }}
          placeholder="Search by name or email..."
          placeholderTextColor={COLORS.textTertiary}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchQuery.length > 0 && (
          <AnimatedPressable
            onPress={() => {
              console.log('[AdminMembers] Search cleared');
              setSearchQuery('');
            }}
          >
            <X size={16} color={COLORS.textTertiary} />
          </AnimatedPressable>
        )}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ListItemSkeleton />
          <ListItemSkeleton />
          <ListItemSkeleton />
          <ListItemSkeleton />
        </View>
      ) : (
        <FlatList
          data={filteredMembers}
          renderItem={renderMember}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No members found.</Text>
            </View>
          }
        />
      )}

      {/* Edit Modal */}
      <Modal
        visible={editingMember !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          console.log('[AdminMembers] Edit modal closed');
          setEditingMember(null);
        }}
      >
        <KeyboardAvoidingView
          style={styles.modalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Edit Member</Text>
            <AnimatedPressable
              onPress={() => {
                console.log('[AdminMembers] Cancel edit pressed');
                setEditingMember(null);
              }}
              style={styles.modalCloseBtn}
            >
              <X size={20} color={COLORS.text} />
            </AnimatedPressable>
          </View>

          <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
            {/* Full Name */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Full Name</Text>
              <TextInput
                style={styles.fieldInput}
                value={editForm.full_name}
                onChangeText={(v) => setEditForm((f) => ({ ...f, full_name: v }))}
                placeholder="Full name"
                placeholderTextColor={COLORS.textTertiary}
              />
            </View>

            {/* Email */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Email</Text>
              <TextInput
                style={styles.fieldInput}
                value={editForm.email}
                onChangeText={(v) => setEditForm((f) => ({ ...f, email: v }))}
                placeholder="Email address"
                placeholderTextColor={COLORS.textTertiary}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            {/* Membership Tier */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Membership Tier</Text>
              <View style={styles.tierRow}>
                <AnimatedPressable
                  onPress={() => {
                    console.log('[AdminMembers] Tier selected: free');
                    setEditForm((f) => ({ ...f, membership_tier: 'free' }));
                  }}
                  style={[styles.tierBtn, editForm.membership_tier === 'free' && styles.tierBtnActive]}
                >
                  <Text style={[styles.tierBtnText, editForm.membership_tier === 'free' && styles.tierBtnTextActive]}>
                    Free
                  </Text>
                </AnimatedPressable>
                <AnimatedPressable
                  onPress={() => {
                    console.log('[AdminMembers] Tier selected: paid');
                    setEditForm((f) => ({ ...f, membership_tier: 'paid' }));
                  }}
                  style={[styles.tierBtn, editForm.membership_tier === 'paid' && styles.tierBtnActivePaid]}
                >
                  <Text style={[styles.tierBtnText, editForm.membership_tier === 'paid' && styles.tierBtnTextActive]}>
                    Paid
                  </Text>
                </AnimatedPressable>
              </View>
            </View>

            {/* Role */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Role</Text>
              <View style={styles.tierRow}>
                <AnimatedPressable
                  onPress={() => {
                    console.log('[AdminMembers] Role selected: member');
                    setEditForm((f) => ({ ...f, role: 'member' }));
                  }}
                  style={[styles.tierBtn, editForm.role === 'member' && styles.tierBtnActive]}
                >
                  <Text style={[styles.tierBtnText, editForm.role === 'member' && styles.tierBtnTextActive]}>
                    Member
                  </Text>
                </AnimatedPressable>
                <AnimatedPressable
                  onPress={() => {
                    console.log('[AdminMembers] Role selected: admin');
                    setEditForm((f) => ({ ...f, role: 'admin' }));
                  }}
                  style={[styles.tierBtn, editForm.role === 'admin' && styles.tierBtnActiveAdmin]}
                >
                  <Text style={[styles.tierBtnText, editForm.role === 'admin' && styles.tierBtnTextActive]}>
                    Admin
                  </Text>
                </AnimatedPressable>
              </View>
              {editForm.role === 'admin' && (
                <View style={styles.adminWarning}>
                  <Text style={styles.adminWarningText}>
                    ⚠️ This user will have full access to the admin panel.
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>

          {/* Modal Footer */}
          <View style={styles.modalFooter}>
            <AnimatedPressable
              onPress={() => {
                console.log('[AdminMembers] Cancel button pressed');
                setEditingMember(null);
              }}
              style={styles.cancelBtn}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </AnimatedPressable>
            <AnimatedPressable
              onPress={handleSave}
              disabled={saving}
              style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Check size={16} color="#FFFFFF" />
                  <Text style={styles.saveBtnText}>Save</Text>
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    margin: 16,
    marginBottom: 8,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Outfit_400Regular',
    color: COLORS.text,
  },
  loadingContainer: {
    padding: 16,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  memberAvatarText: {
    color: COLORS.primary,
    fontSize: 13,
    fontFamily: 'Outfit_700Bold',
  },
  memberInfo: {
    flex: 1,
    minWidth: 0,
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
    marginTop: 1,
  },
  memberActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: COLORS.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnDanger: {
    backgroundColor: 'rgba(239,68,68,0.1)',
  },
  separator: {
    height: 1,
    backgroundColor: COLORS.border,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Outfit_400Regular',
    color: COLORS.textTertiary,
  },
  // Modal
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
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Outfit_700Bold',
    color: COLORS.text,
  },
  modalCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: {
    flex: 1,
    padding: 20,
  },
  fieldGroup: {
    marginBottom: 18,
  },
  fieldLabel: {
    fontSize: 13,
    fontFamily: 'Outfit_600SemiBold',
    color: COLORS.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  fieldInput: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: 'Outfit_400Regular',
    color: COLORS.text,
  },
  tierRow: {
    flexDirection: 'row',
    gap: 10,
  },
  tierBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: COLORS.surfaceSecondary,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  tierBtnActive: {
    backgroundColor: COLORS.primaryMuted,
    borderColor: COLORS.primary,
  },
  tierBtnActivePaid: {
    backgroundColor: 'rgba(16,185,129,0.12)',
    borderColor: COLORS.success,
  },
  tierBtnText: {
    fontSize: 14,
    fontFamily: 'Outfit_600SemiBold',
    color: COLORS.textSecondary,
  },
  tierBtnTextActive: {
    color: COLORS.text,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: COLORS.surfaceSecondary,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 15,
    fontFamily: 'Outfit_600SemiBold',
    color: COLORS.textSecondary,
  },
  saveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
  },
  saveBtnDisabled: {
    opacity: 0.5,
  },
  saveBtnText: {
    fontSize: 15,
    fontFamily: 'Outfit_600SemiBold',
    color: '#FFFFFF',
  },
  tierBtnActiveAdmin: {
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderColor: COLORS.danger,
  },
  adminWarning: {
    marginTop: 8,
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.2)',
  },
  adminWarningText: {
    fontSize: 12,
    fontFamily: 'Outfit_400Regular',
    color: COLORS.danger,
    lineHeight: 18,
  },
  adminRoleBadge: {
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  adminRoleBadgeText: {
    fontSize: 10,
    fontFamily: 'Outfit_700Bold',
    color: COLORS.danger,
    letterSpacing: 0.5,
  },
});
