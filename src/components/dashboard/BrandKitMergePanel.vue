<script setup lang="ts">
import { computed, reactive } from 'vue'

import type { ShopifyBrandKit } from '@/stores/brands'
import { applySelection, diffBrandKits, type KitDiffRow } from '@/utils/diff-brand-kit'

const props = defineProps<{
  current: ShopifyBrandKit
  proposed: ShopifyBrandKit
}>()

const emit = defineEmits<{
  apply: [kit: ShopifyBrandKit]
}>()

const rows = reactive<KitDiffRow[]>(diffBrandKits(props.current, props.proposed))

const hasChanges = computed(() => rows.length > 0)
const hasSelection = computed(() => rows.some((r) => r.selected))

function toggleRow(key: string): void {
  const row = rows.find((r) => r.key === key)
  if (row) row.selected = !row.selected
}

function handleApply(): void {
  emit('apply', applySelection(rows))
}
</script>

<template>
  <div data-test-id="brand-kit-merge-panel" class="rounded-xl border border-gray-200 bg-white p-5">
    <h2 class="text-sm font-semibold text-gray-900">Review Shopify changes</h2>

    <p
      v-if="!hasChanges"
      data-test-id="brand-kit-merge-no-changes"
      class="mt-4 text-sm text-gray-500"
    >
      Brand kit is already up to date.
    </p>

    <div v-else class="mt-4 flex flex-col gap-3">
      <div
        v-for="row in rows"
        :key="row.key"
        :data-test-id="`brand-kit-merge-row-${row.key}`"
        class="flex items-start gap-3 rounded-lg border border-gray-100 bg-gray-50 p-3"
      >
        <input
          :id="`merge-row-${row.key}`"
          :data-test-id="`brand-kit-merge-row-${row.key}-checkbox`"
          type="checkbox"
          :checked="row.selected"
          class="mt-0.5 size-4 cursor-pointer accent-gray-900"
          @change="toggleRow(row.key)"
        />
        <div class="min-w-0 flex-1">
          <label
            :for="`merge-row-${row.key}`"
            class="cursor-pointer text-sm font-medium text-gray-900"
          >
            {{ row.label }}
          </label>
          <div class="mt-1 flex items-center gap-2 text-xs text-gray-500">
            <span class="truncate line-through opacity-60">{{ row.current ?? '—' }}</span>
            <icon-lucide-arrow-right class="size-3 shrink-0" />
            <span class="truncate font-medium text-gray-900">{{ row.proposed }}</span>
          </div>
        </div>
      </div>

      <button
        data-test-id="brand-kit-merge-apply-btn"
        :disabled="!hasSelection"
        class="self-start rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
        @click="handleApply"
      >
        Apply selected
      </button>
    </div>
  </div>
</template>
