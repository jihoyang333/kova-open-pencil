<script setup lang="ts">
// PRD 04 §6.4.2 — Past-due banner. Founder lock D-5: deadline = period_end + 7d.
import { computed } from 'vue'

import KovaIcon from '@/components/ui/KovaIcon.vue'

interface Props {
  deadlineIso: string | null
}
const { deadlineIso } = defineProps<Props>()
defineEmits<{ updatePayment: [] }>()

const deadlineDisplay = computed(() => {
  if (deadlineIso === null) return ''
  return new Date(deadlineIso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
})
</script>

<template>
  <aside class="past-due-banner" role="alert">
    <KovaIcon name="alert-triangle" size="md" class="past-due-ic" />
    <div class="past-due-body">
      <p><strong>Your last payment didn't go through.</strong></p>
      <p v-if="deadlineDisplay !== ''">Update your card before {{ deadlineDisplay }} to keep your subscription.</p>
    </div>
    <button type="button" class="btn primary" @click="$emit('updatePayment')">
      Update payment method
    </button>
  </aside>
</template>
