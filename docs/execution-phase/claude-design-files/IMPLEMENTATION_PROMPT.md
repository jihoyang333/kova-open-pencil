# Kova Scope — Implementation Prompt (Canonical Visual-Fidelity Contract)

> **Status:** active. Rewritten 2026-05-20 after the W6 Cluster 11 freestyle incident. This file is THE authoritative HTML → Vue translation method. Every impl plan + every execution prompt + MASTER + RIDER points at this file. **The impl plan IS the README of the handoff bundle.** Discard any auto-generated bundle README that contradicts this file.

> **Read this file end-to-end before touching any UI file.** No exceptions.

---

## 0. The contract is inverted

**The bundle README that ships with claude.ai/design exports tells the implementing agent to deprioritize visual fidelity** ("port to idiomatic, do not render 1:1, compose from existing components"). This bias is canonical across the Anthropic + community templates. Following it produces freestyle output that looks nothing like the hi-fi.

**Kova inverts that default.**

> **Hi-fi mockup HTML is the source of truth for visual VALUES. Tailwind utility selection, spacing, color, typography, radii, shadows, gap, padding, sizing, layout proportions, motion durations, easings, z-index, focus-ring colors — every visual value — MUST match the mockup pixel-for-pixel. Framework idioms (Vue 3 `<script setup>`, Reka UI primitives, Pinia stores, Composition API, typed `defineProps`/`defineEmits`) apply ONLY to MARKUP composition — NEVER to visual values.**

**MARKUP** = the elements + their composition (Vue components, slots, props, directives, control flow).
**VALUES** = every pixel-level + semantic-token decision the mockup expresses.

You may rewrite the markup. You may NOT rewrite the values.

### The 3-rule formulation (memorize this — it is the contract)

> 1. **Visual values are copied.** Every color, spacing, type, radius, shadow, gap, padding, line-height, tracking, and proportion in the rendered output MUST match the mockup pixel-for-pixel. Read them from the mockup, not from intuition.
> 2. **DOM structure is translated.** Compose the markup using Vue 3 SFCs, Reka UI primitives, and the K* component layer from `design.md` §3. Do NOT copy the mockup's hand-rolled HTML structure.
> 3. **Behavior is engineered.** State lives in Pinia stores / `ref()` / composables. Hover, focus, active, selected, disabled, loading, error states are dynamic bindings, NEVER hardcoded classes.

### The trap phrase to avoid

**"Copy DOM verbatim" is forbidden in this codebase's docs.** It is a trap phrase that sounds like fidelity insurance but is the opposite. Mockup HTML contains a mix of: (a) design values you want copied, (b) layout structure you want translated, and (c) static-prototype scaffolding (hardcoded class names, inline `<style>` blocks per file, Lucide CDN scripts, sample data, fixed widths for the 1440 viewport, hardcoded ARIA states) that you want REBUILT as Vue.

"Copy DOM verbatim" pulls all three into the codebase. Result: walls of static `<div class="kc-topbar"><div class="kc-topbar-inner">...</div></div>` that defeat the component layer; inline `<style>` blocks copy-pasted into SFCs; Reka UI primitives bypassed; Pinia stores never wire up; Tailwind 4 never gets used.

Use the 3-rule formulation above. Never the trap phrase.

If you find yourself thinking "I'll use `p-3` (12px) instead of the mockup's `padding: 14px` because the scale already has 12 and 16" — you are about to violate Rule 1. Stop. Re-read this section.

If you find yourself copy-pasting `<div class="kc-topbar"><div class="kc-topbar-inner">...</div></div>` chains into a Vue SFC — you are about to violate Rule 2. Stop. Use `<KTopbar>` from `design.md` §3.1.

If you find yourself hardcoding `class="row selected"` instead of `:class="{ selected: isSelected }"` — you are about to violate Rule 3. Stop. Wire it via Pinia or `ref()`.

---

## 1. Required reading (do this before writing any code)

Read these files end-to-end, in this exact order. Do not skip, skim, or summarize prematurely.

### Canonical specs
1. **`README.md`** (this folder) — bundle overview, screen inventory, fidelity rules.
2. **`design-system/design.md`** (canonical, in outer `main-main-kova-scope/design-system/` per `kova-open-pencil-1/design-system/MASTER.md` pointer) — system spec. Every visual decision is justified here.
3. **`design-system/TOKEN_CANONICAL.md`** — three token vocabularies (short / long / scoped). Critical for `--bg` vs `--page` vs `--color-bg` resolution.
4. **`design-system/kova-hifi.css`** — dark stylesheet. Class names stable across every HTML file. **Preserve them.**
5. **`design-system/kova-hifi-light.css`** — light stylesheet (auth pages ONLY).
6. **In-repo hi-fi mockups:** `kova-open-pencil-1/design-system/hifi/<cluster>/*.html` (the diff target. Version-controlled. CI-deterministic).

### Execution-phase canon
7. **`docs/execution-phase/MASTER-EXECUTION-GUIDE.md`** — wave order, pipeline, gates.
8. **`docs/execution-phase/DESIGN-SYSTEM-COMPLIANCE-RIDER.md`** — hard rules every UI agent follows.

### Plan + PRD (per cluster)
9. **`docs/kova-final-prds/NN-<name>.md`** — WHY + acceptance criteria.
10. **`docs/kova-final-impl-plans/NN-<name>-plan.md`** — HOW + task-by-task. **The plan IS the README** (per §11 below). It supersedes any auto-generated bundle README.

### Target codebase
11. **`src/components/`** — existing component inventory.
12. **`src/components/ui/`** — Cluster 11 primitives (`KovaIcon`, `KovaToast`, `KovaModal`, `KovaPopover`, `KovaMenu`, `KovaTooltip`, `KovaSkeleton`, etc.).
13. **`tailwind.config.*` / `src/app.css`** — `@theme` tokens.
14. **`package.json`** — confirm Vue version, Tailwind version, supporting libraries.

---

## 2. Authority chain (when sources conflict)

Higher wins:

1. `design-system/design.md` — wins over everything.
2. `batch-b/Kova Canvas - Final.html` (or its in-repo mirror at `design-system/hifi/canvas/Kova Canvas - Final.html`) — canonical reference implementation.
3. `design-system/TOKEN_CANONICAL.md`.
4. `design-system/kova-hifi.css` / `kova-hifi-light.css`.
5. The other hi-fi HTML mockups (in-repo `design-system/hifi/<cluster>/`).
6. The impl plan (`docs/kova-final-impl-plans/NN-*.md`).
7. The PRD (`docs/kova-final-prds/NN-*.md`).

**If the codebase already has a token, component, or utility class that disagrees with the mockup: THE MOCKUP WINS.** Add new tokens. Add new component variants. Do NOT silently round. Do NOT pick the nearest existing utility.

If a hi-fi file uses a value not present in `design-system/kova-hifi.css :root` — STOP. Apply the drift protocol (§7). Never resolve silently.

---

## 3. Phase 1 — Audit (read-only, no production code yet)

Produce two markdown documents in the target repo. **No other code, no Vue files, no migrations** until these two docs are written and the founder has approved.

### Output 1: `KOVA_AUDIT.md`

Lives at `kova-open-pencil-1/docs/execution-phase/cluster-audits/cluster-NN-audit.md`. Contains:

**§1.1 Token map** — every short token from `kova-hifi.css :root` mapped to destination in `src/app.css` `@theme` block. Use short names per `TOKEN_CANONICAL.md` §1.

**§1.2 Existing-component inventory** — every Vue component in `src/components/` (especially `src/components/ui/` Cluster 11 primitives) with a one-line summary. Flag overlaps with `design.md` §3 patterns.

**§1.3 Reuse decisions** — per Kova component in `design.md` §3:
- Existing component can be reused EXACTLY → Reuse.
- Existing needs a new variant prop to match the mockup → Extend with new variant.
- No equivalent → Build new.
- **A component does NOT qualify for reuse if it differs in ANY visual property** (color, spacing, radius, type, hover state, active state, focus-visible, disabled). Per Hard Rule #17.

**§1.4 New tokens needed** — every mockup value that doesn't map to an existing token. Per entry: proposed short-name, hex/value, mockup file + selector + line.

**§1.5 New components needed** — every component built new, with the §3 name from `design.md`.

**§1.6 Open questions** — every ambiguity that needs founder input. Route via `AskUserQuestion`.

### Output 2: `tokens-used.md` (NEW — mandatory pre-impl gate per Mandate 3)

Lives at `kova-open-pencil-1/docs/execution-phase/cluster-audits/cluster-NN-tokens-used.md`. **Before any Vue code is written**, walk every hi-fi file in this cluster's surface map and enumerate every visual value:

```markdown
# Cluster NN — Tokens Used

## Source files
- design-system/hifi/<cluster>/<file>.html
- (one row per mockup in this cluster)

## Colors
| Mockup file | Selector/Line | Hex | Maps to | Status |
|---|---|---|---|---|
| Kova Hi-Fi 03 Brand Dashboard - Dark.html | .topbar | #1a1a1d | --color-surface-panel | ✅ exists |
| ... | ... | ... | ... | ✅ / ⚠️ MISSING |

## Spacing (px exact)
| Mockup file | Selector/Line | Value | Maps to | Status |
|---|---|---|---|---|
| ... | .file-row | padding: 14px | --space-14 (scale) | ✅ on scale |
| ... | .greeting | margin-top: 23px | NOT ON SCALE | ⚠️ MISSING — founder decision |

## Typography
| Mockup file | Selector/Line | font-size/weight/line-height/tracking | Maps to | Status |
|---|---|---|---|---|
| ... | .file-name | 13/1.3/600/-0.005em | --t-title-sm | ✅ |

## Radii / Shadows / Density / Motion / Z-index
(same table format per category — per Appendix A.5 / A.6 / A.4 / A.8 / A.10)

## MISSING summary
List every ⚠️ MISSING row. For each, propose:
(a) extend kova-hifi.css :root with a new named token, OR
(b) update hi-fi HTML to use an existing token, OR
(c) keep literal as an exception with founder approval.

Route to founder via AskUserQuestion. Do NOT proceed to Phase 2 until every MISSING row is resolved.
```

**Stop after `KOVA_AUDIT.md` + `tokens-used.md`. Wait for founder approval. No Phase 2 until both docs are green.**

---

## 4. Phase 2 — Token + foundation setup

1. Translate `kova-hifi.css :root` into `src/app.css` `@theme` block (Tailwind 4) using short names. Token names must match `TOKEN_CANONICAL.md` §1 short-name column (`--bg`, `--page`, `--ink`, `--ink-2`, `--accent`, etc.).
2. Translate `kova-hifi-light.css :root` into a light-mode variant. Apply only to auth routes (`/auth/*`).
3. Install Inter (locally-hosted under `public/fonts/` — NOT Google Fonts CDN — for CI determinism per §10). Weights 400/500/600/700 only.
4. Add the type scale from `design.md` §1.2 as utility classes or `@apply`-able classes.
5. Apply `-webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility;` globally.
6. Build a `/dev/tokens` debug route showing every token swatch + type sample.
7. Pre-populate spec-offset tokens. Anywhere `design.md` §3 specifies a positional offset (e.g. toolbar `bottom: 22px`, zoom HUD `bottom: 22px; right: 22px`, floating-help `bottom-right`, etc.), define it as a named token (`--toolbar-bottom: 22px`, `--zoom-hud-bottom: 22px`, `--zoom-hud-right: 22px`, etc.) before the lint rule (§9) is flipped on. See `tokens-used.md` MISSING column.

**Stop. Screenshot `/dev/tokens`. Wait for founder approval before Phase 3.**

---

## 5. Phase 3 — Component layer (Cluster 11 primitives, then `K*` components)

Build every component from `design.md` §3 as a Vue SFC. Use the `K<Name>` naming convention (`KTopbar`, `KSidePanel`, `KSectionHeader`, `KListRow`, `KTabs`, `KPropertyGroup`, `KInput`, `KSegmented`, `KFillRow`, `KCheckbox`, `KToolbar`, `KZoomHUD`, `KFrame`, `KFloatingHelp`, `KAvatar`).

### Per-component requirements

- `<script setup lang="ts">`, Composition API.
- `defineProps<{}>()`, `defineEmits<{}>()`.
- Tailwind utility classes preferred. `@apply` only for reusable component classes lifted from `kova-hifi.css`.
- **No `<style>` / `<style scoped>` blocks** (per CLAUDE.md hard rule).
- Implement every state from `design.md` §3: idle / hover / active / focus / focus-visible / disabled / selected.
- Preserve class names from `kova-hifi.css` where they aid clarity (`.btn`, `.btn.primary`, `.pill`, `.nav .item.active`, `.sidebar`, `.topbar`, `.field`, `.input` — see `design.md` §8).

### Component gallery + cluster showcase

- Build `/dev/components` rendering every `K*` component in every variant + state on the dark surface.
- Build `/dev/cluster-NN` per-cluster showcase routes embedding each surface in the cluster.
- **For each primitive that does NOT have a dedicated hi-fi mockup of its own** (e.g. `KovaToast`, `KovaModal`, `KovaSkeleton`), extract the spec from a screen hi-fi that uses it. Example: `KovaToast` spec = the `.toast` element in `chunk-b2/Kova Hi-Fi 16 Toasts + Missing Fonts - Dark.html` AND `batch-a-additions/dark/Kova Hi-Fi B11 Canvas Creation Transition - Dark.html` toast row. Build the primitive to match THOSE pixel-for-pixel. Showcase = stitched examples from real screens.

**Stop after Phase 3. Run the visual-diff gate (§6) on the component gallery. Wait for founder approval before Phase 4.**

---

## 6. Phase 4 — Screens (per-screen diff loop)

Implement screens in this order (smallest dependency footprint first):

1. **Light auth surfaces** (`design-system/hifi/auth/light/`) — validates the light variant.
2. **Auth + onboarding (dark)** — onboarding, errors, expired, email-change.
3. **Brand pages** — Brand picker, New brand, Brands page, Brand dashboard.
4. **Account + settings** — Account page.
5. **Global overlays** — Command-K, modals, popovers, dialogs, toasts.
6. **States** — loading skeletons, upload states, empty states, error pages, Stripe returns, canvas creation transition.
7. **Canvas editor** — Top chrome, Left panel, Inspector, Color picker, Canvas overlays, Canvas popovers, Find overlay, Trash confirm, Editor toasts, Version history. **`design-system/hifi/canvas/Kova Canvas - Final.html` is the canonical reference.**

### Per-screen workflow (DO NOT BATCH)

For **every** screen, run this loop:

1. Open the mockup HTML in a browser at exactly `width=1440` viewport (the mockup's native viewport).
2. Implement the Vue route at `/dev/cluster-NN/<surface>`.
3. Open the Vue route at the same 1440px viewport.
4. Screenshot both.
5. Walk Appendix A per property. Diff visually. List every discrepancy in writing — spacing, color, radius, type weight, line-height, tracking, alignment, focus state, hover state, missing state. Save the diff list to `tests/snapshots/cluster-NN/<surface>-diff.md`.
6. Fix every discrepancy.
7. Re-screenshot. Re-diff. Repeat until zero discrepancies.
8. Run the visual-diff gate (next section). Must pass.
9. Only when both the written diff AND the automated visual-diff are clean, move to the next screen.

**Batching defeats the loop.** One screen at a time. No exceptions.

### Visual-diff gate (Mandate 4 — automated)

Two thresholds, per Claude Design's adjusted recommendation:

- **Per-component diff** (against component gallery on `/dev/components`): **≤ 0.1% pixel ratio.** This is achievable because primitives are tightly scoped.
- **Per-screen diff** (against full hi-fi mockup): **≤ 0.5% pixel ratio.** Loose enough to absorb sub-pixel anti-aliasing differences between mockup font rendering and Vue build rendering, tight enough to catch real drift. **4× stricter than the legacy 2% threshold.**

Playwright config (see `tests/visual-diff/playwright.config.ts`):

```typescript
expect.toHaveScreenshot({
  maxDiffPixelRatio: 0.005,  // 0.5% screen-level (0.001 for components)
  threshold: 0.2,             // per-pixel color tolerance — ignores anti-aliasing noise
  animations: 'disabled',
  mask: [
    // Mask volatile regions (avatars with random colors, timestamps, focus rings on body)
    page.locator('[data-test-volatile="avatar"]'),
    page.locator('[data-test-volatile="timestamp"]'),
    page.locator(':focus-visible'),
  ],
});
```

Run via `bun run test:visual` (or `bunx playwright test --project=visual-diff`).

If the gate fails:
- > 0.5% on screen → STOP. Investigate. Fix. Re-run.
- Do NOT loosen the threshold. Do NOT add masks for non-volatile regions. Do NOT skip the failing screen.

### PR artifact (Mandate 5 — mandatory)

Every PR that touches a UI surface MUST include in the PR description:

```markdown
## Visual fidelity

| Surface | Mockup | Impl | Diff |
|---|---|---|---|
| Dashboard greeting | ![mockup](./screenshots/cluster-02/dashboard-mockup.png) | ![impl](./screenshots/cluster-02/dashboard-impl.png) | ![diff](./screenshots/cluster-02/dashboard-diff.png) |
| (one row per surface in the PR) | | | |
```

Screenshots committed under `tests/snapshots/cluster-NN/<surface>-{mockup,impl,diff}.png`. **No merge without all three per surface.**

---

## 7. Drift protocol (when mockup value is not in the design system)

If a hi-fi HTML file uses a CSS value (color / spacing / radius / shadow / font-size / motion-duration / z-index) that is NOT present in `kova-hifi.css :root` and NOT on the canonical scale (`design.md` §1.3 / §1.4 / §1.5 / §1.6 / §1.7) — STOP.

This is hi-fi-vs-design-system drift.

**Do this:**

1. Log the entry as ⚠️ MISSING in `tokens-used.md`.
2. Open `AskUserQuestion` with the founder. Present three options:
   - **(a) Extend the system:** add a new named token to `kova-hifi.css :root` + `TOKEN_CANONICAL.md`. Update `design.md` if a new role is needed (per §6 extension protocol).
   - **(b) Update the hi-fi:** edit the mockup HTML to use an existing token. Re-screenshot.
   - **(c) Keep the literal:** apply a `/* token-exempt: <justification> */` override comment in the Vue file (see lint rule §9). Requires founder approval.
3. Document the decision in `tokens-used.md` with the founder's response.
4. Do NOT silently round to the nearest existing token. Do NOT silently use the literal without the exemption comment. **No silent resolution.**

---

## 8. Hard rules (NON-NEGOTIABLE — extends `design.md` §5 bans)

### 8.1 The 14 bans from `design.md` §5 (restated as imperatives)

1. **Never use monospace on chrome.** Inter only.
2. **Never use emoji in product chrome.**
3. **Never use purple, lilac, or "AI purple."** AI surfaces use `--accent` or `--accent-ink`.
4. **Never use a left-border accent on selected rows.** Selection is `--accent-soft` background. Period.
5. **Never use gradient backgrounds on chrome.**
6. **Never use 2px borders on chrome.** The 2px accent outline on selected frames is the only exception (outline, not border).
7. **Never put drop shadows on inputs, cards, or list rows.** Elevation only on floating elements (toolbar, HUD).
8. **Never use font sizes outside the type scale.** No 13.5px, no 11.7px.
9. **Never write hex outside the `:root` / `@theme` block.** Components reference semantic tokens.
10. **Never use horizontal scroll for properties.** Properties stack vertically.
11. **Never ship an icon-only button without a tooltip** (`title` or `aria-label`).
12. **Never introduce status colors** until they're added to `design.md` §1.1.
13. **Never introduce a secondary accent.** There is one accent.
14. **Never round panels.** Side panels and full-bleed surfaces are flat-edged.

### 8.2 Three additional rules

15. **Never "improve" the design.** No motion not in the mockup. No copy changes. No icon substitutions. No spacing adjustments for "breathing room." If you think the design has a problem, flag it via `AskUserQuestion` and implement the mockup as-is.
16. **Never silently round a value.** Drift protocol §7.
17. **Never reuse a component that doesn't match the mockup exactly.** Add a variant prop or build a new component.

### 8.3 NEW — fidelity-contract rules (Mandates 1-8 — added 2026-05-20)

18. **MARKUP vs VALUES is the line.** You may rewrite markup. You may NOT rewrite values. (§0 above.)
19. **`tokens-used.md` is a pre-impl gate.** No Vue code until that doc is green + founder-approved. (§3.)
20. **Visual-diff thresholds are 0.1% component / 0.5% screen.** Not 2%. Not "close enough." (§6.)
21. **PR includes 3 screenshots per surface** (mockup / impl / diff). No merge without. (§6.)
22. **The plan IS the README.** Discard auto-generated bundle README on import — superseded by `docs/kova-final-impl-plans/NN-<name>-plan.md`. (§11.)
23. **Hi-fi mockups live in-repo** at `kova-open-pencil-1/design-system/hifi/<cluster>/`. Outer paths (`main-main-kova-scope/`) are historical reference only — diff against the in-repo copy.

---

## 9. Lint rule — block raw hex + raw px outside `design-system/`

Mandate 6. Enforced via custom oxlint rule (see `scripts/lint/no-raw-visual-values.ts`).

**Block patterns:**
- `#[0-9a-fA-F]{3,8}` (raw hex color literals)
- `\b\d+(\.\d+)?px\b` (raw pixel values)

**Scope (where the rule fires):**
- `<style>` / `<style scoped>` blocks in `.vue` files (these are banned anyway, but the lint catches drift if someone reintroduces).
- `class=` attribute values in `.vue` templates that contain inline class-string composition where the string includes a hex or px.
- Tailwind arbitrary-value classes like `bg-[#3b82f6]` or `p-[14px]` (these should use the named theme token instead).

**Out-of-scope (where the rule does NOT fire — these are intrinsic, not stylistic):**
- SVG attributes: `stroke-width="1.5"`, `viewBox="0 0 24 24"`, `cx="12"`, `cy="12"`, `r="10"`.
- CSS transform geometric values: `translate(-50%, -50%)`, `rotate(45deg)`, `scale(1.2)`.
- Z-index numeric values (z-index is numeric not stylistic; uses semantic z-scale per `design.md`).
- Files under `design-system/` (the source of tokens themselves).

**Override comment (escape valve):** prepend `/* token-exempt: <one-line justification> */` to the line. Lint passes. Requires founder approval (recorded in `tokens-used.md`).

**Rollout:** warn for one week post-introduction, then flip to error. Run via `bun run check`.

---

## 10. CI determinism prerequisite (Structural — blocks Mandate 4 if skipped)

The Playwright visual-diff gate is meaningless if the mockup renders non-deterministically in CI. Before turning on the gate:

1. **Bake fonts locally.** Copy Inter weights 400/500/600/700 into `public/fonts/inter/`. Remove all Google Fonts `@import` / `<link>` references from `design-system/hifi/<cluster>/*.html`. Reference via `@font-face` with local URLs.
2. **Bake icons locally.** Lucide icons in mockups currently load via CDN `<script src="https://unpkg.com/lucide@..."></script>`. Replace with inline SVG (Lucide ships as standalone SVG files) or a single self-hosted bundle at `public/vendor/lucide-icons.svg` (SVG sprite).
3. **Disable hover-dependent CSS for baseline.** Add a `?ci=1` query handler to every mockup that wraps hover-state CSS in `body:not(.ci) .selector:hover { ... }`. The CI baseline renders with `?ci=1` appended; reviewers can still preview hover states by removing it.
4. **Await `document.fonts.ready` before screenshot.** Playwright config sets:
   ```typescript
   await page.evaluate(() => document.fonts.ready);
   await page.waitForLoadState('networkidle');
   ```
5. **Disable animations globally for CI.** Add `* { animation-duration: 0s !important; transition-duration: 0s !important; }` injected via Playwright `addStyleTag` at gate-run time.
6. **Mask volatile regions** via `data-test-volatile="avatar|timestamp|focus-ring|cursor"` attributes on the mockup + Vue impl (same selectors both sides).

**Without these six steps the gate flakes constantly and the team learns to ignore it.** Worse than no gate.

---

## 11. The impl plan IS the README (Mandate 8)

Claude Design's export bundle ships a default `README.md` that explicitly tells the implementing agent to "compose from existing components, do not render 1:1." **Discard that README on import.**

The authoritative README for any Kova cluster handoff is:

```
docs/kova-final-impl-plans/NN-<cluster>-plan.md
```

The impl plan:
- Names the cluster + the surfaces it ships.
- References the in-repo hi-fi paths under `design-system/hifi/<cluster>/`.
- Points at this `IMPLEMENTATION_PROMPT.md` for the canonical method.
- Includes the surface-by-surface mapping table (Plan task → hi-fi file → scene ID).
- Includes the Definition-of-Done checklist (§12).

If the auto-generated bundle README is committed alongside the plan, the plan supersedes it. Reviewers should reject any PR where the agent followed the bundle README instead of the plan.

---

## 12. Definition of Done (per UI surface — Mandate 7)

Every surface in a cluster ships only when ALL of:

- [ ] `KOVA_AUDIT.md` includes this surface under §1.1 / §1.3 / §1.5.
- [ ] `tokens-used.md` has zero ⚠️ MISSING rows for this surface (all resolved per drift protocol §7).
- [ ] Per-screen written diff document at `tests/snapshots/cluster-NN/<surface>-diff.md` is empty (no remaining discrepancies).
- [ ] Per-component visual-diff ≤ 0.1% for every primitive used.
- [ ] Per-screen visual-diff ≤ 0.5%.
- [ ] PR description includes 3-screenshot row (mockup / impl / diff) for this surface.
- [ ] No raw hex / raw px in any Vue file touched (lint passes).
- [ ] Every token used exists in `design-system/kova-hifi.css :root` AND `TOKEN_CANONICAL.md`.
- [ ] `bun run check` green (oxlint type-aware).
- [ ] `bun run test:unit` green for new tests.
- [ ] `bun run test:visual` green.
- [ ] `bun run build` succeeds.
- [ ] `superpowers:code-reviewer` reports zero CRITICAL/HIGH on this surface.
- [ ] Founder browser smoke-test of `/dev/cluster-NN/<surface>` route.

---

## 13. Framework conventions

- **Vue 3 SFCs**, `<script setup>` syntax, Composition API.
- **Typed props/emits:** `defineProps<{}>()`, `defineEmits<{}>()`.
- **Tailwind 4 utilities** preferred. `@apply` only for reusable component classes lifted from `kova-hifi.css`.
- **No `<style>` / `<style scoped>` blocks** in Vue SFCs (CLAUDE.md hard rule).
- **Token names:** short names (`--bg`, `--ink`, `--accent`) — never long names (`--color-bg`) or scoped names (`--ink2`).
- **Routing:** Vue Router. Auth routes get the light variant; everything else dark.
- **Icons:** `<KovaIcon name="...">` (Cluster 11). NEVER `<icon-lucide-*>`, `i-lucide-*`, `<Icon name="lucide:...">`, inline SVG, or Unicode glyphs.
- **Fonts:** Inter only. Weights 400/500/600/700.
- **Accessibility:** every icon-only button gets `aria-label`. Every input gets associated `<label>` or `aria-labelledby`. Focus-visible implemented for keyboard nav.
- **Randomness:** `crypto.getRandomValues()` only. Never `Math.random()`.

---

## 14. Deliverables (per cluster)

1. **All Plan tasks committed** as per-task atomic commits.
2. **All screens implemented** as Vue routes under `/dev/cluster-NN/<surface>` + production routes per Plan.
3. **Component gallery** at `/dev/components` showing every `K*` component in every state.
4. **Token debug page** at `/dev/tokens` showing every token swatch + type sample.
5. **`KOVA_AUDIT.md`** (Phase 1 output).
6. **`tokens-used.md`** (Phase 1 output, gated).
7. **`KOVA_TOKEN_DIFF.md`** — every new token added to `@theme`, with hex, name, mockup origin.
8. **`KOVA_COMPONENT_DIFF.md`** — every new/modified component, with rationale.
9. **`KOVA_SCREENSHOTS/cluster-NN/`** — per-surface mockup + impl + diff PNGs at 1440px viewport.
10. **`KOVA_SELF_AUDIT.md`** — explicit pass/fail against each of the 14 bans + 3 extras + Mandates 1-8, per surface.

---

## 15. Failure modes — things that quietly ruin fidelity

If you find yourself doing any of these, STOP and re-read §0 + §6.

- "I'll use `p-3` (12px) instead of `padding: 14px` because it's close" → **Wrong. 14 is on the scale. Use it. If not on the scale, drift protocol §7.**
- "I'll reuse `<MyButton>` because it looks similar" → **Wrong. Check every visual property per Appendix A.**
- "I'll add a hover scale animation for polish" → **Wrong. The mockup has no animation. Don't invent motion.**
- "Status pills feel dead in neutral, I'll add a subtle red tint" → **Wrong. Status is deferred. Leave it neutral.**
- "The brand accent looks too saturated, I'll pick a softer blue" → **Wrong. `#3b82f6` is the accent.**
- "I'll use `gap-4` (16px) for the property group instead of 12px" → **Wrong. 12px is the rhythm. Match.**
- "I'll consolidate the segmented control into a regular tab group, it's cleaner" → **Wrong. Different components.**
- "I'll add a subtle shadow to inputs for depth" → **Wrong. Ban 7.**
- "I'll use the existing `<Card>` with rounded corners" → **Wrong. Ban 14.**
- "I'll skip the focus-visible state to save time" → **Wrong. Every interactive element gets focus-visible.**
- "The plan doesn't say how to handle X, the bundle README says to use the existing component — I'll trust the README" → **Wrong. Plan supersedes bundle README. Ask via AskUserQuestion.**
- "The visual-diff failed at 0.6% but it looks fine — I'll loosen the threshold to 1%" → **Wrong. Investigate the 0.1% of drift. Fix it. Threshold stays.**
- "I'll skip the per-screen written diff doc, the automated diff is enough" → **Wrong. The written diff catches semantic drift the automated diff misses (e.g., wrong icon, wrong placeholder copy).**
- "Cluster 11 primitives don't have their own hi-fi mockup, I'll freestyle the showcase" → **Wrong. Extract each primitive's spec from screen hi-fi that uses it (§5 last paragraph).**

---

## 16. TL;DR

1. Read everything in §1 before writing code.
2. Produce `KOVA_AUDIT.md` + `tokens-used.md`. Stop. Wait for approval. (Phase 1.)
3. Set up tokens. Stop. Show `/dev/tokens`. Wait for approval. (Phase 2.)
4. Build component layer. Stop. Show `/dev/components`. Run visual-diff gate. Wait for approval. (Phase 3.)
5. Implement screens ONE AT A TIME with mockup-vs-impl written diff + visual-diff gate per screen. (Phase 4.)
6. Mockup wins. design.md wins. Never round, never improve, never violate a ban.
7. PR includes 3-screenshot artifact per surface.
8. Deliver: implemented screens + component gallery + token debug + 4 audit docs + screenshots.

---

## Appendix A — Per-property extraction checklist

Use during Phase 1 audit + every screen in Phase 4. Walk this list per component / surface / state. Record values in `KOVA_AUDIT.md` (Phase 1) or `tests/snapshots/cluster-NN/<surface>-diff.md` (Phase 4).

### A.1 Colors

- [ ] Background — fill, including layered backgrounds
- [ ] Foreground / text color
- [ ] Border color
- [ ] Focus-ring color
- [ ] Hover background + foreground
- [ ] Active / pressed background + foreground
- [ ] Focus-visible state colors
- [ ] Selected state (rows, list items, segmented active)
- [ ] Disabled state colors
- [ ] Any tinted overlays (`--accent-soft` selected-row tint, etc.)

### A.2 Typography

- [ ] `font-family` (Inter; flag anything else as design-system bug)
- [ ] `font-size` — exact value, map to `--t-*` scale entry
- [ ] `font-weight` — must be 400 / 500 / 600 / 700
- [ ] `line-height` — exact value
- [ ] `letter-spacing` — including negative tracking
- [ ] `text-transform`
- [ ] `font-variant-numeric` — especially `tabular-nums` for numeric chrome
- [ ] `text-align`

### A.3 Spacing (exact px)

- [ ] `padding` per side (T / R / B / L) — not shorthand
- [ ] `margin` per side
- [ ] `gap` (flex + grid)
- [ ] Inter-item spacing (absolute-positioned siblings)

### A.4 Sizing

- [ ] `width` (px / % / ch / fixed / auto)
- [ ] `height` (px / auto)
- [ ] `min-width` / `max-width`
- [ ] `min-height` / `max-height`
- [ ] Density tokens consumed (`--h-control`, `--h-control-sm`, `--h-control-xs`, `--h-tool`, `--h-icon-btn`, `--h-topbar`, `--h-tabs`)

### A.5 Border + radius

- [ ] `border-width` — including asymmetric (T/R/B/L)
- [ ] `border-style`
- [ ] `border-color`
- [ ] `border-radius` per corner if asymmetric
- [ ] `outline` (1px accent outline on selected frames is the only 2px+ exception)

### A.6 Shadows

- [ ] Every `box-shadow` stack — multiple shadows can be layered
- [ ] Inner shadows (`inset`)
- [ ] Elevation shadows (`--shadow-elev-1/2/3`) used ONLY on floating elements
- [ ] Confirm: inputs / cards / list rows carry NO shadow (Ban 7)

### A.7 Layout

- [ ] `display` (flex / grid / block / inline-block / inline-flex)
- [ ] `flex-direction`, `flex-wrap`
- [ ] `align-items`, `justify-content`, `align-self`, `justify-self`
- [ ] `grid-template-columns`, `grid-template-rows`, `grid-template-areas`
- [ ] `gap` (already covered in A.3 — verify both axes for grid)
- [ ] `position` (relative / absolute / fixed / sticky) + offsets (T/R/B/L)

### A.8 Motion

- [ ] `transition-duration` — must come from `design.md` §3 motion tokens
- [ ] `transition-timing-function` — canonical easings only
- [ ] `transform` (translate, rotate, scale)
- [ ] `animation` — only canonical shimmer on `<KovaSkeleton>`; nothing else without founder approval
- [ ] `prefers-reduced-motion` handling

### A.9 Interactive states (verify ALL applicable per interactive element)

- [ ] idle
- [ ] hover
- [ ] active / pressed
- [ ] focus
- [ ] focus-visible (keyboard nav)
- [ ] disabled
- [ ] selected
- [ ] loading
- [ ] error

### A.10 Z-index + stacking

- [ ] Explicit `z-index` value (numeric, NOT in the lint-blocked list — semantic z-scale)
- [ ] Stacking context implications (`isolation: isolate`, `position` + `z-index`, `transform`)
- [ ] Canonical layers (per PRD 07b §3.4 canvas overlay z-index table; per Cluster 11 chrome overlays — toasts z-20, modal backdrop z-19, etc.)

### A.11 Accessibility (verify per interactive element)

- [ ] `aria-label` on every icon-only button
- [ ] `aria-labelledby` / `<label>` association on every input
- [ ] `role` overrides where the default doesn't fit
- [ ] Keyboard activation (Enter / Space / Esc / arrow keys per pattern)
- [ ] Focus order (tab-index, if non-default)

---

**End of canonical implementation prompt. Every UI cluster agent references this file at session start. Discrepancies between this file and anything else (RIDER, MASTER, individual plans) — this file wins on the fidelity contract; design.md wins on the design system itself.**
