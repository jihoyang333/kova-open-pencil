<!-- token-exempt-file: A15 hi-fi shell primitive. Px values match .auth-sent + .tag-mono.ok selectors (cluster-01-tokens-used.md §3-§5, Q-4 = 4B). -->
<script setup lang="ts">
// Plan 01 Task 15 — MagicLinkSentBlock. A15.03 hi-fi reference.
// "DELIVERED" tag is built inline (audit Q-4 default = 4B) to keep
// Cluster 11 sealed.

interface Props {
  email: string
  resendCooldown: number
  tagState?: 'delivered' | 'pending'
}

const { email, resendCooldown, tagState = 'delivered' } = defineProps<Props>()

const emit = defineEmits<{
  resend: []
  'enter-code-instead': []
}>()

function onResend(): void {
  if (resendCooldown === 0) emit('resend')
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <p class="text-[13px] text-ink-2">
      We sent a magic link to <b class="font-medium text-ink">{{ email }}</b
      >. Click it to sign in.
    </p>

    <div class="flex flex-col gap-[10px] rounded-lg border border-line-2 bg-rail p-[14px]">
      <div class="flex items-center gap-[10px] text-[12.5px] text-ink-2">
        <icon-lucide-mail class="size-[14px] text-ink-3" />
        <span>Magic link sent</span>
        <span
          class="ml-auto rounded-[3px] border px-[6px] py-[2px] text-[11.5px] font-medium tracking-wide uppercase"
          :class="
            tagState === 'delivered'
              ? 'border-line-2 bg-page text-ink-2'
              : 'border-line-2 bg-page text-ink-3'
          "
        >
          {{ tagState === 'delivered' ? 'Delivered' : 'Pending' }}
        </span>
      </div>

      <div class="flex items-center gap-[10px] text-[11.5px] text-ink-3">
        <icon-lucide-clock class="size-[13px]" />
        <span v-if="resendCooldown > 0">Resend in {{ resendCooldown }}s</span>
        <button
          v-else
          type="button"
          class="font-medium text-ink-2 hover:text-ink hover:underline"
          @click="onResend"
        >
          Resend link
        </button>
      </div>
    </div>

    <button
      type="button"
      class="text-[12px] text-ink-2 hover:text-ink hover:underline"
      @click="emit('enter-code-instead')"
    >
      Enter a 6-digit code instead
    </button>
  </div>
</template>
