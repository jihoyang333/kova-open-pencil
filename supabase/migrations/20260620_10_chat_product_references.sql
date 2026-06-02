-- Migration 20260620_10_chat_product_references
-- Cluster 10 AI Chat + Memory + Tool Layer
-- Adds per-conversation product-reference state for composer chips

BEGIN;

ALTER TABLE public.chat_conversations
  ADD COLUMN IF NOT EXISTS product_references jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.chat_conversations.product_references IS
  'Active Shopify product-reference chips for this chat conversation. Ordered array of {product_id, title, primary_image_url, price_low, price_high, currency, handle, added_at} objects. Capped at 20 entries. Per Shopify product-reference design spec D3/D7/D8.';

CREATE OR REPLACE FUNCTION public.validate_chat_product_references()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF jsonb_typeof(NEW.product_references) <> 'array' THEN
    RAISE EXCEPTION 'product_references must be a JSONB array, got %', jsonb_typeof(NEW.product_references);
  END IF;
  IF jsonb_array_length(NEW.product_references) > 20 THEN
    RAISE EXCEPTION 'product_references exceeds maximum of 20 entries (got %)', jsonb_array_length(NEW.product_references);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS chat_conversations_validate_product_references ON public.chat_conversations;
CREATE TRIGGER chat_conversations_validate_product_references
  BEFORE INSERT OR UPDATE OF product_references ON public.chat_conversations
  FOR EACH ROW EXECUTE FUNCTION public.validate_chat_product_references();

COMMIT;
