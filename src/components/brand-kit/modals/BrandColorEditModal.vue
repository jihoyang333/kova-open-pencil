<script setup lang="ts">
// Cluster 05 — BrandColorEditModal.vue (B3 pattern, PRD §3.2 swatch hex-edit).
// Presentational: edits/adds a single fixed color slot. Parent owns the write.

import { computed, ref, watch } from 'vue'

import KovaButton from '@/components/ui/KovaButton.vue'
import KovaField from '@/components/ui/KovaField.vue'
import KovaModal from '@/components/ui/KovaModal.vue'
import { isValidHexColor } from '@/utils/onboarding-validators'

const { open, slotLabel, initialHex, mode, saving } = defineProps<{
  open: boolean
  slotLabel: string
  initialHex: string
  mode: 'edit' | 'add'
  saving?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'save', hex: string): void
}>()

const hex = ref('#000000')

watch(
  () => open,
  (isOpen) => {
    if (isOpen) hex.value = initialHex || '#000000'
  },
  { immediate: true },
)

const normalized = computed(() => hex.value.trim())
const canSave = computed(() => isValidHexColor(normalized.value))
const nativeValue = computed(() => (isValidHexColor(normalized.value) ? normalized.value : '#000000'))

function onClose(): void {
  emit('update:open', false)
}

function onSave(): void {
  if (canSave.value) emit('save', normalized.value)
}

function onNativeInput(event: Event): void {
  hex.value = (event.target as HTMLInputElement).value
}
</script>

<template>
  <KovaModal
    :open="open"
    :title="mode === 'add' ? 'Add brand color' : 'Edit brand color'"
    size="sm"
    @update:open="(v) => { if (!v) onClose() }"
  >
    <div class="bk-form-col">
      <div class="bk-color-edit">
        <input
          type="color"
          class="bk-color-native"
          :value="nativeValue"
          :aria-label="`Pick ${slotLabel} color`"
          @input="onNativeInput"
        />
        <KovaField
          v-model="hex"
          :label="`${slotLabel} hex`"
          placeholder="#000000"
        />
      </div>
    </div>

    <template #foot>
      <KovaButton variant="ghost" :disabled="saving" @click="onClose">Cancel</KovaButton>
      <KovaButton
        variant="accent"
        :disabled="!canSave || saving"
        :loading="saving"
        @click="onSave"
      >
        Save
      </KovaButton>
    </template>
  </KovaModal>
</template>
