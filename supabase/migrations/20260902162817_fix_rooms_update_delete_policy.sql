/*
# Fix rooms UPDATE/DELETE policy to use is_room_owner

## Plain-English summary
The `rooms` UPDATE and DELETE policies use `owner_id = auth.uid()` directly, which is fine (no recursion). But we make them consistent with the new `is_room_owner` helper for clarity and safety.

## Security
- No changes to data or schema structure.
- Policies now use the SECURITY DEFINER helper for ownership checks.
*/

DROP POLICY IF EXISTS "rooms_update_own" ON public.rooms;
CREATE POLICY "rooms_update_own" ON public.rooms
FOR UPDATE TO authenticated
USING (public.is_room_owner(id, auth.uid()))
WITH CHECK (public.is_room_owner(id, auth.uid()));

DROP POLICY IF EXISTS "rooms_delete_own" ON public.rooms;
CREATE POLICY "rooms_delete_own" ON public.rooms
FOR DELETE TO authenticated
USING (public.is_room_owner(id, auth.uid()));
