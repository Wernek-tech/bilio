-- Fix: room_chat sender_id should allow bot IDs too
-- Currently sender_id references profiles(id), but bots are in bots table
-- Change the foreign key to not require a profiles entry

ALTER TABLE public.room_chat DROP CONSTRAINT IF EXISTS room_chat_sender_id_fkey;
ALTER TABLE public.room_chat ALTER COLUMN sender_id DROP NOT NULL;
-- Keep the FK to profiles but make it optional (SET NULL if profile deleted)
ALTER TABLE public.room_chat ADD CONSTRAINT room_chat_sender_id_fkey 
  FOREIGN KEY (sender_id) REFERENCES public.profiles(id) ON DELETE SET NULL;