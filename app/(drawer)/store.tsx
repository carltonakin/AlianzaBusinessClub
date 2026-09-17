import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { LinearGradient } from 'expo-linear-gradient';
import { ShoppingBag, Tag, BookOpen, FileText, Star } from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';
import { DrawerHeader } from '@/components/DrawerHeader';
import { AnimatedPressable } from '@/components/AnimatedPressable';

const STORE_URL = 'https://www.lacuponeradigital.com/ofertas/';

const CATEGORIES = [
  { label: 'Marketing Tools', icon: <Tag size={24} color={COLORS.primary} />, color: COLORS.primaryMuted },
  { label: 'Training Materials', icon: <BookOpen size={24} color={COLORS.success} />, color: 'rgba(16,185,129,0.1)' },
  { label: 'Templates', icon: <FileText size={24} color={COLORS.accent} />, color: COLORS.accentMuted },
  { label: 'Merchandise', icon: <Star size={24} color={COLORS.danger} />, color: 'rgba(239,68,68,0.1)' },
];

export default function StoreScreen() {
  const handleOpenStore = async () => {
    console.log('[Store] Browse store button pressed, opening:', STORE_URL);
    await WebBrowser.openBrowserAsync(STORE_URL);
  };

  const handleCategoryPress = async (label: string) => {
    console.log('[Store] Category pressed:', label, '→ opening store URL');
    await WebBrowser.openBrowserAsync(STORE_URL);
  };

  return (
    <View style={styles.container}>
      <DrawerHeader title="Store" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Banner */}
        <LinearGradient
          colors={[COLORS.accent, '#D97706']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroBanner}
        >
          <ShoppingBag size={40} color="#FFFFFF" />
          <Text style={styles.heroTitle}>Nexus Hub Store</Text>
          <Text style={styles.heroSubtitle}>
            Exclusive tools, templates, and resources to grow your business.
          </Text>
          <AnimatedPressable onPress={handleOpenStore} style={styles.browseButton}>
            <Text style={styles.browseButtonText}>Browse Our Store</Text>
          </AnimatedPressable>
        </LinearGradient>

        {/* Featured Categories */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Featured Categories</Text>
          <View style={styles.categoriesGrid}>
            {CATEGORIES.map((cat) => (
              <AnimatedPressable
                key={cat.label}
                onPress={() => handleCategoryPress(cat.label)}
                style={styles.categoryCard}
              >
                <View style={[styles.categoryIcon, { backgroundColor: cat.color }]}>
                  {cat.icon}
                </View>
                <Text style={styles.categoryLabel}>{cat.label}</Text>
              </AnimatedPressable>
            ))}
          </View>
        </View>

        {/* CTA */}
        <View style={styles.ctaSection}>
          <Text style={styles.ctaTitle}>Ready to level up?</Text>
          <Text style={styles.ctaSubtitle}>
            Browse our full catalog of premium resources designed for entrepreneurs and marketers.
          </Text>
          <AnimatedPressable onPress={handleOpenStore} style={styles.ctaButton}>
            <ShoppingBag size={18} color="#FFFFFF" />
            <Text style={styles.ctaButtonText}>Shop Now</Text>
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
  heroBanner: {
    margin: 16,
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    gap: 12,
  },
  heroTitle: {
    fontSize: 24,
    fontFamily: 'Outfit_700Bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 14,
    fontFamily: 'Outfit_400Regular',
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    lineHeight: 20,
  },
  browseButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 32,
    marginTop: 8,
  },
  browseButtonText: {
    color: COLORS.accent,
    fontSize: 16,
    fontFamily: 'Outfit_700Bold',
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Outfit_700Bold',
    color: COLORS.text,
    marginBottom: 16,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryCard: {
    width: '47%',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  categoryIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryLabel: {
    fontSize: 13,
    fontFamily: 'Outfit_600SemiBold',
    color: COLORS.text,
    textAlign: 'center',
  },
  ctaSection: {
    marginHorizontal: 16,
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 10,
  },
  ctaTitle: {
    fontSize: 20,
    fontFamily: 'Outfit_700Bold',
    color: COLORS.text,
  },
  ctaSubtitle: {
    fontSize: 14,
    fontFamily: 'Outfit_400Regular',
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 32,
    marginTop: 8,
  },
  ctaButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Outfit_600SemiBold',
  },
});
