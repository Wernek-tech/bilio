/*
# Create Bilio room securely

## Overview
Adds one server-side function for creating a room and its owner membership atomically.

## Security
- The caller is taken from auth.uid(), never from a client-provided owner ID.
- Only authenticated users may execute the function.
- Capacity and game type are validated on the server.
- The function uses a fixed search path and does not expose database errors to the client.
*/

CREATE OR REPLACE FUNCTION public.create_bilio_room(
  p_game_type text,
  p_code text,
  p_capacity integer,
  p_settings jsonb DEFAULT '{}'::jsonb
)
RETURNS public.rooms
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  created_room public.rooms;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Oturum gerekli';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = uid) THEN
    RAISE EXCEPTION 'Profil bulunamadı';
  END IF;

  IF p_game_type IS NULL OR length(trim(p_game_type)) = 0 OR length(p_game_type) > 80 THEN
    RAISE EXCEPTION 'Geçersiz oyun';
  END IF;

  IF p_code IS NULL OR p_code !~ '^[A-Z0-9]{6}$' THEN
    RAISE EXCEPTION 'Geçersiz oda kodu';
  END IF;

  IF p_capacity IS NULL OR p_capacity < 2 OR p_capacity > 12 THEN
    RAISE EXCEPTION 'Geçersiz kapasite';
  END IF;

  INSERT INTO public.rooms (owner_id, game_type, code, capacity, settings)
  VALUES (uid, trim(p_game_type), p_code, p_capacity, COALESCE(p_settings, '{}'::jsonb))
  RETURNING * INTO created_room;

  INSERT INTO public.room_members (room_id, user_id, ready)
  VALUES (created_room.id, uid, true);

  RETURN created_room;
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'Oda kodu zaten kullanılıyor';
END;
$$;

REVOKE ALL ON FUNCTION public.create_bilio_room(text, text, integer, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_bilio_room(text, text, integer, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_bilio_room(text, text, integer, jsonb) TO authenticated;