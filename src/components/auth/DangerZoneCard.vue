<script setup lang="ts">
import { computed, ref } from 'vue'

import KovaModal from '@/components/ui/KovaModal.vue'
import { useAccountDeletion } from '@/composables/auth/use-account-deletion'

// W8a Cluster 01 — DangerZoneCard (Plan 01 Task 16 / amendment §7 Phase 9.7).
// Mounts inside Cluster 04's account-settings page. Opens a typed-confirm
// modal where the user must type "DELETE" in caps before the destructive
// CTA enables. On confirm, the auth store schedules deletion (Edge Function
// `/api/account/deletion-request`) and emits `requested` so the parent view
// can route to /account-pending-deletion.

const CONFIRM_TOKEN = 'DELETE'

const emit = defineEmits<{ requested: [] }>()

const deletion = useAccountDeletion()
const open = ref(false)
const typed = ref('')
const submitting = ref(false)

const canConfirm = computed(() => typed.value.trim() === CONFIRM_TOKEN && !submitting.value)

function reset(): void {
  typed.value = ''
  submitting.value = false
}

async function onConfirm(): Promise<void> {
  if (!canConfirm.value) return
  submitting.value = true
  try {
    await deletion.requestDeletion()
    emit('requested')
    open.value = false
  } finally {
    reset()
  }
}

function onCancel(): void {
  open.value = false
  reset()
}
</script>

<template>
  <section
    data-test-id="danger-zone-card"
    class="flex flex-col gap-3 rounded-md border border-warn/30 bg-page p-4"
  >
    <h3 class="m-0 text-[14px] font-semibold text-ink">Delete account</h3>
    <p class="m-0 text-[12.5px] leading-[1.55] text-ink-2">
      Permanently delete your account and all canvases. This action cannot be undone after the
      30-day grace period.
    </p>
    <button
      type="button"
      data-test-id="danger-trigger"
      class="self-start rounded-md border border-warn px-3 py-[7px] text-[12.5px] font-medium text-warn transition-colors hover:bg-warn-soft"
      @click="open = true"
    >
      Delete account
    </button>

    <KovaModal
      v-model:open="open"
      size="sm"
      title="Are you sure?"
      description="This is permanent after the 30-day grace period."
      :close-on-backdrop="!submitting"
      @close="reset"
    >
      <p class="text-[13px] leading-[1.55] text-ink-2">
        Type <b class="font-semibold text-ink">DELETE</b> to confirm. Your account is queued for
        deletion and can be restored by signing in within 30 days.
      </p>
      <input
        v-model="typed"
        data-test-id="danger-confirm-input"
        type="text"
        autocomplete="off"
        placeholder="DELETE"
        class="mt-3 w-full rounded-md border border-line bg-page px-3 py-[8px] text-[13px] text-ink placeholder:text-ink-3 focus:border-ink-2 focus:outline-none"
      />
      <template #foot>
        <button
          type="button"
          data-test-id="danger-cancel-btn"
          class="rounded-md border border-line bg-page px-3 py-[8px] text-[12.5px] font-medium text-ink-2 hover:text-ink"
          @click="onCancel"
        >
          Cancel
        </button>
        <button
          type="button"
          data-test-id="danger-confirm-btn"
          :disabled="!canConfirm"
          class="rounded-md border border-warn bg-warn px-3 py-[8px] text-[12.5px] font-medium text-ink-on-primary transition-colors hover:bg-warn/90 disabled:cursor-not-allowed disabled:opacity-50"
          @click="onConfirm"
        >
          Delete my account
        </button>
      </template>
    </KovaModal>
  </section>
</template>
