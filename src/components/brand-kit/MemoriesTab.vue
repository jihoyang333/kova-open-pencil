<script setup lang="ts">
// Cluster 05 — MemoriesTab.vue (PRD §3.7, A7.3.6)
// Consumer view of brand memories (Cluster 10 owns capture).
// Reads from useBrandMemoriesStore. No "Add" affordance.
// If Cluster 10's API shape changes this tab stays graceful — read-only list.
// TODO (Cluster 10 coupling): useBrandMemoriesStore does not yet expose
// updateMemory signature that takes (id, label, content) — only (id, content).
// Edit label is therefore not implemented; only content editing + delete.

import { computed, onMounted, ref } from 'vue'

import EmptyState from '@/components/ui/EmptyState.vue'
import KovaSkeleton from '@/components/ui/KovaSkeleton.vue'
import MemoryRow from './memories/MemoryRow.vue'
import { useBrandKitStore } from '@/stores/brand-kit'
import { useBrandMemoriesStore } from '@/stores/brand-memories'
import { useConfirm } from '@/composables/use-confirm'
import { toast } from '@/composables/use-toast'
import type { BrandMemory } from '@/types/kova/brand-memory'

const brandKitStore = useBrandKitStore()
const memoriesStore = useBrandMemoriesStore()
const confirm = useConfirm()

const memories = ref<BrandMemory[]>([])
const loading = ref(true)
const loadError = ref<string | null>(null)

const brandId = computed(() => brandKitStore.brandId)

onMounted(async () => {
  if (!brandId.value) { loading.value = false; return }
  try {
    memories.value = await memoriesStore.fetchMemories(brandId.value)
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : 'Failed to load memories'
  } finally {
    loading.value = false
  }
})

async function onDelete(id: string): Promise<void> {
  const mem = memories.value.find((m) => m.id === id)
  const ok = await confirm({
    title: 'Delete this memory?',
    body: mem ? `"${mem.content.slice(0, 60)}…" will be removed permanently.` : undefined,
    confirmLabel: 'Delete',
    destructive: true,
  })
  if (!ok) return
  try {
    await memoriesStore.deleteMemory(id)
    memories.value = memories.value.filter((m) => m.id !== id)
    toast.show('Memory deleted.')
  } catch (e) {
    toast.show(e instanceof Error ? e.message : 'Failed to delete', 'error')
  }
}
</script>

<template>
  <div class="bk-pane">
    <template v-if="loading">
      <KovaSkeleton v-for="i in 3" :key="i" height="44px" variant="card" />
    </template>

    <template v-else-if="loadError">
      <EmptyState icon="alert-triangle" headline="Failed to load memories" :body="loadError" />
    </template>

    <template v-else-if="memories.length === 0">
      <EmptyState
        icon="brain"
        headline="No memories yet"
        body="Memories are captured automatically during AI chat sessions."
      />
    </template>

    <template v-else>
      <div class="list-stack">
        <MemoryRow
          v-for="mem in memories"
          :key="mem.id"
          :memory="mem"
          @delete="onDelete"
        />
      </div>
    </template>
  </div>
</template>
