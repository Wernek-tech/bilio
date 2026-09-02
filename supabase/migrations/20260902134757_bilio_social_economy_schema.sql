/*
# Bilio social and economy schema

1. Modified Tables
- `profiles`: added columns for title, frame, avatar, stats, and weekly score.
- `rooms`: added settings column (JSONB for game-specific config).

2. New Tables
- `bots`: 10 permanent bot profiles with avatar, gender, and display info.
- `friends`: bidirectional friendship links between users.
- `blocks`: user block relationships.
- `private_messages`: 1:1 persistent messages between users.
- `profile_likes`: unique per-user profile like records.
- `inventory`: owned cosmetic items (frames, titles) per user.
- `shop_items`: catalog of purchasable cosmetics and gifts.
- `badges`: 36 badge definitions with image, name, and unlock criteria.
- `user_badges`: badges earned by users, with showcase flag.
- `game_stats`: per-user per-game statistics (matches, wins, correct answers, score).
- `weekly_scores`: weekly leaderboard scores reset each week.
- `notifications`: user notifications (welcome, rewards, friend requests, etc.).
- `donut_packages`: shared donut package state (owner, diamonds remaining, openers).
- `room_chat`: in-room chat messages (separate from lobby).
- `game_questions`: question pool for Şarkıyı Bil, Tahmin Et Kim, Yayıncı Kim.
- `hangman_words`: Turkish word pool for Adam Asmaca.
- `bil_bakalim_boards`: letter grid boards for Bil Bakalım with hidden words.

3. Security
- RLS enabled on all new tables.
- Users can read public profiles, shop items, badges, and game questions.
- Users can only modify their own data (friends, blocks, messages, inventory, badges, stats).
- Private messages are readable only by sender and recipient.
- Notifications are readable only by the recipient.
*/

-- Extend profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS title text NOT NULL DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS frame text NOT NULL DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_color text NOT NULL DEFAULT '#ff7e57';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS total_matches integer NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS total_wins integer NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS total_correct integer NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS total_score integer NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS weekly_score integer NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS reward_claimed boolean NOT NULL DEFAULT false;

-- Extend rooms
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS settings jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Bots
CREATE TABLE IF NOT EXISTS public.bots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL UNIQUE,
  avatar_color text NOT NULL DEFAULT '#c97b5a',
  gender text NOT NULL DEFAULT 'male' CHECK (gender IN ('male', 'female')),
  is_online boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Friends
CREATE TABLE IF NOT EXISTS public.friends (
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  friend_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, friend_id),
  CHECK (user_id != friend_id)
);

-- Blocks
CREATE TABLE IF NOT EXISTS public.blocks (
  blocker_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id),
  CHECK (blocker_id != blocked_id)
);

-- Private messages
CREATE TABLE IF NOT EXISTS public.private_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 500),
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Profile likes (unique per user)
CREATE TABLE IF NOT EXISTS public.profile_likes (
  liker_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (liker_id, target_id),
  CHECK (liker_id != target_id)
);

-- Shop items
CREATE TABLE IF NOT EXISTS public.shop_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('frame', 'title', 'gift', 'donut_package')),
  price integer NOT NULL CHECK (price >= 0),
  currency text NOT NULL DEFAULT 'gold' CHECK (currency IN ('gold', 'diamonds')),
  image_url text,
  rarity text NOT NULL DEFAULT 'common' CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Inventory
CREATE TABLE IF NOT EXISTS public.inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES public.shop_items(id) ON DELETE CASCADE,
  equipped boolean NOT NULL DEFAULT false,
  purchased_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, item_id)
);

-- Badges
CREATE TABLE IF NOT EXISTS public.badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL,
  image_url text NOT NULL,
  unlock_level integer NOT NULL DEFAULT 1,
  unlock_condition text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- User badges
CREATE TABLE IF NOT EXISTS public.user_badges (
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  badge_id uuid NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  in_showcase boolean NOT NULL DEFAULT false,
  showcase_order integer NOT NULL DEFAULT 0,
  earned_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, badge_id)
);

-- Game stats
CREATE TABLE IF NOT EXISTS public.game_stats (
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  game_type text NOT NULL,
  matches integer NOT NULL DEFAULT 0,
  wins integer NOT NULL DEFAULT 0,
  correct_answers integer NOT NULL DEFAULT 0,
  total_score integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, game_type)
);

-- Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Donut packages
CREATE TABLE IF NOT EXISTS public.donut_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  total_diamonds integer NOT NULL DEFAULT 5000,
  remaining_diamonds integer NOT NULL DEFAULT 5000,
  max_openers integer NOT NULL DEFAULT 20,
  opened_count integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.donut_package_openers (
  package_id uuid NOT NULL REFERENCES public.donut_packages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  diamonds_won integer NOT NULL,
  opened_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (package_id, user_id)
);

-- Room chat
CREATE TABLE IF NOT EXISTS public.room_chat (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 400),
  is_bot boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Game questions (for Şarkıyı Bil, Tahmin Et Kim, Yayıncı Kim)
CREATE TABLE IF NOT EXISTS public.game_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_type text NOT NULL,
  category text NOT NULL CHECK (category IN ('turkce', 'yabanci', 'karisik')),
  question text NOT NULL,
  correct_answer text NOT NULL,
  options text[] NOT NULL DEFAULT '{}',
  image_url text,
  audio_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Hangman words
CREATE TABLE IF NOT EXISTS public.hangman_words (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  word text NOT NULL,
  hint text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'genel',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Bil Bakalım boards
CREATE TABLE IF NOT EXISTS public.bil_bakalim_boards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grid text[] NOT NULL,
  words text[] NOT NULL,
  difficulty text NOT NULL DEFAULT 'kolay' CHECK (difficulty IN ('kolay', 'orta', 'zor')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.bots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.private_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donut_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donut_package_openers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_chat ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hangman_words ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bil_bakalim_boards ENABLE ROW LEVEL SECURITY;

-- Bot policies (public read)
DROP POLICY IF EXISTS "bots_select_all" ON public.bots;
CREATE POLICY "bots_select_all" ON public.bots FOR SELECT TO authenticated USING (true);

-- Friends policies
DROP POLICY IF EXISTS "friends_select_own" ON public.friends;
CREATE POLICY "friends_select_own" ON public.friends FOR SELECT TO authenticated USING (user_id = auth.uid() OR friend_id = auth.uid());
DROP POLICY IF EXISTS "friends_insert_own" ON public.friends;
CREATE POLICY "friends_insert_own" ON public.friends FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "friends_delete_own" ON public.friends;
CREATE POLICY "friends_delete_own" ON public.friends FOR DELETE TO authenticated USING (user_id = auth.uid() OR friend_id = auth.uid());

-- Blocks policies
DROP POLICY IF EXISTS "blocks_select_own" ON public.blocks;
CREATE POLICY "blocks_select_own" ON public.blocks FOR SELECT TO authenticated USING (blocker_id = auth.uid());
DROP POLICY IF EXISTS "blocks_insert_own" ON public.blocks;
CREATE POLICY "blocks_insert_own" ON public.blocks FOR INSERT TO authenticated WITH CHECK (blocker_id = auth.uid());
DROP POLICY IF EXISTS "blocks_delete_own" ON public.blocks;
CREATE POLICY "blocks_delete_own" ON public.blocks FOR DELETE TO authenticated USING (blocker_id = auth.uid());

-- Private messages policies
DROP POLICY IF EXISTS "pm_select_participants" ON public.private_messages;
CREATE POLICY "pm_select_participants" ON public.private_messages FOR SELECT TO authenticated USING (sender_id = auth.uid() OR recipient_id = auth.uid());
DROP POLICY IF EXISTS "pm_insert_sender" ON public.private_messages;
CREATE POLICY "pm_insert_sender" ON public.private_messages FOR INSERT TO authenticated WITH CHECK (sender_id = auth.uid());
DROP POLICY IF EXISTS "pm_update_own" ON public.private_messages;
CREATE POLICY "pm_update_own" ON public.private_messages FOR UPDATE TO authenticated USING (recipient_id = auth.uid()) WITH CHECK (recipient_id = auth.uid());

-- Profile likes policies
DROP POLICY IF EXISTS "likes_select_all" ON public.profile_likes;
CREATE POLICY "likes_select_all" ON public.profile_likes FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "likes_insert_own" ON public.profile_likes;
CREATE POLICY "likes_insert_own" ON public.profile_likes FOR INSERT TO authenticated WITH CHECK (liker_id = auth.uid());
DROP POLICY IF EXISTS "likes_delete_own" ON public.profile_likes;
CREATE POLICY "likes_delete_own" ON public.profile_likes FOR DELETE TO authenticated USING (liker_id = auth.uid());

-- Shop items policies (public read)
DROP POLICY IF EXISTS "shop_select_all" ON public.shop_items;
CREATE POLICY "shop_select_all" ON public.shop_items FOR SELECT TO authenticated USING (true);

-- Inventory policies
DROP POLICY IF EXISTS "inventory_select_own" ON public.inventory;
CREATE POLICY "inventory_select_own" ON public.inventory FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "inventory_insert_own" ON public.inventory;
CREATE POLICY "inventory_insert_own" ON public.inventory FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "inventory_update_own" ON public.inventory;
CREATE POLICY "inventory_update_own" ON public.inventory FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "inventory_delete_own" ON public.inventory;
CREATE POLICY "inventory_delete_own" ON public.inventory FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Badges policies (public read)
DROP POLICY IF EXISTS "badges_select_all" ON public.badges;
CREATE POLICY "badges_select_all" ON public.badges FOR SELECT TO authenticated USING (true);

-- User badges policies
DROP POLICY IF EXISTS "user_badges_select_all" ON public.user_badges;
CREATE POLICY "user_badges_select_all" ON public.user_badges FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "user_badges_insert_own" ON public.user_badges;
CREATE POLICY "user_badges_insert_own" ON public.user_badges FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "user_badges_update_own" ON public.user_badges;
CREATE POLICY "user_badges_update_own" ON public.user_badges FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "user_badges_delete_own" ON public.user_badges;
CREATE POLICY "user_badges_delete_own" ON public.user_badges FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Game stats policies
DROP POLICY IF EXISTS "game_stats_select_own" ON public.game_stats;
CREATE POLICY "game_stats_select_own" ON public.game_stats FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "game_stats_insert_own" ON public.game_stats;
CREATE POLICY "game_stats_insert_own" ON public.game_stats FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "game_stats_update_own" ON public.game_stats;
CREATE POLICY "game_stats_update_own" ON public.game_stats FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Notifications policies
DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications;
CREATE POLICY "notifications_select_own" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "notifications_insert_own" ON public.notifications;
CREATE POLICY "notifications_insert_own" ON public.notifications FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;
CREATE POLICY "notifications_update_own" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "notifications_delete_own" ON public.notifications;
CREATE POLICY "notifications_delete_own" ON public.notifications FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Donut packages policies
DROP POLICY IF EXISTS "donut_select_all" ON public.donut_packages;
CREATE POLICY "donut_select_all" ON public.donut_packages FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "donut_insert_own" ON public.donut_packages;
CREATE POLICY "donut_insert_own" ON public.donut_packages FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
DROP POLICY IF EXISTS "donut_update_own" ON public.donut_packages;
CREATE POLICY "donut_update_own" ON public.donut_packages FOR UPDATE TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "donut_openers_select_all" ON public.donut_package_openers;
CREATE POLICY "donut_openers_select_all" ON public.donut_package_openers FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "donut_openers_insert_own" ON public.donut_package_openers;
CREATE POLICY "donut_openers_insert_own" ON public.donut_package_openers FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Room chat policies
DROP POLICY IF EXISTS "room_chat_select_members" ON public.room_chat;
CREATE POLICY "room_chat_select_members" ON public.room_chat FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.room_members rm WHERE rm.room_id = room_chat.room_id AND rm.user_id = auth.uid()));
DROP POLICY IF EXISTS "room_chat_insert_members" ON public.room_chat;
CREATE POLICY "room_chat_insert_members" ON public.room_chat FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.room_members rm WHERE rm.room_id = room_chat.room_id AND rm.user_id = auth.uid()));

-- Game questions policies (public read)
DROP POLICY IF EXISTS "questions_select_all" ON public.game_questions;
CREATE POLICY "questions_select_all" ON public.game_questions FOR SELECT TO authenticated USING (true);

-- Hangman words policies (public read)
DROP POLICY IF EXISTS "hangman_select_all" ON public.hangman_words;
CREATE POLICY "hangman_select_all" ON public.hangman_words FOR SELECT TO authenticated USING (true);

-- Bil Bakalım boards policies (public read)
DROP POLICY IF EXISTS "bil_boards_select_all" ON public.bil_bakalim_boards;
CREATE POLICY "bil_boards_select_all" ON public.bil_bakalim_boards FOR SELECT TO authenticated USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_private_messages_participants ON public.private_messages (sender_id, recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lobby_messages_created ON public.lobby_messages (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_room_chat_room ON public.room_chat (room_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_game_questions_type ON public.game_questions (game_type, category);
