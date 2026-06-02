<script setup lang="ts">
import KovaModal from '@/components/ui/KovaModal.vue'

/**
 * Move-to-trash confirm modal (hi-fi 15 · B13.1). Dashboard-context only — the
 * canvas editor has no trash entry (founder 2026-05-09). Destructive CTA uses
 * `.btn.danger` (founder-approved red, Cluster 09 Phase 1). Q19 retention copy:
 * no "permanently deleted", no 30-day purge warning.
 */

defineProps<{ canvasName: string }>()
const emit = defineEmits<{ confirmed: []; cancelled: [] }>()
</script>

<template>
  <KovaModal
    :open="true"
    size="sm"
    :title='`Move "${canvasName}" to trash?`'
    description="Restore anytime from Trash."
    @close="emit('cancelled')"
  >
    <p class="vh-trash-body">
      This canvas and all of its snapshots will be moved to Trash. You can restore it from Trash
      whenever you want.
    </p>
    <template #foot>
      <button data-testid="cancel-button" class="btn" @click="emit('cancelled')">Cancel</button>
      <button data-testid="trash-button" class="btn danger" @click="emit('confirmed')">
        Move to trash
      </button>
    </template>
  </KovaModal>
</template>
