# Implementation Plan — PRD 08 Canvas Menus, Popovers, Context Menus & Keyboard Shortcuts

> **Source PRD:** `kova-open-pencil-1/docs/prd/08-canvas-menus-popovers-shortcuts.md`
> **Wave:** 5 (close)
> **Status:** DRAFT — author Claude (Opus 4.7), 2026-05-15. Awaits PRD approval before execution.
> **Workflow:** `superpowers:writing-plans` → this plan → `superpowers:test-driven-development` executes.
> **Branch:** `feat/m9-shopify` (or active feature branch at execution time).
> **Reference order during execution:** Figma docs → PRD 08 → Kova memory → AskUserQuestion (per CLAUDE.md "Figma Is the Reference. Always.").

---

## 0. Pre-flight (one-shot, before any phase)

| Check | How | Done when |
|---|---|---|
| PRD 08 status = `APPROVED` | `head -20 kova-open-pencil-1/docs/prd/08-canvas-menus-popovers-shortcuts.md` | §0 row "Status" reads APPROVED with founder sign-off |
| Cluster 06 + Cluster 11 either APPROVED or stub primitives available | Inspect `00a-PRD_AUTHORING_GUIDE.md` Wave tracker | Both rows ≥ DRAFT; this PRD's components can mount against placeholder stubs from 06 / 11 during development |
| Cluster 07b boolean-ops API surface confirmed | Read `00c §2.A` Cluster 07b spec; verify `figma.booleanOperation()` from `packages/core/figma-api.ts` exists | grep `packages/core/src/figma-api.ts` for `booleanOperation` returns a definition |
| `use-keyboard.ts` baseline audited | `grep -n 'case ' kova-open-pencil-1/src/composables/use-keyboard.ts` | Every existing case-arm shortcut enumerated and listed in `pre-refactor-shortcuts.md` planning note (will be deleted post-Phase 4) |
| Reka UI `DropdownMenu` nested submenu support verified | context7 query "Reka UI DropdownMenu Sub" + WebFetch help.reka-ui.com | Documentation confirms 2-level nesting works with arrow-key navigation; or compensating handler decision recorded |
| Local Supabase + dev server running | `cd kova-open-pencil-1 && bun run dev` (and `supabase start` for db-touching tests, though this PRD touches no DB) | localhost:1420 serving editor; canvas opens |
| Worktree setup (per CLAUDE.md global-instructions "using-git-worktrees") | `git worktree add .claude/worktrees/prd-08-impl` | Isolated worktree on a new branch off `feat/m9-shopify` |

**Stop gate:** Do not enter Phase 1 until all pre-flight rows pass.

---

## Phase 1 — Stores (foundation; no UI yet)

> **Goal:** Establish the three Pinia stores that every later component reads from. TDD strict: tests RED → code GREEN → refactor.

### 1.1 `useShortcutsStore`

| Task | Action | Verification |
|---|---|---|
| 1.1.1 Write `tests/stores/shortcuts.test.ts` covering register/unregister, duplicate detection, deferred filter, `byKeys` / `byCategory` / `visibleCategories` | Tests fail (RED) because store doesn't exist | `bun run test:unit shortcuts.test.ts` → all tests RED |
| 1.1.2 Implement `src/stores/shortcuts.ts` per PRD §6.2.2 | Code passes (GREEN) | All tests pass |
| 1.1.3 Refactor: extract `ShortcutCategory` type to `src/types/shortcuts.ts` if used by ≥2 callers | Tests stay green | |
| 1.1.4 Bench: register 200 synthetic shortcuts; `byKeys` lookup p99 < 1 ms | Add to `tests/stores/shortcuts.bench.ts` (optional) | Bench output documented |

### 1.2 `useMenuStore`

| Task | Action | Verification |
|---|---|---|
| 1.2.1 Write `tests/stores/menu.test.ts` covering open/openSub/openSubSub mutual exclusivity + close clearing all three | RED | |
| 1.2.2 Implement `src/stores/menu.ts` per PRD §6.2.1 | GREEN | |
| 1.2.3 Refactor: extract submenu / sub-of-sub identity types if reused | Tests green | |

### 1.3 `useFindStore`

| Task | Action | Verification |
|---|---|---|
| 1.3.1 Write `tests/stores/find.test.ts` covering open/close/next/previous wrap-around, setHits reset, empty-hits guard | RED | |
| 1.3.2 Implement `src/stores/find.ts` per PRD §6.2.3 incl. `FindHit` interface | GREEN | |
| 1.3.3 Refactor: extract `FindHit` to `src/types/find.ts` | Tests green | |

**Phase 1 exit gate:**
- All 3 stores ship with ≥90% line coverage (load-bearing for every downstream cluster)
- `bun run check` green
- `bun run test:unit` green
- No new dependencies added

---

## Phase 2 — Composables (logic; no UI)

> **Goal:** Build the seven composables that components consume. Each composable is independently testable against the stores from Phase 1.

### 2.1 `useObjectActions`

| Task | Action | Verification |
|---|---|---|
| 2.1.1 Write tests asserting `compactActions ⊆ fullActions` + multi-select gate on Boolean ops + destructive flag on Delete | RED | |
| 2.1.2 Implement `src/composables/use-object-actions.ts`. Inputs: `useEditorStore` (selection, multi-select count). Outputs: `compactActions: ComputedRef<Action[]>`, `fullActions: ComputedRef<Action[]>`. Internal `allActions[]` definition incl. each action's `invoke()` calling existing `editor.ts` method | GREEN | |
| 2.1.3 Wire each `invoke()` to existing `editor.ts` action per PRD §7.1 mapping | All wired | |

### 2.2 `useContextMenu`

| Task | Action | Verification |
|---|---|---|
| 2.2.1 Write tests per PRD §9.1 (7 surfaces, asset-row dispatch hook) | RED | |
| 2.2.2 Implement `src/composables/use-context-menu.ts`. Per-surface dispatch table; asset-row delegates to externally-registered items (Cluster 05 plug-in pattern) | GREEN | |
| 2.2.3 Document the dispatch contract in `src/composables/use-context-menu.ts` JSDoc — note Cluster 05 will call `registerAssetMenuItems(items)` at boot | Inline doc present | |

### 2.3 `useFind` (search algorithm + composable)

| Task | Action | Verification |
|---|---|---|
| 2.3.1 Write tests covering 4-field search (TEXT content / layer names / frame names / page names), cross-page order, empty query, 150 ms debounce | RED | |
| 2.3.2 Implement `src/composables/use-find.ts`. Algorithm: walk `editor.graph` document-order; per node, check `name` field + per text-run `content` field; collect hits with `pageId` + `nodeId` + `field` + optional `matchStart` / `matchEnd` | GREEN | |
| 2.3.3 Add 500-hit cap with toast "Too many results; refine your query" (PRD §12.1 mitigation) | Test added | |
| 2.3.4 Add `sceneVersion`-keyed cache; invalidate on graph mutation | Bench: large canvas 5000 nodes, repeated queries hit cache | |
| 2.3.5 Performance gate: profile main-thread block on 5000-node canvas; if >50 ms move to Worker | Bench result documented | |

### 2.4 `useMainMenu` + `useFileNameDropdown`

| Task | Action | Verification |
|---|---|---|
| 2.4.1 Write tests for menu item list shape + open/close/openSubmenu invocations | RED | |
| 2.4.2 Implement `src/composables/use-main-menu.ts` + `src/composables/use-file-name-dropdown.ts` | GREEN | |
| 2.4.3 Verify file-name dropdown items list has **NO** "Move to trash" (DOM-grep style assertion) | Test asserts trash absence | |

### 2.5 `usePropertyClipboard` (Q23 full property set)

| Task | Action | Verification |
|---|---|---|
| 2.5.1 Write tests covering copy/paste full property set (fills + strokes complete + effects + corner radius + blend + opacity), silent skip incompatible, mass-skip detection | RED | |
| 2.5.2 Implement `src/composables/use-property-clipboard.ts` extending `editor.ts.clipboardHtml` slot with `CopyablePropertySet` payload | GREEN | |
| 2.5.3 Mass-skip toast wired via `useToast()` (Cluster 11 stub OK) + `useUIStateStore.dismissedToasts` | Test fires once, second mass-skip does not re-fire | |

### 2.6 `use-keyboard.ts` REFACTOR (highest risk)

| Task | Action | Verification |
|---|---|---|
| 2.6.1 Snapshot existing inline switch: list every `case` arm + its action in `pre-refactor-shortcuts.md` | Doc complete | |
| 2.6.2 Write tests asserting EVERY listed shortcut still dispatches post-refactor; text-edit guard works; number-keys-for-opacity single + two-digit (500 ms window) | RED initially | |
| 2.6.3 Implement registry-consumer refactor: `use-keyboard.ts` now reads `useShortcutsStore.byKeys(keysString)`, calls `action()` if found | GREEN | |
| 2.6.4 Implement number-keys-for-opacity handler with `pendingDigit: Ref<string \| null>` + `setTimeout(500)` for two-digit window; writes `editor.ts.updateNodeWithUndo(nodeId, { opacity: pct })` per selected layer | All opacity tests green | |
| 2.6.5 Implement text-edit guard: skip shortcuts unless `context === 'text-edit'` when `useEditorStore.editingTextNodeId !== null` | Test confirms text typing doesn't trigger shortcuts | |
| 2.6.6 Grep audit post-refactor: ZERO `switch (e.code)` or `switch (e.key)` blocks remain in `use-keyboard.ts` | grep returns no matches | |
| 2.6.7 Register every shortcut from `pre-refactor-shortcuts.md` into `useShortcutsStore` at app boot via `use-shortcut-registration.ts` | Registry populated; visual check in DevTools | |
| 2.6.8 Verify all shortcut bindings use `e.code` not `e.key` (per CLAUDE.md "Option key transforms characters on Mac") | grep audit on registered `keys` strings — all alpha keys use codes | |

### 2.7 `useShortcutRegistration` (convenience wrapper)

| Task | Action | Verification |
|---|---|---|
| 2.7.1 Implement `src/composables/use-shortcut-registration.ts` — accepts `Shortcut[]`, calls `useShortcutsStore.register()` per entry, auto-unregisters on `onScopeDispose` | Unit test confirms unregister fires | |

**Phase 2 exit gate:**
- All composables coverage ≥85%
- `bun run check` + `bun run test:unit` green
- Grep audit shows zero remaining `switch (e.code)` in `use-keyboard.ts`
- `pre-refactor-shortcuts.md` deleted after audit confirms parity

---

## Phase 3 — Menu components (visual; no behavior tests yet)

> **Goal:** Build every menu/submenu Vue component matching the LOCK HERE Reka shell. Visual regression baselines captured.

### 3.1 Primitives

| Task | Action | Verification |
|---|---|---|
| 3.1.1 `<MenuItem>` per PRD §6.4.1 LOCK spec | Variants (default / hovered / checked / disabled+phase2 / destructive / has-sub) render correctly | Component tests render each variant; visual screenshot diff |
| 3.1.2 `<MenuSeparator>` (`.sep`) | 1 px line, correct margins | Snapshot |
| 3.1.3 `<MenuGroupLabel>` (`.group`) | Used in Arrange / Boolean ops | Snapshot |
| 3.1.4 `<KbdRow>` per PRD §6.4.1 — macOS canonical glyph order `⌃ → ⌥ → ⇧ → ⌘ → letter` regardless of input order | Test: shuffled input array → output reorders correctly | Snapshot |

### 3.2 Main menu

| Task | Action | Verification |
|---|---|---|
| 3.2.1 `<MainMenuPopover>` mounted from Cluster 06 top chrome (mount-point cross-cut — placeholder mount in dev) | Opens / closes via `useMenuStore` | Manual click test |
| 3.2.2 `<FileSubmenu>` (B1.2 — 7 items) | Renders + destructive coloring on Move-to-trash | Snapshot |
| 3.2.3 `<EditSubmenu>` (B1.3 — densest, w-280) | All kbd-rows correct + Copy as ▶ sub-of-sub | Snapshot |
| 3.2.4 `<ViewSubmenu>` (B1.4 — checkable rows) | Layout-guides defaults to checked; Pixel grid disabled with Phase 2 pill | Snapshot |
| 3.2.5 `<ObjectSubmenu>` (B1.5) | Multi-select gate on Boolean ops row | Snapshot single-select + multi-select |
| 3.2.6 `<BooleanOpsSubmenu>` (B1.5 sub-of-sub) | 4 items + Multi-select-only group label | Snapshot |
| 3.2.7 `<TextSubmenu>` (B1.6) + `<CaseSubmenu>` sub-of-sub (radio behavior) | Snapshot | |
| 3.2.8 `<CopyAsSubmenu>` (single PNG item) | Snapshot | |
| 3.2.9 `<PanelsSubmenu>` (Left visible / Right visible checkable) | Persistence via Yjs awareness verified later (Phase 5) | Snapshot |
| 3.2.10 `<ArrangeSubmenu>` (B1.7 — 3 group labels, 8 distribute variants) | Snapshot | |
| 3.2.11 `<PreferencesSubmenu>` (1 item — opens Cluster 12 modal via emit) | Emit fires correctly | Test |
| 3.2.12 `<HelpSubmenu>` (Help mailto: / Keyboard shortcuts / Log out) | Help item href correct; Log out invokes `useAuthStore.signOut()` | Test |

### 3.3 File-name dropdown

| Task | Action | Verification |
|---|---|---|
| 3.3.1 `<FileNameDropdown>` per B1.11 / 13.2 — 5 items, NO trash | DOM-grep test confirms trash absence | Snapshot |
| 3.3.2 Rename item activates `use-inline-rename.ts` on file-name region; popover closes immediately | Manual + E2E | |
| 3.3.3 Duplicate item invokes `useCanvasesStore.duplicate(canvasId)` | Test mocks store call | |

**Phase 3 exit gate:**
- Visual regression baselines captured for: main menu root, Edit submenu, Object submenu (single + multi-select), Text submenu with Case sub-of-sub, Arrange submenu, file-name dropdown
- All menu components individually rendered correctly in Storybook-style harness (or `bun run dev` route)
- `bun run test:dupes` jscpd < 3% across menu components — confirms `<MenuItem>` abstraction is sufficient

---

## Phase 4 — Context-menu components

| Task | Action | Verification |
|---|---|---|
| 4.1 `<ContextMenuShell>` per PRD §6.4.2 — reads items from `useContextMenu(surface).items` | Renders for each of 7 surfaces | Snapshot per surface |
| 4.2 `<OverflowDots>` button (mounted in inspector by Cluster 06) | Opens shell with `surface='overflow-dots'` (compact subset) | Test |
| 4.3 Verify `compact ⊆ full` invariant via E2E test enumerating DOM items in both | Both menus tested; subset assertion passes | |
| 4.4 Right-click trigger wiring on canvas / layer-row / page-row / empty-canvas / frame / asset-row (Cluster 06 cross-cut — mount points stubbed during dev) | Each trigger opens correct surface | E2E |
| 4.5 Auto-select on right-click-unselected-node behavior | E2E | |
| 4.6 Empty-canvas surface: 3 view-toggle items bound to `usePreferencesStore.prefs.view.*` (Cluster 12 stub during dev) | Toggle persists across reload (verified after Phase 5) | |
| 4.7 Page-row Delete: useConfirm specialization; last-page-guard error toast | Manual + E2E | |
| 4.8 Asset-row shell only — items left blank (Cluster 05 plugs in) | Shell opens with empty items list; documented Cluster 05 plug-in API | Manual |

**Phase 4 exit gate:**
- All 7 context-menu surfaces ship
- `compact ⊆ full` invariant proven
- `useConfirm` specialization for Delete page validated against PRD §8.8

---

## Phase 5 — Find overlay + canvas-extension

| Task | Action | Verification |
|---|---|---|
| 5.1 `<FindOverlay>` component per PRD §6.4.3 | All 4 states (empty / populated / no-results / dismissed) render per hi-fi 14.1–14.4 | Snapshot per state |
| 5.2 Wire `⌘F` (registered into `useShortcutsStore` at Phase 2.6.7) → opens overlay | Manual + E2E | |
| 5.3 `⇧⌘F` / `⇧⌘D` / Esc bindings | E2E | |
| 5.4 `find-highlight` canvas-extension at `src/canvas-extensions/find-highlight/index.ts` — DOM-positioned overlay; subscribes to `useFindStore`; per-match `<div>` rect positioned via `editor.canvasToScreen(nodeBbox)` | Visual match rect renders; current match has 2 px `--accent` outline; others `--accent-soft` fill only | E2E visual screenshot |
| 5.5 Layer-tree selection follows current match (single layer selected via `editor.ts.select`) | E2E | |
| 5.6 Cross-page cycling: when next match is on different page, call `editor.ts.switchPage(pageId)` first then `flashNodes` | E2E | |
| 5.7 Performance gate: 5000-node canvas + 100-char query — main thread block < 50 ms; Worker fallback if exceeded (per PRD §12.1) | Profiler output | |

**Phase 5 exit gate:**
- Find flow ships end-to-end
- Performance gate passes OR Worker fallback implemented + benchmarked

---

## Phase 6 — Keyboard shortcuts dialog

| Task | Action | Verification |
|---|---|---|
| 6.1 `<KeyboardShortcutsDialog>` per PRD §6.4.4 — uses Cluster 11 `<KovaModal>` size `lg` (720 px) | 11 visible tabs, Components + Prototyping NOT rendered | Snapshot |
| 6.2 `<ShortcutRow>` — label + `<KbdRow>` | Snapshot | |
| 6.3 Wire `⇧⌘?` global shortcut → opens dialog | Registered into `useShortcutsStore` | E2E |
| 6.4 Help & account submenu "Keyboard shortcuts" item → opens dialog | Same instance | E2E |
| 6.5 Search filter input (debounced 200 ms) — filters rows across all categories | "No matches" empty state | E2E |
| 6.6 E2E sanity: enumerate every registered shortcut, synthesize keydown, assert action fires | All registered actions fire | E2E (long-running) |

**Phase 6 exit gate:**
- Dialog ships with all 11 visible categories
- DEFER categories hidden (registry honors `deferred: true`)
- Every shortcut testable end-to-end

---

## Phase 7 — Cross-cuts + integration

| Task | Action | Verification |
|---|---|---|
| 7.1 Cluster 07b boolean-ops shortcut registration: ensure 07b's `useShortcutRegistration` registers `⌘⌥U/S/I/X` into store | Manual check in DevTools after app boot | |
| 7.2 Cluster 09 `⌥⌘S` Save to version history registration: confirm 09 plugs into store | Same | |
| 7.3 Cluster 06 tool-switch shortcuts (V/F/R/O/P/T/C): confirm 06 plugs into store | Same | |
| 7.4 Cluster 05 asset-row right-click items: confirm 05 plugs into `useContextMenu` asset-row dispatch | Manual | |
| 7.5 Cluster 11 `useConfirm()` primitive: confirm canvas-side `useConfirm` specializations call into the primitive correctly | E2E delete-page flow | |
| 7.6 Cluster 12 `useUIStateStore.recentColors`: confirm color-picker (Cluster 06) writes; confirm overlay reads | E2E recent-colors persistence | |
| 7.7 Cluster 12 `usePreferencesStore.prefs.view.*`: confirm View menu toggles read/write Layer 1 prefs | E2E toggle persists across reload (test against local Supabase) | |
| 7.8 Trash cross-cut sanity: confirm Move-to-trash NOT reachable from canvas (B1.11 / 13.2 stripped); dashboard right-click does reach modal | E2E | |

**Phase 7 exit gate:**
- Every cross-cut in PRD §11 verified live
- Integration matrix: 7.1 through 7.8 all green
- No silent cross-cluster contract drift

---

## Phase 8 — Acceptance criteria pass + manual QA

| Task | Action | Verification |
|---|---|---|
| 8.1 Walk PRD §8 acceptance criteria top-to-bottom; check each | Every checkbox passes in `bun run test:unit` or `bun run test` or browser | Founder reviews |
| 8.2 Manual QA per PRD §9.4 — engineer runs `bun run dev` localhost:1420, walks the script | All 15 manual items pass | Founder smoke-test confirms |
| 8.3 Visual regression baselines reviewed: no unintended diffs | Playwright `--update-snapshots` only if intentional | |
| 8.4 `bun run check` green | | |
| 8.5 `bun run test:unit` green ≥80% per file | | |
| 8.6 `bun run test` green (E2E) | | |
| 8.7 `bun run test:dupes` jscpd < 3% | | |
| 8.8 Verify all popover renders with consistent Reka shell (radius / padding / shadow) — visual cross-check on 3 representative popovers | | |
| 8.9 Verify NO `packages/core/` modifications introduced (grep `git diff` paths) | grep returns zero | |
| 8.10 Bump PRD §0 status: `IN-IMPLEMENTATION` → `SHIPPED` after founder browser-verify | Edit `08-canvas-menus-popovers-shortcuts.md` §0 | |

**Phase 8 exit gate:**
- PRD §8 100% passing
- Manual QA founder sign-off
- All quality gates green
- PRD status flipped to SHIPPED

---

## Phase 9 — Commit + PR (per CLAUDE.md git-workflow)

| Task | Action | Verification |
|---|---|---|
| 9.1 Group commits by phase (5–8 commits total) — Phase 1 / 2 / 3 / 4 / 5 / 6 / 7 / 8 | Conventional commit format (`feat:`, `refactor:`, `test:`) | `git log` clean |
| 9.2 Each commit body cites the PRD §X.Y it implements | | |
| 9.3 Open PR titled `feat(canvas): PRD 08 canvas menus, popovers, context menus & keyboard shortcuts` | Body: §summary + §test plan from PRD §9 | `gh pr view` |
| 9.4 Request founder review | | |
| 9.5 After approval: merge to `feat/m9-shopify` (or current feature branch) | No force-push | |

---

## Risk register (mirrors PRD §12, surfaced here for execution-time tracking)

| Risk | Phase | Mitigation in plan | Status |
|---|---|---|---|
| Find performance on large layer trees | 5 | Bench gate at 5.7; Worker fallback if main thread >50 ms | Open |
| Reka nested submenu keyboard nav incomplete | 0 + 3 | Pre-flight verification; compensating handler if needed | Open |
| `use-keyboard.ts` refactor drops existing shortcut | 2.6 | Pre-refactor audit + post-refactor parity tests | Open |
| Cluster 06 / 11 stubs delay testing | 0 + 7 | Pre-flight requires stub availability; mount-point placeholders in dev | Open |
| Q24 open question on Cluster 05 asset-menu dispatch direction | 4.8 | Decided unilaterally per PRD §12.4 — confirm during Cluster 05 PRD authoring | Resolved-pending-Cluster-05 |
| Last-page guard UX (error toast vs disabled item) | 4.7 | Ships error-toast per PRD §8.3; founder confirms | Open |

---

## File inventory (created / modified)

### Created

```
kova-open-pencil-1/src/stores/
  menu.ts
  shortcuts.ts
  find.ts

kova-open-pencil-1/src/composables/
  use-object-actions.ts
  use-context-menu.ts
  use-find.ts
  use-main-menu.ts
  use-file-name-dropdown.ts
  use-property-clipboard.ts
  use-shortcut-registration.ts

kova-open-pencil-1/src/components/menu/
  MainMenuPopover.vue
  FileSubmenu.vue
  EditSubmenu.vue
  ViewSubmenu.vue
  ObjectSubmenu.vue
  BooleanOpsSubmenu.vue
  TextSubmenu.vue
  CaseSubmenu.vue
  CopyAsSubmenu.vue
  PanelsSubmenu.vue
  ArrangeSubmenu.vue
  PreferencesSubmenu.vue
  HelpSubmenu.vue
  FileNameDropdown.vue
  MenuItem.vue
  MenuSeparator.vue
  MenuGroupLabel.vue
  KbdRow.vue

kova-open-pencil-1/src/components/context-menu/
  ContextMenuShell.vue
  OverflowDots.vue

kova-open-pencil-1/src/components/overlay/
  FindOverlay.vue

kova-open-pencil-1/src/components/dialog/
  KeyboardShortcutsDialog.vue
  ShortcutRow.vue

kova-open-pencil-1/src/canvas-extensions/find-highlight/
  index.ts

kova-open-pencil-1/src/types/
  shortcuts.ts
  find.ts

kova-open-pencil-1/src/actions/
  transform-actions.ts        # rotate / flip wrappers (if needed)
  layout-actions.ts           # pack / distribute wrappers
  round-to-pixel.ts           # if not already in editor.ts

kova-open-pencil-1/tests/stores/
  menu.test.ts
  shortcuts.test.ts
  find.test.ts

kova-open-pencil-1/tests/composables/
  use-object-actions.test.ts
  use-context-menu.test.ts
  use-find.test.ts
  use-property-clipboard.test.ts
  use-keyboard.test.ts

kova-open-pencil-1/tests/components/menu/
  MenuItem.test.ts
  KbdRow.test.ts

kova-open-pencil-1/tests/components/dialog/
  KeyboardShortcutsDialog.test.ts

kova-open-pencil-1/tests/components/overlay/
  FindOverlay.test.ts

kova-open-pencil-1/tests/e2e/
  canvas-menus.spec.ts
  canvas-context-menu.spec.ts
  find-overlay.spec.ts
  shortcuts-dialog.spec.ts
  opacity-shortcuts.spec.ts
  recent-colors.spec.ts
  view-toggles.spec.ts
  menu-visual-regression.spec.ts
```

### Modified

```
kova-open-pencil-1/src/composables/use-keyboard.ts    # major refactor: switch → registry consumer
kova-open-pencil-1/src/main.ts (or app-bootstrap.ts)  # mount FindOverlay + KeyboardShortcutsDialog + register shortcuts at boot
```

### Touched (NOT modified — only consumed via existing public API)

```
kova-open-pencil-1/packages/core/figma-api.ts         # read figma.booleanOperation
kova-open-pencil-1/packages/core/src/scene-graph.ts   # read isMask field per Q2
kova-open-pencil-1/packages/core/src/editor.ts        # consume existing methods
```

(Per CLAUDE.md `packages/core/` is read-only. Zero modifications.)

---

## Execution notes

- **TDD strict:** every phase opens with RED tests before any implementation code. No exceptions.
- **Verification before completion:** every phase has an explicit exit gate. Do not advance until all rows pass.
- **Subagents:** `e2e-runner` for Phase 5 / 6 / 8 long-running E2E flows; `superpowers:code-reviewer` after Phase 4 + Phase 8 against PRD spec.
- **AskUserQuestion checkpoints:** open questions in §12.4 / §12.5 / §12.6 of PRD require founder confirmation BEFORE locking in the implementation. Surface during Phase 0 review.
- **Worktree:** per CLAUDE.md / `superpowers:using-git-worktrees`, isolate execution in `.claude/worktrees/prd-08-impl`.
- **Browser smoke before done:** per `feedback_browser_smoke_test_before_done` memory, founder verifies in browser. Green CI ≠ working feature.
- **No `packages/core/` writes:** every action wires through existing public API or thin app-layer wrappers in `src/actions/`. Per CLAUDE.md hard constraint.

---

## End of plan

PRD 08 implementation plan ready. Status: `DRAFT — awaits PRD approval`. Hand off to `superpowers:test-driven-development` once PRD §0 status = APPROVED.
