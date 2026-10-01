/*
 * IMPORTANT: Run the following SQL in your Supabase SQL editor before using the
 * Menu Configuration feature:
 *
 * CREATE TABLE IF NOT EXISTS public.menu_config (
 *   id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
 *   route text UNIQUE NOT NULL,
 *   label text NOT NULL,
 *   is_enabled boolean DEFAULT true NOT NULL,
 *   requires_paid boolean DEFAULT false NOT NULL,
 *   sort_order integer DEFAULT 0 NOT NULL,
 *   external_url text DEFAULT NULL
 * );
 *
 * -- Add external_url column if upgrading from previous version:
 * ALTER TABLE public.menu_config ADD COLUMN IF NOT EXISTS external_url text DEFAULT NULL;
 *
 * ALTER TABLE public.menu_config ENABLE ROW LEVEL SECURITY;
 *
 * CREATE POLICY "Admins can manage menu_config" ON public.menu_config
 *   FOR ALL TO authenticated
 *   USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
 *   WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
 *
 * CREATE POLICY "Anyone can read menu_config" ON public.menu_config
 *   FOR SELECT TO authenticated USING (true);
 *
 * INSERT INTO public.menu_config (route, label, is_enabled, requires_paid, sort_order) VALUES
 *   ('/(drawer)/home', 'Home', true, false, 0),
 *   ('/(drawer)/magazine', 'Magazine', true, false, 1),
 *   ('/(drawer)/events', 'Events', true, false, 2),
 *   ('/(drawer)/store', 'Store', true, false, 3),
 *   ('/(drawer)/training', 'Training', true, true, 4),
 *   ('/(drawer)/interviews', 'Interviews', true, true, 5),
 *   ('/(drawer)/webinars', 'Webinars', true, true, 6),
 *   ('/(drawer)/community', 'Community', true, true, 7)
 * ON CONFLICT (route) DO NOTHING;
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
  Modal,
  Switch,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
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
  Pencil,
  Menu,
  ExternalLink,
  Grid,
  Layout,
  Star,
  Globe,
  FileText,
  Home as HomeIcon,
  Settings,
  Heart,
  Zap,
  Award,
  Briefcase,
  Link as LinkIcon,
  Map,
  Phone,
  ShoppingBag,
  GraduationCap,
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

interface HomeBannerRow {
  id: string;
  label: string;
  cover_image_url: string | null;
  redirect_url: string;
  open_in_app: boolean;
  menu_tag: string | null;
  sort_order: number;
  is_enabled: boolean;
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

// ─── Edit modals ──────────────────────────────────────────────────────────────

function EditTrainingModal({
  visible,
  onClose,
  onSaved,
  item,
}: {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
  item: TrainingPost | null;
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

  useEffect(() => {
    if (item) {
      setForm({
        title: item.title ?? '',
        description: (item as any).description ?? '',
        content: (item as any).content ?? '',
        video_url: (item as any).video_url ?? '',
        thumbnail_url: (item as any).thumbnail_url ?? '',
        category: (item as any).category ?? '',
      });
    }
  }, [item]);

  const set = (key: keyof TrainingForm) => (v: string) =>
    setForm((prev) => ({ ...prev, [key]: v }));

  const handleSave = async () => {
    if (!item) return;
    if (!form.title.trim()) {
      Alert.alert('Validation', 'Title is required.');
      return;
    }
    console.log('[Admin] Editing training post:', item.id, form.title);
    setSaving(true);
    const { error } = await supabase
      .from('training_posts')
      .update({
        title: form.title.trim(),
        description: form.description.trim() || null,
        content: form.content.trim() || null,
        video_url: form.video_url.trim() || null,
        thumbnail_url: form.thumbnail_url.trim() || null,
        category: form.category.trim() || null,
      })
      .eq('id', item.id);
    setSaving(false);
    if (error) {
      console.error('[Admin] Error editing training post:', error.message);
      Alert.alert('Error', error.message);
      return;
    }
    console.log('[Admin] Training post edited successfully');
    onSaved();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={modalStyles.container}>
        <View style={modalStyles.header}>
          <Text style={modalStyles.title}>Edit Training Post</Text>
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
              <Text style={modalStyles.saveBtnText}>Save Changes</Text>
            )}
          </AnimatedPressable>
        </View>
      </View>
    </Modal>
  );
}

function EditEventModal({
  visible,
  onClose,
  onSaved,
  item,
}: {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
  item: Event | null;
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

  useEffect(() => {
    if (item) {
      const parsedDate = item.event_date ? new Date(item.event_date) : new Date();
      setForm({
        title: item.title ?? '',
        description: (item as any).description ?? '',
        image_url: (item as any).image_url ?? '',
        event_date: isNaN(parsedDate.getTime()) ? new Date() : parsedDate,
        location: (item as any).location ?? '',
        is_virtual: (item as any).is_virtual ?? false,
        event_url: (item as any).event_url ?? '',
      });
    }
  }, [item]);

  const set = (key: keyof EventForm) => (v: string) =>
    setForm((prev) => ({ ...prev, [key]: v }));

  const handleSave = async () => {
    if (!item) return;
    if (!form.title.trim()) {
      Alert.alert('Validation', 'Title is required.');
      return;
    }
    console.log('[Admin] Editing event:', item.id, form.title);
    setSaving(true);
    const { error } = await supabase
      .from('events')
      .update({
        title: form.title.trim(),
        description: form.description.trim() || null,
        image_url: form.image_url.trim() || null,
        event_date: form.event_date.toISOString(),
        location: form.location.trim() || null,
        is_virtual: form.is_virtual,
        event_url: form.event_url.trim() || null,
      })
      .eq('id', item.id);
    setSaving(false);
    if (error) {
      console.error('[Admin] Error editing event:', error.message);
      Alert.alert('Error', error.message);
      return;
    }
    console.log('[Admin] Event edited successfully');
    onSaved();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={modalStyles.container}>
        <View style={modalStyles.header}>
          <Text style={modalStyles.title}>Edit Event</Text>
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
              <Text style={modalStyles.saveBtnText}>Save Changes</Text>
            )}
          </AnimatedPressable>
        </View>
      </View>
    </Modal>
  );
}

function EditInterviewModal({
  visible,
  onClose,
  onSaved,
  item,
}: {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
  item: Interview | null;
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

  useEffect(() => {
    if (item) {
      setForm({
        title: item.title ?? '',
        description: (item as any).description ?? '',
        video_url: (item as any).video_url ?? '',
        thumbnail_url: (item as any).thumbnail_url ?? '',
        guest_name: (item as any).guest_name ?? '',
        guest_title: (item as any).guest_title ?? '',
      });
    }
  }, [item]);

  const set = (key: keyof InterviewForm) => (v: string) =>
    setForm((prev) => ({ ...prev, [key]: v }));

  const handleSave = async () => {
    if (!item) return;
    if (!form.title.trim()) {
      Alert.alert('Validation', 'Title is required.');
      return;
    }
    console.log('[Admin] Editing interview:', item.id, form.title);
    setSaving(true);
    const { error } = await supabase
      .from('interviews')
      .update({
        title: form.title.trim(),
        description: form.description.trim() || null,
        video_url: form.video_url.trim() || null,
        thumbnail_url: form.thumbnail_url.trim() || null,
        guest_name: form.guest_name.trim() || null,
        guest_title: form.guest_title.trim() || null,
      })
      .eq('id', item.id);
    setSaving(false);
    if (error) {
      console.error('[Admin] Error editing interview:', error.message);
      Alert.alert('Error', error.message);
      return;
    }
    console.log('[Admin] Interview edited successfully');
    onSaved();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={modalStyles.container}>
        <View style={modalStyles.header}>
          <Text style={modalStyles.title}>Edit Interview</Text>
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
              <Text style={modalStyles.saveBtnText}>Save Changes</Text>
            )}
          </AnimatedPressable>
        </View>
      </View>
    </Modal>
  );
}

function EditWebinarModal({
  visible,
  onClose,
  onSaved,
  item,
}: {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
  item: Webinar | null;
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

  useEffect(() => {
    if (item) {
      const parsedDate = (item as any).webinar_date ? new Date((item as any).webinar_date) : new Date();
      setForm({
        title: item.title ?? '',
        description: (item as any).description ?? '',
        thumbnail_url: (item as any).thumbnail_url ?? '',
        webinar_date: isNaN(parsedDate.getTime()) ? new Date() : parsedDate,
        webinar_url: (item as any).webinar_url ?? '',
        is_recorded: (item as any).is_recorded ?? false,
        recording_url: (item as any).recording_url ?? '',
      });
    }
  }, [item]);

  const set = (key: keyof WebinarForm) => (v: string) =>
    setForm((prev) => ({ ...prev, [key]: v }));

  const handleSave = async () => {
    if (!item) return;
    if (!form.title.trim()) {
      Alert.alert('Validation', 'Title is required.');
      return;
    }
    console.log('[Admin] Editing webinar:', item.id, form.title);
    setSaving(true);
    const { error } = await supabase
      .from('webinars')
      .update({
        title: form.title.trim(),
        description: form.description.trim() || null,
        thumbnail_url: form.thumbnail_url.trim() || null,
        webinar_date: form.webinar_date.toISOString(),
        webinar_url: form.webinar_url.trim() || null,
        is_recorded: form.is_recorded,
        recording_url: form.recording_url.trim() || null,
      })
      .eq('id', item.id);
    setSaving(false);
    if (error) {
      console.error('[Admin] Error editing webinar:', error.message);
      Alert.alert('Error', error.message);
      return;
    }
    console.log('[Admin] Webinar edited successfully');
    onSaved();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={modalStyles.container}>
        <View style={modalStyles.header}>
          <Text style={modalStyles.title}>Edit Webinar</Text>
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
              <Text style={modalStyles.saveBtnText}>Save Changes</Text>
            )}
          </AnimatedPressable>
        </View>
      </View>
    </Modal>
  );
}

// ─── MenuItemModal ────────────────────────────────────────────────────────────

const INTERNAL_ROUTES: { label: string; route: string }[] = [
  { label: 'Home', route: '/(drawer)/home' },
  { label: 'Magazine', route: '/(drawer)/magazine' },
  { label: 'Events', route: '/(drawer)/events' },
  { label: 'Store', route: '/(drawer)/store' },
  { label: 'Training', route: '/(drawer)/training' },
  { label: 'Interviews', route: '/(drawer)/interviews' },
  { label: 'Webinars', route: '/(drawer)/webinars' },
  { label: 'Community', route: '/(drawer)/community' },
];

function MenuItemModal({
  visible,
  onClose,
  onSaved,
  item,
  nextSortOrder,
}: {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
  item: MenuConfigRow | null;
  nextSortOrder: number;
}) {
  const isEdit = item !== null;

  const [label, setLabel] = useState('');
  const [linkType, setLinkType] = useState<'internal' | 'external'>('internal');
  const [selectedRoute, setSelectedRoute] = useState('/(drawer)/home');
  const [externalUrl, setExternalUrl] = useState('');
  const [requiresPaid, setRequiresPaid] = useState(false);
  const [isEnabled, setIsEnabled] = useState(true);
  const [openInApp, setOpenInApp] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      if (item) {
        setLabel(item.label);
        const isExternal = item.route.startsWith('external_') || !!item.external_url;
        setLinkType(isExternal ? 'external' : 'internal');
        setSelectedRoute(isExternal ? '/(drawer)/home' : item.route);
        setExternalUrl(item.external_url ?? '');
        setRequiresPaid(item.requires_paid);
        setIsEnabled(item.is_enabled);
        setOpenInApp(item.open_in_app ?? false);
      } else {
        setLabel('');
        setLinkType('internal');
        setSelectedRoute('/(drawer)/home');
        setExternalUrl('');
        setRequiresPaid(false);
        setIsEnabled(true);
        setOpenInApp(false);
      }
    }
  }, [visible, item]);

  const handleSave = async () => {
    if (!label.trim()) {
      Alert.alert('Validation', 'Label is required.');
      return;
    }
    if (linkType === 'external' && !externalUrl.trim().startsWith('http')) {
      Alert.alert('Validation', 'External URL must start with "http".');
      return;
    }

    const route = linkType === 'external' ? `external_${Date.now()}` : selectedRoute;
    const extUrl = linkType === 'external' ? externalUrl.trim() : null;

    console.log('[Admin] Saving menu item:', label, 'mode:', isEdit ? 'edit' : 'add', 'route:', route);
    setSaving(true);

    let error: any = null;

    if (isEdit && item) {
      const result = await supabase
        .from('menu_config')
        .update({
          label: label.trim(),
          route,
          external_url: extUrl,
          requires_paid: requiresPaid,
          is_enabled: isEnabled,
          open_in_app: openInApp,
        })
        .eq('id', item.id);
      error = result.error;
    } else {
      const result = await supabase.from('menu_config').insert({
        label: label.trim(),
        route,
        external_url: extUrl,
        requires_paid: requiresPaid,
        is_enabled: isEnabled,
        open_in_app: openInApp,
        sort_order: nextSortOrder,
      });
      error = result.error;
    }

    setSaving(false);

    if (error) {
      console.error('[Admin] Error saving menu item:', error.message);
      Alert.alert('Error', error.message);
      return;
    }

    console.log('[Admin] Menu item saved successfully');
    onSaved();
    onClose();
  };

  const modalTitle = isEdit ? 'Edit Menu Item' : 'Add Menu Item';

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={modalStyles.container}>
        <View style={modalStyles.header}>
          <Text style={modalStyles.title}>{modalTitle}</Text>
          <AnimatedPressable onPress={onClose} style={modalStyles.closeBtn}>
            <X size={20} color={COLORS.text} />
          </AnimatedPressable>
        </View>
        <ScrollView style={modalStyles.body} showsVerticalScrollIndicator={false}>
          {/* Label */}
          <FormInput label="Label *" value={label} onChangeText={setLabel} placeholder="Menu item label" />

          {/* Link Type Toggle */}
          <View style={formStyles.inputGroup}>
            <Text style={formStyles.inputLabel}>Link Type</Text>
            <View style={menuItemModalStyles.toggleRow}>
              <AnimatedPressable
                onPress={() => {
                  console.log('[Admin] Menu item link type → internal');
                  setLinkType('internal');
                }}
                style={[menuItemModalStyles.toggleBtn, linkType === 'internal' && menuItemModalStyles.toggleBtnActive]}
              >
                <Text style={[menuItemModalStyles.toggleBtnText, linkType === 'internal' && menuItemModalStyles.toggleBtnTextActive]}>
                  Internal Screen
                </Text>
              </AnimatedPressable>
              <AnimatedPressable
                onPress={() => {
                  console.log('[Admin] Menu item link type → external');
                  setLinkType('external');
                }}
                style={[menuItemModalStyles.toggleBtn, linkType === 'external' && menuItemModalStyles.toggleBtnActive]}
              >
                <Text style={[menuItemModalStyles.toggleBtnText, linkType === 'external' && menuItemModalStyles.toggleBtnTextActive]}>
                  External URL
                </Text>
              </AnimatedPressable>
            </View>
          </View>

          {/* Internal route pills */}
          {linkType === 'internal' && (
            <View style={formStyles.inputGroup}>
              <Text style={formStyles.inputLabel}>Screen</Text>
              <View style={menuItemModalStyles.pillsWrap}>
                {INTERNAL_ROUTES.map((r) => {
                  const isSelected = selectedRoute === r.route;
                  return (
                    <AnimatedPressable
                      key={r.route}
                      onPress={() => {
                        console.log('[Admin] Menu item route selected:', r.route);
                        setSelectedRoute(r.route);
                      }}
                      style={[menuItemModalStyles.pill, isSelected && menuItemModalStyles.pillActive]}
                    >
                      <Text style={[menuItemModalStyles.pillText, isSelected && menuItemModalStyles.pillTextActive]}>
                        {r.label}
                      </Text>
                    </AnimatedPressable>
                  );
                })}
              </View>
            </View>
          )}

          {/* External URL input */}
          {linkType === 'external' && (
            <View style={formStyles.inputGroup}>
              <Text style={formStyles.inputLabel}>URL</Text>
              <TextInput
                style={formStyles.textInput}
                value={externalUrl}
                onChangeText={setExternalUrl}
                placeholder="https://"
                placeholderTextColor={COLORS.textTertiary}
                autoCapitalize="none"
                keyboardType="url"
              />
            </View>
          )}

          {linkType === 'external' && (
            <View>
              <SwitchRow
                label="Open inside app"
                value={openInApp}
                onValueChange={(v) => {
                  console.log('[Admin] Menu item open_in_app →', v);
                  setOpenInApp(v);
                }}
              />
              <Text style={menuItemModalStyles.helperText}>
                When on, the URL loads in an in-app browser. When off, it opens in the device's default browser.
              </Text>
            </View>
          )}

          <SwitchRow label="Members Only" value={requiresPaid} onValueChange={(v) => {
            console.log('[Admin] Menu item requires_paid →', v);
            setRequiresPaid(v);
          }} />
          <SwitchRow label="Enabled" value={isEnabled} onValueChange={(v) => {
            console.log('[Admin] Menu item is_enabled →', v);
            setIsEnabled(v);
          }} />
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
              <Text style={modalStyles.saveBtnText}>{isEdit ? 'Save Changes' : 'Add Menu Item'}</Text>
            )}
          </AnimatedPressable>
        </View>
      </View>
    </Modal>
  );
}

// ─── QuickAccessModal ─────────────────────────────────────────────────────────

const ICON_NAMES = [
  'BookOpen', 'Calendar', 'ShoppingBag', 'GraduationCap', 'Users',
  'Star', 'Globe', 'Bell', 'Video', 'Mic',
  'FileText', 'Home', 'Settings', 'Heart', 'Zap',
  'Award', 'Briefcase', 'Link', 'Map', 'Phone',
];

const CONTENT_TYPES: { label: string; value: HomeSectionRow['content_type'] }[] = [
  { label: 'Events', value: 'events' },
  { label: 'Training', value: 'training' },
  { label: 'Interviews', value: 'interviews' },
  { label: 'Webinars', value: 'webinars' },
];

function QuickAccessModal({
  visible,
  onClose,
  onSaved,
  item,
  nextSortOrder,
}: {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
  item: QuickAccessRow | null;
  nextSortOrder: number;
}) {
  const isEdit = item !== null;
  const [label, setLabel] = useState('');
  const [iconName, setIconName] = useState('Star');
  const [linkType, setLinkType] = useState<'internal' | 'external'>('internal');
  const [selectedRoute, setSelectedRoute] = useState('/(drawer)/home');
  const [externalUrl, setExternalUrl] = useState('');
  const [openInApp, setOpenInApp] = useState(false);
  const [requiresPaid, setRequiresPaid] = useState(false);
  const [isEnabled, setIsEnabled] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      if (item) {
        setLabel(item.label);
        setIconName(item.icon_name || 'Star');
        setLinkType(item.link_type);
        setSelectedRoute(item.route ?? '/(drawer)/home');
        setExternalUrl(item.external_url ?? '');
        setOpenInApp(item.open_in_app);
        setRequiresPaid(item.requires_paid);
        setIsEnabled(item.is_enabled);
      } else {
        setLabel('');
        setIconName('Star');
        setLinkType('internal');
        setSelectedRoute('/(drawer)/home');
        setExternalUrl('');
        setOpenInApp(false);
        setRequiresPaid(false);
        setIsEnabled(true);
      }
    }
  }, [visible, item]);

  const handleSave = async () => {
    if (!label.trim()) {
      Alert.alert('Validation', 'Label is required.');
      return;
    }
    if (linkType === 'external' && !externalUrl.trim().startsWith('http')) {
      Alert.alert('Validation', 'External URL must start with "http".');
      return;
    }
    console.log('[Admin] Saving quick access button:', label, 'mode:', isEdit ? 'edit' : 'add');
    setSaving(true);
    const payload = {
      label: label.trim(),
      icon_name: iconName,
      link_type: linkType,
      route: linkType === 'internal' ? selectedRoute : null,
      external_url: linkType === 'external' ? externalUrl.trim() : null,
      open_in_app: linkType === 'external' ? openInApp : false,
      requires_paid: requiresPaid,
      is_enabled: isEnabled,
    };
    let error: any = null;
    if (isEdit && item) {
      const result = await supabase.from('home_quick_access').update(payload).eq('id', item.id);
      error = result.error;
    } else {
      const result = await supabase.from('home_quick_access').insert({ ...payload, sort_order: nextSortOrder });
      error = result.error;
    }
    setSaving(false);
    if (error) {
      console.error('[Admin] Error saving quick access button:', error.message);
      Alert.alert('Error', error.message);
      return;
    }
    console.log('[Admin] Quick access button saved successfully');
    onSaved();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={modalStyles.container}>
        <View style={modalStyles.header}>
          <Text style={modalStyles.title}>{isEdit ? 'Edit Button' : 'Add Button'}</Text>
          <AnimatedPressable onPress={onClose} style={modalStyles.closeBtn}>
            <X size={20} color={COLORS.text} />
          </AnimatedPressable>
        </View>
        <ScrollView style={modalStyles.body} showsVerticalScrollIndicator={false}>
          <FormInput label="Label *" value={label} onChangeText={setLabel} placeholder="Button label" />

          {/* Icon picker */}
          <View style={formStyles.inputGroup}>
            <Text style={formStyles.inputLabel}>Icon</Text>
            <View style={menuItemModalStyles.pillsWrap}>
              {ICON_NAMES.map((name) => {
                const isSelected = iconName === name;
                return (
                  <AnimatedPressable
                    key={name}
                    onPress={() => {
                      console.log('[Admin] Quick access icon selected:', name);
                      setIconName(name);
                    }}
                    style={[menuItemModalStyles.pill, isSelected && menuItemModalStyles.pillActive]}
                  >
                    <Text style={[menuItemModalStyles.pillText, isSelected && menuItemModalStyles.pillTextActive]}>
                      {name}
                    </Text>
                  </AnimatedPressable>
                );
              })}
            </View>
          </View>

          {/* Link Type */}
          <View style={formStyles.inputGroup}>
            <Text style={formStyles.inputLabel}>Link Type</Text>
            <View style={menuItemModalStyles.toggleRow}>
              <AnimatedPressable
                onPress={() => { console.log('[Admin] QA link type → internal'); setLinkType('internal'); }}
                style={[menuItemModalStyles.toggleBtn, linkType === 'internal' && menuItemModalStyles.toggleBtnActive]}
              >
                <Text style={[menuItemModalStyles.toggleBtnText, linkType === 'internal' && menuItemModalStyles.toggleBtnTextActive]}>
                  Internal
                </Text>
              </AnimatedPressable>
              <AnimatedPressable
                onPress={() => { console.log('[Admin] QA link type → external'); setLinkType('external'); }}
                style={[menuItemModalStyles.toggleBtn, linkType === 'external' && menuItemModalStyles.toggleBtnActive]}
              >
                <Text style={[menuItemModalStyles.toggleBtnText, linkType === 'external' && menuItemModalStyles.toggleBtnTextActive]}>
                  External URL
                </Text>
              </AnimatedPressable>
            </View>
          </View>

          {linkType === 'internal' && (
            <View style={formStyles.inputGroup}>
              <Text style={formStyles.inputLabel}>Screen</Text>
              <View style={menuItemModalStyles.pillsWrap}>
                {INTERNAL_ROUTES.map((r) => {
                  const isSelected = selectedRoute === r.route;
                  return (
                    <AnimatedPressable
                      key={r.route}
                      onPress={() => { console.log('[Admin] QA route selected:', r.route); setSelectedRoute(r.route); }}
                      style={[menuItemModalStyles.pill, isSelected && menuItemModalStyles.pillActive]}
                    >
                      <Text style={[menuItemModalStyles.pillText, isSelected && menuItemModalStyles.pillTextActive]}>
                        {r.label}
                      </Text>
                    </AnimatedPressable>
                  );
                })}
              </View>
            </View>
          )}

          {linkType === 'external' && (
            <>
              <View style={formStyles.inputGroup}>
                <Text style={formStyles.inputLabel}>URL</Text>
                <TextInput
                  style={formStyles.textInput}
                  value={externalUrl}
                  onChangeText={setExternalUrl}
                  placeholder="https://"
                  placeholderTextColor={COLORS.textTertiary}
                  autoCapitalize="none"
                  keyboardType="url"
                />
              </View>
              <SwitchRow
                label="Open inside app"
                value={openInApp}
                onValueChange={(v) => { console.log('[Admin] QA open_in_app →', v); setOpenInApp(v); }}
              />
            </>
          )}

          <SwitchRow label="Members Only" value={requiresPaid} onValueChange={(v) => { console.log('[Admin] QA requires_paid →', v); setRequiresPaid(v); }} />
          <SwitchRow label="Enabled" value={isEnabled} onValueChange={(v) => { console.log('[Admin] QA is_enabled →', v); setIsEnabled(v); }} />
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
              <Text style={modalStyles.saveBtnText}>{isEdit ? 'Save Changes' : 'Add Button'}</Text>
            )}
          </AnimatedPressable>
        </View>
      </View>
    </Modal>
  );
}

// ─── HomeSectionModal ─────────────────────────────────────────────────────────

function HomeSectionModal({
  visible,
  onClose,
  onSaved,
  item,
  nextSortOrder,
}: {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
  item: HomeSectionRow | null;
  nextSortOrder: number;
}) {
  const isEdit = item !== null;
  const [title, setTitle] = useState('');
  const [linkType, setLinkType] = useState<'content' | 'external'>('content');
  const [contentType, setContentType] = useState<HomeSectionRow['content_type']>('events');
  const [itemLimit, setItemLimit] = useState('5');
  const [externalUrl, setExternalUrl] = useState('');
  const [openInApp, setOpenInApp] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState('');
  const [previewDescription, setPreviewDescription] = useState('');
  const [requiresPaid, setRequiresPaid] = useState(false);
  const [isEnabled, setIsEnabled] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      if (item) {
        setTitle(item.title);
        setLinkType(item.link_type ?? 'content');
        setContentType(item.content_type);
        setItemLimit(String(item.item_limit));
        setExternalUrl(item.external_url ?? '');
        setOpenInApp(item.open_in_app ?? false);
        setPreviewImageUrl(item.preview_image_url ?? '');
        setPreviewDescription(item.preview_description ?? '');
        setRequiresPaid(item.requires_paid);
        setIsEnabled(item.is_enabled);
      } else {
        setTitle('');
        setLinkType('content');
        setContentType('events');
        setItemLimit('5');
        setExternalUrl('');
        setOpenInApp(false);
        setPreviewImageUrl('');
        setPreviewDescription('');
        setRequiresPaid(false);
        setIsEnabled(true);
      }
    }
  }, [visible, item]);

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Validation', 'Title is required.');
      return;
    }
    if (linkType === 'external') {
      if (!externalUrl.trim() || !externalUrl.trim().startsWith('http')) {
        Alert.alert('Validation', 'External URL is required and must start with http.');
        return;
      }
    }
    const limit = Math.min(10, Math.max(1, parseInt(itemLimit, 10) || 5));
    console.log('[Admin] Saving home section:', title, 'link_type:', linkType, 'mode:', isEdit ? 'edit' : 'add');
    setSaving(true);
    const payload = {
      title: title.trim(),
      link_type: linkType,
      content_type: linkType === 'content' ? contentType : 'events',
      item_limit: linkType === 'content' ? limit : 1,
      external_url: linkType === 'external' ? externalUrl.trim() : null,
      open_in_app: linkType === 'external' ? openInApp : false,
      preview_image_url: linkType === 'external' ? (previewImageUrl.trim() || null) : null,
      preview_description: linkType === 'external' ? (previewDescription.trim() || null) : null,
      requires_paid: requiresPaid,
      is_enabled: isEnabled,
    };
    let error: any = null;
    if (isEdit && item) {
      const result = await supabase.from('home_sections').update(payload).eq('id', item.id);
      error = result.error;
    } else {
      const result = await supabase.from('home_sections').insert({ ...payload, sort_order: nextSortOrder });
      error = result.error;
    }
    setSaving(false);
    if (error) {
      console.error('[Admin] Error saving home section:', error.message);
      Alert.alert('Error', error.message);
      return;
    }
    console.log('[Admin] Home section saved successfully');
    onSaved();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={modalStyles.container}>
        <View style={modalStyles.header}>
          <Text style={modalStyles.title}>{isEdit ? 'Edit Section' : 'Add Section'}</Text>
          <AnimatedPressable onPress={onClose} style={modalStyles.closeBtn}>
            <X size={20} color={COLORS.text} />
          </AnimatedPressable>
        </View>
        <ScrollView style={modalStyles.body} showsVerticalScrollIndicator={false}>
          <FormInput label="Title *" value={title} onChangeText={setTitle} placeholder="Section title" />

          {/* Link Type Toggle */}
          <View style={formStyles.inputGroup}>
            <Text style={formStyles.inputLabel}>Section Type</Text>
            <View style={menuItemModalStyles.pillsWrap}>
              {(['content', 'external'] as const).map((lt) => {
                const isSelected = linkType === lt;
                const label = lt === 'content' ? 'Content' : 'External Link';
                return (
                  <AnimatedPressable
                    key={lt}
                    onPress={() => { console.log('[Admin] Section link_type selected:', lt); setLinkType(lt); }}
                    style={[menuItemModalStyles.pill, isSelected && menuItemModalStyles.pillActive]}
                  >
                    <Text style={[menuItemModalStyles.pillText, isSelected && menuItemModalStyles.pillTextActive]}>
                      {label}
                    </Text>
                  </AnimatedPressable>
                );
              })}
            </View>
          </View>

          {linkType === 'content' ? (
            <>
              {/* Content Type */}
              <View style={formStyles.inputGroup}>
                <Text style={formStyles.inputLabel}>Content Type</Text>
                <View style={menuItemModalStyles.pillsWrap}>
                  {CONTENT_TYPES.map((ct) => {
                    const isSelected = contentType === ct.value;
                    return (
                      <AnimatedPressable
                        key={ct.value}
                        onPress={() => { console.log('[Admin] Section content type selected:', ct.value); setContentType(ct.value); }}
                        style={[menuItemModalStyles.pill, isSelected && menuItemModalStyles.pillActive]}
                      >
                        <Text style={[menuItemModalStyles.pillText, isSelected && menuItemModalStyles.pillTextActive]}>
                          {ct.label}
                        </Text>
                      </AnimatedPressable>
                    );
                  })}
                </View>
              </View>

              {/* Item Limit */}
              <View style={formStyles.inputGroup}>
                <Text style={formStyles.inputLabel}>Item Limit (1–10)</Text>
                <TextInput
                  style={formStyles.textInput}
                  value={itemLimit}
                  onChangeText={setItemLimit}
                  placeholder="5"
                  placeholderTextColor={COLORS.textTertiary}
                  keyboardType="number-pad"
                />
              </View>
            </>
          ) : (
            <>
              {/* External URL */}
              <View style={formStyles.inputGroup}>
                <Text style={formStyles.inputLabel}>External URL *</Text>
                <TextInput
                  style={formStyles.textInput}
                  value={externalUrl}
                  onChangeText={setExternalUrl}
                  placeholder="https://example.com"
                  placeholderTextColor={COLORS.textTertiary}
                  autoCapitalize="none"
                  keyboardType="url"
                />
              </View>

              {/* Preview Image URL */}
              <View style={formStyles.inputGroup}>
                <Text style={formStyles.inputLabel}>Preview Image URL (optional)</Text>
                <TextInput
                  style={formStyles.textInput}
                  value={previewImageUrl}
                  onChangeText={setPreviewImageUrl}
                  placeholder="https://example.com/image.jpg"
                  placeholderTextColor={COLORS.textTertiary}
                  autoCapitalize="none"
                  keyboardType="url"
                />
              </View>

              {/* Preview Description */}
              <View style={formStyles.inputGroup}>
                <Text style={formStyles.inputLabel}>Preview Description (optional)</Text>
                <TextInput
                  style={[formStyles.textInput, { height: 72, textAlignVertical: 'top' }]}
                  value={previewDescription}
                  onChangeText={setPreviewDescription}
                  placeholder="Short description shown on the card"
                  placeholderTextColor={COLORS.textTertiary}
                  multiline
                />
              </View>

              <SwitchRow label="Open Inside App" value={openInApp} onValueChange={(v) => { console.log('[Admin] Section open_in_app →', v); setOpenInApp(v); }} />
            </>
          )}

          <SwitchRow label="Members Only" value={requiresPaid} onValueChange={(v) => { console.log('[Admin] Section requires_paid →', v); setRequiresPaid(v); }} />
          <SwitchRow label="Enabled" value={isEnabled} onValueChange={(v) => { console.log('[Admin] Section is_enabled →', v); setIsEnabled(v); }} />
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
              <Text style={modalStyles.saveBtnText}>{isEdit ? 'Save Changes' : 'Add Section'}</Text>
            )}
          </AnimatedPressable>
        </View>
      </View>
    </Modal>
  );
}

// ─── HomeBannerModal ──────────────────────────────────────────────────────────

function HomeBannerModal({
  visible,
  onClose,
  onSaved,
  item,
  nextSortOrder,
}: {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
  item: HomeBannerRow | null;
  nextSortOrder: number;
}) {
  const isEdit = item !== null;
  const [label, setLabel] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [redirectUrl, setRedirectUrl] = useState('');
  const [menuTag, setMenuTag] = useState('');
  const [openInApp, setOpenInApp] = useState(false);
  const [isEnabled, setIsEnabled] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      if (item) {
        setLabel(item.label);
        setCoverImageUrl(item.cover_image_url ?? '');
        setRedirectUrl(item.redirect_url);
        setMenuTag(item.menu_tag ?? '');
        setOpenInApp(item.open_in_app);
        setIsEnabled(item.is_enabled);
      } else {
        setLabel('');
        setCoverImageUrl('');
        setRedirectUrl('');
        setMenuTag('');
        setOpenInApp(false);
        setIsEnabled(true);
      }
    }
  }, [visible, item]);

  const handleSave = async () => {
    if (!label.trim()) {
      Alert.alert('Validation', 'Label is required.');
      return;
    }
    if (!redirectUrl.trim().startsWith('http')) {
      Alert.alert('Validation', 'Redirect URL must start with http.');
      return;
    }
    console.log('[Admin] Saving home banner:', label, 'mode:', isEdit ? 'edit' : 'add');
    setSaving(true);
    const payload = {
      label: label.trim(),
      cover_image_url: coverImageUrl.trim() || null,
      redirect_url: redirectUrl.trim(),
      menu_tag: menuTag.trim() || null,
      open_in_app: openInApp,
      is_enabled: isEnabled,
    };
    let error: any = null;
    if (isEdit && item) {
      const result = await supabase.from('home_banners').update(payload).eq('id', item.id);
      error = result.error;
    } else {
      const result = await supabase.from('home_banners').insert({ ...payload, sort_order: nextSortOrder });
      error = result.error;
    }
    setSaving(false);
    if (error) {
      console.error('[Admin] Error saving home banner:', error.message);
      Alert.alert('Error', error.message);
      return;
    }
    console.log('[Admin] Home banner saved successfully');
    onSaved();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={modalStyles.container}>
        <View style={modalStyles.header}>
          <Text style={modalStyles.title}>{isEdit ? 'Edit Banner' : 'Add Banner'}</Text>
          <AnimatedPressable onPress={onClose} style={modalStyles.closeBtn}>
            <X size={20} color={COLORS.text} />
          </AnimatedPressable>
        </View>
        <ScrollView style={modalStyles.body} showsVerticalScrollIndicator={false}>
          <FormInput label="Label *" value={label} onChangeText={setLabel} placeholder="Banner label" />
          <FormInput label="Cover Image URL" value={coverImageUrl} onChangeText={setCoverImageUrl} placeholder="https://" />
          <FormInput label="Redirect URL *" value={redirectUrl} onChangeText={setRedirectUrl} placeholder="https://" />
          <FormInput label="Menu Tag" value={menuTag} onChangeText={setMenuTag} placeholder="e.g. Home, Events, Training" />
          <SwitchRow
            label="Open Inside App"
            value={openInApp}
            onValueChange={(v) => {
              console.log('[Admin] Banner open_in_app →', v);
              setOpenInApp(v);
            }}
          />
          <SwitchRow
            label="Enabled"
            value={isEnabled}
            onValueChange={(v) => {
              console.log('[Admin] Banner is_enabled →', v);
              setIsEnabled(v);
            }}
          />
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
              <Text style={modalStyles.saveBtnText}>{isEdit ? 'Save Changes' : 'Add Banner'}</Text>
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
  onEdit,
}: {
  id: string;
  title: string;
  isPublished: boolean;
  table: string;
  onToggle: () => void;
  onDelete: () => void;
  onEdit: () => void;
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
        <AnimatedPressable
          onPress={() => {
            console.log('[Admin] Edit pressed for', table, id);
            onEdit();
          }}
          style={styles.iconBtn}
        >
          <Pencil size={16} color={COLORS.primary} />
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
  const router = useRouter();

  // Core data
  const [members, setMembers] = useState<Profile[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, paid: 0, free: 0 });
  const [loading, setLoading] = useState(true);

  // Analytics
  const [recentSignups, setRecentSignups] = useState<RecentSignup[]>([]);
  const [growth, setGrowth] = useState<GrowthData>({ thisWeek: 0, lastWeek: 0 });

  // Members section
  const [showRecentMembers, setShowRecentMembers] = useState(false);

  // Content
  const [activeTab, setActiveTab] = useState<ContentTab>('training');
  const [trainingPosts, setTrainingPosts] = useState<TrainingPost[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [webinars, setWebinars] = useState<Webinar[]>([]);
  const [contentLoading, setContentLoading] = useState(false);

  // Add modals
  const [showAddTraining, setShowAddTraining] = useState(false);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [showAddInterview, setShowAddInterview] = useState(false);
  const [showAddWebinar, setShowAddWebinar] = useState(false);

  // Edit modals
  const [editingTraining, setEditingTraining] = useState<TrainingPost | null>(null);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [editingInterview, setEditingInterview] = useState<Interview | null>(null);
  const [editingWebinar, setEditingWebinar] = useState<Webinar | null>(null);

  // Notifications
  const [notifTitle, setNotifTitle] = useState('');
  const [notifBody, setNotifBody] = useState('');
  const [targetTier, setTargetTier] = useState<TargetTier>('all');
  const [sendingNotif, setSendingNotif] = useState(false);

  // Menu config
  const [menuConfig, setMenuConfig] = useState<MenuConfigRow[]>([]);
  const [menuConfigLoading, setMenuConfigLoading] = useState(false);
  const [showMenuItemModal, setShowMenuItemModal] = useState(false);
  const [editingMenuItem, setEditingMenuItem] = useState<MenuConfigRow | null>(null);

  // Quick access management
  const [quickAccessItems, setQuickAccessItems] = useState<QuickAccessRow[]>([]);
  const [quickAccessLoading, setQuickAccessLoading] = useState(false);
  const [showQuickAccessModal, setShowQuickAccessModal] = useState(false);
  const [editingQuickAccess, setEditingQuickAccess] = useState<QuickAccessRow | null>(null);

  // Home sections management
  const [adminHomeSections, setAdminHomeSections] = useState<HomeSectionRow[]>([]);
  const [homeSectionsLoading, setHomeSectionsLoading] = useState(false);
  const [showHomeSectionModal, setShowHomeSectionModal] = useState(false);
  const [editingHomeSection, setEditingHomeSection] = useState<HomeSectionRow | null>(null);

  // Home banners management
  const [adminHomeBanners, setAdminHomeBanners] = useState<HomeBannerRow[]>([]);
  const [homeBannersLoading, setHomeBannersLoading] = useState(false);
  const [showHomeBannerModal, setShowHomeBannerModal] = useState(false);
  const [editingHomeBanner, setEditingHomeBanner] = useState<HomeBannerRow | null>(null);

  const isAdmin = profile?.role === 'admin';

  useEffect(() => {
    if (!isAdmin) return;

    fetchData();
    fetchContent('training');
    fetchMenuConfig();
    fetchQuickAccess();
    fetchAdminHomeSections();
    fetchAdminHomeBanners();

    // Real-time subscriptions
    const qaSub = supabase
      .channel('admin_home_quick_access')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'home_quick_access' }, () => {
        console.log('[Admin] Real-time: home_quick_access changed');
        fetchQuickAccess();
      })
      .subscribe();

    const hsSub = supabase
      .channel('admin_home_sections')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'home_sections' }, () => {
        console.log('[Admin] Real-time: home_sections changed');
        fetchAdminHomeSections();
      })
      .subscribe();

    const bannerSub = supabase
      .channel('admin_home_banners')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'home_banners' }, () => {
        console.log('[Admin] Real-time: home_banners changed');
        fetchAdminHomeBanners();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(qaSub);
      supabase.removeChannel(hsSub);
      supabase.removeChannel(bannerSub);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

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

  // ── Fetch menu config ────────────────────────────────────────────────────────

  const fetchMenuConfig = async () => {
    console.log('[Admin] Fetching menu config');
    setMenuConfigLoading(true);
    try {
      const { data, error } = await supabase
        .from('menu_config')
        .select('*')
        .order('sort_order', { ascending: true });
      if (error) {
        console.error('[Admin] Menu config fetch error:', error.message);
      } else {
        setMenuConfig((data as MenuConfigRow[]) ?? []);
        console.log('[Admin] Menu config loaded:', data?.length ?? 0, 'items');
      }
    } catch (err) {
      console.error('[Admin] Menu config fetch error:', err);
    } finally {
      setMenuConfigLoading(false);
    }
  };

  const fetchQuickAccess = async () => {
    console.log('[Admin] Fetching quick access items');
    setQuickAccessLoading(true);
    try {
      const { data, error } = await supabase
        .from('home_quick_access')
        .select('*')
        .order('sort_order', { ascending: true });
      if (error) {
        console.error('[Admin] Quick access fetch error:', error.message);
      } else {
        setQuickAccessItems((data as QuickAccessRow[]) ?? []);
        console.log('[Admin] Quick access items loaded:', data?.length ?? 0);
      }
    } catch (err) {
      console.error('[Admin] Quick access fetch unexpected error:', err);
    } finally {
      setQuickAccessLoading(false);
    }
  };

  const fetchAdminHomeSections = async () => {
    console.log('[Admin] Fetching home sections');
    setHomeSectionsLoading(true);
    try {
      const { data, error } = await supabase
        .from('home_sections')
        .select('*')
        .order('sort_order', { ascending: true });
      if (error) {
        console.error('[Admin] Home sections fetch error:', error.message);
      } else {
        setAdminHomeSections((data as HomeSectionRow[]) ?? []);
        console.log('[Admin] Home sections loaded:', data?.length ?? 0);
      }
    } catch (err) {
      console.error('[Admin] Home sections fetch unexpected error:', err);
    } finally {
      setHomeSectionsLoading(false);
    }
  };

  const fetchAdminHomeBanners = async () => {
    console.log('[Admin] Fetching home banners');
    setHomeBannersLoading(true);
    const { data, error } = await supabase
      .from('home_banners')
      .select('*')
      .order('sort_order', { ascending: true });
    if (error) console.error('[Admin] Banners fetch error:', error.message);
    else setAdminHomeBanners((data as HomeBannerRow[]) ?? []);
    setHomeBannersLoading(false);
  };

  const handleMenuToggle = async (row: MenuConfigRow, newValue: boolean) => {
    console.log('[Admin] Menu toggle pressed:', row.label, '→', newValue);
    // Optimistic update
    setMenuConfig((prev) =>
      prev.map((r) => (r.id === row.id ? { ...r, is_enabled: newValue } : r))
    );
    const { error } = await supabase
      .from('menu_config')
      .update({ is_enabled: newValue })
      .eq('id', row.id);
    if (error) {
      console.error('[Admin] Menu toggle error:', error.message);
      // Revert on error
      setMenuConfig((prev) =>
        prev.map((r) => (r.id === row.id ? { ...r, is_enabled: !newValue } : r))
      );
      Alert.alert('Error', error.message);
    } else {
      console.log('[Admin] Menu item', row.label, 'is_enabled set to', newValue);
    }
  };

  const handleTabChange = (tab: ContentTab) => {
    console.log('[Admin] Content tab changed to:', tab);
    setActiveTab(tab);
    fetchContent(tab);
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
        <DrawerHeader title="AB Club - Admin" />
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

  const oldestDate = members.length > 0 ? new Date(members[members.length - 1].created_at) : new Date();
  const nowDate = new Date();
  const monthsSinceFirst = Math.max(1, (nowDate.getFullYear() - oldestDate.getFullYear()) * 12 + (nowDate.getMonth() - oldestDate.getMonth()));
  const avgPerMonth = Math.round(stats.total / monthsSinceFirst);

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
      <DrawerHeader title="AB Club - Admin" />

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

      {/* Menu item modal */}
      <MenuItemModal
        visible={showMenuItemModal}
        onClose={() => { setShowMenuItemModal(false); setEditingMenuItem(null); }}
        onSaved={() => fetchMenuConfig()}
        item={editingMenuItem}
        nextSortOrder={menuConfig.length}
      />

      {/* Quick access modal */}
      <QuickAccessModal
        visible={showQuickAccessModal}
        onClose={() => { setShowQuickAccessModal(false); setEditingQuickAccess(null); }}
        onSaved={() => fetchQuickAccess()}
        item={editingQuickAccess}
        nextSortOrder={quickAccessItems.length}
      />

      {/* Home section modal */}
      <HomeSectionModal
        visible={showHomeSectionModal}
        onClose={() => { setShowHomeSectionModal(false); setEditingHomeSection(null); }}
        onSaved={() => fetchAdminHomeSections()}
        item={editingHomeSection}
        nextSortOrder={adminHomeSections.length}
      />

      {/* Home banner modal */}
      <HomeBannerModal
        visible={showHomeBannerModal}
        onClose={() => { setShowHomeBannerModal(false); setEditingHomeBanner(null); }}
        onSaved={fetchAdminHomeBanners}
        item={editingHomeBanner}
        nextSortOrder={adminHomeBanners.length}
      />

      {/* Edit modals */}
      <EditTrainingModal
        visible={editingTraining !== null}
        onClose={() => setEditingTraining(null)}
        onSaved={() => fetchContent('training')}
        item={editingTraining}
      />
      <EditEventModal
        visible={editingEvent !== null}
        onClose={() => setEditingEvent(null)}
        onSaved={() => fetchContent('events')}
        item={editingEvent}
      />
      <EditInterviewModal
        visible={editingInterview !== null}
        onClose={() => setEditingInterview(null)}
        onSaved={() => fetchContent('interviews')}
        item={editingInterview}
      />
      <EditWebinarModal
        visible={editingWebinar !== null}
        onClose={() => setEditingWebinar(null)}
        onSaved={() => fetchContent('webinars')}
        item={editingWebinar}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* ── Stats ── */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { borderLeftColor: COLORS.primary }]}>
            <Text style={styles.statNumber}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total Members</Text>
          </View>
          <View style={[styles.statCard, { borderLeftColor: COLORS.success }]}>
            <Text style={styles.statNumber}>{growth.thisWeek}</Text>
            <Text style={styles.statLabel}>Growth</Text>
            <Text style={[styles.statSubLabel, { color: growthColor }]}>{growthLabel}</Text>
          </View>
          <View style={[styles.statCard, { borderLeftColor: COLORS.accent }]}>
            <Text style={styles.statNumber}>{avgPerMonth}</Text>
            <Text style={styles.statLabel}>Avg / Month</Text>
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

          {/* Recent Members button */}
          <AnimatedPressable
            onPress={() => {
              console.log('[Admin] Toggle recent members:', !showRecentMembers);
              setShowRecentMembers((v) => !v);
            }}
            style={styles.addBtn}
          >
            <Users size={16} color={COLORS.primary} />
            <Text style={styles.addBtnText}>
              {showRecentMembers ? 'Hide Recent Members' : 'Recent Members'}
            </Text>
          </AnimatedPressable>

          {/* Recent members list (last 5) */}
          {showRecentMembers && (
            loading ? (
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
            )
          )}

          {/* View All Members button */}
          <AnimatedPressable
            onPress={() => {
              console.log('[Admin] View All Members pressed');
              router.push('/(drawer)/admin-members' as any);
            }}
            style={[styles.addBtn, { marginTop: 8 }]}
          >
            <Users size={16} color={COLORS.primary} />
            <Text style={styles.addBtnText}>View All Members</Text>
          </AnimatedPressable>
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
                  onEdit={() => {
                    console.log('[Admin] Edit button pressed for', activeTab, item.id);
                    if (activeTab === 'training') {
                      setEditingTraining(trainingPosts.find((t) => t.id === item.id) ?? null);
                    } else if (activeTab === 'events') {
                      setEditingEvent(events.find((e) => e.id === item.id) ?? null);
                    } else if (activeTab === 'interviews') {
                      setEditingInterview(interviews.find((i) => i.id === item.id) ?? null);
                    } else {
                      setEditingWebinar(webinars.find((w) => w.id === item.id) ?? null);
                    }
                  }}
                />
                {idx < activeItems.length - 1 && <View style={styles.separator} />}
              </View>
            ))
          )}
        </View>

        {/* ── Menu Configuration ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Menu size={18} color={COLORS.text} />
            <Text style={styles.sectionTitle}>Menu Configuration</Text>
            <AnimatedPressable
              onPress={() => {
                console.log('[Admin] Refresh menu config pressed');
                fetchMenuConfig();
              }}
              style={styles.refreshButton}
            >
              <RefreshCw size={16} color={COLORS.primary} />
            </AnimatedPressable>
          </View>

          {menuConfigLoading ? (
            <>
              <ListItemSkeleton />
              <ListItemSkeleton />
              <ListItemSkeleton />
            </>
          ) : menuConfig.length === 0 ? (
            <Text style={styles.emptyText}>
              No menu config found. Run the SQL migration to seed the table.
            </Text>
          ) : (
            menuConfig.map((row, idx) => {
              const badgeText = row.requires_paid ? 'Restricted' : 'Open';
              const badgeBg = row.requires_paid ? COLORS.accentMuted : COLORS.primaryMuted;
              const badgeColor = row.requires_paid ? COLORS.accent : COLORS.primary;
              return (
                <View key={row.id}>
                  <View style={styles.menuConfigRow}>
                    <View style={styles.menuConfigInfo}>
                      <Text style={styles.menuConfigLabel}>{row.label}</Text>
                      <View style={[styles.menuConfigBadge, { backgroundColor: badgeBg }]}>
                        <Text style={[styles.menuConfigBadgeText, { color: badgeColor }]}>
                          {badgeText}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.menuConfigActions}>
                      <AnimatedPressable
                        onPress={() => {
                          console.log('[Admin] Edit menu item pressed:', row.label);
                          setEditingMenuItem(row);
                          setShowMenuItemModal(true);
                        }}
                        style={styles.iconBtn}
                      >
                        <Pencil size={15} color={COLORS.primary} />
                      </AnimatedPressable>
                      <AnimatedPressable
                        onPress={() => {
                          console.log('[Admin] Delete menu item pressed:', row.label);
                          Alert.alert(
                            'Delete Menu Item',
                            `Delete "${row.label}" from the menu? This cannot be undone.`,
                            [
                              { text: 'Cancel', style: 'cancel' },
                              {
                                text: 'Delete',
                                style: 'destructive',
                                onPress: async () => {
                                  console.log('[Admin] Confirming delete menu item:', row.id);
                                  const { error } = await supabase
                                    .from('menu_config')
                                    .delete()
                                    .eq('id', row.id);
                                  if (error) {
                                    console.error('[Admin] Delete menu item error:', error.message);
                                    Alert.alert('Error', error.message);
                                    return;
                                  }
                                  console.log('[Admin] Menu item deleted:', row.label);
                                  fetchMenuConfig();
                                },
                              },
                            ]
                          );
                        }}
                        style={[styles.iconBtn, styles.iconBtnDanger]}
                      >
                        <Trash2 size={15} color={COLORS.danger} />
                      </AnimatedPressable>
                      <Switch
                        value={row.is_enabled}
                        onValueChange={(v) => handleMenuToggle(row, v)}
                        trackColor={{ false: COLORS.border, true: COLORS.primary }}
                        thumbColor="#FFFFFF"
                      />
                    </View>
                  </View>
                  {idx < menuConfig.length - 1 && <View style={styles.separator} />}
                </View>
              );
            })
          )}

          {/* Add Menu Item button */}
          <AnimatedPressable
            onPress={() => {
              console.log('[Admin] Add menu item pressed');
              setEditingMenuItem(null);
              setShowMenuItemModal(true);
            }}
            style={[styles.addBtn, { marginTop: 12, marginBottom: 0 }]}
          >
            <Plus size={16} color={COLORS.primary} />
            <Text style={styles.addBtnText}>Add Menu Item</Text>
          </AnimatedPressable>

          <Text style={styles.menuConfigNote}>
            Changes take effect immediately for all users.
          </Text>
        </View>

        {/* ── Quick Access Management ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Grid size={18} color={COLORS.text} />
            <Text style={styles.sectionTitle}>Quick Access Buttons</Text>
            <Text style={styles.qaCount}>{quickAccessItems.length} / 25</Text>
            <AnimatedPressable
              onPress={() => { console.log('[Admin] Refresh quick access pressed'); fetchQuickAccess(); }}
              style={styles.refreshButton}
            >
              <RefreshCw size={16} color={COLORS.primary} />
            </AnimatedPressable>
          </View>

          {quickAccessLoading ? (
            <>
              <ListItemSkeleton />
              <ListItemSkeleton />
            </>
          ) : quickAccessItems.length === 0 ? (
            <Text style={styles.emptyText}>No quick access buttons yet.</Text>
          ) : (
            quickAccessItems.map((row, idx) => {
              const badgeText = row.link_type === 'external' ? 'External' : 'Internal';
              const badgeBg = row.link_type === 'external' ? COLORS.accentMuted : COLORS.primaryMuted;
              const badgeColor = row.link_type === 'external' ? COLORS.accent : COLORS.primary;
              return (
                <View key={row.id}>
                  <View style={styles.menuConfigRow}>
                    <View style={styles.menuConfigInfo}>
                      <View style={[styles.menuConfigBadge, { backgroundColor: COLORS.surfaceSecondary, borderWidth: 1, borderColor: COLORS.border }]}>
                        <Text style={[styles.menuConfigBadgeText, { color: COLORS.textSecondary }]}>{row.icon_name}</Text>
                      </View>
                      <Text style={styles.menuConfigLabel} numberOfLines={1}>{row.label}</Text>
                      <View style={[styles.menuConfigBadge, { backgroundColor: badgeBg }]}>
                        <Text style={[styles.menuConfigBadgeText, { color: badgeColor }]}>{badgeText}</Text>
                      </View>
                    </View>
                    <View style={styles.menuConfigActions}>
                      <AnimatedPressable
                        onPress={() => {
                          console.log('[Admin] Edit quick access pressed:', row.label);
                          setEditingQuickAccess(row);
                          setShowQuickAccessModal(true);
                        }}
                        style={styles.iconBtn}
                      >
                        <Pencil size={15} color={COLORS.primary} />
                      </AnimatedPressable>
                      <AnimatedPressable
                        onPress={() => {
                          console.log('[Admin] Delete quick access pressed:', row.label);
                          Alert.alert(
                            'Delete Button',
                            `Delete "${row.label}"? This cannot be undone.`,
                            [
                              { text: 'Cancel', style: 'cancel' },
                              {
                                text: 'Delete',
                                style: 'destructive',
                                onPress: async () => {
                                  console.log('[Admin] Confirming delete quick access:', row.id);
                                  const { error } = await supabase.from('home_quick_access').delete().eq('id', row.id);
                                  if (error) {
                                    console.error('[Admin] Delete quick access error:', error.message);
                                    Alert.alert('Error', error.message);
                                    return;
                                  }
                                  console.log('[Admin] Quick access deleted:', row.label);
                                  fetchQuickAccess();
                                },
                              },
                            ]
                          );
                        }}
                        style={[styles.iconBtn, styles.iconBtnDanger]}
                      >
                        <Trash2 size={15} color={COLORS.danger} />
                      </AnimatedPressable>
                      <Switch
                        value={row.is_enabled}
                        onValueChange={async (v) => {
                          console.log('[Admin] Quick access toggle:', row.label, '→', v);
                          setQuickAccessItems((prev) => prev.map((r) => r.id === row.id ? { ...r, is_enabled: v } : r));
                          const { error } = await supabase.from('home_quick_access').update({ is_enabled: v }).eq('id', row.id);
                          if (error) {
                            console.error('[Admin] Quick access toggle error:', error.message);
                            setQuickAccessItems((prev) => prev.map((r) => r.id === row.id ? { ...r, is_enabled: !v } : r));
                          }
                        }}
                        trackColor={{ false: COLORS.border, true: COLORS.primary }}
                        thumbColor="#FFFFFF"
                      />
                    </View>
                  </View>
                  {idx < quickAccessItems.length - 1 && <View style={styles.separator} />}
                </View>
              );
            })
          )}

          <AnimatedPressable
            onPress={() => {
              if (quickAccessItems.length >= 25) {
                Alert.alert('Limit Reached', 'You can have a maximum of 25 quick access buttons.');
                return;
              }
              console.log('[Admin] Add quick access button pressed');
              setEditingQuickAccess(null);
              setShowQuickAccessModal(true);
            }}
            style={[styles.addBtn, { marginTop: 12, marginBottom: 0, opacity: quickAccessItems.length >= 25 ? 0.5 : 1 }]}
          >
            <Plus size={16} color={COLORS.primary} />
            <Text style={styles.addBtnText}>Add Button</Text>
          </AnimatedPressable>
        </View>

        {/* ── Home Sections Management ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Layout size={18} color={COLORS.text} />
            <Text style={styles.sectionTitle}>Home Sections</Text>
            <AnimatedPressable
              onPress={() => { console.log('[Admin] Refresh home sections pressed'); fetchAdminHomeSections(); }}
              style={styles.refreshButton}
            >
              <RefreshCw size={16} color={COLORS.primary} />
            </AnimatedPressable>
          </View>

          {homeSectionsLoading ? (
            <>
              <ListItemSkeleton />
              <ListItemSkeleton />
            </>
          ) : adminHomeSections.length === 0 ? (
            <Text style={styles.emptyText}>No home sections yet.</Text>
          ) : (
            adminHomeSections.map((row, idx) => {
              const ctColors: Record<string, { bg: string; color: string }> = {
                events: { bg: COLORS.primaryMuted, color: COLORS.primary },
                training: { bg: COLORS.accentMuted, color: COLORS.accent },
                interviews: { bg: 'rgba(16,185,129,0.1)', color: COLORS.success },
                webinars: { bg: 'rgba(245,158,11,0.1)', color: '#D97706' },
              };
              const ct = ctColors[row.content_type] ?? { bg: COLORS.primaryMuted, color: COLORS.primary };
              const isExternal = row.link_type === 'external';
              return (
                <View key={row.id}>
                  <View style={styles.menuConfigRow}>
                    <View style={[styles.menuConfigInfo, { flexDirection: 'column', alignItems: 'flex-start', gap: 4 }]}>
                      <Text style={styles.menuConfigLabel} numberOfLines={1}>{row.title}</Text>
                      <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                        {isExternal ? (
                          <View style={[styles.menuConfigBadge, { backgroundColor: 'rgba(245,158,11,0.15)' }]}>
                            <Text style={[styles.menuConfigBadgeText, { color: '#D97706' }]}>External</Text>
                          </View>
                        ) : (
                          <>
                            <View style={[styles.menuConfigBadge, { backgroundColor: ct.bg }]}>
                              <Text style={[styles.menuConfigBadgeText, { color: ct.color }]}>{row.content_type}</Text>
                            </View>
                            <Text style={styles.sectionItemLimit}>Limit: {row.item_limit}</Text>
                          </>
                        )}
                        {row.requires_paid ? (
                          <View style={[styles.menuConfigBadge, { backgroundColor: COLORS.accentMuted }]}>
                            <Text style={[styles.menuConfigBadgeText, { color: COLORS.accent }]}>Paid</Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                    <View style={styles.menuConfigActions}>
                      <AnimatedPressable
                        onPress={() => {
                          console.log('[Admin] Edit home section pressed:', row.title);
                          setEditingHomeSection(row);
                          setShowHomeSectionModal(true);
                        }}
                        style={styles.iconBtn}
                      >
                        <Pencil size={15} color={COLORS.primary} />
                      </AnimatedPressable>
                      <AnimatedPressable
                        onPress={() => {
                          console.log('[Admin] Delete home section pressed:', row.title);
                          Alert.alert(
                            'Delete Section',
                            `Delete "${row.title}"? This cannot be undone.`,
                            [
                              { text: 'Cancel', style: 'cancel' },
                              {
                                text: 'Delete',
                                style: 'destructive',
                                onPress: async () => {
                                  console.log('[Admin] Confirming delete home section:', row.id);
                                  const { error } = await supabase.from('home_sections').delete().eq('id', row.id);
                                  if (error) {
                                    console.error('[Admin] Delete home section error:', error.message);
                                    Alert.alert('Error', error.message);
                                    return;
                                  }
                                  console.log('[Admin] Home section deleted:', row.title);
                                  fetchAdminHomeSections();
                                },
                              },
                            ]
                          );
                        }}
                        style={[styles.iconBtn, styles.iconBtnDanger]}
                      >
                        <Trash2 size={15} color={COLORS.danger} />
                      </AnimatedPressable>
                      <Switch
                        value={row.is_enabled}
                        onValueChange={async (v) => {
                          console.log('[Admin] Home section toggle:', row.title, '→', v);
                          setAdminHomeSections((prev) => prev.map((r) => r.id === row.id ? { ...r, is_enabled: v } : r));
                          const { error } = await supabase.from('home_sections').update({ is_enabled: v }).eq('id', row.id);
                          if (error) {
                            console.error('[Admin] Home section toggle error:', error.message);
                            setAdminHomeSections((prev) => prev.map((r) => r.id === row.id ? { ...r, is_enabled: !v } : r));
                          }
                        }}
                        trackColor={{ false: COLORS.border, true: COLORS.primary }}
                        thumbColor="#FFFFFF"
                      />
                    </View>
                  </View>
                  {idx < adminHomeSections.length - 1 && <View style={styles.separator} />}
                </View>
              );
            })
          )}

          <AnimatedPressable
            onPress={() => {
              console.log('[Admin] Add home section pressed');
              setEditingHomeSection(null);
              setShowHomeSectionModal(true);
            }}
            style={[styles.addBtn, { marginTop: 12, marginBottom: 0 }]}
          >
            <Plus size={16} color={COLORS.primary} />
            <Text style={styles.addBtnText}>Add Section</Text>
          </AnimatedPressable>
        </View>

        {/* ── Banners Management ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Layout size={18} color={COLORS.text} />
            <Text style={styles.sectionTitle}>Banners</Text>
            <AnimatedPressable
              onPress={() => { console.log('[Admin] Refresh banners pressed'); fetchAdminHomeBanners(); }}
              style={styles.refreshButton}
            >
              <RefreshCw size={16} color={COLORS.primary} />
            </AnimatedPressable>
          </View>

          {homeBannersLoading ? (
            <>
              <ListItemSkeleton />
              <ListItemSkeleton />
            </>
          ) : adminHomeBanners.length === 0 ? (
            <Text style={styles.emptyText}>No banners yet.</Text>
          ) : (
            adminHomeBanners.map((row, idx) => (
              <View key={row.id}>
                <View style={styles.menuConfigRow}>
                  <View style={[styles.menuConfigInfo, { flexDirection: 'column', alignItems: 'flex-start', gap: 4 }]}>
                    <Text style={styles.menuConfigLabel} numberOfLines={1}>{row.label}</Text>
                    <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                      {row.menu_tag ? (
                        <View style={[styles.menuConfigBadge, { backgroundColor: COLORS.primaryMuted }]}>
                          <Text style={[styles.menuConfigBadgeText, { color: COLORS.primary }]}>{row.menu_tag}</Text>
                        </View>
                      ) : null}
                      <Text style={styles.sectionItemLimit} numberOfLines={1}>{row.redirect_url}</Text>
                    </View>
                  </View>
                  <View style={styles.menuConfigActions}>
                    <AnimatedPressable
                      onPress={() => {
                        console.log('[Admin] Edit banner pressed:', row.label);
                        setEditingHomeBanner(row);
                        setShowHomeBannerModal(true);
                      }}
                      style={styles.iconBtn}
                    >
                      <Pencil size={15} color={COLORS.primary} />
                    </AnimatedPressable>
                    <AnimatedPressable
                      onPress={() => {
                        console.log('[Admin] Delete banner pressed:', row.label);
                        Alert.alert(
                          'Delete Banner',
                          `Delete "${row.label}"? This cannot be undone.`,
                          [
                            { text: 'Cancel', style: 'cancel' },
                            {
                              text: 'Delete',
                              style: 'destructive',
                              onPress: async () => {
                                console.log('[Admin] Confirming delete banner:', row.id);
                                const { error } = await supabase.from('home_banners').delete().eq('id', row.id);
                                if (error) {
                                  console.error('[Admin] Delete banner error:', error.message);
                                  Alert.alert('Error', error.message);
                                  return;
                                }
                                console.log('[Admin] Banner deleted:', row.label);
                                fetchAdminHomeBanners();
                              },
                            },
                          ]
                        );
                      }}
                      style={[styles.iconBtn, styles.iconBtnDanger]}
                    >
                      <Trash2 size={15} color={COLORS.danger} />
                    </AnimatedPressable>
                    <Switch
                      value={row.is_enabled}
                      onValueChange={async (v) => {
                        console.log('[Admin] Banner toggle:', row.label, '→', v);
                        setAdminHomeBanners((prev) => prev.map((r) => r.id === row.id ? { ...r, is_enabled: v } : r));
                        const { error } = await supabase.from('home_banners').update({ is_enabled: v }).eq('id', row.id);
                        if (error) {
                          console.error('[Admin] Banner toggle error:', error.message);
                          setAdminHomeBanners((prev) => prev.map((r) => r.id === row.id ? { ...r, is_enabled: !v } : r));
                        }
                      }}
                      trackColor={{ false: COLORS.border, true: COLORS.primary }}
                      thumbColor="#FFFFFF"
                    />
                  </View>
                </View>
                {idx < adminHomeBanners.length - 1 && <View style={styles.separator} />}
              </View>
            ))
          )}

          <AnimatedPressable
            onPress={() => {
              console.log('[Admin] Add banner pressed');
              setEditingHomeBanner(null);
              setShowHomeBannerModal(true);
            }}
            style={[styles.addBtn, { marginTop: 12, marginBottom: 0 }]}
          >
            <Plus size={16} color={COLORS.primary} />
            <Text style={styles.addBtnText}>Add Banner</Text>
          </AnimatedPressable>
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
  statSubLabel: {
    fontSize: 9,
    fontFamily: 'Outfit_400Regular',
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
  memberNumber: {
    fontSize: 11,
    fontFamily: 'Outfit_400Regular',
    color: COLORS.textTertiary,
    marginTop: 1,
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
  // Menu config
  menuConfigRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
  },
  menuConfigInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  menuConfigLabel: {
    fontSize: 14,
    fontFamily: 'Outfit_500Medium',
    color: COLORS.text,
  },
  menuConfigBadge: {
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  menuConfigBadgeText: {
    fontSize: 10,
    fontFamily: 'Outfit_600SemiBold',
    letterSpacing: 0.3,
  },
  menuConfigActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  menuConfigNote: {
    fontSize: 12,
    fontFamily: 'Outfit_400Regular',
    color: COLORS.textTertiary,
    textAlign: 'center',
    marginTop: 12,
    fontStyle: 'italic',
  },
  qaCount: {
    fontSize: 12,
    fontFamily: 'Outfit_500Medium',
    color: COLORS.textTertiary,
    marginRight: 4,
  },
  sectionItemLimit: {
    fontSize: 11,
    fontFamily: 'Outfit_400Regular',
    color: COLORS.textTertiary,
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

const menuItemModalStyles = StyleSheet.create({
  toggleRow: {
    flexDirection: 'row',
    gap: 8,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: COLORS.surfaceSecondary,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  toggleBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  toggleBtnText: {
    fontSize: 13,
    fontFamily: 'Outfit_500Medium',
    color: COLORS.textSecondary,
  },
  toggleBtnTextActive: {
    color: '#FFFFFF',
    fontFamily: 'Outfit_600SemiBold',
  },
  pillsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: COLORS.surfaceSecondary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pillActive: {
    backgroundColor: COLORS.primaryMuted,
    borderColor: COLORS.primary,
  },
  pillText: {
    fontSize: 13,
    fontFamily: 'Outfit_500Medium',
    color: COLORS.textSecondary,
  },
  pillTextActive: {
    color: COLORS.primary,
    fontFamily: 'Outfit_600SemiBold',
  },
  helperText: {
    fontSize: 12,
    fontFamily: 'Outfit_400Regular',
    color: COLORS.textTertiary,
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 8,
    lineHeight: 17,
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
