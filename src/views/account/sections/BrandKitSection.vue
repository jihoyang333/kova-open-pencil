<script setup lang="ts">
// PRD 04 §6.4.1 / Phase 10 — Brand Kit section shell.
// Cluster 04 ships shell + brand-picker + 7-tab nav rail. Cluster 05 fills tabs.

import { defineAsyncComponent, ref } from 'vue'

import AccountSectionHeader from '@/components/account/AccountSectionHeader.vue'
import BrandPicker from '@/components/account/BrandPicker.vue'
import KovaSkeleton from '@/components/ui/KovaSkeleton.vue'

// Lazy-load each tab to keep initial bundle lean
const VisualsTab = defineAsyncComponent(() => import('@/components/brand-kit/VisualsTab.vue'))
const IdentityTab = defineAsyncComponent(() => import('@/components/brand-kit/IdentityTab.vue'))
const ToneSnippetsTab = defineAsyncComponent(() => import('@/components/brand-kit/ToneSnippetsTab.vue'))
const SavedBlocksTab = defineAsyncComponent(() => import('@/components/brand-kit/SavedBlocksTab.vue'))
const WritingRulesTab = defineAsyncComponent(() => import('@/components/brand-kit/WritingRulesTab.vue'))
const MemoriesTab = defineAsyncComponent(() => import('@/components/brand-kit/MemoriesTab.vue'))
const KbSourcesTab = defineAsyncComponent(() => import('@/components/brand-kit/KbSourcesTab.vue'))

import type { Component } from 'vue'

type BrandKitTab =
  | 'visuals'
  | 'identity'
  | 'tone-snippets'
  | 'saved-blocks'
  | 'writing-rules'
  | 'memories'
  | 'knowledge-base'

interface TabDef { key: BrandKitTab; label: string }

const TABS: readonly TabDef[] = [
  { key: 'visuals', label: 'Visuals' },
  { key: 'identity', label: 'Identity' },
  { key: 'tone-snippets', label: 'Tone snippets' },
  { key: 'saved-blocks', label: 'Saved blocks' },
  { key: 'writing-rules', label: 'Writing rules' },
  { key: 'memories', label: 'Memories' },
  { key: 'knowledge-base', label: 'Knowledge base' },
] as const

const TAB_COMPONENT: Record<BrandKitTab, Component> = {
  'visuals': VisualsTab,
  'identity': IdentityTab,
  'tone-snippets': ToneSnippetsTab,
  'saved-blocks': SavedBlocksTab,
  'writing-rules': WritingRulesTab,
  'memories': MemoriesTab,
  'knowledge-base': KbSourcesTab,
}

const activeTab = ref<BrandKitTab>('visuals')
</script>

<template>
  <section class="acc-section">
    <AccountSectionHeader title="Brand Kit" subtitle="Per-brand identity, voice, and assets.">
      <template #trailing>
        <Suspense>
          <BrandPicker />
          <template #fallback>
            <span class="acc-section-loading">Loading brands…</span>
          </template>
        </Suspense>
      </template>
    </AccountSectionHeader>

    <div class="bk-wrap">
      <nav class="bk-subnav" aria-label="Brand kit tabs">
        <button
          v-for="t in TABS"
          :key="t.key"
          type="button"
          class="bk-subnav-item"
          :class="{ 'is-active': activeTab === t.key }"
          @click="activeTab = t.key"
        >
          {{ t.label }}
        </button>
      </nav>
      <div class="bk-pane">
        <Suspense>
          <component :is="TAB_COMPONENT[activeTab]" />
          <template #fallback>
            <KovaSkeleton height="200px" variant="card" />
          </template>
        </Suspense>
      </div>
    </div>
  </section>
</template>
