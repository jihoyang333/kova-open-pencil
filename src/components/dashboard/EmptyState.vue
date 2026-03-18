<script setup lang="ts">
defineProps<{
  title: string
  description: string
  actionLabel?: string
  actionDisabled?: boolean
}>()

const emit = defineEmits<{
  action: []
}>()
</script>

<template>
  <div
    data-test-id="empty-state"
    class="flex flex-col items-center justify-center py-20 text-center"
  >
    <div class="mb-4 flex size-12 items-center justify-center rounded-full bg-gray-100">
      <icon-lucide-file-plus class="size-6 text-gray-400" />
    </div>
    <h2 class="text-base font-semibold text-gray-900">{{ title }}</h2>
    <p class="mt-1 max-w-sm text-sm text-gray-500">{{ description }}</p>
    <button
      v-if="actionLabel"
      data-test-id="empty-state-action"
      class="mt-4 rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
      :disabled="actionDisabled"
      @click="emit('action')"
    >
      {{ actionLabel }}
    </button>
  </div>
</template>
