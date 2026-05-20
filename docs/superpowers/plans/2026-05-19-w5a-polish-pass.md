# W5a — Pre-Build Polish Pass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to walk this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the 12 MEDIUM findings from `FINAL-AUDIT-REPORT.md §5` + 1 icon-convention sweep (15 hits across Plans 10/11/12) on `feat/m9-shopify` as 12 separate finding-commits, so the branch is ready for app-build phase.

**Architecture:** Spec-doc only. Zero `.ts` / `.vue` / `.sql` edits. Diff stat must be 100% markdown. One finding = one commit. No squashing. Push every 3–4 commits.

**Tech Stack:** git on `feat/m9-shopify` (no worktree per founder lock 2026-05-19), markdown spec docs under `docs/kova-final-prds/` + `docs/kova-final-impl-plans/`.

**Source:** `docs/kova-final-qa/fix-dispatch/FIX-W5a-polish-pass.md` (dispatch) + `docs/kova-final-qa/FINAL-AUDIT-REPORT.md §5` (auditor evidence).

**Branch + commit shape:**

```
fix(qa-w5a): <FINDING-ID> <one-line summary>

<body — what + why; cite FINAL-AUDIT-REPORT.md line if relevant>
```

**Quality gates (run after each commit + before final push):**

```sh
git branch --show-current                     # must = feat/m9-shopify
git status                                    # clean after each commit
git log --oneline -1                          # message matches fix(qa-w5a): <ID> ...
git worktree list                             # only main + unrelated m5.5
```

**Forbidden-pattern grep gates (run after items 11/12 specifically):**

```sh
grep -rn 'icon-lucide-' docs/kova-final-impl-plans/ | grep -v 'NOT permitted\|forbidden\|do not\|MUST NOT\|scrub'
grep -rn '<style scoped' docs/kova-final-impl-plans/ | grep -v 'exception:'
grep -rn '/dashboard?brandId=' docs/kova-final-prds/
grep -rn '⌘⌥[USIX]' docs/kova-final-prds/07b-canvas-engine-inspector-overlays.md
# All four → 0 lines (or only documented negative-reference callouts)
```

---

## Task 0: Plan commit + push

**Files:**
- Create: `docs/superpowers/plans/2026-05-19-w5a-polish-pass.md` (this file)

- [ ] **Step 1: Stage + commit plan doc**

```bash
git add docs/superpowers/plans/2026-05-19-w5a-polish-pass.md
git commit -m "$(cat <<'EOF'
docs(qa-w5a): W5a polish-pass implementation plan

Plan covering 12 MEDIUM findings from FINAL-AUDIT-REPORT.md §5 + icon-lucide
sweep. Mirrors W3 + W4 pattern: plan doc lands as first commit, then one
finding-commit per item. Spec-doc only (zero .ts/.vue/.sql).
EOF
)"
```

- [ ] **Step 2: Push so progress is visible**

```bash
git push origin feat/m9-shopify
```

---

## Task 1: W0-3 — PRD 06 `/dashboard?brandId=` → `/brand/:brandId` (7 hits)

**Files:**
- Modify: `docs/kova-final-prds/06-canvas-editor-core-chrome.md` at L30, L46, L203, L398, L532, L533, L696

**Evidence:** FINAL-AUDIT-REPORT.md §5 W0-3 — prose drift; W0-3 canonical lock is `/brand/:brandId` (founder ratified). Confirmed by `grep -n '/dashboard?brandId=' docs/kova-final-prds/06-canvas-editor-core-chrome.md`.

- [ ] **Step 1: Find-replace ALL occurrences in PRD 06**

For each hit, replace `/dashboard?brandId=...` → `/brand/:brandId` (when literal/path-template context) or `/brand/${currentBrandId}` (when code/JS context like `router.push(...)`).

  - L30: `router.push('/dashboard?brandId={current}')` → `router.push('/brand/' + currentBrandId)` style mention
  - L46: `router.push('/dashboard?brandId=' + selectedBrand.id)` → `router.push('/brand/' + selectedBrand.id)`
  - L203 (table): `router.push('/dashboard?brandId=' + selectedBrand.id)` → `router.push('/brand/' + selectedBrand.id)`
  - L398 (table): `brand-click → router.push('/dashboard?brandId=...')` → `brand-click → router.push('/brand/' + brand.id)`
  - L532: acceptance bullet — update path
  - L533: acceptance bullet "Back to dashboard" routes to `/dashboard?brandId=...` → `/brand/:brandId`
  - L696 (E2E test row): `assert URL is /dashboard?brandId=...` → `assert URL is /brand/:brandId`

- [ ] **Step 2: Verify zero residual hits in PRD 06**

```bash
grep -n '/dashboard?brandId=' docs/kova-final-prds/06-canvas-editor-core-chrome.md
```

Expected: empty output.

- [ ] **Step 3: Commit**

```bash
git add docs/kova-final-prds/06-canvas-editor-core-chrome.md
git commit -m "fix(qa-w5a): W0-3 PRD 06 routing — 7 /dashboard?brandId= → /brand/:brandId"
```

---

## Task 2: CT-018 — PRD 07b status DRAFT → IN-REVIEW

**Files:**
- Modify: `docs/kova-final-prds/07b-canvas-engine-inspector-overlays.md` L7–L10

**Evidence:** FINAL-AUDIT-REPORT.md §5 CT-018 — body is founder-finalized 2026-05-17 but frontmatter still says DRAFT.

- [ ] **Step 1: Read L1–L20 of PRD 07b**

- [ ] **Step 2: Update header fields**

  - `Status: DRAFT 2026-05-15` → `Status: IN-REVIEW 2026-05-17`
  - `Last updated: <old>` → `Last updated: 2026-05-19`

- [ ] **Step 3: Commit**

```bash
git add docs/kova-final-prds/07b-canvas-engine-inspector-overlays.md
git commit -m "fix(qa-w5a): CT-018 PRD 07b status DRAFT → IN-REVIEW 2026-05-17"
```

---

## Task 3: C-MED9 — PRD 03 §5.2 SECURITY DEFINER RPC count 6 → 7

**Files:**
- Modify: `docs/kova-final-prds/03-brand-management.md` near L53

**Evidence:** FINAL-AUDIT-REPORT.md §5 C-MED9 — `restore_brand` promoted to SECURITY DEFINER making the count 7.

- [ ] **Step 1: Read PRD 03 §5.2 (L40–L120)**

- [ ] **Step 2: Update count**

Change `6 SECURITY DEFINER RPCs` → `7 SECURITY DEFINER RPCs`. Verify the enumerated RPC list below the count: confirm 7 entries (including `restore_brand`). If only 6 listed, add `restore_brand` to the enumeration in alphabetical order with a brief one-line description matching the others.

- [ ] **Step 3: Commit**

```bash
git add docs/kova-final-prds/03-brand-management.md
git commit -m "fix(qa-w5a): C-MED9 PRD 03 §5.2 SECURITY DEFINER RPC count 6 → 7"
```

---

## Push Checkpoint A: after Tasks 0–3

```bash
git push origin feat/m9-shopify
```

---

## Task 4: C-MED13 — refactor 3 Resend templates to EmailShell (Plan 04)

**Files:**
- Modify: `docs/kova-final-impl-plans/04-account-and-stripe-billing-plan.md` L3600–L3658

**Evidence:** FINAL-AUDIT-REPORT.md §5 C-MED13 — only `subscription-new.ts` uses `<EmailShell>` composition; 3 remaining templates (`subscription-upgraded`, `subscription-cancelled`, `payment-failed`) still hand-rolled `<!doctype html>`.

- [ ] **Step 1: Read Plan 04 L3540–L3680** (covers Step 1 `subscription-new.ts` `buildEmail()` pattern + the 3 stale templates)

- [ ] **Step 2: Refactor each of the 3 templates inline in the plan**

Apply the `buildEmail()` / `<EmailShell>` composition pattern from Step 1. For each:
  - Preserve every literal content string + Resend metadata (subject, from, replyTo, headers)
  - Replace `<!doctype html>...<html><body>...inline-table-wrappers...</body></html>` boilerplate with `buildEmail({ heading, body, ctaLabel?, ctaUrl?, footer })`
  - Show the COMPLETE refactored TS inline in the plan (no "see Step 1" placeholders)

- [ ] **Step 3: Verify content parity**

Diff content strings before/after — only the wrapper should change. List the 3 refactored templates explicitly in a small acceptance bullet near §End of Step.

- [ ] **Step 4: Commit**

```bash
git add docs/kova-final-impl-plans/04-account-and-stripe-billing-plan.md
git commit -m "fix(qa-w5a): C-MED13 refactor 3 Resend templates to EmailShell (Plan 04)"
```

---

## Task 5: C-MED17 — Plan 06 T2 `showUI` 3-state enum migration

**Files:**
- Modify: `docs/kova-final-impl-plans/06-canvas-editor-core-chrome-plan.md` (T2 or T14 EditorView refactor section)
- Migration targets cited in plan body: `use-keyboard.ts:140`, `AppMenu.vue:216`, `EditorView.vue:164/234/246/266`

**Evidence:** FINAL-AUDIT-REPORT.md §5 C-MED17 — T2 canonicalizes `'hidden' | 'minimized' | 'full'` but 5 callsites still use prior boolean / `'all' | 'minimal' | 'hidden'` form.

- [ ] **Step 1: Read Plan 06 T2 + T14 regions**

- [ ] **Step 2: Add migration sub-step**

Under T2 (or annotate T14 if cleaner contextually), insert a sub-step "Migrate 5 legacy `showUI` callsites" with a small table:

| Callsite | Before | After |
|----------|--------|-------|
| `use-keyboard.ts:140` | `showUI.value = !showUI.value` (or old enum) | `showUI.value = showUI.value === 'hidden' ? 'full' : 'hidden'` |
| `AppMenu.vue:216` | `showUI === 'all'` | `showUI === 'full'` |
| `EditorView.vue:164` | `showUI === 'minimal'` | `showUI === 'minimized'` |
| `EditorView.vue:234` | `showUI ? ... : ...` | `showUI === 'full' ? ... : ...` |
| `EditorView.vue:246` | `if (showUI === 'hidden')` (already correct) | unchanged — assert |
| `EditorView.vue:266` | `showUI === 'all'` | `showUI === 'full'` |

(Show the actual before/after lines — engineer should be able to apply without re-reading source.)

- [ ] **Step 3: Add CI grep guard step**

Append a verification step requiring a grep gate during T2 implementation:

```bash
grep -rnE "showUI\s*[=!]==?\s*['\"](all|minimal)['\"]|showUI\.value\s*=\s*!" src/
# expected: 0 hits (allowing test fixtures explicitly cited)
```

- [ ] **Step 4: Commit**

```bash
git add docs/kova-final-impl-plans/06-canvas-editor-core-chrome-plan.md
git commit -m "fix(qa-w5a): C-MED17 Plan 06 T2 showUI 3-state enum migration for 5 callsites"
```

---

## Task 6: CT-020 residual — PRD 02 collapse offline 3-signal → single NetworkStatusIndicator

**Files:**
- Modify: `docs/kova-final-prds/02-onboarding-and-dashboard.md` L902, L917

**Evidence:** FINAL-AUDIT-REPORT.md §5 CT-020 residual — rest of PRD 02 adopts single `<NetworkStatusIndicator>` but the E2E spec row + manual-QA bullet drifted.

- [ ] **Step 1: Read PRD 02 L880–L950**

- [ ] **Step 2: Rewrite L902 (E2E spec row)**

Reframe E2E test from "asserts 3 offline signals visible" → "asserts `<NetworkStatusIndicator>` renders the offline state (single component)".

- [ ] **Step 3: Rewrite L917 (manual-QA bullet)**

Same collapse — single component reference.

- [ ] **Step 4: Verify §12.10 acceptance criteria still align**

Read §12.10 (a few lines around the acceptance block). Confirm bullets reference single component only. If a stale 3-signal bullet still exists in §12.10, fix it too in this commit.

- [ ] **Step 5: Commit**

```bash
git add docs/kova-final-prds/02-onboarding-and-dashboard.md
git commit -m "fix(qa-w5a): CT-020 residual PRD 02:902,917 collapse 3-signal → single NetworkStatusIndicator"
```

---

## Push Checkpoint B: after Tasks 4–6

```bash
git push origin feat/m9-shopify
```

---

## Task 7: CT-013 — Plan 05 inline 5 RPC bodies (Option A preferred)

**Files:**
- Modify: `docs/kova-final-impl-plans/05-brand-kit-and-drag-drop-plan.md` (T1 + T2 sections; possibly T8)

**Evidence:** FINAL-AUDIT-REPORT.md §5 CT-013 — other Cluster plans inline RPC SQL; Plan 05 only references PRD 05 §4.1, leaving `SET search_path = public, pg_temp` invisible at plan level.

- [ ] **Step 1: Read PRD 05 §4.1 (source of truth for the 5 RPC bodies)**

The 5 brand-kit RPCs (confirm names while reading): typically `upsert_brand_kit_color`, `delete_brand_kit_color`, `reorder_brand_kit_colors`, `upsert_brand_kit_font`, `upsert_brand_kit_logo` (or similar — use the actual list in PRD 05).

- [ ] **Step 2: Read Plan 05 T1 + T2 regions**

- [ ] **Step 3: Choose path**

If T1 + T2 already have SQL block(s) that just don't include the full body, expand them. If no SQL block exists, add one in T1 (creation) with a one-block-per-RPC structure:

```sql
CREATE OR REPLACE FUNCTION upsert_brand_kit_color(...)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  ...
BEGIN
  ...
END;
$$;
```

Repeat for all 5 RPCs (exact body verbatim from PRD 05 §4.1).

- [ ] **Step 4: Fallback (Option B) only if Option A blocked**

If the engineer cannot inline (e.g., PRD 05 §4.1 doesn't have full bodies), instead add a T8 (RLS test) assertion: parse PRD 05 §4.1 RPC bodies, grep for `SET search_path = public, pg_temp` on each, fail T8 if any RPC missing the line. Document the chosen path explicitly in the commit body.

- [ ] **Step 5: Commit**

```bash
git add docs/kova-final-impl-plans/05-brand-kit-and-drag-drop-plan.md
git commit -m "fix(qa-w5a): CT-013 Plan 05 inline 5 RPC bodies (or T8 search_path assertion)"
```

---

## Task 8: B-MED17 straggler — Plan 03:2418 inline mock → `mock.module()` at file scope

**Files:**
- Modify: `docs/kova-final-impl-plans/03-brand-management-plan.md` near L2418

**Evidence:** FINAL-AUDIT-REPORT.md §5 B-MED17 — `store.createBrand = mock(async () => ...)` violates file-scope pattern enforced elsewhere in Cluster plans.

- [ ] **Step 1: Read Plan 03 L2380–L2460**

- [ ] **Step 2: Rewrite the test block**

Replace inline `store.createBrand = mock(...)` with file-scope:

```ts
mock.module('@/stores/brands', () => ({
  useBrandsStore: () => ({
    createBrand: mock(async () => ({ id: 'brand-1', ... })),
    // preserve all other store methods the test exercises
    // ...
  }),
}));
```

Place at top of the test file (after imports, before `describe()`).

- [ ] **Step 3: Verify test still asserts identical behavior**

Walk the test body mentally — does the assertion still resolve through the file-scope mock? If the test uses spy-like reads (`expect(store.createBrand).toHaveBeenCalled()`), retain spy via `const createBrandSpy = mock(async ...); useBrandsStore: () => ({ createBrand: createBrandSpy })`.

- [ ] **Step 4: Commit**

```bash
git add docs/kova-final-impl-plans/03-brand-management-plan.md
git commit -m "fix(qa-w5a): B-MED17 Plan 03:2418 inline mock reassignment → mock.module at file scope"
```

---

## Task 9: PRD 07b — Boolean shortcuts ⌘⌥U/S/I/X → ⌥⇧U/S/I/E (5 hits, not 3)

**Files:**
- Modify: `docs/kova-final-prds/07b-canvas-engine-inspector-overlays.md` L24, L34, L144, L1003, L1035

**Evidence:** FINAL-AUDIT-REPORT.md §5 + founder lock §12.5 (2026-05-17 — Figma-exact). Dispatch listed L24/34/144; `grep -n '⌘⌥[USIX]'` returned 5 lines. Re-grep gate requires 0 hits in Boolean-op contexts, so all 5 must be migrated. L1003 + L1035 are Q3 #14 baseline citations now superseded.

- [ ] **Step 1: Read PRD 07b L20–L50, L140–L160, L1000–L1045**

- [ ] **Step 2: Find-replace mapping (X → E for last letter — not a typo)**

  - `⌘⌥U` → `⌥⇧U`
  - `⌘⌥S` → `⌥⇧S`
  - `⌘⌥I` → `⌥⇧I`
  - `⌘⌥X` → `⌥⇧E`

Apply at each of L24, L34, L144, L1003, L1035. For L1003 + L1035 (which currently cite "Standard Figma shortcuts" / Figma Help anchor): keep the citation but update the shortcut tokens to the new lock; optionally append a parenthetical "(per founder §12.5 lock matching current Figma behavior)" so future readers don't think it's drift.

- [ ] **Step 3: Re-grep gate**

```bash
grep -n '⌘⌥[USIX]' docs/kova-final-prds/07b-canvas-engine-inspector-overlays.md
```

Expected: empty (or only a deliberate negative-reference callout like "supersedes Q3 #14 ⌘⌥U/S/I/X baseline" at L54 — which is the founder-lock history annotation and may stay).

- [ ] **Step 4: Commit**

```bash
git add docs/kova-final-prds/07b-canvas-engine-inspector-overlays.md
git commit -m "fix(qa-w5a): PRD 07b Boolean shortcuts ⌘⌥U/S/I/X → ⌥⇧U/S/I/E (founder lock §12.5)"
```

---

## Push Checkpoint C: after Tasks 7–9

```bash
git push origin feat/m9-shopify
```

---

## Task 10: `<style scoped>` blocks — Plans 06 + 09 → Tailwind

**Files:**
- Modify: `docs/kova-final-impl-plans/06-canvas-editor-core-chrome-plan.md` near L1799
- Modify: `docs/kova-final-impl-plans/09-version-history-and-trash-plan.md` near L3110

**Evidence:** FINAL-AUDIT-REPORT.md §5 — CLAUDE.md hard rule: "Tailwind utility classes only. No inline CSS, no `<style>` blocks." Plan 02:3132 has the documented exception pattern.

- [ ] **Step 1: Read each `<style scoped>` block + surrounding template**

For each plan, read ±40 lines around the line cited.

- [ ] **Step 2: Choose path per block (Option A preferred)**

  - **Option A — convert to Tailwind:** Walk each CSS rule. If it's expressible with Tailwind utilities, inline classes on the relevant elements. Show before/after of the template + the deleted `<style>` block.
  - **Option B — acknowledged exception:** Only if the rule cannot be expressed (e.g., dynamic CSS-var fallback, complex `@keyframes`), match Plan 02:3132 pattern by prepending `<!-- CLAUDE.md exception: <one-line reason> -->` to the `<style scoped>` block.

Decision rule: prefer A. Use B only when A genuinely fails; cite the specific Tailwind limitation in the exception comment.

- [ ] **Step 3: Re-grep gate**

```bash
grep -rn '<style scoped' docs/kova-final-impl-plans/ | grep -v 'exception:'
```

Expected: 0 lines (after edits).

- [ ] **Step 4: Commit**

```bash
git add docs/kova-final-impl-plans/06-canvas-editor-core-chrome-plan.md docs/kova-final-impl-plans/09-version-history-and-trash-plan.md
git commit -m "fix(qa-w5a): <style scoped> in Plans 06 + 09 → Tailwind utilities (or acknowledged exception)"
```

---

## Task 11: `<icon-lucide-*>` refactor — Plans 10/11/12 (15 hits)

**Files + lines:**
- `docs/kova-final-impl-plans/10-ai-chat-and-memory-plan.md`: L1677, L2238, L2269, L2282, L2294, L2307 (6 hits)
- `docs/kova-final-impl-plans/11-shared-ui-infrastructure-plan.md`: L2008, L2157, L2732, L2963, L2973 (prose), L3001, L3024, L3045 (8 hits — 7 tag + 1 prose)
- `docs/kova-final-impl-plans/12-settings-and-preferences-plan.md`: L1749 (1 hit)
- (Total: 15 hits. Negative-reference callouts at Plan 11:2332/2334 + Plan 06:491 stay — they're contract-statement text.)

**Evidence:** FINAL-AUDIT-REPORT.md §5 + Plan 11:2332 contract — every icon must render via `<KovaIcon name="..." />`. Founder decision 2026-05-19 forbids both static + dynamic `<icon-lucide-*>` raw tags.

- [ ] **Step 1: Apply replacement at each tag-form hit**

Mapping: `<icon-lucide-<name> [attrs...] />` → `<KovaIcon name="<name>" [attrs...] />`. Preserve all class / size / data-* / v-* / event attributes verbatim. Examples:
  - `<icon-lucide-x class="size-2.5" />` → `<KovaIcon name="x" class="size-2.5" />`
  - `<icon-lucide-chevron-left class="size-3.5" />` → `<KovaIcon name="chevron-left" class="size-3.5" />`
  - `<icon-lucide-loader v-if="loading" data-test="spinner" class="spinner" />` → `<KovaIcon name="loader" v-if="loading" data-test="spinner" class="spinner" />`

- [ ] **Step 2: Apply rephrase at Plan 11:2973 prose reference**

Original: "renders a 14×14 `icon-lucide-cloud-off` in `--ink-2` inside a `<KovaTooltip>` ..."
Rewrite: "renders a 14×14 `<KovaIcon name="cloud-off" />` in `--ink-2` inside a `<KovaTooltip>` ..."

- [ ] **Step 3: Re-grep gate**

```bash
grep -rn 'icon-lucide-' docs/kova-final-impl-plans/
```

Expected: ONLY negative-reference callouts — Plan 11:2332 ("four forbidden alternates — `<icon-lucide-*>` raw tags with dynamic names..."), Plan 11:2334 (rationale prose), Plan 06:491 (historical negative reference if present). Zero `<icon-lucide-<name>>` actual tags.

- [ ] **Step 4: Add self-test grep gate to Plan 11**

Inside Plan 11 (near §6.2 / §icon contract or as a new T4-acceptance row), add a CI grep gate spec:

```bash
# Forbidden: any <icon-lucide-... in spec docs (allowing documented negative-reference prose)
test "$(grep -rE '<icon-lucide-[a-z]+' docs/kova-final-impl-plans/ | wc -l)" -eq 0 \
  || (echo "Found raw <icon-lucide-*> in spec — use <KovaIcon name=\"...\">" && exit 1)
```

- [ ] **Step 5: Commit**

```bash
git add docs/kova-final-impl-plans/10-ai-chat-and-memory-plan.md docs/kova-final-impl-plans/11-shared-ui-infrastructure-plan.md docs/kova-final-impl-plans/12-settings-and-preferences-plan.md
git commit -m "fix(qa-w5a): refactor 15 static <icon-lucide-*> → <KovaIcon> across Plans 10/11/12"
```

---

## Task 12: C-LOW-11.7 — Plan 11 T4.3 split → T4.3a (KovaMenu) + T4.3b (KovaTooltip)

**Files:**
- Modify: `docs/kova-final-impl-plans/11-shared-ui-infrastructure-plan.md` L2238–L2321

**Evidence:** FINAL-AUDIT-REPORT.md §5 C-LOW-11.7 — atomic primitives = one task each per Plan-authoring convention.

- [ ] **Step 1: Read Plan 11 L2200–L2350**

- [ ] **Step 2: Split T4.3 into T4.3a + T4.3b**

  - **T4.3a — `<KovaMenu>` (Reka DropdownMenu wrapper):** keep all Menu-related rows (file `KovaMenu.vue`, Reka `DropdownMenu*` primitives, props, slots, tests).
  - **T4.3b — `<KovaTooltip>` (Reka Tooltip wrapper):** keep all Tooltip-related rows (file `KovaTooltip.vue`, Reka `Tooltip*` primitives, props, slots, tests).

Each split task must be self-contained — duplicate any shared boilerplate (TDD ritual + commit step) rather than cross-referencing.

- [ ] **Step 3: Renumber downstream task references if needed**

Search Plan 11 for `T4.3` references after the split point. If any still refer to the bundled T4.3, disambiguate to `T4.3a` or `T4.3b` per intent.

```bash
grep -n 'T4\.3' docs/kova-final-impl-plans/11-shared-ui-infrastructure-plan.md
```

- [ ] **Step 4: Commit**

```bash
git add docs/kova-final-impl-plans/11-shared-ui-infrastructure-plan.md
git commit -m "fix(qa-w5a): C-LOW-11.7 split Plan 11 T4.3 → T4.3a (KovaMenu) + T4.3b (KovaTooltip)"
```

---

## Task 13: Sanity sweep — re-grep entire QA scope; commit only if straggler found

- [ ] **Step 1: Run all four forbidden-pattern gates**

```bash
grep -rn 'icon-lucide-' docs/kova-final-impl-plans/ | grep -v 'NOT permitted\|forbidden\|do not\|MUST NOT\|scrub'
grep -rn '<style scoped' docs/kova-final-impl-plans/ | grep -v 'exception:'
grep -rn '/dashboard?brandId=' docs/kova-final-prds/
grep -rn '⌘⌥[USIX]' docs/kova-final-prds/07b-canvas-engine-inspector-overlays.md
```

All four → 0 lines (or only documented negative-reference callouts).

- [ ] **Step 2: If straggler found, commit 13th finding-commit**

Commit message format: `fix(qa-w5a): CT-018 PRD <doc> straggler — <one-line>`.

- [ ] **Step 3: If clean, skip — no 13th commit**

---

## Push Checkpoint D: final push after Tasks 10–13

```bash
git push origin feat/m9-shopify
git log --oneline origin/feat/m9-shopify -15
```

Then produce the "W5a POLISH PASS DONE." report block per dispatch §"When done".

---

## Done-criteria

- 12 or 13 finding-commits + 1 plan commit pushed to `origin/feat/m9-shopify`
- `git status` clean
- All four forbidden-pattern grep gates return 0 lines
- 100% markdown diff (no `.ts` / `.vue` / `.sql`)
- Each commit follows `fix(qa-w5a): <ID> <summary>` format (plan commit = `docs(qa-w5a):`)
