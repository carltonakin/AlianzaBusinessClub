import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Lock } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';

interface MembershipGateProps {
  featureName?: string;
}

export function MembershipGate({ featureName = 'this content' }: MembershipGateProps) {
  const router = useRouter();

  const handleGoBack = () => {
    console.log('[MembershipGate] Go back pressed');
    router.back();
  };

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Lock size={40} color={COLORS.primary} />
      </View>
      <Text style={styles.title}>Members Only</Text>
      <Text style={styles.description}>
        Access to {featureName} is restricted. Please contact support if you believe this is an error.
      </Text>
      <AnimatedPressable onPress={handleGoBack} style={styles.backButton}>
        <Text style={styles.backButtonText}>Go Back</Text>
      </AnimatedPressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    backgroundColor: COLORS.background,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: COLORS.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontFamily: 'Outfit_700Bold',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    fontFamily: 'Outfit_400Regular',
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  backButton: {
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 40,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  backButtonText: {
    color: COLORS.textSecondary,
    fontSize: 16,
    fontFamily: 'Outfit_500Medium',
  },
});
