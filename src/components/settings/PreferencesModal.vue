<script setup lang="ts">
import { usePreferencesModal } from '@/composables/use-preferences-modal'
import KovaModal from '@/components/ui/KovaModal.vue'
import KovaIcon from '@/components/ui/KovaIcon.vue'
import KovaButton from '@/components/ui/KovaButton.vue'
import AccessibilityPanel from './AccessibilityPanel.vue'

const { isOpen, mode, close } = usePreferencesModal()
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
      <KovaIcon name="info" size="xs" aria-hidden="true" />
      <span>Saved to your account · syncs across devices.</span>
    </template>

    <template #foot>
      <KovaButton @click="close">Cancel</KovaButton>
      <KovaButton variant="primary" @click="close">Save</KovaButton>
    </template>
  </KovaModal>
</template>
