# W11c — Cluster 08 (Menus + Popovers + Shortcuts) AUDIT Prompt

**Wave:** W11c
**Cluster:** 08 — Right-click context menus (empty canvas + node), file menu, use-keyboard.ts shortcut registry, popovers
**Audit type:** Keyboard correctness + menu state machine + Cmd+K kill verification + find-residuals strip (CT-022). Plan 08 rewritten 435→1284 lines per W3 C-MED20.
**Status:** ready after W11c DONE (after Cluster 06 + 07b merged)
**Prerequisites:** Branch `app/cluster-08-menus` (worktree `/Users/jihoyang/kova-build-c08`). DONE at `cluster-reports/W11c-cluster-08-DONE.md`.

---

## Founder pre-flight

1. W11c printed DONE
2. Cluster 06 + 07b merged
3. 00g-CMDK_KILL_DISPATCH read for Cmd+K kill context

---

## Launch

Fresh session. Opus 4.7. Paste verbatim.

---

## PROMPT (paste verbatim)

```
You are the W11c AUDIT agent for Kova. Independent reviewer for
Cluster 08 — menus + popovers + shortcuts.

This cluster has TWO critical kills to verify:
1. Cmd+K palette KILLED (per 00g-CMDK_KILL_DISPATCH — zero "Cmd+K"
   or "Command palette" anywhere in cluster code)
2. FindOverlay residuals STRIPPED (per CT-022 — find belongs to
   Cluster 07b end-to-end; no residual find code lives in 08)

READ-ONLY. Surface CRITICAL via AskUserQuestion mid-audit.

## Mandatory reading

1. docs/execution-phase/MASTER-EXECUTION-GUIDE.md
2. docs/execution-phase/DESIGN-SYSTEM-COMPLIANCE-RIDER.md
3. docs/execution-phase/claude-design-files/IMPLEMENTATION_PROMPT.md
4. docs/execution-phase/execution-prompts/W11c-cluster-08-menus.md
   (ORIGINAL execution prompt — scope boundary)
5. docs/kova-final-prds/08-canvas-menus-popovers-shortcuts.md
6. docs/kova-final-impl-plans/08-canvas-menus-popovers-shortcuts-plan.md
   (Plan 08 rewritten 435→1284 lines per W3 C-MED20)
7. docs/execution-phase/cluster-reports/W11c-cluster-08-DONE.md
8. docs/kova-final-prds/00g-CMDK_KILL_DISPATCH.md (Cmd+K kill
   context)
9. CLAUDE.md root + outer

## Mandatory skills

1. superpowers:using-superpowers
2. superpowers:verification-before-completion

## Mandatory subagents

1. superpowers:code-reviewer — full diff sweep
2. vue-expert — menu reactivity, shortcut handler reactivity
3. typescript-pro — keyboard shortcut type-safe handler registry

## Conditional subagents

- e2e-runner — re-run right-click empty canvas / node, Cmd+S, ⌥⇧U
  cross-cluster smoke

## Cluster 08 expected scope

ALLOWED:
- src/components/canvas/menus/* — RightClickMenu (empty + node
  variants), FileMenu wiring (App menu)
- src/components/canvas/popovers/* — canvas popovers (per PRD 08)
- src/composables/use-keyboard.ts — shortcut registry (atomic
  rewrite per W3 C-MED20; split into 2.6a-e per-category TDD per
  C-MED21)
- src/composables/useContextMenu.ts (or equivalent)
- src/components/ui/KovaMenu*.vue — IF not already in Cluster 11
- tests/*

FORBIDDEN:
- packages/core/** — CRITICAL
- Find feature components (FindOverlay, SearchPanel,
  DimLayerOverlay, useFindStore, useCameraPan) — CT-022 means
  these live in Cluster 07b, not 08
- Cmd+K palette anywhere (kill per 00g-CMDK_KILL_DISPATCH)

## Audit dimensions

### A. Branch + diff baseline

  git fetch origin
  git log --oneline feat/m9-shopify..app/cluster-08-menus
  git diff --stat feat/m9-shopify...app/cluster-08-menus

One-per-task. Conventional commits.

### B. Cmd+K palette KILL (per 00g-CMDK_KILL_DISPATCH — CRITICAL)

Grep aggressively for any Cmd+K palette residual:

  git grep -inE 'cmd[+-]?k|cmdk|command[-_ ]?palette|⌘k' \
    src/ 2>/dev/null

ANY hit = CRITICAL. The palette is dead. No remnants. No
placeholder. No commented-out code. No tests for it. No
shortcut binding for ⌘K (Cmd+K).

Verify also no .vue component named CommandPalette, CmdK, Palette,
QuickSearch, QuickActions, etc.

  git ls-files src/ | grep -iE 'cmdk|command.?palette|quick.?(search|action)|palette\.vue'

Any hit = CRITICAL.

### C. FindOverlay residuals STRIPPED (CT-022 — CRITICAL)

Find lives in Cluster 07b end-to-end. Verify NO find-related code
in Cluster 08's diff:

  git diff feat/m9-shopify...app/cluster-08-menus -- 'src/**' \
    | grep -nE 'FindOverlay|SearchPanel|DimLayerOverlay|useFindStore|useCameraPan'

Any hit in NEW code on this branch = CRITICAL violation of CT-022.

Note: it's OK if Cluster 08 REGISTERS a shortcut that opens find
(e.g., Cmd+F triggers Cluster 07b's useFindStore) — but the find
COMPONENTS themselves must not be in this cluster's diff.

Verify Cmd+F handler in use-keyboard.ts dispatches to Cluster 07b's
useFindStore (import only; no inline find impl).

### D. e.code (NOT e.key) per CLAUDE.md root

  git diff feat/m9-shopify...app/cluster-08-menus \
    -- 'src/composables/use-keyboard.ts' 'src/**' \
    | grep -nE "e\.key|event\.key"

Any hit (besides comments / explanations) = HIGH. Option key
transforms characters on Mac — e.code required.

### E. Right-click empty canvas — Figma full 12-item menu (founder
lock 2026-05-17)

Open the empty-canvas right-click menu component. Verify EXACTLY
12 items matching Figma's empty-canvas menu (read the right-click-
on-canvas.png reference at outer-repo path).

Less than 12 OR more than 12 = HIGH. Item order matching Figma
strongly preferred.

### F. Last-page delete = Figma-style disabled (founder lock)

When the last canvas/page exists, the "delete page" menu item
appears DISABLED with a tooltip explaining why (per Figma
pattern). NOT hidden, NOT removed. Click on disabled item = no-op
+ tooltip.

Verify with unit test.

### G. Outlines = 3 separate toggles + global submenu (founder lock)

Verify the Outlines menu structure:
- 3 separate toggles (e.g., "frame outlines", "selection
  outlines", "constraint outlines" — per PRD 08 + design.md spec)
- Global "Outlines" submenu groups them

Each toggle persists to user_preferences (cross-cluster contract
with Cluster 12).

### H. use-keyboard.ts shortcut registry (W3 C-MED20 atomic
rewrite + C-MED21 split into 2.6a-e)

Open use-keyboard.ts. Verify:
- Registry pattern (Map / object) keyed by shortcut spec
- Handler functions immutable (return new state, don't mutate per
  ~/.claude/rules/common/coding-style.md)
- e.code used throughout
- Modifier order normalized (e.g., always meta+alt+shift+key)
- 5 per-category TDD splits visible in commit history
  (2.6a / 2.6b / 2.6c / 2.6d / 2.6e — verify in git log)

### I. Cross-cluster shortcut contracts

- Cluster 07b boolean shortcuts: ⌥⇧U/S/I/E registered in
  use-keyboard.ts dispatching to Cluster 07b boolean op handlers
  (verify dispatch, not re-impl)
- Standard shortcuts: Cmd+S (save), Cmd+Z (undo), Cmd+Shift+Z
  (redo), Cmd+C/V/X (clipboard) — each dispatches to existing
  composable/store, no re-impl
- Cmd+, opens Settings modal (Cluster 12 cross-link)

### J. File menu (App menu)

- Version history trigger emits handshake bus event (Cluster 06
  consumes — W4 C-MED26)
- Settings trigger opens Cluster 12 settings modal
- Export submenu items are placeholders dispatching to Cluster 09
  export handler (Cluster 09 cross-link)

### K. Design-system compliance

  git diff feat/m9-shopify...app/cluster-08-menus -- 'src/**' \
    | grep -E 'Math\.random|: any|!\.[a-zA-Z]|<style|style scoped|<svg|<icon-lucide-'

Any hit = CRITICAL.

Verify:
- Menu chrome = .menu pattern
- Menu items = .menu-item + .disabled + .with-shortcut variants
- Tooltips = <KovaTooltip> (Cluster 11)
- Popovers = <KovaPopover> (Cluster 11)
- Modals = .dlg per Cluster 11 KovaModal
- Disabled items = .menu-item.disabled (NOT visually hidden —
  Figma-style)
- Keyboard shortcut display = .shortcut span with .key children
- Zero new tokens. Zero hex. Zero <style>. Zero Cmd+K palette.

### L. Visual fidelity

- KOVA_AUDIT.md + tokens-used.md at cluster-audits/cluster-08-*
- 3-screenshot artifact for right-click menus, file menu,
  popovers
- Playwright visual-diff thresholds enforced

### M. Quality gates (re-run)

  bun install
  bun run build / check / test:unit / test:dupes
  bun run test:visual

CI grep gate (re-run): zero "Cmd+K" / "Command palette" anywhere
in cluster code.

### N. Code-review sweep

Spawn superpowers:code-reviewer with brief:
  "Audit feat/m9-shopify...app/cluster-08-menus. Focus: Cmd+K
  palette kill (zero residuals per 00g), FindOverlay residuals
  strip (CT-022), e.code throughout (no e.key), Figma 12-item
  empty-canvas menu, last-page disabled Figma-style, outlines 3
  toggles + submenu, use-keyboard.ts atomic rewrite, cross-cluster
  shortcut dispatch (no re-impl), design-system compliance,
  CLAUDE.md hard constraints. CRITICAL/HIGH/MEDIUM/LOW."

### O. Plan task completion + Done-report accuracy

Walk Plan 08 §6 task-by-task (Plan was rewritten to 1284 lines —
many tasks). Spot-check 5 DONE claims.

## Output

  docs/execution-phase/wave-audits/reports/W11c-cluster-08-AUDIT-REPORT.md

Format per W7 template. Include separate sections:
- "Cmd+K kill verification" (grep audit)
- "Find-residual strip verification" (grep audit)
- "Shortcut registry audit" (per-shortcut table)

Print:
  "W11c AUDIT COMPLETE. Verdict: <V>. <N> findings.
  Report: docs/execution-phase/wave-audits/reports/W11c-cluster-08-AUDIT-REPORT.md"

Begin. Mandatory docs first.
```

---

**Estimated wall-clock: 60-90 min. Token spend: $80-140.**
