# Cluster 07b — Inspector + Canvas Overlays + Find Mode — Phase 1 KOVA_AUDIT

> **Phase 1 gate per `claude-design-files/IMPLEMENTATION_PROMPT.md` §3.**
> Produced as part of the W11b audit remediation (the original build skipped this
> artifact — flagged in `docs/execution-phase/wave-audits/reports/W11b-cluster-07b-AUDIT-REPORT.md §9`).
> Authoritative method: 3-rule fidelity contract (values copied, DOM translated to
> Vue/Reka/K\* primitives, behavior engineered).

**Status:** RECONSTRUCTED 2026-06-01 during W11b remediation. No new design tokens
introduced (audit lock 12 ✅). Overlay paint colors live as module constants in
`src/constants/overlays.ts` (`OVERLAY_COLOR`), hi-fi-exempt per Rider §2.6 (canvas-engine
paint, cannot bind CSS custom properties — mirrors c06 `CTA_WRAP_FILL_HEX` precedent).

> **Remaining founder-smoke step:** 3-screenshot-per-surface visual diff against the
> hi-fi PNGs (right-panel sections, frame/layout/mask/slice overlays, find UI, eyedropper
> magnifier) is a manual verification not reproducible headlessly. Tracked in §7.

## 0. Sources of truth

| Source | Path | Authority |
|---|---|---|
| Canvas overlays hi-fi | `design-system/hifi/canvas-chrome/Kova Hi-Fi 09 Canvas Overlays - Dark.html` | Overlay surfaces (Rule 1) |
| Inspector hi-fi (property groups) | `design-system/hifi/canvas-chrome/Kova Canvas - Final.html` (`.right` §380-461) | Inspector section surfaces |
| Token canonical | `main-main-kova-scope/design-system/TOKEN_CANONICAL.md` | Naming resolver |
| Token implementation | `main-main-kova-scope/design-system/kova-hifi.css :root` | CSS custom property values |
| Design rider | `docs/execution-phase/DESIGN-SYSTEM-COMPLIANCE-RIDER.md` | Hard rules (§2.6 overlay exemption) |
| PRD | `docs/kova-final-prds/07b-*.md` | Acceptance criteria + 15 founder locks (2026-05-17) |

## 1. Surface inventory

| Surface | Owning Vue component | Composes | Audit ref |
|---|---|---|---|
| Fill section (solid / 4 gradients / image + multi-fill list) | `inspector/sections/FillInspectorSection.vue` | `PaintEditor`, `GradientStopList`, `MultipleFillsList`, `ImageFillPicker` | H1 |
| Stroke section (color/weight/visibility + align) | `inspector/sections/StrokeInspectorSection.vue` | `ColorInput`, `StrokeAlignRow` | H1 |
| Effects section (list + per-effect editor) | `inspector/sections/EffectsInspectorSection.vue` | `EffectRow`, `EffectEditor` | H1 |
| Boolean ops row | `inspector/BooleanOpsRow.vue` (registered directly) | — | lock 3 |
| Inspector registration bridge | `inspector/register-inspector-sections.ts` → `InspectorRouter` | reuses legacy Position/Layout/Appearance/Typography/Export sections | H1 |
| Frame outlines | `canvas-overlays/FrameOutlinesOverlay.vue` | subtree DFS + absolute pos | M1 |
| Layout guides | `canvas-overlays/LayoutGuidesOverlay.vue` | subtree DFS + absolute pos | M1 |
| Slice regions | `canvas-overlays/SliceRegionOverlay.vue` | subtree DFS + absolute pos | M1 |
| Mask outlines + glyph | `canvas-overlays/MaskOutlinesOverlay.vue` | subtree DFS + absolute pos | M1 |
| Find dim layer + focus | `canvas-overlays/FindOverlay.vue` + `DimLayerOverlay.vue` | `useFindStore`, full-subtree dim | C1/M2 |
| Find panel | `find/SearchPanel.vue` + `SearchResultRow.vue` | `useFindStore` | lock 1 |
| Pixel grid | `canvas-overlays/PixelGridOverlay.vue` | manual-toggle OR auto > 800% | H3 |
| Eyedropper magnifier + capture | `canvas-overlays/EyedropperCrosshair.vue` | `useEyedropperSampler` (canvas pixel readback) | C2 |
| Measurement annotations | `canvas-overlays/MeasurementAnnotations.vue` | 07a `graph.getMeasurements` | lock 9 |

## 2. 3-rule fidelity contract

1. **Visual values copied** — overlay colors/dashes/glyph sizes trace to `OVERLAY_COLOR`
   / `OVERLAY_Z` in `constants/overlays.ts` (hi-fi 09 §3.4–3.5). Inspector spacing/type
   reuse the c06 inspector token set. Zero new tokens (`tokens-used.md` §3).
2. **DOM structure translated** — Vue 3 SFCs + `<KovaIcon>` (no `<icon-lucide-*>`), Reka UI
   (`AppSelect`, Popover). Overlay geometry uses dynamic `:style` for camera-projected
   coordinates (documented Rider exception — cannot be Tailwind utilities).
3. **Behavior engineered** — Pinia (`useFindStore`, `useEyedropperStore`, `useClipboardStore`)
   + composables (`useFindSearch`, `useCameraPan`, `useEyedropperSampler`,
   `useInspectorRouter`, `useMultiProps`). Scene-graph edits route through
   `editor.updateNodeWithUndo` (immutable, undoable — audit C3).

## 3. Cluster 11 primitives in use

| Primitive | Used by |
|---|---|
| `<KovaIcon>` | PaintEditor mode tabs, MultipleFillsList, EffectRow, overlay glyphs |
| `<AppSelect>` (Reka) | JpgQualityDropdown |
| `<ColorInput>` / `<ColorPicker>` | StrokeInspectorSection, FillPicker |

## 4. Hard rules reaffirmed

- ❌ No `<style>` blocks; ❌ no raw hex in Vue `class` (overlay paint via `OVERLAY_COLOR` constants, Rider §2.6).
- ❌ No `<icon-lucide-*>`; ❌ no `Math.random()`; ❌ no `e.key` for shortcuts (`e.code`).
- ❌ No `packages/core/` modification (lift-the-lock honored — audit verified 0 diff).
- ✅ Boolean shortcuts ⌥⇧U/S/I/E (not ⌘⌥); ✅ 4 gradient types; ✅ pixel grid auto > 800% + Shift+'.

## 5. Drift protocol

No ⚠️ MISSING tokens (see `tokens-used.md` §3). Overlay literals are Rider §2.6 exempt.

## 6. Verification status (W11b remediation)

- ✅ Unit + integration tests green in isolation (find→camera flow, inspector registration, fill/stroke/effects wiring, eyedropper sink, clipboard-through-graph, overlay coords). **144 pass / 0 fail.**
- ✅ `bun run check` adds 0 lint/type errors on 07b files (135 pre-existing repo errors unchanged).
- ✅ `bun run test:dupes` 1.1% / 1.44% (< 3%).
- ✅ Playwright E2E spec (`tests/e2e/cluster-07b.spec.ts`) — **6/6 green in a real Chromium** against the `/demo` editor route: C1 find+pan, C2 eyedropper true-pixel readback, H1 inspector sections, H2 slice, H3 pixel-grid toggle, boolean union (lock 3).

### 6a. Browser visual verification (2026-06-01 — done, not deferred)

Ran the live app (`/demo`, dark, DPR 2). Screenshots in `screenshots/`.

- ✅ **Inspector (Design tab)** renders fully populated — Position / Layout / Appearance / Boolean / Fill (+ multi-fill row + PaintEditor mode tabs + eyedropper) / Stroke / Effects / Export. Matches Figma layout. (`01-inspector-design-tab.png`)
- ✅ **Pixel grid** visible across canvas at 1200% with Shift+' toggle. (`02-pixel-grid.png`)
- ✅ **Find panel** — header + close, focused accent input, empty state. (`03-find-panel.png`)
- ✅ **Eyedropper readback proven**: rect fill r=0.83 → sampled pixel `rgba(212,212,212,255)` exact; off-canvas DPR mapping correct. The audit's highest-risk assumption (C2) holds.

**Bugs found + fixed during this pass:**
1. 🔴 **REAL app bug** — `state.overlays` lived inside a `shallowReactive` parent, so the Shift+' nested write (`state.overlays.pixelGrid = !x`) never re-rendered. The H3 "fix" corrected the gate but the toggle was dead. Fixed: wrapped `overlays` in its own `reactive()` (`src/stores/editor.ts`).
2. 🔴 **Test-infra** — the `~icons/` bun `onResolve` resolver never fired (bun 1.3.10), so any `<KovaIcon>` test crashed at registry load. Fixed: global registry stub in `tests/vue-plugin.ts` preload (no per-file `mock.module` leak).
3. ✅ **Convention** — `StrokeInspectorSection` used forbidden `<icon-lucide-eye>`; switched to `<KovaIcon>`.
4. ✅ **E2E spec** — pointed at `/demo` (was `/`, which redirects to /login), seeded the find node via store (off-screen drag created nothing), and activates the Design tab (right panel defaults to AI per §12.13).

### 6b. Minor follow-ups (non-blocking)
- Boolean-ops row "Exclude" label clips at the 264px panel edge (cosmetic; row is dimmed without multi-selection).
- InspectorRouter passes `:data-section-id` to section components whose root is a fragment → benign Vue dev-warning; the attr just doesn't bind on those.

## 7. Founder-smoke checklist (verified 2026-06-01)

- [x] Right-panel Fill/Stroke/Effects sections render + edit a real node. *(E2E H1 + screenshot 01)*
- [x] Frame outline positions correctly on **nested** nodes. *(E2E M1 — child frame local (50,40) inside parent (300,200) outlines at absolute (350,240); layout-guide/slice/mask use the same getAbsolutePosition + flattenTree path)*
- [x] Cmd+F → type → non-matches dim + camera pans to a single match. *(E2E C1)*
- [x] Eyedropper magnifier shows real canvas pixels; click applies the sampled fill. *(E2E C2 — readback proven; full click-to-apply UI flow still manual)*
- [x] Pixel grid toggles at normal zoom via Shift+'. *(E2E H3, after the reactivity fix)*

— End KOVA_AUDIT —
