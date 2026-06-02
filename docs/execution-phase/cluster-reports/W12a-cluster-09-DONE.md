# W12a — Cluster 09 (Version History + Trash) — DONE

**Status:** Vue UI layer (Tasks 13–18) + cross-cluster (22, 23) + visual-diff +
E2E + code review COMPLETE and green. Backend / store / composables / Phase-1
audit were done in the prior session. Task 21 (Cluster 06 canvas mount) is a
documented TODO — its host view is not in `feat/m9-shopify` yet.

**Worktree:** `/Users/jihoyang/kova-build-c09` · branch `app/cluster-09-version-history`
**Base:** `feat/m9-shopify` · **Date:** 2026-06-02

---

## Built this session (one commit per task)

| Commit | Task | What |
|---|---|---|
| `t13prep` | Phase 2 finish | `src/assets/css/version-history.css` (1:1 hi-fi translation), `.btn.danger`→filled red (`--color-danger`), KovaModal body wrapper made conditional |
| `t13` | 13 | `AddVersionDialog.vue` (hi-fi 17.8/17.9) |
| `t14` | 14 | `RestoreConfirmModal.vue` (hi-fi 17.10, non-destructive `.btn.primary`, bodyless) |
| `t18` | 18 | `TrashConfirmModal.vue` (hi-fi 15 B13.1, destructive red `.btn.danger`) |
| `t15` | 15 | `SnapshotEmptyState` / `AutosaveGroupHead` / `CurrentVersionRow` / `FilterDropdown` |
| `t16` | 16 | `SnapshotRow.vue` (5-item menu, inline rename, dynamic author/brand avatar) |
| `t17` | 17 | `SnapshotTimelinePanel.vue` (composes the timeline, wires store + edit-lock) |
| dev route | — | `/dev/cluster-09` showcase (`Cluster09Showcase.vue` + router) |
| `t22,t23` | 22, 23 | dashboard `CanvasGrid` → hi-fi `TrashConfirmModal`; ⌘⌥S registered in `use-keyboard` |
| `t24` | 24 | visual-diff spec + 5 baselines; E2E smoke pack; per-surface written-diff doc |
| `review` | — | H1 fix + menu dismiss + a11y `<button>`/`menuitem` roles |

New components: `src/components/version-history/{AddVersionDialog,RestoreConfirmModal,
SnapshotEmptyState,AutosaveGroupHead,CurrentVersionRow,FilterDropdown,SnapshotRow,
SnapshotTimelinePanel}.vue` + `src/components/trash/TrashConfirmModal.vue`.

## Gates

- **Unit (c09):** 61/61 pass standalone + as a group (`tests/unit/components/version-history/`,
  `…/trash/`, `…/composables/version-history/`, `…/stores/snapshots*`). 5 component
  test files added.
- **Lint:** `oxlint --type-aware` on all 9 new source files → 0 warnings / 0 errors.
  `no-raw-visual-values` → 0 hits in the new `.vue` files (no raw hex/px; tokens only;
  no `<style>` blocks).
- **Dupes:** 1.15–1.48% (< 3% gate).
- **Visual-diff:** 5/5 surfaces pass at component threshold (≤0.1%, `maxDiffPixelRatio`
  0.005 / `threshold` 0.2, volatile avatar/timestamp regions masked). Baselines committed
  under `tests/visual-diff/cluster-09/…-snapshots/`. Screenshots eyeball-verified against
  hi-fi 17 + 15.
- **E2E:** 5/5 pass against the live dev server (`/dev/cluster-09`): panel composition,
  right-click 5-item menu → inline rename, filter toggle, restore-confirm (primary CTA),
  trash-confirm (red CTA).
- **Code review:** `superpowers:code-reviewer` → 0 CRITICAL. HIGH (H1) fixed; MEDIUM
  (M1 dismiss, M2 a11y) addressed; LOW noted.
- **Written diff:** `tests/snapshots/cluster-09/surfaces-diff.md` — all properties match;
  deviations documented (see below).

## Approved decisions honored

- Snapshots = whole-document `.fig`; **no `packages/core` edits**.
- Task 9 (`useRestoreUndo`) dropped; preview = thumbnail (no live side-doc).
- `.btn.danger` filled red `--color-danger` #e5484d / hover #d93a40 (founder Phase-1 gate;
  replaces hi-fi's off-system `#d36a3a`). Wired in `design-system/canonical/kova-hifi.css`.
- FilterDropdown = autosave toggle only (founder direction; store has only `showAutosaves`).
- No new tokens beyond the four added in Phase 2 (`--color-danger`, `-hover`, `--color-scrim`,
  `--color-focus-ring`).

## Documented deviations (none silent — see surfaces-diff.md)

1. Filter dropdown ships only "Show autosave versions" (founder cut All/Only-yours).
2. `.btn.danger` red (founder, replaces hi-fi warm-orange).
3. Empty-state icon uses the 16px design-system scale vs hi-fi inline 18px (Ban 8).
4. Filter `.menu` uses canonical 220px min-width vs hi-fi one-off 200px.
5. Author avatar/name + timestamps are dynamic (brand colour, profile name, `Intl` format).

## Follow-ups / hand-offs

- **Task 21 (Cluster 06):** mount `<SnapshotTimelinePanel :canvas-id="…" @close="store.closePanel()" />`
  in the canvas right-rail when `useSnapshotsStore().panelOpen`, and mount `<AddVersionDialog
  :canvas-id="…" />` + `useVersionHistoryShortcut()` + `useDeepLinkedVersion()` at canvas-view
  level (so ⌘⌥S works with the panel closed). `CanvasView.vue` is not in `feat/m9-shopify`;
  wire on the Cluster 06 merge. The panel + store + composables are ready.
- **Golden-path E2E** (autosave → panel lists it → restore → export) is gated on the Task 21
  canvas mount; the Task 24 pack covers every UI interaction available today. Run the
  full canvas path with `e2e-runner` once Cluster 06 lands.
- **Design-system mirror:** the `.btn.danger` red rule is in the in-repo canonical
  `kova-hifi.css` (CI source of truth); mirror to the outer
  `main-main-kova-scope/design-system/kova-hifi.css` (design-system owner).
- **Cluster 02:** `MoveToTrashDialog.vue` is now unreferenced (replaced by `TrashConfirmModal`);
  Cluster 02 may delete it.
- **Suite note:** the full `bun run test:unit` shows ~40 pre-existing failures from the
  documented bun `mock.module` cross-file leak (#7632/#7633) — unchanged by Cluster 09; all
  c09 tests pass standalone and grouped.
