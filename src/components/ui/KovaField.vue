<script setup lang="ts">
// Cluster 11 Plan Task 6.2 — KovaField.
// Wraps an input with label / required marker / error / help-text rows.

defineProps<{
  label: string
  helpText?: string
  error?: string
  required?: boolean
}>()
</script>

<template>
  <div class="fld">
    <label class="lbl mb-1 block text-xs font-medium text-ink-2">
      {{ label }}<span v-if="required" class="req text-red-500"> *</span>
    </label>
    <slot />
    <div v-if="error" class="error mt-1 text-xs text-red-500">{{ error }}</div>
    <div v-else-if="helpText" class="help mt-1 text-xs text-ink-3">
      {{ helpText }}
    </div>
  </div>
</template>
