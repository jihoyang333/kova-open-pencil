# Cluster 09 — KOVA_AUDIT (Version History + Trash)

**Phase 1 audit. Read-only. No Vue until founder approves this + `cluster-09-tokens-used.md`.**

Surfaces: version-history right-panel (Hi-Fi 17, scenes 17.1–17.11) + trash-confirm modal
(Hi-Fi 15, scenes B13.1–B13.3).

---

## §1.1 Token map (kova-hifi.css :root → src/app.css @theme)

The system tokenizes **colors + positional offsets only** (43 tokens). Spacing, sizing, radii, and
type are **literal px** in the hi-fi (kova-hifi.css itself uses literal `font-size`/`padding`),
so version-history reuses that literal convention — no spacing/type-scale tokens exist to map to.

Colors used by these surfaces (all already in `:root`):

| Token | Value | Used for |
|---|---|---|
| `--page` | #1a1a1d | panel bg, dialog bg, input bg |
| `--rail` | #1a1a1d | dialog foot, dot mask |
| `--bg` | #242428 | canvas plate behind panel |
| `--fill` | #26262b | hover bg on icon buttons, avatar bg |
| `--line` | #2c2c30 | dialog border, panel hairlines |
| `--line-2` | #232327 | row hover bg, in-panel hairline, dialog foot border |
| `--ink` | #ebebee | primary text, named-snapshot dot |
| `--ink-2` | #a8a8ad | row body text, secondary |
| `--ink-3` | #6e6e73 | labels, desc, count, dot border |
| `--accent` | #3b82f6 | current-snapshot dot, active border, focus border |
| `--accent-soft` | #1d3a66 | active/selected row tint |
| `--accent-ink` | #a9c4ff | accent text |

> Hi-fi uses non-hyphen aliases (`--ink2`/`--line2`/`--ink3`) scoped inside `.kc`. These map 1:1 to
> the canonical hyphenated tokens (`--ink-2`/`--line-2`/`--ink-3`). Vue uses the canonical names.

## §1.2 Existing-component inventory (src/components/ui/ — Cluster 11)

| Component | Summary | Relevant here |
|---|---|---|
| `KovaModal.vue` | Reka Dialog wrapper (overlay + panel) | host for AddVersion / RestoreConfirm / TrashConfirm |
| `ConfirmModal.vue` | confirm dialog (title/body/confirm/cancel) | RestoreConfirm + TrashConfirm base |
| `KovaButton.vue` (+ button.ts) | `.btn` variants (primary/accent/ghost/sm/icon) | all CTAs |
| `KovaInput.vue` (+ input.ts) | `.input` field | AddVersion name field, inline rename |
| `KovaIcon.vue` | Lucide icon contract | every icon (no `<icon-lucide-*>`) |
| `KovaMenu.vue` (+ menu.ts) | Reka DropdownMenu | snapshot-row ••• menu, filter dropdown |
| `KovaTooltip.vue` | Reka Tooltip | ••• hover hint |
| `KovaToast.vue` / `toast.ts` | toast | "Saved to version history" etc. |
| `KovaSkeleton.vue` | loading skeleton | `loadingByCanvas` state |
| `EmptyState.vue` | empty-state pattern | SnapshotEmptyState base |
| `KovaToggle.vue` | toggle | "Show autosaves" filter |
| `KovaPill.vue` | `.pill` | (optional kind chips) |

No `src/components/version-history/` exists yet.

## §1.3 Reuse decisions (per design.md §3 + Hard Rule #17)

| Surface (Plan task) | Decision |
|---|---|
| `TrashConfirmModal` (T18) | **Reuse** `ConfirmModal` — danger variant (see Open Q1) |
| `RestoreConfirmModal` (T14) | **Reuse** `ConfirmModal` |
| `AddVersionDialog` (T13) | **Compose** `KovaModal` + `KovaInput` + `KovaButton` |
| `SnapshotEmptyState` (T15) | **Reuse/Extend** `EmptyState` (version-history copy + CTA) |
| `FilterDropdown` (T15) | **Compose** `KovaMenu`/`KovaPopover` + `KovaToggle` |
| `SnapshotTimelinePanel` (T17) | **Build new** — `.vh-timeline` container (1px hairline + dots) |
| `SnapshotRow` (T16) | **Build new** — `.vh-row` (idle/hover/active/current/named + ••• + rename) |
| `AutosaveGroupHead` (T15) | **Build new** — `.vh-group-head` (chevron + N autosaves) |
| `CurrentVersionRow` (T15) | **Build new** — `.vh-row.current` (pinned top row) |

3 local CSS classes ship to `src/assets/css/version-history.css` (per PRD §3.3, design.md §6
extension protocol — NOT inline `<style>`): `.vh-timeline`, `.vh-row`, `.vh-group-head`.

## §1.4 New tokens needed (→ see tokens-used.md MISSING)

1. **Destructive button** — `.btn.danger` base is `--warn` (= `--ink-2`, neutral) but hover is raw
   `#d36a3a` (warm orange, off-system). **Open Q1.**
2. **Scrim** — modal backdrop `rgba(26,26,29,0.72)` (= `--page` @72%). Propose `--scrim`. **Open Q2.**
3. **Focus ring** — `rgba(59,130,246,0.18)` (= `--accent` @18%) on rename input + anchor pin.
   Propose `--focus-ring`. **Open Q2.**
4. **Brand avatar color** — `#c24a1e`/`#fff` is a **dynamic brand color** (rendered from brand
   data), not a static token — no token needed; sample only.

## §1.5 New components

`SnapshotTimelinePanel`, `SnapshotRow`, `AutosaveGroupHead`, `CurrentVersionRow` (per design.md
naming). Others reuse/compose Cluster 11 primitives (§1.3).

## §1.6 Open questions (founder — via AskUserQuestion)

- **Open Q1 — destructive button:** the trash/delete CTA. Options: (a) neutral (`--warn`=ink-2,
  matches "status colors deferred"); (b) add a real `--danger` red token (lift the deferral for
  destructive actions only); (c) keep the hi-fi's raw `#d36a3a` as an approved exception.
- **Open Q2 — scrim + focus-ring tokens:** add `--scrim` + `--focus-ring` named tokens (clean), or
  keep the two literals with `/* token-exempt */` comments.
