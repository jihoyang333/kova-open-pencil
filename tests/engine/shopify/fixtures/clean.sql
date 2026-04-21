-- Clean fixture: shopify_orders_agg with no PII columns.
CREATE TABLE shopify_orders_agg (
  brand_id   uuid NOT NULL,
  variant_id uuid NOT NULL,
  date       date NOT NULL,
  qty_sold   integer NOT NULL DEFAULT 0,
  revenue    numeric(12,2) NOT NULL DEFAULT 0
);
