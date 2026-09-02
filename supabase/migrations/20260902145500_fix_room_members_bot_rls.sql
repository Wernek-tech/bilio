-- Fix: Allow room owners to insert bot members into room_members
-- The existing policy only allows user_id = auth.uid(), which blocks bot invites

DROP POLICY IF EXISTS "room_members_insert_authenticated" ON public.room_members;
CREATE POLICY "room_members_insert_authenticated" ON public.room_members FOR INSERT TO authenticated WITH CHECK (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.rooms r
    WHERE r.id = room_members.room_id AND r.owner_id = auth.uid()
  )
);

-- Also allow room owners to update bot members (e.g., ready status)
DROP POLICY IF EXISTS "room_members_update_own" ON public.room_members;
CREATE POLICY "room_members_update_own" ON public.room_members FOR UPDATE TO authenticated USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.rooms r
    WHERE r.id = room_members.room_id AND r.owner_id = auth.uid()
  )
) WITH CHECK (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.rooms r
    WHERE r.id = room_members.room_id AND r.owner_id = auth.uid()
  )
);

-- Allow room owners to delete bot members
DROP POLICY IF EXISTS "room_members_delete_own" ON public.room_members;
CREATE POLICY "room_members_delete_own" ON public.room_members FOR DELETE TO authenticated USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.rooms r
    WHERE r.id = room_members.room_id AND r.owner_id = auth.uid()
  )
);