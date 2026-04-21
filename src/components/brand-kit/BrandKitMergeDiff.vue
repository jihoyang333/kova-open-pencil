<script setup lang="ts">
import { computed, reactive } from 'vue'

import { useBrandsStore, type ShopifyBrandKit } from '@/stores/brands'
import { applySelection, diffBrandKits } from '@/utils/diff-brand-kit'

const props = defineProps<{
  brandId: string
  current: ShopifyBrandKit
  proposed: ShopifyBrandKit
}>()

const emit = defineEmits<{
  applied: []
}>()

const store = useBrandsStore()
const rows = reactive(diffBrandKits(props.current, props.proposed))

const hasChanges = computed(() => rows.length > 0)

function setChoice(key: string, useShopify: boolean): void {
  const row = rows.find((r) => r.key === key)
  if (row) row.selected = useShopify
}

async function handleApply(): Promise<void> {
  await store.applyShopifyMerge(props.brandId, applySelection(rows))
  emit('applied')
}
</script>

<template>
  <div data-test-id="brand-kit-merge-diff" class="rounded-xl border border-gray-200 bg-white p-5">
    <h2 class="text-sm font-semibold text-gray-900">Review Shopify changes</h2>

    <p
      v-if="!hasChanges"
      data-test-id="brand-kit-merge-diff-no-changes"
      class="mt-4 text-sm text-gray-500"
    >
      Brand kit is already up to date.
    </p>

    <div v-else class="mt-4 flex flex-col gap-3">
      <fieldset
        v-for="row in rows"
        :key="row.key"
        :data-test-id="`brand-kit-merge-diff-row-${row.key}`"
        class="rounded-lg border border-gray-100 bg-gray-50 p-3"
      >
        <legend class="px-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
          {{ row.label }}
        </legend>

        <div class="mt-2 flex flex-col gap-2">
          <label
            :data-test-id="`brand-kit-merge-diff-row-${row.key}-current-label`"
            class="flex cursor-pointer items-center gap-2 text-sm"
          >
            <input
              :data-test-id="`brand-kit-merge-diff-row-${row.key}-current`"
              type="radio"
              :name="`merge-${row.key}`"
              :checked="!row.selected"
              class="accent-gray-900"
              @change="setChoice(row.key, false)"
            />
            <span class="w-14 shrink-0 text-xs text-gray-500">Current</span>
            <span class="truncate font-mono text-xs text-gray-700">{{ row.current ?? '—' }}</span>
          </label>

          <label
            :data-test-id="`brand-kit-merge-diff-row-${row.key}-shopify-label`"
            class="flex cursor-pointer items-center gap-2 text-sm"
          >
            <input
              :data-test-id="`brand-kit-merge-diff-row-${row.key}-shopify`"
              type="radio"
              :name="`merge-${row.key}`"
              :checked="row.selected"
              class="accent-gray-900"
              @change="setChoice(row.key, true)"
            />
            <span class="w-14 shrink-0 text-xs font-medium text-gray-900">Shopify</span>
            <span class="truncate font-mono text-xs font-medium text-gray-900">{{ row.proposed }}</span>
          </label>
        </div>
      </fieldset>

      <button
        data-test-id="brand-kit-merge-diff-apply-btn"
        class="self-start rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700"
        @click="handleApply"
      >
        Apply selected
      </button>
    </div>
  </div>
</template>
