import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Linking,
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
  ExternalLink,
} from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { MembershipBadge } from '@/components/MembershipBadge';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { getInitials } from '@/utils/helpers';
import { supabase } from '@/utils/supabase';

interface NavItem {
  label: string;
  route: string;
  icon: React.ReactNode;
  iconActive: React.ReactNode;
  requiresPaid?: boolean;
  requiresAdmin?: boolean;
  externalUrl?: string | null;
  openInApp?: boolean;
}

interface MenuConfigRow {
  id: string;
  route: string;
  label: string;
  is_enabled: boolean;
  requires_paid: boolean;
  sort_order: number;
  external_url: string | null;
  open_in_app: boolean;
}

// Map route → icon factory so we can build icons dynamically from menu_config
function getIconsForRoute(route: string, active: boolean): { icon: React.ReactNode; iconActive: React.ReactNode } {
  const color = active ? COLORS.primary : COLORS.textSecondary;
  const activeColor = COLORS.primary;
  switch (route) {
    case '/(drawer)/home':
      return { icon: <House size={20} color={COLORS.textSecondary} />, iconActive: <House size={20} color={activeColor} /> };
    case '/(drawer)/magazine':
      return { icon: <BookOpen size={20} color={COLORS.textSecondary} />, iconActive: <BookOpen size={20} color={activeColor} /> };
    case '/(drawer)/events':
      return { icon: <Calendar size={20} color={COLORS.textSecondary} />, iconActive: <Calendar size={20} color={activeColor} /> };
    case '/(drawer)/store':
      return { icon: <ShoppingBag size={20} color={COLORS.textSecondary} />, iconActive: <ShoppingBag size={20} color={activeColor} /> };
    case '/(drawer)/training':
      return { icon: <GraduationCap size={20} color={COLORS.textSecondary} />, iconActive: <GraduationCap size={20} color={activeColor} /> };
    case '/(drawer)/interviews':
      return { icon: <Mic size={20} color={COLORS.textSecondary} />, iconActive: <Mic size={20} color={activeColor} /> };
    case '/(drawer)/webinars':
      return { icon: <Video size={20} color={COLORS.textSecondary} />, iconActive: <Video size={20} color={activeColor} /> };
    case '/(drawer)/community':
      return { icon: <Users size={20} color={COLORS.textSecondary} />, iconActive: <Users size={20} color={activeColor} /> };
    default:
      if (route.startsWith('external_')) {
        return { icon: <ExternalLink size={20} color={COLORS.textSecondary} />, iconActive: <ExternalLink size={20} color={activeColor} /> };
      }
      return { icon: <BookOpen size={20} color={COLORS.textSecondary} />, iconActive: <BookOpen size={20} color={activeColor} /> };
  }
}

// Hardcoded fallback nav items (used when menu_config is unavailable)
const FALLBACK_FREE_ITEMS: Omit<NavItem, 'icon' | 'iconActive'>[] = [
  { label: 'Home', route: '/(drawer)/home' },
  { label: 'Magazine', route: '/(drawer)/magazine' },
  { label: 'Events', route: '/(drawer)/events' },
  { label: 'Store', route: '/(drawer)/store' },
];

const FALLBACK_PAID_ITEMS: Omit<NavItem, 'icon' | 'iconActive'>[] = [
  { label: 'Training', route: '/(drawer)/training', requiresPaid: true },
  { label: 'Interviews', route: '/(drawer)/interviews', requiresPaid: true },
  { label: 'Webinars', route: '/(drawer)/webinars', requiresPaid: true },
  { label: 'Community', route: '/(drawer)/community', requiresPaid: true },
];

export function DrawerContent(props: any) {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { profile, signOut } = useAuth();

  const isPaid = profile?.membership_tier === 'paid';
  const isAdmin = profile?.role === 'admin';

  const [menuConfig, setMenuConfig] = useState<MenuConfigRow[] | null>(null);

  useEffect(() => {
    const fetchMenuConfig = async () => {
      try {
        const { data, error } = await supabase
          .from('menu_config')
          .select('*')
          .order('sort_order', { ascending: true });
        if (error) {
          console.log('[DrawerContent] menu_config fetch error (using fallback):', error.message);
          setMenuConfig(null);
        } else {
          console.log('[DrawerContent] menu_config loaded:', data?.length ?? 0, 'items');
          setMenuConfig((data as MenuConfigRow[]) ?? null);
        }
      } catch (err) {
        console.log('[DrawerContent] menu_config fetch exception (using fallback):', err);
        setMenuConfig(null);
      }
    };

    fetchMenuConfig();

    const channel = supabase
      .channel('menu_config_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'menu_config' },
        () => {
          console.log('[DrawerContent] menu_config changed, re-fetching');
          fetchMenuConfig();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Build nav items from menu_config if available, otherwise use hardcoded fallback
  let freeItems: NavItem[];
  let paidItems: NavItem[];

  if (menuConfig && menuConfig.length > 0) {
    const enabledRows = menuConfig.filter((r) => r.is_enabled);
    const freeRows = enabledRows.filter((r) => !r.requires_paid);
    const paidRows = enabledRows.filter((r) => r.requires_paid);

    freeItems = freeRows.map((r) => {
      const icons = getIconsForRoute(r.route, false);
      return {
        label: r.label,
        route: r.route,
        icon: icons.icon,
        iconActive: icons.iconActive,
        requiresPaid: false,
        externalUrl: r.external_url,
        openInApp: r.open_in_app,
      };
    });

    paidItems = paidRows.map((r) => {
      const icons = getIconsForRoute(r.route, false);
      return {
        label: r.label,
        route: r.route,
        icon: icons.icon,
        iconActive: icons.iconActive,
        requiresPaid: r.requires_paid,
        externalUrl: r.external_url,
        openInApp: r.open_in_app,
      };
    });
  } else {
    // Fallback to hardcoded items
    freeItems = FALLBACK_FREE_ITEMS.map((item) => {
      const icons = getIconsForRoute(item.route, false);
      return { ...item, icon: icons.icon, iconActive: icons.iconActive };
    });
    paidItems = FALLBACK_PAID_ITEMS.map((item) => {
      const icons = getIconsForRoute(item.route, false);
      return { ...item, icon: icons.icon, iconActive: icons.iconActive };
    });
  }

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
    console.log('[DrawerContent] Nav item pressed:', item.label, '→', item.externalUrl ?? item.route);
    props.navigation.closeDrawer();
    if (item.externalUrl) {
      if (item.openInApp) {
        console.log('[DrawerContent] Opening URL in-app WebView:', item.externalUrl);
        router.push({
          pathname: '/(drawer)/webview',
          params: { url: item.externalUrl, title: item.label },
        });
      } else {
        console.log('[DrawerContent] Opening URL in device browser:', item.externalUrl);
        Linking.openURL(item.externalUrl);
      }
    } else {
      router.push(item.route as any);
    }
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
    const locked = item.requiresPaid && !isPaid && !isAdmin;

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
