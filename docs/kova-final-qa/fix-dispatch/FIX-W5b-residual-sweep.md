# Wave 5b — Residual Sweep Pass

**Origin:** `docs/kova-final-qa/FINAL-AUDIT-REPORT.md` §5 (deferred items) + §6 (W0-11..15 optional conventions). Founder ratification 2026-05-20 — "fix now over fix later" per CLAUDE.md "bias toward overbuilding".
**Scope:** 7 finding-commits closing every residual from W5a's `Out of scope` list. After W5b, spec corpus is 100% clean before app-build phase begins.
**Prerequisites:** W5a merged. HEAD = `d5efe6d4` or later. `feat/m9-shopify` working tree clean.
**Out of scope:** `culori` import absence (engineers add at build per CLAUDE.md; spec doesn't need it). PRD 06 §11 cross-cuts table L149 minor "/dashboard route (target of brand-label click)" prose residue — functionally accurate, leave for post-build edit.

---

## Branch + commit shape

**No worktree. No new branch.** Work directly on `feat/m9-shopify`. One commit per finding. Push every 2-3 commits.

Commit message format:

```
fix(qa-w5b): <FINDING-ID> <one-line summary>

<body: what + why; cite FINAL-AUDIT-REPORT.md or FIX-W5a-polish-pass.md line if relevant>
```

**Push policy:** never `--force`, never `--no-verify`.

---

## Pre-flight (do this first)

```sh
cd /Users/jihoyang/kova-main/kova-open-pencil-1
git checkout feat/m9-shopify
git pull origin feat/m9-shopify
git status                                    # working tree clean
git branch --show-current                     # must print feat/m9-shopify
git log --oneline -3                          # HEAD should be d5efe6d4 or later
```

Bail and ask founder if anything off.

---

## The 7 finding-commits

Execute in foundation-first order (helpers + conventions land before sweeps consume them).

### 1. W0-13 — `loadEnvOrSkip()` helper (Plan 11)

- **File:** `docs/kova-final-impl-plans/11-shared-ui-infrastructure-plan.md`
- **Anchor:** new Task 1.3c (between existing T1.3b `requireEnv` and T1.4) OR fold into §11 scope plan §6 with helper authored under Phase 1.
- **Gap:** Ad-hoc env-guard patterns reinvented in Plan 11:1067, Plan 11:1208, Plan 09 snapshot-prune, Plan 12 send-sync-alert. No shared helper.
- **Fix:** Author `loadEnvOrSkip()` in `api/_shared/env.ts` (Plan 11 owner). Signature:

```ts
// api/_shared/env.ts (Plan 11 Task 1.3c)
import * as Sentry from '@sentry/node'

/**
 * Read env var. If missing/empty, emit Sentry breadcrumb + return null.
 * Caller short-circuits (returns 200 + ok:true, skipped:true).
 * For required env (must-throw), use requireEnv() from Task 1.3b instead.
 *
 * Use for OPTIONAL integrations (Resend, Sentry, marketing-email cron) where
 * absence is expected at MVP and the handler should no-op gracefully.
 */
export function loadEnvOrSkip(name: string, opts?: { skipReason?: string }): string | null {
  const val = process.env[name]
  if (val == null || val === '') {
    Sentry.captureMessage(`env_skipped:${name}`, 'warning')
    return null
  }
  return val
}
```

**Migration in same commit:**
- Plan 11:1067-1078 (Resend stub) — replace ad-hoc check with `const key = loadEnvOrSkip('RESEND_API_KEY')`
- Plan 11:1208 (Sentry stub) — same pattern
- Plan 09 snapshot-prune — same pattern for `SUPABASE_SERVICE_ROLE_KEY` guard (if pattern matches; else skip)
- Plan 12 Task 16 send-sync-alert — replace `loadEnvOrSkip` ad-hoc guards (Plan 12:2092-2105 currently returns 500 with `supabase_env_unset` — replace with `loadEnvOrSkip` returning `{ skipped: true }`).

Add CI grep gate in Plan 11 Task 11.x: `grep -rE "process\.env\['[A-Z_]+'\]\s*\?\?" docs/kova-final-impl-plans/` — fail if any plan reinvents the pattern outside the helper.

- **Verify after edit:** `grep -rcE "loadEnvOrSkip" docs/kova-final-impl-plans/` must show Plan 11 + Plans 09 + 12 consume it. Tests added at Plan 11 Task 1.3c covering: (a) returns string when set, (b) returns null + Sentry breadcrumb when unset, (c) returns null + breadcrumb when empty string.

**Commit:**
```
fix(qa-w5b): W0-13 author loadEnvOrSkip() helper Plan 11 Task 1.3c + migrate Plans 09/11/12

Resolves Pattern-4 (CONSOLIDATED-TRIAGE.md L476). Stub-guard pattern centralized in
api/_shared/env.ts. Plans 09/11/12 ad-hoc guards migrated to helper. CI grep gate
blocks future drift. Pairs with requireEnv() from T1.3b — required vs optional env.
```

---

### 2. W0-12 — Acceptance-criteria → test mapping CI gate (Plan 11)

- **File:** `docs/kova-final-impl-plans/11-shared-ui-infrastructure-plan.md`
- **Anchor:** new Task 11.x (after existing CI gates).
- **Gap:** No CI grep asserts every PRD §8 acceptance bullet maps to a named test ID in the corresponding Plan §9. Convention is loose; engineers might miss tests.
- **Fix:** Add CI script `scripts/check-acceptance-mapping.ts`. For each `docs/kova-final-prds/NN-*.md`:
  1. Extract every `- [ ]` bullet under any §8.* heading. Collect canonical IDs from `<!-- ACC: <id> -->` HTML comments adjacent to each bullet (convention introduced here).
  2. Open paired `docs/kova-final-impl-plans/NN-*-plan.md`. Extract every test scenario from §9.x or task §x.y Step 1 RED blocks. Collect test names + matching `<!-- ACC: <id> -->` annotations.
  3. Assert every PRD ACC id has at least one matching Plan ACC id. Fail CI with list of unmapped ids.

PRD authors add `<!-- ACC: nn-bullet-name -->` to each §8 bullet during W5b. Plan authors add matching annotation on the test that proves it.

Sample seed: PRD 01 §8 has 11 bullets — annotate 11 ids. Plan 01 §9 has ~14 test scenarios — annotate the 11 that map. Repeat for all 12 PRD↔Plan pairs.

**Scope guard:** annotate only NEW PRD §8 bullets where mapping is non-obvious. For existing bullets that already have 1:1 named test (e.g., "Step 1 test asserts X"), skip annotation — CI script falls back to substring fuzzy-match with `--strict=false` flag.

- **Verify after edit:** `bun run check:acceptance-mapping` exits 0. Plan 11 Task 11.x cites all 12 PRD↔Plan pairs scanned.

**Commit:**
```
fix(qa-w5b): W0-12 acceptance-criteria→test mapping CI gate Plan 11 Task 11.x

Resolves Pattern-3 (CONSOLIDATED-TRIAGE.md L475). New scripts/check-acceptance-mapping.ts
walks every PRD §8 bullet + matches to Plan §9 test by <!-- ACC: --> annotation.
12 PRD↔Plan pairs seeded with annotations. Composed into `bun run check`.
Catches missed-test regressions at commit time.
```

---

### 3. W0-14 — Edge function runtime config CI gate (Plan 11)

- **File:** `docs/kova-final-impl-plans/11-shared-ui-infrastructure-plan.md`
- **Anchor:** extend existing CI step in Task 11.x.
- **Gap:** Plan 09 has `export const config = { runtime: 'edge' }` on its 3 Edge Functions (C-LOW09.9 closure). Plan 12 send-sync-alert is Deno (Supabase Edge Function — different runtime). The W0-14 grep as originally specced only covers Vercel `api/*.ts`.
- **Fix:** Two separate CI checks:

```bash
# Check A: Vercel api/*.ts must export runtime config
- name: Vercel Edge runtime config (W0-14a)
  run: |
    fails=0
    for f in $(find kova-open-pencil-1/api -name "*.ts" -not -path "*/_shared/*"); do
      if ! grep -qE "export const config\s*=\s*\{[^}]*runtime\s*:" "$f"; then
        echo "::error file=$f::Missing 'export const config = { runtime: ... }' (W0-14a)"
        fails=$((fails+1))
      fi
    done
    exit $fails

# Check B: Supabase Edge Functions (Deno) — verify Deno.serve handler shape
- name: Supabase Edge function shape (W0-14b)
  run: |
    fails=0
    for f in $(find kova-open-pencil-1/supabase/functions -name "index.ts"); do
      if ! grep -qE "Deno\.serve\(|serve\(" "$f"; then
        echo "::error file=$f::Missing Deno.serve handler (W0-14b)"
        fails=$((fails+1))
      fi
    done
    exit $fails
```

Both composed into `bun run check`.

- **Verify after edit:** Plan 09 Edge Fns pass check A; Plan 12 send-sync-alert Supabase Edge Fn passes check B. Plan 01 OAuth callback passes check A (already has runtime config per cluster fix).

**Commit:**
```
fix(qa-w5b): W0-14 Edge runtime config CI gates Plan 11 — two checks (Vercel + Supabase)

Resolves Pattern-6 (CONSOLIDATED-TRIAGE.md L477). Vercel api/*.ts asserts
`export const config = { runtime }`. Supabase functions/*/index.ts asserts
`Deno.serve` handler. Plan 09 + Plan 12 + Plan 01 verified pass both checks.
```

---

### 4. CT-009 / W0-9 — `process.env.X!` callsite sweep (52 hits across 4 plans)

- **Files + counts:**
  - `docs/kova-final-impl-plans/09-version-history-and-trash-plan.md` — 16 hits
  - `docs/kova-final-impl-plans/03-brand-management-plan.md` — 16 hits
  - `docs/kova-final-impl-plans/04-account-and-stripe-billing-plan.md` — 12 hits
  - `docs/kova-final-impl-plans/11-shared-ui-infrastructure-plan.md` — 8 hits
- **Gap:** Founder lock #10 forbids `process.env.X!` non-null assertions. `requireEnv()` helper landed in Plan 11 Task 1.3b but consumer callsites never migrated.
- **Fix:** Per-plan find-replace:

```diff
- const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
+ const supabase = createClient(requireEnv('SUPABASE_URL'), requireEnv('SUPABASE_SERVICE_ROLE_KEY'))
```

Add import at top of each Edge Function code block: `import { requireEnv } from '../_shared/env'` (Plan 11 Task 1.3b).

**Per-plan exit grep gate before commit:**
```sh
grep -cE "process\.env\.[A-Z_]+!" docs/kova-final-impl-plans/NN-*.md
# must return 0
```

**Commit per plan** (4 commits — atomic per cluster):

```
fix(qa-w5b): W0-9 sweep Plan 09 — 16 process.env.X! → requireEnv() (CT-009)
fix(qa-w5b): W0-9 sweep Plan 03 — 16 process.env.X! → requireEnv() (CT-009)
fix(qa-w5b): W0-9 sweep Plan 04 — 12 process.env.X! → requireEnv() (CT-009)
fix(qa-w5b): W0-9 sweep Plan 11 — 8 process.env.X! → requireEnv() (CT-009)
```

**Verify after each:** `grep -cE "process\.env\.[A-Z_]+!" docs/kova-final-impl-plans/NN-*.md` returns 0 for that plan. Final grep across all plans = 0.

---

### 5. CT-009 / W0-9 — `as any` callsite sweep (~202 hits, ~50% test-fixture acceptable)

- **Files + counts (full corpus):**
  - Plan 03: 53 — heavy test-fixture (Edge Function `req.body` casts, Pinia store mocks) + production `req.body as any` in 5 Edge Functions
  - Plan 06: 41 — mostly test-fixture (editor.graph partial-object mocks for engine tests)
  - Plan 04: 26 — mix
  - Plan 02: 25 — mostly test-fixture
  - Plan 01: 22 — mostly test-fixture
  - Plan 05: 13 — mostly test-fixture (Supabase from() chain mocks)
  - Plan 09: 12 — mostly test-fixture
  - Plan 11: 6 — mix
  - Plan 07b: 3 — all in NEGATIVE-form comments (verified W5a) — SKIP, already clean
  - Plan 10: 1 — single instance
- **Triage rule (founder-ratified 4-bucket — 2026-05-20):**

  | Bucket | Pattern | Action | Annotation |
  |--------|---------|--------|------------|
  | **A** | Bun:test fixtures — `as any` on mock-return values + test-stub function signatures | **KEEP** — bun:test convention. Annotate and move on. | `// test-fixture: bun:test convention` (inline above the cast OR file-top if pervasive) |
  | **B** | Production `as any` in Edge Functions on `req.body` | **ALWAYS REPLACE** with valibot parse + typed interface | `const body = parse(BodySchema, await readBody(req))` — define `BodySchema` + matching `interface Body` at top of file |
  | **C** | Production `as any` on `useStore()` return | **ALWAYS REPLACE** with typed `defineStore<State, Getters, Actions>()` generic params at store definition site | No callsite cast needed once store is properly generic-parameterized |
  | **D** | Production `as any` on third-party SDK return where types missing | **KEEP** — annotate `// SDK lacks types — upstream fix tracked`. Open or link to GitHub issue in same comment. | `// SDK lacks types — upstream fix tracked (issue: <link or TODO file an issue>)` |

  **No other buckets.** If a callsite doesn't cleanly match A/B/C/D — that's **judgment fatigue**. STOP per bailout policy and ask founder. Do NOT blanket-replace.

- **Process per plan:**
  1. Open file. Read every `as any` callsite with 3-line context.
  2. Tag with bucket A/B/C/D.
  3. For A: add annotation, leave cast intact.
  4. For B: write valibot schema + typed interface + replace cast. One callsite at a time.
  5. For C: replace at store-definition site (NOT each consumer). Verify consumer call no longer needs cast.
  6. For D: add SDK-lacks-types annotation + link to upstream issue.
  7. If row doesn't fit A/B/C/D → STOP, bailout, ask founder. Don't guess.

**Sample edit (Plan 03:1394 — production):**
```diff
- const nameV = validateBrandName((req.body as any)?.name)
+ const body = parse(CreateBrandBodySchema, await readBody(req))
+ const nameV = validateBrandName(body.name)
```

**Sample non-edit (Plan 03:1139 — test fixture):**
```ts
// kept as-is — partial-object mock for Pinia store shape
const mockBrand = { id: 'b1', name: 'Test', archived_at: null } as any
```

**Per-plan exit gate:**
```sh
# Production-context as any: should be 0
grep -nE "as any" docs/kova-final-impl-plans/NN-*.md \
  | grep -vE "mock|stub|fixture|test|negative.reference|exemption" \
  | grep -v "^[[:space:]]*//" \
  | wc -l
# should approach 0; any remainder needs founder eyes
```

**Commit per plan** (8 commits — Plans 03, 06, 04, 02, 01, 05, 09, 11; skip 07b + 10 since already clean):

```
fix(qa-w5b): W0-9 sweep Plan NN — categorize as any (test-fixture vs production); replace production with typed alternatives (CT-009)
```

**Verify after all 8:** Plan 11 Task 11.7 `bun run check:lock10` CI script must pass. Total `as any` across plans drops from ~202 to ~150-160 (test-fixture residue acceptable + annotated).

---

### 6. Plan 02:3125 `<style scoped>` — convert to Tailwind

- **File:** `docs/kova-final-impl-plans/02-onboarding-and-dashboard-plan.md:3120-3140`
- **Gap:** `<style scoped>` block defining `.shimmer` keyframe + class. CLAUDE.md `Styling` rule: Tailwind only, no `<style>` blocks. Engineer-adjusts annotation already present but spec should ship clean.
- **Fix:**
  1. Move `@keyframes shimmer` into `kova-open-pencil-1/src/app.css` (global stylesheet) — annotate as "global keyframe used by SkeletonShimmer per Plan 02 §X".
  2. Replace `.shimmer` class with Tailwind utility chain on the element: `class="bg-[linear-gradient(90deg,var(--rail)_0%,var(--fill)_50%,var(--rail)_100%)] [background-size:200%_100%] animate-shimmer"` (where `animate-shimmer` is registered in `tailwind.config.ts` / `@theme` block to reference the global keyframe).
  3. Remove `<style scoped>` block entirely.
  4. Replace engineer-adjusts note with: `(SkeletonShimmer animation: global keyframe in app.css; Tailwind `animate-shimmer` utility registered in @theme. Per CLAUDE.md "Tailwind utility classes only".)`

- **Verify after edit:** `grep -nE "<style" docs/kova-final-impl-plans/02-onboarding-and-dashboard-plan.md` returns 0. `grep -nE "<style" docs/kova-final-impl-plans/` total = 0 across all plans.

**Commit:**
```
fix(qa-w5b): Plan 02:3125 <style scoped> → Tailwind animate-shimmer (CLAUDE.md Styling lock)

Resolves GATE 2 residual. .shimmer keyframe moved to src/app.css global;
class replaced with Tailwind arbitrary-value chain. Spec now matches the
no-<style>-blocks lock. Final cross-plan grep: 0 hits.
```

---

### 7. W0-11 + W0-15 — Task-compression convention + numerical-caps appendix (scope plan §6)

- **File:** `docs/kova-final-prds/00-PRD_SCOPE_PLAN.md`
- **Anchor:** add §6.6 + §6.7 (current scope plan §6 stops at §6.5).
- **Gap:**
  - **W0-11 (Pattern-1):** No canonical convention for task-compression splits. Engineers may bundle 4+ components into one task body.
  - **W0-15 (Pattern-7):** Numerical caps (chips=20, tone-snippets=10, brand-memories=50, chat-tabs=20, recent-colors=12, etc.) documented per-PRD; drift risk if cap changes only in one place.
- **Fix:** Two new scope-plan subsections.

```markdown
### 6.6 Task-compression convention (W0-11 — 2026-05-20)

Resolves Pattern-1 (CONSOLIDATED-TRIAGE.md L474). Every implementation plan
task body that ships 4+ distinct components MUST split into per-component
sub-tasks. Each sub-task carries its own:

- File list (no shared "Files:" header at parent task)
- Step 1 RED test scenario
- Step 2 GREEN implementation
- Step 3 commit message

Rationale: per-component TDD pressure catches integration bugs at commit time;
bundled tasks ship N components in one commit and lose RED→GREEN→COMMIT discipline.

Affected plans (validated W5a): Plan 04 (T11.4-11.8 split — C-LOW04.5), Plan 05
(T21-27 per-tab split — C-MED16), Plan 07b (T4.5-4.11b per-overlay split —
C-MED-07b.1), Plan 08 (T2.6a-e per-shortcut-category split — C-MED21), Plan 11
(T4.3a + T4.3b per-primitive split — C-LOW-11.7). New plan authoring uses this
convention from start; existing plans audited per cluster fix-dispatch.

### 6.7 Numerical caps appendix (W0-15 — 2026-05-20)

Resolves Pattern-7 (CONSOLIDATED-TRIAGE.md L478). Single source of truth for
every numerical cap that appears in multiple PRDs.

| Cap | Value | Founder lock date | Canonical citation |
|-----|-------|-------------------|--------------------|
| Tone snippets per brand | 10 | 2026-05-15 | PRD 10 §3.2 + §12.13 |
| Brand memories per brand | 50 | 2026-05-15 | PRD 10 §3.2 + §12.13 |
| Product chips per chat message | 20 | 2026-05-15 | PRD 10 §3.2 + §12.13 |
| Chat tabs per canvas | 20 | 2026-05-15 | PRD 10 §3.2 + §12.13 |
| Recent colors (FIFO ring) | 12 | 2026-05-17 | PRD 12 §2.1 + §6.2.2 |
| Sidebar sections | 6 | 2026-05-17 | PRD 04 §1.1-§3.1 |
| Avatar max size (MB) | 5 | 2026-05-17 | PRD 04 §13.2.1 D-7 |
| Brand kit Steps wizard | 4 | 2026-04-25 | PRD 02 §6.1 |
| Right-panel tabs | 2 (Design + AI) | 2026-05-17 | PRD 06 §12.13 |
| Gradient types | 4 (Linear/Radial/Angular/Diamond) | 2026-05-17 | PRD 07b §3.6 + §12.5 |
| Resend templates at MVP | 4 | 2026-05-17 | PRD 04 §13.2.1 D-12 |
| Empty-canvas right-click menu items | 12 (Figma full) | 2026-05-17 | PRD 08 §2.2 |
| SECURITY DEFINER RPCs Plan 03 | 7 | 2026-05-17 (B12 reversal) | PRD 03 §5.2 |
| Plan_status enum values | 5 ('active' \| 'past_due' \| 'cancelled' \| 'incomplete' \| 'trialing') | 2026-05-17 | PRD 04 §5.1 |

**Drift gate:** when any cap changes, founder edit lands in scope plan §6.7
FIRST, then every PRD citing the cap updates. CI grep (Plan 11 Task 11.x)
flags any PRD numerical that drifts from §6.7 row.
```

**Verify after edit:** scope plan §6 has subsections 6.1 → 6.7. Plan 11 CI grep references §6.7 table.

**Commit:**
```
fix(qa-w5b): W0-11 + W0-15 scope plan §6.6 task-compression convention + §6.7 numerical-caps appendix

Resolves Pattern-1 + Pattern-7 (CONSOLIDATED-TRIAGE.md L474+L478). Convention
documents per-component task-split rule (Plan 04/05/07b/08/11 already conform
post-W2/W3). Appendix consolidates 14 numerical caps into single SoT table
with founder-lock dates + canonical citations + drift gate.
```

---

## Quality gates (final sweep before claiming done)

Run AFTER all 7 commits land. Append to W5b PR / commit body.

```sh
# GATE 1: zero process.env.X! across plans (W0-9 callsite sweep)
test "$(grep -rcE 'process\.env\.[A-Z_]+!' docs/kova-final-impl-plans/ | awk -F: '{s+=$2} END {print s}')" = "0" || echo "FAIL GATE 1"

# GATE 2: production-context as any → 0 (test-fixture residue allowed)
# Manual review of any remainder

# GATE 3: zero <style scoped> across plans
test "$(grep -rcE '<style' docs/kova-final-impl-plans/ | awk -F: '{s+=$2} END {print s}')" = "0" || echo "FAIL GATE 3"

# GATE 4: loadEnvOrSkip helper exists + consumed
grep -q "loadEnvOrSkip" docs/kova-final-impl-plans/11-shared-ui-infrastructure-plan.md || echo "FAIL GATE 4 helper"
test "$(grep -rcE 'loadEnvOrSkip' docs/kova-final-impl-plans/ | grep -v ':0$' | wc -l)" -ge "3" || echo "FAIL GATE 4 consumers"

# GATE 5: scope plan §6 has 6.6 + 6.7
grep -q "^### 6.6" docs/kova-final-prds/00-PRD_SCOPE_PLAN.md && grep -q "^### 6.7" docs/kova-final-prds/00-PRD_SCOPE_PLAN.md || echo "FAIL GATE 5"

# GATE 6: Plan 11 has the new CI checks (acceptance mapping + Edge runtime + lock10)
grep -q "check:acceptance-mapping\|check:lock10\|W0-14a\|W0-14b" docs/kova-final-impl-plans/11-shared-ui-infrastructure-plan.md || echo "FAIL GATE 6"

# GATE 7: no .ts / .vue / .sql files in W5b diff (markdown only — spec-doc work)
test "$(git diff --name-only d5efe6d4..HEAD | grep -vE '\.md$' | wc -l)" = "0" || echo "FAIL GATE 7"
```

All 7 gates must print clean (no FAIL lines).

---

## Commit-order summary

| # | Commit | Wall-clock estimate |
|---|--------|---------------------|
| 1 | W0-13 loadEnvOrSkip helper + Plans 09/11/12 migration | 60-90min |
| 2 | W0-12 acceptance-mapping CI gate + 12-pair annotations | 60-90min |
| 3 | W0-14 Edge runtime CI gates (Vercel + Supabase) | 30-45min |
| 4a-d | CT-009 process.env.X! sweep (Plans 09/03/04/11) | 60-90min |
| 5a-h | CT-009 as any sweep (Plans 03/06/04/02/01/05/09/11) | 240-360min |
| 6 | Plan 02:3125 `<style scoped>` → Tailwind | 15-30min |
| 7 | W0-11 + W0-15 scope plan §6.6 + §6.7 | 45-60min |

**Total: 7-12 hours** (single agent, depending on `as any` triage depth).

---

## Bailout policy

STOP and ask founder if any of:

- A `process.env.X!` callsite reads an env var that doesn't exist in `.env.example` — that's a separate missing-env bug, not a W5b sweep candidate
- An `as any` cast doesn't cleanly fit bucket A/B/C/D from Section 5 triage table — **judgment fatigue**, STOP and ask founder. Do NOT blanket-replace
- A production `as any` requires a type the spec doesn't define (bucket B/C edge case) — surface for founder type-design call
- W0-12 acceptance-mapping reveals a PRD §8 bullet that maps to ZERO test in the paired plan — that's a test-coverage gap, separate fix-dispatch
- Founder lock conflict: a finding shows the lock is wrong (vs the recommended fix) — never silently override; ask

Never `--force`, never `--no-verify`, never commit without running quality gates first.

---

**End of W5b dispatch.**
