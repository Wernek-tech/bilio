/*
# Fix room lobby functions

## Changes
1. Create `invite_bot_to_room` SECURITY DEFINER function that inserts a bot as a room member server-side, bypassing RLS issues.
2. Create `send_room_chat_message` SECURITY DEFINER function that inserts a chat message server-side, bypassing RLS issues.
3. Both functions verify the caller is a member of the room before acting.

## Security
- Both functions use `SECURITY DEFINER` with `SET search_path TO 'public'` for safety.
- `invite_bot_to_room` checks that the caller is the room owner before adding a bot.
- `send_room_chat_message` checks that the caller is a room member before sending.
*/

-- Drop existing versions if any
DROP FUNCTION IF EXISTS public.invite_bot_to_room(uuid, uuid);
DROP FUNCTION IF EXISTS public.send_room_chat_message(uuid, text);

-- Function to invite a bot to a room (owner only)
CREATE OR REPLACE FUNCTION public.invite_bot_to_room(p_room_id uuid, p_bot_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid := auth.uid();
  v_room public.rooms;
  v_bot public.bots;
  v_count integer;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Oturum gerekli'; END IF;

  SELECT * INTO v_room FROM public.rooms WHERE id = p_room_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Oda bulunamadı'; END IF;
  IF v_room.owner_id <> uid THEN RAISE EXCEPTION 'Sadece oda sahibi bot davet edebilir'; END IF;

  SELECT * INTO v_bot FROM public.bots WHERE id = p_bot_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Bot bulunamadı'; END IF;

  SELECT count(*) INTO v_count FROM public.room_members WHERE room_id = p_room_id;
  IF v_count >= v_room.capacity THEN RAISE EXCEPTION 'Oda dolu'; END IF;

  -- Check if bot is already in the room
  IF EXISTS (SELECT 1 FROM public.room_members WHERE room_id = p_room_id AND user_id = p_bot_id) THEN
    RAISE EXCEPTION 'Bu bot zaten odada';
  END IF;

  INSERT INTO public.room_members (room_id, user_id, is_bot, ready)
  VALUES (p_room_id, p_bot_id, true, true);

  RETURN jsonb_build_object('success', true, 'bot_name', v_bot.username);
END;
$function$;

-- Function to send a room chat message (members only)
CREATE OR REPLACE FUNCTION public.send_room_chat_message(p_room_id uuid, p_body text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Oturum gerekli'; END IF;

  -- Verify caller is a member of the room
  IF NOT EXISTS (SELECT 1 FROM public.room_members WHERE room_id = p_room_id AND user_id = uid) THEN
    RAISE EXCEPTION 'Bu odanın üyesi değilsin';
  END IF;

  IF p_body IS NULL OR length(trim(p_body)) = 0 THEN
    RAISE EXCEPTION 'Mesaj boş olamaz';
  END IF;

  INSERT INTO public.room_chat (room_id, sender_id, body, is_bot)
  VALUES (p_room_id, uid, trim(p_body), false);

  RETURN jsonb_build_object('success', true);
END;
$function$;
