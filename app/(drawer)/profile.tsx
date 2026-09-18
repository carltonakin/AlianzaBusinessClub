import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { User, Mail, Shield, LogOut, Edit3, Save, Trash2 } from 'lucide-react-native';
import { supabase } from '@/utils/supabase';
import { COLORS } from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { DrawerHeader } from '@/components/DrawerHeader';
import { MembershipBadge } from '@/components/MembershipBadge';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { getInitials } from '@/utils/helpers';
import { useRouter } from 'expo-router';

export default function ProfileScreen() {
  const { profile, signOut, refreshProfile } = useAuth();
  const router = useRouter();
  const [editName, setEditName] = useState(profile?.full_name || '');
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const initials = getInitials(profile?.full_name, profile?.email);
  const displayName = profile?.full_name || 'Member';

  const handleSave = async () => {
    if (!profile?.id) return;
    console.log('[Profile] Save changes pressed, new name:', editName);
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: editName.trim(), updated_at: new Date().toISOString() })
        .eq('id', profile.id);
      if (error) {
        console.error('[Profile] Update error:', error.message);
        Alert.alert('Error', 'Failed to update profile.');
        return;
      }
      console.log('[Profile] Profile updated successfully');
      await refreshProfile();
      setEditMode(false);
      Alert.alert('Success', 'Profile updated successfully.');
    } catch (err) {
      console.error('[Profile] Unexpected error:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = () => {
    console.log('[Profile] Sign out pressed');
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          console.log('[Profile] Confirming sign out');
          await signOut();
          router.replace('/(auth)/sign-in');
        },
      },
    ]);
  };

  const handleUpgrade = () => {
    console.log('[Profile] Upgrade membership pressed');
    Alert.alert(
      'Upgrade Membership',
      'Contact us to upgrade your membership and unlock all premium content.',
      [{ text: 'OK' }]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all associated data. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Are you absolutely sure?',
              'Type "DELETE" to confirm — your account will be permanently removed.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Yes, Delete',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      if (!profile?.id) return;
                      const { error } = await supabase.rpc('delete_user_account');
                      if (error) {
                        Alert.alert('Error', 'Failed to delete account. Please contact support.');
                        console.error('[Profile] Delete account error:', error.message);
                        return;
                      }
                      await signOut();
                      router.replace('/(auth)/sign-in');
                    } catch (err) {
                      console.error('[Profile] Delete account unexpected error:', err);
                      Alert.alert('Error', 'Something went wrong. Please try again.');
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  const handleEditToggle = () => {
    console.log('[Profile] Edit mode toggled:', !editMode);
    if (!editMode) {
      setEditName(profile?.full_name || '');
    }
    setEditMode(!editMode);
  };

  return (
    <View style={styles.container}>
      <DrawerHeader title="AB Club - Profile" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.displayName}>{displayName}</Text>
          <Text style={styles.displayEmail}>{profile?.email}</Text>
          <View style={{ marginTop: 10 }}>
            <MembershipBadge tier={profile?.membership_tier || 'free'} size="lg" />
          </View>
        </View>

        {/* Edit Profile */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Edit Profile</Text>
            <AnimatedPressable onPress={handleEditToggle} style={styles.editButton}>
              {editMode ? (
                <Text style={styles.editButtonText}>Cancel</Text>
              ) : (
                <>
                  <Edit3 size={14} color={COLORS.primary} />
                  <Text style={styles.editButtonText}>Edit</Text>
                </>
              )}
            </AnimatedPressable>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Full Name</Text>
            {editMode ? (
              <TextInput
                style={styles.fieldInput}
                value={editName}
                onChangeText={setEditName}
                placeholder="Your full name"
                placeholderTextColor={COLORS.textTertiary}
                autoCapitalize="words"
              />
            ) : (
              <View style={styles.fieldValue}>
                <User size={16} color={COLORS.textTertiary} />
                <Text style={styles.fieldValueText}>{profile?.full_name || 'Not set'}</Text>
              </View>
            )}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Email</Text>
            <View style={styles.fieldValue}>
              <Mail size={16} color={COLORS.textTertiary} />
              <Text style={styles.fieldValueText}>{profile?.email}</Text>
            </View>
          </View>

          {editMode ? (
            <AnimatedPressable
              onPress={handleSave}
              disabled={saving}
              style={styles.saveButton}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Save size={16} color="#FFFFFF" />
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                </>
              )}
            </AnimatedPressable>
          ) : null}
        </View>

        {/* Membership */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Membership</Text>
          <View style={styles.membershipCard}>
            <View style={styles.membershipRow}>
              <Shield size={20} color={profile?.membership_tier === 'paid' ? COLORS.paid : COLORS.free} />
              <View style={styles.membershipInfo}>
                <Text style={styles.membershipTierLabel}>
                  {profile?.membership_tier === 'paid' ? 'Paid Member' : 'Free Member'}
                </Text>
                <Text style={styles.membershipDesc}>
                  {profile?.membership_tier === 'paid'
                    ? 'Full access to all content'
                    : 'Limited access — upgrade for more'}
                </Text>
              </View>
              <MembershipBadge tier={profile?.membership_tier || 'free'} size="sm" />
            </View>
            {profile?.membership_tier === 'free' ? (
              <AnimatedPressable onPress={handleUpgrade} style={styles.upgradeButton}>
                <Text style={styles.upgradeButtonText}>Upgrade to Paid</Text>
              </AnimatedPressable>
            ) : null}
          </View>
        </View>

        {/* Account */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <AnimatedPressable onPress={handleSignOut} style={styles.signOutButton}>
            <LogOut size={18} color={COLORS.danger} />
            <Text style={styles.signOutText}>Sign Out</Text>
          </AnimatedPressable>
          <AnimatedPressable onPress={handleDeleteAccount} style={styles.deleteButton}>
            <Trash2 size={18} color={COLORS.danger} />
            <Text style={styles.deleteButtonText}>Delete Account</Text>
          </AnimatedPressable>
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
    paddingBottom: 100,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 28,
    fontFamily: 'Outfit_700Bold',
  },
  displayName: {
    fontSize: 22,
    fontFamily: 'Outfit_700Bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  displayEmail: {
    fontSize: 14,
    fontFamily: 'Outfit_400Regular',
    color: COLORS.textSecondary,
  },
  section: {
    margin: 16,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Outfit_700Bold',
    color: COLORS.text,
    marginBottom: 16,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 16,
  },
  editButtonText: {
    fontSize: 14,
    fontFamily: 'Outfit_500Medium',
    color: COLORS.primary,
  },
  fieldGroup: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 12,
    fontFamily: 'Outfit_500Medium',
    color: COLORS.textTertiary,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  fieldValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  fieldValueText: {
    fontSize: 15,
    fontFamily: 'Outfit_400Regular',
    color: COLORS.text,
  },
  fieldInput: {
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: 'Outfit_400Regular',
    color: COLORS.text,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 13,
    marginTop: 8,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'Outfit_600SemiBold',
  },
  membershipCard: {
    gap: 14,
  },
  membershipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  membershipInfo: {
    flex: 1,
  },
  membershipTierLabel: {
    fontSize: 15,
    fontFamily: 'Outfit_600SemiBold',
    color: COLORS.text,
  },
  membershipDesc: {
    fontSize: 12,
    fontFamily: 'Outfit_400Regular',
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  upgradeButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  upgradeButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Outfit_600SemiBold',
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.15)',
  },
  signOutText: {
    fontSize: 15,
    fontFamily: 'Outfit_600SemiBold',
    color: COLORS.danger,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(239,68,68,0.05)',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.12)',
    marginTop: 10,
  },
  deleteButtonText: {
    fontSize: 15,
    fontFamily: 'Outfit_600SemiBold',
    color: COLORS.danger,
  },
});
