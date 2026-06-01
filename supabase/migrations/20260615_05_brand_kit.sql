-- ============================================================
-- Migration 20260615_05_brand_kit.sql
-- Cluster 05 Brand Kit & Drag-Drop — schema for 7 Brand Kit sub-tabs + brand fonts + KB sources
-- Pairs with: 20260317_m2_dashboard.sql (creates public.brands)
-- Source of truth: docs/kova-final-prds/05-brand-kit-and-drag-drop.md §4.1 + §4.2 (verbatim)
-- ============================================================

BEGIN;

-- ---- 1. JSONB columns on brands (per Q8 + Q24 + hi-fi A7.3.x) ----

ALTER TABLE public.brands
  ADD COLUMN IF NOT EXISTS tone_snippets   jsonb NOT NULL DEFAULT '[]'::jsonb,  -- [{id, label, category, content, order}]
  ADD COLUMN IF NOT EXISTS saved_blocks    jsonb NOT NULL DEFAULT '[]'::jsonb,  -- [{id, label, category, content, type, order}]
  ADD COLUMN IF NOT EXISTS writing_rules   jsonb NOT NULL DEFAULT '{}'::jsonb,  -- { no_exclamation: bool, no_em_dash: bool, sentence_case_headlines: bool, no_superlatives: bool, active_voice_only: bool, ...custom }
  ADD COLUMN IF NOT EXISTS identity        jsonb NOT NULL DEFAULT '{}'::jsonb;  -- { about: { content, last_edited_at, last_edited_by, word_count }, voice: {...}, story: {...} }

COMMENT ON COLUMN public.brands.tone_snippets IS
  'Ordered list of brand-voice exemplars per Q8. Each element: {id uuid, label text, category text, content text, order int}. AI prompt-builder reads these (Cluster 10).';
COMMENT ON COLUMN public.brands.saved_blocks IS
  'Ordered list of reusable copy snippets per Q8. Each element: {id uuid, label text, category text, content text, type text in (''text'',''cta'',''footer''), order int}. Drag-drop into canvas spawns TEXT node (Cluster 06 receiver).';
COMMENT ON COLUMN public.brands.writing_rules IS
  'Binary toggles AI must respect per hi-fi A7.3.5 (founder 2026-04-25: sliders dropped, binary only). Keys + booleans. AI prompt-builder enforces (Cluster 10).';
COMMENT ON COLUMN public.brands.identity IS
  'Three narrative cards per hi-fi A7.3.2: about, voice, story. Each: {content text, last_edited_at timestamptz, last_edited_by uuid, word_count int}. AI prompt-builder reads voice (Cluster 10).';

-- Existing brands.voice (TEXT) is RETAINED for backwards compatibility with M9 brand-kit-extract.
-- Decision: voice scraped from Shopify continues to write to brands.voice (single-line summary), while
-- the new richer Identity card writes to brands.identity.voice.content. Cluster 10 prompt-builder
-- prefers brands.identity.voice.content when populated, falls back to brands.voice.
-- See §12.1.

-- ---- 2. brand_fonts table (NEW per Q6 — brand_assets verified MISSING) ----

CREATE TABLE IF NOT EXISTS public.brand_fonts (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id          uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  family_name       text NOT NULL,
  file_path         text NOT NULL,                                  -- Storage path: brand-fonts/{brand_id}/{font_id}.{ext}
  file_size_bytes   bigint NOT NULL CHECK (file_size_bytes > 0 AND file_size_bytes <= 5242880),   -- 5 MB cap per founder ratification 2026-05-17 (covers variable fonts up to 5 MB; rejects bloated display fonts)
  mime_type         text NOT NULL CHECK (mime_type IN ('font/woff2', 'font/ttf', 'font/otf')),
  license_attested  boolean NOT NULL DEFAULT false,
  uploaded_at       timestamptz NOT NULL DEFAULT now(),
  uploaded_by       uuid NOT NULL REFERENCES public.users(id),
  CHECK (license_attested = true)  -- License attestation REQUIRED at insert time
);

CREATE INDEX IF NOT EXISTS idx_brand_fonts_brand ON public.brand_fonts(brand_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_brand_fonts_unique_family ON public.brand_fonts(brand_id, family_name);

COMMENT ON TABLE public.brand_fonts IS
  'Per-brand uploaded font files. Distinct lifecycle from public.media (Q6): CanvasKit registration + AI prompt awareness + license attestation. Max 5 MB per file (founder ratification 2026-05-17).';
COMMENT ON COLUMN public.brand_fonts.license_attested IS
  'User MUST attest commercial-use rights at upload time. CHECK constraint enforces true at INSERT.';

-- ---- 3. brand_kb_sources table (NEW — knowledge-base file uploads) ----

CREATE TABLE IF NOT EXISTS public.brand_kb_sources (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id        uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  file_name       text NOT NULL,
  file_path       text NOT NULL,                                  -- Storage path: brand-kb-sources/{brand_id}/{source_id}.{ext}
  file_size_bytes bigint NOT NULL CHECK (file_size_bytes > 0 AND file_size_bytes <= 10485760),  -- 10 MB cap (PDFs run larger than fonts)
  mime_type       text NOT NULL CHECK (mime_type IN ('application/pdf', 'text/plain', 'text/markdown')),
  uploaded_at     timestamptz NOT NULL DEFAULT now(),
  uploaded_by     uuid NOT NULL REFERENCES public.users(id),
  extracted_text  text                                            -- Populated by post-upload extraction worker (deferred — null at MVP)
);

CREATE INDEX IF NOT EXISTS idx_brand_kb_sources_brand ON public.brand_kb_sources(brand_id);

COMMENT ON TABLE public.brand_kb_sources IS
  'Per-brand knowledge-base file uploads (PDF/MD/TXT). Cluster 10 prompt-builder reads extracted_text when populated. Extraction worker is post-MVP — files store as-is for now.';

-- ---- 4. voice_drafts table (NEW — confirm-before-write guardrail per 00e §6 #5) ----

CREATE TABLE IF NOT EXISTS public.voice_drafts (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id            uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  user_id             uuid NOT NULL REFERENCES public.users(id),
  source              text NOT NULL CHECK (source IN ('shopify_extract')),  -- extensible: 'manual_rerun', future sources
  draft_payload       jsonb NOT NULL,                              -- { voice: {content}, tone_snippets: [{label, category, content}] }
  created_at          timestamptz NOT NULL DEFAULT now(),
  confirmed_at        timestamptz,
  discarded_at        timestamptz,
  CHECK (confirmed_at IS NULL OR discarded_at IS NULL)
);

CREATE INDEX IF NOT EXISTS idx_voice_drafts_brand_unconfirmed
  ON public.voice_drafts(brand_id) WHERE confirmed_at IS NULL AND discarded_at IS NULL;

COMMENT ON TABLE public.voice_drafts IS
  'GUARDRAIL per 00e §6 #5: AI-scraped brand voice + tone snippets are persisted here first as a draft, then user reviews + confirms in the Brand Kit UI before they write to brands.{identity, tone_snippets}. NEVER a silent write.';

-- ---- 5. RPCs (SECURITY DEFINER, owner = postgres, search_path locked) ----

-- Tone snippet CRUD
CREATE OR REPLACE FUNCTION public.add_tone_snippet(
  p_brand_id uuid, p_label text, p_category text, p_content text
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  v_id uuid := gen_random_uuid();
  v_current jsonb;
  v_next_order int;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '28000'; END IF;

  -- Brand-ownership check
  IF NOT EXISTS (SELECT 1 FROM public.brands WHERE id = p_brand_id AND user_id = auth.uid()) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  -- Cap: 50 tone snippets per brand (§2.1 recommendation)
  IF (SELECT jsonb_array_length(tone_snippets) FROM public.brands WHERE id = p_brand_id) >= 50 THEN
    RAISE EXCEPTION 'cap_exceeded' USING ERRCODE = 'P0001';
  END IF;

  SELECT tone_snippets INTO v_current FROM public.brands WHERE id = p_brand_id;
  v_next_order := COALESCE((SELECT MAX((s->>'order')::int) + 1 FROM jsonb_array_elements(v_current) s), 0);

  UPDATE public.brands
     SET tone_snippets = v_current || jsonb_build_array(jsonb_build_object(
           'id', v_id, 'label', p_label, 'category', p_category, 'content', p_content, 'order', v_next_order
         ))
   WHERE id = p_brand_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_tone_snippet(
  p_brand_id uuid, p_snippet_id uuid, p_label text, p_category text, p_content text
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  v_current jsonb;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '28000'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.brands WHERE id = p_brand_id AND user_id = auth.uid()) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT tone_snippets INTO v_current FROM public.brands WHERE id = p_brand_id;

  UPDATE public.brands
     SET tone_snippets = COALESCE((
           SELECT jsonb_agg(
             CASE WHEN (s->>'id')::uuid = p_snippet_id
                  THEN jsonb_set(jsonb_set(jsonb_set(s, '{label}', to_jsonb(p_label)),
                                            '{category}', to_jsonb(p_category)),
                                  '{content}', to_jsonb(p_content))
                  ELSE s END
           )
           FROM jsonb_array_elements(v_current) s
         ), '[]'::jsonb)
   WHERE id = p_brand_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_tone_snippet(p_brand_id uuid, p_snippet_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '28000'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.brands WHERE id = p_brand_id AND user_id = auth.uid()) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  UPDATE public.brands
     SET tone_snippets = COALESCE((
           SELECT jsonb_agg(s) FROM jsonb_array_elements(tone_snippets) s
           WHERE (s->>'id')::uuid != p_snippet_id
         ), '[]'::jsonb)
   WHERE id = p_brand_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.reorder_tone_snippets(p_brand_id uuid, p_ordered_ids uuid[])
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  v_current jsonb;
  v_new jsonb := '[]'::jsonb;
  v_id uuid;
  v_idx int := 0;
  v_elem jsonb;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '28000'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.brands WHERE id = p_brand_id AND user_id = auth.uid()) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT tone_snippets INTO v_current FROM public.brands WHERE id = p_brand_id FOR UPDATE;

  -- p_ordered_ids must be a full permutation of existing ids — otherwise a
  -- partial list would silently drop items (db-review C-3).
  IF COALESCE(array_length(p_ordered_ids, 1), 0) <> jsonb_array_length(v_current) THEN
    RAISE EXCEPTION 'invalid_reorder' USING ERRCODE = '22023';
  END IF;

  FOREACH v_id IN ARRAY p_ordered_ids LOOP
    -- Unknown id → no row → guard against jsonb || NULL nuking the array (db-review C-4).
    SELECT jsonb_set(s, '{order}', to_jsonb(v_idx)) INTO v_elem
    FROM jsonb_array_elements(v_current) s
    WHERE (s->>'id')::uuid = v_id;
    IF v_elem IS NULL THEN
      RAISE EXCEPTION 'invalid_reorder' USING ERRCODE = '22023';
    END IF;
    v_new := v_new || v_elem;
    v_idx := v_idx + 1;
  END LOOP;

  UPDATE public.brands SET tone_snippets = v_new WHERE id = p_brand_id;
END;
$$;

-- Saved blocks CRUD — same shape as tone snippets, swap field name + cap 100
CREATE OR REPLACE FUNCTION public.add_saved_block(
  p_brand_id uuid, p_label text, p_category text, p_content text, p_type text
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  v_id uuid := gen_random_uuid();
  v_current jsonb;
  v_next_order int;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '28000'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.brands WHERE id = p_brand_id AND user_id = auth.uid()) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  IF p_type NOT IN ('text','cta','footer') THEN
    RAISE EXCEPTION 'invalid_type' USING ERRCODE = '22023';
  END IF;
  IF (SELECT jsonb_array_length(saved_blocks) FROM public.brands WHERE id = p_brand_id) >= 100 THEN
    RAISE EXCEPTION 'cap_exceeded' USING ERRCODE = 'P0001';
  END IF;

  SELECT saved_blocks INTO v_current FROM public.brands WHERE id = p_brand_id;
  v_next_order := COALESCE((SELECT MAX((s->>'order')::int) + 1 FROM jsonb_array_elements(v_current) s), 0);

  UPDATE public.brands
     SET saved_blocks = v_current || jsonb_build_array(jsonb_build_object(
           'id', v_id, 'label', p_label, 'category', p_category,
           'content', p_content, 'type', p_type, 'order', v_next_order
         ))
   WHERE id = p_brand_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_saved_block(
  p_brand_id uuid, p_block_id uuid, p_label text, p_category text, p_content text, p_type text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '28000'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.brands WHERE id = p_brand_id AND user_id = auth.uid()) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  IF p_type NOT IN ('text','cta','footer') THEN
    RAISE EXCEPTION 'invalid_type' USING ERRCODE = '22023';
  END IF;

  UPDATE public.brands
     SET saved_blocks = COALESCE((
           SELECT jsonb_agg(
             CASE WHEN (s->>'id')::uuid = p_block_id
                  THEN jsonb_set(jsonb_set(jsonb_set(jsonb_set(s,
                         '{label}',    to_jsonb(p_label)),
                         '{category}', to_jsonb(p_category)),
                         '{content}',  to_jsonb(p_content)),
                         '{type}',     to_jsonb(p_type))
                  ELSE s END
           ) FROM jsonb_array_elements(saved_blocks) s
         ), '[]'::jsonb)
   WHERE id = p_brand_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_saved_block(p_brand_id uuid, p_block_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '28000'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.brands WHERE id = p_brand_id AND user_id = auth.uid()) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  UPDATE public.brands
     SET saved_blocks = COALESCE((
           SELECT jsonb_agg(s) FROM jsonb_array_elements(saved_blocks) s
           WHERE (s->>'id')::uuid != p_block_id
         ), '[]'::jsonb)
   WHERE id = p_brand_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.reorder_saved_blocks(p_brand_id uuid, p_ordered_ids uuid[])
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE v_current jsonb; v_new jsonb := '[]'::jsonb; v_id uuid; v_idx int := 0; v_elem jsonb;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '28000'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.brands WHERE id = p_brand_id AND user_id = auth.uid()) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  SELECT saved_blocks INTO v_current FROM public.brands WHERE id = p_brand_id FOR UPDATE;
  IF COALESCE(array_length(p_ordered_ids, 1), 0) <> jsonb_array_length(v_current) THEN
    RAISE EXCEPTION 'invalid_reorder' USING ERRCODE = '22023';  -- partial list would drop items (db-review C-3)
  END IF;
  FOREACH v_id IN ARRAY p_ordered_ids LOOP
    SELECT jsonb_set(s, '{order}', to_jsonb(v_idx)) INTO v_elem
    FROM jsonb_array_elements(v_current) s WHERE (s->>'id')::uuid = v_id;
    IF v_elem IS NULL THEN  -- unknown id → guard against jsonb || NULL (db-review C-4)
      RAISE EXCEPTION 'invalid_reorder' USING ERRCODE = '22023';
    END IF;
    v_new := v_new || v_elem;
    v_idx := v_idx + 1;
  END LOOP;
  UPDATE public.brands SET saved_blocks = v_new WHERE id = p_brand_id;
END;
$$;

-- Writing rule toggle (single rule at a time)
CREATE OR REPLACE FUNCTION public.set_writing_rule(p_brand_id uuid, p_rule_key text, p_enabled boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '28000'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.brands WHERE id = p_brand_id AND user_id = auth.uid()) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  -- Validate key against known-rule allowlist (extensible — store keys in app constants too)
  IF p_rule_key NOT IN ('no_exclamation', 'no_em_dash', 'sentence_case_headlines', 'no_superlatives', 'active_voice_only') THEN
    RAISE EXCEPTION 'invalid_rule_key' USING ERRCODE = '22023';
  END IF;
  UPDATE public.brands
     SET writing_rules = jsonb_set(COALESCE(writing_rules, '{}'::jsonb), ARRAY[p_rule_key], to_jsonb(p_enabled), true)
   WHERE id = p_brand_id;
END;
$$;

-- Brand identity card update (3 cards: about / voice / story)
CREATE OR REPLACE FUNCTION public.update_brand_identity(p_brand_id uuid, p_card_key text, p_content text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE v_word_count int;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '28000'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.brands WHERE id = p_brand_id AND user_id = auth.uid()) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  IF p_card_key NOT IN ('about', 'voice', 'story') THEN
    RAISE EXCEPTION 'invalid_card_key' USING ERRCODE = '22023';
  END IF;
  -- trim('') splits to ['' ] (length 1); treat empty content as 0 words (db-review H-3).
  v_word_count := CASE WHEN trim(p_content) = '' THEN 0
                       ELSE array_length(regexp_split_to_array(trim(p_content), '\s+'), 1) END;

  UPDATE public.brands
     SET identity = jsonb_set(
           COALESCE(identity, '{}'::jsonb),
           ARRAY[p_card_key],
           jsonb_build_object(
             'content', p_content,
             'last_edited_at', to_jsonb(now()),
             'last_edited_by', to_jsonb(auth.uid()),
             'word_count', v_word_count
           ),
           true
         )
   WHERE id = p_brand_id;
END;
$$;

-- Voice-draft confirm / discard
CREATE OR REPLACE FUNCTION public.confirm_voice_draft(p_draft_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE v_brand_id uuid; v_payload jsonb; v_voice text; v_snips jsonb; v_existing int; v_room int;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '28000'; END IF;

  -- FOR UPDATE locks the draft row so concurrent confirms can't both pass the
  -- unresolved guard and double-append (db-review C-1).
  SELECT brand_id, draft_payload INTO v_brand_id, v_payload
  FROM public.voice_drafts
  WHERE id = p_draft_id AND confirmed_at IS NULL AND discarded_at IS NULL
  FOR UPDATE;

  IF v_brand_id IS NULL THEN
    RAISE EXCEPTION 'draft_not_found_or_already_resolved' USING ERRCODE = 'P0002';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.brands WHERE id = v_brand_id AND user_id = auth.uid()) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  v_voice := v_payload->'voice'->>'content';
  v_snips := COALESCE(v_payload->'tone_snippets', '[]'::jsonb);

  -- Respect the 50-snippet cap on the confirm path too (db-review C-2): only
  -- append up to the remaining room.
  -- Lock the brands row before reading the count so concurrent confirms of
  -- different drafts for the same brand can't both pass the cap (db-review re-review).
  SELECT jsonb_array_length(tone_snippets) INTO v_existing FROM public.brands WHERE id = v_brand_id FOR UPDATE;
  v_room := GREATEST(50 - v_existing, 0);

  -- Write voice → brands.identity.voice (with word-count); append tone_snippets (fresh uuids + order).
  -- WITH ORDINALITY yields the row index without an illegal window function inside jsonb_agg (db-review H-4).
  UPDATE public.brands SET
    identity = jsonb_set(
      COALESCE(identity, '{}'::jsonb), '{voice}',
      jsonb_build_object(
        'content', v_voice,
        'last_edited_at', to_jsonb(now()),
        'last_edited_by', to_jsonb(auth.uid()),
        'word_count', CASE WHEN trim(COALESCE(v_voice, '')) = '' THEN 0
                           ELSE array_length(regexp_split_to_array(trim(v_voice), '\s+'), 1) END
      ),
      true
    ),
    tone_snippets = tone_snippets || (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', gen_random_uuid(),
        'label', s.elem->>'label',
        'category', COALESCE(s.elem->>'category', 'CUSTOM'),
        'content', s.elem->>'content',
        'order', v_existing + (s.rn - 1)::int
      ) ORDER BY s.rn), '[]'::jsonb)
      FROM jsonb_array_elements(v_snips) WITH ORDINALITY AS s(elem, rn)
      WHERE s.rn <= v_room
    )
   WHERE id = v_brand_id;

  UPDATE public.voice_drafts SET confirmed_at = now() WHERE id = p_draft_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.discard_voice_draft(p_draft_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE v_brand_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '28000'; END IF;
  SELECT brand_id INTO v_brand_id FROM public.voice_drafts WHERE id = p_draft_id AND confirmed_at IS NULL AND discarded_at IS NULL FOR UPDATE;
  IF v_brand_id IS NULL THEN RAISE EXCEPTION 'draft_not_found_or_already_resolved' USING ERRCODE = 'P0002'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.brands WHERE id = v_brand_id AND user_id = auth.uid()) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  UPDATE public.voice_drafts SET discarded_at = now() WHERE id = p_draft_id;
END;
$$;

-- Grants
GRANT EXECUTE ON FUNCTION
  public.add_tone_snippet, public.update_tone_snippet, public.delete_tone_snippet, public.reorder_tone_snippets,
  public.add_saved_block,  public.update_saved_block,  public.delete_saved_block,  public.reorder_saved_blocks,
  public.set_writing_rule, public.update_brand_identity,
  public.confirm_voice_draft, public.discard_voice_draft
TO authenticated;

-- ============================================================
-- RLS policies (PRD §4.2) — same transaction so schema + policy ship atomically
-- ============================================================

-- Notes (db-review):
--  * Policies wrap auth.uid() as (SELECT auth.uid()) so it evaluates once per
--    statement, not once per row (M-1, Supabase RLS perf best practice).
--  * DROP POLICY IF EXISTS precedes each CREATE so re-runs are idempotent (H-1;
--    PostgreSQL has no CREATE POLICY IF NOT EXISTS).
--  * No UPDATE policy on brand_fonts / brand_kb_sources is DELIBERATE: font/KB
--    rows are immutable (replace = delete + re-upload); extracted_text is
--    written by the service role only. FORCE ROW LEVEL SECURITY closes the gap
--    if UPDATE is ever granted directly (H-2/M-3).

-- brand_fonts policies
ALTER TABLE public.brand_fonts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_fonts FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS brand_fonts_select ON public.brand_fonts;
CREATE POLICY brand_fonts_select ON public.brand_fonts FOR SELECT TO authenticated
  USING (brand_id IN (SELECT id FROM public.brands WHERE user_id = (SELECT auth.uid())));

DROP POLICY IF EXISTS brand_fonts_insert ON public.brand_fonts;
CREATE POLICY brand_fonts_insert ON public.brand_fonts FOR INSERT TO authenticated
  WITH CHECK (
    brand_id IN (SELECT id FROM public.brands WHERE user_id = (SELECT auth.uid()))
    AND uploaded_by = (SELECT auth.uid())
    AND license_attested = true
  );

DROP POLICY IF EXISTS brand_fonts_delete ON public.brand_fonts;
CREATE POLICY brand_fonts_delete ON public.brand_fonts FOR DELETE TO authenticated
  USING (brand_id IN (SELECT id FROM public.brands WHERE user_id = (SELECT auth.uid())));

-- brand_kb_sources policies
ALTER TABLE public.brand_kb_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_kb_sources FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS brand_kb_sources_select ON public.brand_kb_sources;
CREATE POLICY brand_kb_sources_select ON public.brand_kb_sources FOR SELECT TO authenticated
  USING (brand_id IN (SELECT id FROM public.brands WHERE user_id = (SELECT auth.uid())));
DROP POLICY IF EXISTS brand_kb_sources_insert ON public.brand_kb_sources;
CREATE POLICY brand_kb_sources_insert ON public.brand_kb_sources FOR INSERT TO authenticated
  WITH CHECK (brand_id IN (SELECT id FROM public.brands WHERE user_id = (SELECT auth.uid())) AND uploaded_by = (SELECT auth.uid()));
DROP POLICY IF EXISTS brand_kb_sources_delete ON public.brand_kb_sources;
CREATE POLICY brand_kb_sources_delete ON public.brand_kb_sources FOR DELETE TO authenticated
  USING (brand_id IN (SELECT id FROM public.brands WHERE user_id = (SELECT auth.uid())));

-- voice_drafts policies — service-role insert, owner select, RPC-only resolution
ALTER TABLE public.voice_drafts ENABLE ROW LEVEL SECURITY;

-- Non-partial index for historical-draft SELECTs (the partial index above only
-- covers unresolved rows) (db-review M-4).
CREATE INDEX IF NOT EXISTS idx_voice_drafts_brand ON public.voice_drafts(brand_id);

DROP POLICY IF EXISTS voice_drafts_select ON public.voice_drafts;
CREATE POLICY voice_drafts_select ON public.voice_drafts FOR SELECT TO authenticated
  USING (brand_id IN (SELECT id FROM public.brands WHERE user_id = (SELECT auth.uid())));

DROP POLICY IF EXISTS voice_drafts_service_insert ON public.voice_drafts;
CREATE POLICY voice_drafts_service_insert ON public.voice_drafts FOR INSERT TO service_role
  WITH CHECK (true);

-- No UPDATE / DELETE policies for authenticated — only RPCs (which run as SECURITY DEFINER) can resolve.

-- Realtime — deliver brand_fonts row changes to subscribed clients via
-- `postgres_changes` (the client store subscribes to postgres_changes, not
-- broadcast, so no server-side emit is needed — code-review MED-3). REPLICA
-- IDENTITY FULL so DELETE events still carry brand_id for the client's
-- `brand_id=eq.{id}` filter. Guarded: only act if the Supabase realtime
-- publication exists and brand_fonts is not already a member.
ALTER TABLE public.brand_fonts REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
     AND NOT EXISTS (
       SELECT 1 FROM pg_publication_tables
       WHERE pubname = 'supabase_realtime'
         AND schemaname = 'public'
         AND tablename = 'brand_fonts'
     )
  THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.brand_fonts;
  END IF;
END $$;

COMMIT;
