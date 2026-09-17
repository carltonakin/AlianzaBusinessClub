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
import { Mail, Lock, Eye, EyeOff } from 'lucide-react-native';
import { supabase } from '@/utils/supabase';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';

export default function SignInScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSignIn = async () => {
    console.log('[SignIn] Sign in button pressed, email:', email);
    if (!email.trim() || !password.trim()) {
      setError('Please enter your email and password.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      console.log('[SignIn] Attempting Supabase sign in');
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (authError) {
        console.error('[SignIn] Auth error:', authError.message);
        setError(authError.message);
        return;
      }
      console.log('[SignIn] Sign in successful, user:', data.user?.id);
      router.replace('/(drawer)/home');
    } catch (err: any) {
      console.error('[SignIn] Unexpected error:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoToSignUp = () => {
    console.log('[SignIn] Navigate to sign up pressed');
    router.push('/(auth)/sign-up');
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
          { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 40 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={[
            styles.content,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          {/* Logo */}
          <View style={styles.logoContainer}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoText}>NH</Text>
            </View>
            <Text style={styles.appName}>Nexus Hub</Text>
            <Text style={styles.tagline}>Your membership community</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <Text style={styles.formTitle}>Welcome back</Text>
            <Text style={styles.formSubtitle}>Sign in to your account</Text>

            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

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
                  placeholder="••••••••"
                  placeholderTextColor={COLORS.textTertiary}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <Pressable
                  onPress={() => {
                    console.log('[SignIn] Toggle password visibility');
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

            <AnimatedPressable
              onPress={handleSignIn}
              disabled={loading}
              style={styles.signInButton}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.signInButtonText}>Sign In</Text>
              )}
            </AnimatedPressable>

            <View style={styles.signUpRow}>
              <Text style={styles.signUpPrompt}>Don't have an account?</Text>
              <Pressable onPress={handleGoToSignUp} hitSlop={8}>
                <Text style={styles.signUpLink}>Sign up</Text>
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
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  logoText: {
    color: '#FFFFFF',
    fontSize: 28,
    fontFamily: 'Outfit_700Bold',
  },
  appName: {
    fontSize: 28,
    fontFamily: 'Outfit_700Bold',
    color: COLORS.text,
    marginBottom: 6,
  },
  tagline: {
    fontSize: 15,
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
  formTitle: {
    fontSize: 22,
    fontFamily: 'Outfit_700Bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  formSubtitle: {
    fontSize: 14,
    fontFamily: 'Outfit_400Regular',
    color: COLORS.textSecondary,
    marginBottom: 24,
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
  signInButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 20,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  signInButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Outfit_600SemiBold',
  },
  signUpRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  signUpPrompt: {
    fontSize: 14,
    fontFamily: 'Outfit_400Regular',
    color: COLORS.textSecondary,
  },
  signUpLink: {
    fontSize: 14,
    fontFamily: 'Outfit_600SemiBold',
    color: COLORS.primary,
  },
});
