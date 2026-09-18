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
import { Event, TrainingPost, Interview } from '@/types';
import { formatEventDate, getInitials } from '@/utils/helpers';

function resolveImageSource(source: string | number | ImageSourcePropType | null | undefined): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

interface QuickAccessItem {
  label: string;
  icon: React.ReactNode;
  route: string;
  locked: boolean;
}

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [training, setTraining] = useState<TrainingPost[]>([]);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);

  const isPaid = profile?.membership_tier === 'paid';
  const initials = getInitials(profile?.full_name, profile?.email);
  const displayName = profile?.full_name || 'Member';

  const heroAnim = useRef(new Animated.Value(0)).current;
  const contentAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(heroAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(contentAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchData = async () => {
    console.log('[Home] Fetching home screen data');
    try {
      const [eventsRes, trainingRes, interviewsRes] = await Promise.all([
        supabase.from('events').select('*').eq('is_published', true).order('event_date').limit(5),
        supabase.from('training_posts').select('*').eq('is_published', true).order('created_at', { ascending: false }).limit(2),
        supabase.from('interviews').select('*').eq('is_published', true).order('created_at', { ascending: false }).limit(2),
      ]);
      console.log('[Home] Events fetched:', eventsRes.data?.length ?? 0);
      console.log('[Home] Training fetched:', trainingRes.data?.length ?? 0);
      console.log('[Home] Interviews fetched:', interviewsRes.data?.length ?? 0);
      if (eventsRes.data) setEvents(eventsRes.data as Event[]);
      if (trainingRes.data) setTraining(trainingRes.data as TrainingPost[]);
      if (interviewsRes.data) setInterviews(interviewsRes.data as Interview[]);
    } catch (err) {
      console.error('[Home] Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const quickAccessItems: QuickAccessItem[] = [
    { label: 'Magazine', icon: <BookOpen size={22} color={COLORS.primary} />, route: '/(drawer)/magazine', locked: false },
    { label: 'Events', icon: <Calendar size={22} color={COLORS.primary} />, route: '/(drawer)/events', locked: false },
    { label: 'Store', icon: <ShoppingBag size={22} color={COLORS.primary} />, route: '/(drawer)/store', locked: false },
    { label: 'Training', icon: <GraduationCap size={22} color={isPaid ? COLORS.primary : COLORS.textTertiary} />, route: '/(drawer)/training', locked: !isPaid },
    { label: 'Community', icon: <Users size={22} color={isPaid ? COLORS.primary : COLORS.textTertiary} />, route: '/(drawer)/community', locked: !isPaid },
  ];

  const handleQuickAccess = (item: QuickAccessItem) => {
    console.log('[Home] Quick access pressed:', item.label);
    router.push(item.route as any);
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

  const bellElement = (
    <Pressable onPress={handleBellPress} style={styles.bellButton} hitSlop={8}>
      <Bell size={22} color={COLORS.text} />
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <DrawerHeader title="Alianza Business Club" rightElement={bellElement} />
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

          {/* Quick Access */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quick Access</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.quickAccessRow}
            >
              {quickAccessItems.map((item) => (
                <AnimatedPressable
                  key={item.label}
                  onPress={() => handleQuickAccess(item)}
                  style={styles.quickAccessCard}
                >
                  <View style={[styles.quickAccessIcon, item.locked && styles.quickAccessIconLocked]}>
                    {item.icon}
                    {item.locked ? (
                      <View style={styles.lockOverlay}>
                        <Lock size={10} color={COLORS.textTertiary} />
                      </View>
                    ) : null}
                  </View>
                  <Text style={[styles.quickAccessLabel, item.locked && styles.quickAccessLabelLocked]}>
                    {item.label}
                  </Text>
                </AnimatedPressable>
              ))}
            </ScrollView>
          </View>

          {/* Upcoming Events */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Upcoming Events</Text>
              <Pressable
                onPress={() => {
                  console.log('[Home] See all events pressed');
                  router.push('/(drawer)/events');
                }}
                hitSlop={8}
              >
                <Text style={styles.seeAll}>See all</Text>
              </Pressable>
            </View>
            {loading ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  {[1, 2].map((i) => (
                    <View key={i} style={[styles.eventCard, { backgroundColor: COLORS.surfaceSecondary }]} />
                  ))}
                </View>
              </ScrollView>
            ) : (
              <FlatList
                data={events}
                renderItem={renderEventCard}
                keyExtractor={(item) => item.id}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 12, paddingRight: 4 }}
                scrollEnabled
              />
            )}
          </View>

          {/* Latest Training (paid only) */}
          {isPaid ? (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Latest Training</Text>
                <Pressable
                  onPress={() => {
                    console.log('[Home] See all training pressed');
                    router.push('/(drawer)/training');
                  }}
                  hitSlop={8}
                >
                  <Text style={styles.seeAll}>See all</Text>
                </Pressable>
              </View>
              {loading ? (
                <>
                  <CardSkeleton />
                  <CardSkeleton />
                </>
              ) : (
                <FlatList
                  data={training}
                  renderItem={renderTrainingCard}
                  keyExtractor={(item) => item.id}
                  scrollEnabled={false}
                />
              )}
            </View>
          ) : null}

          {/* Latest Interviews (paid only) */}
          {isPaid ? (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Latest Interviews</Text>
                <Pressable
                  onPress={() => {
                    console.log('[Home] See all interviews pressed');
                    router.push('/(drawer)/interviews');
                  }}
                  hitSlop={8}
                >
                  <Text style={styles.seeAll}>See all</Text>
                </Pressable>
              </View>
              {loading ? (
                <>
                  <CardSkeleton />
                  <CardSkeleton />
                </>
              ) : (
                <FlatList
                  data={interviews}
                  renderItem={renderInterviewCard}
                  keyExtractor={(item) => item.id}
                  scrollEnabled={false}
                />
              )}
            </View>
          ) : null}
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
  quickAccessRow: {
    gap: 12,
    paddingRight: 4,
  },
  quickAccessCard: {
    alignItems: 'center',
    gap: 8,
  },
  quickAccessIcon: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: COLORS.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  quickAccessIconLocked: {
    backgroundColor: COLORS.surfaceSecondary,
  },
  lockOverlay: {
    position: 'absolute',
    bottom: 4,
    right: 4,
  },
  quickAccessLabel: {
    fontSize: 12,
    fontFamily: 'Outfit_500Medium',
    color: COLORS.text,
  },
  quickAccessLabelLocked: {
    color: COLORS.textTertiary,
  },
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
