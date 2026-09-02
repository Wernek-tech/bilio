/*
# Fix room lobby membership access

## Plain-English summary
The lobby was showing zero players because its read rule queried `room_members` from inside the `room_members` rule itself. PostgreSQL rejects that recursive security check, so the browser received no member rows. This migration moves the membership check into a protected helper and rewrites the room access rules to use it.

## Changes
1. New function
- `is_room_member(p_room_id, p_user_id)` checks room membership without recursively applying the client-facing policy.

2. Modified policies
- `room_members` SELECT now allows the current member to see everyone in the same room.
- `room_chat` SELECT and INSERT now use the protected membership check.
- `rooms` SELECT now uses the protected membership check.

## Security
- The helper is `SECURITY DEFINER`, has a fixed `search_path`, and derives no authority from client input.
- The helper is callable only by authenticated users.
- No rows, columns, or user data are deleted or changed.
*/

CREATE OR REPLACE FUNCTION public.is_room_member(p_room_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.room_members
    WHERE room_id = p_room_id
      AND user_id = p_user_id
  );
$function$;

REVOKE ALL ON FUNCTION public.is_room_member(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_room_member(uuid, uuid) TO authenticated;

DROP POLICY IF EXISTS "room_members_select_members" ON public.room_members;
CREATE POLICY "room_members_select_members" ON public.room_members
FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR public.is_room_member(room_id, auth.uid())
);

DROP POLICY IF EXISTS "room_chat_select_members" ON public.room_chat;
CREATE POLICY "room_chat_select_members" ON public.room_chat
FOR SELECT TO authenticated
USING (public.is_room_member(room_id, auth.uid()));

DROP POLICY IF EXISTS "room_chat_insert_members" ON public.room_chat;
CREATE POLICY "room_chat_insert_members" ON public.room_chat
FOR INSERT TO authenticated
WITH CHECK (public.is_room_member(room_id, auth.uid()));

DROP POLICY IF EXISTS "rooms_select_members" ON public.rooms;
CREATE POLICY "rooms_select_members" ON public.rooms
FOR SELECT TO authenticated
USING (
  owner_id = auth.uid()
  OR public.is_room_member(id, auth.uid())
);
