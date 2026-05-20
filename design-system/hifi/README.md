# Kova hi-fi mockups — in-repo (CI-reachable)

> **Status:** canonical visual-diff target as of 2026-05-20. Per `docs/execution-phase/claude-design-files/IMPLEMENTATION_PROMPT.md` Mandate 23, every visual-diff gate, every per-screen written diff, every reviewer comparison MUST diff against the in-repo copies under this directory — NOT the outer-repo `main-main-kova-scope/{batch-a,batch-a-additions,batch-b}/...` paths.
>
> Outer-repo paths are historical reference only. CI cannot reach them.

## Authority chain

`docs/execution-phase/claude-design-files/IMPLEMENTATION_PROMPT.md` §2 — when sources conflict, higher wins:

1. `design-system/design.md` (in outer repo `main-main-kova-scope/design-system/`).
2. `canvas-chrome/Kova Canvas - Final.html` (this directory, canonical reference implementation).
3. `design-system/TOKEN_CANONICAL.md` (outer repo).
4. `design-system/kova-hifi.css` / `kova-hifi-light.css` (outer repo).
5. **The hi-fi HTML mockups under THIS directory** — diff target for Playwright visual-diff.
6. Impl plan (`docs/kova-final-impl-plans/NN-*.md`).
7. PRD (`docs/kova-final-prds/NN-*.md`).

## Cluster → file mapping

Each cluster directory holds the hi-fi mockups that ship the surfaces in that cluster's PRD + impl plan.

```
auth/                       — Cluster 01 (auth surfaces, light + dark)
  Kova Hi-Fi A15 Auth - Light.html
  Kova Hi-Fi B4 Auth Errors - Light.html
  Kova Hi-Fi B4 Session Expired - Dark.html
  Kova Hi-Fi B5 Email Change Landing - Light.html
  Kova Hi-Fi B6 Mobile Fallback - Light.html

onboarding/                 — Cluster 02a (onboarding + canvas-creation transition)
  Kova Hi-Fi A1 Onboarding - Dark.html
  Kova Hi-Fi B11 Canvas Creation Transition - Dark.html

dashboard/                  — Cluster 02 (Brand Dashboard + canvas nav)
  Kova Hi-Fi 03 Brand Dashboard - Dark.html
  Kova Hi-Fi A11+A12+A13+A_canvas_nav - Dark.html

brand-mgmt/                 — Cluster 03 (Brand picker, new brand, Brands page)
  Kova Hi-Fi A2+A3 Brand picker & New brand - Dark.html
  Kova Hi-Fi B12 Brands page - Dark.html

account-stripe/             — Cluster 04 (Account page + Stripe returns)
  Kova Hi-Fi A7 Account Page - Dark.html
  Kova Hi-Fi B10 Stripe Returns - Dark.html

brand-kit/                  — Cluster 05 (Brand kit modals; B3 Brand Kit CRUD subset)
  Kova Hi-Fi A4+A9+A10 Modals - Dark.html

canvas-chrome/              — Cluster 07 (canvas top chrome + overlays; canonical reference)
  Kova Canvas - Final.html                  ← canonical visual reference
  Kova Hi-Fi 08 Top Chrome Menus - Dark.html
  Kova Hi-Fi 09 Canvas Overlays - Dark.html

canvas-engine/              — Cluster 07a (left panel, inspector, color picker, find overlay)
  chunk-b3/Kova Hi-Fi 10 Left Panel - Dark.html
  chunk-b4/Kova Hi-Fi 11 Inspector - Dark.html
  chunk-b5/Kova Hi-Fi 12 Color Picker - Dark.html
  chunk-b1/Kova Hi-Fi 14 Find Overlay - Dark.html

canvas-menus/               — Cluster 08 (popovers, Command-K, dialogs)
  chunk-b1/Kova Hi-Fi 13 Canvas Popovers - Dark.html
  Kova Hi-Fi A5 Command-K - Dark.html
  Kova Hi-Fi A6+A2a Popovers + A8 Dialogs - Dark.html

version-history/            — Cluster 09 (version history + trash confirm)
  chunk-b6/Kova Hi-Fi 17 Version History - Dark.html
  chunk-b2/Kova Hi-Fi 15 Trash Confirm - Dark.html

states/                     — Cluster 10 (loading skeletons, upload states, empty/search, toasts)
  Kova Hi-Fi B7 Loading Skeletons - Dark.html
  Kova Hi-Fi B8 Upload States - Dark.html
  Kova Hi-Fi B9 List Search Empty - Dark.html
  chunk-b2/Kova Hi-Fi 16 Toasts + Missing Fonts - Dark.html

ai-chat/                    — Cluster 06 (no dedicated hi-fi — see below)
foundation/                 — Cluster 11 primitives (no dedicated hi-fi — see below)
settings/                   — subset of Account page (cross-reference)
```

## Clusters without a dedicated hi-fi mockup

Per IMPLEMENTATION_PROMPT.md §5 last paragraph: for each primitive that does NOT have a dedicated hi-fi mockup of its own, extract its spec from a screen hi-fi that uses it. Build the primitive to match THOSE pixel-for-pixel. Showcase = stitched examples from real screens.

### `foundation/` (Cluster 11 primitives — no own hi-fi)

| Primitive | Spec lives in |
|---|---|
| `KovaIcon` | Every screen mockup. Canonical reference: `canvas-chrome/Kova Canvas - Final.html` (toolbar, topbar, sidebar icons). |
| `KovaToast` | `states/chunk-b2/Kova Hi-Fi 16 Toasts + Missing Fonts - Dark.html` (`.toast` element). Cross-reference: `onboarding/Kova Hi-Fi B11 Canvas Creation Transition - Dark.html` toast row. |
| `KovaModal` | `auth/Kova Hi-Fi B4 Session Expired - Dark.html` (full-screen modal), `brand-mgmt/Kova Hi-Fi A2+A3 Brand picker & New brand - Dark.html` (brand-picker modal), `brand-kit/Kova Hi-Fi A4+A9+A10 Modals - Dark.html` (modal-stack). |
| `KovaPopover` | `canvas-menus/chunk-b1/Kova Hi-Fi 13 Canvas Popovers - Dark.html`, `canvas-menus/Kova Hi-Fi A6+A2a Popovers + A8 Dialogs - Dark.html`. |
| `KovaMenu` | `canvas-chrome/Kova Hi-Fi 08 Top Chrome Menus - Dark.html` (dropdown menus). |
| `KovaTooltip` | Implicit on every icon-only button. Spec from `canvas-chrome/Kova Canvas - Final.html` tooltips and `canvas-chrome/Kova Hi-Fi 09 Canvas Overlays - Dark.html`. |
| `KovaSkeleton` | `states/Kova Hi-Fi B7 Loading Skeletons - Dark.html` (canonical, including shimmer). |
| `KovaInput`, `KovaButton`, `KovaCheckbox`, `KovaSegmented` | `canvas-engine/chunk-b4/Kova Hi-Fi 11 Inspector - Dark.html` (densest concentration). Cross-reference: `account-stripe/Kova Hi-Fi A7 Account Page - Dark.html` for form inputs. |
| `KovaAvatar` | `dashboard/Kova Hi-Fi 03 Brand Dashboard - Dark.html` topbar, `dashboard/Kova Hi-Fi A11+A12+A13+A_canvas_nav - Dark.html`. |
| `KovaDialog` | `canvas-menus/Kova Hi-Fi A6+A2a Popovers + A8 Dialogs - Dark.html`, `version-history/chunk-b2/Kova Hi-Fi 15 Trash Confirm - Dark.html`. |

### `ai-chat/` (Cluster 06 — no own hi-fi, lives inside canvas-chrome)

AI chat surface is part of canvas chrome and is documented across:

- `canvas-chrome/Kova Canvas - Final.html` — Ask Kova drawer, chat composer, message bubbles in their real context (this is the canonical reference).
- `canvas-chrome/Kova Hi-Fi 09 Canvas Overlays - Dark.html` — chat invocation overlays.
- `canvas-menus/Kova Hi-Fi A5 Command-K - Dark.html` — Command-K integration with chat.

The AI chat impl plan (`docs/kova-final-impl-plans/06-ai-chat-plan.md`) cross-references these files. Do not "freestyle" the chat — extract the spec from these mockups.

### `settings/` (subset of Account page)

The settings UI in MVP is a tab/section of the Account page. Diff against `account-stripe/Kova Hi-Fi A7 Account Page - Dark.html`.

## CI determinism approach (Mandate 4)

**Do NOT edit the HTML files in this directory to bake fonts or icons inline.** The mockups preserve their original markup as historical fidelity targets. CI determinism is handled at Playwright gate-run-time via a fixture.

The fixture (`tests/visual-diff/fixtures/ci-deterministic.ts`):

1. Intercepts Google Fonts + Lucide CDN network requests and serves local copies from `public/fonts/inter/` and `public/vendor/lucide-sprite.svg`.
2. Disables animations + transitions via injected `<style>`.
3. Adds a `.ci` class to `<html>` so mockups that key hover-state CSS off `:not(.ci)` neutralize hover.
4. Awaits `document.fonts.ready` + `networkidle` before screenshot.

See `tests/visual-diff/playwright.config.ts` and `tests/visual-diff/example.visual.spec.ts`.

## Diff target convention

| Source | Use |
|---|---|
| `kova-open-pencil-1/design-system/hifi/<cluster>/<file>.html` (this dir) | **Diff target.** Version-controlled, CI-reachable. Every Playwright `toHaveScreenshot` baseline + per-screen written diff references THIS path. |
| `main-main-kova-scope/{batch-a,batch-a-additions,batch-b}/...` (outer repo) | **Historical reference only.** Preserve as the original delivery. Do NOT diff against these — CI cannot reach them. |

If the outer-repo file is updated (e.g. founder revision), re-copy into this directory. Do not edit the in-repo copies independently.

## File-naming convention

Filenames (with spaces) preserved verbatim from outer-repo deliveries. URL-encode when referencing in Playwright `goto()`:

```typescript
await ciPage.goto('/dev/hifi/states/chunk-b2/Kova%20Hi-Fi%2016%20Toasts%20%2B%20Missing%20Fonts%20-%20Dark.html?ci=1');
```

## Dev-server static-serve requirement (TODO)

The Vite dev server must serve this directory at the URL prefix `/dev/hifi/` so Playwright can `goto('/dev/hifi/<cluster>/<file>.html?ci=1')`. Currently NOT wired — see TODO in `tests/visual-diff/fixtures/ci-deterministic.ts`.

Provisional options (pick one when wiring):

- Symlink: `public/dev/hifi -> ../../design-system/hifi`. Vite serves `public/` at `/`.
- Vite plugin: add a `configureServer` hook that serves `design-system/hifi/**` at `/dev/hifi/`.
- Static middleware: wire into `apiPlugin()` (see `src/dev/api-plugin.ts`).
