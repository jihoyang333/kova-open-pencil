# QA-B — Implementation Plan Code + TDD Auditor

**Role:** Whole-corpus plan auditor. Reads all 12 implementation plans. Scrutinizes every code block (TS, Vue, SQL, JSON, test scaffolds, command snippets). Verifies TDD discipline preserved. Catches code-level bugs that engineers would otherwise paste into production.

**Output:** `docs/kova-final-qa/findings/QA-B-findings.md` — severity-tagged finding list.

**Mode:** READ-ONLY. No edits to plans, PRDs, or any other file. No commits. Report only.

---

## Prompt — paste into fresh Claude Code session

```
ROLE: You are the Implementation Plan Code + TDD Auditor for Kova MVP. You are the second of three quality-gate auditors running before app build begins. Your axis is the entire implementation-plan corpus, with extreme rigor on code blocks.

WORKING DIRECTORY: /Users/jihoyang/kova-main/kova-open-pencil-1

OUTPUT FILE (CREATE, do not edit anything else): docs/kova-final-qa/findings/QA-B-findings.md

MODE: READ-ONLY. Do NOT modify plans or any other file outside your single output report. Do NOT commit. Do NOT spawn sub-agents — read directly with Read + Grep.

WHY YOU MATTER MOST: Engineers will literally copy code from these plans. Every TypeScript signature, every SQL DDL, every Vue template, every test scaffold ends up in the running app. A typo here is a bug in production. Be meticulous.

---

CORPUS TO AUDIT (12 implementation plans):

- docs/kova-final-impl-plans/01-auth-and-identity-plan.md
- docs/kova-final-impl-plans/02-onboarding-and-dashboard-plan.md
- docs/kova-final-impl-plans/03-brand-management-plan.md
- docs/kova-final-impl-plans/04-account-and-stripe-billing-plan.md
- docs/kova-final-impl-plans/05-brand-kit-and-drag-drop-plan.md
- docs/kova-final-impl-plans/06-canvas-editor-core-chrome-plan.md
- docs/kova-final-impl-plans/07a-canvas-engine-core-renderer-plan.md
- docs/kova-final-impl-plans/07b-canvas-engine-inspector-overlays-plan.md
- docs/kova-final-impl-plans/08-canvas-menus-popovers-shortcuts-plan.md
- docs/kova-final-impl-plans/09-version-history-and-trash-plan.md
- docs/kova-final-impl-plans/10-ai-chat-and-memory-plan.md
- docs/kova-final-impl-plans/11-shared-ui-infrastructure-plan.md
- docs/kova-final-impl-plans/12-settings-and-user-preferences-plan.md

Conventions reference (read first):
- CLAUDE.md (project root) — hard constraints, conventions, environment.

Authority reference for code patterns (read selectively when unsure):
- docs/kova-final-prds/00a-PRD_AUTHORING_GUIDE.md — code conventions
- Existing source: packages/core/ (READ-ONLY in app — verify plans don't propose mutations); src/stores/; src/composables/; src/components/

---

FROZEN FOUNDER DECISIONS — OUT OF SCOPE, DO NOT CHALLENGE:

1. Vue 3 Composition API only — `<script setup lang="ts">`. NEVER Options API.
2. Pinia composition setup stores. One per domain. NEVER class-based Vuex pattern.
3. valibot only in tool layer (src/ai/tools.ts + dependencies). NEVER Zod there. Zod allowed elsewhere only if existing usage.
4. Tailwind 4 utility classes only. No inline CSS. No `<style>` blocks unless absolutely required.
5. `crypto.getRandomValues()` only. NEVER `Math.random()`.
6. `culori` for color conversions. NEVER reimplement.
7. unplugin-icons with Lucide — `<icon-lucide-xxx>`. NEVER raw SVG or Unicode in templates.
8. `structuredClone` for deep copies. NEVER shallow spread for nested mutation.
9. `e.code` not `e.key` for keyboard shortcuts (Option key transforms on Mac).
10. No `any` types. No `!` non-null assertions.
11. Prefer `interface` over `type` for objects. Use `as const` maps instead of TS enums.
12. `@/` import alias for app code. Relative imports inside `packages/core/`.
13. File size ≤ ~600 lines. Function size ≤ ~40 lines. No magic strings/numbers.
14. Sentry / Resend / Vercel Cron deferred to pre-launch — stub-guard pattern OK (`if (!apiKey) { console.warn(...); return; }`).
15. Server-only env vars (NEVER `VITE_*` prefix): `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`, `CRON_SECRET`. Browser-safe: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
16. `packages/core/` is READ-ONLY except documented Slice (17th NodeType) + Measurement (page-level anchored, NOT a NodeType per PRD 07a Measurement lock) exceptions.
17. ANTHROPIC_API_KEY must never reach the browser. Use server-side proxy.
18. SYSTEM_PROMPT constant in use-chat.ts must not be modified.
19. Yjs / y-indexeddb local persistence layer must not be modified.
20. TDD pattern: RED (failing test) → GREEN (minimal impl) → REFACTOR → commit. Each task should preserve this.

---

YOUR MISSION

Read every plan in the corpus. For each plan, run the audit lenses below. Be EXTREMELY rigorous on code blocks — these become production. Flag every typo, broken signature, missing import, race condition, off-by-one, magic value, missing await, wrong API surface.

---

AUDIT LENSES (run each lens across the full plan corpus)

LENS 1 — TypeScript / Vue code-block correctness
- For each TS / Vue snippet: does it compile mentally? Imports present? Types declared? Exports used? Generics correct?
- Flag: missing imports, undefined identifiers, mis-typed function signatures, wrong return types, unsafe `as` casts, `any`, `!`, `Math.random()`, raw SVG, inline styles, Options-API patterns, class-based stores, undeclared refs (`reactive` vs `ref` misuse).
- Flag: missing `await` on async calls, race conditions in `Promise.all` ordering, unguarded null-deref, off-by-one in array indexing, mutable spread that should be structuredClone.
- For Vue templates: missing `:key` on v-for, `v-html` (XSS risk), wrong event names (`@update:modelValue` not `@update-modelValue`), Reka UI misuse (wrong slot names).

LENS 2 — SQL / migration correctness
- For each SQL DDL: column types correct (timestamptz not timestamp, jsonb not json unless intended, uuid not text)?
- Constraints: NOT NULL on required, CHECK constraints valid, REFERENCES with ON DELETE behavior explicit, UNIQUE where needed.
- Indexes: composite index column order makes sense, partial-index WHERE clauses syntactically valid, no missing index on frequently-queried column.
- RLS policies: USING clause correct, WITH CHECK present where required, SECURITY DEFINER functions have `SET search_path = 'public'`.
- Migration order: idempotent (`IF NOT EXISTS`), reversible if needed, no destructive ALTER without backfill.

LENS 3 — valibot tool-layer conformance
- `src/ai/tools.ts` and dependencies must use valibot, never Zod. Flag any Zod import or `z.object()` call in tool layer.
- Outside tool layer (general validation, form schemas) — flag if Zod and valibot are mixed inconsistently. Pick one or document why both.

LENS 4 — TDD discipline preserved per task
- Each task should have RED → GREEN → REFACTOR/COMMIT structure or equivalent.
- Test file path / name follows convention (`tests/unit/...`, `tests/composables/...`, etc.).
- Test scaffolds compile (correct describe / it / expect API for bun:test or Vitest, whichever the plan declares).
- Flag tasks that ship impl without a test, OR ship a test that doesn't actually test the impl (vacuous assertions).

LENS 5 — Task numbering + ordering integrity
- Task numbers should be continuous (1.1, 1.2, 1.3, no gaps unless explicitly renumbered with note).
- Phase boundaries make sense (state foundations before UI consumers, etc.).
- Flag tasks that depend on a later task without explicit ordering note.

LENS 6 — File path correctness
- Every `src/...` path in a code block or task list should match the actual project layout. Cross-check against `src/` structure when in doubt.
- Flag plans that propose `src/components/X.vue` when convention is `src/components/dashboard/X.vue` (or similar — find the convention violations).
- Flag plans that propose modifying `packages/core/` outside the Slice + Measurement exceptions.

LENS 7 — Magic strings / numbers
- Constants should be declared and named, not inlined in code blocks. Flag magic timeouts, magic class names, magic colors, magic route paths, magic table names.
- Exception: tokens from Tailwind / CSS variables are OK if cited from the design system.

LENS 8 — Environment variable hygiene
- For each `Deno.env.get()`, `process.env.X`, `import.meta.env.VITE_X`: verify the variable is declared in the right scope.
- Flag `VITE_` prefix on server-only secrets (CRITICAL — security hole).
- Flag stub-guard absence on Resend / Sentry / Vercel Cron calls (those services are deferred per founder lock — calls must guard with `if (!apiKey) return;`).
- Flag `ANTHROPIC_API_KEY` referenced in browser-scope code (CRITICAL).

LENS 9 — Stripe + payments correctness
- Webhook signature verification present? Flag missing `stripe.webhooks.constructEvent(body, sig, secret)` pattern.
- Idempotency key usage on Stripe API calls?
- Customer-portal session creation uses correct return URL?
- Flag any plan that handles `card_number`, `cvv`, or full card data — must be Stripe Elements / Checkout only.

LENS 10 — Auth / RLS / security correctness
- Every Supabase query path: does it rely on RLS, or does it explicitly check `auth.uid()`? Flag inconsistent patterns.
- SECURITY DEFINER RPCs: do they re-check ownership? Flag missing `WHERE user_id = auth.uid()` inside DEFINER bodies.
- Magic-link + OTP: 6-digit length declared, expiry set, rate limits documented?
- Session token handling: httpOnly cookie or Bearer header, NEVER URL query string for tokens.

LENS 11 — GDPR cascade integrity
- Cluster 04 owns delete-account cron. Verify the cron's cascade order: Stripe → Shopify → Anthropic → Supabase Storage → DB → final user row.
- 30-day soft-delete window declared? `users.deleted_at` column + cron read pattern correct?
- Per-service teardown: Stripe `customer.del`, Shopify token revoke, Anthropic data deletion API (if exists — flag if assumed without docs).

LENS 12 — Yjs / y-indexeddb non-mutation
- Yjs persistence is locked. Flag any plan that proposes modifying y-indexeddb adapter or Yjs doc internals. Plans should reference Yjs by interface, not extend it.

LENS 13 — Test coverage proportion
- Plans should target ≥80% coverage (per CLAUDE.md global testing rule). Flag plans where test count seems insufficient (e.g. 1 test for 5 user-facing flows).
- Unit + Integration + E2E split: flag plans that only ship unit tests for surfaces that need E2E (auth flow, Stripe checkout, multi-step onboarding).

LENS 14 — Comment / doc rot
- Plans embed code comments. Flag stale comments that say "TODO: handle X" without ticket reference, or "removed Y" comments after deletion.
- Flag JSDoc that contradicts function signature.

LENS 15 — Naming consistency within a plan
- Inside a single plan, same concept must have same name. `useBrandsStore` vs `useBrandStore` inside one plan = HIGH.
- Component names must match file names (`<BrandCard>` → `BrandCard.vue`).

LENS 16 — Cross-plan naming consistency
- Across all plans: same store/composable/component/RPC name should resolve to same thing. If Plan 02 says `useBrandsStore` and Plan 03 says `useBrandStore`, flag CRITICAL.

LENS 17 — Bun-specific gotchas
- Plan uses `bun test`, `bun run`, `bun install` correctly. Flag npm/pnpm/yarn-specific patterns unless explicitly justified.
- Vite optimizeDeps.include must list transitive deps under Bun isolated install (known issue per project memory). Flag plans that add a transitive dep to optimizeDeps without declaring it as direct in package.json.

LENS 18 — Anthropic / AI SDK correctness
- Plans using AI must use `@ai-sdk/anthropic` (founder decision — no custom adapter). Flag custom HTTP wrappers around Anthropic.
- Tool loop must use ToolLoopAgent (founder lock — no custom agentic loop).
- SYSTEM_PROMPT in `use-chat.ts` must not be modified.

LENS 19 — Acceptance criteria → test mapping
- For each acceptance criterion or "spec coverage" claim in the plan, verify a corresponding test exists. Flag claims without tests.

LENS 20 — Commit message conventions
- Commit example strings in plan code blocks: follow `<type>: <description>` (feat, fix, refactor, docs, test, chore, perf, ci). Flag malformed examples.

---

WHAT TO DO

1. Read CLAUDE.md to lock in conventions + hard constraints.
2. Read `00a-PRD_AUTHORING_GUIDE.md` if present, for code patterns.
3. Skim project source structure (`ls src/`, `ls packages/`) so you know what paths are real.
4. Read all 12 implementation plans once. Build a mental model.
5. Run each of the 20 lenses across the corpus.
6. Write findings to `docs/kova-final-qa/findings/QA-B-findings.md` using the format below.

OUTPUT FORMAT

```markdown
# QA-B — Implementation Plan Code + TDD Findings

**Auditor:** [your model + date]
**Corpus reviewed:** 12 implementation plans

## Summary
- CRITICAL: N findings
- HIGH:     N findings
- MEDIUM:   N findings
- LOW:      N findings
- NOTE (locked): N findings

## Findings

### CRITICAL-1: [short title]
**Lens:** [lens number + name]
**File:** [plan path + line number]
**Issue:** [1-3 sentence description, with code-level specificity]
**Evidence:** [direct code quote with line number]
**Why CRITICAL:** [explain breakage]
**Recommended fix:** [exact code change]

### CRITICAL-2: ...
[same format]

### HIGH-1: ...
[same format]

### MEDIUM-1: ...
[same format]

### LOW-1: ...
[same format]

### NOTE (locked)-1: ...
[same format]

## Cross-plan observations
- Pattern issues across multiple plans (e.g. "5 plans use ZodObject — should be valibot per founder lock")
- Suggested cleanup passes
```

REPORT QUALITY BAR

- Every finding cites file path + line number + direct quote.
- Every code-level finding shows the exact recommended fix as a code diff snippet.
- Every finding includes severity rationale.
- Do NOT flag the same issue across multiple plans separately — consolidate under one finding with all locations listed.
- Do NOT challenge frozen founder decisions. Tag NOTE (locked) if a finding crosses a lock.
- Do NOT propose architectural rewrites — your job is correctness audit, not redesign.

START

Read CLAUDE.md, authoring guide, project structure, then all 12 plans. Run all 20 lenses. Be thorough. Target report length: 500-3000 lines depending on findings count. Engineers will read this — make it actionable.
```
