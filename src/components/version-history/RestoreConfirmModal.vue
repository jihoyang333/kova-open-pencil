<script setup lang="ts">
import { computed } from 'vue'

import KovaIcon from '@/components/ui/KovaIcon.vue'
import KovaModal from '@/components/ui/KovaModal.vue'
import type { Snapshot } from '@/stores/snapshots'

/**
 * Restore-this-version confirm modal (hi-fi 17.10). Non-destructive: the CTA is
 * `.btn.primary`, never `.btn.danger` — restore is reversible (the current
 * canvas is auto-saved as a pre_restore backup, undoable via ⌘Z). No body; the
 * foot-left carries the "Restoring {label}" info line.
 */

const props = defineProps<{ snapshot: Snapshot }>()
const emit = defineEmits<{ confirmed: []; cancelled: [] }>()

const restoreLabel = computed(
  () => props.snapshot.label || new Date(props.snapshot.taken_at).toLocaleString(),
)
</script>

<template>
  <KovaModal
    :open="true"
    size="sm"
    title="Restore this version?"
    description="Your current canvas will be saved as a backup snapshot before restoring. You can undo with ⌘Z."
    @close="emit('cancelled')"
  >
    <template #foot-left>
      <KovaIcon name="info" size="xs" aria-hidden="true" />
      Restoring {{ restoreLabel }}
    </template>
    <template #foot>
      <button data-testid="cancel-button" class="btn" @click="emit('cancelled')">Cancel</button>
      <button data-testid="restore-button" class="btn primary" @click="emit('confirmed')">
        Restore
      </button>
    </template>
  </KovaModal>
</template>
