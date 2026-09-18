import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  useColorScheme,
  Pressable,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/utils/supabase';

export default function ConfirmScreen() {
  const { token_hash, type } = useLocalSearchParams<{ token_hash: string; type: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token_hash) {
      console.log('[Confirm] No token_hash param found, redirecting to sign-in');
      router.replace('/(auth)/sign-in');
      return;
    }

    async function verify() {
      console.log('[Confirm] Verifying OTP — type:', type, 'token_hash:', token_hash);
      const { error: verifyError } = await supabase.auth.verifyOtp({
        token_hash: token_hash as string,
        type: (type as string) as 'email',
      });

      if (verifyError) {
        console.error('[Confirm] OTP verification failed:', verifyError.message);
        setError('Confirmation failed. The link may have expired.');
      } else {
        console.log('[Confirm] OTP verification succeeded — waiting for onAuthStateChange');
        // onAuthStateChange in AuthContext will fire and redirect automatically
      }
    }

    verify();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleBackToSignIn = () => {
    console.log('[Confirm] User pressed "Back to Sign In"');
    router.replace('/(auth)/sign-in');
  };

  const backgroundColor = isDark ? '#0F1729' : '#F4F6FB';
  const textColor = isDark ? '#F4F6FB' : '#0F1729';
  const subTextColor = isDark ? '#94A3B8' : '#64748B';

  if (error) {
    return (
      <View style={[styles.container, { backgroundColor }]}>
        <Text style={[styles.errorTitle, { color: textColor }]}>
          Confirmation Failed
        </Text>
        <Text style={[styles.errorMessage, { color: subTextColor }]}>
          {error}
        </Text>
        <Pressable
          style={({ pressed }) => [styles.button, { opacity: pressed ? 0.8 : 1 }]}
          onPress={handleBackToSignIn}
        >
          <Text style={styles.buttonText}>Back to Sign In</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <ActivityIndicator size="large" color="#1B4FD8" />
      <Text style={[styles.loadingText, { color: subTextColor }]}>
        Confirming your account…
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontFamily: 'Outfit_400Regular',
    textAlign: 'center',
  },
  errorTitle: {
    fontSize: 22,
    fontFamily: 'Outfit_600SemiBold',
    marginBottom: 12,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 15,
    fontFamily: 'Outfit_400Regular',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  button: {
    backgroundColor: '#1B4FD8',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Outfit_600SemiBold',
    textAlign: 'center',
  },
});
