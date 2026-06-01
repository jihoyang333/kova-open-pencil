-- Tighten RLS so users can only insert/update brand_memories for brands they own.
-- Original policy enforced user_id = auth.uid() only (USING), which allowed a
-- client to attach memories to another user's brand (their own user_id, any
-- brand_id). Reads stayed safe, but the table could be bloated with rows tied
-- to brands the user doesn't own.
DROP POLICY IF EXISTS "Users can manage own brand memories" ON public.brand_memories;

CREATE POLICY "Users can manage own brand memories"
  ON public.brand_memories FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    AND brand_id IN (SELECT id FROM public.brands WHERE user_id = auth.uid())
  );
