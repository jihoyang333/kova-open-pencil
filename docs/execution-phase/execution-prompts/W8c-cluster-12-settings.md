# W8c — Cluster 12 (Settings + User Preferences) Execution Prompt

**Wave:** W8 (parallel-3)
**Cluster:** 12 — Settings + User Preferences
**Status:** ready after W7 merged
**Worktree:** `/Users/jihoyang/kova-build-c12`

---

## Launch

Fresh Claude Code session at `/Users/jihoyang/kova-build-c12`. Opus 4.7.

---

## PROMPT (paste verbatim)

```
You are the W8c execution-phase agent. Build Cluster 12 — Settings +
User Preferences.

Parallel-3 wave. Siblings: 01 (auth), 04 (Stripe). Stay in your worktree.

## Worktree

/Users/jihoyang/kova-build-c12 · app/cluster-12-settings

## Mandatory reading

1. docs/execution-phase/MASTER-EXECUTION-GUIDE.md
2. docs/execution-phase/DESIGN-SYSTEM-COMPLIANCE-RIDER.md
3. docs/kova-final-prds/12-settings-and-user-preferences.md
4. docs/kova-final-impl-plans/12-settings-and-user-preferences-plan.md
5. docs/execution-phase/claude-design-files/README.md  (hi-fi bundle overview, authority chain, fidelity rule, screen inventory)
6. docs/execution-phase/claude-design-files/IMPLEMENTATION_PROMPT.md  (authoritative HTML → Vue translation method + Appendix A per-property extraction checklist; mockup wins; per-screen diff loop)
7. CLAUDE.md
8. /Users/jihoyang/kova-main/main-main-kova-scope/design-system/design.md
9. Hi-fi: /Users/jihoyang/kova-main/main-main-kova-scope/batch-a/dark/Kova Hi-Fi A7 Account Page - Dark.html (Accessibility subsection A7.1 §3) + /Users/jihoyang/kova-main/main-main-kova-scope/batch-a/dark/Kova Hi-Fi A6+A2a Popovers + A8 Dialogs - Dark.html (A8.3 modal)

## Mandatory skills

1. superpowers:using-superpowers
2. superpowers:executing-plans
3. superpowers:test-driven-development
4. superpowers:code-reviewer (at end)

## Conditional subagents

- vue-expert — preference reactivity (text size, high contrast, recent
  colors FIFO)
- database-reviewer — user_preferences JSONB column migration

## Cluster 12 scope (per PRD 12 founder locks 2026-05-17)

- users.user_preferences JSONB column (single migration)
- Preferences:
  - text_size: 87.5 / 100 / 112.5%  (per founder lock)
  - high_contrast: boolean (borders-only mode per founder lock)
  - recent_colors: FIFO array, max 12 (per founder lock)
  - showTextSuggestions: boolean (reserved OFF for now)
- Settings modal — triggers per A8.3 founder lock:
  - App menu → Settings
  - Cmd+, keyboard shortcut
  - Profile dropdown → Settings
- Settings page with sub-sections matching A7 hi-fi
- send-sync-alert edge function (Task 16 per PRD 12 founder lock)
- Resend env-guarded (deferred pre-launch — STUB pattern)

## Hi-fi references

- Settings/Preferences UI: batch-a/dark/Kova Hi-Fi A7 Account Page - Dark.html (preferences sub-tab)

## Branch + commits

Branch: app/cluster-12-settings (already checked out in worktree)
Commit format: feat(c12-tNN), test(c12), fix(c12-review)
ONE COMMIT PER TASK. Push every 5-8.

## Per-task flow

Standard TDD per Plan 12 §6 task order.

## Design-system compliance

Settings page = dark theme.
Preference controls = existing .input / .btn / .toggle / .segmented
component primitives.
Recent colors row = existing color-swatch pattern.
Zero new tokens.

## Cluster-end gates

1. All Plan tasks committed
2. bun run build / check / test:unit / test:dupes — green
3. supabase migration verifies user_preferences JSONB
4. superpowers:code-reviewer — PASS
5. e2e-runner — open Settings via App menu / Cmd+, / Profile dropdown;
   change each preference; persist + reload
6. Playwright visual diff Settings sub-tab — ≤ 2%

## Done report

Path: docs/execution-phase/cluster-reports/W8c-cluster-12-DONE.md

Print when done:
  W8c CLUSTER 12 DONE. <N> commits pushed to app/cluster-12-settings.

Begin.
```

---

**Estimated wall-clock: 4-6h (Opus). Token spend: $150-300.**
