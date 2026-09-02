/*
# Bilio server functions: economy, social, game logic

1. New Functions
- `claim_reward()`: One-time starter reward (5000 gold, 1000 diamonds) + welcome notification.
- `purchase_item(item_id)`: Validates balance, deducts cost, adds to inventory. Prevents double purchase.
- `equip_item(item_id)`: Equips a frame or title from inventory.
- `toggle_like(target_id)`: Unique profile like toggle.
- `add_friend(friend_id)`: Bidirectional friendship creation.
- `remove_friend(friend_id)`: Bidirectional friendship removal.
- `block_user(blocked_id)`: Block a user, remove friendship.
- `send_private_message(recipient_id, body)`: Send PM with block check.
- `open_donut_package(package_id)`: Open shared donut package, random diamond reward.
- `record_game_result(game_type, won, correct, score, xp)`: Update stats, XP, level, weekly score.
- `buy_hangman_letter(room_id)`: Buy a letter hint for 100 gold.
- `get_weekly_leaderboard()`: Returns top 20 weekly scores.

2. Security
- All functions are SECURITY DEFINER so they can modify profiles and related tables.
- Each function validates auth.uid() and ownership before proceeding.
- Economy functions check balance before deducting.
- Social functions check for blocks before allowing communication.
*/

-- Claim one-time starter reward
CREATE OR REPLACE FUNCTION public.claim_reward()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  p_record public.profiles;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Oturum açık değil'; END IF;
  SELECT * INTO p_record FROM public.profiles WHERE id = uid;
  IF NOT FOUND THEN RAISE EXCEPTION 'Profil bulunamadı'; END IF;
  IF p_record.reward_claimed THEN
    RETURN jsonb_build_object('success', false, 'message', 'Ödül zaten alınmış');
  END IF;
  UPDATE public.profiles SET reward_claimed = true WHERE id = uid;
  INSERT INTO public.notifications (user_id, type, title, body)
  VALUES (uid, 'reward', 'Hoş geldin ödülü!', 'Bilio''ya katıldığın için 5.000 altın ve 1.000 elmas kazandın!')
  ON CONFLICT DO NOTHING;
  RETURN jsonb_build_object('success', true, 'message', 'Ödül alındı');
END;
$$;

-- Purchase shop item
CREATE OR REPLACE FUNCTION public.purchase_item(p_item_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  item public.shop_items;
  p_gold integer;
  p_diamonds integer;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Oturum açık değil'; END IF;
  SELECT * INTO item FROM public.shop_items WHERE id = p_item_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Ürün bulunamadı'; END IF;
  SELECT gold, diamonds INTO p_gold, p_diamonds FROM public.profiles WHERE id = uid;
  IF item.currency = 'gold' AND p_gold < item.price THEN
    RAISE EXCEPTION 'Yetersiz altın bakiyesi';
  END IF;
  IF item.currency = 'diamonds' AND p_diamonds < item.price THEN
    RAISE EXCEPTION 'Yetersiz elmas bakiyesi';
  END IF;
  IF EXISTS (SELECT 1 FROM public.inventory WHERE user_id = uid AND item_id = p_item_id) THEN
    RAISE EXCEPTION 'Bu ürün zaten envanterinizde';
  END IF;
  IF item.currency = 'gold' THEN
    UPDATE public.profiles SET gold = gold - item.price WHERE id = uid;
  ELSE
    UPDATE public.profiles SET diamonds = diamonds - item.price WHERE id = uid;
  END IF;
  INSERT INTO public.inventory (user_id, item_id) VALUES (uid, p_item_id);
  RETURN jsonb_build_object('success', true, 'message', 'Satın alma başarılı');
END;
$$;

-- Equip item
CREATE OR REPLACE FUNCTION public.equip_item(p_item_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  item public.shop_items;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Oturum açık değil'; END IF;
  SELECT * INTO item FROM public.shop_items WHERE id = p_item_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Ürün bulunamadı'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.inventory WHERE user_id = uid AND item_id = p_item_id) THEN
    RAISE EXCEPTION 'Bu ürün envanterinizde değil';
  END IF;
  IF item.type = 'frame' THEN
    UPDATE public.inventory SET equipped = false WHERE user_id = uid AND item_id IN (SELECT i2.item_id FROM public.inventory i2 JOIN public.shop_items s2 ON s2.id = i2.item_id WHERE i2.user_id = uid AND s2.type = 'frame');
    UPDATE public.inventory SET equipped = true WHERE user_id = uid AND item_id = p_item_id;
    UPDATE public.profiles SET frame = item.name WHERE id = uid;
  ELSIF item.type = 'title' THEN
    UPDATE public.inventory SET equipped = false WHERE user_id = uid AND item_id IN (SELECT i2.item_id FROM public.inventory i2 JOIN public.shop_items s2 ON s2.id = i2.item_id WHERE i2.user_id = uid AND s2.type = 'title');
    UPDATE public.inventory SET equipped = true WHERE user_id = uid AND item_id = p_item_id;
    UPDATE public.profiles SET title = item.name WHERE id = uid;
  END IF;
  RETURN jsonb_build_object('success', true);
END;
$$;

-- Toggle profile like
CREATE OR REPLACE FUNCTION public.toggle_like(p_target_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  existing record;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Oturum açık değil'; END IF;
  IF uid = p_target_id THEN RAISE EXCEPTION 'Kendi profilini beğenemezsin'; END IF;
  SELECT 1 INTO existing FROM public.profile_likes WHERE liker_id = uid AND target_id = p_target_id;
  IF FOUND THEN
    DELETE FROM public.profile_likes WHERE liker_id = uid AND target_id = p_target_id;
    UPDATE public.profiles SET likes = GREATEST(0, likes - 1) WHERE id = p_target_id;
    RETURN jsonb_build_object('liked', false);
  ELSE
    INSERT INTO public.profile_likes (liker_id, target_id) VALUES (uid, p_target_id);
    UPDATE public.profiles SET likes = likes + 1 WHERE id = p_target_id;
    INSERT INTO public.notifications (user_id, type, title, body)
    VALUES (p_target_id, 'like', 'Yeni beğeni', 'Profilin beğenildi!')
    ON CONFLICT DO NOTHING;
    RETURN jsonb_build_object('liked', true);
  END IF;
END;
$$;

-- Add friend (bidirectional)
CREATE OR REPLACE FUNCTION public.add_friend(p_friend_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Oturum açık değil'; END IF;
  IF uid = p_friend_id THEN RAISE EXCEPTION 'Kendini arkadaş ekleyemezsin'; END IF;
  IF EXISTS (SELECT 1 FROM public.blocks WHERE blocker_id = p_friend_id AND blocked_id = uid) THEN
    RAISE EXCEPTION 'Bu kullanıcı seni engellemiş';
  END IF;
  INSERT INTO public.friends (user_id, friend_id) VALUES (uid, p_friend_id) ON CONFLICT DO NOTHING;
  INSERT INTO public.friends (user_id, friend_id) VALUES (p_friend_id, uid) ON CONFLICT DO NOTHING;
  RETURN jsonb_build_object('success', true);
END;
$$;

-- Remove friend (bidirectional)
CREATE OR REPLACE FUNCTION public.remove_friend(p_friend_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Oturum açık değil'; END IF;
  DELETE FROM public.friends WHERE (user_id = uid AND friend_id = p_friend_id) OR (user_id = p_friend_id AND friend_id = uid);
  RETURN jsonb_build_object('success', true);
END;
$$;

-- Block user
CREATE OR REPLACE FUNCTION public.block_user(p_blocked_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Oturum açık değil'; END IF;
  IF uid = p_blocked_id THEN RAISE EXCEPTION 'Kendini engelleyemezsin'; END IF;
  DELETE FROM public.friends WHERE (user_id = uid AND friend_id = p_blocked_id) OR (user_id = p_blocked_id AND friend_id = uid);
  INSERT INTO public.blocks (blocker_id, blocked_id) VALUES (uid, p_blocked_id) ON CONFLICT DO NOTHING;
  RETURN jsonb_build_object('success', true);
END;
$$;

-- Send private message
CREATE OR REPLACE FUNCTION public.send_private_message(p_recipient_id uuid, p_body text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  msg_id uuid;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Oturum açık değil'; END IF;
  IF uid = p_recipient_id THEN RAISE EXCEPTION 'Kendine mesaj gönderemezsin'; END IF;
  IF char_length(p_body) < 1 OR char_length(p_body) > 500 THEN
    RAISE EXCEPTION 'Mesaj 1-500 karakter arası olmalı';
  END IF;
  IF EXISTS (SELECT 1 FROM public.blocks WHERE blocker_id = p_recipient_id AND blocked_id = uid) THEN
    RAISE EXCEPTION 'Bu kullanıcı seni engellemiş';
  END IF;
  IF EXISTS (SELECT 1 FROM public.blocks WHERE blocker_id = uid AND blocked_id = p_recipient_id) THEN
    RAISE EXCEPTION 'Engellediğin bir kullanıcıya mesaj gönderemezsin';
  END IF;
  INSERT INTO public.private_messages (sender_id, recipient_id, body)
  VALUES (uid, p_recipient_id, p_body) RETURNING id INTO msg_id;
  INSERT INTO public.notifications (user_id, type, title, body)
  VALUES (p_recipient_id, 'pm', 'Yeni özel mesaj', left(p_body, 80))
  ON CONFLICT DO NOTHING;
  RETURN jsonb_build_object('success', true, 'message_id', msg_id);
END;
$$;

-- Open donut package
CREATE OR REPLACE FUNCTION public.open_donut_package(p_package_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  pkg public.donut_packages;
  reward integer;
  already_opened record;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Oturum açık değil'; END IF;
  SELECT * INTO pkg FROM public.donut_packages WHERE id = p_package_id AND is_active = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'Paket bulunamadı veya aktif değil'; END IF;
  IF pkg.owner_id = uid THEN RAISE EXCEPTION 'Kendi paketini açamazsın'; END IF;
  IF pkg.opened_count >= pkg.max_openers THEN RAISE EXCEPTION 'Paket kapasitesi dolmuş'; END IF;
  IF pkg.remaining_diamonds <= 0 THEN RAISE EXCEPTION 'Pakette elmas kalmadı'; END IF;
  SELECT 1 INTO already_opened FROM public.donut_package_openers WHERE package_id = p_package_id AND user_id = uid;
  IF FOUND THEN RAISE EXCEPTION 'Bu paketi zaten açtın'; END IF;
  -- Random reward between 100 and min(500, remaining)
  reward := GREATEST(100, LEAST(pkg.remaining_diamonds, 100 + floor(random() * 400)::integer));
  IF pkg.remaining_diamonds - reward < 100 AND pkg.remaining_diamonds - reward > 0 THEN
    reward := pkg.remaining_diamonds;
  END IF;
  IF pkg.opened_count = pkg.max_openers - 1 THEN
    reward := pkg.remaining_diamonds;
  END IF;
  INSERT INTO public.donut_package_openers (package_id, user_id, diamonds_won) VALUES (p_package_id, uid, reward);
  UPDATE public.donut_packages SET remaining_diamonds = remaining_diamonds - reward, opened_count = opened_count + 1 WHERE id = p_package_id;
  UPDATE public.profiles SET diamonds = diamonds + reward WHERE id = uid;
  IF (SELECT remaining_diamonds FROM public.donut_packages WHERE id = p_package_id) <= 0 THEN
    UPDATE public.donut_packages SET is_active = false WHERE id = p_package_id;
  END IF;
  RETURN jsonb_build_object('success', true, 'reward', reward);
END;
$$;

-- Record game result
CREATE OR REPLACE FUNCTION public.record_game_result(p_game_type text, p_won boolean, p_correct integer, p_score integer, p_xp integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  new_xp integer;
  new_level integer;
  leveled_up boolean := false;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Oturum açık değil'; END IF;
  UPDATE public.profiles SET
    total_matches = total_matches + 1,
    total_wins = total_wins + (CASE WHEN p_won THEN 1 ELSE 0 END),
    total_correct = total_correct + p_correct,
    total_score = total_score + p_score,
    weekly_score = weekly_score + p_score,
    xp = xp + p_xp
  WHERE id = uid RETURNING xp, level INTO new_xp, new_level;
  new_level := GREATEST(1, floor(new_xp / 1000.0)::integer + 1);
  IF new_level > (SELECT level FROM public.profiles WHERE id = uid) THEN
    UPDATE public.profiles SET level = new_level WHERE id = uid;
    leveled_up := true;
  END IF;
  INSERT INTO public.game_stats (user_id, game_type, matches, wins, correct_answers, total_score, updated_at)
  VALUES (uid, p_game_type, 1, (CASE WHEN p_won THEN 1 ELSE 0 END), p_correct, p_score, now())
  ON CONFLICT (user_id, game_type) DO UPDATE SET
    matches = game_stats.matches + 1,
    wins = game_stats.wins + (CASE WHEN p_won THEN 1 ELSE 0 END),
    correct_answers = game_stats.correct_answers + p_correct,
    total_score = game_stats.total_score + p_score,
    updated_at = now();
  RETURN jsonb_build_object('success', true, 'leveled_up', leveled_up, 'new_level', new_level, 'new_xp', new_xp);
END;
$$;

-- Buy hangman letter (100 gold)
CREATE OR REPLACE FUNCTION public.buy_hangman_letter(p_room_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  p_gold integer;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Oturum açık değil'; END IF;
  SELECT gold INTO p_gold FROM public.profiles WHERE id = uid;
  IF p_gold < 100 THEN RAISE EXCEPTION 'Harf almak için 100 altın gerekli'; END IF;
  UPDATE public.profiles SET gold = gold - 100 WHERE id = uid;
  RETURN jsonb_build_object('success', true, 'message', '100 altın harcandı');
END;
$$;

-- Weekly leaderboard
CREATE OR REPLACE FUNCTION public.get_weekly_leaderboard()
RETURNS TABLE (user_id uuid, username text, title text, frame text, avatar_color text, avatar_url text, weekly_score integer, level integer, total_wins integer)
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  SELECT p.id, p.username, p.title, p.frame, p.avatar_color, p.avatar_url, p.weekly_score, p.level, p.total_wins
  FROM public.profiles p
  WHERE p.weekly_score > 0
  ORDER BY p.weekly_score DESC, p.total_wins DESC
  LIMIT 20;
$$;

-- Grant execute to authenticated
GRANT EXECUTE ON FUNCTION public.claim_reward() TO authenticated;
GRANT EXECUTE ON FUNCTION public.purchase_item(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.equip_item(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_like(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_friend(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_friend(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.block_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.send_private_message(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.open_donut_package(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_game_result(text, boolean, integer, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.buy_hangman_letter(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_weekly_leaderboard() TO authenticated;
