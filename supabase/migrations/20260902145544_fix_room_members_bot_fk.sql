-- Fix: room_members.user_id FK references profiles(id), but bot IDs are in bots table
-- Bots have UUID IDs that are NOT in profiles, so inserting bot members fails
-- Solution: Drop the strict FK since bot IDs come from bots table, not profiles

ALTER TABLE public.room_members DROP CONSTRAINT IF EXISTS room_members_user_id_fkey;