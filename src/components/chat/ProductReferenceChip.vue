<script setup lang="ts">
import { computed } from 'vue'

import KovaIcon from '@/components/ui/KovaIcon.vue'

import type { ChatProductReference } from '@/types/kova/chat'

const { reference } = defineProps<{
  reference: ChatProductReference
}>()

const emit = defineEmits<{
  remove: []
}>()

const monogram = computed(() => reference.title.slice(0, 1).toUpperCase())

const tooltip = computed(() => {
  const range =
    reference.price_high && reference.price_high !== reference.price_low
      ? `${reference.price_low}–${reference.price_high} ${reference.currency}`
      : `${reference.price_low} ${reference.currency}`
  return `${reference.title} · ${range}`
})
</script>

<template>
  <div
    data-test-id="product-reference-chip"
    class="group relative flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-input px-1.5 py-1"
    :title="tooltip"
  >
    <img
      v-if="reference.primary_image_url"
      :src="reference.primary_image_url"
      :alt="reference.title"
      class="size-6 rounded-md object-cover"
    />
    <div
      v-else
      data-test-id="chip-monogram"
      class="flex size-6 items-center justify-center rounded-md bg-fill-2 text-[10px] font-bold text-muted"
    >
      {{ monogram }}
    </div>
    <span data-test-id="chip-title" class="max-w-[120px] truncate text-[11px] text-surface">
      {{ reference.title }}
    </span>
    <button
      type="button"
      data-test-id="chip-remove"
      class="flex size-4 items-center justify-center rounded-full text-muted opacity-60 transition-opacity hover:bg-hover hover:text-surface hover:opacity-100 focus-visible:opacity-100"
      :aria-label="`Remove ${reference.title}`"
      @click="emit('remove')"
    >
      <KovaIcon name="x" size="xs" />
    </button>
  </div>
</template>
