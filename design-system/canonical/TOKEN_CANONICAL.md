# Kova Design Tokens — Canonical Resolution

> **Founder decision 2026-05-13:** When PRD authors, implementers, or AI agents cite a Kova design token, this doc resolves which name and value is canonical. Three vocabularies exist across the project. They render the same UI but use different identifiers.
>
> **Authority order:** Final.html `.kc {}` (canvas chrome) → design.md §2 (global semantics) → kova-hifi.css `:root` (CSS implementation).

---

## 1. The three vocabularies

| Vocabulary | Source file | Scope | Naming pattern | Example |
|-----------|-------------|-------|----------------|---------|
| **Short** (canonical for implementation) | `main-main-kova-scope/design-system/kova-hifi.css` `:root` | Global, all 39 hi-fi files | `--bg`, `--ink`, `--ink-2`, `--accent` | `var(--ink-2)` |
| **Long** (canonical for documentation) | `main-main-kova-scope/design-system/design.md` §2 | Spec / documentation | `--color-bg`, `--color-ink`, `--color-ink-2`, `--color-accent` | "`--color-ink-2` (`#a8a8ad`)" |
| **Scoped** (canvas-only) | `main-main-kova-scope/batch-b/Kova Canvas - Final.html` `.kc {}` lines 75–502 | Inside `.kc` selector only | `--bg`, `--ink`, `--ink2`, `--accent` (no hyphens after digit) | `.kc .topbar { color: var(--ink2); }` |

**Rule:** when authoring CSS or PRDs, use **short names** (`--ink-2`, `--accent-soft`, etc.). Reserve scoped names for the canvas-chrome `.kc {}` block lifted from Final.html.

---

## 2. Authoritative hex values

These hex values are the rendered truth, agreed across all three sources (post-2026-05-13 reconciliation).

### Surfaces

| Short name | Long name | Scoped (.kc) | Hex | Usage |
|-----------|-----------|--------------|-----|-------|
| `--page` | `--color-bg` | `--bg` | `#1a1a1d` | Page + panels (most surface area) |
| `--rail` | `--color-surface-panel` | `--rail` | `#1a1a1d` | Sidebars, topbar, modal shells |
| `--bg` | `--color-surface-canvas` | `--canvas` | `#242428` | Canvas plate (where design lives in editor) |
| `--fill` | `--color-surface-input` | `--fill` | `#26262b` | Input idle |
| `--fill-2` | `--color-surface-input-hi` | `--fill2` | `#303035` | Input active, segmented active, deeper chip |

> **Note:** `--bg` in short/scoped naming = canvas plate. `--color-bg` in long naming = page bg. **Inverted semantics — easy to confuse.** When citing global page bg, use `--page` (short) or `--color-bg` (long). When citing canvas plate, use `--bg` (short) or `--color-surface-canvas` (long).

### Lines

| Short name | Long name | Scoped (.kc) | Hex | Usage |
|-----------|-----------|--------------|-----|-------|
| `--line` | `--color-line` | `--line` | `#2c2c30` | Structural hairline (between major panels) |
| `--line-2` | `--color-line-soft` | `--line2` | `#232327` | In-panel hairline |

### Ink (text)

| Short name | Long name | Scoped (.kc) | Hex | Usage |
|-----------|-----------|--------------|-----|-------|
| `--ink` | `--color-ink` | `--ink` | `#ebebee` | Primary text |
| `--ink-2` | `--color-ink-2` | `--ink2` | `#a8a8ad` | Secondary text |
| `--ink-3` | `--color-ink-3` | `--ink3` | `#6e6e73` | Labels, tertiary |
| `--ink-4` | `--color-ink-4` | `--ink4` | `#4a4a4f` | Disabled, icon dim |

### Accent

| Short name | Long name | Scoped (.kc) | Hex | Usage |
|-----------|-----------|--------------|-----|-------|
| `--accent` | `--color-accent` | `--accent` | `#3b82f6` | Primary action, selection ring, active tool |
| `--accent-soft` | `--color-accent-soft` | n/a | `#1d3a66` (kova-hifi.css resolved) ≈ `rgba(59,130,246,0.14)` (design.md spec) | Selected-row tint background |
| `--accent-ink` | `--color-accent-ai` | `--accent-ink` | `#a9c4ff` | AI tool ink (Ask Kova) |

> **Accent-soft footnote:** kova-hifi.css resolves to opaque `#1d3a66` for performance. design.md spec is `rgba(59,130,246,0.14)`. Both render visually identical on the locked dark backgrounds. PRDs may cite either form. The opaque hex is preferred for screenshot-fidelity matching.

### Status (deferred — degrade to neutral per design.md §5 ban 12)

| Short name | Hex | Note |
|-----------|-----|------|
| `--warn`, `--ok`, `--review` | maps to `var(--ink-2)` | Degraded to neutral; status palette ships in Phase 2 |
| `--warn-soft`, `--ok-soft`, `--review-soft` | maps to `var(--fill)` | Same |
| `--warn-edge` | maps to `var(--line)` | Same |

### Density

| Short name | Long name | Value |
|-----------|-----------|-------|
| `--h-control` | `--h-control` | `30px` |
| `--h-control-sm` | `--h-control-sm` | `28px` |
| `--h-control-xs` | `--h-control-xs` | `26px` |
| `--h-tool` | `--h-tool` | `36px` |
| `--h-icon-btn` | `--h-icon-btn` | `28px` |
| `--h-topbar` | `--h-topbar` | `44px` |
| `--h-tabs` | `--h-tabs` | `44px` |

### Radii

| Short name | Long name | Value |
|-----------|-----------|-------|
| `--r-xs` | `--r-xs` | `3px` (swatches) |
| `--r-sm` | `--r-sm` | `4px` (segmented inner) |
| `--r-md` | `--r-md` | `5px` (inputs, icon-btn, fill rows) |
| `--r-lg` | `--r-lg` | `6px` (toolbar tools, layer rows, frame edge) |
| `--r-xl` | `--r-xl` | `7px` (page-row pill, file-icon tile) |
| `--r-2xl` | `--r-2xl` | `10px` (toolbar shell, zoom HUD) |
| `--r-pill` | `--r-pill` | `999px` (avatars, FABs) |

### Positional offsets

Named tokens for chrome positioning. Added 2026-05-20 to pre-populate the no-raw-visual-values lint (Mandate 6) before flip to error. Values lifted verbatim from `batch-b/Kova Canvas - Final.html .kc {}` scope; cross-referenced against `design.md` §3.11–§3.14.

| Short name | Value | Origin (design.md §) | Usage |
|---|---|---|---|
| `--toolbar-bottom` | `22px` | §3.11 | Floating toolbar bottom-center offset |
| `--toolbar-pad` | `6px` | §3.11 | Toolbar shell padding |
| `--toolbar-gap` | `2px` | §3.11 | Gap between toolbar tools |
| `--toolbar-divider-y` | `6px` | §3.11 | Toolbar divider vertical margin |
| `--toolbar-divider-x` | `4px` | §3.11 | Toolbar divider horizontal margin |
| `--zoom-hud-bottom` | `22px` | §3.12 | Zoom HUD bottom-right offset |
| `--zoom-hud-right` | `22px` | §3.12 | Zoom HUD bottom-right offset |
| `--zoom-hud-pad-y` | `6px` | §3.12 | Zoom HUD padding (Y) |
| `--zoom-hud-pad-x` | `10px` | §3.12 | Zoom HUD padding (X) |
| `--frame-label-offset` | `24px` | §3.13 | Frame label sits above the frame |
| `--frame-outline` | `2px` | §3.13 | Selected-frame accent outline width |
| `--frame-radius` | `6px` | §3.13 | Selected frame border-radius (=`--r-lg`) |
| `--handle-size` | `9px` | §3.13 | Selection handle dim |
| `--handle-border` | `1.5px` | §3.13 | Selection handle border width |
| `--handle-inset` | `1px` | §3.13 | Handle offset from frame edge (from Final.html) |
| `--size-chip-offset` | `36px` | §3.13 | Size chip sits below the frame |
| `--size-chip-pad-y` | `5px` | §3.13 | Size chip padding (Y) |
| `--size-chip-pad-x` | `12px` | §3.13 | Size chip padding (X) |
| `--floating-help-bottom` | `14px` | §3.14 | Floating help bottom-right of panel |
| `--floating-help-right` | `14px` | §3.14 | Floating help bottom-right of panel |
| `--floating-help-size` | `28px` | §3.14 | Floating help pill dim |

> **Note:** `--toolbar-bottom` and `--zoom-hud-bottom` are equal (`22px`) by design — they are visually aligned. Maintain both names so future drift in one doesn't quietly break alignment.

---

## 3. Reconciliation history

### 2026-05-13 — Ink hex reconciliation

**Before:**
- `kova-hifi.css :root` declared `--ink: #e9e9ea`, `--ink-2: #b8b8bc`, `--ink-3: #82828a`. No `--ink-4`.
- `design.md §2` + `Final.html .kc {}` agreed: `#ebebee` / `#a8a8ad` / `#6e6e73` / `#4a4a4f`.
- Result: render-drift across project. Files inside `.kc {}` scope rendered design.md values. Files outside (batch-a + batch-a-additions, where `:root` applies) rendered kova-hifi.css values.

**Audit finding (PRE_PRD_READINESS_AUDIT.md Dim D.1):** zero hardcoded hits of `#e9e9ea` / `#b8b8bc` / `#82828a` across any batch-a / batch-b / batch-a-additions HTML file. The "wrong" values lived only in `kova-hifi.css :root` and one delivery-note md.

**Resolution:** updated `kova-hifi.css :root` ink hex to match design.md §2 + Final.html. Added `--ink-4`. Per founder rule "Final canvas file takes precedence over all," the canonical hex flow is now Final.html `.kc {}` → design.md §2 → kova-hifi.css :root (now aligned).

**Visual impact:** subtle. `--ink-2` rendered ~6% darker (#a8a8ad vs #b8b8bc). `--ink-3` rendered ~13% darker (#6e6e73 vs #82828a). Primary text `--ink` change is imperceptible. No content changes to any HTML file required.

---

## 4. How to cite tokens in PRDs

- **CSS / implementation references:** use short names. Example: "primary text uses `var(--ink)` rendered at `#ebebee`."
- **Design / spec references:** either short or long name OK. Long names are clearer for non-implementers. Example: "primary text token `--color-ink` (`#ebebee`)."
- **Canvas chrome references (inside `.kc {}` scope):** use scoped names. Example: "Canvas top bar text uses `var(--ink2)` scoped within `.kc`."

When in doubt, cite both the short name AND the resolved hex value so there is zero ambiguity.

---

## 5. What about `kova-open-pencil-1/design-system/MASTER.md`?

> **Stale.** Last updated 2026-04-09 — predates the rewire. Uses obsolete `bg-[#2c2c2c]` Tailwind syntax, references pre-rewire warm-brown era hex values, and assumes Tailwind utility classes the rewire abandoned.
>
> **Per founder decision 2026-05-13:** `main-main-kova-scope/design-system/` wins. MASTER.md will be replaced with a single-line redirect to this TOKEN_CANONICAL.md + design.md. Do not cite MASTER.md in PRDs.

---

## 6. Implementation note for engineers

When implementing Kova for the first time, your CSS variable definitions live in **one place**: `main-main-kova-scope/design-system/kova-hifi.css` `:root` (dark) + `kova-hifi-light.css` `:root` (light). All values flow from there.

Vue 3 + Tailwind 4 implementation will translate this `:root` block into:
- Tailwind theme tokens (via `@theme` directive in `app.css`)
- Auto-generated utility classes (e.g. `bg-page`, `text-ink-2`, `border-line`)

The translation map lives in this doc + the kova-hifi.css file. Do not improvise.
