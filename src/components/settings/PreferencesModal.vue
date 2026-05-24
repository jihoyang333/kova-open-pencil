<script setup lang="ts">
import { computed } from 'vue'
import { usePreferencesModal } from '@/composables/use-preferences-modal'
import { usePreferencesStore } from '@/stores/preferences'
import KovaModal from '@/components/ui/KovaModal.vue'
import KovaIcon from '@/components/ui/KovaIcon.vue'
import KovaButton from '@/components/ui/KovaButton.vue'
import AccessibilityPanel from './AccessibilityPanel.vue'

const { isOpen, mode, close } = usePreferencesModal()
const prefs = usePreferencesStore()

// Reflect debounced-RPC outcome so a silent persistence failure can be
// surfaced. Three-state footer matches PRD 12 §3.4 apply-immediately semantics
// (no save bar, but the user can still see if a write fails).
const footerState = computed<{ icon: string; message: string; tone: 'ok' | 'warn' }>(() => {
  if (prefs.lastWriteError) {
    return {
      icon: 'alert-triangle',
      message: "Couldn't save to your account. Will retry on next change.",
      tone: 'warn',
    }
  }
  return {
    icon: 'info',
    message: 'Saved to your account · syncs across devices.',
    tone: 'ok',
  }
})
</script>

<template>
  <KovaModal
    :open="isOpen"
    size="md"
    title="Accessibility"
    description="Visual and motion preferences. Apply across every brand and canvas."
    @close="close"
  >
    <AccessibilityPanel v-if="mode === 'accessibility'" />

    <template #foot-left>
      <KovaIcon :name="footerState.icon" size="xs" aria-hidden="true" />
      <span :data-tone="footerState.tone">{{ footerState.message }}</span>
    </template>

    <template #foot>
      <KovaButton @click="close">Cancel</KovaButton>
      <KovaButton variant="primary" @click="close">Save</KovaButton>
    </template>
  </KovaModal>
</template>
