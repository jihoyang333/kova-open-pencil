<script setup lang="ts">
import { computed } from 'vue'
import type { Toast } from '@/types/toast'
import KovaIcon from './KovaIcon.vue'

const props = defineProps<{ toast: Toast }>()
const emit = defineEmits<{ dismiss: [id: string] }>()

const iconName = computed(() => {
  switch (props.toast.variant) {
    case 'success':
      return 'check'
    case 'error':
    case 'warning':
      return 'alert-triangle'
    case 'info':
    case 'default':
      return 'info'
    case 'progress':
      return 'loader'
    case 'ai-gen':
      return 'sparkles'
    case 'action':
      return ''
  }
})

function onCta() {
  props.toast.ctaHandler?.()
  emit('dismiss', props.toast.id)
}
</script>

<template>
  <div
    class="toast pointer-events-auto flex items-start gap-2 rounded-md border border-line bg-panel/90 p-3 text-sm text-ink shadow-lg backdrop-blur"
    :data-variant="toast.variant"
    role="status"
    aria-live="polite"
  >
    <KovaIcon v-if="iconName" :name="iconName" class="ic-lead mt-0.5" />
    <div class="body min-w-0 flex-1">
      <div class="msg">{{ toast.message }}</div>
      <div v-if="toast.meta" class="meta mt-0.5 text-xs text-ink-2">
        {{ toast.meta }}
      </div>
    </div>
    <div class="row-actions flex items-center gap-1">
      <button
        v-if="toast.ctaLabel"
        data-test="cta"
        class="btn text rounded-sm px-2 py-0.5 text-xs font-medium text-accent hover:bg-accent/10"
        type="button"
        @click="onCta"
      >
        {{ toast.ctaLabel }}
      </button>
      <button
        data-test="dismiss"
        class="x grid h-6 w-6 place-items-center rounded-sm text-ink-2 hover:bg-line-2 hover:text-ink"
        type="button"
        aria-label="Dismiss"
        @click="emit('dismiss', toast.id)"
      >
        <KovaIcon name="x" />
      </button>
    </div>
  </div>
</template>
