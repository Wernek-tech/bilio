/*
# Fix remaining room_members policy recursion

## Plain-English summary
The INSERT, UPDATE, and DELETE policies on `room_members` still reference the `rooms` table directly via EXISTS subqueries. Although the `rooms` SELECT policy now uses the `is_room_member` SECURITY DEFINER helper (which bypasses RLS), we add an `is_room_owner` helper and rewrite all `room_members` policies to use helper functions instead of direct table references. This eliminates any remaining recursion risk.

## Changes
1. New function `is_room_owner(p_room_id, p_user_id)` — checks room ownership without triggering RLS.
2. Rewritten `room_members` INSERT, UPDATE, DELETE policies to use `is_room_owner` instead of `EXISTS (SELECT 1 FROM rooms ...)`.

## Security
- `is_room_owner` is `SECURITY DEFINER`, has a fixed `search_path`, and is callable only by authenticated users.
- No rows, columns, or user data are deleted or changed.
*/

CREATE OR REPLACE FUNCTION public.is_room_owner(p_room_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.rooms
    WHERE id = p_room_id AND owner_id = p_user_id
  );
$function$;

REVOKE ALL ON FUNCTION public.is_room_owner(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_room_owner(uuid, uuid) TO authenticated;

DROP POLICY IF EXISTS "room_members_insert_authenticated" ON public.room_members;
CREATE POLICY "room_members_insert_authenticated" ON public.room_members
FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  OR public.is_room_owner(room_id, auth.uid())
);

DROP POLICY IF EXISTS "room_members_update_own" ON public.room_members;
CREATE POLICY "room_members_update_own" ON public.room_members
FOR UPDATE TO authenticated
USING (
  user_id = auth.uid()
  OR public.is_room_owner(room_id, auth.uid())
)
WITH CHECK (
  user_id = auth.uid()
  OR public.is_room_owner(room_id, auth.uid())
);

DROP POLICY IF EXISTS "room_members_delete_own" ON public.room_members;
CREATE POLICY "room_members_delete_own" ON public.room_members
FOR DELETE TO authenticated
USING (
  user_id = auth.uid()
  OR public.is_room_owner(room_id, auth.uid())
);
