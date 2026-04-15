CREATE TABLE public.brand_memories (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id   UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content    TEXT NOT NULL,
  source     TEXT NOT NULL CHECK (source IN ('auto', 'user')),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.brand_memories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own brand memories"
  ON public.brand_memories FOR ALL
  USING (user_id = auth.uid());

CREATE INDEX idx_brand_memories_brand
  ON public.brand_memories (brand_id, user_id);
