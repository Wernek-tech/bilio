/*
# Bil Bakalım Game Schema

## Overview
Creates the database tables and seed data for the Bil Bakalım word search game.

## New Tables
1. `bb_matches` - Stores match state: letter board, placed words, turn management, game status
2. `bb_match_players` - Tracks each player's score, words found, turn order within a match
3. `bb_word_pool` - Word categories and words used for board generation
4. `bb_selection_log` - Deduplication log to prevent duplicate request processing

## Security
- RLS enabled on all tables
- SELECT-only policies for authenticated users (all game mutations go through the edge function with service role key)

## Seed Data
- 5 categories: Hayvanlar, Sanatçılar, Nesneler, Şarkı İsimleri, Yemekler
- 20 words per category
- "Karışık" category pulls from all categories at game time
*/

CREATE TABLE IF NOT EXISTS bb_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid REFERENCES rooms(id) ON DELETE CASCADE,
  board jsonb NOT NULL,
  words jsonb NOT NULL,
  category text NOT NULL DEFAULT 'Karışık',
  grid_size int NOT NULL DEFAULT 15,
  status text NOT NULL DEFAULT 'playing',
  current_turn_index int NOT NULL DEFAULT 0,
  turn_ends_at timestamptz,
  turn_duration int NOT NULL DEFAULT 45,
  total_words int NOT NULL DEFAULT 20,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  winners jsonb
);

CREATE TABLE IF NOT EXISTS bb_match_players (
  match_id uuid REFERENCES bb_matches(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  is_bot boolean NOT NULL DEFAULT false,
  username text NOT NULL,
  avatar_color text NOT NULL DEFAULT '#ff7e57',
  avatar_url text,
  level int NOT NULL DEFAULT 1,
  title text,
  frame text,
  score int NOT NULL DEFAULT 0,
  words_found int NOT NULL DEFAULT 0,
  wrong_attempts int NOT NULL DEFAULT 0,
  turn_order int NOT NULL,
  eliminated boolean NOT NULL DEFAULT false,
  reward_claimed boolean NOT NULL DEFAULT false,
  PRIMARY KEY (match_id, user_id)
);

CREATE TABLE IF NOT EXISTS bb_word_pool (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  word text NOT NULL
);

CREATE TABLE IF NOT EXISTS bb_selection_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid REFERENCES bb_matches(id) ON DELETE CASCADE,
  request_id text NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (match_id, request_id)
);

ALTER TABLE bb_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE bb_match_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE bb_word_pool ENABLE ROW LEVEL SECURITY;
ALTER TABLE bb_selection_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bb_select_matches" ON bb_matches;
CREATE POLICY "bb_select_matches" ON bb_matches FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "bb_select_players" ON bb_match_players;
CREATE POLICY "bb_select_players" ON bb_match_players FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "bb_select_words" ON bb_word_pool;
CREATE POLICY "bb_select_words" ON bb_word_pool FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "bb_select_log" ON bb_selection_log;
CREATE POLICY "bb_select_log" ON bb_selection_log FOR SELECT TO authenticated USING (true);

INSERT INTO bb_word_pool (category, word) VALUES
('Hayvanlar', 'ASLAN'), ('Hayvanlar', 'KAPLAN'), ('Hayvanlar', 'ZÜRAFA'),
('Hayvanlar', 'TAVŞAN'), ('Hayvanlar', 'KARTAL'), ('Hayvanlar', 'PENGUEN'),
('Hayvanlar', 'MAYMUN'), ('Hayvanlar', 'KOALA'), ('Hayvanlar', 'PANDA'),
('Hayvanlar', 'BALIK'), ('Hayvanlar', 'KÖPEK'), ('Hayvanlar', 'KEDİ'),
('Hayvanlar', 'İNEK'), ('Hayvanlar', 'KELEBEK'), ('Hayvanlar', 'KUĞU'),
('Hayvanlar', 'LEOPAR'), ('Hayvanlar', 'KANGURU'), ('Hayvanlar', 'YILAN'),
('Hayvanlar', 'TİLKİ'), ('Hayvanlar', 'AYI'),
('Sanatçılar', 'TARKAN'), ('Sanatçılar', 'SEZEN'), ('Sanatçılar', 'HADİSE'),
('Sanatçılar', 'MABEL'), ('Sanatçılar', 'SERTAB'), ('Sanatçılar', 'MÜSLÜM'),
('Sanatçılar', 'İBRAHİM'), ('Sanatçılar', 'GÜLŞEN'), ('Sanatçılar', 'KENAN'),
('Sanatçılar', 'DEMET'), ('Sanatçılar', 'CEYLAN'), ('Sanatçılar', 'BÜLENT'),
('Sanatçılar', 'FERHAT'), ('Sanatçılar', 'AYLA'), ('Sanatçılar', 'DİLAN'),
('Sanatçılar', 'ŞİVA'), ('Sanatçılar', 'NAZAN'), ('Sanatçılar', 'AŞKIN'),
('Sanatçılar', 'ŞEBNEM'), ('Sanatçılar', 'ALEYNA'),
('Nesneler', 'MASA'), ('Nesneler', 'KALEM'), ('Nesneler', 'BARDAK'),
('Nesneler', 'TELEFON'), ('Nesneler', 'SANDALYE'), ('Nesneler', 'ANAHTAR'),
('Nesneler', 'KİTAP'), ('Nesneler', 'SAAT'), ('Nesneler', 'LAMBA'),
('Nesneler', 'ÇİÇEK'), ('Nesneler', 'VAZO'), ('Nesneler', 'PENCERE'),
('Nesneler', 'KAPI'), ('Nesneler', 'DOLAP'), ('Nesneler', 'AYNA'),
('Nesneler', 'HALI'), ('Nesneler', 'YASTIK'), ('Nesneler', 'ÇAMAŞIR'),
('Nesneler', 'BATTANİYE'), ('Nesneler', 'SİLGİ'),
('Şarkı İsimleri', 'ŞIMARIK'), ('Şarkı İsimleri', 'GÜLÜMSE'), ('Şarkı İsimleri', 'YOLLA'),
('Şarkı İsimleri', 'PRENSES'), ('Şarkı İsimleri', 'CAMBAZ'), ('Şarkı İsimleri', 'KÜÇÜĞÜM'),
('Şarkı İsimleri', 'OLMAZ'), ('Şarkı İsimleri', 'AĞLAMA'), ('Şarkı İsimleri', 'DÜNYAM'),
('Şarkı İsimleri', 'SENSİZ'), ('Şarkı İsimleri', 'YALNIZ'), ('Şarkı İsimleri', 'AŞKIM'),
('Şarkı İsimleri', 'GİTME'), ('Şarkı İsimleri', 'DURMA'), ('Şarkı İsimleri', 'OYNAT'),
('Şarkı İsimleri', 'BENİMLE'), ('Şarkı İsimleri', 'GELBANA'), ('Şarkı İsimleri', 'OLMADIM'),
('Şarkı İsimleri', 'AŞILA'), ('Şarkı İsimleri', 'TUTBENİ'),
('Yemekler', 'MANTI'), ('Yemekler', 'KEBAP'), ('Yemekler', 'BÖREK'),
('Yemekler', 'PİLAV'), ('Yemekler', 'DOLMA'), ('Yemekler', 'KÖFTE'),
('Yemekler', 'PİDE'), ('Yemekler', 'LAHMACUN'), ('Yemekler', 'BAKLAVA'),
('Yemekler', 'SİMİT'), ('Yemekler', 'MENEMEN'), ('Yemekler', 'MERCİMEK'),
('Yemekler', 'DÖNER'), ('Yemekler', 'İSKENDER'), ('Yemekler', 'PASTA'),
('Yemekler', 'ÇÖREK'), ('Yemekler', 'HELVA'), ('Yemekler', 'LOKMA'),
('Yemekler', 'SARMA'), ('Yemekler', 'TATLI')
ON CONFLICT DO NOTHING;