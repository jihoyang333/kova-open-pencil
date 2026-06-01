-- supabase/migrations/20260401_m5_chat_attachments.sql
-- M5 prerequisite: Chat attachments table + private storage bucket

-- 1. Chat attachments table
CREATE TABLE IF NOT EXISTS public.chat_attachments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_id        UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  conversation_id UUID,  -- set when used in a conversation (FK added after chat_conversations table exists)
  file_name       TEXT NOT NULL,
  file_type       TEXT NOT NULL,
  file_size       INTEGER NOT NULL,
  width           INTEGER,
  height          INTEGER,
  storage_path    TEXT NOT NULL UNIQUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. RLS
ALTER TABLE public.chat_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY chat_attachments_select ON public.chat_attachments FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY chat_attachments_insert ON public.chat_attachments FOR INSERT
  WITH CHECK (user_id = auth.uid());
CREATE POLICY chat_attachments_delete ON public.chat_attachments FOR DELETE
  USING (user_id = auth.uid());

-- 3. Index for cleanup job
CREATE INDEX IF NOT EXISTS idx_chat_attachments_created ON public.chat_attachments(created_at);

-- 4. Private storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-attachments', 'chat-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- 5. Storage policies (user-scoped)
CREATE POLICY chat_attachments_storage_select ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'chat-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY chat_attachments_storage_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'chat-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY chat_attachments_storage_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'chat-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);
