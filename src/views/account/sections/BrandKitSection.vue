<script setup lang="ts">
// PRD 04 §6.4.1 / Phase 10 — Brand Kit section shell.
// Cluster 04 ships shell + brand-picker + 7-tab nav rail. Cluster 05 fills tabs.

import { ref } from 'vue'

import AccountSectionHeader from '@/components/account/AccountSectionHeader.vue'
import BrandPicker from '@/components/account/BrandPicker.vue'

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
        <div class="acc-stub" role="status">
          <p>Brand Kit tab content ships with Cluster 05.</p>
          <p class="mono">Active: {{ activeTab }}</p>
        </div>
      </div>
    </div>
  </section>
</template>
