/*
# Fix social features: friend requests, PM notifications, profile likes

1. New Tables
- `friend_requests`: Pending friend requests with accept/reject status
  - `sender_id` (uuid, requester)
  - `receiver_id` (uuid, recipient who must accept/reject)
  - `status` (text: 'pending', 'accepted', 'rejected')
  - `created_at`, `responded_at`

2. Modified Functions
- `add_friend(friend_id)`: Now creates a friend_request instead of directly adding. Sends notification to receiver.
- `respond_friend_request(request_id, accept)`: New function for receiver to accept/reject. On accept, creates bidirectional friendship. On reject, sends notification to sender.
- `send_private_message(recipient_id, body)`: Fixed to properly insert notification.

3. Security
- RLS enabled on friend_requests
- Users can read requests they sent or received
- Only the receiver can update (accept/reject)
- Only authenticated users can insert (sender = auth.uid())
*/

-- Friend requests table
CREATE TABLE IF NOT EXISTS public.friend_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  UNIQUE (sender_id, receiver_id)
);

ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "friend_requests_select_involved" ON public.friend_requests;
CREATE POLICY "friend_requests_select_involved" ON public.friend_requests FOR SELECT
  TO authenticated USING (sender_id = auth.uid() OR receiver_id = auth.uid());

DROP POLICY IF EXISTS "friend_requests_insert_sender" ON public.friend_requests;
CREATE POLICY "friend_requests_insert_sender" ON public.friend_requests FOR INSERT
  TO authenticated WITH CHECK (sender_id = auth.uid());

DROP POLICY IF EXISTS "friend_requests_update_receiver" ON public.friend_requests;
CREATE POLICY "friend_requests_update_receiver" ON public.friend_requests FOR UPDATE
  TO authenticated USING (receiver_id = auth.uid()) WITH CHECK (receiver_id = auth.uid());

DROP POLICY IF EXISTS "friend_requests_delete_involved" ON public.friend_requests;
CREATE POLICY "friend_requests_delete_involved" ON public.friend_requests FOR DELETE
  TO authenticated USING (sender_id = auth.uid() OR receiver_id = auth.uid());

-- Replace add_friend to create a friend request instead
CREATE OR REPLACE FUNCTION public.add_friend(p_friend_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  existing_friend record;
  existing_req record;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Oturum açık değil'; END IF;
  IF uid = p_friend_id THEN RAISE EXCEPTION 'Kendini arkadaş ekleyemezsin'; END IF;

  -- Check if already friends
  SELECT 1 INTO existing_friend FROM public.friends WHERE user_id = uid AND friend_id = p_friend_id;
  IF FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Zaten arkadaşsınız');
  END IF;

  -- Check if blocked
  IF EXISTS (SELECT 1 FROM public.blocks WHERE blocker_id = p_friend_id AND blocked_id = uid) THEN
    RAISE EXCEPTION 'Bu kullanıcı seni engellemiş';
  END IF;

  -- Check if there's already a pending request
  SELECT * INTO existing_req FROM public.friend_requests
    WHERE sender_id = uid AND receiver_id = p_friend_id AND status = 'pending';
  IF FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Zaten bekleyen bir istek var');
  END IF;

  -- Check if there's a pending request from the other direction (auto-accept)
  SELECT * INTO existing_req FROM public.friend_requests
    WHERE sender_id = p_friend_id AND receiver_id = uid AND status = 'pending';
  IF FOUND THEN
    -- Auto-accept since both want to be friends
    UPDATE public.friend_requests SET status = 'accepted', responded_at = now() WHERE id = existing_req.id;
    INSERT INTO public.friends (user_id, friend_id) VALUES (uid, p_friend_id) ON CONFLICT DO NOTHING;
    INSERT INTO public.friends (user_id, friend_id) VALUES (p_friend_id, uid) ON CONFLICT DO NOTHING;
    INSERT INTO public.notifications (user_id, type, title, body)
      VALUES (p_friend_id, 'friend_accept', 'Arkadaşlık isteği kabul edildi', 'Arkadaşlık isteğin kabul edildi!')
      ON CONFLICT DO NOTHING;
    RETURN jsonb_build_object('success', true, 'message', 'Arkadaşlık isteği kabul edildi');
  END IF;

  -- Create new friend request
  INSERT INTO public.friend_requests (sender_id, receiver_id) VALUES (uid, p_friend_id)
    ON CONFLICT (sender_id, receiver_id) DO UPDATE SET status = 'pending', responded_at = NULL;
  -- Notify the receiver
  INSERT INTO public.notifications (user_id, type, title, body)
    VALUES (p_friend_id, 'friend_request', 'Yeni arkadaşlık isteği', 'Sana bir arkadaşlık isteği gönderdi.')
    ON CONFLICT DO NOTHING;

  RETURN jsonb_build_object('success', true, 'message', 'Arkadaşlık isteği gönderildi');
END;
$$;

-- New function to respond to friend requests
CREATE OR REPLACE FUNCTION public.respond_friend_request(p_request_id uuid, p_accept boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  req public.friend_requests;
  sender_name text;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Oturum açık değil'; END IF;
  SELECT * INTO req FROM public.friend_requests WHERE id = p_request_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'İstek bulunamadı'; END IF;
  IF req.receiver_id != uid THEN RAISE EXCEPTION 'Bu isteğe yanıt veremezsin'; END IF;
  IF req.status != 'pending' THEN RAISE EXCEPTION 'Bu istek zaten yanıtlanmış'; END IF;

  IF p_accept THEN
    UPDATE public.friend_requests SET status = 'accepted', responded_at = now() WHERE id = p_request_id;
    INSERT INTO public.friends (user_id, friend_id) VALUES (req.sender_id, req.receiver_id) ON CONFLICT DO NOTHING;
    INSERT INTO public.friends (user_id, friend_id) VALUES (req.receiver_id, req.sender_id) ON CONFLICT DO NOTHING;
    SELECT username INTO sender_name FROM public.profiles WHERE id = req.receiver_id;
    INSERT INTO public.notifications (user_id, type, title, body)
      VALUES (req.sender_id, 'friend_accept', 'Arkadaşlık isteğin kabul edildi', 'Arkadaşlık isteğin kabul edildi!')
      ON CONFLICT DO NOTHING;
    RETURN jsonb_build_object('success', true, 'message', 'Arkadaşlık isteği kabul edildi');
  ELSE
    UPDATE public.friend_requests SET status = 'rejected', responded_at = now() WHERE id = p_request_id;
    INSERT INTO public.notifications (user_id, type, title, body)
      VALUES (req.sender_id, 'friend_reject', 'Arkadaşlık isteği reddedildi', 'Arkadaşlık isteğin reddedildi.')
      ON CONFLICT DO NOTHING;
    RETURN jsonb_build_object('success', true, 'message', 'Arkadaşlık isteği reddedildi');
  END IF;
END;
$$;

-- Fix send_private_message to properly send notifications
CREATE OR REPLACE FUNCTION public.send_private_message(p_recipient_id uuid, p_body text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  msg_id uuid;
  sender_username text;
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
  SELECT username INTO sender_username FROM public.profiles WHERE id = uid;
  INSERT INTO public.notifications (user_id, type, title, body)
  VALUES (p_recipient_id, 'pm', 'Yeni özel mesaj', sender_username || ': ' || left(p_body, 80))
  ON CONFLICT DO NOTHING;
  RETURN jsonb_build_object('success', true, 'message_id', msg_id);
END;
$$;

-- Grant execute on new/updated functions
GRANT EXECUTE ON FUNCTION public.add_friend(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.respond_friend_request(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.send_private_message(uuid, text) TO authenticated;

-- Fix room_chat: drop the sender_id FK to profiles since bots don't have profiles
ALTER TABLE public.room_chat DROP CONSTRAINT IF EXISTS room_chat_sender_id_fkey;

-- Fix private_messages: allow users to insert directly (for the PM window to work without RPC)
DROP POLICY IF EXISTS "pm_insert_sender" ON public.private_messages;
CREATE POLICY "pm_insert_sender" ON public.private_messages FOR INSERT
  TO authenticated WITH CHECK (sender_id = auth.uid());

-- Add index for friend_requests
CREATE INDEX IF NOT EXISTS idx_friend_requests_receiver ON public.friend_requests (receiver_id, status);
CREATE INDEX IF NOT EXISTS idx_friend_requests_sender ON public.friend_requests (sender_id, status);