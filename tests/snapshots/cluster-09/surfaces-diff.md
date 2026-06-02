# Cluster 09 — per-surface visual diff (IMPLEMENTATION_PROMPT §6)

Method: `version-history.css` is a 1:1 translation of the hi-fi `.vh-*` / `.dlg`
/ `.menu` / `.empty-pane` rules (every px / token copied verbatim from
`chunk-b6/Kova Hi-Fi 17` + `chunk-b2/Kova Hi-Fi 15`). Surfaces screenshotted at
1440px on `/dev/cluster-09`; Appendix-A walked per property. All discrepancies
below are RESOLVED or DOCUMENTED — no silent rounding.

## 17.1 / 17.3 — populated timeline panel
- Header (44px, `--line-2` border, 15/600 `-0.005em` title) ✓
- Instruction strip (12/14 pad, 11.5/1.5, `--ink-3`, glyphs `--ink-2`) ✓
- Timeline hairline `::before` (top 18 / bottom 12 / left 21 / 1px `--line`) ✓
- Current dot solid `--accent`; named dot solid `--ink`; autosave dot hollow
  `--ink-3` ring + `--rail` 2px mask-shadow ✓
- Row 6/8/6/24 pad, gap 10, radius 5, `0 -8` margin; hover `--line-2`; active
  `--accent-soft` ✓
- Named row: ttl 12.5/500, 2-line `desc` clamp 11.5/`--ink-3`, `by` 11 ✓
- Group head chevron + "N autosave versions" ✓
- **No discrepancies.**

## 17.4 / 17.5 / 17.6 — row hover / menu / rename
- `•••` reveal-on-hover (opacity 0→1, CSS) ✓
- 5-item `.menu.w-260` (Name / Restore / Duplicate / Delete version info /
  Copy link); Delete disabled for unnamed autosave ✓
- Inline rename input (`.rename`, `--accent` border + `--color-focus-ring`
  3px ring, 12.5/500) ✓
- **No discrepancies.**

## 17.7 — filter dropdown
- **DEVIATION (founder-approved, documented):** hi-fi shows All / Only-yours +
  separator + "Show autosave versions". Per founder direction the visibility
  filter (All/Only-yours) is OUT of MVP scope — the store carries a single
  `showAutosaves` flag, so the dropdown ships only the "Show autosave versions"
  checkable item. Recorded in the plan (Task 15) + `cluster-09-tokens-used.md`.
- **DEVIATION (minor):** `.menu` min-width = canonical 220px vs the hi-fi
  filter-menu inline `min-width:200px`. Uses the canonical primitive width
  rather than a one-off literal. ~20px wider; within tolerance.

## 17.8 / 17.9 — add-version dialog
- `.dlg.sm` (460), head h3 16/600, two `.fld` (input + textarea), foot
  Cancel + `.btn.primary` Save; Save `.disabled` until Title non-empty ✓
- **No discrepancies.**

## 17.10 — restore confirm
- `.dlg.sm`, head title + `.sub`, NO `.dlg-body` (KovaModal body wrapper made
  conditional so head→foot is gap-exact), foot-left info "Restoring {label}",
  foot Cancel + `.btn.primary` Restore (non-destructive) ✓
- **No discrepancies.**

## 15 · B13.1 — trash confirm
- `.dlg.sm`, title `Move "{name}" to trash?`, `.sub` "Restore anytime from
  Trash.", body paragraph (12.5/`--ink-2`/1.55), foot Cancel + `.btn.danger` ✓
- **DEVIATION (founder-approved):** `.btn.danger` colour = canonical
  `--color-danger` #e5484d (filled red, hover #d93a40) — the founder replaced
  the hi-fi's off-system warm-orange `#d36a3a` hover with a proper Figma/Linear
  red at the Phase 1 gate (`cluster-09-tokens-used.md` RESOLVED Q1). Shape
  (filled) preserved.

## 17.11 — empty state
- Reuses canonical `.empty-pane` (EmptyState), history icon, "No version
  history yet" + ⌘+⌥+S hint ✓
- **DEVIATION (minor):** EmptyState renders the icon at `md` (16px) vs the
  hi-fi inline 18px — using the design-system icon scale (12/14/16/20) rather
  than an off-scale 18px literal (Ban 8). Within tolerance.

## Volatile regions (masked per §10)
- `.av` brand avatar — dynamic brand colour + author initials (not a token).
- `.by` author/timestamp line — author from profile, timestamp from data.

All non-deviation properties match the hi-fi pixel-for-pixel. Deviations are
either founder-approved (filter scope, danger red) or design-system-discipline
choices (icon scale, primitive menu width), none are silent rounding.
