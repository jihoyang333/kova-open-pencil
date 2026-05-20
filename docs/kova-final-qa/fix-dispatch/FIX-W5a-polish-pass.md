# Wave 5a — Pre-Build Polish Pass

**Origin:** `docs/kova-final-qa/FINAL-AUDIT-REPORT.md` §5 (2026-05-19, Opus 4.7 audit on `feat/m9-shopify` @ `137d4a41`).
**Scope:** 12 MEDIUM polish items + 1 icon-convention sweep across Plans 10/11/12. 13 total finding-commits.
**Prerequisites:** W0–W4 merged into `feat/m9-shopify`. All 19 CRITICAL findings already substantively closed in prior waves.
**Out of scope:** W0-9 refactor sweep (52 `process.env.X!` + ~202 `as any`) — deferred to during-build per-cluster cleanup. Also out: W0-11..15 (Pattern-1/3/4/6/7) optional conventions.

---

## Branch + commit shape

**No worktree. No new branch.** Work directly on `feat/m9-shopify` per founder decision 2026-05-19. Each finding = ONE commit pushed to `origin/feat/m9-shopify`.

Commit message format:

```
fix(qa-w5a): <FINDING-ID> <one-line summary>

<body explaining what + why; cite FINAL-AUDIT-REPORT.md line if relevant>
```

**Push policy:** push after every 3-4 commits (not all at end) so progress is visible. Never `--force`. Never `--no-verify`.

---

## Pre-flight (do this first)

```sh
cd /Users/jihoyang/kova-main/kova-open-pencil-1
git checkout feat/m9-shopify
git pull origin feat/m9-shopify
git status                                    # working tree clean
git log --oneline -5                          # HEAD = 137d4a41 (W4 merge) or later
git branch --show-current                     # must print feat/m9-shopify
```

If anything is off — STOP and ask founder.

---

## The 13 finding-commits

Execute in this order (the 12 items from FINAL-AUDIT-REPORT.md §5 MEDIUM table, then the icon refactor sweep).

### 1. W0-3 prose drift — PRD 06 routing residuals

- **File:** `docs/kova-final-prds/06-canvas-editor-core-chrome.md`
- **Lines:** 30, 46, 203, 398, 532, 533 (+ 1 occurrence in §1)
- **Gap:** Prose cites retired `/dashboard?brandId=` route.
- **Fix:** Find-replace `/dashboard?brandId=` → `/brand/:brandId` at all 7 callsites. Re-grep PRD 06 after edit to confirm 0 remaining hits.
- **Commit:** `fix(qa-w5a): W0-3 PRD 06 routing — 7 /dashboard?brandId= → /brand/:brandId`

### 2. CT-018 — PRD 07b status field

- **File:** `docs/kova-final-prds/07b-canvas-engine-inspector-overlays.md`
- **Lines:** 7–10
- **Gap:** Status reads `DRAFT 2026-05-15` but body is finalized 2026-05-17.
- **Fix:** Bump `Status: DRAFT 2026-05-15` → `Status: IN-REVIEW 2026-05-17`. Update `Last updated:` to `2026-05-19`.
- **Commit:** `fix(qa-w5a): CT-018 PRD 07b status DRAFT → IN-REVIEW 2026-05-17`

### 3. C-MED9 — PRD 03 RPC count off-by-one

- **File:** `docs/kova-final-prds/03-brand-management.md`
- **Line:** 53
- **Gap:** "6 SECURITY DEFINER RPCs" — should be 7 after `restore_brand` promotion.
- **Fix:** Update §5.2 RPC count to 7. Cross-check the listed RPC names below the count to confirm 7 are enumerated. If only 6 listed, add `restore_brand`.
- **Commit:** `fix(qa-w5a): C-MED9 PRD 03 §5.2 SECURITY DEFINER RPC count 6 → 7`

### 4. C-MED13 — 3 Resend templates not refactored to EmailShell

- **File:** `docs/kova-final-impl-plans/04-account-and-stripe-billing-plan.md`
- **Lines:** 3600–3658
- **Gap:** Only `subscription-new.ts` uses `<EmailShell>` composition. Templates `subscription-upgraded`, `subscription-cancelled`, `payment-failed` still plain `<!doctype html>`.
- **Fix:** Refactor the 3 remaining templates to use `buildEmail()` helper per the Step-1 `subscription-new.ts` pattern. Inline the refactored TS for each so reviewers can diff. Preserve all content + Resend metadata; only the wrapper changes.
- **Commit:** `fix(qa-w5a): C-MED13 refactor 3 Resend templates to EmailShell (Plan 04)`

### 5. C-MED17 — Plan 06 T2 3-state enum migration

- **File:** `docs/kova-final-impl-plans/06-canvas-editor-core-chrome-plan.md`
- **Targets:** `use-keyboard.ts:140`, `AppMenu.vue:216`, `EditorView.vue:164/234/246/266` (5 callsites total)
- **Gap:** Plan 06 T2 canonicalizes `showUI` enum to `'hidden' | 'minimized' | 'full'` but the 5 listed callsites still reference the old 2-state boolean / 3-state alternate (`'all' | 'minimal' | 'hidden'`).
- **Fix:** Add a migration sub-step under T2 (or annotate T14 EditorView refactor) listing each of the 5 callsites with before/after code snippets. Include a CI grep guard to prevent regression: zero occurrences of the old enum strings outside the migration step itself.
- **Commit:** `fix(qa-w5a): C-MED17 Plan 06 T2 showUI 3-state enum migration for 5 callsites`

### 6. CT-020 residual — PRD 02 offline-signal cleanup

- **File:** `docs/kova-final-prds/02-onboarding-and-dashboard.md`
- **Lines:** 902, 917
- **Gap:** E2E spec row + manual-QA bullet still describe the retired "3 offline signals" pattern. Rest of PRD 02 already adopts the single `<NetworkStatusIndicator>` model.
- **Fix:** Rewrite both lines to reference the single `<NetworkStatusIndicator>` model. Verify §12.10 acceptance criteria still align after edit.
- **Commit:** `fix(qa-w5a): CT-020 residual PRD 02:902,917 collapse 3-signal → single NetworkStatusIndicator`

### 7. CT-013 Plan 05 — inline RPC SQL or RLS test assertion

- **File:** `docs/kova-final-impl-plans/05-brand-kit-and-drag-drop-plan.md`
- **Tasks:** T1 + T2 (or T8 RLS test)
- **Gap:** Plan 05 doesn't inline the 5 brand-kit RPC bodies — relies on PRD §4.1. Other Cluster plans inline their RPC SQL. Without inlined SQL, Plan 05 also lacks an explicit `SET search_path = public, pg_temp` assertion.
- **Fix:** Choose ONE of:
  - **Option A (preferred):** Inline the 5 brand-kit RPC bodies in Plan 05 T1 + T2 with full `CREATE OR REPLACE FUNCTION ... SECURITY DEFINER SET search_path = public, pg_temp` declarations.
  - **Option B (minimum):** Add an explicit RLS-+-search_path assertion to T8 (RLS test): grep PRD 05 §4.1 RPC bodies, verify each has `SET search_path = public, pg_temp`, fail T8 if any missing.
- **Commit:** `fix(qa-w5a): CT-013 Plan 05 inline 5 RPC bodies (or T8 search_path assertion)`

### 8. B-MED17 straggler — Plan 03 mock reassignment

- **File:** `docs/kova-final-impl-plans/03-brand-management-plan.md`
- **Line:** 2418
- **Gap:** `store.createBrand = mock(async () => ...)` inline reassignment inside test body — violates `mock.module()` file-scope pattern enforced elsewhere.
- **Fix:** Replace with `mock.module('@/stores/brands', () => ({ ... }))` at file scope. Re-run mental model: does test still assert the same behavior? Confirm before commit.
- **Commit:** `fix(qa-w5a): B-MED17 Plan 03:2418 inline mock reassignment → mock.module at file scope`

### 9. PRD 07b Boolean shortcut contradiction

- **File:** `docs/kova-final-prds/07b-canvas-engine-inspector-overlays.md`
- **Lines:** 24, 34, 144
- **Gap:** Internal contradiction. §2 + §6 still use old baseline `⌘⌥U/S/I/X`. §3 + founder lock §12.5 (2026-05-17) ratified `⌥⇧U/S/I/E` (Figma-exact).
- **Fix:** Find-replace `⌘⌥U` → `⌥⇧U`, `⌘⌥S` → `⌥⇧S`, `⌘⌥I` → `⌥⇧I`, `⌘⌥X` → `⌥⇧E` (note: `X` → `E` per founder lock — last letter changes too) at lines 24, 34, 144. Re-grep PRD 07b for `⌘⌥` after edit to confirm 0 hits in Boolean-op contexts. Plan 07b implementation already uses the new lock — no Plan changes needed.
- **Commit:** `fix(qa-w5a): PRD 07b Boolean shortcuts ⌘⌥U/S/I/X → ⌥⇧U/S/I/E (founder lock §12.5)`

### 10. `<style scoped>` blocks — Plans 06 + 09

- **Files:** `06-canvas-editor-core-chrome-plan.md:1799`, `09-version-history-and-trash-plan.md:3110`
- **Gap:** CLAUDE.md hard rule: "No inline CSS, no `<style>` blocks. Tailwind utility classes only." Plan 02 already has a documented exception pattern at L3132 (acknowledgement + justification).
- **Fix:** Choose ONE of:
  - **Option A (preferred):** Replace each `<style scoped>` block with equivalent Tailwind utility classes inline on the relevant elements.
  - **Option B:** Match Plan 02:3132 pattern — annotate the block with an `<!-- CLAUDE.md exception: <reason> -->` comment explaining why Tailwind can't express the rule (e.g., dynamic CSS-var fallback). Only use B if Option A genuinely doesn't work.
- **Commit:** `fix(qa-w5a): <style scoped> in Plans 06 + 09 → Tailwind utilities (or acknowledged exception)`

### 11. `<icon-lucide-*>` static refactor — Plans 10/11/12 (15 hits)

- **Files + lines (per audit §7 anomaly #6):**
  - `Plan 11`: `:2008, :2157, :2732, :2963, :3001, :3024, :3045` (7 hits)
  - `Plan 10`: 7 hits (use grep to enumerate)
  - `Plan 12`: 1 hit (use grep to enumerate)
- **Gap:** Plan 11:2332 explicitly bans `<icon-lucide-*>` raw tags. Static + dynamic both forbidden per founder decision 2026-05-19 (recorded in W5a dispatch). Plan 11 contradicts its own contract.
- **Fix:** Replace every `<icon-lucide-<name>>` with `<KovaIcon name="<name>" />` across Plans 10/11/12. Re-grep all three Plans after edit — must return 0 hits for `icon-lucide-` (allowing negative-reference callouts like Plan 06:491). Add a Plan 11 self-test: a CI grep gate that fails on any `<icon-lucide-` in `docs/kova-final-impl-plans/*.md`.
- **Commit:** `fix(qa-w5a): refactor 15 static <icon-lucide-*> → <KovaIcon> across Plans 10/11/12`

### 12. C-LOW-11.7 — Plan 11 T4.3 task split

- **File:** `docs/kova-final-impl-plans/11-shared-ui-infrastructure-plan.md`
- **Lines:** 2238–2321
- **Gap:** T4.3 currently bundles `<KovaMenu>` + `<KovaTooltip>` into one task. Per Plan-authoring convention, atomic primitives = one task each.
- **Fix:** Split into T4.3a (`<KovaMenu>` — Reka DropdownMenu wrapper) + T4.3b (`<KovaTooltip>` — Reka Tooltip wrapper). Renumber any downstream task references if present.
- **Commit:** `fix(qa-w5a): C-LOW-11.7 split Plan 11 T4.3 → T4.3a (KovaMenu) + T4.3b (KovaTooltip)`

### 13. CT-018 PRD 07b status — IF still drift after item 2

(This is a sanity sweep, not a separate commit unless item 2 missed something.) After items 1–12 land, re-grep all 13 PRDs + 13 Plans for the patterns enumerated in §5. If any straggler appears, fix in a 13th commit. Otherwise skip.

---

## Quality gates (run after each commit + before final push)

```sh
# 1. Branch
git branch --show-current                     # must be feat/m9-shopify

# 2. No worktree drift
git worktree list                             # only main worktree (+ unrelated m5.5)

# 3. Working tree clean
git status

# 4. Per-commit scope discipline — each commit should touch ONE finding
git log --oneline -1                          # message should match fix(qa-w5a): <ID> ...

# 5. Forbidden patterns (run after items 11 + 12 specifically)
grep -rn 'icon-lucide-' docs/kova-final-impl-plans/ | grep -v 'NOT permitted\|forbidden\|do not\|MUST NOT'
grep -rn '<style scoped' docs/kova-final-impl-plans/ | grep -v 'exception:'
grep -rn '/dashboard?brandId=' docs/kova-final-prds/
grep -rn '⌘⌥[USIX]' docs/kova-final-prds/07b-canvas-engine-inspector-overlays.md
# All four should return 0 lines (or only documented negative-reference callouts)
```

---

## Cross-cutting rules

1. **Spec-doc only.** Zero app-code edits. Diff stat must show only `.md` files.
2. **No squashing.** One commit per item. The W2 Cluster 03 squash + W3 C-MED20 subsumption taught us this. Audit log + per-finding diff > atomic rewrites.
3. **No `--no-verify`, no `--force`.** If pre-commit hook fails, fix the underlying issue. Create a NEW commit (never amend).
4. **Use AskUserQuestion if blocked.** Anything genuinely ambiguous — STOP. Don't guess on founder-locked decisions.
5. **Invoke `superpowers:using-superpowers` first** + any relevant skills (`writing-plans` recommended for scoping; `code-reviewer` after writing for self-review).
6. **Write a plan doc.** Use `superpowers:writing-plans` skill to author a brief plan at `docs/superpowers/plans/2026-05-19-w5a-polish-pass.md` BEFORE editing any spec. Commit the plan doc as the first commit (`docs(qa-w5a): W5a polish-pass implementation plan`). This matches the W3 + W4 pattern.

---

## When done

1. All 13 commits (1 plan + 12 finding-commits, or 13 if item 13 needed) pushed to `origin/feat/m9-shopify`.
2. `git status` clean.
3. Report output:

```
W5a POLISH PASS DONE.
Commits: <N> pushed to feat/m9-shopify (origin HEAD: <hash>)
Files changed: <count> markdown
Diff: +<add> / -<del>
Per-finding closure:
  1. W0-3 PRD 06 routing ............ ✅
  2. CT-018 PRD 07b status .......... ✅
  ... (etc)
Quality gates: <list each gate + pass/fail>
Blockers: <none | list>
```

Then notify founder for re-audit dispatch (the same audit agent can do incremental delta verification on the 13 items).
