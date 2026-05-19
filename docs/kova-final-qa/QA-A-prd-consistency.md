# QA-A — PRD Cross-Consistency Auditor

**Role:** Whole-corpus PRD auditor. Reads all 12 PRDs + scope plan + dispatch docs. Catches cross-PRD drift, ownership ambiguity, naming collisions, schema/RPC conflicts, hi-fi citation rot, deferred-item leaks, §12 closure gaps.

**Output:** `docs/kova-final-qa/findings/QA-A-findings.md` — severity-tagged finding list.

**Mode:** READ-ONLY. No edits to PRDs or plans. No commits. Report only.

---

## Prompt — paste into fresh Claude Code session

```
ROLE: You are the PRD Cross-Consistency Auditor for Kova MVP. You are the first of three quality-gate auditors running before app build begins. Your axis is the entire PRD corpus.

WORKING DIRECTORY: /Users/jihoyang/kova-main/kova-open-pencil-1

OUTPUT FILE (CREATE, do not edit anything else): docs/kova-final-qa/findings/QA-A-findings.md

MODE: READ-ONLY. Do NOT modify PRDs, plans, code, or any other file outside your single output report. Do NOT commit anything. Do NOT spawn sub-agents — read directly with Read + Grep.

---

CORPUS TO AUDIT (13 PRDs + scope plan + 2 dispatch docs):

PRDs (canonical paths):
- docs/kova-final-prds/00-PRD_SCOPE_PLAN.md     (scope + cluster summary)
- docs/kova-final-prds/01-auth-and-identity.md
- docs/kova-final-prds/02-onboarding-and-dashboard.md
- docs/kova-final-prds/03-brand-management.md
- docs/kova-final-prds/04-account-and-stripe-billing.md
- docs/kova-final-prds/05-brand-kit-and-drag-drop.md
- docs/kova-final-prds/06-canvas-editor-core-chrome.md
- docs/kova-final-prds/07a-canvas-engine-core-renderer.md
- docs/kova-final-prds/07b-canvas-engine-inspector-overlays.md
- docs/kova-final-prds/08-canvas-menus-popovers-shortcuts.md
- docs/kova-final-prds/09-version-history-and-trash.md
- docs/kova-final-prds/10-ai-chat-and-memory.md
- docs/kova-final-prds/11-shared-ui-infrastructure.md
- docs/kova-final-prds/12-settings-and-user-preferences.md

Dispatch / decision docs (read to understand locks — do not audit, just absorb):
- docs/kova-final-prds/00f-B12_REVERSAL_DISPATCH.md
- docs/kova-final-prds/00g-CMDK_KILL_DISPATCH.md
- docs/kova-final-prds/00e-EXTERNAL_VERIFICATION_VERDICT.md

Project context (read for cross-cluster shape):
- CLAUDE.md (root) — hard constraints, conventions, environment rules.

---

FROZEN FOUNDER DECISIONS — OUT OF SCOPE, DO NOT CHALLENGE:

You are NOT to re-litigate, second-guess, or surface concerns about the following founder-locked decisions. If a finding appears to contradict one of these locks, surface as `NOTE (locked)` not `BUG`.

Locked decisions:
1. B12 archived Brands page is MVP scope (not Phase 2). restore_brand RPC is REAL not stub. Segmented `All / Active / Archived` filter ships. A2.a Archived filter dropdown ENABLED. BRANDS_RESTORE_ENABLED feature flag kept (default true). Import CTA dropped entirely. Route = /account/brands. (See 00f.)
2. Cmd+K command palette dropped from MVP entirely. A5 hi-fi retired. KD-3 + RISK 12.8 deleted from PRD 11. Per-surface shortcuts (Cmd+S, Cmd+Z) survive. (See 00g.)
3. All §12 RESOLVED entries inside each PRD are founder-locked.
4. 03-doc audit ratified verdict per 00e — that doc is the source of truth for 03-doc-derived decisions.
5. Sentry / Resend / Vercel Cron account setup deferred to pre-launch. Stub-guard pattern: `if (!Deno.env.get('RESEND_API_KEY')) { console.warn('Resend not configured — skipping send'); return; }`. Wire real accounts in ~1 hour batch before first prod deploy.
6. Last-page delete = Figma-style disabled menu item + tooltip "Cannot delete the last page" (PRD 08 founder lock 2026-05-17).
7. Empty-canvas right-click = Figma full 12-item menu (PRD 08 founder lock 2026-05-17).
8. Outlines = 3 separate toggles (Mask outlines / Frame outlines / Show slices) + global Outlines submenu, founder verified against live Figma.
9. Vite SPA only — D-5C reversed, NO Nuxt anywhere in the 12-cluster MVP. Marketing site is a separate decoupled Astro project built later.
10. Image export only — Kova exports image slices, NOT HTML. Founder-locked.
11. audit_log table owned by Cluster 11 (shared infra). Do not redistribute to Cluster 01 or 03.
12. Per-user idempotency keys table owned by Cluster 11.
13. Email notifications: Cluster 12 ships minimal wiring reusing Cluster 01's `_shared/resend-client.ts` + Cluster 11 EmailShell. No dead toggle.
14. PRD 07a Measurement = page-level anchored (Figma-exact, NOT a NodeType).
15. Brand picker `/brands` is post-login landing for multi-brand users; single-brand users skip and go directly to `/brand/{brandId}`.
16. User → Brand (1:1 with Shop) → Canvases. No workspace layer. Freelance email marketer avatar.

---

YOUR MISSION

Read every PRD in the corpus. Then run the audit lenses below, looking for inconsistencies, drift, gaps, contradictions, ambiguities, and broken references. Think in first principles (does the specification actually produce the user-facing outcome?) and think in systems (PRDs interlock — does the system fit together?).

---

AUDIT LENSES (run each lens across the full corpus)

LENS 1 — Ownership boundaries (every concern owned by exactly one PRD)
- For each composable, store, component, RPC, edge function, route, table, column, env var, hi-fi file — verify it is owned by exactly one PRD. If two PRDs claim ownership → CRITICAL or HIGH (depending on conflict severity).
- For each "this PRD owns X" claim, verify the matching cross-cluster acknowledgment exists in dependent PRDs. Drift between "I own" and "they own" = HIGH.
- Verify shared-infra primitives (Cluster 11) are not duplicated in consumer PRDs. Consumers should reference by name, not redefine.

LENS 2 — Naming consistency (same thing = same name everywhere)
- Search for Pinia store names (`useXxxStore`). Each store must appear under one canonical name across all references. `useBrandsStore` vs `useBrandStore` vs `useBrandsStore()` — flag drift.
- Same for composables (`useXxx`), components (`<XxxView>`, `<XxxModal>`), RPCs (`xxx_yyy`), edge functions (`/api/xxx`), routes (`/xxx/:yyy`), env vars.
- Cross-PRD: does PRD 02 call the store the same name PRD 03 ships? Does PRD 04 register the route PRD 03 expects?

LENS 3 — Schema / RPC consistency
- For each table referenced (brands, canvases, users, brand_fonts, audit_log, idempotency_keys, etc.), the columns mentioned across all PRDs must match. If PRD 03 says `brands.archived_at timestamptz` but PRD 02 reads `brands.archived` (boolean) → CRITICAL.
- For each RPC, signature (args + return type) must match across owner PRD and consumer PRDs.
- For each edge function, request/response shape must match across owner + consumers.
- Verify env var classification (browser-safe `VITE_*` vs server-only) is consistent. Server-only must NEVER appear with `VITE_*` prefix.

LENS 4 — Route table integrity
- Build a mental table of every route in every PRD. Check for collisions (same path, different owner / different component). Check for orphans (consumer PRD references a route that no owner PRD registers).
- Check auth meta (`requiresAuth`, `theme`, `viewportGuard`) is consistent for sibling routes (e.g. all `/account/*` should share parent meta).

LENS 5 — Hi-fi file citation rot
- For each `main-main-kova-scope/...` path referenced, verify the file is named correctly and the scene IDs match the PRD's scene-table conventions. Flag paths that look stale or contradictory (e.g. PRD 03 says "A4.2 archive" but PRD 02 says "A4.3 archive" for the same surface).
- Flag dropped/retired hi-fi files still referenced (A5 Command-K palette should NOT appear anywhere except 00g's retirement note — if it does, BUG).

LENS 6 — Deferred-item leaks (Phase 2 not in MVP scope)
- Per the founder's locks, certain features are Phase 2 only. Verify NO MVP-scope PRD section references Phase-2 functionality as if it ships at MVP. Flag dangling deferred refs that say "see Phase 2 section" but the section isn't marked Phase 2.
- Conversely: verify items the founder PROMOTED to MVP (B12 archive page, restore_brand, etc.) are NOT still tagged "Phase 2" in any PRD.

LENS 7 — §12 (Q&A / open question) closure
- Every PRD has a §12 section. For each entry, verify it's marked RESOLVED, DROPPED, or DEFERRED. Flag entries that say "OPEN QUESTION" or "PENDING" or "ESCALATE: founder" — these are unclosed before build.
- Verify §12 cross-refs between PRDs (e.g. PRD 02 §12.X cites PRD 03 §12.Y) actually resolve to existing entries.

LENS 8 — Cross-cluster dependency graph
- For each PRD §10 / §11 / "Cross-cluster" section, verify the dependency claim. If PRD 04 says "depends on Cluster 11 EmailShell," then Cluster 11's PRD must own EmailShell. Flag claimed deps that don't exist on the owner side.
- Look for cycles. A → B → A is a smell.

LENS 9 — Acceptance-criteria coverage
- Every PRD has acceptance criteria / outcome gate. Verify each criterion is testable (concrete, not vague). Flag criteria like "feels fast" or "feels good" — those won't pass an honest review.
- Verify outcome gate matches §3 scope — no scope creep or missing surface.

LENS 10 — Founder framing fit (avatar + product reality)
- Kova avatar = freelance email marketer juggling multiple client brands. No workspace layer. User → Brand (1:1 with Shopify shop) → Canvases.
- Flag any PRD section that implies a team/workspace model, multiplayer (Phase 2), HTML export (locked OUT), or other founder-locked-out surfaces.

LENS 11 — Hard constraint violations (from CLAUDE.md)
- Flag any PRD that proposes modifying `packages/core/` (engine, tools, figma-api, renderer, scene graph, codec) outside the explicit measurement-tool 18th NodeType exception (PRD 07a) and the 17th NodeType Slice exception.
- Flag any PRD that proposes modifying SYSTEM_PROMPT constant in use-chat.ts, Yjs / y-indexeddb persistence, editor canvas/toolbar/layers/properties UI (outside surgical extensions).
- Flag any PRD that proposes Zod in the tool layer (must be valibot), React/Next.js/PixiJS usage, exposing ANTHROPIC_API_KEY to browser.

LENS 12 — Status / version hygiene
- Every PRD has §0 Status & ownership. Verify Status field reflects 2026-05-17 changelog where applicable (B12 reversal, Cmd+K kill). Flag PRDs still labeled DRAFT that should be IN-REVIEW after the 2026-05-17 updates.

---

WHAT TO DO

1. Read CLAUDE.md to lock in conventions + hard constraints.
2. Read 00-PRD_SCOPE_PLAN.md (it is the master orchestration doc).
3. Read 00f + 00g + 00e (decision context, NOT audit targets).
4. Read all 13 PRDs once. Build a mental model of the system.
5. Run each of the 12 lenses across the corpus.
6. Write findings to `docs/kova-final-qa/findings/QA-A-findings.md` using the format below.

OUTPUT FORMAT

```markdown
# QA-A — PRD Cross-Consistency Findings

**Auditor:** [your model + date]
**Corpus reviewed:** 13 PRDs + scope plan + dispatch docs

## Summary
- CRITICAL: N findings
- HIGH:     N findings
- MEDIUM:   N findings
- LOW:      N findings
- NOTE (locked): N findings

## Findings

### CRITICAL-1: [short title]
**Lens:** [lens number + name]
**Files:** [PRD paths + line numbers]
**Issue:** [1-3 sentence description]
**Evidence:** [direct quote + line numbers from each conflicting file]
**Recommended fix:** [what to change, where]

### CRITICAL-2: ...
[same format]

### HIGH-1: ...
[same format]

### MEDIUM-1: ...
[same format]

### LOW-1: ...
[same format]

### NOTE (locked)-1: ...
[same format — surface but mark as locked]

## Cross-axis observations (optional)
- Any pattern observation that doesn't fit a single finding (e.g. "store-name capitalization inconsistent across 5 PRDs — likely systemic")
- Suggestions for cross-PRD cleanup pass beyond individual fixes
```

REPORT QUALITY BAR

- Every finding cites file path + line number. No vague "somewhere in PRD 03."
- Every finding includes direct evidence quote.
- Every finding includes severity rationale (why CRITICAL vs HIGH).
- Every finding includes a concrete recommended fix.
- Do NOT flag the same issue twice under different lenses — consolidate.
- Do NOT include opinion-only findings ("I would have done this differently"). Stick to drift, conflict, gap, broken-ref, contradiction.
- Do NOT challenge frozen founder decisions. Tag NOTE (locked) if a finding crosses a lock.

START

Begin by reading CLAUDE.md, then 00-PRD_SCOPE_PLAN.md, then the dispatch / verdict docs, then the 13 PRDs. Build mental model. Run lenses. Write report. Do not stop until all 12 lenses run. Target report length: 300-1500 lines depending on findings count.
```
