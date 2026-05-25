<script setup lang="ts">
import { computed } from 'vue'

import KovaIcon from '@/components/ui/KovaIcon.vue'
import { useAuthStore } from '@/stores/auth'

// PRD 02 §3.2 + Plan T21 — sidebar footer with avatar + name + plan.
// AccountMenu wiring deferred to Cluster 04 follow-up; for now the `more`
// chevron emits open-account-menu.

const auth = useAuthStore()
const emit = defineEmits<{ 'open-account-menu': [] }>()

const initials = computed(() => {
  const name = auth.profile?.name?.trim() ?? ''
  if (!name) return '?'
  return name
    .split(/\s+/)
    .map((part) => part[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase()
})

const displayName = computed(
  () => auth.profile?.name?.trim() || auth.user?.email || 'You'
)

const planLabel = computed(() => {
  const plan = (auth.profile as unknown as { plan?: string })?.plan ?? 'free'
  return plan === 'pro' ? 'Pro plan' : 'Free plan'
})

function openMenu(): void {
  emit('open-account-menu')
}
</script>

<template>
  <div data-test-id="side-footer" class="side-footer">
    <div class="avatar">{{ initials }}</div>
    <div class="who">
      <b>{{ displayName }}</b>
      <span>{{ planLabel }}</span>
    </div>
    <button class="more" aria-label="Open account menu" @click="openMenu">
      <KovaIcon name="more-horizontal" size="sm" />
    </button>
  </div>
</template>
