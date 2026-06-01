<script setup lang="ts">
// Cluster 05 — WritingRuleToggle.vue (A7.3.5)
// One row in the writing rules toggle stack.

import KovaToggle from '@/components/ui/KovaToggle.vue'

const { ruleKey, label, helpText, enabled, saving } = defineProps<{
  ruleKey: string
  label: string
  helpText?: string
  enabled: boolean
  saving?: boolean
}>()

const emit = defineEmits<{
  (e: 'change', key: string, value: boolean): void
}>()
</script>

<template>
  <div class="wr-row">
    <div class="lbl">
      {{ label }}
      <span v-if="helpText" class="sub">{{ helpText }}</span>
    </div>
    <KovaToggle
      :model-value="enabled"
      :aria-label="label"
      :disabled="saving"
      @update:model-value="(v) => emit('change', ruleKey, v)"
    />
  </div>
</template>
