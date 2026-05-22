<script setup lang="ts">
import { computed } from 'vue'

import KovaIcon from '@/components/ui/KovaIcon.vue'

interface Swatch {
  name: string
  hex: string
  desc: string
}

interface ScaleEntry {
  name: string
  value: string
  fz: string
  lh: string
  fw: string
  tr: string
}

const surfaces: Swatch[] = [
  { name: '--page', hex: '#1a1a1d', desc: 'page + panels' },
  { name: '--rail', hex: '#1a1a1d', desc: 'sidebars, modal foot, popover search bg' },
  { name: '--bg', hex: '#242428', desc: 'canvas plate' },
  { name: '--fill', hex: '#26262b', desc: 'input idle' },
  { name: '--fill-2', hex: '#303035', desc: 'input active, segmented active' }
]

const lines: Swatch[] = [
  { name: '--line', hex: '#2c2c30', desc: 'structural hairline' },
  { name: '--line-2', hex: '#232327', desc: 'in-panel hairline' }
]

const ink: Swatch[] = [
  { name: '--ink', hex: '#ebebee', desc: 'primary text' },
  { name: '--ink-2', hex: '#a8a8ad', desc: 'secondary text' },
  { name: '--ink-3', hex: '#6e6e73', desc: 'labels, tertiary' },
  { name: '--ink-4', hex: '#4a4a4f', desc: 'disabled, icon dim' }
]

const accent: Swatch[] = [
  { name: '--accent', hex: '#3b82f6', desc: 'primary action, selection, active tool' },
  { name: '--accent-soft', hex: '#1d3a66', desc: 'selected-row tint' },
  { name: '--accent-2', hex: '#2a4d80', desc: '.pill.accent / .toast.ai border' },
  { name: '--accent-ink', hex: '#a9c4ff', desc: 'AI tool ink (Ask Kova)' },
  { name: '--accent-hover', hex: '#2563eb', desc: '.btn.accent hover' }
]

const status: Swatch[] = [
  { name: '--warn', hex: 'var(--ink-2)', desc: 'degraded to neutral (Ban 12)' },
  { name: '--warn-soft', hex: 'var(--fill)', desc: 'destructive menu hover' },
  { name: '--warn-edge', hex: 'var(--line)', desc: '.toast.error border' },
  { name: '--ok / --review', hex: 'var(--ink-2)', desc: 'reserved aliases (deferred Phase 2)' }
]

const radii: { name: string; value: string }[] = [
  { name: '--r-xs', value: '3px' },
  { name: '--r-sm', value: '4px' },
  { name: '--r-md', value: '5px' },
  { name: '--r-lg', value: '6px' },
  { name: '--r-xl', value: '7px' },
  { name: '--r-overlay', value: '8px' },
  { name: '--r-2xl', value: '10px' },
  { name: '--r-pill', value: '999px' }
]

const density: { name: string; value: string; desc: string }[] = [
  { name: '--h-control-xs', value: '26px', desc: 'segmented inner, menu item, modal close' },
  { name: '--h-control-sm', value: '28px', desc: 'compact rows (layer/page)' },
  { name: '--h-icon-btn', value: '28px', desc: 'topbar icon button' },
  { name: '--h-control', value: '30px', desc: 'default input + button' },
  { name: '--h-tool', value: '36px', desc: 'toolbar tool' },
  { name: '--h-topbar', value: '44px', desc: 'topbar' },
  { name: '--h-tabs', value: '44px', desc: 'tabs row' }
]

const typeScale: ScaleEntry[] = [
  { name: '--t-overline', value: 'PAGES', fz: '11px', lh: '1.2', fw: '500', tr: '0.04em (UPPER)' },
  { name: '--t-label', value: 'Label text', fz: '12px', lh: '1.3', fw: '500', tr: '-0.003em' },
  { name: '--t-body', value: 'Body — input values + list rows', fz: '12.5px', lh: '1.35', fw: '400', tr: '0' },
  { name: '--t-body-strong', value: 'Active row label', fz: '12.5px', lh: '1.35', fw: '500', tr: '0' },
  { name: '--t-title-sm', value: 'Group title (Position, Layout)', fz: '13px', lh: '1.3', fw: '600', tr: '-0.005em' },
  { name: '--t-title-md', value: 'Panel header', fz: '15px', lh: '1.3', fw: '600', tr: '-0.005em' },
  { name: '--t-meta', value: 'Meta under file row', fz: '11.5px', lh: '1.3', fw: '400', tr: '0' },
  { name: '--t-input', value: 'Input value (canonical .input)', fz: '13px', lh: '1.35', fw: '400', tr: '0' },
  { name: '--t-modal-title', value: 'Modal title (.dlg-head h3)', fz: '16px', lh: '1.3', fw: '600', tr: '-0.005em' },
  { name: '--t-action-12', value: 'Toast action / ghost-link', fz: '12px', lh: '1', fw: '500', tr: '-0.003em' },
  { name: '--t-sublabel', value: 'Sub-label (avatar plan)', fz: '10.5px', lh: '1.3', fw: '400', tr: '0' },
  { name: '--t-microcopy', value: 'Microcopy (avatar logo)', fz: '10px', lh: '1.3', fw: '400', tr: '0' }
]

const shadows: { name: string; desc: string }[] = [
  { name: '--shadow-elev-1', desc: 'Toast, toolbar, zoom HUD' },
  { name: '--shadow-elev-2', desc: 'Popover, tooltip' },
  { name: '--shadow-elev-2-menu', desc: 'DropdownMenu' },
  { name: '--shadow-elev-3', desc: 'Modal' }
]

const motion: { name: string; value: string; desc: string }[] = [
  { name: '--motion-fast', value: '100ms', desc: 'button + input transitions' },
  { name: '--motion-normal', value: '200ms', desc: 'modal/popover/menu entry' },
  { name: '--motion-skeleton', value: '1400ms', desc: 'shimmer (only gradient — Ban 5 exception)' },
  { name: '--motion-toast-enter', value: '200ms', desc: 'toast pop-in' },
  { name: '--motion-toast-exit', value: '150ms', desc: 'toast fade-out' }
]

const zScale: { name: string; value: string; desc: string }[] = [
  { name: '--z-base', value: '0', desc: 'normal flow' },
  { name: '--z-popover', value: '10', desc: 'Popover' },
  { name: '--z-dropdown', value: '12', desc: 'DropdownMenu + Tooltip' },
  { name: '--z-modal-backdrop', value: '19', desc: 'modal backdrop' },
  { name: '--z-modal', value: '20', desc: 'modal content' },
  { name: '--z-toast', value: '30', desc: 'toast stack (above modal)' }
]

const spacingScale: number[] = [2, 4, 6, 8, 10, 12, 14, 16, 20, 24, 32]

const positionalOffsets: { name: string; value: string }[] = [
  { name: '--toolbar-bottom', value: '22px' },
  { name: '--zoom-hud-bottom', value: '22px' },
  { name: '--zoom-hud-right', value: '22px' },
  { name: '--frame-label-offset', value: '24px' },
  { name: '--frame-outline', value: '2px' },
  { name: '--handle-size', value: '9px' },
  { name: '--handle-border', value: '1.5px' },
  { name: '--size-chip-offset', value: '36px' },
  { name: '--floating-help-bottom', value: '14px' },
  { name: '--floating-help-size', value: '28px' }
]

const ts = computed(() => new Date().toISOString())
</script>

<template>
  <!-- token-exempt-file: dev preview surface. /dev/tokens is the canonical-token
       reference page — it RENDERS raw hex / px / scale values so the founder
       can read them. Banning raw values here would defeat the page's purpose.
       Not shipped to end users. Founder approved 2026-05-21. -->
  <div class="bg-[var(--bg)] text-[var(--ink)] h-full w-full overflow-y-auto">
    <div class="mx-auto max-w-[1200px] px-12 pt-8 pb-16">
      <header class="mb-10">
        <div class="text-[var(--ink-3)] uppercase tracking-widest text-[11px] mb-2">
          /dev/tokens · Cluster 11 W6 REDO 2026-05-20 · {{ ts }}
        </div>
        <h1 class="m-0 mb-2 text-[28px] font-semibold tracking-tight text-[var(--ink)]">
          Kova design tokens — visual debug
        </h1>
        <p class="m-0 max-w-[720px] text-[var(--ink-2)] leading-[1.5]">
          Every token from canonical <code>kova-hifi.css :root</code> rendered as a swatch + sample.
          Reference: <code>design-system/canonical/TOKEN_CANONICAL.md</code> +
          <code>docs/execution-phase/cluster-audits/cluster-11-tokens-used.md</code>.
        </p>
      </header>

      <section class="border-t border-[var(--line)] py-7">
        <h2 class="mt-0 mb-4 text-[15px] font-semibold tracking-tight text-[var(--ink)]">Surfaces (R-1 + canonical)</h2>
        <div class="grid gap-3 grid-cols-[repeat(auto-fill,minmax(260px,1fr))]">
          <div v-for="s in surfaces" :key="s.name"
            class="flex gap-3 items-center p-3 border border-[var(--line)] rounded-md bg-[var(--page)]">
            <div class="w-9 h-9 border border-[var(--line)] rounded-sm flex-shrink-0"
              :style="{ background: `var(${s.name})` }" />
            <div class="flex flex-col gap-0.5 min-w-0">
              <b class="text-[12.5px] font-medium text-[var(--ink)]">{{ s.name }}</b>
              <span class="text-[11.5px] text-[var(--ink-3)]">{{ s.hex }}</span>
              <span class="text-[11.5px] text-[var(--ink-2)]">{{ s.desc }}</span>
            </div>
          </div>
        </div>
      </section>

      <section class="border-t border-[var(--line)] py-7">
        <h2 class="mt-0 mb-4 text-[15px] font-semibold text-[var(--ink)]">Lines</h2>
        <div class="grid gap-3 grid-cols-[repeat(auto-fill,minmax(260px,1fr))]">
          <div v-for="s in lines" :key="s.name"
            class="flex gap-3 items-center p-3 border border-[var(--line)] rounded-md bg-[var(--page)]">
            <div class="w-9 h-9 border border-[var(--line)] rounded-sm flex-shrink-0"
              :style="{ background: `var(${s.name})` }" />
            <div class="flex flex-col gap-0.5 min-w-0">
              <b class="text-[12.5px] font-medium text-[var(--ink)]">{{ s.name }}</b>
              <span class="text-[11.5px] text-[var(--ink-3)]">{{ s.hex }}</span>
              <span class="text-[11.5px] text-[var(--ink-2)]">{{ s.desc }}</span>
            </div>
          </div>
        </div>
      </section>

      <section class="border-t border-[var(--line)] py-7">
        <h2 class="mt-0 mb-4 text-[15px] font-semibold text-[var(--ink)]">Ink (text)</h2>
        <div class="grid gap-3 grid-cols-[repeat(auto-fill,minmax(260px,1fr))]">
          <div v-for="s in ink" :key="s.name"
            class="flex gap-3 items-center p-3 border border-[var(--line)] rounded-md bg-[var(--page)]">
            <div class="w-9 h-9 border border-[var(--line)] rounded-sm flex-shrink-0"
              :style="{ background: `var(${s.name})` }" />
            <div class="flex flex-col gap-0.5 min-w-0">
              <b class="text-[12.5px] font-medium text-[var(--ink)]">{{ s.name }}</b>
              <span class="text-[11.5px] text-[var(--ink-3)]">{{ s.hex }}</span>
              <span class="text-[11.5px] text-[var(--ink-2)]">{{ s.desc }}</span>
            </div>
          </div>
        </div>
        <div class="flex gap-6 py-3 flex-wrap text-[12.5px] mt-3">
          <span class="text-[var(--ink)]">Primary --ink</span>
          <span class="text-[var(--ink-2)]">Secondary --ink-2</span>
          <span class="text-[var(--ink-3)]">Tertiary --ink-3</span>
          <span class="text-[var(--ink-4)]">Dim --ink-4</span>
        </div>
      </section>

      <section class="border-t border-[var(--line)] py-7">
        <h2 class="mt-0 mb-4 text-[15px] font-semibold text-[var(--ink)]">Accent (one accent only)</h2>
        <div class="grid gap-3 grid-cols-[repeat(auto-fill,minmax(260px,1fr))]">
          <div v-for="s in accent" :key="s.name"
            class="flex gap-3 items-center p-3 border border-[var(--line)] rounded-md bg-[var(--page)]">
            <div class="w-9 h-9 border border-[var(--line)] rounded-sm flex-shrink-0"
              :style="{ background: `var(${s.name})` }" />
            <div class="flex flex-col gap-0.5 min-w-0">
              <b class="text-[12.5px] font-medium text-[var(--ink)]">{{ s.name }}</b>
              <span class="text-[11.5px] text-[var(--ink-3)]">{{ s.hex }}</span>
              <span class="text-[11.5px] text-[var(--ink-2)]">{{ s.desc }}</span>
            </div>
          </div>
        </div>
      </section>

      <section class="border-t border-[var(--line)] py-7">
        <h2 class="mt-0 mb-4 text-[15px] font-semibold text-[var(--ink)]">Status aliases (degraded — Ban 12)</h2>
        <div class="grid gap-3 grid-cols-[repeat(auto-fill,minmax(260px,1fr))]">
          <div v-for="s in status" :key="s.name"
            class="flex gap-3 items-center p-3 border border-[var(--line)] rounded-md bg-[var(--page)]">
            <div class="w-9 h-9 border border-[var(--line)] rounded-sm flex-shrink-0"
              :style="{ background: `var(${s.name})` }" />
            <div class="flex flex-col gap-0.5 min-w-0">
              <b class="text-[12.5px] font-medium text-[var(--ink)]">{{ s.name }}</b>
              <span class="text-[11.5px] text-[var(--ink-3)]">{{ s.hex }}</span>
              <span class="text-[11.5px] text-[var(--ink-2)]">{{ s.desc }}</span>
            </div>
          </div>
        </div>
      </section>

      <section class="border-t border-[var(--line)] py-7">
        <h2 class="mt-0 mb-4 text-[15px] font-semibold text-[var(--ink)]">Radii</h2>
        <div class="flex gap-4 flex-wrap">
          <div v-for="r in radii" :key="r.name"
            class="flex flex-col gap-1 items-center p-3 border border-[var(--line)] rounded-md bg-[var(--page)] min-w-[96px]">
            <div class="w-12 h-12 bg-[var(--fill-2)] border border-[var(--line)]"
              :style="{ borderRadius: `var(${r.name})` }" />
            <b class="text-[11.5px] font-medium text-[var(--ink)]">{{ r.name }}</b>
            <span class="text-[10.5px] text-[var(--ink-3)]">{{ r.value }}</span>
          </div>
        </div>
      </section>

      <section class="border-t border-[var(--line)] py-7">
        <h2 class="mt-0 mb-4 text-[15px] font-semibold text-[var(--ink)]">Density (heights)</h2>
        <div class="flex flex-col gap-2">
          <div v-for="d in density" :key="d.name" class="flex gap-4 items-center">
            <div class="bg-[var(--accent)] rounded-sm w-20 flex items-center justify-center text-[var(--ink-on-primary)] text-[11.5px] font-medium"
              :style="{ height: `var(${d.name})` }">
              {{ d.value }}
            </div>
            <div class="flex flex-col gap-0.5">
              <b class="text-[12.5px] font-medium text-[var(--ink)]">{{ d.name }}</b>
              <span class="text-[11.5px] text-[var(--ink-3)]">{{ d.desc }}</span>
            </div>
          </div>
        </div>
      </section>

      <section class="border-t border-[var(--line)] py-7">
        <h2 class="mt-0 mb-4 text-[15px] font-semibold text-[var(--ink)]">Typography scale (R-8)</h2>
        <div class="flex flex-col gap-5 p-4 border border-[var(--line)] rounded-md bg-[var(--page)]">
          <div v-for="t in typeScale" :key="t.name" class="flex flex-col gap-1">
            <div
              :style="{
                fontSize: `var(${t.name}-fz)`,
                lineHeight: `var(${t.name}-lh)`,
                fontWeight: `var(${t.name}-fw)`,
                letterSpacing: `var(${t.name}-tr)`,
                color: 'var(--ink)',
                textTransform: t.name === '--t-overline' ? 'uppercase' : 'none'
              }"
            >
              {{ t.value }}
            </div>
            <div class="flex gap-3 text-[10.5px] text-[var(--ink-3)]">
              <b class="text-[var(--ink-2)] font-medium">{{ t.name }}</b>
              <span>{{ t.fz }} / lh {{ t.lh }} / {{ t.fw }} / tr {{ t.tr }}</span>
            </div>
          </div>
        </div>
      </section>

      <section class="border-t border-[var(--line)] py-7">
        <h2 class="mt-0 mb-4 text-[15px] font-semibold text-[var(--ink)]">Shadows (R-11)</h2>
        <div class="flex gap-6 flex-wrap py-8">
          <div v-for="s in shadows" :key="s.name" class="flex flex-col gap-2 items-center">
            <div class="w-32 h-20 bg-[var(--page)] border border-[var(--line)]"
              :style="{ boxShadow: `var(${s.name})`, borderRadius: 'var(--r-overlay)' }" />
            <b class="text-[11.5px] font-medium text-[var(--ink)]">{{ s.name }}</b>
            <span class="text-[10.5px] text-[var(--ink-3)] max-w-40 text-center">{{ s.desc }}</span>
          </div>
        </div>
      </section>

      <section class="border-t border-[var(--line)] py-7">
        <h2 class="mt-0 mb-4 text-[15px] font-semibold text-[var(--ink)]">Motion (R-12)</h2>
        <div class="grid gap-3 grid-cols-[repeat(auto-fill,minmax(220px,1fr))] mb-4">
          <div v-for="m in motion" :key="m.name"
            class="flex flex-col gap-0.5 p-3 border border-[var(--line)] rounded-md bg-[var(--page)]">
            <b class="text-[12.5px] font-medium text-[var(--ink)]">{{ m.name }}</b>
            <span class="text-[11.5px] text-[var(--accent-ink)]">{{ m.value }}</span>
            <span class="text-[11.5px] text-[var(--ink-3)]">{{ m.desc }}</span>
          </div>
        </div>
        <div class="flex gap-3 items-center">
          <div class="skeleton" style="width: 200px; height: 18px;" />
          <span class="text-[var(--ink-3)] text-[11.5px]">.skeleton — shimmer at var(--motion-skeleton)</span>
        </div>
      </section>

      <section class="border-t border-[var(--line)] py-7">
        <h2 class="mt-0 mb-4 text-[15px] font-semibold text-[var(--ink)]">Z-scale (R-13)</h2>
        <ul class="grid gap-1.5 grid-cols-[repeat(auto-fill,minmax(280px,1fr))] m-0 p-0 list-none text-[12.5px]">
          <li v-for="z in zScale" :key="z.name"
            class="text-[var(--ink-2)] py-1.5 border-b border-[var(--line-2)]">
            <b class="text-[var(--ink)] font-medium">{{ z.name }}</b>
            <span class="text-[var(--accent-ink)]"> {{ z.value }}</span>
            — <span class="text-[var(--ink-3)]">{{ z.desc }}</span>
          </li>
        </ul>
      </section>

      <section class="border-t border-[var(--line)] py-7">
        <h2 class="mt-0 mb-4 text-[15px] font-semibold text-[var(--ink)]">Spacing scale (2 / 4 / 6 / 8 / 10 / 12 / 14 / 16 / 20 / 24 / 32)</h2>
        <div class="flex gap-3 items-end flex-wrap">
          <div v-for="px in spacingScale" :key="px"
            class="bg-[var(--accent)] flex items-center justify-center text-[var(--ink-on-primary)] rounded-sm text-[10px] flex-shrink-0"
            :style="{ width: `${px}px`, height: `${px}px` }">
            <span>{{ px }}</span>
          </div>
        </div>
      </section>

      <section class="border-t border-[var(--line)] py-7">
        <h2 class="mt-0 mb-4 text-[15px] font-semibold text-[var(--ink)]">Positional offsets</h2>
        <ul class="grid gap-1.5 grid-cols-[repeat(auto-fill,minmax(280px,1fr))] m-0 p-0 list-none text-[12.5px]">
          <li v-for="o in positionalOffsets" :key="o.name"
            class="text-[var(--ink-2)] py-1.5 border-b border-[var(--line-2)]">
            <b class="text-[var(--ink)] font-medium">{{ o.name }}</b>
            <span class="text-[var(--accent-ink)]"> {{ o.value }}</span>
          </li>
        </ul>
      </section>

      <section class="border-t border-[var(--line)] py-7">
        <h2 class="mt-0 mb-4 text-[15px] font-semibold text-[var(--ink)]">
          Lifted primitives (Q-D D1 — canonical .btn / .input / .pill from kova-hifi.css)
        </h2>
        <div class="flex gap-3 flex-wrap items-center mb-4">
          <button class="btn">Default btn</button>
          <button class="btn primary">Primary</button>
          <button class="btn accent">Accent</button>
          <button class="btn ghost">Ghost</button>
          <button class="btn sm">Small</button>
          <button class="btn icon" aria-label="Plus">
            <KovaIcon name="plus" size="sm" class="ic" aria-hidden="true" />
          </button>
          <button class="btn" disabled>Disabled</button>
        </div>
        <div class="flex gap-3 flex-wrap items-center mb-4">
          <span class="pill">Neutral</span>
          <span class="pill accent">Accent</span>
          <span class="pill outline">Outline</span>
          <span class="pill dot">With dot</span>
        </div>
        <div class="flex gap-3 flex-wrap items-center mb-4 max-w-[480px]">
          <input class="input" placeholder="Input default" />
          <input class="input" disabled placeholder="Disabled" />
        </div>
      </section>

      <section class="border-t border-[var(--line)] py-7">
        <h2 class="mt-0 mb-4 text-[15px] font-semibold text-[var(--ink)]">
          Lifted overlays — .toast / .popover / .menu / .empty-pane / .skeleton / .tooltip
        </h2>
        <p class="text-[var(--ink-3)] text-[11.5px] mb-4">
          Rendered inline (not floating) so this debug page shows every state. Real overlays portal + position via Reka UI per Phase 3.
        </p>
        <div class="grid gap-6 grid-cols-[repeat(auto-fill,minmax(280px,1fr))]">
          <div>
            <h3 class="m-0 mb-2 text-[13px] font-semibold text-[var(--ink-2)]">Toast</h3>
            <div class="toast success" style="position: static;">
              <KovaIcon name="check" size="sm" class="ic-lead" aria-hidden="true" />
              <div class="body">
                <div class="msg">Canvas saved <b>"Homepage"</b></div>
                <div class="meta">2s ago</div>
              </div>
              <div class="dismiss" aria-label="Dismiss">
                <KovaIcon name="x" size="sm" class="ic" aria-hidden="true" />
              </div>
            </div>
            <div class="toast error" style="position: static; margin-top: 8px;">
              <KovaIcon name="alert-triangle" size="sm" class="ic-lead" aria-hidden="true" />
              <div class="body">
                <div class="msg">Export failed</div>
                <div class="meta">PNG too large</div>
              </div>
              <div class="dismiss" aria-label="Dismiss">
                <KovaIcon name="x" size="sm" class="ic" aria-hidden="true" />
              </div>
            </div>
            <div class="toast ai" style="position: static; margin-top: 8px;">
              <KovaIcon name="sparkles" size="sm" class="ic-lead" aria-hidden="true" />
              <div class="body"><div class="msg">AI generated 5 color combos</div></div>
              <div class="dismiss" aria-label="Dismiss">
                <KovaIcon name="x" size="sm" class="ic" aria-hidden="true" />
              </div>
            </div>
          </div>
          <div>
            <h3 class="m-0 mb-2 text-[13px] font-semibold text-[var(--ink-2)]">Popover (avatar variant)</h3>
            <div class="popover avatar" style="position: static; width: 240px;">
              <div class="pop-hdr">
                <div class="row1">
                  <div class="av">JY</div>
                  <div class="who"><b>Jiho Yang</b><span>jiho.yang@kova.app</span></div>
                  <div class="plan">PRO</div>
                </div>
              </div>
              <div class="pop-item">Account settings</div>
              <div class="pop-item">Sign out</div>
              <div class="pop-item disabled">What's new</div>
            </div>
          </div>
          <div>
            <h3 class="m-0 mb-2 text-[13px] font-semibold text-[var(--ink-2)]">Menu</h3>
            <div class="menu" style="position: static; width: 240px;">
              <div class="item"><span class="lbl">Duplicate</span><span class="kbd-row">⌘D</span></div>
              <div class="item"><span class="lbl">Cut</span><span class="kbd-row">⌘X</span></div>
              <div class="sep" />
              <div class="item destructive"><span class="lbl">Move to trash</span><span class="kbd-row">⌫</span></div>
            </div>
          </div>
          <div>
            <h3 class="m-0 mb-2 text-[13px] font-semibold text-[var(--ink-2)]">Empty pane (inline-32 + panel-40)</h3>
            <div class="empty-pane inline">
              <div class="ic-wrap">
                <KovaIcon name="search" size="md" class="ic" aria-hidden="true" />
              </div>
              <h5>No memories match <span class="q">"shipping"</span></h5>
              <p>Try a different keyword.</p>
              <div class="cta-row">
                <button class="ghost-link">Clear search</button>
              </div>
            </div>
            <div class="empty-pane" style="margin-top: 12px;">
              <div class="ic-wrap">
                <KovaIcon name="plus" size="md" class="ic" aria-hidden="true" />
              </div>
              <h5>No brands yet</h5>
              <p>Add a brand to get started.</p>
              <div class="cta-row">
                <button class="btn primary">New brand</button>
              </div>
            </div>
          </div>
          <div>
            <h3 class="m-0 mb-2 text-[13px] font-semibold text-[var(--ink-2)]">Skeleton</h3>
            <div class="flex flex-col gap-2 w-60">
              <div class="skeleton r-circle" style="width: 32px; height: 32px;" />
              <div class="skeleton r-line" style="width: 100%; height: 12px;" />
              <div class="skeleton r-line" style="width: 70%; height: 12px;" />
              <div class="skeleton r-card" style="width: 100%; height: 80px;" />
            </div>
          </div>
          <div>
            <h3 class="m-0 mb-2 text-[13px] font-semibold text-[var(--ink-2)]">Tooltip</h3>
            <div class="tooltip" style="position: static; display: inline-block; pointer-events: auto;">
              Token-driven tooltip body
            </div>
          </div>
        </div>
      </section>

      <footer class="border-t border-[var(--line)] pt-6 mt-6">
        <p class="text-[var(--ink-3)] text-[11.5px]">
          Phase 2 token-additions complete. Phase 3 (primitive Vue SFCs) starts after founder approves this page.
        </p>
      </footer>
    </div>
  </div>
</template>
