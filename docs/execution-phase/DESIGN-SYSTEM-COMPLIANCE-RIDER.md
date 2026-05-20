# Design System Compliance Rider

**Status:** active. Created 2026-05-19. Every execution-phase agent must read this BEFORE touching any UI surface.

**Purpose:** Codify the hi-fi discipline that prevents agents from inventing design decisions. Kova's design system is FROZEN. Agents replicate, never re-design.

**Severity:** every rule in this doc is HARD-RULE. Violation = revert + redo. No exceptions without founder approval via AskUserQuestion.

---

## 0. Source of truth

The design system is canonical at:

```
/Users/jihoyang/kova-main/main-main-kova-scope/design-system/
  design.md                ← THE spec doc (foundations, semantic tokens, components, density, BANS)
  kova-hifi.css            ← dark CSS tokens + component primitives (the WHOLE app uses this)
  kova-hifi-light.css      ← light CSS variant (auth pages ONLY — onboarding, signin, signup)
  TOKEN_CANONICAL.md       ← token reference index
  compressed-figma-canvas-ui/  ← Figma canvas UI reference PNGs (visual reference for inspector/layers/canvas)
```

The hi-fi HTML rendering target lives **in-repo** (version-controlled + CI-deterministic per IMPLEMENTATION_PROMPT.md §10) at:

```
kova-open-pencil-1/design-system/hifi/
  auth/                    ← Cluster 01 (light + dark auth)
  onboarding/              ← Cluster 02 onboarding
  dashboard/               ← Cluster 02 dashboard
  brand-mgmt/              ← Cluster 03
  account-stripe/          ← Cluster 04
  brand-kit/               ← Cluster 05
  canvas-chrome/           ← Cluster 06
  canvas-engine/           ← Cluster 07a + 07b
  canvas-menus/            ← Cluster 08
  version-history/         ← Cluster 09
  ai-chat/                 ← Cluster 10
  foundation/              ← Cluster 11 primitive specs (extracted from screens)
  settings/                ← Cluster 12
  states/                  ← cross-cluster (error pages, toasts, skeletons, upload states)
```

**The outer-repo originals** at `/Users/jihoyang/kova-main/main-main-kova-scope/{batch-a,batch-a-additions,batch-b}/...*.html` are historical reference only — diff against the in-repo copy. CI cannot reach the outer repo.

**Read `design.md` cover-to-cover before any UI work.** It is the single most important file in the design system. Token rules + bans + extension protocol all live there.

**Then read the hi-fi handoff method docs:**

```
docs/execution-phase/claude-design-files/
  README.md                ← Hi-fi bundle overview, fidelity rule, authority chain, screen inventory, hard bans
  IMPLEMENTATION_PROMPT.md ← Authoritative HTML → Vue translation method (Audit → Tokens → Components → Screens; per-screen diff loop; failure modes; token-extraction checklist)
```

`IMPLEMENTATION_PROMPT.md` is the canonical procedure. This rider summarizes + adds Kova-specific hard rules (Cluster 11 primitives, KovaIcon ban, etc.).

---

## 1. The translation pipeline (HTML → Vue) — the 3-rule contract

Hi-fi HTML is the **visual source of truth for VALUES**. Use the 3-rule formulation from `IMPLEMENTATION_PROMPT.md` §0:

> 1. **Visual values are copied.** Every color, spacing, type, radius, shadow, gap, padding, line-height, tracking, and proportion in the rendered output MUST match the mockup pixel-for-pixel.
> 2. **DOM structure is translated.** Compose markup via Vue 3 SFCs, Reka UI primitives, and the K* component layer from `design.md` §3. Do NOT copy the mockup's hand-rolled HTML.
> 3. **Behavior is engineered.** State lives in Pinia / refs / composables. Hover / focus / active / selected / disabled / loading / error states are dynamic bindings, NEVER hardcoded classes from the mockup.

**Trap phrase ban:** "copy DOM verbatim" is forbidden in agent instructions and in this codebase's docs. It sounds like fidelity insurance and is actually the opposite — it pulls hand-rolled HTML, inline `<style>` blocks, CDN scripts, and hardcoded states into the codebase, defeating the component layer. Mockup HTML mixes (a) values you want copied, (b) layout structure you want translated, (c) static-prototype scaffolding you want REBUILT. The 3-rule formulation above splits these correctly.

**Authoritative method:** `docs/execution-phase/claude-design-files/IMPLEMENTATION_PROMPT.md`. This rider summarizes; that doc is the canonical procedure. On any conflict between this rider and IMPLEMENTATION_PROMPT.md, **IMPLEMENTATION_PROMPT.md wins** on the fidelity contract.

**Step-by-step per surface:**

1. **Identify the surface** — look at PRD §3 for the cluster, find the row that references the hi-fi file + scene IDs.
2. **Read the IN-REPO hi-fi HTML** at `kova-open-pencil-1/design-system/hifi/<cluster>/<file>.html`. (The outer `/Users/jihoyang/kova-main/main-main-kova-scope/` originals are historical reference — diff against the in-repo copy, which is CI-deterministic per IMPLEMENTATION_PROMPT.md §10.)
3. **Phase 1 gate:** before any Vue code, produce `KOVA_AUDIT.md` + `tokens-used.md` per IMPLEMENTATION_PROMPT.md §3. `tokens-used.md` enumerates every visual value in this surface mapped to either an existing token or ⚠️ MISSING (founder decision via AskUserQuestion). No Vue until both are founder-approved.
4. **Extract visual values per Appendix A** of IMPLEMENTATION_PROMPT.md (colors / typography / spacing / sizing / border / shadows / layout / motion / states / z-index / a11y). Per state.
5. **Identify existing Kova components** for this surface:
   - Modal → `<KovaModal>` (Cluster 11)
   - Dropdown → `<KovaMenu>` (Cluster 11)
   - Popover → `<KovaPopover>` (Cluster 11)
   - Tooltip → `<KovaTooltip>` (Cluster 11)
   - Icon → `<KovaIcon name="...">` (Cluster 11)
   - Skeleton → `<KovaSkeleton>` (Cluster 11)
   - Toast → `<KovaToast>` mounted globally + `useToast()` composable (Cluster 11)
   - Plus the `K*` component layer from `design.md` §3 (KTopbar, KSidePanel, KSectionHeader, KListRow, KTabs, KPropertyGroup, KInput, KSegmented, KFillRow, KCheckbox, KToolbar, KZoomHUD, KFrame, KFloatingHelp, KAvatar).
6. **Translate the DOM structure** (Rule 2) — `<script setup lang="ts">`, Composition API, typed `defineProps<{}>()` + `defineEmits<{}>()`. Rebuild the mockup's hand-rolled HTML as Vue component composition: a `<div class="kc-topbar"><div class="kc-topbar-inner">...</div></div>` chain in the mockup becomes `<KTopbar>` with slots. CSS class names from `kova-hifi.css` (`.btn`, `.input`, `.dlg`, `.pill`, etc.) are preserved where they aid clarity OR where the component primitive contract requires them.
7. **Copy the visual values** (Rule 1) — tokens come from `kova-hifi.css :root` via Tailwind `@theme`. Reference via `var(--accent)` or Tailwind theme utilities. **Drift protocol:** if the hi-fi uses a value not in `:root`, log ⚠️ MISSING in `tokens-used.md` + ask founder via AskUserQuestion. Three options: (a) extend the system, (b) update the hi-fi, (c) keep literal with `/* token-exempt: <justification> */`. NEVER silently round.
8. **Engineer the behavior** (Rule 3) — state in Pinia / `ref()` / composables. Bind hover/focus/active/selected/disabled/loading/error dynamically (`:class="{ selected: isSelected }"` not `class="row selected"`).
9. **Layout = Tailwind utility classes.** Spacing, grid, flex, gap, position all use Tailwind utilities backed by `@theme`. Component primitives from `kova-hifi.css` (`.btn`, `.input`, etc.) carry their own padding/density — do not override.
10. **Per-screen written diff loop:** open IN-REPO mockup HTML + Vue route at the same 1440px viewport. Screenshot both. Walk Appendix A. List every discrepancy in writing → `tests/snapshots/cluster-NN/<surface>-diff.md`. Fix. Re-diff. Move on only when written diff is empty.
11. **Playwright visual-diff gate** at cluster boundary (per master guide §8.2). Thresholds: **0.1% component / 0.5% screen** with masking for volatile regions + `threshold: 0.2` per-pixel color tolerance (per IMPLEMENTATION_PROMPT.md §6).
12. **PR artifact:** 3-screenshot row per surface (mockup / impl / diff) in PR description (per IMPLEMENTATION_PROMPT.md §6 last paragraph).

---

## 2. Hard rules (NON-NEGOTIABLE)

### 2.1 Tokens

- ✅ Use `var(--bg)`, `var(--accent)`, `var(--ink-2)`, etc. via the existing `:root` in `kova-hifi.css`
- ✅ Reference via Tailwind `@theme` translation (config in `tailwind.config.ts`)
- ✅ **`kova-hifi.css :root` is the canonical token set.** Both the hi-fi HTML and the Vue implementation derive from it.
- ❌ NEVER write hex literals in component CSS (e.g., `color: #3b82f6` is forbidden — use `var(--accent)`)
- ❌ NEVER silently round a mockup value to the nearest existing token. The hi-fi HTML is the visual source of truth (per claude-design's mini-masterclass point #1: "mockup wins").
- ⚠️ **Hi-fi-vs-design-system drift protocol:** if a hi-fi HTML file uses a CSS value (color, spacing, radius, shadow) not present in `kova-hifi.css :root` — STOP. This is hi-fi-vs-design-system drift. Ask founder via `AskUserQuestion`. Founder decides whether to: (a) extend `kova-hifi.css :root` with a new named token, (b) update the hi-fi HTML to use an existing token, or (c) keep the literal value as an exception. **Never resolve silently.**
- ❌ NEVER invent net-new token roles without founder approval. If extension is needed, founder approves via the drift protocol above.

### 2.2 Colors

- ✅ One accent: `--accent #3b82f6`. Used for selection, active tool, primary CTA.
- ✅ `--accent-ink #a9c4ff` for AI-only surfaces (Ask Kova / chat / AI overlays)
- ❌ NO purple. NO green. NO orange. NO alternate accent. The accent is `--accent`.
- ❌ Status colors (red/yellow/green) are DEFERRED. Use ONLY:
  - `.pill.warn` (existing) — for warnings
  - `.btn.danger` (existing) — for destructive CTAs
  - `.tag-mono.warn` (existing) — for warning tags
  - Anywhere else needing red/yellow/green → STOP and ask founder.
- ❌ NEVER introduce new hex for status / accent / surface.

### 2.3 Typography

- ✅ Inter only. Weights 400 / 500 / 600 / 700.
- ✅ Type scale tokens from `design.md` §1.2 — pick ONE of the defined sizes
- ❌ NO display face, NO serif, NO monospace on chrome
- ❌ Per `design.md` §5 ban 1: **no `font-family: monospace` or `'JetBrains Mono'` anywhere**
- ❌ Legacy `.mono` class is a no-op (renders Inter). Don't reach for it.
- ❌ NEVER invent new font sizes. Use the scale.

### 2.4 Components

- ✅ **Use Cluster 11 primitives first.** `<KovaModal>`, `<KovaPopover>`, `<KovaMenu>`, `<KovaTooltip>`, `<KovaSelect>`, `<KovaToast>`, `<KovaIcon>`, `<KovaSkeleton>` are the canonical interactive primitives. The hi-fi HTML shows `.dlg` / `.popover` / `.dropdown` markup — translate the DOM structure (Rule 2 of the 3-rule contract) to the Kova components. Visual values inside those components (Rule 1) match the mockup pixel-for-pixel.
- ✅ **Component reuse rule:** before reusing an existing component, compare its rendered output to the hi-fi per Appendix A. If they differ in ANY visual property (color, spacing, radius, type, hover state, active state, focus-visible, disabled), either (a) add a new variant prop, or (b) build a new component. "Close enough" is not close enough.
- ✅ Modal chrome: `.dlg` + `.dlg-head` + `.dlg-body` + `.dlg-foot` (rendered inside `<KovaModal>`)
- ✅ Modal sizes: `.dlg.sm` (440px) / `.dlg.md` (540px) / `.dlg.lg` (880px)
- ✅ Buttons: existing `.btn` + variants (`.btn.primary`, `.btn.secondary`, `.btn.ghost`, `.btn.danger`)
- ✅ Inputs: existing `.input` + variants
- ✅ Pills: existing `.pill` + variants (`.pill.warn`, `.pill.soon`, etc.)
- ❌ NEVER mix Tailwind utilities with `kova-hifi.css` classes in a conflicting way (e.g., `class="btn p-6"` overrides the canonical button padding — DON'T)
- ❌ DO NOT reach for headless-ui, naive-ui, or any other UI library
- ⚠️ **New component classes**: if a hi-fi surface requires a class not in `kova-hifi.css`, follow the drift protocol in §2.1 — ask founder. Net-new component classes only land via the `design.md` §6 extension protocol.

### 2.5 Icons

- ✅ Always `<KovaIcon name="<lucide-name>" />` (Cluster 11 primitive)
- ❌ NEVER `<icon-lucide-*>` raw tags (dynamic OR static — both banned per W5a founder decision 2026-05-19)
- ❌ NEVER `i-lucide-*` UnoCSS class strings
- ❌ NEVER `<Icon name="lucide:...">` Nuxt syntax
- ❌ NEVER inline SVG (use `<KovaIcon>` only)
- ❌ NEVER Unicode glyphs for icons (e.g., `✓` for checkmark — use `<KovaIcon name="check" />`)

### 2.6 Spacing + density

- ✅ Use `design.md` §4 density rules (heights, paddings, gaps)
- ✅ Canonical spacing scale (per `design-system/design.md` + `claude-design-files/README.md` §4): `2, 4, 6, 8, 10, 12, 14, 16, 20, 24, 32`. **No raw values outside this scale.**
- ⚠️ **Mockup wins on spacing.** If the hi-fi shows `padding: 14px` and Tailwind offers `p-3` (12px) or `p-4` (16px), do NOT round. 14 is already on the scale. If the hi-fi shows a value not on the scale (e.g., `padding: 13px`) — STOP. Apply the drift protocol from §2.1. Never silently round to the nearest scale entry (per claude-design's mini-masterclass point #5 + IMPLEMENTATION_PROMPT.md "Hard rules" #16).
- ❌ NEVER use `em` or `rem` for component spacing (px only — design system convention)

### 2.7 Borders + radii

- ✅ Hairlines (1px) using `--n-750` or `--n-700` per surface
- ✅ Radii: 4px / 6px / 8px / 10px / 14px (the scale — see `design.md` §1.5)
- ❌ NO box-shadow for elevation EXCEPT for the canonical `--shadow-elev-1/2/3` (popovers, dropdowns)
- ❌ NO 2px+ borders

### 2.8 Styles

- ✅ Tailwind utility classes for LAYOUT positioning (flex, grid, gap, position)
- ✅ `kova-hifi.css` classes for COMPONENT primitives (`.btn`, `.input`, `.card`, etc.)
- ❌ NO `<style>` blocks (Vue SFC component styles) — per CLAUDE.md hard rule
- ❌ NO `<style scoped>` blocks (Vue SFC scoped styles) — per CLAUDE.md
- ❌ NO inline `style="..."` attributes (use Tailwind utilities or `kova-hifi.css` classes)
- ✅ Exception: `style="--cssvar-name: value"` for dynamic CSS variable overrides is acceptable when the value is computed at runtime (e.g., user-picked accent for brand color), but only with `var(...)` token consumption

### 2.9 Animations

- ✅ Use `design.md` §3 motion tokens (`--motion-fast`, `--motion-normal`, `--motion-slow`)
- ❌ NO custom transition durations
- ❌ NO bouncy / spring easings. Use the canonical easings (`--ease-out`, `--ease-in-out`)

### 2.10 Skeleton + loading states

- ✅ Use `<KovaSkeleton>` primitive (Cluster 11) with the canonical shimmer animation
- ✅ Use `--color-surface-input` (`#26262b`) base + `--color-surface-input-hi` (`#303035`) shimmer-peak per CHUNK 2 handoff convention
- ❌ NO custom shimmer / pulse animations
- ❌ NO loading spinners (skeleton-only per design discipline)

---

## 3. The light theme exception (auth pages ONLY)

Per memory `feedback_app_dark_website_light`:

- Dark = inside authenticated app (onboarding, dashboard, settings, canvas — everything)
- Light = marketing + auth (signup, signin, password reset, marketing pages)
- No theme toggle anywhere

**Light-theme surfaces use `kova-hifi-light.css` tokens.** Otherwise everything is dark.

If a cluster includes auth surfaces (Cluster 01: signup/signin) — use `kova-hifi-light.css`. Verify by checking the corresponding hi-fi HTML — auth pages will reference `kova-hifi-light.css`.

---

## 4. Hi-fi → Vue translation gotchas

### 4.1 Interactivity that hi-fi can't express

Hi-fi HTML is static. Vue adds interactivity. When translating:

- Hover states: hi-fi shows them as separate HTML files (e.g., `multi-select-1-hover.png` etc.) — Vue uses `:hover` from `kova-hifi.css` automatically
- Disabled states: hi-fi uses `.disabled` class — Vue binds `:class="{ disabled: !canSubmit }"`
- Loading states: hi-fi uses skeleton patterns — Vue uses `<KovaSkeleton>` from Cluster 11
- Toast notifications: hi-fi shows them rendered in DOM — Vue uses `<KovaToast>` mounted globally + triggered via `useToast()` composable from Cluster 11

### 4.2 Reka UI swaps

Where hi-fi uses bare `<div>` for modal / popover / dropdown, Vue uses Reka UI primitive:

- Hi-fi `.dlg` → `<KovaModal>` (Reka Dialog wrapped per Plan 11)
- Hi-fi `.popover` → `<KovaPopover>` (Reka Popover wrapped)
- Hi-fi `.dropdown` → `<KovaMenu>` (Reka DropdownMenu wrapped)
- Hi-fi `.tooltip` → `<KovaTooltip>` (Reka Tooltip wrapped)

All wrappers preserve the `kova-hifi.css` class names internally — visual output is identical.

### 4.3 Don't replicate raw SVGs

Hi-fi HTML embeds Lucide icons as raw inline SVG. Vue uses `<KovaIcon name="..." />`. Trust the icon-name mapping (KovaIcon takes a Lucide short-name like `'check'`, `'chevron-down'`).

### 4.4 Form inputs

Hi-fi uses `<input>` with `.input` class. Vue uses `<input>` with `.input` class + `v-model` binding. Same HTML, just reactive.

### 4.5 Hi-fi inline styles

Sometimes hi-fi has `<style>` blocks at the top of an HTML file (one-off rules). Per `design.md` §6 (extension protocol):

- Lift one-off styles into a shared stylesheet (`assets/css/<cluster>.css`) OR
- Use Tailwind utilities to express the same thing

NEVER inline the `<style>` block into the Vue SFC. CLAUDE.md bans `<style>` blocks in Vue SFCs.

---

## 5. Pre-flight: confirm design-system access

Every cluster agent should verify access before starting:

```sh
ls /Users/jihoyang/kova-main/main-main-kova-scope/design-system/
# Expect: compressed-figma-canvas-ui/ design.md kova-hifi-light.css kova-hifi.css TOKEN_CANONICAL.md

ls /Users/jihoyang/kova-main/main-main-kova-scope/batch-a/dark/
# Expect: 10+ HTML files

# Then read design.md fully
cat /Users/jihoyang/kova-main/main-main-kova-scope/design-system/design.md | head -200
```

If any path is missing → STOP and ask founder.

---

## 6. Playwright visual diff (the gate)

At cluster boundary (per master guide §8.2), the agent must:

1. Start dev server: `cd kova-open-pencil-1 && bun run dev` (background)
2. Serve in-repo hi-fi HTML via the dev server at `/dev/hifi/<cluster>/<file>.html?ci=1` (CI-deterministic per IMPLEMENTATION_PROMPT.md §10)
3. For each UI surface in cluster:
   ```typescript
   test('Cluster NN <surface> matches hi-fi (screen)', async ({ page }) => {
     await page.goto('http://localhost:1420/dev/cluster-NN/<surface>');
     await page.evaluate(() => document.fonts.ready);
     await page.waitForLoadState('networkidle');
     await expect(page).toHaveScreenshot('<surface>-impl.png', {
       maxDiffPixelRatio: 0.005,  // 0.5% screen-level
       threshold: 0.2,             // anti-aliasing tolerance
       animations: 'disabled',
       mask: [
         page.locator('[data-test-volatile="avatar"]'),
         page.locator('[data-test-volatile="timestamp"]'),
       ],
     });
   });
   ```
4. **Per-component diff** (against `/dev/components` gallery) uses `maxDiffPixelRatio: 0.001` (0.1%) — primitives are tightly scoped.
5. Output: side-by-side comparison images in `tests/snapshots/cluster-NN/<surface>-{mockup,impl,diff}.png`. **All three committed and referenced in the PR description.**
6. **Pass thresholds:** ≤ 0.1% component-level, ≤ 0.5% screen-level. **Do NOT loosen if a screen fails.** Investigate, fix, re-run.
7. **CI determinism prerequisites** (per IMPLEMENTATION_PROMPT.md §10) must be in place: fonts baked locally, Lucide icons baked locally, hover-dependent CSS disabled under `?ci=1`, `document.fonts.ready` awaited, animations disabled at gate-run, volatile regions masked. Without these the gate flakes.

---

## 7. When to ask founder (via AskUserQuestion)

These are the EXACT triggers — do not auto-resolve, ask founder:

- A surface needs a new token role not in `design.md` §1
- A surface needs a new component class not in `kova-hifi.css`
- A surface needs a new color (e.g., status red/yellow/green for a new use case)
- A surface needs a new font weight outside Inter 400/500/600/700
- Hi-fi HTML and PRD §3 description contradict each other
- Hi-fi HTML is missing for a PRD §3 surface row
- A founder-locked decision in `design.md` §5 (BANS) appears to conflict with a Plan task

DO NOT guess. DO NOT silently invent. DO NOT pick the "obvious" answer. ASK.

---

## 8. Quality gate checklist (per cluster, before declaring done)

- [ ] All Plan tasks have commits
- [ ] **Phase 1 gate green**: `KOVA_AUDIT.md` + `tokens-used.md` exist, zero ⚠️ MISSING rows, founder-approved
- [ ] **Per-screen written diff** at `tests/snapshots/cluster-NN/<surface>-diff.md` is empty for every UI surface
- [ ] Every Vue component imports `kova-hifi.css` via Tailwind `@theme` (no per-file CSS imports)
- [ ] **Zero raw hex literals** in any Vue SFC or component file (lint rule per IMPLEMENTATION_PROMPT.md §9)
- [ ] **Zero raw `px` literals** in any Vue SFC `<style>` block or class attribute (lint rule per §9; SVG geometry exempt)
- [ ] Zero `<style>` / `<style scoped>` blocks in Vue SFCs
- [ ] Zero `<icon-lucide-*>`, `<Icon name="lucide:...">`, `i-lucide-*` references in any Vue SFC
- [ ] Zero inline `style="hex|px|font-family|color"` patterns (CSS-var dynamic overrides via `style="--name: var(...)"` are exempt)
- [ ] Every interactive primitive uses Reka UI wrapper from Cluster 11
- [ ] Every icon uses `<KovaIcon>` from Cluster 11
- [ ] **Playwright visual-diff per component ≤ 0.1%** on every primitive used
- [ ] **Playwright visual-diff per screen ≤ 0.5%** on every UI surface
- [ ] **PR description includes 3-screenshot row** (mockup / impl / diff) per surface
- [ ] **All tokens used** are present in `kova-hifi.css :root` AND `TOKEN_CANONICAL.md`
- [ ] `superpowers:code-reviewer` agent reports zero CRITICAL/HIGH design-system violations
- [ ] Founder browser smoke-test of `/dev/cluster-NN` showcase route

---

**End of design-system compliance rider. Every cluster agent must reference this doc at the start of every prompt.**
