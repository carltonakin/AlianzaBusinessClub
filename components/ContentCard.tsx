import React from 'react';
import { View, Text, Image, StyleSheet, ImageSourcePropType } from 'react-native';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';

function resolveImageSource(source: string | number | ImageSourcePropType | null | undefined): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

interface ContentCardProps {
  title: string;
  description?: string | null;
  thumbnailUrl?: string | number | ImageSourcePropType | null;
  badge?: string | null;
  badgeColor?: string;
  subtitle?: string | null;
  subtitleSecondary?: string | null;
  onPress?: () => void;
}

export function ContentCard({
  title,
  description,
  thumbnailUrl,
  badge,
  badgeColor = COLORS.primary,
  subtitle,
  subtitleSecondary,
  onPress,
}: ContentCardProps) {
  return (
    <AnimatedPressable onPress={onPress} style={styles.card}>
      {thumbnailUrl ? (
        <Image source={resolveImageSource(thumbnailUrl)} style={styles.thumbnail} />
      ) : (
        <View style={styles.thumbnailPlaceholder} />
      )}
      <View style={styles.content}>
        {badge ? (
          <View style={[styles.badge, { backgroundColor: badgeColor + '20' }]}>
            <Text style={[styles.badgeText, { color: badgeColor }]}>{badge}</Text>
          </View>
        ) : null}
        <Text style={styles.title} numberOfLines={2}>{title}</Text>
        {description ? (
          <Text style={styles.description} numberOfLines={2}>{description}</Text>
        ) : null}
        {subtitle ? (
          <View style={styles.subtitleRow}>
            <Text style={styles.subtitle}>{subtitle}</Text>
            {subtitleSecondary ? (
              <Text style={styles.subtitleSecondary}>{subtitleSecondary}</Text>
            ) : null}
          </View>
        ) : null}
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  thumbnail: {
    width: '100%',
    height: 180,
    backgroundColor: COLORS.surfaceSecondary,
  },
  thumbnailPlaceholder: {
    width: '100%',
    height: 180,
    backgroundColor: COLORS.surfaceSecondary,
  },
  content: {
    padding: 16,
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 8,
  },
  badgeText: {
    fontSize: 11,
    fontFamily: 'Outfit_600SemiBold',
    letterSpacing: 0.4,
  },
  title: {
    fontSize: 16,
    fontFamily: 'Outfit_600SemiBold',
    color: COLORS.text,
    marginBottom: 6,
    lineHeight: 22,
  },
  description: {
    fontSize: 14,
    fontFamily: 'Outfit_400Regular',
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: 8,
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: 'Outfit_500Medium',
    color: COLORS.primary,
  },
  subtitleSecondary: {
    fontSize: 13,
    fontFamily: 'Outfit_400Regular',
    color: COLORS.textTertiary,
  },
});
