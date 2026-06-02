# Cluster 10 — tokens-used.md (Design Phase 1 gate)

Per `IMPLEMENTATION_PROMPT.md §3`. Every visual value in this cluster's new UI
surfaces, mapped to an existing design token (`src/app.css @theme`) or flagged
`⚠️ MISSING`. **Target: zero new tokens, zero hex, zero `<style>` blocks.**

Cluster 10 has **no dedicated hi-fi mockup** (PRD 10 §3.4). The chat surface
composes from the existing M5 chat components (`ChatInput.vue`, `ChatPanel.vue`)
whose markup contracts are preserved, plus the chip pattern from
`docs/superpowers/specs/2026-05-14-shopify-product-reference-design.md §4.2`.
The authoritative visual reference is therefore **the existing dark-theme
composer chrome in `ChatInput.vue`**, not an external image.

## Surfaces in scope

1. `ProductReferenceChip.vue` (Task 12)
2. `ProductReferenceChipRow.vue` (Task 13)
3. Chip-row insertion into `ChatInput.vue` (Task 14)
4. ChatPanel tab strip + chip wiring (Task 15)

## Token map — ProductReferenceChip

| Visual value | Intent | Token / utility | Source token | Notes |
|---|---|---|---|---|
| Chip body background | subtle dark fill on dark panel | `bg-input` | `--color-input #26262b` | **Deviation from plan:** plan used `bg-surface` (`#ebebee`, light) which renders a near-white block on the dark panel + is illegible with `text-surface`. Corrected to the composer's dark input fill. |
| Chip border | 1px hairline | `border border-border` | `--color-border #2c2c30` | Matches `ChatInput` attachment thumbnail border. |
| Chip radius | rounded | `rounded-lg` | Tailwind scale | Matches composer buttons. |
| Chip gap / padding | compact | `gap-1.5 px-1.5 py-1` | Tailwind scale | Matches attachment row spacing. |
| Thumbnail | 24px square cover | `size-6 rounded-md object-cover` | Tailwind scale | Spec §4.2 "thumbnail". |
| Monogram fallback bg | when no image | `bg-fill-2` | `--color-fill-2 #303035` | Dark; replaces plan's `bg-muted/20`. |
| Monogram text | initial letter | `text-[10px] font-bold text-muted` | `--color-muted #a8a8ad` | |
| Title text | product name | `text-[11px] text-surface truncate max-w-[120px]` | `--color-surface #ebebee` | Light ink on dark chip — legible. |
| Remove `×` default | always-visible | `text-muted opacity-60` | `--color-muted` | Founder-lock §12.12 item 6. |
| Remove `×` hover/focus | full emphasis | `hover:opacity-100 focus-visible:opacity-100 hover:bg-hover hover:text-surface` | `--color-hover #232327` | |
| Remove icon | x glyph | `<KovaIcon name="x" class="size-2.5">` | — | KovaIcon, not `icon-lucide-*` (cluster-end gate #3). |

## Token map — ProductReferenceChipRow

| Visual value | Token / utility | Source token | Notes |
|---|---|---|---|
| Row layout | `flex flex-wrap gap-1.5` | Tailwind scale | Matches attachment thumbnail row. |
| Row bottom margin | `mb-2` | Tailwind scale | Matches `ChatInput` attachment block `mb-2`. |
| Empty state | `v-if="references.length"` → height 0 | — | Collapses fully when empty (§4.2). |

## Token map — ChatInput chip-row insertion (Task 14)

Composer footer vertical order (founder-lock §12.12 item 7):
`image attachments → product chips → textarea → send`. The chip row mounts
**between** the existing attachment-thumbnail block and the `<form>`. No new
tokens; reuses the container’s existing `px-3 py-2 border-t border-border`.

## Token map — ChatPanel tab strip (Task 15)

| Visual value | Token / utility | Source token | Notes |
|---|---|---|---|
| AI accent (active tab / AI affordance) | `text-accent-ai` / `bg-accent-ai` | `--color-accent-ai #a9c4ff` | AI-only accent per design-system compliance (NOT regular `--color-accent`). |
| Tab strip background | `bg-panel` | `--color-panel #1a1a1d` | Right-panel chrome. |
| Tab divider | `border-border` | `--color-border` | |
| Active tab text | `text-surface` | `--color-surface` | |
| Inactive tab text | `text-muted` | `--color-muted` | |
| New-chat disabled (cap 20) | `opacity-50 cursor-not-allowed` + `KovaTooltip` | — | Founder-lock §12.12 item 3. |

## Result

- **New tokens required: 0.** Every value maps to an existing `@theme` token or a
  Tailwind spacing/scale utility already used by the composer.
- **Hex literals: 0** in component code (all colors via semantic `--color-*` utilities).
- **`<style>` blocks: 0.**
- **One documented deviation from the plan’s literal classes:** chip body
  `bg-surface` → `bg-input`, and monogram `bg-muted/20` → `bg-fill-2`, because the
  plan’s light tokens are illegible on the dark panel. This keeps the chip
  consistent with the existing dark composer and the founder-locked dark-app rule
  (memory `feedback_app_dark_website_light`).
