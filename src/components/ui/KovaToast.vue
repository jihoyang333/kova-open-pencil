<script setup lang="ts">
import { computed } from 'vue'

import KovaIcon from '@/components/ui/KovaIcon.vue'

import type { Toast } from '@/stores/toast'
import { defaultIcon } from '@/stores/toast'

/**
 * Single toast — consumes `.toast` + variant classes from kova-hifi.css.
 * Stack mounted globally by ToastStack.vue.
 */

const props = defineProps<{ toast: Toast }>()

const emit = defineEmits<{
  (e: 'dismiss', id: string): void
  (e: 'action', payload: { toastId: string; index: number }): void
}>()

const klass = computed(() => `toast ${props.toast.variant}`)
const icon = computed(() => props.toast.icon ?? defaultIcon(props.toast.variant))
</script>

<template>
  <div :class="klass" role="status" aria-live="polite">
    <KovaIcon :name="icon" size="sm" class="ic-lead" aria-hidden="true" />
    <div class="body">
      <div class="msg">{{ toast.message }}</div>
      <div v-if="toast.meta" class="meta">{{ toast.meta }}</div>
      <div v-if="toast.actions && toast.actions.length > 0" class="row-actions">
        <button
          v-for="(a, i) in toast.actions"
          :key="i"
          type="button"
          :class="['ta', a.muted ? 'muted' : '']"
          @click="() => { a.onClick(); emit('action', { toastId: toast.id, index: i }) }"
        >
          {{ a.label }}
        </button>
      </div>
    </div>
    <button
      type="button"
      class="dismiss"
      aria-label="Dismiss"
      @click="emit('dismiss', toast.id)"
    >
      <KovaIcon name="x" size="sm" class="ic" aria-hidden="true" />
    </button>
  </div>
</template>
