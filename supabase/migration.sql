-- profiles
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  avatar_url text,
  membership_tier text NOT NULL DEFAULT 'free' CHECK (membership_tier IN ('free', 'paid')),
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'admin')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE training_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  content text,
  video_url text,
  thumbnail_url text,
  category text,
  author_id uuid REFERENCES profiles(id),
  is_published boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  image_url text,
  event_date timestamptz NOT NULL,
  location text,
  is_virtual boolean DEFAULT false,
  event_url text,
  is_published boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE interviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  video_url text,
  thumbnail_url text,
  guest_name text,
  guest_title text,
  is_published boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE webinars (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  thumbnail_url text,
  webinar_date timestamptz,
  webinar_url text,
  is_recorded boolean DEFAULT false,
  recording_url text,
  is_published boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE community_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid REFERENCES profiles(id),
  title text,
  content text NOT NULL,
  image_url text,
  likes_count integer DEFAULT 0,
  comments_count integer DEFAULT 0,
  is_published boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE community_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES community_posts(id) ON DELETE CASCADE,
  author_id uuid REFERENCES profiles(id),
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE community_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE(post_id, user_id)
);

CREATE TABLE push_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL,
  target_tier text NOT NULL DEFAULT 'all' CHECK (target_tier IN ('all', 'free', 'paid')),
  sent_by uuid REFERENCES profiles(id),
  sent_at timestamptz DEFAULT now()
);

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE webinars ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_all" ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin');
$$ LANGUAGE sql SECURITY DEFINER;

CREATE POLICY "training_select_published" ON training_posts FOR SELECT TO authenticated USING (is_published = true);
CREATE POLICY "training_admin_all" ON training_posts FOR ALL TO authenticated USING (is_admin());
CREATE POLICY "events_select_published" ON events FOR SELECT USING (is_published = true);
CREATE POLICY "events_admin_all" ON events FOR ALL TO authenticated USING (is_admin());
CREATE POLICY "interviews_select_published" ON interviews FOR SELECT USING (is_published = true);
CREATE POLICY "interviews_admin_all" ON interviews FOR ALL TO authenticated USING (is_admin());
CREATE POLICY "webinars_select_published" ON webinars FOR SELECT USING (is_published = true);
CREATE POLICY "webinars_admin_all" ON webinars FOR ALL TO authenticated USING (is_admin());
CREATE POLICY "community_posts_select" ON community_posts FOR SELECT TO authenticated USING (is_published = true);
CREATE POLICY "community_posts_insert_own" ON community_posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);
CREATE POLICY "community_posts_update_own" ON community_posts FOR UPDATE TO authenticated USING (auth.uid() = author_id);
CREATE POLICY "community_posts_delete_own" ON community_posts FOR DELETE TO authenticated USING (auth.uid() = author_id OR is_admin());
CREATE POLICY "comments_select" ON community_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "comments_insert_own" ON community_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);
CREATE POLICY "comments_delete_own" ON community_comments FOR DELETE TO authenticated USING (auth.uid() = author_id OR is_admin());
CREATE POLICY "likes_select" ON community_likes FOR SELECT TO authenticated USING (true);
CREATE POLICY "likes_insert_own" ON community_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "likes_delete_own" ON community_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "notifications_select" ON push_notifications FOR SELECT TO authenticated USING (true);
CREATE POLICY "notifications_insert_admin" ON push_notifications FOR INSERT TO authenticated WITH CHECK (is_admin());

-- Seed data
INSERT INTO events (title, description, image_url, event_date, location, is_virtual, event_url) VALUES
('Marketing Summit 2025', 'Annual gathering of top marketing professionals.', 'https://picsum.photos/seed/event1/800/400', '2025-09-15 09:00:00+00', 'Miami Convention Center, FL', false, 'https://alianzaempresarial.online'),
('Digital Sales Masterclass', 'Live virtual workshop on closing high-ticket deals.', 'https://picsum.photos/seed/event2/800/400', '2025-08-20 18:00:00+00', 'Online', true, 'https://alianzaempresarial.online'),
('Entrepreneur Networking Night', 'Connect with fellow entrepreneurs and industry leaders.', 'https://picsum.photos/seed/event3/800/400', '2025-07-30 19:00:00+00', 'New York City, NY', false, 'https://alianzaempresarial.online');

INSERT INTO training_posts (title, description, content, video_url, thumbnail_url, category) VALUES
('Mastering Cold Outreach', 'Proven frameworks for cold email and LinkedIn outreach.', 'In this training we cover the AIDA framework, personalization at scale, and follow-up sequences.', 'https://www.w3schools.com/html/mov_bbb.mp4', 'https://picsum.photos/seed/training1/800/450', 'Sales'),
('Building a 7-Figure Funnel', 'Step-by-step breakdown of a high-converting sales funnel.', 'We analyze real funnel examples, traffic sources, and conversion optimization tactics.', 'https://www.w3schools.com/html/mov_bbb.mp4', 'https://picsum.photos/seed/training2/800/450', 'Marketing'),
('Social Media for B2B Growth', 'Use LinkedIn, Instagram, and YouTube to generate B2B leads.', 'Content strategy, posting cadence, engagement tactics, and converting followers into clients.', 'https://www.w3schools.com/html/mov_bbb.mp4', 'https://picsum.photos/seed/training3/800/450', 'Social Media');

INSERT INTO interviews (title, description, video_url, thumbnail_url, guest_name, guest_title) VALUES
('From Zero to $1M: Maria''s Story', 'Maria shares how she built a 7-figure consulting business in under 3 years.', 'https://www.w3schools.com/html/mov_bbb.mp4', 'https://picsum.photos/seed/interview1/800/450', 'Maria Gonzalez', 'CEO, Apex Consulting'),
('The Future of Digital Marketing', 'Carlos breaks down AI-driven marketing trends for 2025.', 'https://www.w3schools.com/html/mov_bbb.mp4', 'https://picsum.photos/seed/interview2/800/450', 'Carlos Rivera', 'CMO, TechGrowth Inc.'),
('Scaling with Systems', 'How Ana automated her agency and scaled to 50 clients.', 'https://www.w3schools.com/html/mov_bbb.mp4', 'https://picsum.photos/seed/interview3/800/450', 'Ana Morales', 'Founder, Scale Studio');

INSERT INTO webinars (title, description, thumbnail_url, webinar_date, webinar_url, is_recorded, recording_url) VALUES
('Lead Generation Secrets', 'Top 5 lead generation strategies working right now.', 'https://picsum.photos/seed/webinar1/800/450', '2025-08-05 17:00:00+00', 'https://alianzaempresarial.online', false, null),
('Email Marketing That Converts', 'Email sequences that generated $200K in 30 days.', 'https://picsum.photos/seed/webinar2/800/450', '2025-06-10 17:00:00+00', null, true, 'https://www.w3schools.com/html/mov_bbb.mp4'),
('Pricing Your Services for Profit', 'Price confidently and stop leaving money on the table.', 'https://picsum.photos/seed/webinar3/800/450', '2025-09-02 18:00:00+00', 'https://alianzaempresarial.online', false, null);
