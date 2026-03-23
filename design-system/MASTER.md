# Kova Design System

> **Purpose:** Prescriptive design spec for the Kova visual language. Any AI agent or developer should be able to build a pixel-perfect Kova UI from this document alone — no codebase context required.
>
> **Canonical reference:** The onboarding flow (dark-theme, `bg-[#2c2c2c]` page background) is the definitive expression of the Kova aesthetic. All tokens and patterns derive from it.
>
> **Stack:** Vue 3 + Tailwind CSS 4 + Reka UI + unplugin-icons (Lucide). No `<style>` blocks — Tailwind utility classes only.

---

## 1. Design Tokens

Tokens are semantic reference values. The **Tailwind Class** column shows the working class to use in templates.

Only `accent`, `canvas`, `panel`, `border` (subtle), `hover`, `muted`, `surface`, `input`, and `component` have native Tailwind classes via CSS custom properties in `app.css`. Everything else requires bracket notation.

### 1.1 Backgrounds

| Token | Hex | Tailwind Class | Usage |
|-------|-----|----------------|-------|
| canvas | `#1e1e1e` | `bg-canvas` | Full-bleed canvas / darkest layer |
| page | `#2c2c2c` | `bg-[#2c2c2c]` | Page-level background |
| panel | `#2a2a2a` | `bg-panel` | Floating panels, preview containers |
| title-bar | `#242424` | `bg-[#242424]` | Title bar / toolbar background |
| elevated | `#383838` | `bg-[#383838]` | Cards, inputs, raised surfaces |
| elevated-hover | `#444444` | `bg-[#444]` | Hover state for elevated surfaces |
| disabled | `#4b4b4b` | `bg-[#4b4b4b]` | Disabled buttons |
| skeleton-dark | `#3a3a3a` | `bg-[#3a3a3a]` | Skeleton loaders (large blocks) |
| skeleton-mid | `#4a4a4a` | `bg-[#4a4a4a]` | Skeleton loaders (grid items, bars) |
| skeleton-light | `#555555` | `bg-[#555]` | Skeleton loaders (small elements) |
| skeleton-faint | `#444444` | `bg-[#444]` | Skeleton loaders (footer lines) |
| overlay | `black/40` | `bg-black/40` | Overlay on interactive images |

### 1.2 Borders

| Token | Hex | Tailwind Class | Usage |
|-------|-----|----------------|-------|
| subtle | `#3a3a3a` | `border-border` | Dividers, preview section borders |
| strong | `#555555` | `border-[#555]` | Input borders, card borders, swatches |

### 1.3 Text

| Token | Hex | Tailwind Class | Usage |
|-------|-----|----------------|-------|
| primary | `#ffffff` | `text-white` | Headings, input values, button labels |
| secondary | `#cccccc` | `text-[#ccc]` | Body text, list item labels |
| muted | `#999999` | `text-[#999]` | Subtitles, helper text, secondary actions |
| faint | `#aaaaaa` | `text-[#aaa]` | Section labels (uppercase), field labels |
| disabled | `#888888` | `text-[#888]` | Placeholder display text, icon fill |
| very-faint | `#666666` | `text-[#666]` | Absent image placeholder icon fill |
| placeholder | `#aaaaaa` | `placeholder-[#aaa]` | Input placeholder text |
| disabled-button | `white/40` | `text-white/40` | Disabled button text |

### 1.4 Semantic Colors

| Token | Hex | Tailwind Class | Usage |
|-------|-----|----------------|-------|
| accent | `#3b82f6` | `bg-accent` / `text-accent` / `border-accent` | Primary action, focus rings, links |
| accent-hover | — | `hover:bg-blue-400` | Primary button hover state |
| accent-ring | — | `ring-accent/30` | Focus ring glow (30% opacity) |
| accent-soft | — | `bg-accent/60` | Accent on skeleton / preview CTA |
| success | `#4ade80` | `text-green-400` | Checkmarks, success status icons |
| error | `#f87171` | `text-red-400` | Error icons, inline error text |
| error-bg | — | `bg-red-600` | Error toast background |
| warning-bg | — | `bg-amber-600` | Warning toast background |
| info-bg | — | `bg-blue-600` | Default/info toast background |
| status-online | — | `bg-emerald-500/80` | Online status indicator |

### 1.5 Skeleton / Preview

These intermediate grays are used in the email preview skeleton. They create depth through a progression from dark → light:

```
#3a3a3a (large blocks) → #4a4a4a (grid items) → #555 (small elements) → #666 (text lines)
```

| Element | Tailwind Class |
|---------|----------------|
| Hero block | `bg-[#3a3a3a]` |
| Card grid items | `bg-[#4a4a4a]` |
| Header bars / CTA / icon bg | `bg-[#555]` |
| Text lines (inside cards) | `bg-[#666]` |
| Footer lines | `bg-[#444]` |

---

## 2. Tailwind Setup

The `app.css` file imports `tw-animate-css` (provides `animate-in`, `animate-out`, `fade-in`, `slide-in-from-top-1`, etc. used in toast animations) and defines these CSS custom properties — these tokens have native Tailwind classes:

```css
@theme {
  --color-panel: #2a2a2a;
  --color-canvas: #1e1e1e;
  --color-border: #3a3a3a;
  --color-hover: #353535;
  --color-accent: #3b82f6;
  --color-surface: #e0e0e0;
  --color-muted: #888888;
  --color-input: #1e1e1e;
  --color-component: #9747ff;
}
```

To avoid bracket notation for the remaining tokens, add these to the `@theme` block:

```css
@theme {
  /* ... existing variables ... */
  --color-page: #2c2c2c;
  --color-elevated: #383838;
  --color-elevated-hover: #444444;
  --color-border-strong: #555555;
  --color-text-secondary: #cccccc;
  --color-text-muted: #999999;
  --color-text-faint: #aaaaaa;
  --color-text-disabled: #888888;
  --color-text-placeholder: #aaaaaa;
  --color-success: #4ade80;
  --color-error: #f87171;
  --color-error-strong: #dc2626;
  --color-warning: #d97706;
}
```

> **Note:** Until these variables are added, all component patterns in this document use bracket notation which works out-of-the-box.

---

## 3. Typography

**Font family:** `Inter, system-ui, -apple-system, sans-serif` (set on `<body>`)

### 3.1 Scale

| Token | Size | Weight | Extra | Tailwind Class | Usage |
|-------|------|--------|-------|----------------|-------|
| display | 30px | 700 | — | `text-3xl font-bold` | Hero / display headings |
| body-lg | 16px | 400 | — | `text-base` | Subtitles, descriptions |
| body | 14px | 400 | — | `text-sm` | Inputs, buttons, list items |
| body-medium | 14px | 500 | — | `text-sm font-medium` | Button labels, nav items |
| body-semibold | 14px | 600 | — | `text-sm font-semibold` | Card titles |
| body-lg-semibold | 16px | 600 | — | `text-base font-semibold` | Card title (emphasized), brand name display |
| caption | 12px | 400 | — | `text-xs` | Secondary info, result detail, toast text |
| label | 10px | 500 | uppercase, wider tracking | `text-[10px] font-medium tracking-wider uppercase` | Section labels |

### 3.2 Heading Patterns

```html
<!-- Display heading -->
<h1 class="text-3xl font-bold text-white">Page Title</h1>

<!-- Subtitle (follows heading) -->
<p class="mt-3 text-base text-[#999]">Supporting description text.</p>

<!-- Section label (uppercase) -->
<div class="mb-3 text-[10px] font-medium tracking-wider text-[#aaa] uppercase">Section Name</div>

<!-- Field label (small) -->
<div class="mb-1 text-[10px] text-[#aaa]">Field label</div>
```

---

## 4. Border Radius

| Token | Value | Tailwind Class | Usage |
|-------|-------|----------------|-------|
| full | 9999px | `rounded-full` | Progress bars, status dots, circles |
| xl | 12px | `rounded-xl` | Cards, elevated sections, preview containers, app logo |
| lg | 8px | `rounded-lg` | Inputs, buttons, color swatches, popovers |
| md | 6px | `rounded-md` | Inline editable displays, toasts |
| sm | 4px | `rounded` | Skeleton bars, small elements |

---

## 5. Shadows

| Token | Tailwind Class | Usage |
|-------|----------------|-------|
| 2xl | `shadow-2xl` | Large floating panels, preview containers |
| lg | `shadow-lg` | Popovers, dropdown menus |
| md | `shadow-md` | Toasts, hover-lift effects |

---

## 6. Spacing

### 6.1 Two-Panel Layout

The canonical Kova layout is a horizontal split with a form panel and a preview panel:

```html
<div class="flex h-screen">
  <!-- Left panel (form content) -->
  <div class="relative flex w-[38%] flex-col bg-[#2c2c2c] py-8 pr-10 pl-[60px]">
    <!-- Back navigation area (32px bottom margin) -->
    <!-- Scrollable step content (flex-1, pt-8) -->
    <!-- Bottom bar: progress + action button (pt-6) -->
  </div>

  <!-- Right panel (preview / canvas) -->
  <div class="flex w-[62%] items-center justify-center bg-canvas">
    <!-- Preview container at w-[65%] -->
  </div>
</div>
```

| Property | Value | Tailwind Class |
|----------|-------|----------------|
| Root container | Full height flex row | `flex h-screen` |
| Left panel width | 38% | `w-[38%]` |
| Right panel width | 62% | `w-[62%]` |
| Preview container width | 65% of right panel | `w-[65%]` |
| Bottom bar gap | 24px top | `pt-6` |

### 6.2 Page Padding

| Property | Value | Tailwind Class |
|----------|-------|----------------|
| Page padding (top/bottom) | 32px | `py-8` |
| Page padding (left) | 60px | `pl-[60px]` |
| Page padding (right) | 40px | `pr-10` |
| Content offset from top | 32px | `pt-8` |
| Back button area | 40px height | `h-10` |
| Back button margin | 32px bottom | `mb-8` |

### 6.3 Gap Scale

| Gap | Tailwind Class | Usage |
|-----|----------------|-------|
| 16px | `gap-4` | Card grids, swatch groups, stacked sections |
| 12px | `gap-3` | Icon + label pairs, column layouts |
| 8px | `gap-2` | Header items, tight grid |
| 6px | `gap-1.5` | Footer elements, toast stack |
| 4px | `gap-1` | Tight swatch row |

### 6.4 Padding

| Padding | Tailwind Class | Usage |
|---------|----------------|-------|
| 32px | `p-8` | Canvas area |
| 16px | `p-4` | Cards |
| 12px | `p-3` | Compact cards, popovers |
| 16px x / 12px y | `px-4 py-3` | Inputs |
| 24px x / 10px y | `px-6 py-2.5` | Primary buttons |
| 12px x / 8px y | `px-3 py-2` | Inline edit inputs |
| 10px x / 6px y | `px-2.5 py-1.5` | Toasts |
| 8px x / 4px y | `px-2 py-1` | Compact inputs (color hex) |

### 6.5 Vertical Rhythm

| Spacing | Tailwind Class | Usage |
|---------|----------------|-------|
| 32px | `mt-8` | Content area to first input |
| 24px | `mb-6` | Logo to heading |
| 20px | `mb-5` | Preview section gaps |
| 16px | `mt-4` | Secondary actions (skip links, error messages) |
| 12px | `mt-3` / `mb-3` | Heading to subtitle, section labels |
| 8px | `mb-2` | Small field gaps |
| 4px | `mt-1` / `mb-1` | Labels to fields, result text |
| 2px | `mt-0.5` | Inline status detail |

---

## 7. Icon System

**Library:** unplugin-icons with Lucide. Usage: `<icon-lucide-{name} />`

### 7.1 Icon Sizes

| Size | Tailwind Class | Usage |
|------|----------------|-------|
| 20px | `size-5` | Navigation icons, status containers |
| 16px | `size-4` | Status icons (spinner, check, error) |
| 14px | `size-3.5` | Overlay edit indicator |
| 12px | `size-3` | Toast icons, toolbar icons |

### 7.2 Common Icons

| Icon | Component | Usage |
|------|-----------|-------|
| Back | `<icon-lucide-chevron-left>` | Navigation back |
| Loading | `<icon-lucide-loader-2>` | Spinner (with `animate-spin`) |
| Success | `<icon-lucide-check-circle-2>` | Step complete |
| Error | `<icon-lucide-x-circle>` | Step failed |
| Edit | `<icon-lucide-pencil>` | Edit overlay |
| Image | `<icon-lucide-image>` | Image placeholder |
| Close | `<icon-lucide-x>` | Dismiss |
| Copy | `<icon-lucide-copy>` | Copy to clipboard |
| Check | `<icon-lucide-check>` | Confirmation |
| Warning | `<icon-lucide-triangle-alert>` | Warning / error toast |
| Tool | `<icon-lucide-pen-tool>` | Editor / design tool |

---

## 8. Z-index Layers

| Layer | Value | Tailwind Class | Usage |
|-------|-------|----------------|-------|
| Toast viewport | 9999 | `z-[9999]` | Toast notifications (always on top) |
| Popover | 50 | `z-50` | Color pickers, dropdowns, menus |
| Overlay | 40 | `z-40` | Modal backdrops |
| Sticky | 30 | `z-30` | Sticky headers |
| Default | auto | — | Normal flow |

---

## 9. Component Patterns

Copy-paste-ready Tailwind class strings for every standard Kova UI element.

### 9.1 Primary Button

```html
<!-- Enabled -->
<button class="cursor-pointer rounded-lg bg-accent px-6 py-2.5 text-sm font-medium text-white transition-colors duration-200 hover:bg-blue-400">
  Button Label
</button>

<!-- Disabled -->
<button class="cursor-not-allowed rounded-lg bg-[#4b4b4b] px-6 py-2.5 text-sm font-medium text-white/40" disabled>
  Button Label
</button>
```

### 9.2 Secondary Button (Filled)

```html
<button class="rounded-lg bg-[#444] px-6 py-2.5 text-sm font-medium text-[#ccc] transition-colors hover:bg-[#555]">
  Continue and fill in manually
</button>
```

### 9.3 Tertiary Button (Ghost)

```html
<button class="rounded-lg px-6 py-2.5 text-sm text-[#ccc] transition-colors hover:bg-[#444] hover:text-white">
  Secondary Action
</button>
```

### 9.4 Text Input

```html
<input
  type="text"
  placeholder="Placeholder text"
  class="w-full rounded-lg border border-[#555] bg-[#383838] px-4 py-3 text-white placeholder-[#aaa] transition-colors outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
/>
```

### 9.5 Compact Input (e.g., hex code field)

```html
<input
  type="text"
  class="w-full rounded border border-[#555] bg-[#383838] px-2 py-1 text-xs text-white"
/>
```

### 9.6 Click-to-Edit Display

```html
<!-- Display mode -->
<div
  role="button"
  tabindex="0"
  class="cursor-pointer rounded-md px-3 py-2 text-sm text-white transition-colors hover:bg-[#444] focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
>
  Editable Value
</div>

<!-- Display mode (empty) -->
<div
  role="button"
  tabindex="0"
  class="cursor-pointer rounded-md px-3 py-2 text-sm text-[#888] italic transition-colors hover:bg-[#444] focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
>
  Click to edit
</div>

<!-- Edit mode -->
<input
  type="text"
  class="w-full rounded-md border border-accent bg-[#383838] px-3 py-2 text-sm text-white ring-1 ring-accent outline-none"
/>
```

### 9.7 Card (Elevated Surface)

```html
<div class="rounded-xl bg-[#383838] p-4">
  <!-- Card content -->
</div>
```

### 9.8 Section Label (Uppercase)

```html
<div class="mb-3 text-[10px] font-medium tracking-wider text-[#aaa] uppercase">
  Section Name
</div>
```

### 9.9 Back Button

```html
<button
  aria-label="Go to previous step"
  class="flex size-10 items-center justify-center rounded-lg text-[#999] transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
>
  <icon-lucide-chevron-left class="size-5" />
</button>
```

### 9.10 Skip / Tertiary Link

```html
<button class="text-sm text-[#999] transition-colors hover:text-white">
  I don't have a website
</button>
```

### 9.11 Extraction / Status List Item

```html
<!-- Pending -->
<div class="flex items-start gap-3 opacity-30 transition-opacity">
  <div class="mt-0.5 flex size-5 items-center justify-center">
    <div class="size-4 rounded-full border border-[#555]" />
  </div>
  <span class="text-sm text-[#ccc]">Finding your logo...</span>
</div>

<!-- Loading -->
<div class="flex items-start gap-3 opacity-100 transition-opacity">
  <div class="mt-0.5 flex size-5 items-center justify-center">
    <icon-lucide-loader-2 class="size-4 animate-spin text-accent" />
  </div>
  <span class="text-sm text-[#ccc]">Finding your logo...</span>
</div>

<!-- Done -->
<div class="flex items-start gap-3 opacity-100 transition-opacity">
  <div class="mt-0.5 flex size-5 items-center justify-center">
    <icon-lucide-check-circle-2 class="size-4 text-green-400" />
  </div>
  <div>
    <span class="text-sm text-[#ccc]">Finding your logo...</span>
    <p class="mt-0.5 text-xs text-[#999]">Logo found</p>
  </div>
</div>

<!-- Error -->
<div class="flex items-start gap-3 opacity-100 transition-opacity">
  <div class="mt-0.5 flex size-5 items-center justify-center">
    <icon-lucide-x-circle class="size-4 text-red-400" />
  </div>
  <div>
    <span class="text-sm text-[#ccc]">Finding your logo...</span>
    <p class="mt-0.5 text-xs text-red-400">Could not find logo</p>
  </div>
</div>
```

### 9.12 Progress Bar

```html
<div
  class="h-1 rounded-full bg-[#444]"
  role="progressbar"
  aria-live="polite"
  :aria-valuenow="currentStep"
  aria-valuemin="0"
  :aria-valuemax="totalSteps"
  :aria-label="`Progress: step ${currentStep} of ${totalSteps}`"
>
  <div
    class="h-full rounded-full bg-accent transition-all duration-300 ease-in-out"
    :style="{ width: `${percent}%` }"
  />
</div>
```

> **Note:** The container width (e.g. `w-[45%]`) is contextual — set it based on your layout.

### 9.13 Color Swatch — Interactive (with Popover)

```html
<!-- Trigger -->
<button
  class="size-10 rounded-lg border border-[#555] transition-shadow hover:shadow-md"
  :style="{ backgroundColor: hex }"
/>

<!-- Popover (Reka UI PopoverContent) -->
<PopoverContent
  class="z-50 rounded-lg border border-[#555] bg-panel p-3 shadow-lg"
  :side-offset="8"
  side="bottom"
>
  <!-- Native color picker -->
  <input type="color" :value="hex" class="mb-2 h-[80px] w-[120px] cursor-pointer" />
  <!-- Hex text input -->
  <input
    type="text"
    placeholder="#000000"
    class="w-full rounded border border-[#555] bg-[#383838] px-2 py-1 text-xs text-white"
  />
</PopoverContent>

<!-- Label below swatch -->
<div class="mt-1 text-[10px] text-[#aaa]">Label</div>
<div class="mt-0.5 text-[10px] text-[#999]">#hex</div>
```

### 9.14 Color Swatch — Display-Only

Small non-interactive swatches shown inline (e.g. after brand color extraction):

```html
<div class="flex gap-1">
  <div
    v-for="(hex, key) in colors"
    :key="key"
    class="size-5 rounded border border-[#555]"
    :style="{ backgroundColor: hex }"
  />
</div>
```

### 9.15 Logo Upload Button

```html
<button
  class="group relative flex size-14 items-center justify-center overflow-hidden rounded-lg border border-[#555] bg-panel"
>
  <img v-if="logoUrl" :src="logoUrl" class="size-14 object-contain" alt="Brand logo" />
  <icon-lucide-image v-else class="size-5 text-[#666]" />
  <div class="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
    <icon-lucide-pencil class="size-3.5 text-white" />
  </div>
</button>
```

### 9.16 Toast

Uses Reka UI `ToastRoot` with `tailwind-variants`:

```html
<!-- Default (info) -->
<div class="flex max-w-sm items-start gap-1.5 rounded-md bg-blue-600 px-2.5 py-1.5 text-xs text-white shadow-md">
  <icon-lucide-check class="mt-0.5 size-3 shrink-0" />
  <span class="min-w-0 flex-1 select-text">Toast message here.</span>
</div>

<!-- Error -->
<div class="flex max-w-sm items-start gap-1.5 rounded-md bg-red-600 px-2.5 py-1.5 text-xs text-white shadow-md">
  <icon-lucide-triangle-alert class="mt-0.5 size-3 shrink-0" />
  <span class="min-w-0 flex-1 select-text">Error message here.</span>
  <button class="mt-0.5 shrink-0 cursor-pointer rounded p-0.5 opacity-70 hover:opacity-100">
    <icon-lucide-copy class="size-3" />
  </button>
  <button class="mt-0.5 shrink-0 cursor-pointer rounded p-0.5 opacity-70 hover:opacity-100">
    <icon-lucide-x class="size-3" />
  </button>
</div>

<!-- Warning -->
<!-- Same structure, bg-amber-600 -->
```

Toast viewport: `fixed top-2 left-1/2 z-[9999] flex -translate-x-1/2 flex-col items-center gap-1.5`

### 9.17 Preview Container (Email Design Preview)

```html
<div class="overflow-hidden rounded-xl bg-panel shadow-2xl">
  <!-- Title bar -->
  <div class="flex items-center justify-between border-b border-border bg-[#242424] px-4 py-2.5">
    <!-- Left: icon -->
    <div class="flex items-center gap-2">
      <div class="flex size-5 items-center justify-center rounded bg-[#555]">
        <icon-lucide-pen-tool class="size-3 text-[#888]" />
      </div>
    </div>
    <!-- Center: label -->
    <span class="text-xs text-[#999]">New Design</span>
    <!-- Right: status dot -->
    <div class="size-5 rounded-full bg-emerald-500/80" />
  </div>

  <!-- Canvas area -->
  <div class="p-8">
    <!-- Skeleton content here -->
  </div>
</div>
```

### 9.18 Menu Dropdown

```html
<div class="border border-[#555] bg-[#383838] p-1 shadow-lg rounded-lg">
  <!-- Menu items -->
</div>
```

### 9.19 Menu Item

```html
<div class="rounded-md px-2 py-1.5 text-sm text-[#ccc] outline-none select-none data-[highlighted]:bg-[#444] data-[highlighted]:text-white">
  Menu Item
</div>
```

### 9.20 Destructive Menu Item

```html
<div class="rounded-md px-2 py-1.5 text-sm text-red-400 outline-none select-none data-[highlighted]:bg-red-500/10 data-[highlighted]:text-red-400">
  Delete
</div>
```

### 9.21 Dialog

```html
<div class="rounded-xl bg-[#2c2c2c] p-6 shadow-xl">
  <!-- Dialog content -->
</div>
```

### 9.22 Empty State

```html
<div class="flex flex-col items-center gap-4 py-12 text-center">
  <div class="flex size-14 items-center justify-center rounded-full bg-[#383838]">
    <icon-lucide-image class="size-6 text-[#888]" />
  </div>
  <div>
    <p class="text-sm font-medium text-white">No items yet</p>
    <p class="mt-1 text-sm text-[#999]">Create your first design to get started.</p>
  </div>
  <button class="rounded-lg bg-accent px-6 py-2.5 text-sm font-medium text-white transition-colors duration-200 hover:bg-blue-400">
    Create Design
  </button>
</div>
```

### 9.23 Sidebar Navigation

```html
<!-- Selected -->
<div class="rounded-lg bg-[#383838] px-3 py-2 text-sm font-medium text-white">
  <icon-lucide-inbox class="mr-2 inline size-4" /> Inbox
</div>

<!-- Unselected -->
<div class="rounded-lg px-3 py-2 text-sm text-[#999] transition-colors hover:bg-[#444] hover:text-white">
  <icon-lucide-archive class="mr-2 inline size-4" /> Archive
</div>
```

### 9.24 New Canvas Card (Dashed)

```html
<button class="flex h-40 w-full items-center justify-center rounded-xl border-2 border-dashed border-[#555] text-[#999] transition-colors hover:border-accent hover:text-accent">
  <icon-lucide-plus class="size-6" />
</button>
```

### 9.25 Avatar

```html
<div class="flex size-8 items-center justify-center rounded-full bg-accent text-xs font-medium text-white">
  JY
</div>
```

### 9.26 OAuth / Social Button

```html
<button class="flex w-full items-center justify-center gap-2 rounded-lg bg-[#383838] px-4 py-3 text-sm text-white transition-colors hover:bg-[#444]">
  <img src="/google-icon.svg" class="size-5" alt="" />
  Continue with Google
</button>
```

### 9.27 Inline Error Text

```html
<p class="mt-2 text-sm text-red-400">Error message here.</p>
```

---

## 10. Animation & Transitions

### 10.1 Vue Step Transition (Fade + Slide Up)

Used for page-level step content transitions:

```html
<Transition
  enter-active-class="transition-all duration-300 ease-out"
  enter-from-class="translate-y-4 opacity-0"
  enter-to-class="translate-y-0 opacity-100"
  leave-active-class="transition-all duration-200 ease-in"
  leave-from-class="translate-y-0 opacity-100"
  leave-to-class="translate-y-4 opacity-0"
  mode="out-in"
>
  <div :key="stepKey">
    <!-- Step content -->
  </div>
</Transition>
```

### 10.2 Progressive Reveal (Preview Elements)

Elements in the preview fade in and slide up as steps progress:

```html
<div
  class="transition-all duration-500"
  :class="isVisible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'"
/>
```

### 10.3 Standard Transitions

| Property | Tailwind Class | Usage |
|----------|----------------|-------|
| Color change | `transition-colors` | Hover states, focus states |
| Color change (timed) | `transition-colors duration-200` | Primary button hover |
| Opacity | `transition-opacity` | Status list items |
| Shadow | `transition-shadow` | Color swatch hover |
| All properties | `transition-all duration-500` | Preview element reveals |
| Smooth fill | `transition-all duration-300 ease-in-out` | Progress bar |

### 10.4 Loading Spinner

```html
<icon-lucide-loader-2 class="size-4 animate-spin text-accent motion-reduce:animate-none" />
```

### 10.5 Skeleton Pulse

```html
<div class="animate-pulse" />
```

Use `motion-reduce:animate-none` alongside `animate-pulse` for accessibility.

### 10.6 Toast Animations

Enter: `data-[state=open]:animate-in data-[state=open]:fade-in data-[state=open]:slide-in-from-top-1`
Exit: `data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=closed]:slide-out-to-top-1`
Swipe cancel: `data-[swipe=cancel]:translate-y-0 data-[swipe=cancel]:transition-transform`
Swipe move: `data-[swipe=move]:translate-y-[var(--reka-toast-swipe-move-y)]`

---

## 11. Focus & Accessibility

### 11.1 Focus Ring

Standard focus ring for interactive elements:

```
focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none
```

For inputs with border highlight:

```
outline-none focus:border-accent focus:ring-2 focus:ring-accent/30
```

### 11.2 Reduced Motion

Always pair `animate-pulse` or `animate-spin` with `motion-reduce:animate-none`:

```html
<div class="animate-pulse motion-reduce:animate-none" />
```

### 11.3 ARIA Patterns

| Pattern | Implementation |
|---------|----------------|
| Progress bar | `role="progressbar"` + `aria-valuenow` + `aria-valuemin` + `aria-valuemax` + `aria-label` + `aria-live="polite"` |
| Click-to-edit | `role="button"` + `tabindex="0"` + keyboard handlers for Enter/Space/Escape |
| Live regions | `aria-live="polite"` on dynamic content (extraction status list) |
| Error alerts | `role="alert"` on error messages |
| Decorative | `aria-hidden="true"` on preview/skeleton elements |
| Images | `alt` text on all meaningful images; `role="img"` + `aria-label` on composite image elements |

### 11.4 Keyboard Navigation

- `e.code` (not `e.key`) for all keyboard handlers — prevents Option key transformation on Mac
- Enter: submit / confirm / start editing
- Escape: cancel editing
- Space: activate button-role elements (with `.prevent`)

---

## 12. Anti-Patterns

Do NOT use any of these in Kova UI code:

| Anti-Pattern | Why | Instead |
|---|---|---|
| `<style>` blocks | Tailwind utility-only codebase | Use Tailwind classes |
| `<style scoped>` | Same — no style blocks | Use Tailwind classes |
| Inline `style=""` (for layout) | Not searchable, not responsive | Tailwind classes (exception: dynamic values like `backgroundColor: hex`) |
| Raw SVG in templates | Inconsistent sizing, no tree-shaking | `<icon-lucide-{name}>` |
| Unicode emoji as icons | Inconsistent rendering across OS | Lucide icons |
| `e.key` for keyboard events | Option key transforms characters on Mac | `e.code` |
| `Math.random()` | Not cryptographically safe | `crypto.getRandomValues()` |
| Shallow spread for nested mutation | Doesn't deep copy | `structuredClone()` |
| `bg-elevated` | Not a valid Tailwind class | `bg-[#383838]` |
| `text-text-primary` | Not a valid Tailwind class | `text-white` |
| `border-border-strong` | Not a valid Tailwind class | `border-[#555]` |
| `bg-page` | Not a valid Tailwind class | `bg-[#2c2c2c]` |
| `text-text-muted` | Not a valid Tailwind class | `text-[#999]` |
| CSS custom property names that don't exist | Causes invisible elements | Check Section 2 for real variables |
| Hardcoded `#3b82f6` for accent | Fragile if accent changes | `bg-accent` / `text-accent` (CSS var exists) |

---

## 13. Quick Reference — Full Token Map

For rapid lookup, here is every non-standard Tailwind class used in Kova mapped to its semantic meaning:

```
bg-[#2c2c2c]     → page background
bg-[#242424]      → title bar
bg-[#383838]      → elevated surface / card / input bg
bg-[#444]         → elevated hover / progress track / skeleton footer
bg-[#4a4a4a]      → skeleton grid items
bg-[#4b4b4b]      → disabled button
bg-[#3a3a3a]      → skeleton large block
bg-[#555]         → skeleton small / CTA placeholder
bg-[#666]         → skeleton text lines
bg-black/40       → image overlay

border-[#555]     → strong border (inputs, swatches)
border-border     → subtle border (dividers) — CSS var

text-white        → primary text
text-[#ccc]       → secondary text
text-[#999]       → muted text
text-[#aaa]       → faint text (labels)
text-[#888]       → disabled text
text-[#666]       → very faint icon fill
text-white/40     → disabled button text
placeholder-[#aaa] → input placeholder

text-accent       → accent text — CSS var
bg-accent         → accent bg — CSS var
border-accent     → accent border — CSS var
ring-accent/30    → focus glow

text-green-400    → success
text-red-400      → error text / icon
bg-red-600        → error toast
bg-amber-600      → warning toast
bg-blue-600       → info toast
bg-emerald-500/80 → online status
```
