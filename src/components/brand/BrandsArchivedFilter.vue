<script setup lang="ts">
import { useLocalStorage } from '@vueuse/core'
import { watch } from 'vue'

import KovaSelect from '@/components/ui/KovaSelect.vue'
import { useBrandsStore } from '@/stores/brands'

// W9b Cluster 03 — A2.a "Archived" filter dropdown (Plan 03 Task 33.5).
// Hide / Show / Only. Persisted to localStorage. Triggers lazy fetch on
// first non-Hide selection.

export type ArchivedFilter = 'hide' | 'show' | 'only'

const persisted = useLocalStorage<ArchivedFilter>('kova:brands:archivedFilter', 'hide')
const emit = defineEmits<{ (e: 'change', v: ArchivedFilter): void }>()
const store = useBrandsStore()

const OPTIONS = [
  { value: 'hide', label: 'Hide archived' },
  { value: 'show', label: 'Show archived' },
  { value: 'only', label: 'Only archived' },
] as const

// M11: { immediate: true } fires on mount with the persisted value (default
// 'hide'). The fetchArchivedBrands call is correctly skipped when the user
// hasn't opted into seeing archived rows — only the `change` emit fires —
// so the parent can sync its initial state from localStorage without an
// extra network round-trip.
watch(
  persisted,
  async (v) => {
    if (v !== 'hide') {
      await store.fetchArchivedBrands()
    }
    emit('change', v)
  },
  { immediate: true }
)
</script>

<template>
  <KovaSelect v-model="persisted" :options="OPTIONS" aria-label="Archived filter" />
</template>
