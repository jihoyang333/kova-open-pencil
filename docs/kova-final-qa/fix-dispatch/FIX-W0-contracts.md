# Wave 0 — Cross-Cluster Contracts Fix Agent

**Status:** READY TO DISPATCH (paste into fresh Claude Code session)
**Working directory:** `/Users/jihoyang/kova-main/kova-open-pencil-1/`
**Branch to create:** `fix/qa-w0-cross-cluster-contracts`
**Estimated wall-clock:** 0.5 day
**Output PR title:** `fix(qa-w0): cross-cluster contracts — 9 contract decisions + ~12 PRD/plan edits`

---

## Mission

You are the **Wave 0 contracts fix agent** for the Kova pre-build QA remediation. Wave 0 ratifies cross-cluster contract decisions BEFORE any cluster-owned fix dispatch begins. Without Wave 0 landing, downstream agents will produce divergent implementations.

Your job: apply **9 contract decisions** to the PRDs + implementation plans + scope plan. These are not code edits; they are documentation/spec edits that establish what each downstream cluster will then implement.

**You must complete all 9 before any Wave 1 agent dispatches.**

---

## Required reading (do this FIRST, in order, before any edits)

1. `kova-open-pencil-1/docs/kova-final-qa/CONSOLIDATED-TRIAGE.md` — **read in full**. Pay close attention to:
   - "Source Reports (authoritative — fix agents MUST read)" block near top (the ID-to-source lookup table)
   - "Top blockers" section
   - "Cross-cluster findings" table
   - "Suggested fix dispatch order" → "Wave 0 — Cross-cluster contracts" subsection
2. `kova-open-pencil-1/docs/kova-final-qa/findings/QA-A-findings.md` — read findings referenced by ID below
3. `kova-open-pencil-1/docs/kova-final-qa/findings/QA-B-findings.md` — read findings referenced by ID below
4. `kova-open-pencil-1/docs/kova-final-qa/findings/QA-C-findings.md` — read findings referenced by ID below
5. `kova-open-pencil-1/docs/kova-final-qa/README.md` — frozen founder decisions (16 locks)
6. `kova-open-pencil-1/CLAUDE.md` — repo-level hard constraints
7. Any specific PRD/plan you are about to edit — read fully before editing

**Do not edit anything before completing step 1.**

---

## Contract decisions to apply

### W0-1: `audit_log` table ownership → Cluster 11 (CT-001, A-CRIT1, C-CRIT4)

**Founder ratification:** Cluster 11 owns `audit_log` (per frozen decision in scope plan).

**Edits required:**

1. **`docs/kova-final-prds/11-shared-ui-infrastructure.md`** §2.1 — add `audit_log` row alongside `idempotency_keys`. Include columns: `id uuid PK`, `user_id uuid FK → users`, `event_type text NOT NULL`, `payload jsonb NOT NULL DEFAULT '{}'`, `created_at timestamptz NOT NULL DEFAULT now()`, `cluster_owner text` (denormalized for debugging).
2. **`docs/kova-final-prds/11-shared-ui-infrastructure.md`** §4.1 — add the table DDL block.
3. **`docs/kova-final-prds/11-shared-ui-infrastructure.md`** §5.5 — add `writeAudit(supabase, { userId, eventType, payload, clusterOwner })` helper signature.
4. **`docs/kova-final-impl-plans/11-shared-ui-infrastructure-plan.md`** Task 1.1 — add migration SQL alongside `idempotency_keys`. Include RLS: `authenticated` cannot SELECT; `service_role` full access.
5. **`docs/kova-final-impl-plans/11-shared-ui-infrastructure-plan.md`** — new Task 1.4: `api/_shared/audit.ts` helper module exporting `writeAudit()`.
6. Cross-cuts: PRD 01 §5.1, PRD 03 §5.1, PRD 04 §5.x, PRD 05 §5.x — each adds a "consumes `audit_log` via Cluster 11 `writeAudit()` helper" cross-reference. **Do not write SQL in consumer PRDs — only the cross-reference.**

**Evidence:** Source reports QA-A CRITICAL-1 (lines 26-92), QA-C CRITICAL-4 (lines 385-413).

---

### W0-2: Find-feature ownership → Cluster 07b sole (CT-022, C-CRIT1+2+3)

**Founder ratification:** Cluster 07b owns the canvas-focus find feature per 2026-05-17 lock. Cluster 08 drops its competing find feature.

**Edits required:**

1. **`docs/kova-final-prds/08-canvas-menus-popovers-shortcuts.md`** §6.2.3 — remove `useFindStore` declaration. Add cross-reference: "Find feature owned by Cluster 07b §6.2.3; this PRD does not ship it."
2. **`docs/kova-final-prds/08-canvas-menus-popovers-shortcuts.md`** §6.4.3 — remove `<FindOverlay>` component.
3. **`docs/kova-final-prds/08-canvas-menus-popovers-shortcuts.md`** §6.1 — remove `Cmd+F` shortcut binding (Cluster 07b owns).
4. **`docs/kova-final-impl-plans/08-canvas-menus-popovers-shortcuts-plan.md`** — remove Task 1.3 (`useFindStore`), Task 5.1 (`<FindOverlay>`), Task 5.2 (`Cmd+F` binding). Add a single closing line in the affected phase: "Find feature dropped from Cluster 08 per 2026-05-17 founder lock; see Cluster 07b Tasks 1.6/1.7/7.1."
5. **`docs/kova-final-prds/07b-canvas-engine-inspector-overlays.md`** §12 — add a new closure entry `RESOLVED 2026-05-17: Cluster 07b owns find feature sole. Cluster 08 PRD/plan updated W0-2 2026-05-19.`

**Evidence:** QA-C CRITICAL-1 (lines 331-350), CRITICAL-2 (lines 352-366), CRITICAL-3 (lines 369-382).

---

### W0-3: Routing + store-name canonical (CT-002, B-CRIT1, C-HIGH10)

**Founder ratification:**
- Route convention: `/brand/:brandId` (RESTful path param)
- Store canonical name: `useRightPanelStore` at `src/stores/right-panel.ts`

**Edits required:**

1. **`docs/scope-plan.md` (or wherever scope plan lives) §6** — add a "Routing + store canonical" subsection documenting these two decisions.
2. **`docs/kova-final-impl-plans/03-brand-management-plan.md`** — find every `/dashboard?brandId=` and replace with `/brand/:brandId`. Update router push calls.
3. **`docs/kova-final-impl-plans/06-canvas-editor-core-chrome-plan.md`** — find E2E spec line asserting `/dashboard?brandId=` and replace with `/brand/:brandId`.
4. **`docs/kova-final-impl-plans/10-ai-chat-and-memory-plan.md`** Tasks 17 lines 2394, 2401, 2436 — replace `useRightPanelTabStore` with `useRightPanelStore`, replace path `@/stores/right-panel-tab` with `@/stores/right-panel`.

**Evidence:** QA-B CRITICAL-1 (lines 28-58), QA-C HIGH-10 (lines 556-568).

---

### W0-4: KovaIcon primitive (CT-003, B-CRIT3+4, B-HIGH7+17, C-HIGH12)

**Founder ratification:** Cluster 11 ships `<KovaIcon name="...">` primitive. All clusters consume it. Document the single tag convention.

**Edits required:**

1. **`docs/kova-final-prds/11-shared-ui-infrastructure.md`** §6.4 — add `<KovaIcon>` primitive component spec. Props: `name: string` (lucide icon name), `size?: 'xs' | 'sm' | 'md' | 'lg'`, `class?: string`. Implementation: uses `unplugin-icons` with a static-map fallback (avoids dynamic `:is` resolution issues).
2. **`docs/kova-final-impl-plans/11-shared-ui-infrastructure-plan.md`** — new Task 4.4: `src/components/KovaIcon.vue` implementation + tests.
3. **`docs/kova-final-prds/02-onboarding-and-dashboard.md`** — find every dynamic icon binding (search for `<component :is="\`icon-lucide-\``) and document migration to `<KovaIcon>` in §6.4 component list.
4. Same edit for PRDs 03, 04, 05, 06.
5. **`docs/scope-plan.md` §6** — add a "Icon convention" line: "All icons via `<KovaIcon name='...'>` primitive shipped by Cluster 11. No raw `<icon-lucide-*>`, no Nuxt-style `<Icon name='lucide:...'>`, no `i-lucide-*` class strings, no dynamic `<component :is>`."

**Evidence:** QA-B CRITICAL-3 (lines 95-122), CRITICAL-4 (lines 124-160), HIGH-7 (lines 715-737), HIGH-17 (lines 945-953), QA-C HIGH-12 (lines 593-607).

---

### W0-5: SECURITY DEFINER `SET search_path` CI gate (CT-013, B-CRIT2)

**Founder ratification:** Every `CREATE FUNCTION ... SECURITY DEFINER` must have `SET search_path = public, pg_temp` within the same function definition. CI grep enforces.

**Edits required:**

1. **`docs/kova-final-impl-plans/11-shared-ui-infrastructure-plan.md`** — new Task 11.5: CI grep step. Grep pattern (in `package.json` script or GitHub Actions):
   ```sh
   ! grep -rzPnE "CREATE\s+(OR\s+REPLACE\s+)?FUNCTION[^;]*SECURITY\s+DEFINER(?![^;]*SET\s+search_path)" supabase/migrations/
   ```
   Exits non-zero if any DEFINER function lacks `SET search_path`.
2. **Add the same grep gate** as a `bun run check:rls` script.
3. **`docs/kova-final-prds/03-brand-management.md`** §5.1 — add "**Hardening:** every SECURITY DEFINER RPC must include `SET search_path = public, pg_temp` (founder lock #15; CI-enforced)."
4. Same line in PRDs 05 and 09 §5.

**Evidence:** QA-B CRITICAL-2 (lines 61-93).

---

### W0-6: Test-framework drift CI gate (CT-010)

**Founder ratification:** Project uses `bun:test`. `jest.mock`, `vi.mock`, `mockImplementationOnce` etc. are forbidden.

**Edits required:**

1. **`docs/kova-final-impl-plans/11-shared-ui-infrastructure-plan.md`** — new Task 11.6: CI grep step.
   ```sh
   ! grep -rnE "\b(jest|vi)\.(mock|fn|spyOn)\b|\bmockImplementation(Once)?\b|\bmockClear\b" tests/
   ```
2. Add to `bun run check`.
3. **`docs/scope-plan.md` §6** — add line: "Test framework: `bun:test` only. Use `mock.module(...)` + `mock(...)` instead of jest/vitest APIs."

**Evidence:** QA-B CRITICAL-5 (lines 162-194), CRITICAL-6 (lines 196-223), HIGH-8 (lines 739-769).

---

### W0-7: Cmd+K + AI-default-tab + MEASUREMENT propagation (CT-004, CT-005, CT-006)

**Founder ratification:** All three are already locked. Verify no PRD/plan residuals remain.

**Edits required:**

1. **Cmd+K scrub** — already done in PRDs 02 + 06 + 08 per CT-006 (a/b/c) cluster rows. Verify PRD 04 line 1625 still says "Command-K /" and **remove it now**.
2. **AI-default-tab propagation** (CT-005):
   - **`docs/kova-final-prds/06-canvas-editor-core-chrome.md`** line 253 — change "Default-active = Design" to "Default-active = AI" per §12.13 founder lock.
   - **`docs/kova-final-prds/10-ai-chat-and-memory.md`** lines 24, 39, 56, 147, 740 — replace every "Design (default-active)" with "AI (default-active)".
3. **MEASUREMENT model propagation** (CT-004):
   - **`docs/kova-final-prds/07b-canvas-engine-inspector-overlays.md`** lines 70, 87, 100, 187, 237, 375, 424, 492, 496, 591, 613, 683, 708 — rewrite all "MEASUREMENT NodeType" and `figma.createMeasurement()` references to page-level `addMeasurement` model per PRD 07a §2.1b.
   - **`docs/kova-final-prds/10-ai-chat-and-memory.md`** lines 14, 87, 109, 133, 706 — same propagation; fix `addMeasurement` tool wrapper signature to match PRD 07a §2.1.
   - **`docs/scope-plan.md` §3 Cluster 07** — remove "Q11 MEASUREMENT NodeType" mention; replace with page-level model.

**Evidence:** QA-A HIGH-1 (lines 94-126), HIGH-2 (lines 128-168), HIGH-3 (lines 170-218), HIGH-4 (lines 220-246), MEDIUM-7 (lines 420-441).

---

### W0-8: Scope plan §3 + §2.1 staleness cleanup (CT-016)

**Edits required:**

1. **`docs/scope-plan.md` §3 Cluster 06** — change "Prototype DEFERRED" to "Prototype out of scope entirely" (per founder lock).
2. **`docs/scope-plan.md` §3 Cluster 07** — already covered in W0-7 MEASUREMENT propagation.
3. **`docs/scope-plan.md` §2.1** — replace `07-canvas-engine-extensions.md` with `07a-canvas-engine-core-renderer.md` and `07b-canvas-engine-inspector-overlays.md`.

**Evidence:** QA-A MEDIUM-4 (lines 346-371), MEDIUM-5 (lines 372-396), LOW-1 (lines 490-505).

---

### W0-9: Founder lock #10 sweep contract (CT-009)

**Founder ratification:** `as any` casts and `process.env.X!` non-null assertions are forbidden (founder lock #10). 214 + 24 occurrences across plans require a sweep + CI gate.

**Edits required:**

1. **`docs/kova-final-impl-plans/11-shared-ui-infrastructure-plan.md`** — new Task 11.7: CI grep step.
   ```sh
   ! grep -rnE "\bas\s+any\b" kova-open-pencil-1/src/ kova-open-pencil-1/api/
   ! grep -rnE "process\.env\.[A-Z_]+!" kova-open-pencil-1/src/ kova-open-pencil-1/api/
   ```
2. Add `requireEnv(name: string): string` helper to Plan 11 Task 1.x with throw-if-missing semantics. Replace `process.env.X!` callsites with `requireEnv('X')` in later waves.
3. **`docs/scope-plan.md` §6** — add "Founder lock #10 enforced: zero `as any` + zero non-null `!` in `src/` and `api/`. Use `requireEnv` helper for env vars."

**Note:** The actual code-level sweep (touching 214 `as any` instances) happens during later waves — each cluster fix agent's brief includes "remove all `as any` casts in your cluster". Wave 0 only establishes the contract + CI gate + helper.

**Evidence:** QA-B HIGH-1 (lines 533-563), HIGH-2 (lines 565-590).

---

## Per-edit discipline

For every PRD/plan edit:

1. **Read the target section in full first.** Do not editing-from-memory; the consolidator may have made mistakes.
2. **Quote the exact `old_string` you are replacing.** Markdown content may have nuance.
3. **After the edit, grep to confirm the change took effect:**
   ```sh
   grep -n "<keyword from new content>" <path-to-edited-file>
   ```
4. **Commit per W0-N decision** with format:
   ```
   fix(qa-w0): W0-N <short-description>
   ```
   Example: `fix(qa-w0): W0-1 add audit_log table to PRD 11 + Plan 11 Task 1.1`

---

## Output report (paste this back to founder when done)

```markdown
## Wave 0 Contracts — Fix Agent Report

**Branch:** fix/qa-w0-cross-cluster-contracts
**Commits:** N commits (one per W0 decision)

### Decisions applied
- [x] W0-1 audit_log ownership — N edits across PRD 11, Plan 11, cross-refs in PRDs 01/03/04/05
- [x] W0-2 find-feature ownership — N edits across PRD 07b, PRD 08, Plan 08
- [x] W0-3 routing + store canonical — N edits across scope plan, Plans 03/06/10
- [x] W0-4 KovaIcon primitive — N edits across PRD 11, Plan 11, PRDs 02/03/04/05/06
- [x] W0-5 SECURITY DEFINER CI gate — N edits in Plan 11, PRDs 03/05/09
- [x] W0-6 test-framework CI gate — N edits in Plan 11, scope plan
- [x] W0-7 Cmd+K + AI-default-tab + MEASUREMENT — N edits across PRDs 04/06/07b/10, scope plan
- [x] W0-8 scope plan staleness cleanup — N edits in scope plan
- [x] W0-9 lock #10 sweep contract — N edits in Plan 11, scope plan

### Verification grep results
- audit_log: `<grep result confirming new DDL present in Plan 11>`
- KovaIcon: `<grep result confirming primitive spec present>`
- ... (one grep per W0 decision)

### Blockers (if any)
None / list of items requiring founder confirmation.

### Files modified
- `<full list with relative paths>`

### Ready for Wave 1 dispatch
[x] Yes / [ ] No (blockers listed above)
```

---

## Hard rules

1. **Do NOT edit any source code in `src/`, `api/`, `supabase/`, `packages/core/`, or anywhere outside `docs/`.** Wave 0 is documentation-only.
2. **Do NOT commit anything outside the `fix/qa-w0-cross-cluster-contracts` branch.**
3. **Do NOT mark a W0 decision complete unless every listed edit lands and grep verification passes.**
4. **Do NOT re-litigate the 23 frozen decisions** listed in `docs/kova-final-qa/fix-dispatch/README.md`.
5. **If a section in a PRD/plan refuses to match `old_string`** (file has drifted from what CONSOLIDATED-TRIAGE.md cites), STOP, read the current file state, and update the dispatch report with the discrepancy. Do not guess.
6. **Do NOT introduce code in this wave.** The KovaIcon implementation, `writeAudit()` helper, `requireEnv` helper, and CI grep scripts are SPEC'd in Wave 0 but IMPLEMENTED in Wave 1 by Cluster 11.

---

## When done

Push branch + open PR. Reply to founder with the output report.

After founder approves, **Wave 1 dispatch begins** (Cluster 11 + Cluster 01+12 bundle).

---

**End of W0 dispatch prompt.**
