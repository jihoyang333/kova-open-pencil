<script setup lang="ts">
/**
 * Binary toggle primitive. Lifted from A7.1 inline `.toggle` styles
 * (cluster-12 shipped the .toggle CSS in src/styles/accessibility.css per
 * IMPLEMENTATION_PROMPT §4.5).
 *
 * Cluster 11 Foundation gap (KovaToggle was expected but not shipped).
 * Cluster 12 ships this primitive so the Accessibility + Notifications
 * panels have the canonical v-model toggle they need.
 */

export interface KovaToggleProps {
  modelValue: boolean
  ariaLabel?: string
  disabled?: boolean
  id?: string
}

const props = defineProps<KovaToggleProps>()
const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

function onToggle(): void {
  if (props.disabled) return
  emit('update:modelValue', !props.modelValue)
}

function onKey(e: KeyboardEvent): void {
  if (props.disabled) return
  if (e.code === 'Space' || e.code === 'Enter') {
    e.preventDefault()
    emit('update:modelValue', !props.modelValue)
  }
}
</script>

<template>
  <button
    :id="id"
    type="button"
    role="switch"
    :class="['toggle', { on: modelValue, disabled }]"
    :aria-checked="modelValue ? 'true' : 'false'"
    :aria-label="ariaLabel"
    :aria-disabled="disabled ? 'true' : undefined"
    :disabled="disabled"
    :tabindex="disabled ? -1 : 0"
    @click="onToggle"
    @keydown="onKey"
  />
</template>
