# Kova Fix Dispatch — Orchestration

**Date authored:** 2026-05-19
**Source of truth:** `kova-open-pencil-1/docs/kova-final-qa/CONSOLIDATED-TRIAGE.md` (158 unique findings across 13 clusters)
**Total dispatch agents:** 8 (across 5 waves)
**Estimated wall-clock effort:** ~3-5 days if waves run in sequence, ~1.5-2 days if waves parallel-pack as designed

---

## How to read this directory

This `fix-dispatch/` directory contains **8 paste-ready dispatch prompts**. Each prompt is the **entire content the founder pastes into a fresh Claude Code session**. No additional setup required.

| File | Wave | Cluster(s) | Budget | Open in fresh session when |
|---|---|---|---|---|
| `FIX-W0-contracts.md` | 0 | Cross-cluster (W0-1..W0-9) | M | First — blocks all other waves |
| `FIX-W1-cluster-11.md` | 1 | 11 (shared infra) | L | After W0 contracts ratified |
| `FIX-W1-cluster-01-12.md` | 1 | 01 + 12 bundle | M | Parallel with W1-11 |
| `FIX-W2-cluster-02.md` | 2 | 02 (dashboard) | L | After W1 lands |
| `FIX-W2-cluster-03.md` | 2 | 03 (brand mgmt) | L | Parallel with W2-02 |
| `FIX-W2-cluster-04-05.md` | 2 | 04 + 05 bundle | L | Parallel with W2-02, W2-03 |
| `FIX-W3-canvas-bundle.md` | 3 | 06 + 07a + 07b + 08 | L | After W2 lands |
| `FIX-W4-cluster-09-10.md` | 4 | 09 + 10 bundle | M-L | After W3 lands |

---

## Wave-ordering rules (HARD)

```
Wave 0 (contracts)
   └─ blocks ─┐
              │
Wave 1 (foundation)
   ├─ 11 (audit_log table + KovaIcon + verifyIdempotency hash)
   └─ 01 + 12 bundle
       └─ blocks ─┐
                  │
Wave 2 (foundation consumers)
   ├─ 02
   ├─ 03
   └─ 04 + 05 bundle
       └─ blocks ─┐
                  │
Wave 3 (canvas)
   └─ 06 + 07a + 07b + 08 bundle
       └─ blocks ─┐
                  │
Wave 4 (downstream)
   └─ 09 + 10 bundle
```

**No wave starts until the previous wave's last agent returns "all findings closed or explicitly deferred".**

---

## Within a wave: parallel dispatch

Multiple agents within the same wave **can and should** run in parallel (separate terminal sessions). Each agent writes to non-overlapping files. No merge conflicts by design (cluster ownership = file ownership, see CONSOLIDATED-TRIAGE.md cluster sections for file-owner lists).

**Recommended terminal layout for parallelism:**
- 1-3 terminals on most days
- Up to 4 terminals during Wave 2 peak (3 cluster agents simultaneously)

---

## What each dispatch prompt contains

Every `FIX-W*.md` file follows this template:

1. **Mission** — what the agent owns
2. **Source-of-truth file paths** — what to read before fixing
3. **Frozen founder decisions** — 16 locks, never re-litigate
4. **Cluster sections to walk** — exact line ranges in CONSOLIDATED-TRIAGE.md
5. **Per-finding TDD discipline** — red → green → commit per row
6. **Hard rules** — no `packages/core/` edits, no `Math.random`, no `as any`, no `e.key`, etc.
7. **Cross-cluster coordination** — how to interact with CT-NNN findings
8. **Output format** — per-finding status report + commits manifest
9. **What blocks dispatch back to founder**

---

## Coordination between waves

Cross-cluster CT-NNN findings have **multiple participants**:
- **Owner cluster** ships the canonical resource (e.g., Cluster 11 ships `audit_log` table)
- **Consumer clusters** wire to the canonical resource (e.g., Cluster 01/03/04/05 each `writeAudit()` calls)

The dispatch prompts route fixes correctly:
- **Wave 0 contracts agent** writes the contract decision into PRDs/plans (e.g., "Plan 11 Task 1.1 ships `audit_log` DDL")
- **Wave 1 Cluster 11 agent** implements the contract (writes the migration + helper)
- **Wave 1-4 consumer agents** consume the contract (wire `writeAudit()` from their Edge Functions)

If a consumer agent gets blocked because the owner's resource isn't shipped yet, it pauses on that finding and reports "blocked on CT-NNN owner cluster" — the founder then unblocks by re-running owner agent if needed.

---

## Frozen founder decisions (NEVER violate, ever)

All 8 dispatch agents enforce these locks. Sourced from `docs/kova-final-qa/README.md` + CLAUDE.md + memory entries.

1. **Vue 3 Composition API only** — no Options API, no React, no Next.js, no PixiJS
2. **`<script setup lang="ts">` + `ref()` / `reactive()` / `computed()`**
3. **Pinia setup stores only** — no Options-style stores
4. **valibot only in tool layer** (`src/ai/tools.ts` + dependencies); Zod permitted in Edge Functions
5. **Tailwind CSS 4 utility classes only** — no inline styles, no `<style>` blocks
6. **`@/` alias for app code**, relative within `packages/core/`
7. **`unplugin-icons` with Lucide** — `<icon-lucide-*>` or `<KovaIcon name="...">` primitive; **NEVER** raw SVG, `<Icon name="lucide:...">` (Nuxt), `i-lucide-*` class strings, or dynamic `<component :is="\`icon-lucide-${...}\`">`
8. **`crypto.getRandomValues()` only** — never `Math.random()`
9. **`e.code` not `e.key`** for keyboard shortcuts (Mac Option key transforms characters)
10. **No `any`, no `!` non-null assertions** (founder lock #10)
11. **`structuredClone` for nested mutation** — never shallow spread
12. **`packages/core/` is READ-ONLY** except documented exceptions: SLICE (17th NodeType) and Measurement (page-level anchored, NOT a NodeType)
13. **MEASUREMENT is page-level on PageNode**, NOT a NodeType
14. **AI default-active tab** on canvas load (per PRD 06 §12.13 founder ratification 2026-05-17)
15. **SECURITY DEFINER + `SET search_path = public, pg_temp`** on every DEFINER RPC
16. **Dark inside authenticated app** (onboarding/dashboard/settings/canvas), light only on marketing + auth pages
17. **Stripe foundation in MVP** — Checkout + Customer Portal + webhooks. Launch strategy + pricing TBD by founder.
18. **Image export only, no HTML export**
19. **Sentry / Resend / Vercel Cron deferred to pre-launch** — stub-guard pattern OK
20. **audit_log + idempotency_keys owned by Cluster 11**
21. **D-5C reversed** — Vite SPA, no Nuxt
22. **Cmd+K command palette dropped entirely** per 00g kill 2026-05-17
23. **Brands sidebar item ships visible at MVP** (no SOON pill) per 00f B12 reversal 2026-05-17

**Any finding suggesting otherwise is wrong; flag the consolidation, do NOT apply the "fix".**

---

## Severity scale (used inside each dispatch prompt)

- **CRITICAL** — Build/compile-time break OR security/compliance hazard. Fix before merge.
- **HIGH** — Runtime bug, broken affordance, or contract violation. Fix in wave.
- **MEDIUM** — Quality issue, missing test, internal inconsistency. Fix in wave or document deferral.
- **LOW** — Style, polish, comment hygiene. Fix opportunistically.
- **NOTE (locked)** — Documented exception to a founder lock. **Do not fix.** Verify the NOTE rationale is still correct and move on.

---

## Per-agent commit + PR convention

Each dispatch prompt instructs the agent to:

1. Create a working branch: `fix/qa-wN-clusterXX-<short-description>`
2. Commit per finding with conventional commit format: `fix(NN): CT-NNN <short-description>` or `fix(NN): <source-id> <short-description>`
3. After all findings closed, open one PR per agent: `fix(qa-wN-clusterXX): close N findings`
4. PR description = output report from agent (manifest of findings closed + blockers).

Founder reviews each PR independently; merges in wave order.

---

## Founder review checkpoint

After each wave:

1. **Read each agent's final output report** (in PR description)
2. **Confirm all findings tagged "closed"** (none left as "blocked" or "deferred" without explicit founder OK)
3. **Cross-cluster CT-NNN audit** — verify the owner cluster shipped the resource and consumer clusters wired correctly
4. **Approve wave + dispatch next wave**

If an agent reports >3 findings blocked → STOP, investigate, do not proceed to next wave.

---

## Estimated effort per agent

| Agent | Findings | Files touched | Estimated tokens | Wall-clock |
|---|---|---|---|---|
| W0 contracts | ~12 PRD/plan edits | 8-10 docs | Medium | 0.5 day |
| W1 Cluster 11 | 15 | 1 PRD + 1 plan + migration + helper code | Large | 1 day |
| W1 Cluster 01+12 | 23 | 2 PRDs + 2 plans | Medium-Large | 1 day |
| W2 Cluster 02 | 25 | 1 PRD + 1 plan + many components | Large | 1 day |
| W2 Cluster 03 | 22 | 1 PRD + 1 plan + many components | Large | 1 day |
| W2 Cluster 04+05 | 26 | 2 PRDs + 2 plans + Stripe webhook + brand-kit | Large | 1 day |
| W3 Canvas (06+07a+07b+08) | 31 | 4 PRDs + 4 plans + canvas engine surfaces | Large | 1.5 days |
| W4 Cluster 09+10 | 27 | 2 PRDs + 2 plans + snapshots + AI tools | Medium-Large | 1 day |

**Total wall-clock:** ~7 agent-days. With parallelism within waves: **~1.5-2 calendar days** if 3 terminals run concurrent during Wave 2 + Wave 3.

---

## When all 8 agents return clean

1. **Re-run QA-VERIFY** on the post-fix state (optional but recommended) to confirm no new drift introduced.
2. **Run full quality gates** from CLAUDE.md: `bun run check`, `bun run format`, `bun run test:unit`, `bun run test`, `bun run test:dupes`.
3. **Browser smoke-test** golden paths per `feedback_browser_smoke_test_before_done` (sign-in → onboarding → dashboard → brand modal → canvas → export).
4. **Then begin Wave 1 of actual Kova build** per the corrected plans.

---

## End of orchestration

The 8 dispatch prompt files are ready. Open `FIX-W0-contracts.md` first.
