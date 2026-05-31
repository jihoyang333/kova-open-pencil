<script setup lang="ts">
// Cluster 05 — IdentityTab.vue (PRD §3.3, A7.3.2)
// Three narrative cards: About · Voice & tone · Story & origin.
// "Draft via interview" hidden per §12.3 ratification (BRAND_KIT_AI_INTERVIEW_ENABLED=false).

import { ref } from 'vue'

import IdentityCard from './identity/IdentityCard.vue'
import { useBrandKitStore } from '@/stores/brand-kit'
import type { IdentityCardKey } from '@/types/brand-kit'

const CARD_KEYS: IdentityCardKey[] = ['about', 'voice', 'story']

const store = useBrandKitStore()
const savingKey = ref<IdentityCardKey | null>(null)

async function onSave(key: IdentityCardKey, content: string): Promise<void> {
  savingKey.value = key
  try {
    await store.updateIdentityCard(key, content)
  } finally {
    savingKey.value = null
  }
}
</script>

<template>
  <div class="bk-pane">
    <IdentityCard
      v-for="key in CARD_KEYS"
      :key="key"
      :card-key="key"
      :card="store.identity[key]"
      :saving="savingKey === key"
      @save="onSave"
    />
  </div>
</template>
