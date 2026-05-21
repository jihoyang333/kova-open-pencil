# Cluster 11 — visual-diff snapshots + per-primitive written diffs

**Status:** Phase 4 scaffold (W6 REDO 2026-05-20). Per-primitive baselines generate on first `bun run test:visual` run after Phase 3 SFCs land.

**Authority:** `docs/execution-phase/claude-design-files/IMPLEMENTATION_PROMPT.md` §6 + §12. Cluster 11 founder-approved Q-G G1 = clip-region method against screen hi-fi.

---

## Clip-region method (Q-G G1)

For Cluster 11 primitives that ship without a dedicated hi-fi mockup, the visual-diff baseline is the **clipped region** of the screen hi-fi that contains the primitive. Playwright clips on the canonical selector (`.toast`, `.dlg`, `.popover`, `.menu`, `.skeleton`, `.empty-pane`, `.err-page`) at exactly 1440 px viewport with the CI-deterministic fixture applied.

**Method per primitive (executed in `primitives.visual.spec.ts`):**

1. Open the screen hi-fi at `/dev/hifi/<cluster>/<file>.html?ci=1` via dev server.
2. `await waitForStable(page)` (font ready + networkidle).
3. `await expect(page.locator('<selector>').first()).toHaveScreenshot('<primitive>-mockup.png', { maxDiffPixelRatio: 0.001 })` → baseline.
4. Open Vue impl at `/dev/cluster-11`.
5. `await waitForStable(page)`.
6. `await expect(page.locator('<selector>').first()).toHaveScreenshot('<primitive>-impl.png', { maxDiffPixelRatio: 0.001 })` → impl.
7. Diff = `<primitive>-impl-diff.png` written automatically when comparison fails.

**Thresholds:** `maxDiffPixelRatio: 0.001` (0.1%) + `threshold: 0.2` (per-pixel color tolerance for anti-aliasing absorption).

---

## Primitive → hi-fi clip table

| Primitive | Hi-fi file (in-repo) | Selector |
|---|---|---|
| KovaToast (success / error / ai) | `design-system/hifi/states/Kova Hi-Fi B1 Toasts - Dark.html` | `.toast.success`, `.toast.error`, `.toast.ai` |
| KovaModal sm/md/lg | `design-system/hifi/canvas-menus/Kova Hi-Fi A6+A2a Popovers + A8 Dialogs - Dark.html` | `.dlg.sm`, `.dlg.md`, `.dlg.lg` |
| KovaPopover (default + avatar) | same as Modal hi-fi | `.popover` (first non-avatar), `.popover.avatar` |
| KovaMenu | `design-system/hifi/canvas-chrome/Kova Hi-Fi 08 Top Chrome Menus - Dark.html` | `.menu` |
| KovaTooltip | spec inferred (no hi-fi) — diff against Vue impl only (skip mockup baseline) | `.tooltip` |
| KovaSkeleton | `design-system/hifi/states/Kova Hi-Fi B7 Loading Skeletons - Dark.html` | `.skeleton` (first), `.skeleton.r-pill / r-card / r-line / r-circle` |
| EmptyState inline-32 / panel-40 / full-48 | `design-system/hifi/states/Kova Hi-Fi B9 List Search Empty - Dark.html` | `.empty-pane.inline`, `.empty-pane` (panel-40), `.empty-pane.full-page` |
| Error pages 404 / 500 / network | `design-system/hifi/states/Kova Hi-Fi B2 Error Pages - Dark.html` | `.err-page` (each scene) |
| KovaButton variants | canonical `.btn` in `kova-hifi.css` — no hi-fi scene shows all variants stacked. Diff against `/dev/cluster-11` button row screenshot. | `[data-test-id='showcase-button-row']` |
| KovaInput / KovaField / KovaPill / KovaSegmented / KovaCheckbox / KovaAvatar / KovaSelect | canonical primitives — diff against `/dev/cluster-11` row screenshots | per-section data-test-id |

---

## How to run

**Pre-requisites:**
1. Dev server up: `bun run dev` (Vite at localhost:1420 + `hifi-serve-plugin` exposes `/dev/hifi/**` and `/dev/canonical/**`).
2. `public/fonts/inter/Inter-Variable.woff2` present (W5a polish-pass — already in repo).
3. `public/vendor/lucide-sprite.svg` present (W5a polish-pass — already in repo).

**Generate baselines (first run):**

```sh
bun run test:visual --update-snapshots
```

Writes `<primitive>-mockup.png` + `<primitive>-impl.png` to `tests/snapshots/cluster-11/` under per-test fixture dirs. Commit baselines.

**Verify diff (regression):**

```sh
bun run test:visual
```

Fails if any primitive's impl differs from baseline above 0.1%. On failure, Playwright writes `<primitive>-impl-actual.png` + `<primitive>-impl-diff.png` next to the baseline.

**Update baselines after intentional change:**

```sh
bun run test:visual --update-snapshots
```

---

## Per-primitive written diffs

Per IMPLEMENTATION_PROMPT.md §5 + §12 DoD: each primitive ships with a written diff document at `<primitive>-diff.md` showing zero discrepancies between mockup-extracted spec and Vue impl. Cluster 11 consolidates these in:

  `docs/execution-phase/cluster-audits/cluster-11-primitive-diffs.md`

Per-property values cited from `docs/execution-phase/cluster-audits/cluster-11-tokens-used.md`. Vue impl line numbers reference `src/components/ui/<Primitive>.vue` + the lifted canonical CSS in `design-system/canonical/kova-hifi.css`.

---

## Visual-diff fixture (already shipped W5a)

- `tests/visual-diff/playwright.config.ts` — 1440×900, dark colorScheme, 0.5% screen / 0.1% component thresholds (component override via spec `toHaveScreenshot` opts).
- `tests/visual-diff/fixtures/ci-deterministic.ts` — reroutes Inter + Lucide CDN to local files; disables animations + transitions; tags `<html class="ci">` so mockups neutralize hover state.
- `src/dev/hifi-serve-plugin.ts` — exposes `/dev/hifi/**` and `/dev/canonical/**` from Vite (dev-only).

---

## Carryovers per cluster-11-audit.md §1.6a

- **C-1** zero raw Unicode glyphs in shipping SFCs. Verified in Cluster11Showcase + per-primitive SFCs. Phase 5 CI grep gate (Task 11.x) flags regressions.
- **C-2** 3-screenshot PR artifact per primitive. Generated by Playwright on visual-diff run (mockup / impl / diff PNGs).
- **C-3** accent-soft / accent-2 rgba-vs-flat-hex drift — deferred founder decision.
- **C-4** /dev/tokens curates 10 of 22 positional offsets — not a bug.
