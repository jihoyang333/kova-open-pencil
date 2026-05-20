# Kova Scope — Implementation Prompt

> **Copy this entire file as the kickoff message** to Claude Code (or any implementing agent) when you start the implementation session. It is written in imperative voice and tells the agent exactly what to do, in what order, with what guardrails, and what to deliver.

---

## Mission

Implement the Kova Scope hi-fi designs in this codebase with **pixel-level visual fidelity**. The target stack is **Vue 3 (Composition API, `<script setup>` SFCs) + Tailwind 4**. If the codebase uses a different stack, use the closest idiomatic equivalent — but the visual output must match the HTML mockups regardless of framework.

The HTML mockups in this bundle are the **visual source of truth**. You are translating them into the target codebase, not shipping them as-is.

---

## Required reading (do this before writing any code)

Read these files end-to-end, in this exact order. Do not skip, skim, or summarize prematurely:

1. **`README.md`** (this folder) — bundle overview, screen inventory, fidelity rules.
2. **`design-system/design.md`** — the system spec. This is the authoritative document. Every visual decision is justified here.
3. **`design-system/TOKEN_CANONICAL.md`** — explains the three token vocabularies (short / long / scoped) and how they resolve. Critical for understanding `--bg` vs `--page` vs `--color-bg`.
4. **`design-system/kova-hifi.css`** — the dark stylesheet. Class names here are stable across every HTML file. Preserve them.
5. **`design-system/kova-hifi-light.css`** — the light stylesheet (auth only).
6. **`batch-b/Kova Canvas - Final.html`** — the canonical component reference implementation. When in doubt about a component's exact structure, open this file.

Then read the target codebase:

7. **`src/components/`** (or the equivalent path) — inventory existing components.
8. **`tailwind.config.*` / `app.css` / any theme files** — inventory existing tokens.
9. **`package.json`** — confirm Vue version, Tailwind version, supporting libraries.

---

## Authority chain (use when anything conflicts)

If any two sources disagree, the higher one wins:

1. `design-system/design.md` — wins over everything
2. `batch-b/Kova Canvas - Final.html` — canonical reference implementation
3. `design-system/TOKEN_CANONICAL.md`
4. `design-system/kova-hifi.css` / `kova-hifi-light.css`
5. The other HTML mockups

If the codebase already has a token or component that disagrees with the mockup: **the mockup wins**. Add new tokens; do not silently round to nearby existing values.

---

## Phase 1 — Audit (read-only, no code yet)

Produce a markdown document called `KOVA_AUDIT.md` in the target repo. Do not write any other code or files. Include:

### 1.1 Token map
Every short token from `kova-hifi.css` `:root` mapped to its destination in the target repo's `@theme` block / Tailwind config. Use **short names** (`--bg`, `--ink`, `--accent`) per `TOKEN_CANONICAL.md` §1.

### 1.2 Existing component inventory
Every component in `src/components/` (or equivalent) with a one-line summary. Flag which ones might overlap with the Kova components from `design.md` §3.

### 1.3 Reuse decisions
For each Kova component (§3.1 through §3.15 in `design.md`):
- Can an existing codebase component be reused **exactly**? → Reuse.
- Does an existing component need a new variant prop to match? → Extend with new variant.
- Is there no equivalent? → Build new.

A component does NOT qualify for reuse if it differs in **any** visual property (color, spacing, radius, type, hover state, active state). "Close enough" is not close enough.

### 1.4 New tokens needed
List any mockup values that do not map cleanly to tokens. For each: proposed token name (short-style), proposed hex/value, where in the mockup it appears.

### 1.5 New components needed
List every component you'll build new, with the name from `design.md` §3 (e.g. `KFillRow`, `KSegmented`).

### 1.6 Open questions
List any ambiguities that need human input before you proceed.

**Stop after producing `KOVA_AUDIT.md`. Wait for human approval before Phase 2.**

---

## Phase 2 — Token + foundation setup

1. Translate `kova-hifi.css` `:root` into the target repo's `@theme` block in `app.css` (Tailwind 4) using **short names** as token identifiers. Token names must match `TOKEN_CANONICAL.md` §1 short-name column (`--bg`, `--page`, `--ink`, `--ink-2`, `--accent`, etc.).
2. Translate `kova-hifi-light.css` `:root` into a light-mode variant. The light variant applies **only to auth routes** — do not apply globally.
3. Install Inter (Google Fonts or self-hosted). Weights 400/500/600/700 only.
4. Add the type scale from `design.md` §1.2 as utility classes or `@apply`-able classes (`--t-overline`, `--t-label`, `--t-body`, `--t-body-strong`, `--t-title-sm`, `--t-title-md`, `--t-meta`).
5. Apply `-webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility;` globally.
6. Build a `/tokens` debug route showing every token swatch + type sample. Screenshot it. Confirm everything renders against the dark surface tokens.

**Stop after Phase 2. Show the token debug page screenshot. Wait for confirmation before Phase 3.**

---

## Phase 3 — Component layer

Build every component from `design.md` §3 as a Vue SFC. Use the naming convention `K<Name>` (e.g. `KTopbar`, `KSidePanel`, `KSectionHeader`, `KListRow`, `KTabs`, `KPropertyGroup`, `KInput`, `KSegmented`, `KFillRow`, `KCheckbox`, `KToolbar`, `KZoomHUD`, `KFrame`, `KFloatingHelp`, `KAvatar`).

### Per-component requirements
- Use `<script setup>` syntax with the Composition API.
- Type props with `defineProps<{}>()` and emits with `defineEmits<{}>()`.
- Prefer Tailwind utility classes. Use `@apply` only for stable, reusable component classes lifted from `kova-hifi.css`. Use scoped styles only as a last resort.
- Implement every state from `design.md` §3: idle, hover, active, focus, focus-visible, disabled, selected (where applicable).
- Preserve class names from `kova-hifi.css` where they aid clarity (`.btn`, `.btn.primary`, `.pill`, `.nav .item.active`, `.sidebar`, `.topbar`, `.field`, `.input` — see `design.md` §8).

### Component gallery
Build a `/components` route that renders every component with every variant + state, on the dark surface. Compare each section to `Kova Canvas - Final.html`. Iterate until pixel-match.

**Stop after Phase 3. Show the component gallery screenshot. Wait for confirmation before Phase 4.**

---

## Phase 4 — Screens

Implement screens in this order (smallest dependency footprint first):

1. **Light auth surfaces** (`batch-a/light/`, `batch-a-additions/light/`) — 4 screens. Validates the light variant.
2. **Auth + onboarding (dark)** — `Kova Hi-Fi A1 Onboarding`, error/expired/email-change states.
3. **Brand pages** — Brand picker, New brand, Brands page, Brand dashboard.
4. **Account + settings** — Account page.
5. **Global overlays** — Command-K, modals, popovers, dialogs, toasts.
6. **States** — loading skeletons, upload states, empty states, error pages, Stripe returns, canvas creation transition.
7. **Canvas editor** — Top chrome menus, Left panel, Inspector, Color picker, Canvas overlays, Canvas popovers, Find overlay, Trash confirm, Editor toasts, Version history. **`Kova Canvas - Final.html` is the canonical reference** — refer to it constantly.

### Per-screen workflow

For **every** screen, do this loop:

1. Open the mockup HTML in a browser.
2. Implement the Vue route.
3. Run the dev server. Open the Vue route at the **same viewport** as the mockup (the mockups use `width=1440`).
4. Take a screenshot of both.
5. Diff them. List every discrepancy in writing — spacing, color, radius, type weight, alignment, missing state.
6. Fix every discrepancy.
7. Re-screenshot. Re-diff.
8. Only when there are zero discrepancies, move to the next screen.

**Do not batch screens.** Implement-diff-fix-confirm for each one before starting the next. Batching defeats the fidelity loop.

---

## Hard rules (non-negotiable)

These are the 14 bans from `design.md` §5 restated as imperatives. Treat each as a build-breaking rule:

1. **Never use monospace on chrome.** Inter only. (User-document content like email mocks may use mono as content; the chrome around them cannot.)
2. **Never use emoji in product chrome.**
3. **Never use purple, lilac, or "AI purple."** AI surfaces use `--accent` or `--accent-ink` only.
4. **Never use a left-border accent on selected rows.** Selection is `--accent-soft` background. Period.
5. **Never use gradient backgrounds on chrome.**
6. **Never use 2px borders on chrome.** The 2px accent outline on selected frames is the only exception, and it's an outline, not a border.
7. **Never put drop shadows on inputs, cards, or list rows.** Elevation only on floating elements (toolbar, HUD).
8. **Never use font sizes outside the type scale.** No 13.5px, no 11.7px.
9. **Never write hex outside the `:root` / `@theme` block.** Components reference semantic tokens.
10. **Never use horizontal scroll for properties.** Properties stack vertically.
11. **Never ship an icon-only button without a tooltip** (`title` or `aria-label`).
12. **Never introduce status colors** until they're added to `design.md` §1.1. The `--warn` / `--ok` / `--review` aliases degrade to `--ink-2` on purpose.
13. **Never introduce a secondary accent.** There is one accent.
14. **Never round panels.** Side panels and full-bleed surfaces are flat-edged.

In addition:

15. **Never "improve" the design.** No animations not in the mockup. No copy changes. No icon substitutions. No spacing adjustments for "breathing room." If you think the design has a problem, flag it in a comment and implement the mockup as-is.
16. **Never silently round a value.** If the mockup says `padding: 14px` and your scale offers 12 or 16, add `14` to the spacing scale.
17. **Never reuse a component that doesn't match the mockup exactly.** Add a variant prop or build a new component.

---

## Framework conventions

- **Vue 3 SFCs**, `<script setup>` syntax, Composition API.
- **Typed props/emits:** `defineProps<{}>()`, `defineEmits<{}>()`.
- **Tailwind 4 utilities** preferred. `@apply` only for reusable component classes lifted from `kova-hifi.css`. Scoped styles as last resort.
- **Token names:** short names (`--bg`, `--ink`, `--accent`) — never long names (`--color-bg`) or scoped names (`--ink2`).
- **Routing:** Vue Router. Auth routes get the light variant; everything else dark.
- **Icons:** Lucide (the mockups use `lucide@0.469.0`). Do not swap icon libraries.
- **Fonts:** Inter only. Weights 400/500/600/700.
- **Accessibility:** every icon-only button needs `aria-label`. Every input needs an associated `<label>` or `aria-labelledby`. Focus-visible states must be implemented for keyboard nav.

---

## Deliverables (produce these at the end)

1. **All screens implemented** as Vue routes, matching the inventory in `README.md` §6.
2. **Component gallery** at `/components` showing every `K*` component in every state.
3. **Token debug page** at `/tokens` showing every token swatch + type sample.
4. **`KOVA_AUDIT.md`** (from Phase 1) with all decisions documented.
5. **`KOVA_TOKEN_DIFF.md`** — every new token added to `@theme`, with hex, name, and which mockup introduced the need.
6. **`KOVA_COMPONENT_DIFF.md`** — every new/modified component, with rationale.
7. **`KOVA_SCREENSHOTS/`** — side-by-side PNGs per screen (mockup vs implementation) at 1440px viewport.
8. **`KOVA_SELF_AUDIT.md`** — explicit pass/fail against each of the 14 bans + 3 extra rules above, per screen.

---

## Failure modes — things that quietly ruin fidelity

If you find yourself doing any of these, stop and reconsider:

- "I'll use `p-3` instead of `padding: 14px` because it's close" → **Wrong. Add `14` to the spacing scale.**
- "I'll reuse `<MyButton>` because it looks similar" → **Wrong. Check every visual property. If any differ, add a variant or build new.**
- "I'll add a hover scale animation for polish" → **Wrong. The mockup has no animation. Don't invent motion.**
- "Status pills feel dead in neutral, I'll add a subtle red tint" → **Wrong. Status is deferred. Leave it neutral.**
- "The brand accent looks too saturated, I'll pick a softer blue" → **Wrong. `#3b82f6` is the accent. Period.**
- "I'll use `gap-4` (16px) for the property group instead of 12px" → **Wrong. 12px is the rhythm. Match it.**
- "I'll consolidate the segmented control into a regular tab group, it's cleaner" → **Wrong. Segmented and tabs are different components.**
- "I'll add a subtle shadow to inputs for depth" → **Wrong. Ban 7.**
- "I'll use the existing `<Card>` with rounded corners" → **Wrong. Ban 14. Panels are flat.**
- "The mockup uses `monospace` for the version hash — I'll keep it" → **Check the context. If it's user-document content (rare), OK. If it's chrome, ban 1, use Inter.**
- "I'll skip the focus-visible state to save time" → **Wrong. Every interactive element gets focus-visible.**

---

## TL;DR

1. Read everything in the required-reading list before writing code.
2. Produce `KOVA_AUDIT.md`. Stop. Wait for approval.
3. Set up tokens. Stop. Show token debug page. Wait for approval.
4. Build component layer. Stop. Show component gallery. Wait for approval.
5. Implement screens one at a time with mockup-vs-implementation visual diff per screen.
6. Mockup wins. Design.md wins. Never round, never improve, never violate a ban.
7. Deliver: implemented screens + component gallery + token debug page + 4 audit docs + screenshots.

---

## Appendix A — Per-property extraction checklist (use during Phase 1 audit + every screen in Phase 4)

When you open a hi-fi HTML file to extract values, agents tend to skip whatever isn't explicitly named. This checklist makes "what to look for" exhaustive. For every component / surface / state, walk this list and record values in `KOVA_AUDIT.md` (Phase 1) or per-screen diff notes (Phase 4):

### A.1 Colors

- [ ] Background — fill, including any layered backgrounds
- [ ] Foreground / text color
- [ ] Border color
- [ ] Focus-ring color
- [ ] Hover background + foreground
- [ ] Active / pressed background + foreground
- [ ] Focus-visible state colors
- [ ] Selected state (rows, list items, segmented active)
- [ ] Disabled state colors
- [ ] Any tinted overlays (e.g., `--accent-soft` selected-row tint, `--ok-soft` confirm-medal)

### A.2 Typography

- [ ] `font-family` (Inter; flag anything else as a design-system bug)
- [ ] `font-size` — exact value, map to `--t-*` scale entry
- [ ] `font-weight` — must be one of 400 / 500 / 600 / 700
- [ ] `line-height` — exact value
- [ ] `letter-spacing` — including negative tracking
- [ ] `text-transform` (none / uppercase / etc.)
- [ ] `font-variant-numeric` — especially `tabular-nums` for numeric chrome (timestamps, counters, hex)
- [ ] `text-align`

### A.3 Spacing (exact px)

- [ ] `padding` per side (T / R / B / L) — not shorthand
- [ ] `margin` per side
- [ ] `gap` (flex + grid)
- [ ] Inter-item spacing (if not gap-based, e.g., absolute-positioned siblings)

### A.4 Sizing

- [ ] `width` (px / % / ch / fixed / auto)
- [ ] `height` (px / auto)
- [ ] `min-width` / `max-width`
- [ ] `min-height` / `max-height`
- [ ] Density tokens consumed (`--h-control`, `--h-control-sm`, `--h-control-xs`, `--h-tool`, `--h-icon-btn`, `--h-topbar`, `--h-tabs`)

### A.5 Border + radius

- [ ] `border-width` — including asymmetric (top/right/bottom/left)
- [ ] `border-style`
- [ ] `border-color`
- [ ] `border-radius` per corner if asymmetric (`border-top-left-radius` etc.)
- [ ] `outline` (1px accent outline on selected frames is the only 2px+ exception)

### A.6 Shadows

- [ ] Every `box-shadow` stack — multiple shadows can be layered
- [ ] Inner shadows (`inset`)
- [ ] Elevation shadows (`--shadow-elev-1/2/3`) used ONLY on floating elements (popovers, dropdowns)
- [ ] Confirm: inputs / cards / list rows carry NO shadow (per design.md §5 ban 7)

### A.7 Layout

- [ ] `display` (flex / grid / block / inline-block / inline-flex)
- [ ] `flex-direction`, `flex-wrap`
- [ ] `align-items`, `justify-content`, `align-self`, `justify-self`
- [ ] `grid-template-columns`, `grid-template-rows`, `grid-template-areas`
- [ ] `gap` (already covered in A.3 but verify both axes for grid)
- [ ] `position` (relative / absolute / fixed / sticky) + offsets (top/right/bottom/left)

### A.8 Motion

- [ ] `transition-duration` — must come from `design.md` §3 motion tokens (`--motion-fast`, `--motion-normal`, `--motion-slow`)
- [ ] `transition-timing-function` — canonical easings (`--ease-out`, `--ease-in-out`) only
- [ ] `transform` (translate, rotate, scale)
- [ ] `animation` — only the canonical shimmer animation on `<KovaSkeleton>`; nothing else without founder approval
- [ ] `prefers-reduced-motion` handling

### A.9 Interactive states (verify ALL applicable for every interactive element)

- [ ] idle
- [ ] hover
- [ ] active / pressed
- [ ] focus
- [ ] focus-visible (keyboard nav)
- [ ] disabled
- [ ] selected (rows, tabs, segmented cells)
- [ ] loading (where applicable)
- [ ] error (where applicable)

### A.10 Z-index + stacking

- [ ] Explicit `z-index` value
- [ ] Stacking context implications (`isolation: isolate`, `position` + `z-index`, `transform`)
- [ ] Canonical layers (per PRD 07b §3.4 z-index table for canvas overlays; per Cluster 11 for chrome overlays — toasts z-20, modal backdrop z-19, etc.)

### A.11 Accessibility (verify per interactive element)

- [ ] `aria-label` on every icon-only button
- [ ] `aria-labelledby` / `<label>` association on every input
- [ ] `role` overrides where the default doesn't fit
- [ ] Keyboard activation (Enter / Space / Esc / arrow keys per pattern)
- [ ] Focus order (tab-index, if non-default)

---

**How to use this checklist:**

- **Phase 1 (Audit):** for every component in `design.md` §3, walk the entire checklist and record values in `KOVA_AUDIT.md` under §1.1 (Token map) or §1.4 (New tokens needed).
- **Phase 4 (Per-screen loop):** for every screen, walk the checklist for every state of every component, comparing mockup vs Vue implementation. Any discrepancy = a write-up + a fix.
- **Diff document per screen:** record discrepancies in markdown with the file + property + mockup value + Vue value + planned fix. Save to `KOVA_SCREENSHOTS/<screen>-diff.md` alongside the screenshots.

This checklist is the operationalization of mini-masterclass point #3 ("token-extraction checklist"). Without it, agents silently miss values that aren't explicitly named in the prompt.
