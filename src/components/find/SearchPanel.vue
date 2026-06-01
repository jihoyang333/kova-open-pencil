<script setup lang="ts">
// Find-on-this-page panel (PRD §12.12, CT-022 — 07b owns find). Slides in over the
// layers panel when find is active. Auto-focuses the input; Esc / × closes.
import { computed, nextTick, ref, watch } from 'vue'
import { useFindStore } from '@/stores/find'
import KovaIcon from '@/components/ui/KovaIcon.vue'
import SearchResultRow from './SearchResultRow.vue'

const findStore = useFindStore()
const inputRef = ref<HTMLInputElement | null>(null)

watch(
  () => findStore.active,
  async (active) => {
    if (active) {
      await nextTick()
      inputRef.value?.focus()
    }
  }
)

const resultCountLabel = computed(() => {
  const n = findStore.matchedNodeIds.length
  if (n === 0) return 'No results'
  return `${n} result${n === 1 ? '' : 's'} · This page`
})
</script>

<template>
  <div
    v-if="findStore.active"
    data-test="search-panel"
    class="absolute top-0 left-0 z-30 flex h-full w-64 flex-col border-r border-border bg-panel"
  >
    <div class="flex items-center justify-between border-b border-border p-2">
      <span class="text-xs font-medium text-ink">Find on this page</span>
      <button
        type="button"
        data-test="close-button"
        class="cursor-pointer text-ink-3 hover:text-ink"
        title="Close find"
        @click="findStore.close()"
      >
        <KovaIcon name="x" size="sm" />
      </button>
    </div>

    <div class="p-2">
      <input
        ref="inputRef"
        data-test="search-input"
        type="search"
        placeholder="Search layers..."
        class="w-full rounded border border-border bg-input px-2 py-1.5 text-xs text-ink placeholder:text-ink-3"
        :value="findStore.query"
        @input="findStore.setQuery(($event.target as HTMLInputElement).value)"
        @keydown.esc="findStore.close()"
      />
    </div>

    <div data-test="result-count" class="px-2 pb-1 text-[11px] text-ink-3">
      {{ resultCountLabel }}
    </div>

    <div class="flex-1 overflow-y-auto">
      <SearchResultRow
        v-for="nodeId in findStore.matchedNodeIds"
        :key="nodeId"
        :node-id="nodeId"
        :is-focused="findStore.focusedNodeId === nodeId"
        @click="findStore.focusNode(nodeId)"
      />
    </div>
  </div>
</template>
