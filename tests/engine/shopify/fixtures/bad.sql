-- Bad fixture: adds a PII column to shopify_orders_agg.
ALTER TABLE shopify_orders_agg ADD COLUMN customer_email text;
