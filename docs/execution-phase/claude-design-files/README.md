# Kova Scope — Hi-Fi Handoff (Reference Only — Plan Supersedes)

> **⚠️ STATUS (2026-05-20):** This file is NOT the authoritative agent instruction. The auto-generated bundle README that originally shipped with this folder is **superseded** by `docs/kova-final-impl-plans/NN-<cluster>-plan.md` (per Mandate 8 of the visual-fidelity contract — see `IMPLEMENTATION_PROMPT.md` §11).
>
> Reviewers: reject any PR where the agent followed THIS file's wording instead of the plan + `IMPLEMENTATION_PROMPT.md`.

> Single bundle covering the full Kova Scope product surface: auth, onboarding, brand dashboard, account, modals, popovers, error states, and the canvas editor (top chrome, left panel, inspector, color picker, popovers, overlays, find, trash, toasts, version history).

This handoff package is the **visual reference** for implementing Kova Scope. The canonical method for translating HTML → Vue 3 lives in `IMPLEMENTATION_PROMPT.md` (this folder). Read THAT file before writing any code.

---

## 1. About the design files — the 3-rule contract

The files in this bundle are **design references created in HTML/CSS**. They are prototypes showing the intended visual look and component composition.

Per the 3-rule fidelity contract (see `IMPLEMENTATION_PROMPT.md` §0):

> 1. **Visual values are copied.** Every color, spacing, type, radius, shadow, gap, padding, line-height, tracking, and proportion in the rendered output MUST match the mockup pixel-for-pixel.
> 2. **DOM structure is translated.** Compose markup via Vue 3 SFCs, Reka UI primitives, and the K* component layer from `design.md` §3. Do NOT copy the mockup's hand-rolled HTML structure.
> 3. **Behavior is engineered.** State lives in Pinia / refs / composables. Hover / focus / active / selected states are dynamic bindings, NEVER hardcoded classes.

**Trap phrase ban:** "copy DOM verbatim" is forbidden — it pulls hand-rolled HTML + inline `<style>` blocks + CDN scripts + hardcoded states into the codebase, defeating the component layer.

Target stack (per `design-system/TOKEN_CANONICAL.md` §6):

- **Vue 3** (Composition API, `<script setup>` SFCs)
- **Tailwind 4** (tokens injected via `@theme` in `app.css`, auto-generated utility classes)

### Critical rule

> **The HTML mockups are the visual source of truth for VALUES.** When a mockup value disagrees with a token already defined in the codebase, the mockup wins. Add new tokens via the drift protocol (`IMPLEMENTATION_PROMPT.md` §7) — do NOT silently round to nearby existing values.

### Authority chain (in case of any conflict)

1. `design-system/design.md` — the spec. Wins over everything.
2. `batch-b/Kova Canvas - Final.html` — the canonical component reference implementation.
3. `design-system/TOKEN_CANONICAL.md` — resolves naming across the three token vocabularies (short / long / scoped).
4. `design-system/kova-hifi.css` (+ `kova-hifi-light.css`) — the implementation tokens. Already reconciled against the spec.

If any disagreement surfaces during implementation: **design.md wins**, fix everything else to match.

---

## 2. Fidelity

**High-fidelity.** Every screen is pixel-final. Final colors, final typography, final spacing, final radii, final hairlines, final states. Implement them exactly. Do not "improve" the design, do not add animations the mockups don't show, do not embellish, do not substitute icons, do not adjust spacing for "breathing room."

The design system is **dark-mode-first**. The only intentional light-mode surfaces are the auth pages in `batch-a/light/` and `batch-a-additions/light/` (see §6 below).

---

## 3. How to use this bundle

Read in this order:

1. **`design-system/design.md`** — full design system. Foundations, semantic tokens, component patterns, density rules, bans, extension rules. Every visual decision in the product is justified here. **Read this end-to-end before writing code.**
2. **`design-system/TOKEN_CANONICAL.md`** — explains the three token vocabularies (short / long / scoped) and how to cite them. Critical for understanding how `--bg` vs `--page` vs `--color-bg` resolve.
3. **`design-system/kova-hifi.css`** — the canonical dark stylesheet. Class names are stable across every HTML file in this bundle. **Do not rename classes when porting** — they document the component vocabulary.
4. **`design-system/kova-hifi-light.css`** — the light variant. Used only by the auth pages.
5. **`batch-b/Kova Canvas - Final.html`** — the canonical reference implementation of every component (per `design.md` §7). When in doubt about a component's exact structure, open this file.
6. **The remaining HTML files** — surface-by-surface mockups. See the screen inventory in §6.

---

## 4. Design tokens (summary)

The full token list lives in `design-system/design.md` §1–§2 and `design-system/TOKEN_CANONICAL.md` §2. Quick reference:

### Surfaces
| Token (short) | Hex | Role |
|---|---|---|
| `--page` | `#1a1a1d` | Page + side panels + topbar + modal shells |
| `--bg` | `#242428` | Canvas plate (editor workspace) |
| `--fill` | `#26262b` | Input idle |
| `--fill-2` | `#303035` | Input active, segmented active |

### Lines (all 1px hairlines)
| Token | Hex | Role |
|---|---|---|
| `--line` | `#2c2c30` | Structural divider |
| `--line-2` | `#232327` | In-panel divider |

### Ink
| Token | Hex | Role |
|---|---|---|
| `--ink` | `#ebebee` | Primary text |
| `--ink-2` | `#a8a8ad` | Secondary text |
| `--ink-3` | `#6e6e73` | Labels, tertiary |
| `--ink-4` | `#4a4a4f` | Disabled, icon dim |

### Accent — exactly one
| Token | Hex | Role |
|---|---|---|
| `--accent` | `#3b82f6` | Selection, active tool, primary action |
| `--accent-soft` | `#1d3a66` (opaque) ≈ `rgba(59,130,246,0.14)` | Selected-row tint |
| `--accent-ink` | `#a9c4ff` | AI tool ink ("Ask Kova") |

**There is exactly one accent.** No purple "AI accent." No secondary accent. No gradient pairs. (`design.md` §5 ban 13.)

### Density
- `--h-control` 30px (default input) · `--h-control-sm` 28px (compact rows) · `--h-control-xs` 26px (segmented inner) · `--h-tool` 36px (toolbar) · `--h-icon-btn` 28px (topbar icon button) · `--h-topbar` 44px · `--h-tabs` 44px.

### Radii
- `--r-xs` 3px · `--r-sm` 4px · `--r-md` 5px · `--r-lg` 6px · `--r-xl` 7px · `--r-2xl` 10px · `--r-pill` 999px.
- **Side panels and full-bleed surfaces are NOT rounded.** Rounding lives on controls and floating elements.

### Spacing
- Scale: `2, 4, 6, 8, 10, 12, 14, 16, 20, 24, 32`. **No raw values outside this scale.**

### Typography
- **Inter only.** 400 / 500 / 600 / 700. Sizes from the `--t-*` scale in `design.md` §1.2 — do not invent new sizes.

---

## 5. Hard bans (do not violate)

Lifted verbatim from `design.md` §5 — these are non-negotiable:

1. No monospace on chrome. Inter only.
2. No emoji in product chrome.
3. No purple, lilac, or "AI purple." AI surfaces use `--accent` or `--accent-ink`.
4. **No left-border accent on selected rows.** Selection is a tinted background, period.
5. No gradient backgrounds anywhere on chrome.
6. No 2px borders on chrome. (The 2px accent outline on a selected frame is the only exception.)
7. No drop shadows on inputs, cards, or list rows. Elevation lives only on floating elements.
8. No font sizes outside the type scale.
9. No hex outside `:root`. Components reference semantic tokens.
10. No horizontal scroll for properties. Properties always stack vertically.
11. No icon-only buttons without a tooltip (`title` or `aria-label`).
12. No status colors until they're added to §1.1 of `design.md`. Status aliases (`--warn`, `--ok`, `--review`) currently degrade to neutral on purpose.
13. **No alternate accent.** There is one accent.
14. No rounded panels. Side panels and full-bleed surfaces are flat-edged.

---

## 6. Screen inventory

All files in this bundle. Group them by feature when implementing; the file numbering (A1–A15, B1–B12, 03–17) preserves the original design sequence.

### `batch-a/dark/` — onboarding, auth, dashboard, account, core modals
| File | Surface |
|---|---|
| `Kova Hi-Fi A1 Onboarding - Dark.html` | 6-step onboarding (welcome → verify → brand → Shopify → brand kit → splash) |
| `Kova Hi-Fi A2+A3 Brand picker & New brand - Dark.html` | Brand picker dropdown + new-brand creation flow |
| `Kova Hi-Fi 03 Brand Dashboard - Dark.html` | Per-brand dashboard (canvas list, file rows, metadata) |
| `Kova Hi-Fi A4+A9+A10 Modals - Dark.html` | Core modal patterns (confirm, destructive, settings) |
| `Kova Hi-Fi A5 Command-K - Dark.html` | Command palette overlay |
| `Kova Hi-Fi A6+A2a Popovers + A8 Dialogs - Dark.html` | Popover + dialog patterns |
| `Kova Hi-Fi A7 Account Page - Dark.html` | Account settings page |
| `Kova Hi-Fi A11+A12+A13+A_canvas_nav - Dark.html` | Canvas-level navigation patterns |
| `index-batch-a.html` | Internal index for batch-a (not a product surface) |

### `batch-a/light/` — light-mode surfaces (auth only)
| File | Surface |
|---|---|
| `Kova Hi-Fi A15 Auth - Light.html` | Auth (sign-in, sign-up, magic link) — light mode |

### `batch-a-additions/dark/` — empty/error/loading/transition states
| File | Surface |
|---|---|
| `Kova Hi-Fi B1 Toasts - Dark.html` *(in `batch-0/`)* | Toast notifications |
| `Kova Hi-Fi B2 Error Pages - Dark.html` *(in `batch-0/`)* | 404 / 500 / generic error pages |
| `Kova Hi-Fi B3 Brand Kit CRUD Modals - Dark.html` *(in `batch-0/`)* | Brand-kit CRUD modals |
| `Kova Hi-Fi B4 Session Expired - Dark.html` | Session expired state |
| `Kova Hi-Fi B7 Loading Skeletons - Dark.html` | Skeleton loaders |
| `Kova Hi-Fi B8 Upload States - Dark.html` | Upload pending/progress/error states |
| `Kova Hi-Fi B9 List Search Empty - Dark.html` | Empty-state for list search |
| `Kova Hi-Fi B10 Stripe Returns - Dark.html` | Stripe return / billing landing |
| `Kova Hi-Fi B11 Canvas Creation Transition - Dark.html` | Canvas creation loading/transition |
| `Kova Hi-Fi B12 Brands page - Dark.html` | Brands index page |

### `batch-a-additions/light/` — light-mode auth-adjacent
| File | Surface |
|---|---|
| `Kova Hi-Fi B4 Auth Errors - Light.html` | Auth error states (invalid link, etc.) |
| `Kova Hi-Fi B5 Email Change Landing - Light.html` | Email-change confirmation landing |
| `Kova Hi-Fi B6 Mobile Fallback - Light.html` | Mobile fallback page |

### `batch-b/` — the canvas editor
| File | Surface |
|---|---|
| **`Kova Canvas - Final.html`** | **Canonical reference implementation. Every component above lives here.** |
| `Kova Hi-Fi 08 Top Chrome Menus - Dark.html` | File / Edit / View / etc. top-chrome menus |
| `Kova Hi-Fi 09 Canvas Overlays - Dark.html` | Canvas overlay surfaces |
| `chunk-b1/Kova Hi-Fi 13 Canvas Popovers - Dark.html` | Canvas popovers |
| `chunk-b1/Kova Hi-Fi 14 Find Overlay - Dark.html` | Find / search overlay |
| `chunk-b2/Kova Hi-Fi 15 Trash Confirm - Dark.html` | Trash / delete confirmation |
| `chunk-b2/Kova Hi-Fi 16 Toasts + Missing Fonts - Dark.html` | Editor toasts + missing-font warnings |
| `chunk-b3/Kova Hi-Fi 10 Left Panel - Dark.html` | Left panel (pages, layers) |
| `chunk-b4/Kova Hi-Fi 11 Inspector - Dark.html` | Right inspector panel (properties) |
| `chunk-b5/Kova Hi-Fi 12 Color Picker - Dark.html` | Color picker popover |
| `chunk-b6/Kova Hi-Fi 17 Version History - Dark.html` | Version history side panel |

---

## 7. Component patterns

The full pattern library is in `design.md` §3. Implement these as Vue components and reuse aggressively. Names are taken from `design.md`:

- **Top bar** (§3.1) — `<KTopbar>` · 44px · `--page` bg · 1px `--line` bottom border
- **Side panel** (§3.2) — `<KSidePanel>` · 240px left / 264px right · flat-edged
- **Section header** (§3.3) — `<KSectionHeader>` · `--t-overline` · `--ink-3` · optional `+` action
- **List row** (§3.4) — `<KListRow>` · 28px · hover bg `--line-2` · **selected bg `--accent-soft`, never a left border**
- **Tabs** (§3.5) — `<KTabs>` · pill-style active, never underlined
- **Property group** (§3.6) — `<KPropertyGroup>` · stacks vertically, never horizontal
- **Input** (§3.7) — `<KInput>` · 30px · `--fill` bg · 1px transparent border, `--line` on hover
- **Segmented control** (§3.8) — `<KSegmented>` · `--fill` container · `--fill-2` active cell
- **Fill row** (§3.9) — `<KFillRow>` · 30px · swatch / hex / percent / eye / minus grid
- **Checkbox** (§3.10) — `<KCheckbox>` · 14×14 · `--accent` checked
- **Toolbar** (§3.11) — `<KToolbar>` · bottom-center floating · 36px tools · active = `--accent` solid fill
- **Zoom HUD** (§3.12) — `<KZoomHUD>` · bottom-right floating
- **Frame & selection** (§3.13) — 2px `--accent` outline, no offset; 9×9 selection handles
- **Floating help** (§3.14) — 28×28 pill, bottom-right
- **Avatar** (§3.15) — 26×26 pill (customer brand colors are data, not chrome)

When you build a Vue component, map its props to these exact roles. Do not invent new component variants without first checking `design.md` §6 ("Extending the system").

---

## 8. Implementation workflow (recommended)

1. **Set up tokens first.** Translate `design-system/kova-hifi.css` `:root` into your Tailwind 4 `@theme` block in `app.css`. Translate `kova-hifi-light.css` `:root` into the light-mode variant (auth only). **Token names should match the short names** (`--bg`, `--ink`, `--accent`) per `TOKEN_CANONICAL.md` §1.
2. **Set up Inter.** Inter 400/500/600/700 via Google Fonts or self-hosted. **No other fonts. No monospace.**
3. **Build the component layer.** Implement the components in §7 above as Vue SFCs. Each component should accept variants documented in `design.md` §3. Reuse stable class names from `kova-hifi.css` as Tailwind component classes (`@apply`) if useful, or as direct utility compositions.
4. **Build screens.** Implement one HTML file at a time. After each screen, open the HTML mockup and your Vue build side-by-side at the same viewport, and diff visually. Fix discrepancies before moving on.
5. **Audit against bans.** Before merging, check each screen against the 14 bans in §5 above. If any are violated, fix them.

---

## 9. What is NOT in scope

- **Motion tokens** — deferred (`design.md` §1.7). Do not invent transitions.
- **Status colors** (red/yellow/green) — deferred (`design.md` §5 ban 12). The `--warn` / `--ok` / `--review` aliases currently resolve to `--ink-2` on purpose. Do not "fix" this.
- **Light mode beyond auth** — deferred. Only the auth surfaces in `batch-a/light/` and `batch-a-additions/light/` use light mode.
- **The legacy `mono` class** is preserved as a no-op so old markup parses (renders in Inter). Do not reintroduce monospace on chrome.

When you encounter a surface that needs something the system doesn't yet have, follow `design.md` §6 — extend the system top-down (foundation → semantic token → component) and update the doc in the same change.

---

## 10. Files in this bundle

```
kova-all-hifi-files/
├── README.md                          ← this file
├── design-system/
│   ├── design.md                      ← system spec (read first)
│   ├── TOKEN_CANONICAL.md             ← token vocabulary resolution
│   ├── kova-hifi.css                  ← dark stylesheet (canonical)
│   └── kova-hifi-light.css            ← light stylesheet (auth only)
├── batch-a/
│   ├── dark/                          ← 8 dark surfaces + index
│   └── light/                         ← 1 auth surface (light)
├── batch-a-additions/
│   ├── dark/                          ← 7 dark state surfaces
│   │   └── batch-0/                   ← 3 dark state surfaces (toasts, errors, brand-kit modals)
│   └── light/                         ← 3 auth-adjacent light surfaces
└── batch-b/                           ← canvas editor (11 files)
    ├── Kova Canvas - Final.html       ← canonical reference impl
    ├── Kova Hi-Fi 08 Top Chrome Menus - Dark.html
    ├── Kova Hi-Fi 09 Canvas Overlays - Dark.html
    ├── chunk-b1/                      ← canvas popovers, find overlay
    ├── chunk-b2/                      ← trash confirm, editor toasts
    ├── chunk-b3/                      ← left panel
    ├── chunk-b4/                      ← inspector
    ├── chunk-b5/                      ← color picker
    └── chunk-b6/                      ← version history
```

---

## 11. TL;DR for the implementing agent

1. Read `design-system/design.md` end-to-end.
2. Read `design-system/TOKEN_CANONICAL.md`.
3. Set up tokens in `app.css` `@theme` block using the short names.
4. Implement components from `design.md` §3 as Vue SFCs. `batch-b/Kova Canvas - Final.html` is the canonical reference.
5. Implement screens one at a time, diffing each against the HTML mockup at the same viewport before moving on.
6. **Mockup wins** when in conflict with anything else.
7. **design.md wins** when in conflict with any other doc.
8. Never break the 14 bans (§5).
