# M9 Chunk 10 — Phase 5.6 + 6: Settings + Observability

## Pre-flight (CRITICAL — read first)

- DO NOT read the master plan (`docs/superpowers/plans/2026-04-18-m9-shopify.md`) unless you hit a reference gap.
- DO NOT read the master spec (`docs/superpowers/specs/2026-04-18-m9-shopify-design.md`) unless you hit a reference gap.
- This handoff's task body is extracted byte-for-byte from the master plan — it is self-contained.
- Current branch: `feat/m9-shopify`. Verify with `git status` and `git log -1`.
- Expected last commit: `feat(m9): editor shop panel — products/collections/discounts` (from Chunk 9).
- Before you start: run `bun run check && bun run test:unit` from `kova-open-pencil-1/` — must be green.

## Scope

Task 5.6 and Phase 6 (Tasks 6.1 + 6.2):
- **5.6** — Flesh out `SettingsBrandIntegrationsView.vue` with the full Shopify section: domain/sync/scope chips, Refresh Now, Disconnect dialog, history accordion.
- **6.1** — Sentry tagging across all M9 handlers and canvas-extension code.
- **6.2** — `scripts/lint-schema-invariants.ts` CI linter + GitHub Actions workflow + tests.

## Out of scope

- Phase 7 (E2E + smoke) — that is Chunk 11.

## Quality gates — run after every step

```bash
cd kova-open-pencil-1
bun run check
bun run test:unit
bun run lint:schema   # only available after Step 6.2 is done
```

<!-- BODY START — verbatim extract from master-plan lines 2640..2752. Do not edit. -->
### Task 5.6 — Settings → Brand → Integrations page

**Files:**
- Modify: `src/views/SettingsBrandIntegrationsView.vue` (created in Task 1.5; flesh out UI now).

- [ ] **Step 1:** Shopify section card — domain · last-sync · product count · scope chips · [Refresh now] [Brand kit] [Disconnect] + deep link to `https://{shop}/admin/apps`.
- [ ] **Step 2:** `[Refresh now]` posts to `/api/shopify/sync/bulk-start`; UI shows sync progress (reads `shopify_connections.sync_progress`).
- [ ] **Step 3:** `[Disconnect]` opens Reka UI `Dialog` with §8.5 copy + confirm.
- [ ] **Step 4:** History section (Reka UI `Accordion`, collapsed by default).
- [ ] **Step 5:** Tests + commit.

```bash
git add src/views/SettingsBrandIntegrationsView.vue tests/engine/shopify/settings-integrations.test.ts
git commit -m "feat(m9): settings → brand → integrations page"
```

---

## Phase 6 — Observability + guardrails

### Task 6.1 — Sentry tagging for M9 errors

**Files:**
- Modify: every new `api/shopify/*` handler (catch + Sentry tag)
- Modify: `src/canvas-extensions/product-variant/*` (try/catch + Sentry client)
- Create (if not present): `api/_shared/sentry.ts` with an `sentryCapture(err, ctx)` helper.

- [ ] **Step 1:** All caught errors tagged `m9.shopify` + `brand_id` + (where present) `shop_domain`. Never tag with `access_token` or `customer_id`.
- [ ] **Step 2:** Add a smoke test `tests/engine/shopify/sentry-tagging.test.ts` with a mock Sentry client asserting tags.
- [ ] **Step 3:** Commit.

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

- [ ] **Step 1: Write the failing test** (bun:test — feed the linter a fixture migration that adds `customer_email text` to `shopify_orders_agg` and expect the linter to exit non-zero).

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

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement `scripts/lint-schema-invariants.ts`**

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

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add scripts/lint-schema-invariants.ts tests/engine/shopify/lint-schema-invariants.test.ts tests/engine/shopify/fixtures/clean.sql tests/engine/shopify/fixtures/bad.sql package.json .github/workflows/schema-invariants.yml
git commit -m "feat(m9): CI lint — no PII in shopify_orders_agg"
```

---

<!-- BODY END -->

## Exit criteria

- [ ] All steps in 5.6, 6.1, and 6.2 marked [x].
- [ ] `bun run check` passes.
- [ ] `bun run test:unit` passes — settings, sentry-tagging, lint-schema tests all green.
- [ ] `bun run lint:schema` exits 0 on the real migrations.
- [ ] `security-auditor` agent dispatched on the Sentry tagging changes (no secrets in tags).
- [ ] Three commits: settings page, sentry tagging, CI lint.
- [ ] Final commit subject: `feat(m9): CI lint — no PII in shopify_orders_agg`

## Handoff to next chunk

Next chunk: `11-phase-7-e2e-smoke.md`
