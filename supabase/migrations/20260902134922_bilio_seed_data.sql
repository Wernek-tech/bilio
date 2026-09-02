/*
# Bilio seed data: bots, shop items, badges, hangman words, game questions, bil bakalim boards

1. Seed Data
- 10 permanent bots with unique usernames and avatar colors
- 36 badges with names, descriptions, and unlock levels
- Shop items: frames, titles, gifts, donut package
- 30 hangman words (Turkish)
- 20 game questions for Tahmin Et Kim (turkce/yabanci)
- 20 game questions for Yayıncı Kim (turkce/yabanci)
- 20 game questions for Şarkıyı Bil (turkce/yabanci) - no image_url column
- 3 Bil Bakalım boards (kolay/orta/zor)

2. Security
- No schema changes; data-only migration.
- All inserts are idempotent (ON CONFLICT DO NOTHING).
*/

-- Insert bots
INSERT INTO public.bots (username, avatar_color, gender) VALUES
  ('Milla<3', '#ff6b9d', 'female'),
  ('Hakan', '#c97b5a', 'male'),
  ('Mertbabapro', '#e8945a', 'male'),
  ('MssSelin', '#f5a3c7', 'female'),
  ('Mr.Felaket', '#8a6f5a', 'male'),
  ('MssFelaket', '#d4736e', 'female'),
  ('Masal', '#e8a0c0', 'female'),
  ('Netro', '#7a9a8a', 'male'),
  ('Abady', '#b8956a', 'male'),
  ('SultanSülüman', '#a08070', 'male')
ON CONFLICT (username) DO NOTHING;

-- Insert badges (36 total)
INSERT INTO public.badges (name, description, image_url, unlock_level, unlock_condition) VALUES
  ('İlk Adım', 'Bilio''ya katıldın', 'badge_01', 1, 'Hesap oluştur'),
  ('Çaylak', '3 maç oyna', 'badge_02', 1, '3 maç tamamla'),
  ('Meraklı', '10 maç oyna', 'badge_03', 2, '10 maç tamamla'),
  ('Tecrübeli', '25 maç oyna', 'badge_04', 3, '25 maç tamamla'),
  ('Gazi', '50 maç oyna', 'badge_05', 5, '50 maç tamamla'),
  ('Efsane', '100 maç oyna', 'badge_06', 8, '100 maç tamamla'),
  ('İlk Zafer', 'İlk maçını kazan', 'badge_07', 1, '1 galibiyet'),
  ('Şampiyon', '5 galibiyet al', 'badge_08', 2, '5 galibiyet'),
  ('Kral', '15 galibiyet al', 'badge_09', 4, '15 galibiyet'),
  ('İmparator', '30 galibiyet al', 'badge_10', 6, '30 galibiyet'),
  ('Bilgi Okyanusu', '50 doğru cevap ver', 'badge_11', 2, '50 doğru cevap'),
  ('Ansiklopedi', '150 doğru cevap ver', 'badge_12', 4, '150 doğru cevap'),
  ('Dahi', '300 doğru cevap ver', 'badge_13', 6, '300 doğru cevap'),
  ('Hızlı Parmak', '10 saniye altında doğru cevap ver', 'badge_14', 2, 'Hızlı cevap'),
  ('Işık Hızında', '5 saniye altında doğru cevap ver', 'badge_15', 5, 'Çok hızlı cevap'),
  ('Sosyal Kelebek', '5 arkadaş edin', 'badge_16', 2, '5 arkadaş'),
  ('Popüler', '20 arkadaş edin', 'badge_17', 5, '20 arkadaş'),
  ('Kalp Çalan', '10 profil beğenisi al', 'badge_18', 3, '10 beğeni'),
  ('Yıldız', '50 profil beğenisi al', 'badge_19', 6, '50 beğeni'),
  ('Seviye 5', 'Seviye 5''e ulaş', 'badge_20', 5, 'Seviye 5'),
  ('Seviye 10', 'Seviye 10''a ulaş', 'badge_21', 10, 'Seviye 10'),
  ('Seviye 20', 'Seviye 20''ye ulaş', 'badge_22', 20, 'Seviye 20'),
  ('Seviye 30', 'Seviye 30''a ulaş', 'badge_23', 30, 'Seviye 30'),
  ('Seviye 50', 'Seviye 50''ye ulaş', 'badge_24', 50, 'Seviye 50'),
  ('Donut Avcısı', 'İlk donut paketi satın al', 'badge_25', 3, 'Donut paketi al'),
  ('Cömert', '3 donut paketi paylaş', 'badge_26', 5, '3 paket paylaş'),
  ('Adam Asmaca Ustası', 'Adam Asmaca''da 10 kelime bil', 'badge_27', 3, '10 kelime bil'),
  ('Vampir Avcısı', 'Vampir Köylü''de 5 kez vampir yakala', 'badge_28', 5, '5 vampir yakala'),
  ('Müzik Zekası', 'Şarkıyı Bil''de 20 doğru cevap', 'badge_29', 3, '20 şarkı bil'),
  ('Ünlü Uzmanı', 'Tahmin Et Kim''de 20 doğru cevap', 'badge_30', 3, '20 ünlü bil'),
  ('Yayıncı Tanır', 'Yayıncı Kim''de 20 doğru cevap', 'badge_31', 3, '20 yayıncı bil'),
  ('Kelime Ustası', 'Bil Bakalım''da 30 kelime bul', 'badge_32', 3, '30 kelime bul'),
  ('Çizgi Feneri', 'Çiz ve Bil''de 10 doğru tahmin', 'badge_33', 3, '10 çizim bil'),
  ('Haftalık Lider', 'Haftalık liderlik tablosunda 1. ol', 'badge_34', 5, 'Haftalık 1.'),
  ('Sadık Oyuncu', '7 gün üst üste oyna', 'badge_35', 3, '7 gün seri'),
  ('Bilio Efsanesi', 'Tüm rozetleri kazan', 'badge_36', 50, 'Tüm rozetler')
ON CONFLICT DO NOTHING;

-- Insert shop items
INSERT INTO public.shop_items (name, type, price, currency, image_url, rarity) VALUES
  ('Melek Kanatları', 'frame', 2000, 'gold', 'frame_angel', 'epic'),
  ('Altın Çerçeve', 'frame', 1000, 'gold', 'frame_gold', 'rare'),
  ('Gümüş Çerçeve', 'frame', 500, 'gold', 'frame_silver', 'common'),
  ('Neon Çerçeve', 'frame', 3000, 'gold', 'frame_neon', 'legendary'),
  ('Alev Çerçevesi', 'frame', 2500, 'gold', 'frame_fire', 'epic'),
  ('Buz Çerçevesi', 'frame', 2500, 'gold', 'frame_ice', 'epic'),
  ('Çiçek Çerçevesi', 'frame', 1500, 'gold', 'frame_flower', 'rare'),
  ('Yıldız Çerçevesi', 'frame', 1800, 'gold', 'frame_star', 'rare'),
  ('Uzman', 'title', 800, 'gold', 'title_expert', 'common'),
  ('Efsane', 'title', 5000, 'gold', 'title_legend', 'legendary'),
  ('Şampiyon', 'title', 2000, 'gold', 'title_champion', 'rare'),
  ('Hünerli', 'title', 1200, 'gold', 'title_skilled', 'rare'),
  ('Acemi', 'title', 100, 'gold', 'title_novice', 'common'),
  ('Kahraman', 'title', 3000, 'gold', 'title_hero', 'epic'),
  ('Bilio Sevgisi', 'gift', 100, 'diamonds', 'gift_donut', 'common'),
  ('Donut Paketi', 'gift', 200, 'diamonds', 'gift_package', 'rare'),
  ('Paylaşımlı Donut Paketi', 'donut_package', 5000, 'gold', 'donut_shared', 'epic')
ON CONFLICT DO NOTHING;

-- Insert hangman words (Turkish)
INSERT INTO public.hangman_words (word, hint, category) VALUES
  ('BİLGİSAYAR', 'Elektronik cihaz', 'teknoloji'),
  ('KÜTÜPHANE', 'Kitapların yeri', 'mekan'),
  ('ÇİKOLATA', 'Tatlı bir gıda', 'gıda'),
  ('FUTBOLCU', 'Sporcu', 'spor'),
  ('GÖKYÜZÜ', 'Yukarıdaki alan', 'doğa'),
  ('KAHVALTI', 'Sabah yemeği', 'gıda'),
  ('MÜHENDİSLİK', 'Bir meslek', 'meslek'),
  ('TİYATRO', 'Sahne sanatı', 'sanat'),
  ('VOLKANİK', 'Dağ türü', 'doğa'),
  ('PİYANO', 'Müzik aleti', 'müzik'),
  ('ROKET', 'Uzay aracı', 'teknoloji'),
  ('SİRK', 'Eğlence yeri', 'eğlence'),
  ('BİLGELİK', 'Bilginin sonucu', 'kavram'),
  ('DENİZLİ', 'Şehir', 'şehir'),
  ('TRABZON', 'Şehir', 'şehir'),
  ('KARPUS', 'Yaz meyvesi', 'gıda'),
  ('DONDURMA', 'Tatlı', 'gıda'),
  ('MÜZESİ', 'Eserlerin yeri', 'mekan'),
  ('KÖPRÜ', 'Geçit', 'yapı'),
  ('KALE', 'Tarihi yapı', 'yapı'),
  ('PENGUEN', 'Hayvan', 'hayvan'),
  ('LEOPAR', 'Hayvan', 'hayvan'),
  ('TILSIM', 'Sihirli nesne', 'kavram'),
  ('BÜYÜCÜ', 'Sihirbaz', 'kavram'),
  ('EFSANE', 'Hikaye', 'kavram'),
  ('KAHRAMAN', 'Cesur kişi', 'kavram'),
  ('UÇAK', 'Uçuş aracı', 'teknoloji'),
  ('GEMİ', 'Deniz aracı', 'teknoloji'),
  ('OTOMOBİL', 'Kara aracı', 'teknoloji'),
  ('MOTOR', 'Güç kaynağı', 'teknoloji')
ON CONFLICT DO NOTHING;

-- Insert Tahmin Et Kim questions (turkce)
INSERT INTO public.game_questions (game_type, category, question, correct_answer, options, image_url) VALUES
  ('Tahmin Et Kim', 'turkce', 'Bu Türk pop şarkıcısı kimdir?', 'Tarkan', ARRAY['Tarkan','Mustafa Sandal','Sertab Erener','Sezen Aksu'], 'tarkan'),
  ('Tahmin Et Kim', 'turkce', 'Bu Türk rock sanatçısı kimdir?', 'Şebnem Ferah', ARRAY['Şebnem Ferah','Teoman','Mor ve Ötesi','Duman'], 'sebnem'),
  ('Tahmin Et Kim', 'turkce', 'Bu Türk oyuncu kimdir?', 'Kıvanç Tatlıtuğ', ARRAY['Kıvanç Tatlıtuğ','Burak Özçivit','Kenan İmirzalıoğlu','Murat Yıldırım'], 'kivanc'),
  ('Tahmin Et Kim', 'turkce', 'Bu Türk şarkıcı kimdir?', 'Sertab Erener', ARRAY['Sertab Erener','Sezen Aksu','Ajda Pekkan','Nilüfer'], 'sertab'),
  ('Tahmin Et Kim', 'turkce', 'Bu Türk futbolcu kimdir?', 'Arda Turan', ARRAY['Arda Turan','Hakan Şükür','Rüştü Reçber','Nihat Kahveci'], 'arda'),
  ('Tahmin Et Kim', 'turkce', 'Bu Türk oyuncu kimdir?', 'Beren Saat', ARRAY['Beren Saat','Tuba Büyüküstün','Nurgül Yeşilçay','Bergüzar Korel'], 'beren'),
  ('Tahmin Et Kim', 'turkce', 'Bu Türk komedyen kimdir?', 'Cem Yılmaz', ARRAY['Cem Yılmaz','Tolga Çevik','Yılmaz Erdoğan','Şahan Gökbakar'], 'cem'),
  ('Tahmin Et Kim', 'turkce', 'Bu Türk şarkıcı kimdir?', 'Sezen Aksu', ARRAY['Sezen Aksu','Sertab Erener','Ajda Pekkan','Nilüfer'], 'sezen'),
  ('Tahmin Et Kim', 'turkce', 'Bu Türk oyuncu kimdir?', 'Halit Ergenç', ARRAY['Halit Ergenç','Nurgül Yeşilçay','Bergüzar Korel','Kenan İmirzalıoğlu'], 'halit'),
  ('Tahmin Et Kim', 'turkce', 'Bu Türk yazar kimdir?', 'Orhan Pamuk', ARRAY['Orhan Pamuk','Elif Şafak','Yaşar Kemal','Sabahattin Ali'], 'pamuk')
ON CONFLICT DO NOTHING;

-- Insert Tahmin Et Kim questions (yabanci)
INSERT INTO public.game_questions (game_type, category, question, correct_answer, options, image_url) VALUES
  ('Tahmin Et Kim', 'yabanci', 'Bu Hollywood aktörü kimdir?', 'Leonardo DiCaprio', ARRAY['Leonardo DiCaprio','Brad Pitt','Tom Cruise','Johnny Depp'], 'leo'),
  ('Tahmin Et Kim', 'yabanci', 'Bu şarkıcı kimdir?', 'Adele', ARRAY['Adele','Beyonce','Lady Gaga','Taylor Swift'], 'adele'),
  ('Tahmin Et Kim', 'yabanci', 'Bu aktör kimdir?', 'Brad Pitt', ARRAY['Brad Pitt','Leonardo DiCaprio','George Clooney','Matt Damon'], 'brad'),
  ('Tahmin Et Kim', 'yabanci', 'Bu şarkıcı kimdir?', 'Ed Sheeran', ARRAY['Ed Sheeran','Justin Bieber','Shawn Mendes','Bruno Mars'], 'ed'),
  ('Tahmin Et Kim', 'yabanci', 'Bu aktris kimdir?', 'Scarlett Johansson', ARRAY['Scarlett Johansson','Jennifer Lawrence','Emma Stone','Natalie Portman'], 'scarlett'),
  ('Tahmin Et Kim', 'yabanci', 'Bu futbolcu kimdir?', 'Cristiano Ronaldo', ARRAY['Cristiano Ronaldo','Lionel Messi','Neymar','Kylian Mbappe'], 'cr7'),
  ('Tahmin Et Kim', 'yabanci', 'Bu şarkıcı kimdir?', 'Taylor Swift', ARRAY['Taylor Swift','Ariana Grande','Billie Eilish','Dua Lipa'], 'taylor'),
  ('Tahmin Et Kim', 'yabanci', 'Bu aktör kimdir?', 'Tom Hanks', ARRAY['Tom Hanks','Tom Cruise','Robert De Niro','Al Pacino'], 'hanks'),
  ('Tahmin Et Kim', 'yabanci', 'Bu aktris kimdir?', 'Angelina Jolie', ARRAY['Angelina Jolie','Scarlett Johansson','Megan Fox','Charlize Theron'], 'angelina'),
  ('Tahmin Et Kim', 'yabanci', 'Bu basketbolcu kimdir?', 'LeBron James', ARRAY['LeBron James','Stephen Curry','Kevin Durant','Giannis Antetokounmpo'], 'lebron')
ON CONFLICT DO NOTHING;

-- Insert Yayıncı Kim questions (turkce)
INSERT INTO public.game_questions (game_type, category, question, correct_answer, options, image_url) VALUES
  ('Yayıncı Kim', 'turkce', 'Bu Türk yayıncı kimdir?', 'Elraenn', ARRAY['Elraenn','Wtcn','Jahrein','Pqueen'], 'elraenn'),
  ('Yayıncı Kim', 'turkce', 'Bu Türk yayıncı kimdir?', 'Jahrein', ARRAY['Jahrein','Elraenn','Wtcn','Badrnur'], 'jahrein'),
  ('Yayıncı Kim', 'turkce', 'Bu Türk yayıncı kimdir?', 'Wtcn', ARRAY['Wtcn','Elraenn','Jahrein','Pqueen'], 'wtcn'),
  ('Yayıncı Kim', 'turkce', 'Bu Türk yayıncı kimdir?', 'Pqueen', ARRAY['Pqueen','Elraenn','Wtcn','Badrnur'], 'pqueen'),
  ('Yayıncı Kim', 'turkce', 'Bu Türk yayıncı kimdir?', 'Badrnur', ARRAY['Badrnur','Pqueen','Elraenn','Wtcn'], 'badrnur'),
  ('Yayıncı Kim', 'turkce', 'Bu Türk yayıncı kimdir?', 'Zeon', ARRAY['Zeon','Elraenn','Jahrein','Wtcn'], 'zeon'),
  ('Yayıncı Kim', 'turkce', 'Bu Türk yayıncı kimdir?', 'Köksal', ARRAY['Köksal','Elraenn','Jahrein','Wtcn'], 'koksal'),
  ('Yayıncı Kim', 'turkce', 'Bu Türk yayıncı kimdir?', 'Wendz', ARRAY['Wendz','Pqueen','Badrnur','Elraenn'], 'wendz'),
  ('Yayıncı Kim', 'turkce', 'Bu Türk yayıncı kimdir?', 'Armut', ARRAY['Armut','Elraenn','Jahrein','Wtcn'], 'armut'),
  ('Yayıncı Kim', 'turkce', 'Bu Türk yayıncı kimdir?', 'Rosenkavalier', ARRAY['Rosenkavalier','Elraenn','Jahrein','Wtcn'], 'rosen')
ON CONFLICT DO NOTHING;

-- Insert Yayıncı Kim questions (yabanci)
INSERT INTO public.game_questions (game_type, category, question, correct_answer, options, image_url) VALUES
  ('Yayıncı Kim', 'yabanci', 'Bu dünya yayıncısı kimdir?', 'xQc', ARRAY['xQc','Asmongold','Sodapoppin','Ninja'], 'xqc'),
  ('Yayıncı Kim', 'yabanci', 'Bu yayıncı kimdir?', 'Pokimane', ARRAY['Pokimane','Valkyrae','Loserfruit','Hafu'], 'poki'),
  ('Yayıncı Kim', 'yabanci', 'Bu yayıncı kimdir?', 'Ninja', ARRAY['Ninja','xQc','Asmongold','TimTheTatman'], 'ninja'),
  ('Yayıncı Kim', 'yabanci', 'Bu yayıncı kimdir?', 'Asmongold', ARRAY['Asmongold','xQc','Sodapoppin','Ninja'], 'asmon'),
  ('Yayıncı Kim', 'yabanci', 'Bu yayıncı kimdir?', 'Valkyrae', ARRAY['Valkyrae','Pokimane','Loserfruit','Hafu'], 'valk'),
  ('Yayıncı Kim', 'yabanci', 'Bu yayıncı kimdir?', 'Shroud', ARRAY['Shroud','xQc','Asmongold','Ninja'], 'shroud'),
  ('Yayıncı Kim', 'yabanci', 'Bu yayıncı kimdir?', 'Sodapoppin', ARRAY['Sodapoppin','xQc','Asmongold','Ninja'], 'soda'),
  ('Yayıncı Kim', 'yabanci', 'Bu yayıncı kimdir?', 'TimTheTatman', ARRAY['TimTheTatman','Ninja','xQc','Shroud'], 'tim'),
  ('Yayıncı Kim', 'yabanci', 'Bu yayıncı kimdir?', 'Lirik', ARRAY['Lirik','xQc','Asmongold','Sodapoppin'], 'lirik'),
  ('Yayıncı Kim', 'yabanci', 'Bu yayıncı kimdir?', 'Summit1g', ARRAY['Summit1g','xQc','Asmongold','Ninja'], 'summit')
ON CONFLICT DO NOTHING;

-- Insert Şarkıyı Bil questions (turkce) - no image_url
INSERT INTO public.game_questions (game_type, category, question, correct_answer, options) VALUES
  ('Şarkıyı Bil', 'turkce', 'Bu şarkı kimindir? "Kuzu Kuzu"', 'Tarkan', ARRAY['Tarkan','Mustafa Sandal','Serdar Ortaç','Murat Boz']),
  ('Şarkıyı Bil', 'turkce', 'Bu şarkı kimindir? "Olabilir"', 'Sezen Aksu', ARRAY['Sezen Aksu','Sertab Erener','Ajda Pekkan','Nilüfer']),
  ('Şarkıyı Bil', 'turkce', 'Bu şarkı kimindir? "Şımarık"', 'Tarkan', ARRAY['Tarkan','Mustafa Sandal','Serdar Ortaç','Murat Boz']),
  ('Şarkıyı Bil', 'turkce', 'Bu şarkı kimindir? "Aşk Giderse"', 'Sertab Erener', ARRAY['Sertab Erener','Sezen Aksu','Ajda Pekkan','Nilüfer']),
  ('Şarkıyı Bil', 'turkce', 'Bu şarkı kimindir? "Gülümse"', 'Sertab Erener', ARRAY['Sertab Erener','Sezen Aksu','Ajda Pekkan','Nilüfer']),
  ('Şarkıyı Bil', 'turkce', 'Bu şarkı kimindir? "Ayrılık Zor"', 'Mustafa Sandal', ARRAY['Mustafa Sandal','Tarkan','Serdar Ortaç','Murat Boz']),
  ('Şarkıyı Bil', 'turkce', 'Bu şarkı kimindir? "Yalan"', 'Serdar Ortaç', ARRAY['Serdar Ortaç','Mustafa Sandal','Tarkan','Murat Boz']),
  ('Şarkıyı Bil', 'turkce', 'Bu şarkı kimindir? "Uçun Kuşlar"', 'Sezen Aksu', ARRAY['Sezen Aksu','Sertab Erener','Ajda Pekkan','Nilüfer']),
  ('Şarkıyı Bil', 'turkce', 'Bu şarkı kimindir? "Adımı Kalbine Yaz"', 'Mustafa Sandal', ARRAY['Mustafa Sandal','Tarkan','Serdar Ortaç','Murat Boz']),
  ('Şarkıyı Bil', 'turkce', 'Bu şarkı kimindir? "Hani"', 'Sezen Aksu', ARRAY['Sezen Aksu','Sertab Erener','Ajda Pekkan','Nilüfer'])
ON CONFLICT DO NOTHING;

-- Insert Şarkıyı Bil questions (yabanci) - no image_url
INSERT INTO public.game_questions (game_type, category, question, correct_answer, options) VALUES
  ('Şarkıyı Bil', 'yabanci', 'Bu şarkı kimindir? "Shape of You"', 'Ed Sheeran', ARRAY['Ed Sheeran','Justin Bieber','Shawn Mendes','Bruno Mars']),
  ('Şarkıyı Bil', 'yabanci', 'Bu şarkı kimindir? "Rolling in the Deep"', 'Adele', ARRAY['Adele','Beyonce','Lady Gaga','Taylor Swift']),
  ('Şarkıyı Bil', 'yabanci', 'Bu şarkı kimindir? "Bad Guy"', 'Billie Eilish', ARRAY['Billie Eilish','Ariana Grande','Dua Lipa','Taylor Swift']),
  ('Şarkıyı Bil', 'yabanci', 'Bu şarkı kimindir? "Blinding Lights"', 'The Weeknd', ARRAY['The Weeknd','Bruno Mars','Ed Sheeran','Justin Bieber']),
  ('Şarkıyı Bil', 'yabanci', 'Bu şarkı kimindir? "Levitating"', 'Dua Lipa', ARRAY['Dua Lipa','Ariana Grande','Billie Eilish','Taylor Swift']),
  ('Şarkıyı Bil', 'yabanci', 'Bu şarkı kimindir? "Watermelon Sugar"', 'Harry Styles', ARRAY['Harry Styles','Ed Sheeran','Shawn Mendes','Justin Bieber']),
  ('Şarkıyı Bil', 'yabanci', 'Bu şarkı kimindir? "Drivers License"', 'Olivia Rodrigo', ARRAY['Olivia Rodrigo','Billie Eilish','Ariana Grande','Dua Lipa']),
  ('Şarkıyı Bil', 'yabanci', 'Bu şarkı kimindir? "Stay"', 'Justin Bieber', ARRAY['Justin Bieber','Ed Sheeran','Shawn Mendes','Bruno Mars']),
  ('Şarkıyı Bil', 'yabanci', 'Bu şarkı kimindir? "Hello"', 'Adele', ARRAY['Adele','Beyonce','Lady Gaga','Taylor Swift']),
  ('Şarkıyı Bil', 'yabanci', 'Bu şarkı kimindir? "Anti-Hero"', 'Taylor Swift', ARRAY['Taylor Swift','Ariana Grande','Billie Eilish','Dua Lipa'])
ON CONFLICT DO NOTHING;

-- Insert Bil Bakalım boards
INSERT INTO public.bil_bakalim_boards (grid, words, difficulty) VALUES
  (ARRAY['B','I','L','B','A','K','A','L','I','M','S','E','L','A','M','K','A','L','E','D','I','R','A','B','C'], ARRAY['BIL','BAK','KAL','ALAM','SELAM'], 'kolay'),
  (ARRAY['B','I','L','B','A','K','A','L','I','M','D','O','N','U','T','S','E','V','G','I','O','Y','U','N','B'], ARRAY['BIL','BAKALIM','DONUT','SEVGI','OYUN'], 'orta'),
  (ARRAY['B','I','L','B','A','K','A','L','I','M','D','O','N','U','T','B','I','L','G','I','E','G','L','E','N'], ARRAY['BILBAKALIM','DONUT','BILGI','ELEN','GEL'], 'zor')
ON CONFLICT DO NOTHING;
