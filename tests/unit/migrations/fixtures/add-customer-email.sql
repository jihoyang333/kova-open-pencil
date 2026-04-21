-- Fixture: migration that adds a PII column to shopify_orders_agg.
-- Used by pii-linter.test.ts to verify the linter catches violations.
ALTER TABLE shopify_orders_agg ADD COLUMN customer_email text;
