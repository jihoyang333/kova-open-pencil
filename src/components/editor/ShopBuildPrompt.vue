<script setup lang="ts">
import {
  ToastAction,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastRoot,
  ToastViewport,
} from 'reka-ui'

defineProps<{
  visible: boolean
  productTitle: string
}>()

const emit = defineEmits<{
  confirm: []
  dismiss: []
}>()
</script>

<template>
  <ToastProvider :duration="0">
    <ToastRoot
      :open="visible"
      data-test-id="shop-build-prompt"
      class="pointer-events-auto flex w-72 flex-col gap-2 rounded-lg border border-border bg-panel p-3 shadow-lg"
    >
      <ToastDescription class="text-xs font-medium text-surface">
        Want me to build around this?
      </ToastDescription>
      <ToastDescription class="truncate text-[10px] text-muted">
        {{ productTitle }}
      </ToastDescription>
      <div class="flex gap-2">
        <ToastAction
          as-child
          alt-text="Design a hero section"
          @click="emit('confirm')"
        >
          <button
            data-test-id="shop-build-prompt-yes"
            class="rounded bg-accent px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-accent/90"
          >
            Yes, design a hero
          </button>
        </ToastAction>
        <ToastClose as-child @click="emit('dismiss')">
          <button
            data-test-id="shop-build-prompt-no"
            class="rounded border border-border px-2.5 py-1 text-xs text-muted transition-colors hover:text-surface"
          >
            No
          </button>
        </ToastClose>
      </div>
    </ToastRoot>
    <ToastViewport class="fixed bottom-6 right-6 z-50" />
  </ToastProvider>
</template>
