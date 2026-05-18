# Comprehensive Pre-PRD-Authoring Audit — Dispatcher

> **To the agent reading this:** You are about to perform the most consequential audit of the Kova project to date. Every PRD that gets authored from here on out will be built on the foundation you validate or fix. The founder has spent ~6 months making architectural + UX + product decisions. Your job is to **stress-test each one** + **fill every gap** that would otherwise force the PRD author to invent infrastructure on the spot.
>
> **Output: ONE comprehensive report** at `kova-open-pencil-1/docs/kova-final-prds/00c-COMPREHENSIVE_AUDIT_REPORT.md`. Your report becomes the **decision-input** the founder ratifies before PRD authoring begins. PRDs then author against ratified decisions — not invented ones.

---

## 0. Mission

This is a **two-part audit**:

### Part 1 — Decision + Infrastructure Stress-Test

Audit every founder decision (Q1-Q25) + every implied backend piece + every cross-cluster dependency. For each:

1. **Verify Figma alignment** where the founder intends to match Figma. Did they actually replicate it?
2. **Flag risks** — anti-patterns, footguns, decisions that might break under load, edge cases not considered.
3. **Recommend alternatives** — if a better/more efficient approach exists (per Supabase, Stripe, Vercel, Tauri, Vue 3 best practices), say so. Document the tradeoff.
4. **Classify reversibility** — HARD / SOFT / TRIVIAL. Critical: the founder needs to know which decisions are nearly impossible to reverse later vs trivial to flip.

**The founder has explicitly stated:**
- Solo MVP (no multiplayer) is SOLID — multiplayer easy to add later. Do NOT push back on this.
- "Bias toward overbuilding, build for the best product not the easiest build."
- "Cannot switch brands inside canvas" (Q17 reversal) is FOUNDER LOCKED.
- Image-export-only (no HTML export) is FOUNDER LOCKED.
- Figma replication where applicable is preferred.

Beyond those locked decisions: push back, recommend, propose alternatives. Be thorough. Be honest.

### Part 2 — Gap-Fill Decisions

The PRD author would otherwise invent these on the spot during authoring. NOT ACCEPTABLE per founder direction. Resolve every gap NOW:

- Exact SQL migrations (table creation, ALTER, indexes, FK constraints)
- Exact RLS policies per table (per-role, per-action)
- Exact Edge Function signatures (path, method, args, return shape, error responses)
- Exact RPC bodies (transaction boundaries, side effects, error handling)
- Exact cron schedules (frequency, retry, lock contention, idempotency)
- Cross-cutting infrastructure (rate limiting, background jobs, email, file uploads, webhooks, caching, logging, monitoring)
- Architecture choices not yet made (SSR vs SPA, optimistic UI, offline-online sync, multi-device session)
- Tooling + ops (CI/CD, preview deploys, migrations, staging, secrets, backups)

Every gap gets a **recommended decision** with **alternatives considered** + **tradeoff analysis**. Founder ratifies (or pushes back) before PRD authoring.

---

## 1. Mandatory references — read every file in full

### Source-of-truth documents

```
/Users/jihoyang/kova-main/kova-open-pencil-1/docs/superpowers/handoffs/design-overhaul/03-implied-surfaces-and-backend.md
/Users/jihoyang/kova-main/kova-open-pencil-1/docs/superpowers/handoffs/design-overhaul/q1-5-answers-03-implied-surfaces-and-backend.md
/Users/jihoyang/kova-main/kova-open-pencil-1/docs/superpowers/handoffs/design-overhaul/q6-25-answers-03-implied-surfaces-and-backend.md
/Users/jihoyang/kova-main/kova-open-pencil-1/docs/superpowers/handoffs/design-overhaul/02-figma-scope.md
/Users/jihoyang/kova-main/kova-open-pencil-1/docs/kova-final-prds/00-PRD_SCOPE_PLAN.md
```

### Design system

```
/Users/jihoyang/kova-main/main-main-kova-scope/design-system/design.md
/Users/jihoyang/kova-main/main-main-kova-scope/design-system/kova-hifi.css
/Users/jihoyang/kova-main/main-main-kova-scope/design-system/kova-hifi-light.css
/Users/jihoyang/kova-main/main-main-kova-scope/design-system/TOKEN_CANONICAL.md
```

### Project context

```
/Users/jihoyang/kova-main/CLAUDE.md
/Users/jihoyang/kova-main/main-main-kova-scope/handoff-docs/PRE_PRD_READINESS_AUDIT.md
/Users/jihoyang/kova-main/main-main-kova-scope/handoff-docs/PRE_PRD_READINESS_AUDIT_V2.md
```

### Hi-fi mockups (sample for visual cross-check)

```
/Users/jihoyang/kova-main/main-main-kova-scope/batch-b/Kova Canvas - Final.html     ← canvas chrome source-of-truth
/Users/jihoyang/kova-main/main-main-kova-scope/batch-a/dark/Kova Hi-Fi A7 Account Page - Dark.html    ← account page IA
/Users/jihoyang/kova-main/main-main-kova-scope/batch-a-additions/dark/Kova Hi-Fi B10 Stripe Returns - Dark.html
```

### Existing codebase (read to understand what exists vs net-new)

```
/Users/jihoyang/kova-main/kova-open-pencil-1/packages/core/                     ← engine (read-only per CLAUDE.md)
/Users/jihoyang/kova-main/kova-open-pencil-1/src/                                ← app code
  - composables/                                                                  ← existing composables
  - stores/                                                                       ← Pinia stores (useBrandsStore, useCanvasesStore, useEditorStore)
  - ai/tools.ts                                                                    ← AI tool layer (valibot only)
  - use-chat.ts                                                                    ← chat with SYSTEM_PROMPT (locked)
```

Use `grep` + `Read` to discover what exists. Don't assume.

### External docs to verify against (use WebFetch + Context7)

- **Figma help docs (help.figma.com)** — verify Figma alignment for any Q-decision claiming "Figma-exact" or "Figma-aligned"
- **Stripe SaaS guide (docs.stripe.com)** — verify Stripe Customer model + webhook patterns + Customer Portal flow
- **Supabase docs (supabase.com/docs)** — RLS best practices, Edge Functions patterns, Storage policies, cron via pg_cron, realtime channels
- **Shopify OAuth (shopify.dev)** — disconnect + revoke OAuth flow (per Q15 cascade)
- **Anthropic API docs** — chat history purging endpoint behavior (per Q15 cascade)
- **Tauri 2.0 docs (tauri.app)** — Eyedropper screen-wide on macOS pattern (Q20 Phase 2)
- **Yjs / y-indexeddb docs** — offline-first CRDT behavior, conflict resolution semantics
- **Vue 3 + Pinia + Reka UI best practices** — store patterns, composable patterns, primitive wrapping

**Use Context7 for any library (Vue, Pinia, Reka, Yjs, valibot, Vite). Use WebFetch for Figma/Stripe/Supabase/Shopify/Tauri/Anthropic.** Document every external lookup in the report's methodology section.

---

## 2. Part 1 — Decision + Infrastructure Stress-Test

### 2.A — Q1-Q25 founder decision review

For EACH of the 25 founder decisions, produce one audit block in the report:

```markdown
### Q[N] — [Decision short-name]

**Founder decision:** [restate exactly as documented in q1-5 / q6-25 docs]

**Reversibility class:** HARD / SOFT / TRIVIAL
- HARD = schema lock-in, data migration required to reverse, API surface change breaks clients
- SOFT = config change or feature flag flip, no data migration
- TRIVIAL = label change, CSS change, single-line code change

**Figma alignment claim verification:**
- Doc claims: "Figma-exact" / "Figma-aligned" / "Better than Figma" / "Diverges from Figma" / N/A
- Actual Figma behavior (per help.figma.com verification): [what Figma actually does]
- Match status: VERIFIED / DRIFT FROM CLAIM / N/A

**Risk analysis:**
- What could break? [list scenarios]
- Edge cases not considered? [list]
- Performance / scale concerns? [list]
- Compliance / security concerns? [list]

**Alternative approaches considered:**
- Alternative A: [describe + tradeoff]
- Alternative B: [describe + tradeoff]
- Why the founder's choice still wins / loses: [reasoning]

**Verdict:** ✅ PASS / ⚠️ FLAG / ❌ RECOMMEND REVISIT

**If FLAG or REVISIT:** Required founder action: [specific decision needed]
```

**Critical Q-decisions to audit deeply (highest stakes):**

- Q1 (Slice as 17th NodeType) — schema lock-in, scene graph compatibility
- Q2 (Mask renderer compositing) — renderer correctness across mask types
- Q5 (User prefs two-layer storage) — sync semantics, conflict resolution
- Q6 (Solo MVP, multiplayer code dormant) — **FOUNDER LOCKED, don't push back. BUT: verify the "dormant code path" doesn't accidentally activate or leak state. Confirm clean removal of all UI surfaces.**
- Q7 (Snapshot model) — 100MB quota, 30-min cadence, Kiwi+Zstd compression — verify production viability at scale
- Q11 (Measurement as 18th NodeType) — schema lock-in, Figma compatibility
- Q12-Q14 (Account + Stripe) — Customer-per-user model, webhook idempotency, subscription state sync
- Q15 (GDPR cascade) — multi-service deletion order, failure recovery, partial-success handling
- Q17 (Brand-switch only from dashboard) — **FOUNDER LOCKED, don't push back. Verify Q17 is internally consistent across all hi-fi files.**
- Q19 (Trash indefinite retention) — storage cost trajectory at scale
- Q22 (JPG quality levels) — pixel-equivalence with Figma's actual JPG export
- Q23 (Copy/Paste full property set) — what about across-canvas paste? Across-brand paste?
- Q24 (Drag-drop semantics) — receiver behavior in edge cases (empty canvas, multi-select, modifier-key combos)

**Less-stakes Qs (audit briefly):**
- Q3 partial (engine audit) — verify the 9 engine-ready features actually have the APIs claimed
- Q8 (tone snippets + saved blocks JSONB) — verify JSONB indexes + query performance
- Q9 (single Assets panel) — verify `public.media` table has `brand_id` FK + RLS
- Q10 (Recent colors localStorage) — verify per-device makes sense for marketers using multiple machines
- Q16 (Avatar dropdown items) — verify all items map to actionable surfaces
- Q18 (Right-click overflow `•••` vs canvas right-click) — verify the action-set split is internally consistent
- Q20 (Eyedropper canvas-only MVP) — verify Tauri Phase 2 path is technically feasible
- Q21 (Image fill modes) — verify all 4 modes have engine API support per Q3 audit
- Q25 (Keyboard categories) — verify the 13 categories don't have orphan shortcuts

### 2.B — Backend infrastructure depth review

Per `03-implied-surfaces-and-backend.md §3C` — review each of the 9 net-new backend pieces. For each, audit:

1. **Production-readiness check** — is the architecture sketch enough to build from? Or are there critical gaps a PRD author would have to invent?
2. **Schema sufficiency** — does the proposed schema cover all current AND known-future requirements? Any obvious missing columns/indexes/constraints?
3. **RPC / Edge Function coverage gaps** — are all needed server-side operations identified? Any edge case (concurrent edits, partial failures, retry logic) not addressed?
4. **Cron / retention / quota enforcement gaps** — for any feature with retention or quota policy: how is enforcement actually implemented? What happens on quota-breach? Race conditions?
5. **External integration completeness** — Stripe, Shopify, Anthropic, Supabase Storage — every external touchpoint specified? Webhook signature verification? Idempotency keys? Retry-with-backoff?

**Net-new backend pieces to audit (per 03 doc §3C):**

| # | Piece | Key audit questions |
|---|-------|---------------------|
| 1a | Core mods (lift core lock) | Schema-level: scene-graph version bump, downgrade path, CHANGELOG-KOVA.md format. |
| 1b | Renderer-only changes | Mask compositing perf — does it scale with mask depth? Effects already shipped — verify no PR debt. |
| 1c | Inspector wiring | Multi-property edit batching, undo granularity, dirty-state tracking. |
| 1d | App-level overlays | Z-index management between overlays, hit-test interaction, perf with multiple overlays. |
| 2 | Snapshot/version-history store | Storage cost at scale (100MB × N brands), prune cron contention, restore atomicity, byte-format versioning, downgrade path. |
| 3 | User preferences storage | Conflict resolution (multi-device write conflict), debounce strategy, offline-write queue. |
| 4 | Brand font upload | Font format validation, license attestation, font-name collision per brand, runtime registration with CanvasKit. |
| 5 | Account page + Stripe | Webhook idempotency, subscription state desync recovery, Customer Portal redirect flow, plan-tier downgrades. |
| 5b | GDPR delete-account cascade | Cascade order, partial-failure handling, retry-with-backoff, audit log, RoPA compliance. |
| 7 | Right-click context-menu shell | Action registration pattern, surface-specific filtering, keyboard shortcut display. |
| 8 | useConfirm() composable | Typed-confirm pattern, validation, destructive-style theming. |
| 9 | Keyboard shortcut registry | Conflict detection, customization unlock-readiness, accessibility (aria-keyshortcuts). |
| 10 | Main-menu composable | Submenu lifecycle, nested-menu state, click-outside-to-close behavior. |
| 11 | Find composable | Text search scope (TEXT content + layer names + frame names + page names — confirm), search index, debounce, highlight rendering. |
| 13 | Properties panel "Page" section | Right panel tab routing when no selection. |
| 14 | reorderPage / duplicatePage actions | Engine reorder primitive verification, undo granularity. |
| 15 | Network status indicator | Signal source (Yjs vs Supabase Realtime vs `navigator.onLine`), debouncing, false-positive handling. |

### 2.C — Design system implementation-readiness

The hi-fi mockups use `kova-hifi.css` directly. PRDs author against this CSS for spec, but engineers must translate to Vue 3 + Tailwind 4 + Reka UI.

Audit:

1. **Token translation path** — `kova-hifi.css :root` block → `app.css @theme` directive. For each token: which Tailwind utility class will reference it? Any tokens that resist Tailwind translation (e.g. `--accent-soft` rgba vs opaque hex)?
2. **Component class → Vue component mapping** — for each `kova-hifi.css` class primitive (`.btn`, `.dlg`, `.toast`, `.menu`, `.popover`, `.field`, `.input`, `.seg`, `.pill`, etc.), identify:
   - Which Reka UI primitive wraps it (Dialog, Popover, DropdownMenu, etc.)
   - Which Vue component should own the markup contract
   - Any class-level styling that can't be expressed in Tailwind utility classes
3. **Banned-pattern enforcement strategy** — design.md §5 has 14 bans. How are these enforced at code-review time? At lint time? At runtime?
4. **`.kc {}` scoped tokens vs `:root` global tokens** — canvas chrome uses scoped tokens. How does Vue component author handle this scoping? Is the canvas chrome a single shadow-root component or document-scoped?
5. **Light theme cohabitation** — `kova-hifi-light.css` only on auth + marketing. How does the app detect which CSS to load? Route-level? Layout-level? Hard-coded?

### 2.D — Cross-cluster dependencies + sequencing review

Audit the PRD scope plan §3 + §4:

1. **Are the 12 cluster groupings cohesive?** Or are there cross-cluster cohesion problems (e.g. one cluster owns a primitive used everywhere — should it be its own cluster?)
2. **Cluster size estimates** — are any clusters too large? Should 06 (Canvas Editor Core Chrome) split? Should 07 (Engine Extensions) split into 07a + 07b as the scope plan suggests?
3. **Cluster boundary clarity** — for every cross-cut in §6 of scope plan: is the boundary clean, or do PRDs need to share state/types/composables that aren't owned anywhere yet?
4. **Wave dependency correctness** — are wave dependencies real, or can clusters parallelize more aggressively?
5. **Hidden dependencies** — are there cluster-pair dependencies the scope plan missed?

### 2.E.1 — Shopify M9 integration review (CRITICAL — read all of this section)

**Context:** Kova has a partially-shipped Shopify integration on branch `feat/m9-shopify` (current working branch). M9 was built by an autonomous agent ("Ralphy") in 2026-04-21 without explicit alignment requirements to the founder's specific onboarding flow (StoreTypeStep) + settings integrations page UX intent. Ralphy worked from a generic "freelance marketer connects Shopify" spec. The founder is uncertain whether M9 is built FOR what Kova specifically needs, and whether it's actually complete.

**State snapshot (per memory observations + git status 2026-05-13):**

- M9 final commit `1d59f915` 2026-04-21 claimed "all phases shipped, handoffs 00 + 09 gates passed"
- 20 modified files UNCOMMITTED post-final-commit (polling fallback added 2026-04-25 + main-thread schema bug fix 2026-05-13 + other edits)
- 18 unit tests FAILING on Shopify surfaces (BrandContextPill Vue/Reka render mocks + others — unrelated to schema fix; pre-existing)
- Manual smoke NOT DONE (founder-owned per Handoff 12 Task D)
- Vercel prod deploy NOT STARTED (Handoff 14 documents the deploy plan)
- AI tool schema bug (objectSchema → valibotSchema swap on 5 tools) FIXED 2026-05-13 by main thread. Tests pass.

**Existing M9 surface inventory:**

```
kova-open-pencil-1/api/shopify/         ← 18 routes (oauth, sync, webhooks, brand-kit-extract, compliance, cron)
kova-open-pencil-1/src/composables/use-shopify-connection.ts
kova-open-pencil-1/src/stores/shopify-products.ts
kova-open-pencil-1/src/ai/kova-tools.ts ← 5 Shopify AI tools (schema bug fixed)
kova-open-pencil-1/src/components/onboarding/StoreTypeStep.vue  ← onboarding Shopify connect step
kova-open-pencil-1/src/components/dashboard/IntegrationsCard.vue ← dashboard integrations card
kova-open-pencil-1/src/views/dashboard/SettingsBrandIntegrationsView.vue ← settings integrations page
kova-open-pencil-1/src/canvas-extensions/product-variant/ ← canvas Shop panel + product variant bindings
kova-open-pencil-1/supabase/migrations/2026042*_m9_*.sql ← DB migrations
kova-open-pencil-1/tests/e2e/m9-shopify.spec.ts ← E2E test (skipped without creds)
the-official-kova-test/shopify.app.toml ← Shopify Partner app config (localhost URLs)
```

**Required audit (11 checks):**

For EACH of these 11, produce an audit block in the report:

1. **Onboarding alignment.** Does `StoreTypeStep.vue` match Q17 + Cluster 02 PRD intent? Verify: store-type selector UX, Shopify OAuth trigger, error handling on connection failure, idempotent re-entry if user comes back to onboarding mid-flow.
2. **Settings alignment.** Does `SettingsBrandIntegrationsView.vue` match Q12 + Q13 + Cluster 04 PRD intent? Verify: per-brand picker dropdown (Q13 per-brand scope for Integrations section), Shopify connection status display, reauthorize button, disconnect button, sync history accordion, realtime sync progress bar, deep-link to Shopify Admin.
3. **Per-brand isolation.** Per Q13: Shopify connection scoped per-brand (not per-user). Verify: `shopify_connections.brand_id` FK + RLS policy enforcing per-brand row access. Verify: UI per-brand pickers + state isolation across brands.
4. **Brand-kit auto-extract alignment.** Does `api/shopify/brand-kit-extract.ts` align with Cluster 05 (Brand Kit) + Q8 (tone snippets + saved blocks) + Q24 (drag-drop)? Specifically: does it auto-populate `brands.colors`, `brands.fonts`, `brands.logo_url`, `brands.voice`, `brands.tone_snippets`, `brands.saved_blocks` from store theme + metafields? If not, what does it auto-populate?
5. **5 AI tools alignment.** Post-bug-fix, verify each of `search_products`, `get_collection`, `get_variant`, `get_active_discounts`, `get_shop_context`:
   - Brand-scoped query (filters by `brand_id`)
   - Q3 audit alignment (engine-ready features the tool depends on)
   - Q8 integration (tone-snippet injection into system prompt — is the brand context fed correctly?)
   - Cluster 10 AI Chat alignment (tool registration + ToolLoopAgent integration)
   - Error handling when no Shopify connected for the active brand
6. **GDPR cascade for Shopify side.** Per Q15: account-deletion cron must disconnect Shopify + revoke OAuth token. Verify: `delete-account-cron` Edge Function has Shopify disconnect step. Verify: webhook signature handling for Shopify-side `app/uninstalled` event. Verify: partial-failure handling (account deletion succeeds even if Shopify revoke fails).
7. **18 failing unit tests root-cause.** Identify exactly which 18 tests fail. Categorize:
   - Pre-existing mock-related failures (BrandContextPill + Vue/Reka integration)
   - Schema-related failures (now FIXED via 2026-05-13 schema bug fix)
   - Other
   For each: BLOCKER / FLAKY / TEST-DEBT. Recommend remediation.
8. **20 uncommitted file review.** For each modified file: classify CORRECT-AS-IS (commit), NEEDS-FIX (refactor before commit), DISCARD (revert), or BUG-FIX-COMMITTED-ELSEWHERE.
9. **Sync architecture (polling fallback) production-readiness.** Per Handoff 14: polling endpoint added 2026-04-25 because webhooks can't reach localhost/CI. Verify: in production with public URL, webhook is primary path + polling is silent backstop. Verify: idempotent upsert prevents double-processing. Verify: 5-minute timeout is appropriate for production stores >100k SKUs.
10. **Schema migrations applied vs pending.** List every Shopify-related migration in `supabase/migrations/`. Verify: each is applied to the local Supabase project. Verify: RLS policies match per-brand isolation (#3 above). Identify any migration that's locally applied but not idempotent (production-risk).
11. **Manual smoke test recipe.** Per Handoff 12 Task D: founder-owned manual smoke. Produce a step-by-step founder-executable script (10-15 numbered steps) that exercises: signup → onboarding StoreTypeStep → Shopify OAuth → sync wait → canvas → product drag → price assert → disconnect → unavailable badge. Include expected verification at each step.

**Required output per check:** PASS / FLAG (with severity HIGH/MEDIUM/LOW) / GAP (with recommended fix). Reference specific files + line numbers + Q-decision IDs.

**M9 Verdict:** ✅ READY (M9 features integrated + production-bound) / ⚠️ READY WITH FIXES (specific gaps need addressing before PRD authoring proceeds in clusters touching Shopify) / ❌ NOT READY (M9 design conflicts with founder intent — re-architecture required).

### 2.E — Hard-to-reverse decision watchlist

**THIS IS THE MOST IMPORTANT PART OF PART 1.** The founder needs a single list of every decision that is HARD to reverse later. Categorize:

- **SCHEMA** — column types, indexes, FK constraints, migration order. Reversal requires data migration, downtime risk.
- **DATA-MODEL** — JSONB vs normalized columns, table proliferation, soft-delete vs hard-delete. Reversal requires backfill.
- **API SURFACE** — public Edge Function signatures, RPC names + arg shapes, Tauri command names. Reversal breaks clients.
- **SCENE-GRAPH** — NodeType numbering (17th SLICE, 18th MEASUREMENT). Reversal requires version migration in stored canvases.
- **PROTOCOL** — Yjs CRDT compatibility, snapshot byte format (Kiwi+Zstd), upstream OpenPencil compatibility (per CLAUDE.md amendment + CHANGELOG-KOVA.md). Reversal breaks stored data.
- **INTEGRATION** — Stripe Customer model (per-user vs per-brand), webhook event handlers, Shopify OAuth scope, Anthropic API contract assumptions. Reversal requires migration on existing data.
- **AUTH / IDENTITY** — Magic-link vs OTP vs password, session model, GDPR cascade order, soft-delete grace period. Reversal touches every user record.
- **ROUTING** — URL structure (/account/:section?, /canvas/:canvasId), deep-link compatibility. Reversal breaks bookmarks.

Produce a table:

| Decision | Source (Q# or §3C piece) | Reversibility class | Reversal cost (if reversed in 6 months) | Recommended ratification action |

If anything on this list is **NOT currently ratified by an explicit founder decision** — flag it as **REQUIRES_FOUNDER_RATIFICATION_NOW.**

---

## 3. Part 2 — Gap-Fill Decisions

For every gap below, your output report MUST include:
- **Recommended decision** (concrete, implementation-ready)
- **Alternatives considered** (at least 2)
- **Tradeoff analysis** (cost / benefit / risk)
- **Reversibility class** of the recommended decision

### 3.A — Per-cluster production-ready spec gaps

For EACH of the 12 PRD clusters (per `00-PRD_SCOPE_PLAN.md` §3), produce:

```markdown
### Cluster NN — [Name]

#### SQL migrations (full text, paste-able)

```sql
-- Migration 001 — [purpose]
[exact SQL]
```

#### RLS policies (per table, per role, per action)

```sql
-- Table: [name]
CREATE POLICY [name] ON [table] FOR [action] TO [role] USING ([clause]) WITH CHECK ([clause]);
```

#### Edge Function signatures

```typescript
// Path: /functions/v1/[function-name]
// Method: POST/GET/...
// Auth: required / optional / service-role-only
// Request body:
type RequestBody = { ... }
// Response body:
type ResponseBody = { ... } | { error: string }
// Error codes: 400 / 401 / 403 / 404 / 409 / 422 / 429 / 500
// Idempotency: required / optional / N/A (idempotency key in header `X-Idempotency-Key`)
// Rate limit: N req/min per user
```

#### RPC function bodies

```sql
CREATE OR REPLACE FUNCTION [name]([args]) RETURNS [type] AS $$
DECLARE
  ...
BEGIN
  ...
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Transaction boundary: implicit / explicit BEGIN/COMMIT
-- Side effects: [list]
-- Error handling: [list]
```

#### Cron jobs

| Name | Schedule | Function | Retry | Idempotency | Lock contention | Owner |
|------|----------|----------|-------|-------------|-----------------|-------|

#### Pinia store shapes

```typescript
// Path: src/stores/[name].ts
export const use[Name]Store = defineStore('[name]', () => {
  // State
  const [field] = ref<[type]>([initial])
  // Getters
  const [getter] = computed(() => ...)
  // Actions
  async function [action](...) { ... }
  return { [field], [getter], [action] }
})
```

#### Composable signatures

```typescript
// Path: src/composables/use-[name].ts
export function use[Name](options: { ... }) {
  // Returns
  return {
    [field]: Ref<[type]>,
    [method]: (args) => Promise<[type]>,
  }
}
```

#### Component shells (leaf components only — sub-trees in mockup)

```vue
<!-- src/components/[Name].vue -->
<script setup lang="ts">
defineProps<{ [prop]: [type] }>()
defineEmits<{ [event]: [args] }>()
</script>
```
```

Cover all 12 clusters. For each gap that requires founder decision (e.g. "which background-job queue?"), embed the **Recommended Decision** block.

### 3.B — Cross-cutting infrastructure decisions

For each of these, produce a **Recommended Decision** block:

1. **Rate limiting strategy** — per-endpoint? per-user? per-IP? Implementation: Supabase Edge / Vercel Middleware / Upstash Ratelimit / custom?
2. **Background job queue** — Inngest / Trigger.dev / Supabase Edge cron / pg_cron / Vercel Cron / SQS / none?
3. **Email service** — Resend / Supabase Auth built-in / SendGrid / Postmark / AWS SES?
4. **File upload size caps** — per file (image / font / video?), per brand (storage quota), per user (cumulative).
5. **MIME type validation strategy** — server-side per upload? Magic-number sniff or trust extension?
6. **Storage bucket structure** — per-brand-isolated? user-isolated? shared-with-RLS? Naming convention (`brand_assets`, `canvas_snapshots`, `user_avatars`, etc.).
7. **Webhook signature verification** — Stripe (HMAC-SHA256 per Stripe docs), Shopify (HMAC-SHA256 per Shopify docs), idempotency strategy (replay protection).
8. **Feature flag system** — LaunchDarkly / GrowthBook / Vercel Edge Config / Supabase config table / hard-coded?
9. **Caching strategy** — Supabase Realtime channels for live invalidation? SWR-style stale-while-revalidate in composables? Pinia getter memoization? Service Worker cache for assets?
10. **Logging strategy** — Sentry / Axiom / Supabase logs / Vercel logs / structured JSON to stdout?
11. **Error tracking + alerting** — Sentry / Highlight / Bugsnag? Alert routing (Slack / email / PagerDuty)?
12. **Monitoring strategy** — Vercel Analytics for Web Vitals? Sentry Performance? Supabase Dashboard? Custom Grafana?
13. **Anthropic API key management** — single key vs per-tier? Cost monitoring + alerting? Rate limit handling?
14. **Migration runner** — Atlas / Supabase migrations / sqitch / dbmate / plain `psql`?
15. **Pre-commit hooks** — Husky / lefthook / native git hooks? What runs (oxlint + oxfmt + tsc + tests)?

### 3.C — Architecture decisions not yet made

1. **SSR vs SPA for marketing+auth** — Nuxt 3 / Vite SPA / Astro? (Light-theme auth + marketing surfaces; user not yet authenticated.)
2. **Browser-only vs Tauri-first execution model** — per CLAUDE.md the app runs both as Tauri desktop + browser via Vite dev. How does feature detection work? Which features Tauri-only (eyedropper screen-wide Q20 Phase 2)? File-system access? Native menu bar?
3. **Local-first persistence interaction with Supabase** — Yjs + y-indexeddb handles offline canvas state. How does it sync with Supabase on reconnect? Conflict resolution semantics? "Sync indicator" UX during reconnect (cross-cut to §3C #15)?
4. **Optimistic UI patterns** — for mutations (create brand, save snapshot, update name), do we optimistically update Pinia + revert on error? Or pessimistic + show spinner?
5. **Offline → online state migration** — user creates canvas offline, comes online; how does it persist? Created at correct user ID? Per-brand association?
6. **Anonymous → authenticated user state** — does the marketing site have any anon-user state (e.g. demo canvas) that migrates on signup? If yes, how?
7. **Multi-device session handling** — user logged in on 2 devices, opens same canvas; Yjs CRDT handles collab but how do we show "another device is editing"? Or do we lock?
8. **Browser tab focus / blur behavior** — autosnap pauses on blur? Resumes on focus? Save-on-tab-close hook (per Q7)?
9. **Network failure UX** — granular per-action ("Failed to save snapshot. Retry?") or global ("You're offline. Changes will sync when reconnected")?
10. **Database client architecture** — direct PostgREST / supabase-js client / generated client (e.g. Kysely / Drizzle / Prisma)?
11. **Realtime channel architecture** — per-canvas? per-brand? per-user? How many concurrent channels per session?
12. **Image rendering pipeline** — canvas → PNG export: canvas-native `toBlob` or render-on-server? Quality control? Color profile?
13. **Image-fill caching** — when user drops an image onto canvas, store in `public.media` and reference by URL, or inline base64? CDN strategy?
14. **AI streaming response handling** — chat streaming via `@ai-sdk/anthropic` — how do tool calls interleave with text? Tool argument typing (valibot per CLAUDE.md)?
15. **Font loading + flash-of-unstyled-text** — Inter loaded via Google Fonts (per kova-hifi.css). Self-host? `font-display: swap`? Preload?

### 3.D — Tooling + ops gaps

1. **CI/CD pipeline definition** — Vercel for marketing+auth? GitHub Actions for Tauri builds (mac/win/linux)? Vercel Preview for PR review?
2. **Preview deployment strategy** — per PR Vercel Preview URL? Authenticated previews?
3. **Production deployment + rollback** — Vercel auto-deploy on main? Rollback via `vercel rollback`? Database migration order (pre/post deploy)?
4. **Database migration runner** — per CLAUDE.md memory `project_supabase_migrations_pattern` (verify exists).
5. **Test environment setup** — separate Supabase project for E2E? Mocked client?
6. **Staging vs production data isolation** — separate Supabase project? Separate Stripe account? Separate Anthropic project?
7. **Secrets management** — Vercel env vars per environment? Doppler? AWS Secrets Manager? Server-only vs browser-exposed (CLAUDE.md VITE_ prefix rule)?
8. **Backup strategy** — Supabase PITR per Q15 (7-day free tier); long-term archival to S3?
9. **Disaster recovery RTO/RPO** — what's acceptable downtime / data loss?
10. **Performance budgets** — Core Web Vitals targets for marketing+auth? Canvas FPS targets for editor?
11. **Accessibility audit pre-launch** — axe-core CI integration? Manual VoiceOver/NVDA pass?
12. **Privacy compliance** — GDPR ROPA per Q15 → who owns? Cookie banner if cookies in EU? Analytics consent (PostHog? Plausible? Vercel Analytics privacy-first?)
13. **Customer support channel** — Intercom? Help Scout? Email-only? In-app feedback widget?

---

## 4. Verdict thresholds

| Verdict | Criteria |
|---------|----------|
| ✅ APPROVED FOR PRD AUTHORING | All Q1-Q25 audited with verdict PASS or FOUNDER_LOCKED. Zero hard-to-reverse decisions flagged as REQUIRES_FOUNDER_RATIFICATION_NOW. All Part 2 gaps filled with recommended decisions. |
| ⚠️ REQUIRES FOUNDER RATIFICATION | Some Part 2 gap-fill recommendations need founder sign-off before PRD authoring can proceed safely. Document each + provide AskUserQuestion-style decision blocks. |
| ❌ BLOCKING FINDINGS | Any Q-decision FAIL (Figma claim wrong + product would break) OR critical hard-to-reverse decision unresolved. Founder must address before PRD work continues. |

---

## 5. Report file structure

Save to: `/Users/jihoyang/kova-main/kova-open-pencil-1/docs/kova-final-prds/00c-COMPREHENSIVE_AUDIT_REPORT.md`

Structure (in order):

```markdown
# Kova Pre-PRD-Authoring Comprehensive Audit

**Audit date:** 2026-05-13
**Auditor:** [agent identifier]
**Methodology:** Independent. Read every source doc. Verified Figma claims via help.figma.com (cite URLs). Verified library/service patterns via Context7 + official docs.

## Verdict: ✅ APPROVED / ⚠️ REQUIRES FOUNDER RATIFICATION / ❌ BLOCKING FINDINGS

## Executive summary
[3-5 paragraph plain-English summary for non-technical founder. Bullet the top 10 most important findings.]

---

# Part 1 — Decision + Infrastructure Stress-Test

## 1.A — Q1-Q25 Founder Decision Review
[25 audit blocks, one per Q, per §2.A template]

## 1.B — Backend Infrastructure Depth Review
[Audit block per net-new piece in 03 doc §3C, per §2.B template]

## 1.C — Design System Implementation-Readiness Review
[Token translation, component mapping, ban enforcement, .kc scoping, light cohabitation findings]

## 1.D — Cross-Cluster Dependencies + Sequencing Review
[Audit findings on 00-PRD_SCOPE_PLAN.md §3 + §4]

## 1.E — Hard-to-Reverse Decision Watchlist
[Sortable table of every hard-to-reverse decision]

---

# Part 2 — Gap-Fill Decisions

## 2.A — Per-Cluster Production-Ready Specs
### Cluster 01 — Auth & Identity
[full SQL + RLS + Edge Function signatures + RPC bodies + cron + Pinia + composable + component shells]
### Cluster 02 — Onboarding & Dashboard
[...]
### Cluster 03 — Brand Management
[...]
### Cluster 04 — Account Page + Stripe Billing
[...]
### Cluster 05 — Brand Kit & Drag-Drop
[...]
### Cluster 06 — Canvas Editor Core Chrome
[...]
### Cluster 07 — Canvas Engine Extensions
[...]
### Cluster 08 — Canvas Menus, Popovers, Context Menus & Shortcuts
[...]
### Cluster 09 — Version History + Snapshot + Trash
[...]
### Cluster 10 — AI Chat + Memory + Tool Layer
[...]
### Cluster 11 — Shared UI Infrastructure
[...]
### Cluster 12 — Settings + User Preferences
[...]

## 2.B — Cross-Cutting Infrastructure Decisions
[15 recommended-decision blocks]

## 2.C — Architecture Decisions Not Yet Made
[15 recommended-decision blocks]

## 2.D — Tooling + Ops Gaps
[13 recommended-decision blocks]

---

# Top 10 Priority Items for Founder Review

[The 10 most consequential items from Parts 1 + 2 that the founder MUST address before PRD authoring begins. Format as:]

| Rank | Item | Why critical | Recommended action | Reversibility class |

---

# Methodology + Sources

## Files read
[full list of files Read]

## External sources consulted
[Figma help URLs cited, Stripe docs sections, Supabase docs sections, Shopify, Anthropic, Tauri, Yjs, Vue/Pinia/Reka]

## Commands run
[every grep / find / WebFetch / Context7 query]

---

# Final verdict reasoning

[2-4 paragraph commitment to one of the 3 verdicts, with reasoning]
```

---

## 6. Guardrails

1. **READ-ONLY.** The only file you write is the audit report at `kova-open-pencil-1/docs/kova-final-prds/00c-COMPREHENSIVE_AUDIT_REPORT.md`. No edits to any other file.
2. **Tools allowed:** Read, Bash (grep / diff / wc / awk / ls / find), Glob, WebFetch, WebSearch, Context7. No Edit. No Write except the report.
3. **Skill allow-list:** `superpowers:verification-before-completion` only.
4. **No subagents.** You execute every check yourself.
5. **No git operations.**
6. **Trust nothing.** Re-verify every Figma claim via help.figma.com. Re-verify every library claim via Context7. Re-verify every service claim via official docs.
7. **Be exhaustive.** Don't sample where exhaustive audit is feasible. All 25 Qs. All 12 clusters. All 4 cross-cutting sections.
8. **Document every external lookup.** Cite URL + key quote in methodology section.
9. **Severity discipline.** PASS / FLAG / REVISIT — use the right tier. HARD / SOFT / TRIVIAL reversibility — use the right tier.
10. **Verdict commitment.** Pick ONE of three. No hedging.
11. **Don't propose redesigns.** Audit existing decisions. Recommend alternatives, but the founder ratifies — you don't decide.
12. **No truncation.** Founder reads top-to-bottom. Length is fine.
13. **Concrete recommendations only.** "Consider X" is not acceptable. "Use X because Y, alternative Z rejected because W" IS acceptable.
14. **Quote founder-locked decisions verbatim** — don't paraphrase, don't push back on Solo MVP (Q6), Brand-switch only from dashboard (Q17), or image-export-only.
15. **AskUserQuestion-style decision blocks** for any gap requiring founder ratification. Format:
    ```
    **REQUIRES FOUNDER RATIFICATION:** [decision description]
    - Option A (Recommended): [details, tradeoff]
    - Option B: [details, tradeoff]
    - Option C: [details, tradeoff]
    - Reversibility class: [HARD/SOFT/TRIVIAL]
    ```

---

## 7. Scope clarifications (do not flag as gaps)

- **B12 (archived brands)** — SCOPE REMOVED 2026-05-13. Do not flag absence.
- **B13 (per-brand sub-routes)** — SCOPE REMOVED 2026-05-13. Do not flag absence.
- **Marketing site (landing/pricing/legal)** — out of scope per project. Do not flag absence.
- **Multiplayer** — FOUNDER LOCKED solo MVP. Do not push back. But DO verify code-path cleanliness.
- **HTML export** — FOUNDER LOCKED image-export only. Do not push back.
- **Brand-switch inside canvas** — FOUNDER LOCKED no in-canvas switch (Q17 reversal). Do not push back.
- **Pricing tiers + launch strategy** — FOUNDER explicitly out of scope per Q14. Stripe foundation only.
- **Status color palette + motion tokens** — Phase 2 deferred per design.md §5. NIT only.
- **Components / Prototyping panels** — DEFERRED per Q25 (hidden categories).
- **`kova-open-pencil-1/design-system/MASTER.md`** — retired 2026-05-13. Pointer only.

---

## 8. What "GOOD ENOUGH" looks like

The audit report is GOOD ENOUGH when:

- A non-technical founder can read the executive summary + top-10-priorities and know exactly what's locked, what needs decision, and what's at risk.
- A PRD-author agent can pick up any cluster from §2.A and have **every SQL migration, every RLS policy, every Edge Function signature, every RPC body, every cron schedule** ready to paste into the PRD — no invention required.
- Every founder decision (Q1-Q25) has either a stamp of approval OR a specific recommendation for revision.
- Every hard-to-reverse decision is on a single watchlist with reversal cost estimate.
- Every cross-cutting infrastructure decision has a recommended answer with alternatives documented.

If the audit report doesn't meet these criteria, it's not done.

---

## 9. Begin

Read the dispatcher in full. Read all §1 mandatory references. Begin Part 1 audit (start with Q1, work through Q25). Then Part 2 gap-fill (start with Cluster 01, work through Cluster 12). Then cross-cutting (§2.B, §2.C, §2.D). Then Top 10. Then final verdict.

Estimated runtime: 3-5 hours of deep work. Don't rush.

When done: save report. Paste verdict + top-10 priorities to chat.
