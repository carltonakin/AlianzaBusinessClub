import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '@/constants/Colors';

interface MembershipBadgeProps {
  tier: 'free' | 'paid';
  size?: 'sm' | 'md' | 'lg';
}

export function MembershipBadge({ tier, size = 'md' }: MembershipBadgeProps) {
  const label = tier === 'paid' ? 'PAID' : 'FREE';
  const bgColor = tier === 'paid' ? COLORS.paid : COLORS.free;

  const paddingH = size === 'sm' ? 6 : size === 'lg' ? 14 : 10;
  const paddingV = size === 'sm' ? 2 : size === 'lg' ? 6 : 4;
  const fontSize = size === 'sm' ? 9 : size === 'lg' ? 13 : 11;

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: bgColor,
          paddingHorizontal: paddingH,
          paddingVertical: paddingV,
        },
      ]}
    >
      <Text style={[styles.label, { fontSize }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  label: {
    color: '#FFFFFF',
    fontFamily: 'Outfit_700Bold',
    letterSpacing: 0.8,
  },
});
