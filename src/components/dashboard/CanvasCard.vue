<script setup lang="ts">
import type { Canvas } from '@/types/kova/database'

defineProps<{ canvas: Canvas }>()
defineEmits<{
  open: []
  rename: [id: string, name: string]
  duplicate: [id: string]
}>()
</script>

<template>
  <div data-test-id="canvas-card" class="rounded-xl border border-gray-200 p-2">
    <div class="h-32 rounded-lg bg-gray-100" />
    <p class="mt-2 truncate text-sm text-gray-900">{{ canvas.name }}</p>
  </div>
</template>
