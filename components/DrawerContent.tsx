import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
} from 'react-native';
import { DrawerContentScrollView } from '@react-navigation/drawer';
import { useRouter, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  House,
  BookOpen,
  Calendar,
  ShoppingBag,
  GraduationCap,
  Mic,
  Video,
  Users,
  User,
  Shield,
  LogOut,
  Lock,
} from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { MembershipBadge } from '@/components/MembershipBadge';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { getInitials } from '@/utils/helpers';

interface NavItem {
  label: string;
  route: string;
  icon: React.ReactNode;
  iconActive: React.ReactNode;
  requiresPaid?: boolean;
  requiresAdmin?: boolean;
}

export function DrawerContent(props: any) {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { profile, signOut } = useAuth();

  const isPaid = profile?.membership_tier === 'paid';
  const isAdmin = profile?.role === 'admin';

  const freeItems: NavItem[] = [
    {
      label: 'Home',
      route: '/(drawer)/home',
      icon: <House size={20} color={COLORS.textSecondary} />,
      iconActive: <House size={20} color={COLORS.primary} />,
    },
    {
      label: 'Magazine',
      route: '/(drawer)/magazine',
      icon: <BookOpen size={20} color={COLORS.textSecondary} />,
      iconActive: <BookOpen size={20} color={COLORS.primary} />,
    },
    {
      label: 'Events',
      route: '/(drawer)/events',
      icon: <Calendar size={20} color={COLORS.textSecondary} />,
      iconActive: <Calendar size={20} color={COLORS.primary} />,
    },
    {
      label: 'Store',
      route: '/(drawer)/store',
      icon: <ShoppingBag size={20} color={COLORS.textSecondary} />,
      iconActive: <ShoppingBag size={20} color={COLORS.primary} />,
    },
  ];

  const paidItems: NavItem[] = [
    {
      label: 'Training',
      route: '/(drawer)/training',
      icon: <GraduationCap size={20} color={COLORS.textSecondary} />,
      iconActive: <GraduationCap size={20} color={COLORS.primary} />,
      requiresPaid: true,
    },
    {
      label: 'Interviews',
      route: '/(drawer)/interviews',
      icon: <Mic size={20} color={COLORS.textSecondary} />,
      iconActive: <Mic size={20} color={COLORS.primary} />,
      requiresPaid: true,
    },
    {
      label: 'Webinars',
      route: '/(drawer)/webinars',
      icon: <Video size={20} color={COLORS.textSecondary} />,
      iconActive: <Video size={20} color={COLORS.primary} />,
      requiresPaid: true,
    },
    {
      label: 'Community',
      route: '/(drawer)/community',
      icon: <Users size={20} color={COLORS.textSecondary} />,
      iconActive: <Users size={20} color={COLORS.primary} />,
      requiresPaid: true,
    },
  ];

  const accountItems: NavItem[] = [
    {
      label: 'Profile',
      route: '/(drawer)/profile',
      icon: <User size={20} color={COLORS.textSecondary} />,
      iconActive: <User size={20} color={COLORS.primary} />,
    },
  ];

  const isActive = (route: string) => {
    const routeName = route.replace('/(drawer)/', '');
    return pathname.includes(routeName);
  };

  const handleNavPress = (item: NavItem) => {
    console.log('[DrawerContent] Nav item pressed:', item.label, '→', item.route);
    props.navigation.closeDrawer();
    router.push(item.route as any);
  };

  const handleSignOut = () => {
    console.log('[DrawerContent] Sign out pressed');
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          console.log('[DrawerContent] Confirming sign out');
          await signOut();
          router.replace('/(auth)/sign-in');
        },
      },
    ]);
  };

  const initials = getInitials(profile?.full_name, profile?.email);
  const displayName = profile?.full_name || profile?.email || 'Member';
  const displayEmail = profile?.email || '';

  const renderNavItem = (item: NavItem) => {
    const active = isActive(item.route);
    const locked = item.requiresPaid && !isPaid;

    return (
      <AnimatedPressable
        key={item.route}
        onPress={() => handleNavPress(item)}
        style={[styles.navItem, active && styles.navItemActive]}
      >
        <View style={styles.navIcon}>
          {active ? item.iconActive : item.icon}
        </View>
        <Text style={[styles.navLabel, active && styles.navLabelActive]}>
          {item.label}
        </Text>
        {locked ? (
          <Lock size={14} color={COLORS.textTertiary} />
        ) : null}
      </AnimatedPressable>
    );
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      {/* User Header */}
      <View style={[styles.userHeader, { paddingTop: insets.top + 16 }]}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName} numberOfLines={1}>{displayName}</Text>
          <Text style={styles.userEmail} numberOfLines={1}>{displayEmail}</Text>
          <View style={{ marginTop: 6 }}>
            <MembershipBadge tier={profile?.membership_tier || 'free'} size="sm" />
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
      >
        {/* Free items */}
        <View style={styles.section}>
          {freeItems.map(renderNavItem)}
        </View>

        {/* Members Only divider */}
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerLabel}>MEMBERS ONLY</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Paid items */}
        <View style={styles.section}>
          {paidItems.map(renderNavItem)}
        </View>

        {/* Divider */}
        <View style={styles.simpleDivider} />

        {/* Account items */}
        <View style={styles.section}>
          {accountItems.map(renderNavItem)}
          {isAdmin ? (
            <AnimatedPressable
              onPress={() => {
                console.log('[DrawerContent] Admin panel pressed');
                props.navigation.closeDrawer();
                router.push('/(drawer)/admin');
              }}
              style={[styles.navItem, isActive('/(drawer)/admin') && styles.navItemActive]}
            >
              <View style={styles.navIcon}>
                <Shield size={20} color={isActive('/(drawer)/admin') ? COLORS.primary : COLORS.textSecondary} />
              </View>
              <Text style={[styles.navLabel, isActive('/(drawer)/admin') && styles.navLabelActive]}>
                Admin
              </Text>
            </AnimatedPressable>
          ) : null}
        </View>
      </ScrollView>

      {/* Sign Out */}
      <View style={styles.signOutContainer}>
        <View style={styles.simpleDivider} />
        <AnimatedPressable onPress={handleSignOut} style={styles.signOutButton}>
          <LogOut size={20} color={COLORS.danger} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </AnimatedPressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 14,
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: 'Outfit_700Bold',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 15,
    fontFamily: 'Outfit_600SemiBold',
    color: COLORS.text,
  },
  userEmail: {
    fontSize: 12,
    fontFamily: 'Outfit_400Regular',
    color: COLORS.textTertiary,
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
    paddingTop: 8,
  },
  section: {
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 2,
    gap: 12,
  },
  navItemActive: {
    backgroundColor: COLORS.primaryMuted,
  },
  navIcon: {
    width: 24,
    alignItems: 'center',
  },
  navLabel: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Outfit_500Medium',
    color: COLORS.textSecondary,
  },
  navLabelActive: {
    color: COLORS.primary,
    fontFamily: 'Outfit_600SemiBold',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginVertical: 8,
    gap: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.divider,
  },
  dividerLabel: {
    fontSize: 10,
    fontFamily: 'Outfit_600SemiBold',
    color: COLORS.textTertiary,
    letterSpacing: 1,
  },
  simpleDivider: {
    height: 1,
    backgroundColor: COLORS.divider,
    marginHorizontal: 20,
    marginVertical: 8,
  },
  signOutContainer: {
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 10,
    gap: 12,
  },
  signOutText: {
    fontSize: 15,
    fontFamily: 'Outfit_500Medium',
    color: COLORS.danger,
  },
});
