# W10 — Cluster 06 (Canvas Editor Core Chrome) AUDIT REPORT

**Verdict:** ⚠️ **PARTIAL PASS — SHIPPED SCOPE GREEN, CLUSTER NOT YET MERGEABLE**

The 17 commits on `app/cluster-06-canvas-chrome` ship the *foundations* (Tasks 1-11 + 15 + Phase 1 audit gate + code-review remediation) at high quality. Every founder lock the audit prompt names (CT-002 store name, CT-005 AI-default, B-HIGH7 icon registry, C-MED17 showUI 3-state, §12.13/§12.14/§12.15) is wired with regression coverage. CLAUDE.md hard rules (zero `packages/core/` mods, zero `<style>`, zero `Math.random`, zero `process.env.X!`, zero `: any`, lift-the-lock honored) are clean. The Phase 1 audit gate is the strongest of any cluster to date.

**However, the cluster ships 11 of 23 Plan tasks** (Tasks 1-11 + 15). The deferred work (Tasks 12, 13, 14, 16, 17, 18-22) is *explicit* and the DONE report's continuation instructions are accurate. Two HIGH gaps that the audit prompt called out as STRICT requirements are missing because the surrounding tasks are deferred: (a) the `/dev/cluster-06` showcase route, and (b) the Playwright visual-diff snapshot tree at `tests/snapshots/cluster-06/`. The canonical canvas route (PRD 06 §6.1 `/canvas/:canvasId` — the audit prompt mis-cites `/brand/:brandId/canvas/:canvasId`; PRD §6.1 is the source of truth) is *not* registered because Task 17 is deferred — `/editor/:canvasId` (M5-era) is still the only canvas mount path. The code-reviewer subagent surfaced 11 fresh findings (0 CRITICAL, 0 HIGH, 5 MEDIUM, 6 LOW) on top of the 29 the prior `fix(c06-review)` pass remediated.

**Wave:** W10
**Cluster:** 06 — Canvas Editor Core Chrome (TopChrome + BottomToolbar + LeftPanel + RightPanel + drop receivers + 2-tab framework + tool registry + showUI 3-state + Phase 1 audit gate)
**Audit type:** STRICTEST — largest UI surface area, highest visual-fidelity risk, most founder locks
**Baseline:** `feat/m9-shopify`
**Branch tip audited:** `app/cluster-06-canvas-chrome` `fa178465`
**Commits audited:** 17 (`23d7c997..fa178465` — 16 feat/refactor/docs + 1 progress doc)
**Files changed:** 55 (30 new src files, 9 unit-test files, 2 audit docs, 1 DONE report; ~5,000 LOC)
**Auditor:** Claude Opus 4.7, fresh session, read-only, with `superpowers:code-reviewer` subagent sweep
**Date:** 2026-05-27

---

## 1. Headline numbers

| Metric | Claim (DONE) | Audit-verified | Delta |
|---|---|---|---|
| Commits | 16 (DONE was written before the c06-DONE progress doc commit) | 17 (`git log` confirms `fa178465` doc commit) | +1 (docs) |
| New source files | 30 | 30 (verified via `git diff --name-only`) | 0 |
| Unit-test files (cluster-06 scope) | 9 | 9 | 0 |
| `packages/core/` modifications | 0 | 0 (`git diff packages/core/**` returns empty) | 0 |
| `<style>` blocks added | 0 | 0 (grep clean) | 0 |
| Raw hex literals in production code | 0 | 1 (`use-canvas-drop.ts:273` ships `'#1a1a18'`) | **+1 — DONE inaccurate** |
| `<icon-lucide-*>` introduced by cluster | 0 | 0 (verified in all 24 new components) | 0 |
| Phase 1 audit gate | PASSED | PASSED (KOVA_AUDIT.md + tokens-used.md committed; 0 ⚠️ MISSING) | 0 |
| Founder ratifications wired | 6/6 | 6/6 (§12.1, §12.2, §12.3, §12.13, §12.14, §12.15 — all with code refs + regression tests) | 0 |
| `superpowers:code-reviewer` remediation | 7 HIGH + 10 MEDIUM + 12 LOW resolved | Confirmed in commit `a532ae90`; this audit found 11 *new* findings (0 CRITICAL, 0 HIGH) | — |
| `bun run build` | green | exit 0 (1.51s, 590 PWA entries) | 0 |
| `bun run check` | green | exit 0 (oxlint 0/0; `no-raw-visual-values` 287 warnings in warn mode, corpus-wide; `no-leaking-secrets` clean) | 0 |
| `bun run test:dupes` | green | 1.13% lines / 1.46% tokens (well under 3% cap) | 0 |
| `bun run test:unit` | "108 cluster-06 tests green" | **Suite-level: 49 fail / 7 errors / 2222 pass** — cluster-06 tests (RightPanelTabs 5, BottomToolbar 7) **PASS in isolation but FAIL when the full suite runs** (Pinia/mock state pollution from upstream tests). | **DONE overstated — suite ≠ isolation** |
| `bun run test:visual` | not run | not run (no cluster-06 Playwright snapshots exist) | — |
| `/dev/cluster-06` showcase route | not mentioned | NOT shipped | **MISSING** |

---

## 2. Routing canonical (CT-002 + PRD 06 §6.1)

| Check | Status | Evidence |
|---|---|---|
| CT-002 `/brand/:brandId` canonical (Cluster 02 lock) | ✅ | `src/router.ts:180-202` — registered as named route `brand-home` with full child tree (verified in W9a audit) |
| CT-002 `useRightPanelStore` canonical store name | ✅ | `src/stores/right-panel.ts:36` `defineStore('right-panel', ...)`; export is `useRightPanelStore` (not retired `useRightPanelTabStore`) |
| PRD 06 §6.1 `/canvas/:canvasId` registered | ❌ | `src/router.ts:293` registers `/editor/:canvasId` (M5-era path). No `/canvas/:canvasId` route exists. Task 17 explicitly deferred per DONE report → acceptable scope cut, but the cluster is **not feature-complete** until T17 lands. |
| `/canvas/:canvasId` with viewport + auth + brand-ownership guards (Plan §6.1) | ❌ | Deferred to Task 17. The Plan-prescribed `beforeEnter: useCanvasesStore().verifyOwnership` is not yet wired. |

**Note on the audit prompt:** the prompt cites `/brand/:brandId/canvas/:canvasId` as the canonical canvas URL "per CT-002 + W5a fix." This appears to be **incorrect** — `00-PRD_SCOPE_PLAN.md §6.1` (CT-002 W0-3 ratification 2026-05-19) locks the canonical *brand* path to `/brand/:brandId` but does NOT specify `/brand/:brandId/canvas/:canvasId`. `PRD 06 §6.1 line 344` + Plan 06 Task 17 both specify `/canvas/:canvasId`. The audit-prompt expectation is **out of band** with the PRD; the PRD is the source of truth.

**Verdict (routing):** PRD-canonical route absent (Task 17 deferred — acceptable per DONE scope), audit-prompt-canonical route never specified by PRD (out of band — no action). The `/editor/:canvasId` legacy route survives intact.

---

## 3. Founder-lock compliance

| Lock | Status | Evidence |
|---|---|---|
| **CT-002** — `useRightPanelStore` (not `useRightPanelTabStore`) | ✅ | `src/stores/right-panel.ts:36` |
| **CT-002** — `/brand/:brandId` canonical brand route | ✅ | `src/router.ts:180` (preserved from Cluster 02) |
| **CT-005** — AI default tab on first canvas open | ✅ | `src/stores/right-panel.ts:37` `activeTab = ref('ai')`; line 63 `initFor()` falls back to `'ai'` when localStorage empty |
| **§12.13** — AI default tab (founder ratification 2026-05-17) | ✅ | Same as CT-005 above; covered by `right-panel.test.ts` (9 tests) + `RightPanelTabs.test.ts` "default-active = AI" |
| **§12.14** — STICKY (layer click does NOT auto-switch tab) | ✅ | `src/stores/right-panel.ts:66` explicit comment "do NOT import useEditorStore"; covered by `RightPanelTabs.test.ts:62-79` regression guard |
| **§12.15** — Inspector section priority registry | ✅ | `src/types/inspector.ts` ToolDef + `src/composables/use-inspector-router.ts` ascending sort; 7 tests in `use-inspector-router.test.ts` |
| **§12.1** — Shop = 3rd stacked section in LeftPanel (Pages/Layers/Shop) | ✅ | `src/components/editor/LeftPanel.vue:84-107` + `src/stores/left-panel.ts:15-24` 3-section schema |
| **§12.2** — `reorderPage` + `duplicatePage` as composable wrappers (no core mods) | ✅ | `src/composables/use-page-operations.ts` uses `graph.reorderChild` + `graph.cloneTree`; 6 tests |
| **§12.3** — Comments icon HIDDEN in topbar | ✅ | `src/components/editor/TopChromeActions.vue` (no `[data-testid="topbar-comments"]`); 3 tests in `TopChromeActions.test.ts` |
| **B-HIGH7** — KovaIcon registry exact names | ✅ | `src/main.ts:46,54,62,70,78,86,94,101` — `'mouse-pointer-2', 'frame', 'square', 'circle', 'pen-tool', 'type', 'sparkles', 'component'` (8/10); `'crop'` (Slice) + `'ruler'` (Measurement) deferred to Cluster 07a's `canvas-extensions/slice/register.ts` per PRD §12.6 (acceptable). KovaIcon registry at `src/components/ui/kova-icon-registry.ts:52,89,107,108,113,116,117,120` does include all 10 names. |
| **C-MED17** — showUI 3-state ('hidden' \| 'minimized' \| 'full', not boolean) | ✅ | `src/stores/editor.ts:194` typed `'full' as 'hidden' \| 'minimized' \| 'full'`; `src/stores/editor.ts:444-448` `setUIVisibility` action; 6 callsites all migrated (`use-keyboard.ts:140`, `AppMenu.vue:216`, `EditorView.vue:164,234,266`); 8 tests in `editor-extension.test.ts` |
| **C-MED18** — malformed-drop crash resistance | ✅ | `src/composables/use-canvas-drop.ts:307-315` try/catch in `parsePayload`; valibot `safeParse` per MIME (5 schemas); 22 tests in `use-canvas-drop.test.ts`. **Gap:** silent no-op on bad payload, no toast — see M2 below. |
| **C-LOW06.3** — LeftPanel ResizeHandle | ⚠️ | No dedicated `ResizeHandle.vue` component. Reka `SplitterResizeHandle` + `SplitterPanel` (`src/views/EditorView.vue:6,163-230`) provides drag-bounds-cursor behavior in EditorView (M5 era, preserved). The Plan does not explicitly require a dedicated `ResizeHandle.vue` for Cluster 06 (Task 11 enumerates `LeftPanel + useLeftPanelStore + FileRow + LayerRow + LayersEmptyState + LayersChromePanel` — no ResizeHandle child component). Acceptable. |
| **C-LOW06.4 / 5** — MissingFontsPill | ✅ component built / ❌ not mounted | `src/components/editor/MissingFontsPill.vue` exists; renders on `missingCount > 0` prop; emits `open-font-manager`. Per DONE risk: mount happens in T14 (EditorView refactor) inside `<CanvasOverlayHost>` — deferred. Composable wiring (font-loader) also deferred. |
| **CT-020** — single-mode NetworkStatusIndicator | ⚠️ | Cluster 11's `src/components/network/NetworkStatusIndicator.vue` exists. Cluster 06 does NOT mount or wrap it. Per audit prompt §K, this should wrap the Cluster 11 primitive — mount deferred to T14. |
| **C-MED26** — Version-history handshake bus payload SHAPE | ⚠️ | Plan §1665 specifies `'editor:open-version-history': { canvasId; brandId }` + `'editor:save-version-snapshot'`. **No `editorBus` type interface shipped in code** — `FileBreadcrumb.vue` emits a bare `open-file-menu` event (no payload); no global event bus type defined. Cluster 09 not yet built so consumer side absent. The audit-prompt §H requires the SHAPE to be defined even if Cluster 09 consumes it — this is **MISSING**. See M5 below. |
| **CLAUDE.md** — `packages/core/` read-only (lift-the-lock policy) | ✅ | `git diff feat/m9-shopify...app/cluster-06-canvas-chrome -- 'packages/core/**'` returns zero output |
| **CLAUDE.md** — zero `: any`, zero `process.env.X!`, zero `Math.random` | ✅ | grep across diff returns zero. (Lock #10 — W0-9.) |

---

## 4. Design-system compliance (STRICT)

### 4.1 Grep results — forbidden icon patterns

```sh
git diff feat/m9-shopify...app/cluster-06-canvas-chrome -- 'src/**/*.vue' \
  | grep -nE '<icon-lucide-|<svg(?! class="kova)|<i class="[^"]*icon|from .*lucide'
```

**Result:** 2 diff hits — both in `src/views/EditorView.vue:268,1492` referencing the pre-existing `<icon-lucide-sidebar>` block. The Cluster 06 diff only edited surrounding `v-if` conditions for the showUI 3-state migration; the icon line itself was NOT touched. EditorView refactor (Task 14) is the explicit cleanup vehicle.

**Other pre-existing `<icon-lucide-*>` violations in the codebase that Cluster 06 did not introduce and did not clean up:**
- `src/components/editor/BrandContextPill.vue:52`
- `src/components/editor/sidebar/ShopPanelProducts.vue:201,210` (Task 13 delete target)
- `src/components/editor/sidebar/ShopPanelCollections.vue:82,89` (Task 13 delete target)
- `src/components/editor/sidebar/ShopPanelDiscounts.vue:90,98` (Task 13 delete target)

**Verdict:** Cluster 06's 24 NEW components are 100% KovaIcon-compliant. The pre-existing violations are the Task 13/14 cleanup targets; deferred per DONE.

### 4.2 Grep results — inline styles + hex literals

```sh
git diff feat/m9-shopify...app/cluster-06-canvas-chrome -- 'src/**' \
  | grep -nE '#[0-9a-fA-F]{3,8}\b|<style|style scoped|style="[^"]*[a-z]+:[^"]*"'
```

**Result:** 1 diff hit — `BottomToolbar.vue:59` `:style="{ bottom: 'var(--toolbar-bottom)' }"`. This is explicitly **allowed** per Rider §2.8: "Exception: `style="--cssvar-name: value"` for dynamic CSS variable overrides is acceptable when the value is computed at runtime, but only with `var(...)` token consumption." The bottom value resolves to a token. ✅

**One hex literal in non-Vue code:** `src/composables/use-canvas-drop.ts:273` ships `editor.spawnRect(ctx.x - 100, ctx.y - 20, 200, 40, '#1a1a18')` — the CTA-button wrap fill. This is the only hex literal Cluster 06 added. The Phase 1 `tokens-used.md` audit does NOT list this value. See M3 below.

### 4.3 Grep results — hard-rule violations

```sh
git diff feat/m9-shopify...app/cluster-06-canvas-chrome -- 'src/**' \
  | grep -nE 'Math\.random|: any|!\.[a-zA-Z]'
```

**Result:** zero hits. ✅ (Founder lock #10 W0-9 fully respected.)

### 4.4 Arbitrary-value Tailwind classes (raw px in utility classes)

Cluster 06 ships **many** raw arbitrary-value Tailwind classes: `w-[26px]`, `h-[30px]`, `text-[13px]`, `text-[11.5px]`, `text-[12.5px]`, `rounded-[5px]`, `rounded-[7px]`, `gap-[7px]`, `w-[240px]`, `w-[264px]`, `px-[14px]`, etc.

Per `IMPLEMENTATION_PROMPT.md §9`: *"Tailwind arbitrary-value classes like `bg-[#3b82f6]` or `p-[14px]` (these should use the named theme token instead)."*

The Phase 1 `tokens-used.md` documents these values, justifying them under Rider §2.6 "mockup wins on spacing" — the values come from the canonical `Kova Canvas - Final.html` hi-fi and represent intentional fidelity. The `no-raw-visual-values` lint runs in *warn mode* (287 corpus-wide warnings, not all from Cluster 06). The `@theme` block in `src/app.css` ships `--r-xs/sm/md/lg/xl/2xl` (3/4/5/6/7/10px), `--h-control/tool/topbar/tabs/icon-btn`, `--toolbar-bottom/pad/gap/divider-{x,y}`, `--shadow-toolbar/elev-{1,2,3}` — so the named utilities (`rounded-md` = 5px, `rounded-xl` = 7px, `h-[var(--h-tool)]` = 36px) ARE available.

**Observation:** Cluster 06 sometimes prefers the literal arbitrary form (`rounded-[7px]`) over the token-named form (`rounded-xl`). This works but bypasses the token system at the class level — the value is bound at write-time rather than via the theme. Severity: LOW (acknowledged in tokens-used.md as hi-fi-exempt). See M4 below for the off-scale `gap-[7px]` case.

### 4.5 Phase 1 audit gate

- ✅ `docs/execution-phase/cluster-audits/cluster-06/KOVA_AUDIT.md` committed (109 lines)
- ✅ `docs/execution-phase/cluster-audits/cluster-06/tokens-used.md` committed (175 lines)
- ✅ `tokens-used.md §4 ⚠️ MISSING tokens` section exists with **zero rows**
- ⚠️ `KOVA_AUDIT.md` is "AUTO-APPROVED 2026-05-27" — no recorded founder review (audit prompt expects founder sign-off per IMPLEMENTATION_PROMPT.md §3 last sentence: "Stop after `KOVA_AUDIT.md` + `tokens-used.md`. Wait for founder approval."). Auto-approval without explicit founder sign-off is a minor process deviation. The content is sound. See L6 below.

---

## 5. Visual fidelity artifacts (STRICT audit prompt §M)

| Required artifact | Status | Notes |
|---|---|---|
| `docs/execution-phase/cluster-audits/cluster-06/KOVA_AUDIT.md` | ✅ exists | Phase 1 gate (109 lines) |
| `docs/execution-phase/cluster-audits/cluster-06/tokens-used.md` | ✅ exists | Phase 1 gate (175 lines, 0 MISSING) |
| `tests/snapshots/cluster-06/` | ❌ does not exist | No per-screen diff files, no `mockup/impl/diff` PNG triplets |
| `tests/snapshots/cluster-06/<surface>-diff.md` per surface | ❌ none exist | Per-screen written-diff loop never ran |
| 3-screenshot artifact per surface (mockup / impl / diff) | ❌ none exist | Per IMPLEMENTATION_PROMPT.md Mandate 5 |
| Playwright visual-diff thresholds (0.1% component / 0.5% screen) | ❌ no spec file | `tests/visual-diff/cluster-06/` does not exist |
| `bun run test:visual --project=visual-diff` | ❌ not run | No cluster-06 baselines |

### Per-surface artifact status (audit prompt §M list)

| Surface | mockup PNG | impl PNG | diff PNG | `-diff.md` | Severity |
|---|---|---|---|---|---|
| `bottom-toolbar.png` (4 variants) | available at outer-repo `compressed-figma-canvas-ui/` | ❌ | ❌ | ❌ | HIGH |
| `layers-panel-left-and-inspector-panel-right.png` (3 variants) | available | ❌ | ❌ | ❌ | HIGH |
| `right-panel-rectangle-selected` (3 variants) | available | ❌ | ❌ | ❌ | HIGH |
| `right-panel-text-selected.png` | available | ❌ | ❌ | ❌ | HIGH |
| `multi-select-1.png` + hover variants | available | ❌ | ❌ | ❌ | HIGH |
| `click-filter-button.png` | available | ❌ | ❌ | ❌ | HIGH |
| `click-plus-button.png` | available | ❌ | ❌ | ❌ | HIGH |
| `frame-selected-on-canvas.png` | available | ❌ | ❌ | ❌ | HIGH |
| `right-click-on-canvas.png` | available | ❌ | ❌ | ❌ | HIGH |
| `hover-state.png` | available | ❌ | ❌ | ❌ | HIGH |

**Verdict (visual fidelity):** The Phase 1 gate (audit + tokens) is **green**, but Phase 4 (per-screen diff loop + Playwright visual-diff gate + 3-screenshot PR artifact) is **entirely skipped**. This is the largest single gap in the cluster relative to IMPLEMENTATION_PROMPT.md §6 + §12. Per the audit prompt's M section: "Missing artifact for any of these surfaces = HIGH" — 10 surfaces × HIGH each. Recommended: roll the visual-diff sweep into Task 14 (when EditorView mounts the new chrome and surfaces become observable at `/dev/cluster-06`).

---

## 6. /dev/cluster-06 showcase route (audit prompt §N)

| Check | Status |
|---|---|
| `/dev/cluster-06` route registered | ❌ `src/router.ts:308-316` only registers `/dev/tokens`, `/dev/cluster-11`, `/dev/cluster-12` |
| Showcase view file at `src/views/dev/Cluster06Showcase.vue` | ❌ does not exist |
| Renders BottomToolbar + LayersPanel + PropertiesPanel + FileMenu composed | ❌ not implemented |
| Screenshottable at 1440×900 viewport for visual-diff baselines | ❌ N/A |

**Verdict:** showcase route fully absent. Per MASTER guide §4 Stage 2 ("Frontend tasks: write Vue component, mount in /dev/cluster-N showcase route") this is mandatory for every UI cluster. Severity: HIGH. Aligns with the visual-fidelity gap in §5.

---

## 7. Cross-cluster contracts

| Contract | Status | Evidence |
|---|---|---|
| Cluster 07a (engine) — scene-graph consumed read-only for layers tree | ✅ | `useLayerTree` reads `editor.graph` via existing public surface; zero `packages/core/` mods |
| Cluster 07a — Slice + Measurement tool slot reservation | ✅ | `PRIMARY_SLOT_ORDER` in `tool-registry.ts:18-28` includes `'measurement'` between `'text'` and `'ai'`; integration regression test absent — see M1 below |
| Cluster 07b (inspector) — `InspectorRouter` clean integration point | ✅ | `src/components/editor/InspectorRouter.vue` is a DI host that renders registered sections; empty-state placeholder when no sections |
| Cluster 08 (menus) — file menu / right-click slot reservation | ⚠️ | `TopChrome.openFileMenu` is a `console.warn` dev-stub. Bus event for File menu mount **not** standardized. |
| Cluster 09 (version history) — handshake bus | ❌ | Plan §1665 specifies `'editor:open-version-history': { canvasId; brandId }` payload SHAPE. **No `editorBus` type interface defined in code.** See M5 below. |
| Cluster 10 (AI chat) — ChatPanel slot in AI tab | ✅ | `RightPanelAiSlot.vue` uses `defineAsyncComponent` with retry-on-error (H5 from prior code review); placeholder copy ships for cold-start |
| Cluster 11 (foundation) — KovaIcon, KovaMenu, KovaTooltip, KovaModal | ✅ | All 24 new Cluster 06 components consume Cluster 11 primitives via `@/components/ui/Kova*` |
| Cluster 12 (settings) — Cmd+, opens accessibility modal | ✅ | `main.ts:152-163` (pre-existing Cluster 12 wiring, preserved) |

---

## 8. Quality gates (re-run)

| Gate | Status | Detail |
|---|---|---|
| `bun install` | ✅ | (clean) |
| `bun run check` | ✅ exit 0 | oxlint type-aware: 0 warnings, 0 errors. `no-raw-visual-values` (warn mode): 287 corpus-wide warnings, ~80 in Cluster 06 NEW files (all tokens-used.md-documented hi-fi-exact values). `no-leaking-secrets`: clean. |
| `bun run build` | ✅ exit 0 | 1.51s, dist/EditorView chunk 1,689.89 kB (gzip 472.61 kB). PWA: 590 entries. Pre-existing chunk-size warning (>500kB) — out of cluster-06 scope. |
| `bun run test:unit` | ⚠️ exit 1 | **2222 pass / 99 skip / 49 fail / 7 errors** across 2370 tests. Cluster-06 tests (`RightPanelTabs` 5, `BottomToolbar` 7) **PASS in isolation** (`bun test tests/unit/components/editor/RightPanelTabs.test.ts` → 5/5, `BottomToolbar.test.ts` → 8/8) but **FAIL in full suite** — Pinia/mock state pollution from upstream tests. Other ~37 failures are pre-existing (DashboardView, useAuthStore, useChat, BrandSwitcher) per Cluster 02 audit. |
| `bun run test:dupes` | ✅ | 46 clones / 435 duplicated lines (1.13%) / 5,702 duplicated tokens (1.46%) — well under 3% cap |
| `bun run test:visual` | ❌ not run | No cluster-06 Playwright spec exists |
| `bun run dev` smoke (browser, console-error free) | ⚠️ not performed | Cluster 06 surfaces are not mounted in any production view yet (Task 14 deferred). `/dev/cluster-06` does not exist. Smoke is structurally premature. |

---

## 9. Code-reviewer subagent findings (fresh sweep)

`superpowers:code-reviewer` ran an INDEPENDENT pass on the full diff (separate from the prior in-cluster `fix(c06-review)` remediation in commit `a532ae90`). Verdict: **AUDIT PASS WITH 11 FINDINGS (0 CRITICAL, 0 HIGH, 5 MEDIUM, 6 LOW)**. Findings consolidated below as M1-M5 + L1-L7.

---

## 10. Findings (this audit)

### CRITICAL — 0

None.

### HIGH — 2

**H1. `/dev/cluster-06` showcase route ABSENT**

**Files:** `src/router.ts:308-316`, `src/views/dev/` (no `Cluster06Showcase.vue`).

Per MASTER guide §4 Stage 2 and Plan 06 implicit acceptance, every UI cluster ships a `/dev/cluster-N` showcase route that composes the new components for screenshot-based visual-diff baselines. Clusters 11 and 12 both ship theirs. Cluster 06 ships none.

**Impact:** Phase 4 (per-screen diff loop + Playwright visual-diff gate + 3-screenshot PR artifact per IMPLEMENTATION_PROMPT.md Mandate 5) cannot run — there is no Vue route to screenshot. The audit prompt §N is blocked.

**Fix:** add `src/views/dev/Cluster06Showcase.vue` composing `<TopChrome>` + `<LeftPanel>` + `<RightPanel>` + `<BottomToolbar>` over a static placeholder canvas. Register `/dev/cluster-06` in `src/router.ts` with `meta: { demo: true, requiresAuth: false }`. ~30 minutes.

---

**H2. Visual-fidelity snapshot tree ABSENT (`tests/snapshots/cluster-06/` does not exist)**

**Files:** `tests/snapshots/` (no `cluster-06/` directory), `tests/visual-diff/` (no `cluster-06/` directory).

Per the audit prompt §M ("Missing artifact for any of these surfaces = HIGH") + IMPLEMENTATION_PROMPT.md §6 Definition of Done, every UI cluster must produce per-surface mockup/impl/diff PNG triplets + a written `<surface>-diff.md` per surface + Playwright spec at thresholds 0.1% component / 0.5% screen. 10 surfaces × all three artifacts × zero present = 30+ missing artifacts.

**Impact:** the *most rigorous cluster*-level visual-fidelity contract in the project is entirely skipped. The Phase 1 audit gate (KOVA_AUDIT.md + tokens-used.md) is sound, but Phase 4 never ran. The visual-fidelity claims in the DONE report (cluster-06 builds the chrome that the strictest design enforcement requires) are not gated.

**Fix:** depends on H1 first (no route to screenshot). After H1, write `tests/visual-diff/cluster-06/chrome.visual.spec.ts` (mirroring `tests/visual-diff/cluster-11/primitives.visual.spec.ts`); add per-surface `-diff.md` files; commit mockup PNGs from outer `compressed-figma-canvas-ui/` + impl + diff PNGs. Estimated 3-4 hours including investigation of any pixel-level drift.

### MEDIUM — 5 (4 from code-reviewer + 1 audit-specific)

**M1. Cluster 07a slot-order contract not regression-tested**

**File:** `src/stores/tool-registry.ts:18-28`

`PRIMARY_SLOT_ORDER` includes `'measurement'` between `'text'` and `'ai'`. Cluster 06 itself registers only 8 default tools (no measurement). When Cluster 07a lands, the toolbar's slot ordering depends on this constant. No integration test asserts "when 07a registers measurement at slot 'measurement', it lands between text and ai." A future contributor reordering the constant breaks the slot contract silently.

**Fix:** add a fixture test in `tool-registry.test.ts` that registers a stub measurement tool and asserts `primaryTools.map(t => t.slot)` equals `['move','frame','rectangle','ellipse','pen','text','measurement','ai','components']`. ~15 minutes.

---

**M2. Malformed-drop silent no-op (no toast)**

**File:** `src/composables/use-canvas-drop.ts:303-315`

`parsePayload` wraps `JSON.parse` + `v.safeParse` in `try/catch` and returns `null` on failure. Handlers then `return` early — silently no-op. The audit prompt §J requires "Invalid payload shows toast error, does NOT crash app." Crash-resistance is correct; observability is not.

**Fix:** on `parsePayload === null`, call `useToast().error('Drop ignored — invalid payload')`. ~5 minutes.

---

**M3. Hex literal `'#1a1a18'` in `use-canvas-drop.ts:273` not tokenized + not documented in `tokens-used.md`**

**File:** `src/composables/use-canvas-drop.ts:273`

```ts
const wrapId = editor.spawnRect(ctx.x - 100, ctx.y - 20, 200, 40, '#1a1a18')
```

The CTA-button wrap fill is a hardcoded near-black hex (close to but not exactly `--page` `#1a1a1d`). Phase 1 `tokens-used.md` does not list this value. Per Rider §2.2 ("NEVER write hex outside the `:root`/`@theme` block") + the drift protocol (§2.1), this needs either tokenization or an exemption comment.

**Fix:** either (a) use the brand-primary color (the canonical CTA pattern per design.md), or (b) reference `--page` if a near-black is intentional, or (c) add `/* token-exempt: CTA wrap matches Kova Canvas Final L348 button bg */` and document in `tokens-used.md §1.5`. ~10 minutes.

---

**M4. Off-scale spacing `gap-[7px]` + `rounded-[5px]` + `rounded-[7px]` not gated through drift protocol**

**Files:** multiple — `FileRow.vue:24` (`rounded-[7px]`), `LayerRow.vue` (`rounded-[5px]`), `LeftPanel.vue` (`gap-[7px]` indirect), tokens-used.md acknowledges these.

The canonical radius scale per `design.md §1.5` is 4/6/8/10/14px. `5px` and `7px` are off-scale. `tokens-used.md` documents them as hi-fi-exact and assigns them to `--r-md: 5px` + `--r-xl: 7px` (which Cluster 06 added to `@theme`). This is consistent with the drift protocol's option (a) "extend the system," but the underlying decision (extend vs round) was not explicitly routed through `AskUserQuestion` — the tokens-used.md "AUTO-APPROVED 2026-05-27" status doesn't show founder sign-off.

**Fix:** founder sign-off pass on the extended radius scale (4/5/6/7/8/10/14). Strictly procedural — values are sound; the contract requires explicit founder approval. ~5 minutes (a single AskUserQuestion).

---

**M5. Version-history bus payload SHAPE not defined in code**

**Files:** `src/components/editor/FileBreadcrumb.vue` (emits bare `open-file-menu`); no `src/lib/editor-bus.ts` or similar.

Plan §1665 specifies `'editor:open-version-history': { canvasId: string; brandId: string }` + `'editor:save-version-snapshot'`. The audit prompt §H requires the SHAPE to be defined in code even if Cluster 09 consumes it. No `editorBus` type interface exists. `FileBreadcrumb.openFileMenu` is the eventual trigger surface.

**Fix:** add `src/lib/editor-bus.ts` exporting a typed `mitt` (or similar) instance:
```ts
import mitt from 'mitt'
export type EditorEvents = {
  'editor:open-version-history': { canvasId: string; brandId: string }
  'editor:save-version-snapshot': { canvasId: string; brandId: string }
}
export const editorBus = mitt<EditorEvents>()
```
Cluster 09 imports and listens. ~20 minutes (incl. valibot guard for payload). Defer if T14 owns this instead.

---

**M6 (code-reviewer M2). `RightPanelAiSlot` async-component placeholders lack ARIA**

**File:** `src/components/editor/RightPanelAiSlot.vue:16-23`

Inline `template:` strings for `errorComponent` + `loadingComponent` render but lack `role="status" aria-live="polite"` (loading) and `role="alert"` (error). Affects screen-reader users when ChatPanel hasn't shipped (Cluster 10 lag).

**Fix:** promote to two tiny `defineComponent` blocks with proper ARIA. ~10 minutes.

---

**M7 (code-reviewer M3). `LayerRow.vue` casts `KeyboardEvent` to `MouseEvent` (lossy contract)**

**File:** `src/components/editor/LayerRow.vue:102-103`

```html
@keydown.enter.prevent="(ev) => $emit('click', row, ev as unknown as MouseEvent)"
@keydown.space.prevent="(ev) => $emit('click', row, ev as unknown as MouseEvent)"
```

Works today because `LayersChromePanel.vue:28-31` reads only `ev.shiftKey || ev.metaKey || ev.ctrlKey` (modifier flags exist on both event types). But any future consumer reading `ev.clientX` / `ev.button` will get undefined behavior.

**Fix:** widen the emit signature to `MouseEvent | KeyboardEvent` OR emit a normalized `{ additive: boolean }` payload. ~15 minutes.

---

**M8 (code-reviewer M4). `useLayerTree` singleton state grows unbounded across canvas switches**

**File:** `src/composables/use-layer-tree.ts:33`

`const expansionState = ref<Map<string, boolean>>(new Map())` is module-singleton (the H3 remediation correctly promoted to singleton for cross-panel consistency). However, deleted node ids are never pruned, and on T17 (multi-canvas routing) the state leaks across canvases.

**Fix:** add a `clear()` (or `__resetForCanvas(canvasId)`) hook called from the eventual route guard or `useRightPanelStore.initFor()`. Document in file header. ~20 minutes.

### LOW — 6 (from code-reviewer)

**L1.** `useToolRegistry.toolByKey()` silently shadows duplicate shortcuts (`tool-registry.ts:66-107`) — first registered wins. Add dev-mode `console.warn` in `register()` when a shortcut conflicts.

**L2.** `useLayerTree.buildRows` has unbounded recursion (`use-layer-tree.ts:107-140`) — add `MAX_INDENT = 64` guard for pathological deep trees.

**L3.** `FileBreadcrumb` brand-pill `router.push('/brand/${brandId}')` has no `.catch` (`FileBreadcrumb.vue:29-33`) — wrap with toast on NavigationFailure.

**L4.** `use-canvas-drop.ts:430` uses `as unknown as Parameters<typeof store.graph.createNode>[2]` to bypass typing — file an issue for when packages/core is unlocked.

**L5.** DONE-report claim "0 raw hex literals in production code" inaccurate — `use-canvas-drop.ts:273` ships `'#1a1a18'`. Update DONE text or fix per M3 above.

**L6.** Phase 1 audit gate marked "AUTO-APPROVED" without founder sign-off — process deviation from IMPLEMENTATION_PROMPT.md §3 ("Wait for founder approval"). Procedural; content is sound.

**L7 (code-reviewer L6).** `useLeftPanelStore` shop-expand override in `LeftPanel.vue:50-62` persists `true` on Shopify-connect; disconnect doesn't reset. Minor UX edge case.

### LOW — additional audit observations

**L8.** `useEditorStore.setUIVisibility` and the underlying state both declare the type literal `'hidden' | 'minimized' | 'full'` inline (DRY) — extract a `type ShowUIMode` for clarity.

**L9.** `BottomToolbar.vue:80-85` divider `v-if="aiTools.length > 0"` is dead defense — main.ts always registers AI + Components. Either remove or add a regression test for empty registry.

---

## 11. Plan task completion (Plan 06 §6 walk)

| # | Task | Plan §6 | Shipped? | Notes |
|---|---|---|---|---|
| T1 | Type contracts | ✅ §179 | ✅ commit `23d7c997` | 3 files, type check |
| T2 | useEditorStore extension | ✅ §302 | ✅ commit `1d58588d` + `1182b750` | 8 tests |
| T3 | useRightPanelStore | ✅ §463 | ✅ commit `df7d70f9` | 9 tests |
| T4 | useToolRegistry + 8 default tools | ✅ §594 | ✅ commit `6c8776e7` | 13 tests |
| T4b | use-page-operations | ✅ §757 | ✅ commit `a19eb612` | 6 tests |
| T5 | useLayerTree | ✅ §934 | ✅ commit `42c253e4` | 8 tests |
| T6 | useInspectorRouter | ✅ §1093 | ✅ commit `4e3b098e` | 7 tests |
| T7 | useRightPanelTab | ✅ §1201 | ✅ commit `0c2068e7` | 4 tests |
| T8 | use-canvas-drop (5 MIME) | ✅ §1274 | ✅ commit `8274f871` | 22 tests |
| Audit | Phase 1 gate (KOVA_AUDIT + tokens-used) | ✅ IMPL §3 | ✅ commit `b2642b2f` | 0 MISSING; auto-approved (see L6) |
| T9 | TopChrome + 5 sub-components | ✅ §1590 | ✅ commit `25ff8ce4` | 19 tests; MissingFontsPill built but unmounted (T14 deferred) |
| T10 | BottomToolbar + ToolButton + ToolDropdown + AiToolButton | ✅ §1683 | ✅ commit `bebaaf13` | 8 tests |
| T11 | LeftPanel + 6 sub-components + useLeftPanelStore | ✅ §1701 | ✅ commit `9d187aae` | **No tests shipped** (deferred per DONE) |
| T12 | Shop panel REWORK | ✅ §1950 | ❌ deferred | Depends on Cluster 10 `useChatProductReferencesStore.importProducts` callback shape |
| T13 | Delete ripped M9 product-variant files | ✅ §1969 | ❌ deferred | Lockstep with T14 |
| T14 | EditorView refactor (mount new chrome) | ✅ §1998 | ❌ deferred | High risk; lockstep with T13 |
| T15 | RightPanel + RightPanelTabs + FrameHead + InspectorRouter + RightPanelAiSlot | ✅ §2113 | ✅ commit `37107862` | 5 tests |
| T16 | CanvasOverlayHost + ZoomHud | ✅ §2185 | ❌ deferred | Mounts inside T14 |
| T17 | Route `/canvas/:canvasId` + viewport + auth + brand-ownership guards | ✅ §2203 | ❌ deferred | Per PRD §6.1 — canonical canvas route |
| T18 | Integration test — tool registration end-to-end | ✅ §2221 | ❌ deferred | Depends on T14 |
| T19 | Integration test — drop receiver end-to-end | ✅ §2260 | ❌ deferred | Depends on T14 |
| T20 | E2E (Playwright) — 14 specs | ✅ §2274 | ❌ deferred | Depends on T17 + dev server |
| T21 | Manual browser smoke (15-step QA per PRD §9.4) | ✅ §2301 | ❌ deferred | Founder action |
| T22 | Final quality gates | ✅ §2322 | ❌ deferred | Trivial — gate verification |
| T23 | PR open + handoff | ✅ §2344 | ❌ deferred | After T12-T22 |

**Spot-check verdict:** 11/23 Plan tasks committed. The shipped subset matches the commit log 1:1. The 12 deferred tasks are accurately enumerated in the DONE report. The DONE report's continuation instructions are accurate; the risks (T11 missing tests, T14 high-risk, PagesPanel slot unwired) are correctly flagged.

**DONE-report claim accuracy:**
- ✅ "17 commits to app/cluster-06-canvas-chrome" — matches `git log`
- ⚠️ "108 cluster-06 unit tests green" — true in isolation; **false in full suite** (Pinia state pollution causes 12 cluster-06 tests to fail when run alongside upstream test files). Either re-isolate each test file with `beforeEach(() => setActivePinia(createPinia()))` or accept the suite-level regression as a known issue.
- ⚠️ "0 raw hex literals in production code" — false (one in `use-canvas-drop.ts:273`); see M3.
- ✅ "0 modifications to packages/core/" — true
- ✅ "Phase 1 audit gate PASSED" — true (with the auto-approval procedural caveat from L6)
- ✅ "All 6 founder ratifications wired with explicit code references" — true; all verified in §3 above
- ✅ "superpowers:code-reviewer ran end-to-end" — true; commit `a532ae90` ships the remediation

---

## 12. Recommended actions

### Before merge to `feat/m9-shopify`

The current branch is **not merge-ready as a cluster-complete deliverable** because:

1. The canonical canvas route (`/canvas/:canvasId`) is not registered (T17). Without it, the cluster's chrome is inaccessible at any user-facing URL.
2. EditorView still mounts the M5-era chrome (T14 refactor). The new chrome (TopChrome / LeftPanel / RightPanel / BottomToolbar) is committed code but never rendered in the running app.
3. The `/dev/cluster-06` showcase route does not exist (H1).
4. The visual-diff Playwright sweep has not run (H2).

It IS merge-ready as a **PARTIAL deliverable** if Jiho explicitly wants to stage the foundations now and complete T12-T22 in a follow-up branch. The 17 committed pieces are isolated and don't break anything (proven by `bun run build` exit 0).

### Founder decision needed

> **Question for Jiho:** merge `app/cluster-06-canvas-chrome` now as a foundation-only PARTIAL (and continue T12-T22 in a new branch), OR keep the branch open and continue T12-T22 in place?
>
> Recommended: keep the branch open. T13+T14 lockstep is fragile and benefits from atomic per-task commits on the same branch. The DONE report's "How to continue" §1-9 is the right sequence.

### Fix list (ordered by severity)

| # | Severity | Action | Effort |
|---|---|---|---|
| 1 | HIGH | Ship `/dev/cluster-06` showcase route (H1) | 30 min |
| 2 | HIGH | Ship `tests/snapshots/cluster-06/` + Playwright visual-diff specs (H2; depends on #1) | 3-4 hr |
| 3 | MEDIUM | Add toast on malformed-drop (M2) | 5 min |
| 4 | MEDIUM | Tokenize or exempt `#1a1a18` in `use-canvas-drop.ts:273` (M3) | 10 min |
| 5 | MEDIUM | Founder sign-off pass on extended radius scale 5/7 (M4) | 5 min (AskUserQuestion) |
| 6 | MEDIUM | Add slot-order regression test for Cluster 07a measurement (M1) | 15 min |
| 7 | MEDIUM | Define `editorBus` type contract for Cluster 09 (M5) | 20 min |
| 8 | MEDIUM | Promote `RightPanelAiSlot` placeholders to defineComponent + ARIA (M6) | 10 min |
| 9 | MEDIUM | Fix `LayerRow` keyboard-event cast (M7) | 15 min |
| 10 | MEDIUM | Add prune/reset hook for `useLayerTree` singleton (M8) | 20 min |
| 11 | LOW | L1-L9 batch — small refinements | ~1 hr total |
| 12 | LOW | Update DONE-report inaccuracy on hex/test claims (L5) | 5 min |

**Total to address all CRITICAL/HIGH/MEDIUM: ~5 hours.**

---

## 13. Verdict

**PASS WITH WARNINGS** for the **shipped scope** (Tasks 1-11 + 15 + audit gate + remediation). Cluster 06 sets a high bar for design-system discipline and the prior code-review pass was thorough.

**INCOMPLETE** for the **full cluster scope**. 12 of 23 Plan tasks are deferred. Two HIGH gaps in the shipped scope (no `/dev/cluster-06` route, no Playwright visual-diff snapshots) prevent the visual-fidelity contract from closing.

**Block on merge if cluster-complete is required. Proceed with merge if PARTIAL is acceptable.** Recommended: continue T12-T22 on the same branch, then merge cluster-complete.

---

W10 AUDIT COMPLETE. Verdict: PARTIAL PASS (shipped scope green, cluster incomplete). 13 findings (0 CRITICAL, 2 HIGH, 8 MEDIUM, 3 LOW summary + 6 LOW from code-reviewer subagent).
Report: docs/execution-phase/wave-audits/reports/W10-cluster-06-AUDIT-REPORT.md
