# M9 Chunk 10 — Phase 5.6 + 6: Settings + Observability

## Pre-flight (CRITICAL — read first)

- DO NOT read the master plan (`docs/superpowers/plans/2026-04-18-m9-shopify.md`) unless you hit a reference gap.
- DO NOT read the master spec (`docs/superpowers/specs/2026-04-18-m9-shopify-design.md`) unless you hit a reference gap.
- This handoff's task body is derived from the master plan — it is self-contained.
- Current branch: `feat/m9-shopify`. Verify with `git status` and `git log -1`.
- Expected last commit: `feat(shopify): add Refresh Now button and sync progress display` (commit `bd580fa`, from the partial Chunk 10 run).
- Before you start: run `bun run check && bun run test:unit` from `kova-open-pencil-1/` — must be green.

### Recovered state from partial Chunk 10 run

The earlier Chunk 10 attempt already landed commit `bd580fa` which added Refresh Now + sync progress + realtime subscription + JWT-auth'd `bulk-start` to `src/components/dashboard/IntegrationsCard.vue`. **That logic is correct — do not rebuild it.** Task 5.6 below has been restructured to extract that logic into a shared composable and reuse it from the new Settings page. Task 5.6 file target has been corrected: the master plan referenced a file created in Task 1.5, but Task 1.5 never produced it, so **Step 1 now creates the view from scratch and registers the route.**

Tasks 6.1 and 6.2 are unchanged from the master plan.

## Scope

- **5.6** — Create `SettingsBrandIntegrationsView.vue` + route, extract Shopify-connection logic into a composable, reuse it for the new page with scope chips, Refresh Now, Disconnect dialog (§8.5 copy), and history accordion.
- **6.1** — Sentry tagging across all M9 handlers and canvas-extension code.
- **6.2** — `scripts/lint-schema-invariants.ts` CI linter + GitHub Actions workflow + tests.

## Out of scope

- Phase 7 (E2E + smoke) — that is Chunk 11.
- Any backend changes to `/api/shopify/sync/bulk-start` (JWT auth already shipped in `bd580fa`).

## Quality gates — run after every step

```bash
cd kova-open-pencil-1
bun run check
bun run test:unit
bun run lint:schema   # only available after Step 6.2 is done
```

<!-- BODY START -->

### Task 5.6 — Settings → Brand → Integrations page

**Files:**
- Create: `src/views/dashboard/SettingsBrandIntegrationsView.vue`
- Create: `src/composables/use-shopify-connection.ts`
- Modify: `src/router.ts` (add route `/:brandId/settings/integrations`)
- Modify: `src/components/dashboard/IntegrationsCard.vue` (refactor to use composable; update router-link target)
- Create: `tests/engine/shopify/settings-integrations.test.ts`

- [x] **Step 0:** Extract a shared composable `useShopifyConnection(brandId)` from `IntegrationsCard.vue`. It must expose:
  - `state: Ref<'loading' | 'not-connected' | 'connected' | 'reauthorize'>`
  - `connection: Ref<Connection | null>` (with `shop_domain`, `last_synced_at`, `sync_progress`, and add `scopes: string[]` + `product_count: number` — fetch these in `loadConnection` by selecting `scopes` from `shopify_connections` and counting rows in `shopify_products` for the brand)
  - `isSyncing: ComputedRef<boolean>`
  - `loadConnection()`, `subscribeToSyncProgress()`, `unsubscribe()`, `handleRefreshNow()`, `handleDisconnect()`, `handleReauthorize()`
  - Refactor `IntegrationsCard.vue` to consume the composable — no duplicated logic. Existing tests in `tests/engine/shopify/dashboard-integrations.test.ts` must still pass unchanged.

- [x] **Step 1:** Create `src/views/dashboard/SettingsBrandIntegrationsView.vue`. Layout:
  - Back link → `/dashboard/{brandId}/settings` ("Back to brand settings")
  - Page title: "Integrations"
  - **Shopify section card** (only shown if `state === 'connected'` or `'reauthorize'`):
    - Domain (monospace) · last-sync relative time · product count · **scope chips** (one chip per scope in `connection.scopes`, e.g. `read_products`, `read_orders`)
    - Button row: `[Refresh now]` · `[Brand kit]` (deep-link to `/dashboard/{brandId}/settings` — the brand kit lives there already) · `[Disconnect]`
    - "Open in Shopify admin ↗" external link → `https://{shop_domain}/admin/apps`
  - **Not-connected state:** render a note + `[Connect Shopify]` that calls the same OAuth popup logic (reuse from composable if possible, else delegate to IntegrationsCard's connect flow by redirecting user back to the dashboard).
  - Add route in `src/router.ts`:
    ```ts
    const SettingsBrandIntegrationsView = () => import('./views/dashboard/SettingsBrandIntegrationsView.vue')
    // ...inside dashboard children array:
    { path: ':brandId/settings/integrations', component: SettingsBrandIntegrationsView },
    ```
  - Update `IntegrationsCard.vue`'s `<router-link data-test-id="integrations-settings-link">` target from `/dashboard/{brandId}/settings` to `/dashboard/{brandId}/settings/integrations`.

- [x] **Step 2:** `[Refresh now]` wired via `useShopifyConnection().handleRefreshNow()`. UI shows sync progress (composable already reads `sync_progress` and subscribes to realtime updates). Display a progress bar showing `count_done / count_total` when `phase === 'parsing'` and `count_total > 0`; spinner + "Syncing your products…" otherwise. Show error banner if `phase === 'error'` with the error message.

- [x] **Step 3:** `[Disconnect]` opens Reka UI `DialogRoot` / `DialogContent` with exact §8.5 copy:
  > "Your emails stay. Products will show as unavailable until you reconnect. We'll delete your store data in 30 days unless you reconnect. To fully uninstall Kova from Shopify admin →"

  The "To fully uninstall Kova from Shopify admin →" segment is a deep link to `https://{shop_domain}/admin/apps` (opens in new tab with `target="_blank" rel="noopener"`).

  Dialog has `[Cancel]` and `[Disconnect]` buttons. Confirm calls `useShopifyConnection().handleDisconnect()`.

- [x] **Step 4:** History section below the Shopify card — Reka UI `AccordionRoot` / `AccordionItem` / `AccordionTrigger` / `AccordionContent`, collapsed by default (`collapsible` + default `value=""`). Trigger label: "History". Content: last 10 rows from `shopify_connections.history` if the column exists, else an empty state "No history yet." Each row shows timestamp + event type (`connected` / `disconnected` / `scope_changed`).

- [x] **Step 5:** Tests + commit.

  Write `tests/engine/shopify/settings-integrations.test.ts` with:
  - Supabase mock returning a `connected` connection with `scopes: ['read_products', 'read_orders']` and `product_count`
  - Asserts: scope chips render one per scope; Refresh Now calls `bulk-start`; Disconnect dialog shows the exact §8.5 copy; history accordion is collapsed by default; deep link uses the correct shop_domain.
  - Re-run `tests/engine/shopify/dashboard-integrations.test.ts` to prove the refactor is behavior-preserving.

  Commit (use the actual file list created/modified):
  ```bash
  git add src/views/dashboard/SettingsBrandIntegrationsView.vue \
          src/composables/use-shopify-connection.ts \
          src/router.ts \
          src/components/dashboard/IntegrationsCard.vue \
          tests/engine/shopify/settings-integrations.test.ts
  git commit -m "feat(m9): settings → brand → integrations page"
  ```

---

## Phase 6 — Observability + guardrails

### Task 6.1 — Sentry tagging for M9 errors

**Files:**
- Modify: every new `api/shopify/*` handler (catch + Sentry tag)
- Modify: `src/canvas-extensions/product-variant/*` (try/catch + Sentry client)
- Create (if not present): `api/_shared/sentry.ts` with an `sentryCapture(err, ctx)` helper.

- [x] **Step 1:** All caught errors tagged `m9.shopify` + `brand_id` + (where present) `shop_domain`. Never tag with `access_token` or `customer_id`.
- [x] **Step 2:** Add a smoke test `tests/engine/shopify/sentry-tagging.test.ts` with a mock Sentry client asserting tags.
- [x] **Step 3:** Commit.

```bash
git add api/_shared/sentry.ts api/shopify/ src/canvas-extensions/product-variant/ tests/engine/shopify/sentry-tagging.test.ts
git commit -m "feat(m9): sentry tagging across shopify surfaces"
```

---

### Task 6.2 — CI lint: no PII in `shopify_orders_agg`

**Files:**
- Create: `scripts/lint-schema-invariants.ts`
- Modify: `package.json` — add `"lint:schema": "bun run scripts/lint-schema-invariants.ts"`.
- Modify: existing CI config (or add `.github/workflows/schema-invariants.yml`) to run `bun run lint:schema` on every PR.

- [x] **Step 1: Write the failing test** (bun:test — feed the linter a fixture migration that adds `customer_email text` to `shopify_orders_agg` and expect the linter to exit non-zero).

```ts
// tests/engine/shopify/lint-schema-invariants.test.ts
import { describe, it, expect } from 'bun:test'
import { runLinter } from '../../../scripts/lint-schema-invariants'

describe('lint-schema-invariants', () => {
  it('passes on a clean shopify_orders_agg', async () => {
    const code = await runLinter(['--fixture', 'tests/engine/shopify/fixtures/clean.sql'])
    expect(code).toBe(0)
  })
  it('fails when shopify_orders_agg gains a customer_* column', async () => {
    const code = await runLinter(['--fixture', 'tests/engine/shopify/fixtures/bad.sql'])
    expect(code).toBe(1)
  })
})
```

- [x] **Step 2: Run — expect FAIL**

- [x] **Step 3: Implement `scripts/lint-schema-invariants.ts`**

```ts
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const BANNED = /\b(customer_|email|phone|address|first_name|last_name)\b/i

export async function runLinter(argv: string[] = process.argv.slice(2)): Promise<number> {
  const fixtureFlag = argv.indexOf('--fixture')
  const paths = fixtureFlag >= 0 ? [argv[fixtureFlag + 1]] : listMigrations()
  let failed = false
  for (const p of paths) {
    const sql = readFileSync(p, 'utf8')
    const block = extractTableBlock(sql, 'shopify_orders_agg')
    if (!block) continue
    for (const line of block.split('\n')) {
      if (line.trim().startsWith('--')) continue
      if (BANNED.test(line)) { console.error(`PII column suspected in ${p}: ${line.trim()}`); failed = true }
    }
  }
  return failed ? 1 : 0
}

function listMigrations(): string[] {
  const dir = 'kova-open-pencil-1/supabase/migrations'
  return readdirSync(dir).filter((f) => f.endsWith('.sql')).map((f) => join(dir, f))
}
function extractTableBlock(sql: string, table: string): string | null {
  const re = new RegExp(`CREATE TABLE ${table}[^;]*;|ALTER TABLE ${table}[^;]*;`, 'gi')
  const matches = sql.match(re)
  return matches ? matches.join('\n') : null
}

if (import.meta.main) process.exit(await runLinter())
```

- [x] **Step 4: Run — expect PASS**

- [x] **Step 5: Commit**

```bash
git add scripts/lint-schema-invariants.ts tests/engine/shopify/lint-schema-invariants.test.ts tests/engine/shopify/fixtures/clean.sql tests/engine/shopify/fixtures/bad.sql package.json .github/workflows/schema-invariants.yml
git commit -m "feat(m9): CI lint — no PII in shopify_orders_agg"
```

---

<!-- BODY END -->

## Exit criteria

- [x] All steps in 5.6, 6.1, and 6.2 marked [x].
- [x] `bun run check` passes.
- [x] `bun run test:unit` passes — dashboard-integrations (refactored), settings-integrations, sentry-tagging, lint-schema tests all green.
- [x] `bun run lint:schema` exits 0 on the real migrations.
- [x] `security-auditor` agent dispatched on the Sentry tagging changes (no secrets in tags).
- [x] Three commits on top of `bd580fa`: settings page, sentry tagging, CI lint.
- [x] Final commit subject: `feat(m9): CI lint — no PII in shopify_orders_agg`

## Handoff to next chunk

Next chunk: `11-phase-7-e2e-smoke.md`
