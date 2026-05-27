<script setup lang="ts">
/**
 * RightPanelTabs — Cluster 06 Task 15.
 *
 * Hi-fi source: Kova Canvas - Final.html `.kc .right .tabs` (lines 337-359).
 * Two-tab framework: Design + AI. Prototype tab explicitly NOT rendered
 * (founder ratification 2026-05-15).
 *
 * §12.13 RATIFIED 2026-05-17: default-active = AI on first canvas open.
 * §12.14 RATIFIED 2026-05-17: STICKY on layer-click — this component MUST
 * NOT subscribe to selection events.
 */
import { computed } from 'vue'
import { useRightPanelStore, type RightPanelTab } from '@/stores/right-panel'

const store = useRightPanelStore()

const activeTab = computed(() => store.activeTab)

function setTab(tab: RightPanelTab): void {
  store.setActiveTab(tab)
}
</script>

<template>
  <div
    class="flex items-stretch justify-between border-b border-line-2 px-[14px] gap-1 h-[var(--h-tabs)]"
    role="tablist"
    aria-label="Right panel tabs"
    data-testid="right-panel-tabs"
  >
    <div class="flex gap-1">
      <button
        type="button"
        role="tab"
        :aria-selected="activeTab === 'design'"
        :data-state="activeTab === 'design' ? 'active' : 'inactive'"
        data-tab="design"
        class="flex items-center text-[13px] my-2 px-[10px] rounded-[5px] font-medium"
        :class="activeTab === 'design' ? 'bg-fill text-ink' : 'text-ink-3 hover:text-ink-2'"
        @click="setTab('design')"
      >
        Design
      </button>
      <button
        type="button"
        role="tab"
        :aria-selected="activeTab === 'ai'"
        :data-state="activeTab === 'ai' ? 'active' : 'inactive'"
        data-tab="ai"
        class="flex items-center text-[13px] my-2 px-[10px] rounded-[5px] font-medium"
        :class="activeTab === 'ai' ? 'bg-fill text-ink' : 'text-ink-3 hover:text-ink-2'"
        @click="setTab('ai')"
      >
        AI
      </button>
    </div>
    <div class="flex items-center gap-1 text-ink-2 text-[12px]">
      <slot name="zoom" />
    </div>
  </div>
</template>
