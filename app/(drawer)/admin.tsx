import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
  Modal,
  Switch,
  Platform,
  TouchableOpacity,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  Shield,
  Bell,
  RefreshCw,
  Send,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Users,
  TrendingUp,
  BookOpen,
  Calendar,
  Mic,
  Video,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react-native';
import { supabase } from '@/utils/supabase';
import { COLORS } from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { DrawerHeader } from '@/components/DrawerHeader';
import { MembershipBadge } from '@/components/MembershipBadge';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { ListItemSkeleton } from '@/components/SkeletonLoader';
import { Profile, TrainingPost, Event, Interview, Webinar } from '@/types';
import { getInitials } from '@/utils/helpers';

// ─── Types ────────────────────────────────────────────────────────────────────

type TargetTier = 'all' | 'free' | 'paid';
type ContentTab = 'training' | 'events' | 'interviews' | 'webinars';

interface Stats {
  total: number;
  paid: number;
  free: number;
}

interface RecentSignup {
  id: string;
  full_name: string | null;
  email: string;
  created_at: string;
}

interface GrowthData {
  thisWeek: number;
  lastWeek: number;
}

// ─── Add-item form state shapes ───────────────────────────────────────────────

interface TrainingForm {
  title: string;
  description: string;
  content: string;
  video_url: string;
  thumbnail_url: string;
  category: string;
}

interface EventForm {
  title: string;
  description: string;
  image_url: string;
  event_date: Date;
  location: string;
  is_virtual: boolean;
  event_url: string;
}

interface InterviewForm {
  title: string;
  description: string;
  video_url: string;
  thumbnail_url: string;
  guest_name: string;
  guest_title: string;
}

interface WebinarForm {
  title: string;
  description: string;
  thumbnail_url: string;
  webinar_date: Date;
  webinar_url: string;
  is_recorded: boolean;
  recording_url: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateObj(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function weekBounds(weeksAgo: number): { start: Date; end: Date } {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const startOfThisWeek = new Date(now);
  startOfThisWeek.setDate(now.getDate() - dayOfWeek);
  startOfThisWeek.setHours(0, 0, 0, 0);

  const start = new Date(startOfThisWeek);
  start.setDate(startOfThisWeek.getDate() - weeksAgo * 7);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  return { start, end };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function FormInput({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
}) {
  return (
    <View style={formStyles.inputGroup}>
      <Text style={formStyles.inputLabel}>{label}</Text>
      <TextInput
        style={[formStyles.textInput, multiline && formStyles.textArea]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder ?? label}
        placeholderTextColor={COLORS.textTertiary}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
      />
    </View>
  );
}

function SwitchRow({
  label,
  value,
  onValueChange,
}: {
  label: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
}) {
  return (
    <View style={formStyles.switchRow}>
      <Text style={formStyles.switchLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: COLORS.border, true: COLORS.primary }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
}

function DateRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Date;
  onChange: (d: Date) => void;
}) {
  const [show, setShow] = useState(false);
  const dateDisplay = formatDateObj(value);

  return (
    <View style={formStyles.inputGroup}>
      <Text style={formStyles.inputLabel}>{label}</Text>
      <AnimatedPressable
        onPress={() => {
          console.log('[Admin] Date picker opened for:', label);
          setShow(true);
        }}
        style={formStyles.datePicker}
      >
        <Text style={formStyles.datePickerText}>{dateDisplay}</Text>
        <ChevronDown size={16} color={COLORS.textTertiary} />
      </AnimatedPressable>
      {show && (
        <DateTimePicker
          value={value}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(_e, selected) => {
            setShow(Platform.OS === 'ios');
            if (selected) {
              console.log('[Admin] Date selected:', selected.toISOString());
              onChange(selected);
            }
          }}
        />
      )}
    </View>
  );
}

// ─── Add-item modals ──────────────────────────────────────────────────────────

function AddTrainingModal({
  visible,
  onClose,
  onSaved,
  authorId,
}: {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
  authorId: string;
}) {
  const [form, setForm] = useState<TrainingForm>({
    title: '',
    description: '',
    content: '',
    video_url: '',
    thumbnail_url: '',
    category: '',
  });
  const [saving, setSaving] = useState(false);

  const set = (key: keyof TrainingForm) => (v: string) =>
    setForm((prev) => ({ ...prev, [key]: v }));

  const handleSave = async () => {
    if (!form.title.trim()) {
      Alert.alert('Validation', 'Title is required.');
      return;
    }
    console.log('[Admin] Adding training post:', form.title);
    setSaving(true);
    const { error } = await supabase.from('training_posts').insert({
      title: form.title.trim(),
      description: form.description.trim() || null,
      content: form.content.trim() || null,
      video_url: form.video_url.trim() || null,
      thumbnail_url: form.thumbnail_url.trim() || null,
      category: form.category.trim() || null,
      author_id: authorId,
      is_published: true,
    });
    setSaving(false);
    if (error) {
      console.error('[Admin] Error adding training post:', error.message);
      Alert.alert('Error', error.message);
      return;
    }
    console.log('[Admin] Training post added successfully');
    setForm({ title: '', description: '', content: '', video_url: '', thumbnail_url: '', category: '' });
    onSaved();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={modalStyles.container}>
        <View style={modalStyles.header}>
          <Text style={modalStyles.title}>Add Training Post</Text>
          <AnimatedPressable onPress={onClose} style={modalStyles.closeBtn}>
            <X size={20} color={COLORS.text} />
          </AnimatedPressable>
        </View>
        <ScrollView style={modalStyles.body} showsVerticalScrollIndicator={false}>
          <FormInput label="Title *" value={form.title} onChangeText={set('title')} />
          <FormInput label="Description" value={form.description} onChangeText={set('description')} multiline />
          <FormInput label="Content" value={form.content} onChangeText={set('content')} multiline />
          <FormInput label="Video URL" value={form.video_url} onChangeText={set('video_url')} placeholder="https://" />
          <FormInput label="Thumbnail URL" value={form.thumbnail_url} onChangeText={set('thumbnail_url')} placeholder="https://" />
          <FormInput label="Category" value={form.category} onChangeText={set('category')} placeholder="e.g. Sales" />
        </ScrollView>
        <View style={modalStyles.footer}>
          <AnimatedPressable
            onPress={handleSave}
            disabled={saving}
            style={[modalStyles.saveBtn, saving && modalStyles.saveBtnDisabled]}
          >
            {saving ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <Text style={modalStyles.saveBtnText}>Save Training Post</Text>
            )}
          </AnimatedPressable>
        </View>
      </View>
    </Modal>
  );
}

function AddEventModal({
  visible,
  onClose,
  onSaved,
}: {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<EventForm>({
    title: '',
    description: '',
    image_url: '',
    event_date: new Date(),
    location: '',
    is_virtual: false,
    event_url: '',
  });
  const [saving, setSaving] = useState(false);

  const set = (key: keyof EventForm) => (v: string) =>
    setForm((prev) => ({ ...prev, [key]: v }));

  const handleSave = async () => {
    if (!form.title.trim()) {
      Alert.alert('Validation', 'Title is required.');
      return;
    }
    console.log('[Admin] Adding event:', form.title);
    setSaving(true);
    const { error } = await supabase.from('events').insert({
      title: form.title.trim(),
      description: form.description.trim() || null,
      image_url: form.image_url.trim() || null,
      event_date: form.event_date.toISOString(),
      location: form.location.trim() || null,
      is_virtual: form.is_virtual,
      event_url: form.event_url.trim() || null,
      is_published: true,
    });
    setSaving(false);
    if (error) {
      console.error('[Admin] Error adding event:', error.message);
      Alert.alert('Error', error.message);
      return;
    }
    console.log('[Admin] Event added successfully');
    setForm({ title: '', description: '', image_url: '', event_date: new Date(), location: '', is_virtual: false, event_url: '' });
    onSaved();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={modalStyles.container}>
        <View style={modalStyles.header}>
          <Text style={modalStyles.title}>Add Event</Text>
          <AnimatedPressable onPress={onClose} style={modalStyles.closeBtn}>
            <X size={20} color={COLORS.text} />
          </AnimatedPressable>
        </View>
        <ScrollView style={modalStyles.body} showsVerticalScrollIndicator={false}>
          <FormInput label="Title *" value={form.title} onChangeText={set('title')} />
          <FormInput label="Description" value={form.description} onChangeText={set('description')} multiline />
          <FormInput label="Image URL" value={form.image_url} onChangeText={set('image_url')} placeholder="https://" />
          <DateRow label="Event Date" value={form.event_date} onChange={(d) => setForm((p) => ({ ...p, event_date: d }))} />
          <FormInput label="Location" value={form.location} onChangeText={set('location')} />
          <SwitchRow label="Virtual Event" value={form.is_virtual} onValueChange={(v) => setForm((p) => ({ ...p, is_virtual: v }))} />
          <FormInput label="Event URL" value={form.event_url} onChangeText={set('event_url')} placeholder="https://" />
        </ScrollView>
        <View style={modalStyles.footer}>
          <AnimatedPressable
            onPress={handleSave}
            disabled={saving}
            style={[modalStyles.saveBtn, saving && modalStyles.saveBtnDisabled]}
          >
            {saving ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <Text style={modalStyles.saveBtnText}>Save Event</Text>
            )}
          </AnimatedPressable>
        </View>
      </View>
    </Modal>
  );
}

function AddInterviewModal({
  visible,
  onClose,
  onSaved,
}: {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<InterviewForm>({
    title: '',
    description: '',
    video_url: '',
    thumbnail_url: '',
    guest_name: '',
    guest_title: '',
  });
  const [saving, setSaving] = useState(false);

  const set = (key: keyof InterviewForm) => (v: string) =>
    setForm((prev) => ({ ...prev, [key]: v }));

  const handleSave = async () => {
    if (!form.title.trim()) {
      Alert.alert('Validation', 'Title is required.');
      return;
    }
    console.log('[Admin] Adding interview:', form.title);
    setSaving(true);
    const { error } = await supabase.from('interviews').insert({
      title: form.title.trim(),
      description: form.description.trim() || null,
      video_url: form.video_url.trim() || null,
      thumbnail_url: form.thumbnail_url.trim() || null,
      guest_name: form.guest_name.trim() || null,
      guest_title: form.guest_title.trim() || null,
      is_published: true,
    });
    setSaving(false);
    if (error) {
      console.error('[Admin] Error adding interview:', error.message);
      Alert.alert('Error', error.message);
      return;
    }
    console.log('[Admin] Interview added successfully');
    setForm({ title: '', description: '', video_url: '', thumbnail_url: '', guest_name: '', guest_title: '' });
    onSaved();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={modalStyles.container}>
        <View style={modalStyles.header}>
          <Text style={modalStyles.title}>Add Interview</Text>
          <AnimatedPressable onPress={onClose} style={modalStyles.closeBtn}>
            <X size={20} color={COLORS.text} />
          </AnimatedPressable>
        </View>
        <ScrollView style={modalStyles.body} showsVerticalScrollIndicator={false}>
          <FormInput label="Title *" value={form.title} onChangeText={set('title')} />
          <FormInput label="Description" value={form.description} onChangeText={set('description')} multiline />
          <FormInput label="Video URL" value={form.video_url} onChangeText={set('video_url')} placeholder="https://" />
          <FormInput label="Thumbnail URL" value={form.thumbnail_url} onChangeText={set('thumbnail_url')} placeholder="https://" />
          <FormInput label="Guest Name" value={form.guest_name} onChangeText={set('guest_name')} />
          <FormInput label="Guest Title" value={form.guest_title} onChangeText={set('guest_title')} placeholder="e.g. CEO, Acme Corp" />
        </ScrollView>
        <View style={modalStyles.footer}>
          <AnimatedPressable
            onPress={handleSave}
            disabled={saving}
            style={[modalStyles.saveBtn, saving && modalStyles.saveBtnDisabled]}
          >
            {saving ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <Text style={modalStyles.saveBtnText}>Save Interview</Text>
            )}
          </AnimatedPressable>
        </View>
      </View>
    </Modal>
  );
}

function AddWebinarModal({
  visible,
  onClose,
  onSaved,
}: {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<WebinarForm>({
    title: '',
    description: '',
    thumbnail_url: '',
    webinar_date: new Date(),
    webinar_url: '',
    is_recorded: false,
    recording_url: '',
  });
  const [saving, setSaving] = useState(false);

  const set = (key: keyof WebinarForm) => (v: string) =>
    setForm((prev) => ({ ...prev, [key]: v }));

  const handleSave = async () => {
    if (!form.title.trim()) {
      Alert.alert('Validation', 'Title is required.');
      return;
    }
    console.log('[Admin] Adding webinar:', form.title);
    setSaving(true);
    const { error } = await supabase.from('webinars').insert({
      title: form.title.trim(),
      description: form.description.trim() || null,
      thumbnail_url: form.thumbnail_url.trim() || null,
      webinar_date: form.webinar_date.toISOString(),
      webinar_url: form.webinar_url.trim() || null,
      is_recorded: form.is_recorded,
      recording_url: form.recording_url.trim() || null,
      is_published: true,
    });
    setSaving(false);
    if (error) {
      console.error('[Admin] Error adding webinar:', error.message);
      Alert.alert('Error', error.message);
      return;
    }
    console.log('[Admin] Webinar added successfully');
    setForm({ title: '', description: '', thumbnail_url: '', webinar_date: new Date(), webinar_url: '', is_recorded: false, recording_url: '' });
    onSaved();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={modalStyles.container}>
        <View style={modalStyles.header}>
          <Text style={modalStyles.title}>Add Webinar</Text>
          <AnimatedPressable onPress={onClose} style={modalStyles.closeBtn}>
            <X size={20} color={COLORS.text} />
          </AnimatedPressable>
        </View>
        <ScrollView style={modalStyles.body} showsVerticalScrollIndicator={false}>
          <FormInput label="Title *" value={form.title} onChangeText={set('title')} />
          <FormInput label="Description" value={form.description} onChangeText={set('description')} multiline />
          <FormInput label="Thumbnail URL" value={form.thumbnail_url} onChangeText={set('thumbnail_url')} placeholder="https://" />
          <DateRow label="Webinar Date" value={form.webinar_date} onChange={(d) => setForm((p) => ({ ...p, webinar_date: d }))} />
          <FormInput label="Webinar URL" value={form.webinar_url} onChangeText={set('webinar_url')} placeholder="https://" />
          <SwitchRow label="Is Recorded" value={form.is_recorded} onValueChange={(v) => setForm((p) => ({ ...p, is_recorded: v }))} />
          {form.is_recorded && (
            <FormInput label="Recording URL" value={form.recording_url} onChangeText={set('recording_url')} placeholder="https://" />
          )}
        </ScrollView>
        <View style={modalStyles.footer}>
          <AnimatedPressable
            onPress={handleSave}
            disabled={saving}
            style={[modalStyles.saveBtn, saving && modalStyles.saveBtnDisabled]}
          >
            {saving ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <Text style={modalStyles.saveBtnText}>Save Webinar</Text>
            )}
          </AnimatedPressable>
        </View>
      </View>
    </Modal>
  );
}

// ─── Content list rows ────────────────────────────────────────────────────────

function ContentRow({
  id,
  title,
  isPublished,
  table,
  onToggle,
  onDelete,
}: {
  id: string;
  title: string;
  isPublished: boolean;
  table: string;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const [toggling, setToggling] = useState(false);

  const handleToggle = async () => {
    console.log('[Admin] Toggle published for', table, id, '→', !isPublished);
    setToggling(true);
    const { error } = await supabase
      .from(table)
      .update({ is_published: !isPublished })
      .eq('id', id);
    setToggling(false);
    if (error) {
      console.error('[Admin] Toggle error:', error.message);
      Alert.alert('Error', error.message);
      return;
    }
    onToggle();
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Item',
      `Are you sure you want to delete "${title}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            console.log('[Admin] Deleting', table, id);
            const { error } = await supabase.from(table).delete().eq('id', id);
            if (error) {
              console.error('[Admin] Delete error:', error.message);
              Alert.alert('Error', error.message);
              return;
            }
            console.log('[Admin] Deleted', table, id);
            onDelete();
          },
        },
      ]
    );
  };

  return (
    <View style={styles.contentRow}>
      <View style={styles.contentRowInfo}>
        <View style={[styles.publishDot, { backgroundColor: isPublished ? COLORS.success : COLORS.textTertiary }]} />
        <Text style={styles.contentRowTitle} numberOfLines={1}>{title}</Text>
      </View>
      <View style={styles.contentRowActions}>
        <AnimatedPressable onPress={handleToggle} disabled={toggling} style={styles.iconBtn}>
          {toggling ? (
            <ActivityIndicator size="small" color={COLORS.primary} />
          ) : isPublished ? (
            <Eye size={16} color={COLORS.success} />
          ) : (
            <EyeOff size={16} color={COLORS.textTertiary} />
          )}
        </AnimatedPressable>
        <AnimatedPressable onPress={handleDelete} style={[styles.iconBtn, styles.iconBtnDanger]}>
          <Trash2 size={16} color={COLORS.danger} />
        </AnimatedPressable>
      </View>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function AdminScreen() {
  const { profile } = useAuth();

  // Core data
  const [members, setMembers] = useState<Profile[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, paid: 0, free: 0 });
  const [loading, setLoading] = useState(true);

  // Analytics
  const [recentSignups, setRecentSignups] = useState<RecentSignup[]>([]);
  const [growth, setGrowth] = useState<GrowthData>({ thisWeek: 0, lastWeek: 0 });

  // Content
  const [activeTab, setActiveTab] = useState<ContentTab>('training');
  const [trainingPosts, setTrainingPosts] = useState<TrainingPost[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [webinars, setWebinars] = useState<Webinar[]>([]);
  const [contentLoading, setContentLoading] = useState(false);

  // Modals
  const [showAddTraining, setShowAddTraining] = useState(false);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [showAddInterview, setShowAddInterview] = useState(false);
  const [showAddWebinar, setShowAddWebinar] = useState(false);

  // Notifications
  const [notifTitle, setNotifTitle] = useState('');
  const [notifBody, setNotifBody] = useState('');
  const [targetTier, setTargetTier] = useState<TargetTier>('all');
  const [sendingNotif, setSendingNotif] = useState(false);

  const isAdmin = profile?.role === 'admin';

  useEffect(() => {
    if (isAdmin) {
      fetchData();
      fetchContent('training');
    }
  }, [isAdmin, fetchContent]);

  // ── Fetch core data ──────────────────────────────────────────────────────────

  const fetchData = async () => {
    console.log('[Admin] Fetching admin data');
    setLoading(true);
    try {
      const { data: membersData, error: membersError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (membersError) {
        console.error('[Admin] Members fetch error:', membersError.message);
      } else if (membersData) {
        const allMembers = membersData as Profile[];
        setMembers(allMembers);
        setStats({
          total: allMembers.length,
          paid: allMembers.filter((m) => m.membership_tier === 'paid').length,
          free: allMembers.filter((m) => m.membership_tier === 'free').length,
        });
        console.log('[Admin] Members loaded:', allMembers.length);

        // Recent signups (last 5)
        const recent: RecentSignup[] = allMembers.slice(0, 5).map((m) => ({
          id: m.id,
          full_name: m.full_name,
          email: m.email,
          created_at: m.created_at,
        }));
        setRecentSignups(recent);

        // Growth
        const thisWeekBounds = weekBounds(0);
        const lastWeekBounds = weekBounds(1);
        const thisWeekCount = allMembers.filter((m) => {
          const d = new Date(m.created_at);
          return d >= thisWeekBounds.start && d < thisWeekBounds.end;
        }).length;
        const lastWeekCount = allMembers.filter((m) => {
          const d = new Date(m.created_at);
          return d >= lastWeekBounds.start && d < lastWeekBounds.end;
        }).length;
        setGrowth({ thisWeek: thisWeekCount, lastWeek: lastWeekCount });
        console.log('[Admin] Growth — this week:', thisWeekCount, 'last week:', lastWeekCount);
      }
    } catch (err) {
      console.error('[Admin] Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  // ── Fetch content by tab ─────────────────────────────────────────────────────

  const fetchContent = useCallback(async (tab: ContentTab) => {
    console.log('[Admin] Fetching content tab:', tab);
    setContentLoading(true);
    try {
      if (tab === 'training') {
        const { data, error } = await supabase
          .from('training_posts')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) console.error('[Admin] Training fetch error:', error.message);
        else setTrainingPosts((data as TrainingPost[]) ?? []);
      } else if (tab === 'events') {
        const { data, error } = await supabase
          .from('events')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) console.error('[Admin] Events fetch error:', error.message);
        else setEvents((data as Event[]) ?? []);
      } else if (tab === 'interviews') {
        const { data, error } = await supabase
          .from('interviews')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) console.error('[Admin] Interviews fetch error:', error.message);
        else setInterviews((data as Interview[]) ?? []);
      } else if (tab === 'webinars') {
        const { data, error } = await supabase
          .from('webinars')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) console.error('[Admin] Webinars fetch error:', error.message);
        else setWebinars((data as Webinar[]) ?? []);
      }
    } catch (err) {
      console.error('[Admin] Content fetch error:', err);
    } finally {
      setContentLoading(false);
    }
  }, []);

  const handleTabChange = (tab: ContentTab) => {
    console.log('[Admin] Content tab changed to:', tab);
    setActiveTab(tab);
    fetchContent(tab);
  };

  // ── Toggle membership tier ───────────────────────────────────────────────────

  const handleToggleTier = (member: Profile) => {
    if (member.role === 'admin') return;
    const newTier = member.membership_tier === 'free' ? 'paid' : 'free';
    Alert.alert(
      'Change Membership',
      `Change ${member.full_name || member.email}'s tier from ${member.membership_tier} to ${newTier}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            console.log('[Admin] Toggling membership tier for', member.id, '→', newTier);
            const { error } = await supabase
              .from('profiles')
              .update({ membership_tier: newTier })
              .eq('id', member.id);
            if (error) {
              console.error('[Admin] Tier update error:', error.message);
              Alert.alert('Error', error.message);
              return;
            }
            console.log('[Admin] Membership tier updated successfully');
            setMembers((prev) =>
              prev.map((m) => (m.id === member.id ? { ...m, membership_tier: newTier } : m))
            );
            setStats((prev) => ({
              ...prev,
              paid: newTier === 'paid' ? prev.paid + 1 : prev.paid - 1,
              free: newTier === 'free' ? prev.free + 1 : prev.free - 1,
            }));
          },
        },
      ]
    );
  };

  // ── Send notification ────────────────────────────────────────────────────────

  const handleSendNotification = async () => {
    if (!notifTitle.trim() || !notifBody.trim() || !profile?.id) return;
    console.log('[Admin] Send notification pressed, title:', notifTitle, 'target:', targetTier);
    setSendingNotif(true);
    try {
      const { error } = await supabase.from('push_notifications').insert({
        title: notifTitle.trim(),
        body: notifBody.trim(),
        target_tier: targetTier,
        sent_by: profile.id,
      });
      if (error) {
        console.error('[Admin] Notification insert error:', error.message);
        Alert.alert('Error', 'Failed to send notification.');
        return;
      }
      console.log('[Admin] Notification sent successfully');
      Alert.alert('Success', 'Notification sent successfully!');
      setNotifTitle('');
      setNotifBody('');
      setTargetTier('all');
    } catch (err) {
      console.error('[Admin] Unexpected error sending notification:', err);
    } finally {
      setSendingNotif(false);
    }
  };

  // ── Access denied ────────────────────────────────────────────────────────────

  if (!isAdmin) {
    return (
      <View style={styles.container}>
        <DrawerHeader title="Admin Panel" />
        <View style={styles.accessDenied}>
          <Shield size={48} color={COLORS.danger} />
          <Text style={styles.accessDeniedTitle}>Access Denied</Text>
          <Text style={styles.accessDeniedSubtitle}>
            You don't have permission to access the admin panel.
          </Text>
        </View>
      </View>
    );
  }

  // ── Render helpers ───────────────────────────────────────────────────────────

  const renderMember = ({ item }: { item: Profile }) => {
    const initials = getInitials(item.full_name, item.email);
    const displayName = item.full_name || item.email;
    return (
      <View style={styles.memberRow}>
        <View style={styles.memberAvatar}>
          <Text style={styles.memberAvatarText}>{initials}</Text>
        </View>
        <View style={styles.memberInfo}>
          <Text style={styles.memberName} numberOfLines={1}>{displayName}</Text>
          <Text style={styles.memberEmail} numberOfLines={1}>{item.email}</Text>
        </View>
        <View style={styles.memberBadges}>
          <MembershipBadge tier={item.membership_tier} size="sm" />
          {item.role === 'admin' ? (
            <View style={styles.adminBadge}>
              <Text style={styles.adminBadgeText}>ADMIN</Text>
            </View>
          ) : (
            <AnimatedPressable
              onPress={() => handleToggleTier(item)}
              style={styles.tierToggleBtn}
            >
              <Text style={styles.tierToggleBtnText}>
                {item.membership_tier === 'free' ? '→ Paid' : '→ Free'}
              </Text>
            </AnimatedPressable>
          )}
        </View>
      </View>
    );
  };

  const TIER_OPTIONS: { label: string; value: TargetTier }[] = [
    { label: 'All', value: 'all' },
    { label: 'Free', value: 'free' },
    { label: 'Paid', value: 'paid' },
  ];

  const CONTENT_TABS: { label: string; value: ContentTab; icon: React.ReactNode }[] = [
    { label: 'Training', value: 'training', icon: <BookOpen size={14} color={activeTab === 'training' ? '#FFF' : COLORS.textSecondary} /> },
    { label: 'Events', value: 'events', icon: <Calendar size={14} color={activeTab === 'events' ? '#FFF' : COLORS.textSecondary} /> },
    { label: 'Interviews', value: 'interviews', icon: <Mic size={14} color={activeTab === 'interviews' ? '#FFF' : COLORS.textSecondary} /> },
    { label: 'Webinars', value: 'webinars', icon: <Video size={14} color={activeTab === 'webinars' ? '#FFF' : COLORS.textSecondary} /> },
  ];

  const growthDiff = growth.thisWeek - growth.lastWeek;
  const growthLabel = growthDiff > 0 ? `+${growthDiff} vs last week` : growthDiff < 0 ? `${growthDiff} vs last week` : 'Same as last week';
  const growthColor = growthDiff > 0 ? COLORS.success : growthDiff < 0 ? COLORS.danger : COLORS.textTertiary;

  const activeItems: { id: string; title: string; is_published: boolean }[] =
    activeTab === 'training'
      ? trainingPosts
      : activeTab === 'events'
      ? events
      : activeTab === 'interviews'
      ? interviews
      : webinars;

  const activeTable =
    activeTab === 'training'
      ? 'training_posts'
      : activeTab === 'events'
      ? 'events'
      : activeTab === 'interviews'
      ? 'interviews'
      : 'webinars';

  return (
    <View style={styles.container}>
      <DrawerHeader title="Admin Panel" />

      {/* Add-item modals */}
      <AddTrainingModal
        visible={showAddTraining}
        onClose={() => setShowAddTraining(false)}
        onSaved={() => fetchContent('training')}
        authorId={profile?.id ?? ''}
      />
      <AddEventModal
        visible={showAddEvent}
        onClose={() => setShowAddEvent(false)}
        onSaved={() => fetchContent('events')}
      />
      <AddInterviewModal
        visible={showAddInterview}
        onClose={() => setShowAddInterview(false)}
        onSaved={() => fetchContent('interviews')}
      />
      <AddWebinarModal
        visible={showAddWebinar}
        onClose={() => setShowAddWebinar(false)}
        onSaved={() => fetchContent('webinars')}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* ── Stats ── */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { borderLeftColor: COLORS.primary }]}>
            <Text style={styles.statNumber}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total Members</Text>
          </View>
          <View style={[styles.statCard, { borderLeftColor: COLORS.paid }]}>
            <Text style={styles.statNumber}>{stats.paid}</Text>
            <Text style={styles.statLabel}>Paid</Text>
          </View>
          <View style={[styles.statCard, { borderLeftColor: COLORS.free }]}>
            <Text style={styles.statNumber}>{stats.free}</Text>
            <Text style={styles.statLabel}>Free</Text>
          </View>
        </View>

        {/* ── Analytics ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <TrendingUp size={18} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Analytics</Text>
          </View>

          {/* Membership Growth */}
          <View style={styles.growthCard}>
            <View style={styles.growthLeft}>
              <Text style={styles.growthLabel}>Membership Growth</Text>
              <Text style={styles.growthSub}>New sign-ups this week</Text>
            </View>
            <View style={styles.growthRight}>
              <Text style={styles.growthNumber}>{growth.thisWeek}</Text>
              <Text style={[styles.growthDiff, { color: growthColor }]}>{growthLabel}</Text>
            </View>
          </View>

          {/* Recent Sign-ups */}
          <Text style={styles.analyticsSubheading}>Recent Sign-ups</Text>
          {loading ? (
            <>
              <ListItemSkeleton />
              <ListItemSkeleton />
            </>
          ) : recentSignups.length === 0 ? (
            <Text style={styles.emptyText}>No sign-ups yet.</Text>
          ) : (
            recentSignups.map((u, idx) => {
              const name = u.full_name || u.email;
              const dateJoined = formatDate(u.created_at);
              return (
                <View key={u.id} style={[styles.signupRow, idx < recentSignups.length - 1 && styles.signupRowBorder]}>
                  <View style={styles.signupAvatar}>
                    <Text style={styles.signupAvatarText}>{getInitials(u.full_name, u.email)}</Text>
                  </View>
                  <View style={styles.signupInfo}>
                    <Text style={styles.signupName} numberOfLines={1}>{name}</Text>
                    <Text style={styles.signupEmail} numberOfLines={1}>{u.email}</Text>
                  </View>
                  <Text style={styles.signupDate}>{dateJoined}</Text>
                </View>
              );
            })
          )}
        </View>

        {/* ── Members ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Users size={18} color={COLORS.text} />
            <Text style={styles.sectionTitle}>Members</Text>
            <AnimatedPressable onPress={() => { console.log('[Admin] Refresh members pressed'); fetchData(); }} style={styles.refreshButton}>
              <RefreshCw size={16} color={COLORS.primary} />
            </AnimatedPressable>
          </View>
          {loading ? (
            <>
              <ListItemSkeleton />
              <ListItemSkeleton />
              <ListItemSkeleton />
            </>
          ) : (
            <FlatList
              data={members}
              renderItem={renderMember}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
          )}
        </View>

        {/* ── Content Management ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <BookOpen size={18} color={COLORS.text} />
            <Text style={styles.sectionTitle}>Content Management</Text>
          </View>

          {/* Tabs */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll}>
            <View style={styles.tabsRow}>
              {CONTENT_TABS.map((tab) => (
                <AnimatedPressable
                  key={tab.value}
                  onPress={() => handleTabChange(tab.value)}
                  style={[styles.tab, activeTab === tab.value && styles.tabActive]}
                >
                  {tab.icon}
                  <Text style={[styles.tabText, activeTab === tab.value && styles.tabTextActive]}>
                    {tab.label}
                  </Text>
                </AnimatedPressable>
              ))}
            </View>
          </ScrollView>

          {/* Add button */}
          <AnimatedPressable
            onPress={() => {
              console.log('[Admin] Add content pressed for tab:', activeTab);
              if (activeTab === 'training') setShowAddTraining(true);
              else if (activeTab === 'events') setShowAddEvent(true);
              else if (activeTab === 'interviews') setShowAddInterview(true);
              else setShowAddWebinar(true);
            }}
            style={styles.addBtn}
          >
            <Plus size={16} color={COLORS.primary} />
            <Text style={styles.addBtnText}>
              Add {activeTab === 'training' ? 'Training Post' : activeTab === 'events' ? 'Event' : activeTab === 'interviews' ? 'Interview' : 'Webinar'}
            </Text>
          </AnimatedPressable>

          {/* Content list */}
          {contentLoading ? (
            <>
              <ListItemSkeleton />
              <ListItemSkeleton />
            </>
          ) : activeItems.length === 0 ? (
            <Text style={styles.emptyText}>No items yet. Add one above.</Text>
          ) : (
            activeItems.map((item, idx) => (
              <View key={item.id}>
                <ContentRow
                  id={item.id}
                  title={item.title}
                  isPublished={item.is_published}
                  table={activeTable}
                  onToggle={() => fetchContent(activeTab)}
                  onDelete={() => fetchContent(activeTab)}
                />
                {idx < activeItems.length - 1 && <View style={styles.separator} />}
              </View>
            ))
          )}
        </View>

        {/* ── Send Notification ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Bell size={18} color={COLORS.text} />
            <Text style={styles.sectionTitle}>Send Notification</Text>
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Title</Text>
            <TextInput
              style={styles.textInput}
              value={notifTitle}
              onChangeText={setNotifTitle}
              placeholder="Notification title"
              placeholderTextColor={COLORS.textTertiary}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Message</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={notifBody}
              onChangeText={setNotifBody}
              placeholder="Notification message"
              placeholderTextColor={COLORS.textTertiary}
              multiline
              textAlignVertical="top"
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Target Audience</Text>
            <View style={styles.tierPicker}>
              {TIER_OPTIONS.map((opt) => (
                <AnimatedPressable
                  key={opt.value}
                  onPress={() => {
                    console.log('[Admin] Target tier selected:', opt.value);
                    setTargetTier(opt.value);
                  }}
                  style={[styles.tierOption, targetTier === opt.value && styles.tierOptionActive]}
                >
                  <Text style={[styles.tierOptionText, targetTier === opt.value && styles.tierOptionTextActive]}>
                    {opt.label}
                  </Text>
                </AnimatedPressable>
              ))}
            </View>
          </View>
          <AnimatedPressable
            onPress={handleSendNotification}
            disabled={!notifTitle.trim() || !notifBody.trim() || sendingNotif}
            style={[
              styles.sendButton,
              (!notifTitle.trim() || !notifBody.trim() || sendingNotif) && styles.sendButtonDisabled,
            ]}
          >
            {sendingNotif ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Send size={16} color="#FFFFFF" />
                <Text style={styles.sendButtonText}>Send Notification</Text>
              </>
            )}
          </AnimatedPressable>
        </View>

      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  accessDenied: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 32,
  },
  accessDeniedTitle: {
    fontSize: 22,
    fontFamily: 'Outfit_700Bold',
    color: COLORS.text,
  },
  accessDeniedSubtitle: {
    fontSize: 14,
    fontFamily: 'Outfit_400Regular',
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderLeftWidth: 4,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 28,
    fontFamily: 'Outfit_700Bold',
    color: COLORS.text,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: 'Outfit_500Medium',
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 2,
  },
  section: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Outfit_700Bold',
    color: COLORS.text,
    flex: 1,
  },
  refreshButton: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: COLORS.primaryMuted,
  },
  // Analytics
  growthCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryMuted,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  growthLeft: {
    flex: 1,
  },
  growthLabel: {
    fontSize: 14,
    fontFamily: 'Outfit_600SemiBold',
    color: COLORS.primary,
  },
  growthSub: {
    fontSize: 12,
    fontFamily: 'Outfit_400Regular',
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  growthRight: {
    alignItems: 'flex-end',
  },
  growthNumber: {
    fontSize: 28,
    fontFamily: 'Outfit_700Bold',
    color: COLORS.primary,
  },
  growthDiff: {
    fontSize: 11,
    fontFamily: 'Outfit_500Medium',
    marginTop: 2,
  },
  analyticsSubheading: {
    fontSize: 13,
    fontFamily: 'Outfit_600SemiBold',
    color: COLORS.textSecondary,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  signupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  signupRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  signupAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signupAvatarText: {
    color: COLORS.primary,
    fontSize: 12,
    fontFamily: 'Outfit_700Bold',
  },
  signupInfo: {
    flex: 1,
  },
  signupName: {
    fontSize: 13,
    fontFamily: 'Outfit_600SemiBold',
    color: COLORS.text,
  },
  signupEmail: {
    fontSize: 11,
    fontFamily: 'Outfit_400Regular',
    color: COLORS.textTertiary,
  },
  signupDate: {
    fontSize: 11,
    fontFamily: 'Outfit_400Regular',
    color: COLORS.textTertiary,
  },
  emptyText: {
    fontSize: 13,
    fontFamily: 'Outfit_400Regular',
    color: COLORS.textTertiary,
    textAlign: 'center',
    paddingVertical: 16,
  },
  // Members
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  memberAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberAvatarText: {
    color: COLORS.primary,
    fontSize: 13,
    fontFamily: 'Outfit_700Bold',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 14,
    fontFamily: 'Outfit_600SemiBold',
    color: COLORS.text,
  },
  memberEmail: {
    fontSize: 12,
    fontFamily: 'Outfit_400Regular',
    color: COLORS.textTertiary,
  },
  memberBadges: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
  },
  adminBadge: {
    backgroundColor: COLORS.accentMuted,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  adminBadgeText: {
    color: COLORS.accent,
    fontSize: 9,
    fontFamily: 'Outfit_700Bold',
    letterSpacing: 0.5,
  },
  tierToggleBtn: {
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tierToggleBtnText: {
    fontSize: 10,
    fontFamily: 'Outfit_600SemiBold',
    color: COLORS.primary,
  },
  separator: {
    height: 1,
    backgroundColor: COLORS.divider,
  },
  // Content tabs
  tabsScroll: {
    marginBottom: 12,
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.surfaceSecondary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tabActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  tabText: {
    fontSize: 13,
    fontFamily: 'Outfit_500Medium',
    color: COLORS.textSecondary,
  },
  tabTextActive: {
    color: '#FFFFFF',
    fontFamily: 'Outfit_600SemiBold',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
    marginBottom: 12,
    justifyContent: 'center',
  },
  addBtnText: {
    fontSize: 13,
    fontFamily: 'Outfit_600SemiBold',
    color: COLORS.primary,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 8,
  },
  contentRowInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  publishDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  contentRowTitle: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Outfit_500Medium',
    color: COLORS.text,
  },
  contentRowActions: {
    flexDirection: 'row',
    gap: 6,
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: COLORS.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnDanger: {
    backgroundColor: 'rgba(239,68,68,0.08)',
  },
  // Notifications
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 12,
    fontFamily: 'Outfit_500Medium',
    color: COLORS.textTertiary,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  textInput: {
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    fontFamily: 'Outfit_400Regular',
    color: COLORS.text,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  tierPicker: {
    flexDirection: 'row',
    gap: 8,
  },
  tierOption: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: COLORS.surfaceSecondary,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  tierOptionActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  tierOptionText: {
    fontSize: 13,
    fontFamily: 'Outfit_500Medium',
    color: COLORS.textSecondary,
  },
  tierOptionTextActive: {
    color: '#FFFFFF',
    fontFamily: 'Outfit_600SemiBold',
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 13,
    marginTop: 4,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'Outfit_600SemiBold',
  },
});

const formStyles = StyleSheet.create({
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 12,
    fontFamily: 'Outfit_500Medium',
    color: COLORS.textTertiary,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  textInput: {
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    fontFamily: 'Outfit_400Regular',
    color: COLORS.text,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    paddingVertical: 4,
  },
  switchLabel: {
    fontSize: 14,
    fontFamily: 'Outfit_500Medium',
    color: COLORS.text,
  },
  datePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  datePickerText: {
    fontSize: 14,
    fontFamily: 'Outfit_400Regular',
    color: COLORS.text,
  },
});

const modalStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    fontSize: 18,
    fontFamily: 'Outfit_700Bold',
    color: COLORS.text,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    padding: 20,
  },
  footer: {
    padding: 20,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  saveBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnDisabled: {
    opacity: 0.5,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'Outfit_600SemiBold',
  },
});
