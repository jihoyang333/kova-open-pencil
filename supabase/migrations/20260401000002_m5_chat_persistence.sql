-- M5: Chat persistence — conversations + messages

-- 1. Conversations table (one row per chat tab)
CREATE TABLE IF NOT EXISTS public.chat_conversations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_id   UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  canvas_id  UUID NOT NULL REFERENCES public.canvases(id) ON DELETE CASCADE,
  title      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY chat_conversations_select ON public.chat_conversations FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY chat_conversations_insert ON public.chat_conversations FOR INSERT
  WITH CHECK (user_id = auth.uid());
CREATE POLICY chat_conversations_update ON public.chat_conversations FOR UPDATE
  USING (user_id = auth.uid());
CREATE POLICY chat_conversations_delete ON public.chat_conversations FOR DELETE
  USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_chat_conversations_canvas
  ON public.chat_conversations(user_id, brand_id, canvas_id);

CREATE TRIGGER set_chat_conversations_updated_at
  BEFORE UPDATE ON public.chat_conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 2. Messages table
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role            TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content         TEXT NOT NULL,
  attachments     JSONB NOT NULL DEFAULT '[]',
  tool_calls      JSONB NOT NULL DEFAULT '[]',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY chat_messages_select ON public.chat_messages FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY chat_messages_insert ON public.chat_messages FOR INSERT
  WITH CHECK (user_id = auth.uid());
CREATE POLICY chat_messages_update ON public.chat_messages FOR UPDATE
  USING (user_id = auth.uid());
CREATE POLICY chat_messages_delete ON public.chat_messages FOR DELETE
  USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation
  ON public.chat_messages(conversation_id, created_at);

-- 3. Add conversation_id FK to chat_attachments (created in earlier migration)
ALTER TABLE public.chat_attachments
  ADD CONSTRAINT fk_chat_attachments_conversation
  FOREIGN KEY (conversation_id) REFERENCES public.chat_conversations(id) ON DELETE CASCADE;
