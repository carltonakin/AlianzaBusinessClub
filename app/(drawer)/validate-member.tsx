import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { CheckCircle, XCircle, Info, Search } from 'lucide-react-native';
import { supabase } from '@/utils/supabase';
import { COLORS } from '@/constants/Colors';
import { DrawerHeader } from '@/components/DrawerHeader';
import { MembershipBadge } from '@/components/MembershipBadge';
import { AnimatedPressable } from '@/components/AnimatedPressable';

interface ValidatedProfile {
  id: string;
  full_name: string | null;
  membership_tier: 'free' | 'paid';
  membership_number: string | null;
}

type ValidationResult = 'found' | 'not_found' | null;

export default function ValidateMemberScreen() {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ValidationResult>(null);
  const [foundProfile, setFoundProfile] = useState<ValidatedProfile | null>(null);

  const handleInputChange = (text: string) => {
    setInput(text);
    if (result !== null) {
      console.log('[ValidateMember] Input changed — clearing result');
      setResult(null);
      setFoundProfile(null);
    }
  };

  const handleValidate = async () => {
    const trimmed = input.toUpperCase().trim();
    if (!trimmed) return;
    console.log('[ValidateMember] Validate button pressed, membership number:', trimmed);
    setLoading(true);
    setResult(null);
    setFoundProfile(null);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, membership_tier, membership_number')
        .eq('membership_number', trimmed)
        .maybeSingle();
      if (error) {
        console.error('[ValidateMember] Query error:', error.message);
        setResult('not_found');
        return;
      }
      if (data) {
        console.log('[ValidateMember] Member found:', data.id, 'tier:', data.membership_tier);
        setFoundProfile(data as ValidatedProfile);
        setResult('found');
      } else {
        console.log('[ValidateMember] Member not found for number:', trimmed);
        setResult('not_found');
      }
    } catch (err) {
      console.error('[ValidateMember] Unexpected error:', err);
      setResult('not_found');
    } finally {
      setLoading(false);
    }
  };

  const memberName = foundProfile?.full_name || 'Member';
  const memberTier = foundProfile?.membership_tier ?? 'free';
  const memberNumber = foundProfile?.membership_number ?? input.toUpperCase().trim();
  const eligibilityText = memberTier === 'paid' ? 'This member is eligible for member discounts' : 'Free member';

  return (
    <View style={styles.container}>
      <DrawerHeader title="AB Club - Validate Member" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Info card */}
        <View style={styles.infoCard}>
          <Info size={18} color={COLORS.primary} />
          <Text style={styles.infoText}>
            Enter a member's membership number to verify their membership status. Use this when offering member discounts.
          </Text>
        </View>

        {/* Input */}
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>Membership Number</Text>
          <TextInput
            style={styles.textInput}
            value={input}
            onChangeText={handleInputChange}
            placeholder="e.g. ABC-00001"
            placeholderTextColor={COLORS.textTertiary}
            autoCapitalize="characters"
            autoCorrect={false}
            returnKeyType="search"
            onSubmitEditing={handleValidate}
          />
        </View>

        {/* Validate button */}
        <AnimatedPressable
          onPress={handleValidate}
          disabled={loading || !input.trim()}
          style={[styles.validateButton, (loading || !input.trim()) && styles.validateButtonDisabled]}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <Search size={18} color="#FFFFFF" />
              <Text style={styles.validateButtonText}>Validate</Text>
            </>
          )}
        </AnimatedPressable>

        {/* Result: Found */}
        {result === 'found' && foundProfile ? (
          <View style={styles.resultCardFound}>
            <View style={styles.resultHeader}>
              <CheckCircle size={22} color={COLORS.success} />
              <Text style={styles.resultTitleFound}>Valid Member</Text>
            </View>
            <View style={styles.resultDivider} />
            <View style={styles.resultRow}>
              <Text style={styles.resultFieldLabel}>Name</Text>
              <Text style={styles.resultFieldValue}>{memberName}</Text>
            </View>
            <View style={styles.resultRow}>
              <Text style={styles.resultFieldLabel}>Membership</Text>
              <MembershipBadge tier={memberTier} size="sm" />
            </View>
            <View style={styles.resultRow}>
              <Text style={styles.resultFieldLabel}>Number</Text>
              <Text style={styles.resultFieldValueMono}>{memberNumber}</Text>
            </View>
            <View style={styles.eligibilityBadge}>
              <Text style={[styles.eligibilityText, memberTier === 'paid' ? styles.eligibilityPaid : styles.eligibilityFree]}>
                {eligibilityText}
              </Text>
            </View>
          </View>
        ) : null}

        {/* Result: Not found */}
        {result === 'not_found' ? (
          <View style={styles.resultCardNotFound}>
            <View style={styles.resultHeader}>
              <XCircle size={22} color={COLORS.danger} />
              <Text style={styles.resultTitleNotFound}>Member Not Found</Text>
            </View>
            <Text style={styles.resultNotFoundDesc}>
              No member with that membership number was found. Please check the number and try again.
            </Text>
          </View>
        ) : null}
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
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: COLORS.primaryMuted,
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.primary + '33',
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Outfit_400Regular',
    color: COLORS.text,
    lineHeight: 20,
  },
  inputSection: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontFamily: 'Outfit_500Medium',
    color: COLORS.textTertiary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  textInput: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 18,
    fontFamily: 'Outfit_600SemiBold',
    color: COLORS.text,
    letterSpacing: 1,
  },
  validateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    marginBottom: 24,
  },
  validateButtonDisabled: {
    opacity: 0.5,
  },
  validateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Outfit_600SemiBold',
  },
  resultCardFound: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: COLORS.success,
  },
  resultCardNotFound: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: COLORS.danger,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  resultTitleFound: {
    fontSize: 18,
    fontFamily: 'Outfit_700Bold',
    color: COLORS.success,
  },
  resultTitleNotFound: {
    fontSize: 18,
    fontFamily: 'Outfit_700Bold',
    color: COLORS.danger,
  },
  resultDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginBottom: 12,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  resultFieldLabel: {
    fontSize: 13,
    fontFamily: 'Outfit_500Medium',
    color: COLORS.textSecondary,
  },
  resultFieldValue: {
    fontSize: 14,
    fontFamily: 'Outfit_600SemiBold',
    color: COLORS.text,
  },
  resultFieldValueMono: {
    fontSize: 14,
    fontFamily: 'Outfit_700Bold',
    color: COLORS.text,
    letterSpacing: 1,
  },
  eligibilityBadge: {
    marginTop: 8,
    backgroundColor: COLORS.primaryMuted,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  eligibilityText: {
    fontSize: 13,
    fontFamily: 'Outfit_600SemiBold',
  },
  eligibilityPaid: {
    color: COLORS.primary,
  },
  eligibilityFree: {
    color: COLORS.textSecondary,
  },
  resultNotFoundDesc: {
    fontSize: 14,
    fontFamily: 'Outfit_400Regular',
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
});
