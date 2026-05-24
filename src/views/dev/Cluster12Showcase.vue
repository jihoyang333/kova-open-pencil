<script setup lang="ts">
import { computed } from 'vue'

import KovaButton from '@/components/ui/KovaButton.vue'

import AccessibilityPanel from '@/components/settings/AccessibilityPanel.vue'
import NotificationsPanel from '@/components/settings/NotificationsPanel.vue'

import { usePreferencesStore } from '@/stores/preferences'
import { useUIStateStore } from '@/stores/ui-state'
import { usePreferencesModal } from '@/composables/use-preferences-modal'

const prefs = usePreferencesStore()
const ui = useUIStateStore()
const modal = usePreferencesModal()

const snapshot = computed(() => JSON.stringify(prefs.prefs, null, 2))
const uiSnapshot = computed(() =>
  JSON.stringify(
    {
      recentColors: ui.recentColors,
      pagesCollapsed: ui.pagesCollapsed,
      layersCollapsed: ui.layersCollapsed,
      sidebarLeftWidth: ui.sidebarLeftWidth,
      sidebarRightWidth: ui.sidebarRightWidth,
      lastActiveBrandId: ui.lastActiveBrandId,
      lastActiveCanvasId: ui.lastActiveCanvasId,
    },
    null,
    2,
  ),
)

function addSwatch(): void {
  const buf = new Uint8Array(3)
  crypto.getRandomValues(buf)
  const hex =
    '#' +
    Array.from(buf)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
  ui.pushRecentColor(hex)
}

function resetSwatches(): void {
  ui.recentColors = []
}
</script>

<template>
  <!-- token-exempt-file: dev preview surface. /dev/cluster-12 is the canonical
       Cluster 12 settings showcase — debug-chrome headings use raw px /
       arbitrary Tailwind values rather than production tokens. Not shipped to
       end users. Founder approved 2026-05-23. -->
  <div class="bg-[var(--bg)] text-[var(--ink)] h-full w-full overflow-y-auto">
    <div class="mx-auto max-w-[1000px] px-12 pt-8 pb-16">
      <header class="mb-10">
        <div class="text-[var(--ink-3)] uppercase tracking-widest text-[11px] mb-2">
          /dev/cluster-12 · settings showcase · W8c 2026-05-23
        </div>
        <h1 class="m-0 mb-2 text-[28px] font-semibold tracking-tight text-[var(--ink)]">
          Cluster 12 — Settings + User Preferences
        </h1>
        <p class="m-0 max-w-[720px] text-[var(--ink-2)] leading-[1.5]">
          Two-layer preferences architecture. Layer 1 = server-synced JSONB via
          <code>update_user_pref</code> RPC. Layer 2 = per-device localStorage.
          Reference: <code>docs/kova-final-impl-plans/12-settings-and-user-preferences-plan.md</code>.
        </p>
      </header>

      <section class="border-t border-[var(--line)] py-7">
        <h2 class="mt-0 mb-4 text-[15px] font-semibold text-[var(--ink)]">
          AccessibilityPanel — 3 controls (text size, reduce motion, high contrast)
        </h2>
        <p class="text-[var(--ink-3)] text-[12px] mb-4">
          Apply-immediately UX. Writes debounce to <code>update_user_pref</code> after 1s.
          DOM data-attrs drive CSS at <code>:root</code> — no component re-render.
        </p>
        <div class="max-w-[560px]">
          <AccessibilityPanel />
        </div>
      </section>

      <section class="border-t border-[var(--line)] py-7">
        <h2 class="mt-0 mb-4 text-[15px] font-semibold text-[var(--ink)]">
          NotificationsPanel — 2 toggles
        </h2>
        <p class="text-[var(--ink-3)] text-[12px] mb-4">
          Sync alerts gates <code>send-sync-alert</code> edge function at server-side.
        </p>
        <div class="max-w-[560px]">
          <NotificationsPanel />
        </div>
      </section>

      <section class="border-t border-[var(--line)] py-7">
        <h2 class="mt-0 mb-4 text-[15px] font-semibold text-[var(--ink)]">
          PreferencesModal — A8.3 (Cmd+, / App menu / Profile dropdown)
        </h2>
        <p class="text-[var(--ink-3)] text-[12px] mb-4">
          Globally mounted via App.vue. Trigger via <kbd>Cmd</kbd>+<kbd>,</kbd> or button below.
        </p>
        <KovaButton variant="primary" @click="modal.open('accessibility')">
          Open Accessibility modal
        </KovaButton>
      </section>

      <section class="border-t border-[var(--line)] py-7">
        <h2 class="mt-0 mb-4 text-[15px] font-semibold text-[var(--ink)]">
          UI state — recent colors FIFO (cap 12)
        </h2>
        <div class="flex gap-3 items-center mb-3">
          <KovaButton @click="addSwatch">Push random swatch</KovaButton>
          <KovaButton variant="ghost" @click="resetSwatches">Clear</KovaButton>
        </div>
        <div class="flex gap-1.5 flex-wrap items-center min-h-[28px]">
          <span
            v-for="c in ui.recentColors"
            :key="c"
            class="inline-block w-6 h-6 rounded border border-[var(--line)]"
            :style="{ backgroundColor: c }"
            :title="c"
          />
          <span
            v-if="ui.recentColors.length === 0"
            class="text-[var(--ink-3)] text-[12px]"
          >
            empty
          </span>
        </div>
      </section>

      <section class="border-t border-[var(--line)] py-7">
        <h2 class="mt-0 mb-4 text-[15px] font-semibold text-[var(--ink)]">
          Live state snapshots
        </h2>
        <div class="grid gap-4 grid-cols-2">
          <div>
            <div class="text-[11px] uppercase tracking-widest text-[var(--ink-3)] mb-1">
              prefs.prefs (Layer 1)
            </div>
            <pre
              class="text-[11px] leading-[1.5] p-3 rounded border border-[var(--line)] bg-[var(--bg-2)] text-[var(--ink-2)] overflow-auto max-h-[260px]"
              >{{ snapshot }}</pre
            >
          </div>
          <div>
            <div class="text-[11px] uppercase tracking-widest text-[var(--ink-3)] mb-1">
              ui-state (Layer 2 · localStorage)
            </div>
            <pre
              class="text-[11px] leading-[1.5] p-3 rounded border border-[var(--line)] bg-[var(--bg-2)] text-[var(--ink-2)] overflow-auto max-h-[260px]"
              >{{ uiSnapshot }}</pre
            >
          </div>
        </div>
      </section>
    </div>
  </div>
</template>
