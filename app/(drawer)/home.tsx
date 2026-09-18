import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  Pressable,
  Animated,
  Image,
  ImageSourcePropType,
  Dimensions,
  Alert,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Bell,
  BookOpen,
  Calendar,
  ShoppingBag,
  GraduationCap,
  Users,
  Star,
  Globe,
  Video,
  Mic,
  FileText,
  Home,
  Settings,
  Heart,
  Zap,
  Award,
  Briefcase,
  Link,
  Map,
  Phone,
  Lock,
  MapPin,
  Wifi,
} from 'lucide-react-native';
import { supabase } from '@/utils/supabase';
import { COLORS } from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { DrawerHeader } from '@/components/DrawerHeader';
import { MembershipBadge } from '@/components/MembershipBadge';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { CardSkeleton } from '@/components/SkeletonLoader';
import { Event, TrainingPost, Interview, Webinar } from '@/types';
import { formatEventDate, getInitials } from '@/utils/helpers';

const { width: screenWidth } = Dimensions.get('window');
const GRID_ITEM_WIDTH = (screenWidth - 32 - 16) / 5;

function resolveImageSource(source: string | number | ImageSourcePropType | null | undefined): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

function getIcon(name: string, color: string, size = 20): React.ReactNode {
  const icons: Record<string, React.ReactNode> = {
    BookOpen: <BookOpen size={size} color={color} />,
    Calendar: <Calendar size={size} color={color} />,
    ShoppingBag: <ShoppingBag size={size} color={color} />,
    GraduationCap: <GraduationCap size={size} color={color} />,
    Users: <Users size={size} color={color} />,
    Star: <Star size={size} color={color} />,
    Globe: <Globe size={size} color={color} />,
    Bell: <Bell size={size} color={color} />,
    Video: <Video size={size} color={color} />,
    Mic: <Mic size={size} color={color} />,
    FileText: <FileText size={size} color={color} />,
    Home: <Home size={size} color={color} />,
    Settings: <Settings size={size} color={color} />,
    Heart: <Heart size={size} color={color} />,
    Zap: <Zap size={size} color={color} />,
    Award: <Award size={size} color={color} />,
    Briefcase: <Briefcase size={size} color={color} />,
    Link: <Link size={size} color={color} />,
    Map: <Map size={size} color={color} />,
    Phone: <Phone size={size} color={color} />,
  };
  return icons[name] ?? <Star size={size} color={color} />;
}

interface QuickAccessRow {
  id: string;
  label: string;
  icon_name: string;
  link_type: 'internal' | 'external';
  route: string | null;
  external_url: string | null;
  open_in_app: boolean;
  requires_paid: boolean;
  sort_order: number;
  is_enabled: boolean;
}

interface HomeSectionRow {
  id: string;
  title: string;
  link_type: 'content' | 'external';
  content_type: 'events' | 'training' | 'interviews' | 'webinars';
  external_url: string | null;
  open_in_app: boolean;
  preview_image_url: string | null;
  preview_description: string | null;
  item_limit: number;
  sort_order: number;
  is_enabled: boolean;
  requires_paid: boolean;
}

const SECTION_ROUTES: Record<string, string> = {
  events: '/(drawer)/events',
  training: '/(drawer)/training',
  interviews: '/(drawer)/interviews',
  webinars: '/(drawer)/webinars',
};

export default function HomeScreen() {
  const router = useRouter();
  const { profile } = useAuth();

  const isPaid = profile?.membership_tier === 'paid';
  const initials = getInitials(profile?.full_name, profile?.email);
  const displayName = profile?.full_name || 'Member';

  const heroAnim = useRef(new Animated.Value(0)).current;
  const contentAnim = useRef(new Animated.Value(0)).current;

  // Quick access
  const [quickAccessItems, setQuickAccessItems] = useState<QuickAccessRow[]>([]);
  const [quickAccessLoading, setQuickAccessLoading] = useState(true);

  // Home sections
  const [homeSections, setHomeSections] = useState<HomeSectionRow[]>([]);
  const [sectionsLoading, setSectionsLoading] = useState(true);

  // Section content keyed by section id
  const [sectionContent, setSectionContent] = useState<Record<string, (Event | TrainingPost | Interview | Webinar)[]>>({});

  useEffect(() => {
    Animated.sequence([
      Animated.timing(heroAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(contentAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();

    fetchQuickAccess();
    fetchHomeSections();

    // Real-time subscription for quick access
    const qaSub = supabase
      .channel('home_quick_access')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'home_quick_access' }, () => {
        console.log('[Home] Real-time: home_quick_access changed, re-fetching');
        fetchQuickAccess();
      })
      .subscribe();

    // Real-time subscription for home sections
    const hsSub = supabase
      .channel('home_sections')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'home_sections' }, () => {
        console.log('[Home] Real-time: home_sections changed, re-fetching');
        fetchHomeSections();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(qaSub);
      supabase.removeChannel(hsSub);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchQuickAccess = async () => {
    console.log('[Home] Fetching quick access items');
    try {
      const { data, error } = await supabase
        .from('home_quick_access')
        .select('*')
        .eq('is_enabled', true)
        .order('sort_order', { ascending: true })
        .limit(25);
      if (error) {
        console.error('[Home] Quick access fetch error:', error.message);
      } else {
        console.log('[Home] Quick access items fetched:', data?.length ?? 0);
        setQuickAccessItems((data as QuickAccessRow[]) ?? []);
      }
    } catch (err) {
      console.error('[Home] Quick access fetch unexpected error:', err);
    } finally {
      setQuickAccessLoading(false);
    }
  };

  const fetchHomeSections = async () => {
    console.log('[Home] Fetching home sections');
    setSectionsLoading(true);
    try {
      const { data, error } = await supabase
        .from('home_sections')
        .select('*')
        .eq('is_enabled', true)
        .order('sort_order', { ascending: true });
      if (error) {
        console.error('[Home] Home sections fetch error:', error.message);
        setSectionsLoading(false);
        return;
      }
      const sections = (data as HomeSectionRow[]) ?? [];
      console.log('[Home] Home sections fetched:', sections.length);
      setHomeSections(sections);

      // Fetch content for each section (skip external link sections)
      const contentMap: Record<string, (Event | TrainingPost | Interview | Webinar)[]> = {};
      await Promise.all(
        sections.map(async (section) => {
          if (section.link_type === 'external') {
            contentMap[section.id] = [];
            return;
          }
          try {
            const content = await fetchSectionContent(section.content_type, section.item_limit);
            contentMap[section.id] = content;
          } catch (e) {
            console.error('[Home] Section content fetch error for', section.id, e);
            contentMap[section.id] = [];
          }
        })
      );
      setSectionContent(contentMap);
    } catch (err) {
      console.error('[Home] Home sections fetch unexpected error:', err);
    } finally {
      setSectionsLoading(false);
    }
  };

  const fetchSectionContent = async (
    contentType: HomeSectionRow['content_type'],
    limit: number
  ): Promise<(Event | TrainingPost | Interview | Webinar)[]> => {
    if (contentType === 'events') {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('is_published', true)
        .order('event_date', { ascending: true })
        .limit(limit);
      if (error) throw error;
      return (data as Event[]) ?? [];
    } else if (contentType === 'training') {
      const { data, error } = await supabase
        .from('training_posts')
        .select('*')
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data as TrainingPost[]) ?? [];
    } else if (contentType === 'interviews') {
      const { data, error } = await supabase
        .from('interviews')
        .select('*')
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data as Interview[]) ?? [];
    } else {
      const { data, error } = await supabase
        .from('webinars')
        .select('*')
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data as Webinar[]) ?? [];
    }
  };

  const handleQuickAccessPress = (item: QuickAccessRow) => {
    console.log('[Home] Quick access pressed:', item.label, 'link_type:', item.link_type);
    if (item.requires_paid && !isPaid) {
      console.log('[Home] Quick access locked — upgrade required:', item.label);
      Alert.alert('Members Only', 'Upgrade to access this feature.');
      return;
    }
    if (item.link_type === 'internal' && item.route) {
      router.push(item.route as any);
    } else if (item.link_type === 'external') {
      if (item.open_in_app && item.external_url) {
        router.push({ pathname: '/(drawer)/webview', params: { url: item.external_url, title: item.label } } as any);
      } else if (item.external_url) {
        Linking.openURL(item.external_url);
      }
    }
  };

  const handleBellPress = () => {
    console.log('[Home] Bell icon pressed — navigating to notifications');
    router.push('/(drawer)/notifications');
  };

  const renderEventCard = ({ item }: { item: Event }) => {
    const dateDisplay = formatEventDate(item.event_date);
    return (
      <AnimatedPressable
        onPress={() => {
          console.log('[Home] Event card pressed:', item.title);
        }}
        style={styles.eventCard}
      >
        <Image source={resolveImageSource(item.image_url)} style={styles.eventImage} />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.7)']}
          style={styles.eventGradient}
        />
        <View style={styles.eventContent}>
          {item.is_virtual ? (
            <View style={styles.virtualBadge}>
              <Wifi size={10} color="#FFFFFF" />
              <Text style={styles.virtualBadgeText}>Virtual</Text>
            </View>
          ) : null}
          <Text style={styles.eventTitle} numberOfLines={2}>{item.title}</Text>
          <View style={styles.eventMeta}>
            <Calendar size={12} color="rgba(255,255,255,0.8)" />
            <Text style={styles.eventDate}>{dateDisplay}</Text>
          </View>
          {item.location ? (
            <View style={styles.eventMeta}>
              <MapPin size={12} color="rgba(255,255,255,0.8)" />
              <Text style={styles.eventLocation} numberOfLines={1}>{item.location}</Text>
            </View>
          ) : null}
        </View>
      </AnimatedPressable>
    );
  };

  const renderTrainingCard = ({ item }: { item: TrainingPost }) => (
    <AnimatedPressable
      onPress={() => {
        console.log('[Home] Training card pressed:', item.title);
        router.push(`/(drawer)/training/${item.id}` as any);
      }}
      style={styles.contentCard}
    >
      <Image source={resolveImageSource(item.thumbnail_url)} style={styles.contentCardImage} />
      <View style={styles.contentCardBody}>
        {item.category ? (
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryBadgeText}>{item.category}</Text>
          </View>
        ) : null}
        <Text style={styles.contentCardTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.contentCardDesc} numberOfLines={2}>{item.description}</Text>
      </View>
    </AnimatedPressable>
  );

  const renderInterviewCard = ({ item }: { item: Interview }) => (
    <AnimatedPressable
      onPress={() => {
        console.log('[Home] Interview card pressed:', item.title);
        router.push(`/(drawer)/interviews/${item.id}` as any);
      }}
      style={styles.contentCard}
    >
      <Image source={resolveImageSource(item.thumbnail_url)} style={styles.contentCardImage} />
      <View style={styles.contentCardBody}>
        <Text style={styles.contentCardTitle} numberOfLines={2}>{item.title}</Text>
        {item.guest_name ? (
          <Text style={styles.guestName}>{item.guest_name}</Text>
        ) : null}
        {item.guest_title ? (
          <Text style={styles.guestTitle}>{item.guest_title}</Text>
        ) : null}
      </View>
    </AnimatedPressable>
  );

  const renderWebinarCard = ({ item }: { item: Webinar }) => (
    <AnimatedPressable
      onPress={() => {
        console.log('[Home] Webinar card pressed:', item.title);
        router.push('/(drawer)/webinars' as any);
      }}
      style={styles.contentCard}
    >
      <Image source={resolveImageSource(item.thumbnail_url)} style={styles.contentCardImage} />
      <View style={styles.contentCardBody}>
        <Text style={styles.contentCardTitle} numberOfLines={2}>{item.title}</Text>
        {item.description ? (
          <Text style={styles.contentCardDesc} numberOfLines={2}>{item.description}</Text>
        ) : null}
      </View>
    </AnimatedPressable>
  );

  const renderQuickAccessItem = ({ item }: { item: QuickAccessRow }) => {
    const isLocked = item.requires_paid && !isPaid;
    const iconColor = isLocked ? COLORS.textTertiary : COLORS.primary;
    return (
      <AnimatedPressable
        onPress={() => handleQuickAccessPress(item)}
        style={[styles.gridItem, { width: GRID_ITEM_WIDTH }]}
      >
        <View style={[styles.gridIcon, isLocked && styles.gridIconLocked]}>
          {getIcon(item.icon_name, iconColor, 18)}
          {isLocked ? (
            <View style={styles.lockOverlay}>
              <Lock size={9} color={COLORS.textTertiary} />
            </View>
          ) : null}
        </View>
        <Text style={[styles.gridLabel, isLocked && styles.gridLabelLocked]} numberOfLines={1}>
          {item.label}
        </Text>
      </AnimatedPressable>
    );
  };

  const renderExternalSection = (section: HomeSectionRow) => {
    const isLocked = section.requires_paid && !isPaid;
    const hasImage = !!section.preview_image_url;

    const handlePress = () => {
      if (!section.external_url) return;
      console.log('[Home] External section pressed:', section.title, 'url:', section.external_url, 'open_in_app:', section.open_in_app);
      if (section.open_in_app) {
        router.push({ pathname: '/(drawer)/webview', params: { url: section.external_url, title: section.title } } as any);
      } else {
        Linking.openURL(section.external_url);
      }
    };

    return (
      <View key={section.id} style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Globe size={16} color={COLORS.primary} />
            <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>{section.title}</Text>
          </View>
        </View>
        {isLocked ? (
          <View style={styles.lockedSectionCard}>
            <Lock size={22} color={COLORS.textTertiary} />
            <Text style={styles.lockedSectionText}>Upgrade to unlock</Text>
          </View>
        ) : (
          <AnimatedPressable onPress={handlePress} style={styles.contentCard}>
            {hasImage ? (
              <Image source={resolveImageSource(section.preview_image_url)} style={styles.contentCardImage} resizeMode="cover" />
            ) : (
              <LinearGradient
                colors={[COLORS.primary, COLORS.primaryDark]}
                style={[styles.contentCardImage, { alignItems: 'center', justifyContent: 'center' }]}
              >
                <Globe size={28} color="rgba(255,255,255,0.7)" />
              </LinearGradient>
            )}
            <View style={[styles.contentCardBody, { justifyContent: 'space-between' }]}>
              <View>
                <Text style={styles.contentCardTitle} numberOfLines={2}>{section.title}</Text>
                {section.preview_description ? (
                  <Text style={styles.contentCardDesc} numberOfLines={2}>{section.preview_description}</Text>
                ) : null}
              </View>
              <Text style={styles.externalVisitLabel}>
                {section.open_in_app ? 'Open →' : 'Visit →'}
              </Text>
            </View>
          </AnimatedPressable>
        )}
      </View>
    );
  };

  const renderSection = (section: HomeSectionRow) => {
    if (section.link_type === 'external') {
      return renderExternalSection(section);
    }

    const isLocked = section.requires_paid && !isPaid;
    const items = sectionContent[section.id] ?? [];
    const seeAllRoute = SECTION_ROUTES[section.content_type] ?? '/(drawer)/home';

    return (
      <View key={section.id} style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <Pressable
            onPress={() => {
              console.log('[Home] See all pressed for section:', section.title, '→', seeAllRoute);
              router.push(seeAllRoute as any);
            }}
            hitSlop={8}
          >
            <Text style={styles.seeAll}>See all</Text>
          </Pressable>
        </View>

        {isLocked ? (
          <View style={styles.lockedSectionCard}>
            <Lock size={22} color={COLORS.textTertiary} />
            <Text style={styles.lockedSectionText}>Upgrade to unlock</Text>
          </View>
        ) : sectionsLoading ? (
          section.content_type === 'events' ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                {[1, 2].map((i) => (
                  <View key={i} style={[styles.eventCard, { backgroundColor: COLORS.surfaceSecondary }]} />
                ))}
              </View>
            </ScrollView>
          ) : (
            <>
              <CardSkeleton />
              <CardSkeleton />
            </>
          )
        ) : section.content_type === 'events' ? (
          <FlatList
            data={items as Event[]}
            renderItem={renderEventCard}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 12, paddingRight: 4 }}
            scrollEnabled
          />
        ) : section.content_type === 'training' ? (
          <FlatList
            data={items as TrainingPost[]}
            renderItem={renderTrainingCard}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
          />
        ) : section.content_type === 'interviews' ? (
          <FlatList
            data={items as Interview[]}
            renderItem={renderInterviewCard}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
          />
        ) : (
          <FlatList
            data={items as Webinar[]}
            renderItem={renderWebinarCard}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
          />
        )}
      </View>
    );
  };

  const bellElement = (
    <Pressable onPress={handleBellPress} style={styles.bellButton} hitSlop={8}>
      <Bell size={22} color={COLORS.text} />
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <DrawerHeader title="AB Club - Home" rightElement={bellElement} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <Animated.View style={{ opacity: heroAnim }}>
          <LinearGradient
            colors={[COLORS.primary, COLORS.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}
          >
            <View style={styles.heroAvatarRow}>
              <View style={styles.heroAvatar}>
                <Text style={styles.heroAvatarText}>{initials}</Text>
              </View>
              <View style={styles.heroTextGroup}>
                <Text style={styles.heroGreeting}>Welcome back,</Text>
                <Text style={styles.heroName}>{displayName}</Text>
              </View>
              <MembershipBadge tier={profile?.membership_tier || 'free'} size="sm" />
            </View>
            <Text style={styles.heroSubtitle}>
              {isPaid
                ? 'You have full access to all content.'
                : 'Upgrade to unlock all premium content.'}
            </Text>
          </LinearGradient>
        </Animated.View>

        <Animated.View style={{ opacity: contentAnim }}>
          {/* Notifications Banner */}
          <AnimatedPressable
            onPress={() => {
              console.log('[Home] Notifications banner pressed');
              router.push('/(drawer)/notifications');
            }}
            style={styles.notifBanner}
          >
            <View style={styles.notifBannerLeft}>
              <Bell size={18} color={COLORS.primary} />
              <Text style={styles.notifBannerText}>Notifications</Text>
            </View>
            <Text style={styles.notifBannerArrow}>›</Text>
          </AnimatedPressable>

          {/* Quick Access 5×5 Grid */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quick Access</Text>
            {quickAccessLoading ? (
              <View style={styles.gridPlaceholder} />
            ) : quickAccessItems.length === 0 ? null : (
              <FlatList
                data={quickAccessItems}
                renderItem={renderQuickAccessItem}
                keyExtractor={(item) => item.id}
                numColumns={5}
                scrollEnabled={false}
                columnWrapperStyle={styles.gridRow}
                contentContainerStyle={styles.gridContainer}
              />
            )}
          </View>

          {/* Dynamic Home Sections */}
          {homeSections.map(renderSection)}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  hero: {
    margin: 16,
    borderRadius: 20,
    padding: 20,
  },
  heroAvatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  heroAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroAvatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Outfit_700Bold',
  },
  heroTextGroup: {
    flex: 1,
  },
  heroGreeting: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 13,
    fontFamily: 'Outfit_400Regular',
  },
  heroName: {
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: 'Outfit_700Bold',
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    fontFamily: 'Outfit_400Regular',
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Outfit_700Bold',
    color: COLORS.text,
    marginBottom: 14,
  },
  seeAll: {
    fontSize: 13,
    fontFamily: 'Outfit_500Medium',
    color: COLORS.primary,
    marginBottom: 14,
  },
  // Grid
  gridContainer: {
    gap: 8,
  },
  gridRow: {
    gap: 4,
    justifyContent: 'flex-start',
  },
  gridItem: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  gridIcon: {
    width: GRID_ITEM_WIDTH - 8,
    height: GRID_ITEM_WIDTH - 8,
    borderRadius: 12,
    backgroundColor: COLORS.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  gridIconLocked: {
    backgroundColor: COLORS.surfaceSecondary,
  },
  gridLabel: {
    fontSize: 10,
    fontFamily: 'Outfit_500Medium',
    color: COLORS.text,
    textAlign: 'center',
  },
  gridLabelLocked: {
    color: COLORS.textTertiary,
  },
  gridPlaceholder: {
    height: 80,
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: 12,
  },
  lockOverlay: {
    position: 'absolute',
    bottom: 3,
    right: 3,
  },
  // Locked section
  lockedSectionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: 14,
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
  },
  lockedSectionText: {
    fontSize: 14,
    fontFamily: 'Outfit_500Medium',
    color: COLORS.textTertiary,
  },
  // Event cards
  eventCard: {
    width: 220,
    height: 160,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  eventImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  eventGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '70%',
  },
  eventContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
  },
  virtualBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primary,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  virtualBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontFamily: 'Outfit_600SemiBold',
  },
  eventTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: 'Outfit_600SemiBold',
    marginBottom: 4,
  },
  eventMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  eventDate: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 11,
    fontFamily: 'Outfit_400Regular',
  },
  eventLocation: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 11,
    fontFamily: 'Outfit_400Regular',
    flex: 1,
  },
  // Content cards
  contentCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
  },
  contentCardImage: {
    width: 100,
    height: 90,
  },
  contentCardBody: {
    flex: 1,
    padding: 12,
  },
  categoryBadge: {
    backgroundColor: COLORS.primaryMuted,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  categoryBadgeText: {
    color: COLORS.primary,
    fontSize: 10,
    fontFamily: 'Outfit_600SemiBold',
  },
  contentCardTitle: {
    fontSize: 13,
    fontFamily: 'Outfit_600SemiBold',
    color: COLORS.text,
    marginBottom: 4,
    lineHeight: 18,
  },
  contentCardDesc: {
    fontSize: 12,
    fontFamily: 'Outfit_400Regular',
    color: COLORS.textSecondary,
    lineHeight: 17,
  },
  guestName: {
    fontSize: 12,
    fontFamily: 'Outfit_600SemiBold',
    color: COLORS.primary,
    marginBottom: 2,
  },
  guestTitle: {
    fontSize: 11,
    fontFamily: 'Outfit_400Regular',
    color: COLORS.textTertiary,
  },
  externalVisitLabel: {
    fontSize: 13,
    fontFamily: 'Outfit_600SemiBold',
    color: COLORS.primary,
    textAlign: 'right',
  },
  bellButton: {
    padding: 4,
  },
  notifBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  notifBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  notifBannerText: {
    fontSize: 15,
    fontFamily: 'Outfit_500Medium',
    color: COLORS.text,
  },
  notifBannerArrow: {
    fontSize: 20,
    color: COLORS.textTertiary,
  },
});
