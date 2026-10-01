import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Mail, Lock, Eye, EyeOff, ArrowLeft, KeyRound } from 'lucide-react-native';
import { supabase } from '@/utils/supabase';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';

type Step = 'email' | 'otp' | 'newPassword';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSendOtp = async () => {
    if (!email.trim()) { setError('Please enter your email.'); return; }
    setError('');
    console.log('[ForgotPassword] Send OTP pressed for:', email.trim());
    setLoading(true);
    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { shouldCreateUser: false },
      });
      if (otpError) {
        console.error('[ForgotPassword] Send OTP error:', otpError.message);
        setError(otpError.message);
        return;
      }
      console.log('[ForgotPassword] OTP sent successfully');
      setStep('otp');
    } catch (err: any) {
      console.error('[ForgotPassword] Unexpected send OTP error:', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp.trim()) { setError('Please enter the code.'); return; }
    setError('');
    console.log('[ForgotPassword] Verify OTP pressed');
    setLoading(true);
    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: otp.trim(),
        type: 'email',
      });
      if (verifyError) {
        console.error('[ForgotPassword] Verify OTP error:', verifyError.message);
        setError('Invalid or expired code. Please try again.');
        return;
      }
      console.log('[ForgotPassword] OTP verified successfully');
      setStep('newPassword');
    } catch (err: any) {
      console.error('[ForgotPassword] Unexpected verify OTP error:', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSetNewPassword = async () => {
    if (!newPassword.trim() || !confirmPassword.trim()) { setError('Please fill in all fields.'); return; }
    if (newPassword !== confirmPassword) { setError('Passwords do not match.'); return; }
    if (newPassword.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setError('');
    console.log('[ForgotPassword] Set new password pressed');
    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) {
        console.error('[ForgotPassword] Update password error:', updateError.message);
        setError(updateError.message);
        return;
      }
      console.log('[ForgotPassword] Password updated successfully');
      Alert.alert('Success', 'Your password has been reset. Please sign in.', [
        { text: 'OK', onPress: () => router.replace('/(auth)/sign-in') },
      ]);
    } catch (err: any) {
      console.error('[ForgotPassword] Unexpected update password error:', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const stepTitles: Record<Step, { title: string; subtitle: string }> = {
    email: { title: 'Forgot Password', subtitle: 'Enter your email to receive a reset code' },
    otp: { title: 'Enter Code', subtitle: `We sent a 6-digit code to ${email}` },
    newPassword: { title: 'New Password', subtitle: 'Choose a new password for your account' },
  };

  const currentTitle = stepTitles[step].title;
  const currentSubtitle = stepTitles[step].subtitle;

  const isOtpDone = step === 'otp' || step === 'newPassword';
  const isNewPasswordDone = step === 'newPassword';

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.container, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <AnimatedPressable onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={20} color={COLORS.text} />
        </AnimatedPressable>

        <View style={styles.iconContainer}>
          <KeyRound size={36} color={COLORS.primary} />
        </View>

        <Text style={styles.title}>{currentTitle}</Text>
        <Text style={styles.subtitle}>{currentSubtitle}</Text>

        <View style={styles.stepRow}>
          <View style={[styles.stepDot, step === 'email' && styles.stepDotActive, isOtpDone && styles.stepDotDone]} />
          <View style={[styles.stepDot, step === 'otp' && styles.stepDotActive, isNewPasswordDone && styles.stepDotDone]} />
          <View style={[styles.stepDot, step === 'newPassword' && styles.stepDotActive]} />
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.form}>
          {step === 'email' && (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email Address</Text>
                <View style={styles.inputWrapper}>
                  <Mail size={18} color={COLORS.textTertiary} />
                  <TextInput
                    style={styles.input}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="you@example.com"
                    placeholderTextColor={COLORS.textTertiary}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!loading}
                  />
                </View>
              </View>
              <AnimatedPressable onPress={handleSendOtp} disabled={loading} style={styles.primaryBtn}>
                {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryBtnText}>Send Reset Code</Text>}
              </AnimatedPressable>
            </>
          )}

          {step === 'otp' && (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>6-Digit Code</Text>
                <TextInput
                  style={styles.otpInput}
                  value={otp}
                  onChangeText={setOtp}
                  placeholder="000000"
                  placeholderTextColor={COLORS.textTertiary}
                  keyboardType="number-pad"
                  maxLength={6}
                  editable={!loading}
                />
              </View>
              <AnimatedPressable onPress={handleVerifyOtp} disabled={loading} style={styles.primaryBtn}>
                {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryBtnText}>Verify Code</Text>}
              </AnimatedPressable>
              <Pressable onPress={handleSendOtp} style={styles.resendRow} hitSlop={8}>
                <Text style={styles.resendText}>
                  {"Didn't receive it? "}
                  <Text style={styles.resendLink}>Resend</Text>
                </Text>
              </Pressable>
            </>
          )}

          {step === 'newPassword' && (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>New Password</Text>
                <View style={styles.inputWrapper}>
                  <Lock size={18} color={COLORS.textTertiary} />
                  <TextInput
                    style={[styles.input, styles.inputFlex]}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    placeholder="At least 6 characters"
                    placeholderTextColor={COLORS.textTertiary}
                    secureTextEntry={!showNewPw}
                    autoCapitalize="none"
                    editable={!loading}
                  />
                  <Pressable onPress={() => setShowNewPw(v => !v)} hitSlop={8}>
                    {showNewPw ? <EyeOff size={18} color={COLORS.textTertiary} /> : <Eye size={18} color={COLORS.textTertiary} />}
                  </Pressable>
                </View>
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Confirm Password</Text>
                <View style={styles.inputWrapper}>
                  <Lock size={18} color={COLORS.textTertiary} />
                  <TextInput
                    style={[styles.input, styles.inputFlex]}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="Repeat new password"
                    placeholderTextColor={COLORS.textTertiary}
                    secureTextEntry={!showConfirmPw}
                    autoCapitalize="none"
                    editable={!loading}
                  />
                  <Pressable onPress={() => setShowConfirmPw(v => !v)} hitSlop={8}>
                    {showConfirmPw ? <EyeOff size={18} color={COLORS.textTertiary} /> : <Eye size={18} color={COLORS.textTertiary} />}
                  </Pressable>
                </View>
              </View>
              <AnimatedPressable onPress={handleSetNewPassword} disabled={loading} style={styles.primaryBtn}>
                {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryBtnText}>Set New Password</Text>}
              </AnimatedPressable>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.background },
  container: { flexGrow: 1, paddingHorizontal: 24 },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontFamily: 'Outfit_700Bold',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Outfit_400Regular',
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  stepRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.border,
  },
  stepDotActive: {
    backgroundColor: COLORS.primary,
    width: 24,
  },
  stepDotDone: {
    backgroundColor: COLORS.success,
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
  form: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  inputGroup: { marginBottom: 16 },
  inputLabel: {
    fontSize: 13,
    fontFamily: 'Outfit_500Medium',
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    height: 50,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Outfit_400Regular',
    color: COLORS.text,
  },
  inputFlex: { flex: 1 },
  otpInput: {
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    height: 56,
    fontSize: 28,
    fontFamily: 'Outfit_700Bold',
    color: COLORS.text,
    textAlign: 'center',
    letterSpacing: 8,
  },
  primaryBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Outfit_600SemiBold',
  },
  resendRow: {
    alignItems: 'center',
    marginTop: 16,
  },
  resendText: {
    fontSize: 13,
    fontFamily: 'Outfit_400Regular',
    color: COLORS.textSecondary,
  },
  resendLink: {
    fontFamily: 'Outfit_600SemiBold',
    color: COLORS.primary,
  },
});
