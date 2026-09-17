import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Mail, Lock, User, Eye, EyeOff, Check } from 'lucide-react-native';
import { supabase } from '@/utils/supabase';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';

type MembershipTier = 'free' | 'paid';

const FREE_FEATURES = ['Magazine Access', 'Events Calendar', 'Store Access'];
const PAID_FEATURES = ['Everything in Free', 'Training Library', 'Expert Interviews', 'Live Webinars', 'Community Forum'];

export default function SignUpScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedTier, setSelectedTier] = useState<MembershipTier>('free');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleSignUp = async () => {
    console.log('[SignUp] Create account pressed, email:', email, 'tier:', selectedTier);
    if (!fullName.trim() || !email.trim() || !password.trim()) {
      setError('Please fill in all fields.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      console.log('[SignUp] Attempting Supabase sign up');
      const { data, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { full_name: fullName.trim() },
        },
      });
      if (authError) {
        console.error('[SignUp] Auth error:', authError.message);
        setError(authError.message);
        return;
      }
      if (data.user) {
        console.log('[SignUp] User created:', data.user.id, 'Upserting profile with tier:', selectedTier);
        await supabase.from('profiles').upsert({
          id: data.user.id,
          email: data.user.email ?? email.trim(),
          full_name: fullName.trim(),
          membership_tier: selectedTier,
        });
        console.log('[SignUp] Profile upserted, navigating to home');
        router.replace('/(drawer)/home');
      }
    } catch (err: any) {
      console.error('[SignUp] Unexpected error:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoToSignIn = () => {
    console.log('[SignUp] Navigate to sign in pressed');
    router.back();
  };

  const handleTierSelect = (tier: MembershipTier) => {
    console.log('[SignUp] Membership tier selected:', tier);
    setSelectedTier(tier);
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[
          styles.container,
          { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 40 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoText}>NH</Text>
            </View>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join the Nexus Hub community</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Full Name</Text>
              <View style={styles.inputWrapper}>
                <User size={18} color={COLORS.textTertiary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="John Doe"
                  placeholderTextColor={COLORS.textTertiary}
                  autoCapitalize="words"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email</Text>
              <View style={styles.inputWrapper}>
                <Mail size={18} color={COLORS.textTertiary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  placeholderTextColor={COLORS.textTertiary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Password</Text>
              <View style={styles.inputWrapper}>
                <Lock size={18} color={COLORS.textTertiary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, styles.inputFlex]}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Min. 6 characters"
                  placeholderTextColor={COLORS.textTertiary}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <Pressable
                  onPress={() => {
                    console.log('[SignUp] Toggle password visibility');
                    setShowPassword(!showPassword);
                  }}
                  style={styles.eyeButton}
                  hitSlop={8}
                >
                  {showPassword ? (
                    <EyeOff size={18} color={COLORS.textTertiary} />
                  ) : (
                    <Eye size={18} color={COLORS.textTertiary} />
                  )}
                </Pressable>
              </View>
            </View>

            {/* Membership Tier Selection */}
            <Text style={styles.tierTitle}>Choose Your Membership</Text>
            <View style={styles.tierRow}>
              {/* Free Card */}
              <AnimatedPressable
                onPress={() => handleTierSelect('free')}
                style={[
                  styles.tierCard,
                  selectedTier === 'free' && styles.tierCardSelected,
                ]}
              >
                <View style={[styles.tierBadge, { backgroundColor: COLORS.free }]}>
                  <Text style={styles.tierBadgeText}>FREE</Text>
                </View>
                <Text style={styles.tierCardTitle}>Free Member</Text>
                {FREE_FEATURES.map((f) => (
                  <View key={f} style={styles.featureRow}>
                    <Check size={12} color={COLORS.free} />
                    <Text style={styles.featureText}>{f}</Text>
                  </View>
                ))}
                {selectedTier === 'free' ? (
                  <View style={styles.selectedIndicator}>
                    <Check size={14} color={COLORS.primary} />
                  </View>
                ) : null}
              </AnimatedPressable>

              {/* Paid Card */}
              <AnimatedPressable
                onPress={() => handleTierSelect('paid')}
                style={[
                  styles.tierCard,
                  selectedTier === 'paid' && styles.tierCardSelected,
                ]}
              >
                <View style={[styles.tierBadge, { backgroundColor: COLORS.paid }]}>
                  <Text style={styles.tierBadgeText}>PAID</Text>
                </View>
                <Text style={styles.tierCardTitle}>Paid Member</Text>
                {PAID_FEATURES.map((f) => (
                  <View key={f} style={styles.featureRow}>
                    <Check size={12} color={COLORS.paid} />
                    <Text style={styles.featureText}>{f}</Text>
                  </View>
                ))}
                {selectedTier === 'paid' ? (
                  <View style={styles.selectedIndicator}>
                    <Check size={14} color={COLORS.primary} />
                  </View>
                ) : null}
              </AnimatedPressable>
            </View>

            <AnimatedPressable
              onPress={handleSignUp}
              disabled={loading}
              style={styles.createButton}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.createButtonText}>Create Account</Text>
              )}
            </AnimatedPressable>

            <View style={styles.signInRow}>
              <Text style={styles.signInPrompt}>Already have an account?</Text>
              <Pressable onPress={handleGoToSignIn} hitSlop={8}>
                <Text style={styles.signInLink}>Sign in</Text>
              </Pressable>
            </View>
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },
  content: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  logoText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontFamily: 'Outfit_700Bold',
  },
  title: {
    fontSize: 26,
    fontFamily: 'Outfit_700Bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Outfit_400Regular',
    color: COLORS.textSecondary,
  },
  form: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
  },
  errorBox: {
    backgroundColor: COLORS.danger + '15',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.danger + '30',
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 13,
    fontFamily: 'Outfit_400Regular',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontFamily: 'Outfit_500Medium',
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    height: 50,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Outfit_400Regular',
    color: COLORS.text,
  },
  inputFlex: {
    flex: 1,
  },
  eyeButton: {
    padding: 4,
  },
  tierTitle: {
    fontSize: 15,
    fontFamily: 'Outfit_600SemiBold',
    color: COLORS.text,
    marginBottom: 12,
    marginTop: 4,
  },
  tierRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  tierCard: {
    flex: 1,
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: 14,
    padding: 14,
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  tierCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryMuted,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  tierBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  tierBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontFamily: 'Outfit_700Bold',
    letterSpacing: 0.8,
  },
  tierCardTitle: {
    fontSize: 13,
    fontFamily: 'Outfit_600SemiBold',
    color: COLORS.text,
    marginBottom: 8,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  featureText: {
    fontSize: 11,
    fontFamily: 'Outfit_400Regular',
    color: COLORS.textSecondary,
    flex: 1,
  },
  selectedIndicator: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Outfit_600SemiBold',
  },
  signInRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  signInPrompt: {
    fontSize: 14,
    fontFamily: 'Outfit_400Regular',
    color: COLORS.textSecondary,
  },
  signInLink: {
    fontSize: 14,
    fontFamily: 'Outfit_600SemiBold',
    color: COLORS.primary,
  },
});
