# 00g — Cmd+K Command Palette Kill — Dispatch Prompts

**Date:** 2026-05-17
**Decision:** Founder dropped Cmd+K global command palette entirely from MVP.

**Rationale:** Canvas workflow doesn't need global navigation shortcut. Users exit to dashboard for file / brand switching, not inside canvas. Cmd+K palette doesn't fit the model. A5 hi-fi retired from MVP scope.

**Status:** HOLD — dispatch alongside 00f B12 reversal once all open §12 questions resolved.

---

## Folder reminder

- **PRDs:** `kova-open-pencil-1/docs/kova-final-prds/`
- **Plans:** `kova-open-pencil-1/docs/kova-final-impl-plans/`

---

## What's killed

- `<CommandPalette>` Vue component
- `useCommandPaletteStore` Pinia store
- Cmd+K global keyboard binding
- 4-category result framework (Files / Brands / Actions / Help)
- A5 hi-fi file (`Kova Hi-Fi A5 Command-K - Dark.html`)

## What survives

- Per-surface keyboard shortcuts (Cmd+S save, Cmd+Z undo, etc. — PRD 08)
- Browser default Cmd+K (address-bar focus) — now works normally, no interception
- KD-3 + KD-8 (Cmd+K categories + browser conflict risk) — both deleted from §12

---

## Prompt — PRD 11 agent

```
CONTEXT — DECISION 2026-05-17

Founder dropped the Cmd+K global command palette entirely from MVP scope. Canvas workflow doesn't need it — users exit to dashboard for file/brand switching, not inside canvas. The palette pattern doesn't fit Kova's model.

Files (canonical paths in kova-open-pencil-1/):
- PRD:  docs/kova-final-prds/11-shared-ui-infrastructure.md
- Plan: docs/kova-final-impl-plans/11-shared-ui-infrastructure-plan.md

DELTAS to apply (PRD + plan both):

PRD 11 — STRIP:
1. §3.3 — entire Command-K palette section. Delete.
2. §6.3 — `useCommandPaletteStore` composable. Delete.
3. §6 components list — `<CommandPalette>` Vue component. Delete.
4. §12.3 KD-3 (Cmd+K result categories). Delete. (One less KEY DECISION to ratify.)
5. §12.8 RISK (Cmd+K browser conflict). Delete.
6. §13.1 03-doc coverage entry — remove Cmd+K reference if present.
7. §1 Summary — remove Cmd+K from listed primitives.
8. Hi-fi files referenced — strike A5 (`Kova Hi-Fi A5 Command-K - Dark.html`).
9. Any other Cmd+K / CommandPalette / command palette / command-k reference — strip.

Plan 11 — STRIP:
1. All tasks building <CommandPalette> component + tests.
2. All tasks building useCommandPaletteStore + tests.
3. All tasks wiring Cmd+K keyboard binding.
4. Acceptance criterion / spec coverage table — remove Cmd+K rows.
5. Renumber remaining tasks if needed.

ADD to §12 (PRD only):
"§12.X DROPPED 2026-05-17 — Cmd+K command palette. Founder: canvas workflow doesn't need global nav shortcut. Users exit to dashboard for file/brand switching. A5 hi-fi retired."

ACTIONS:
- Update PRD §0 status: bump version note "2026-05-17 — Cmd+K removed".
- Update plan: remove all command-palette tasks. Note removal in plan changelog if one exists.
- Run grep across both files for "Cmd+K", "Cmd-K", "command palette", "CommandPalette", "command-k", "useCommandPalette", "A5" — all must return zero hits (except in the §12 DROPPED entry).

DO NOT commit. Report back delta summary + grep results showing zero residual refs.
```

---

## Side effects (already handled by parent agent — no dispatch needed)

- `docs/kova-final-prds/00-PRD_SCOPE_PLAN.md` — Cmd+K stricken from §3 Cluster 11 scope, A5 hi-fi marked dropped. Reversal note appended.
- `docs/kova-final-prds/00c-COMPREHENSIVE_AUDIT_REPORT.md` — frozen historical doc, DO NOT EDIT.

## Side effects to verify after dispatch

- No other PRD references Cmd+K / CommandPalette. Grep already confirms clean (zero hits in PRD 02, 03, 04, 05, 06, 07a, 07b, 08, 09, 10, 12).
- PRD 08 (Menus + Shortcuts) keyboard registry: confirm no Cmd+K entry was specced.
