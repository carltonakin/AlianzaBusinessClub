export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  membership_tier: 'free' | 'paid';
  role: 'member' | 'admin';
  created_at: string;
  updated_at: string;
}

export interface TrainingPost {
  id: string;
  title: string;
  description: string | null;
  content: string | null;
  video_url: string | null;
  thumbnail_url: string | null;
  category: string | null;
  author_id: string | null;
  is_published: boolean;
  created_at: string;
}

export interface Event {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  event_date: string;
  location: string | null;
  is_virtual: boolean;
  event_url: string | null;
  is_published: boolean;
  created_at: string;
}

export interface Interview {
  id: string;
  title: string;
  description: string | null;
  video_url: string | null;
  thumbnail_url: string | null;
  guest_name: string | null;
  guest_title: string | null;
  is_published: boolean;
  created_at: string;
}

export interface Webinar {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  webinar_date: string | null;
  webinar_url: string | null;
  is_recorded: boolean;
  recording_url: string | null;
  is_published: boolean;
  created_at: string;
}

export interface CommunityPost {
  id: string;
  author_id: string | null;
  title: string | null;
  content: string;
  image_url: string | null;
  likes_count: number;
  comments_count: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  author?: Profile;
}

export interface CommunityComment {
  id: string;
  post_id: string;
  author_id: string | null;
  content: string;
  created_at: string;
  author?: Profile;
}

export interface PushNotification {
  id: string;
  title: string;
  body: string;
  target_tier: 'all' | 'free' | 'paid';
  sent_by: string | null;
  sent_at: string;
}
