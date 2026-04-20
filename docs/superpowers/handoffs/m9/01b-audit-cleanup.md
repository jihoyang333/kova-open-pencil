# M9 Audit Cleanup — Remaining Findings

**Branch:** `feat/m9-shopify`
**Context:** Ralphy audit ran on 2026-04-19 and flagged these items. The 5 blockers were already
fixed (commit `e7180bf`). This handoff covers everything that was left open.

---

## Pre-flight

```bash
cd kova-open-pencil-1
git checkout feat/m9-shopify
git log -1   # should be e7180bf fix(m9): resolve all 5 audit blockers
bun run check && bun test tests/api/shopify/ tests/engine/shopify/
```

Both must be green before you start.

---

## Part A — HIGH (fix first)

### A1 · Upsert before Vault RPC in `callback.ts`

**File:** `api/shopify/oauth/callback.ts` · function `persistConnection` (line 191)

**Problem:** The connection row is upserted with `access_token_secret_id: crypto.randomUUID()` (a
fake UUID) on line 207, then `store_shopify_token` is called on line 217. If the RPC fails, the
`shopify_connections` row exists with a dangling UUID that points to nothing in the vault.

**Root cause detail:** `store_shopify_token` in the migration (`20260418_m9_01_connections.sql`
line 72) does `vault.create_secret(p_token, ...)` then `UPDATE shopify_connections SET
access_token_secret_id = v_secret_id WHERE brand_id = p_brand_id` and returns the real UUID. You
cannot call it before the upsert (the UPDATE would silently affect 0 rows).

**Fix — add a new migration and restructure the caller:**

**Step 1:** Create `supabase/migrations/20260418_m9_03_vault_helper.sql`:

```sql
-- Vault helper: creates a secret and returns its UUID without touching any other table.
-- Used by callback.ts so the real vault UUID is known before the connection row is upserted.
CREATE OR REPLACE FUNCTION create_shopify_vault_secret(
  p_token text,
  p_name  text
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, vault AS $$
DECLARE
  v_secret_id uuid;
BEGIN
  SELECT vault.create_secret(p_token, p_name, 'Shopify access token') INTO v_secret_id;
  RETURN v_secret_id;
END; $$;

REVOKE ALL ON FUNCTION create_shopify_vault_secret(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION create_shopify_vault_secret(text, text) TO service_role;
```

**Step 2:** Refactor `persistConnection` in `api/shopify/oauth/callback.ts` to accept `secretId`
instead of `accessToken`, so the vault call moves to the handler before the upsert:

```ts
// BEFORE (current)
async function persistConnection(
  admin: Admin, brandId: string, shop: string,
  shopInfo: ShopInfo, scope: string, accessToken: string
): Promise<void> {
  ...
  await admin.from('shopify_connections').upsert({ ..., access_token_secret_id: crypto.randomUUID() }, ...)
  await admin.rpc('store_shopify_token', { p_brand_id: brandId, p_token: accessToken, ... })
}

// AFTER
async function persistConnection(
  admin: Admin, brandId: string, shop: string,
  shopInfo: ShopInfo, scope: string, secretId: string   // ← real vault UUID now passed in
): Promise<void> {
  ...
  await admin.from('shopify_connections').upsert({ ..., access_token_secret_id: secretId }, ...)
  // no RPC call here — vault already created
}
```

**Step 3:** In the handler (`export default async function handler`), vault the token immediately
after token exchange and before `persistConnection`:

```ts
// After: const token = await exchangeCodeForToken(...)
// Before: const shopInfo = await fetchShopInfo(...)

const { data: secretId, error: vaultError } = await admin.rpc(
  'create_shopify_vault_secret',
  { p_token: token.accessToken, p_name: `shopify_token_brand_${stateRow.brand_id}` },
)
if (vaultError || !secretId) return textError(502, 'Failed to vault access token')

// Then pass secretId to persistConnection instead of token.accessToken
await persistConnection(admin, stateRow.brand_id, params.shop, shopInfo, token.scope, secretId as string)
```

This also fixes **A2** below because the vault call now happens before `persistConnection` and
`registerWebhooks`, minimising the window where `accessToken` is in scope on error paths.

---

### A2 · Raw `accessToken` in scope too long

**File:** `api/shopify/oauth/callback.ts`

**Problem:** `token.accessToken` is a live plaintext string that stays in the closure through
`fetchShopInfo`, `persistConnection`, and `registerWebhooks`. An unhandled exception in any of
these functions can expose the token in an error log or crash report.

**Fix:** Implementing A1 above moves vault storage to immediately after token exchange. After
`persistConnection` the token is still passed to `registerWebhooks` — this is unavoidable because
Shopify API calls need it. The remaining exposure is the `registerWebhooks` window, which is
acceptable once the vault is created first. No additional change needed beyond A1.

---

## Part B — MEDIUM

### B1 · `!` non-null assertions on `process.env.*`

**Pattern forbidden by CLAUDE.md.** If an env var is missing at runtime, `undefined` is coerced to
a string and passed into clients, causing confusing deep failures.

**Files with violations** (20 instances):

| File | Lines |
|------|-------|
| `api/shopify/webhook-worker.ts` | 17, 18, 31, 32 |
| `api/shopify/webhooks.ts` | 23, 24 |
| `api/shopify/compliance/customer-redact.ts` | 15 |
| `api/shopify/compliance/shop-redact.ts` | 16 |
| `api/shopify/compliance/data-request.ts` | 15 |
| `api/shopify/compliance/app-uninstalled.ts` | 14 |
| `api/shopify/compliance.ts` | 18, 19 |
| `api/shopify/sync/bulk-start.ts` | 53 |
| `api/shopify/sync/bulk-finish.ts` | 54, 60 |
| `api/shopify/cron/orders-agg.ts` | 45, 46 |
| `api/shopify/cron/inventory-delta.ts` | 44, 45 |
| `api/_shared/qstash.ts` | 10 |

**Fix pattern** — each handler should add a `loadConfig()` guard at the top (see how
`api/shopify/oauth/callback.ts` already does it):

```ts
// Instead of: const admin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

const supabaseUrl = process.env.SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!supabaseUrl || !serviceRoleKey) return new Response('Server configuration error', { status: 500 })
const admin = createClient(supabaseUrl, serviceRoleKey)
```

For `qstash.ts`, make `QSTASH_TOKEN` a required param or throw clearly:
```ts
const token = process.env.QSTASH_TOKEN
if (!token) throw new Error('QSTASH_TOKEN not configured')
```

---

### B2 · Unguarded `JSON.parse` in compliance handlers

**Files:** `api/shopify/compliance/data-request.ts`, `customer-redact.ts`, `shop-redact.ts`

**Problem:** Each handler calls `JSON.parse(body)` after a valid HMAC. A malformed body (valid
HMAC, bad JSON — e.g. from a test harness) causes an unhandled 500.

**Fix:** Wrap in try/catch, return 400:
```ts
let payload: Record<string, unknown>
try {
  payload = JSON.parse(body) as Record<string, unknown>
} catch {
  return new Response('Invalid JSON body', { status: 400 })
}
```

---

### B3 · `shop-redact.ts` logs wrong status when no connection found

**File:** `api/shopify/compliance/shop-redact.ts` · line 29

**Problem:** The compliance log entry always says `status: 'purge_scheduled'` even when `conn` is
null (line 26 `conn?.brand_id ?? null`). When there's no connection, no purge is scheduled, but the
log claims one was.

**Fix:** Log the correct status:
```ts
// BEFORE
status: 'purge_scheduled',

// AFTER
status: conn?.brand_id ? 'purge_scheduled' : 'no_connection',
```

---

## Part C — MINOR (schema)

All fixes go in a single new migration: `supabase/migrations/20260418_m9_04_schema_cleanup.sql`

### C1 · `shopify_connections` RLS uses bare `auth.uid()`

**Problem:** `FOR ALL USING (brand_id IN (SELECT id FROM brands WHERE user_id = auth.uid()))` —
`auth.uid()` is called once per row, not once per statement.

**Fix:**
```sql
-- Drop and recreate with (SELECT auth.uid())
DROP POLICY "users_own_brand_shopify_connections" ON shopify_connections;
CREATE POLICY "users_own_brand_shopify_connections" ON shopify_connections
  FOR ALL USING (
    brand_id IN (SELECT id FROM brands WHERE user_id = (SELECT auth.uid()))
  );

DROP POLICY "users_own_brand_shopify_webhook_log" ON shopify_webhook_log;
CREATE POLICY "users_own_brand_shopify_webhook_log" ON shopify_webhook_log
  FOR SELECT USING (
    brand_id IN (SELECT id FROM brands WHERE user_id = (SELECT auth.uid()))
  );
-- Note: webhook_log is also changed from FOR ALL → FOR SELECT (see C2)
```

### C2 · `shopify_webhook_log` allows authenticated INSERT (FOR ALL)

**Problem:** Any authenticated user can insert fake webhook records. Writes must be service-role
only.

**Fix:** Covered in C1 above — change `FOR ALL` → `FOR SELECT` on the webhook_log policy.

### C3 · Missing `UNIQUE(shop_domain)` on `shopify_connections`

**Problem:** A shop can be connected to multiple brands simultaneously.

**Fix:**
```sql
ALTER TABLE shopify_connections ADD CONSTRAINT shopify_connections_shop_domain_unique UNIQUE (shop_domain);
```

### C4 · Missing `CHECK` on `shopify_connections.status`

**Fix:**
```sql
ALTER TABLE shopify_connections
  ADD CONSTRAINT shopify_connections_status_check
  CHECK (status IN ('active', 'disconnected', 'error'));
```

### C5 · Missing `updated_at` auto-trigger on `shopify_connections`

**Problem:** `store_shopify_token` sets `updated_at` manually, but direct `UPDATE` calls from app
code won't.

**Fix:** Add trigger matching the `brands` table pattern (check how `brands.updated_at` is
triggered and copy the pattern):
```sql
-- Example (adjust trigger function name to match existing pattern in codebase)
CREATE TRIGGER shopify_connections_updated_at
  BEFORE UPDATE ON shopify_connections
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

### C6 · Missing index on `shopify_media.variant_id`

**Problem:** FK exists (`variant_id uuid REFERENCES shopify_variants`) but no index. Joins from
variant → media full-scan.

**Fix:**
```sql
CREATE INDEX ON shopify_media (variant_id) WHERE variant_id IS NOT NULL;
```

### C7 · Missing indexes on `shopify_compliance_log`

**Problem:** No indexes at all. The SELECT RLS policy filter on `user_id` will scan the whole table.

**Fix:**
```sql
CREATE INDEX ON shopify_compliance_log (user_id);
CREATE INDEX ON shopify_compliance_log (brand_id, responded_at DESC);
```

### C8 · Duplicate bestseller index

**Problem:** `shopify_orders_agg (brand_id, date DESC, qty_sold DESC) INCLUDE (variant_id, revenue)`
is created in both `20260418_m9_02_catalog.sql` line 160 AND `20260418_m9_02_catalog_fixup.sql`
line 12. This creates two identical indexes.

**Fix:** The fixup migration runs second and will fail with "already exists" in Postgres unless the
names differ by auto-generated suffix. Remove the duplicate from the fixup migration:
```sql
-- In 20260418_m9_02_catalog_fixup.sql, DELETE line 12:
-- CREATE INDEX ON shopify_orders_agg (brand_id, date DESC, qty_sold DESC) INCLUDE (variant_id, revenue);
```

Since the catalog migration already creates it, the fixup doesn't need it.

### C9 · Missing CHECK on free-form status columns

**Fix:**
```sql
ALTER TABLE shopify_products
  ADD CONSTRAINT shopify_products_status_check
  CHECK (status IN ('active', 'archived', 'draft'));

ALTER TABLE shopify_discounts
  ADD CONSTRAINT shopify_discounts_status_check
  CHECK (status IN ('active', 'expired', 'scheduled'));

ALTER TABLE shopify_compliance_log
  ADD CONSTRAINT shopify_compliance_log_status_check
  CHECK (status IN ('received', 'purge_scheduled', 'purged', 'no_connection'));
```

---

## Quality gates

After each part:
```bash
bun run check          # 0 errors
bun test tests/api/shopify/ tests/engine/shopify/    # all green
```

For Part C, also run:
```bash
bun test tests/api/shopify/migration-connections.test.ts
bun test tests/api/shopify/migration-catalog.test.ts
```

---

## Commit

```bash
git add api/ supabase/migrations/20260418_m9_03_vault_helper.sql \
        supabase/migrations/20260418_m9_04_schema_cleanup.sql \
        tests/
git commit -m "fix(m9): post-audit cleanup — vault ordering, env guards, schema constraints"
```

---

## Out of scope

- Any Phase 3+ work
- Modifying `packages/core/` or the editor UI
- The purge queue consumer (flagged as MEDIUM in audit — will be addressed in the cron chunk)
