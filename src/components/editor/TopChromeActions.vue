<script setup lang="ts">
/**
 * TopChromeActions — Cluster 06 Task 9.
 *
 * Hi-fi: Kova Canvas - Final.html `.kc .topbar .icon-btn` + `.avatar` (lines 130-141).
 *
 * PRD §12.3 RATIFIED 2026-05-17: Comments icon HIDDEN entirely in MVP.
 * `<TopChromeActions>` DOM does NOT contain [data-testid="topbar-comments"].
 *
 * Phase 2 (visible-disabled): Notifications (collaboration), Present.
 */
import KovaIcon from '@/components/ui/KovaIcon.vue'
import KovaTooltip from '@/components/ui/KovaTooltip.vue'
import AvatarDropdown from './AvatarDropdown.vue'

interface Props {
  userName: string
  userInitials: string
  avatarColor: string
  plan: 'Free' | 'Pro' | 'Trial'
}

defineProps<Props>()

defineEmits<{
  'open-account': []
  'open-help': []
  'open-shortcuts': []
  'sign-out': []
}>()
</script>

<template>
  <div class="flex items-center gap-3" data-testid="topbar-actions">
    <KovaTooltip content="Notifications — coming in Phase 2">
      <button
        type="button"
        class="w-7 h-7 grid place-items-center rounded-[5px] text-ink-4 cursor-not-allowed"
        aria-label="Notifications (Phase 2)"
        data-testid="topbar-notifications"
        disabled
      >
        <KovaIcon name="bell" size="md" />
      </button>
    </KovaTooltip>
    <KovaTooltip content="Present — coming in Phase 2">
      <button
        type="button"
        class="w-7 h-7 grid place-items-center rounded-[5px] text-ink-4 cursor-not-allowed"
        aria-label="Present (Phase 2)"
        data-testid="topbar-present"
        disabled
      >
        <KovaIcon name="external-link" size="md" />
      </button>
    </KovaTooltip>
    <AvatarDropdown
      :user-name="userName"
      :user-initials="userInitials"
      :avatar-color="avatarColor"
      :plan="plan"
      @open-account="$emit('open-account')"
      @open-help="$emit('open-help')"
      @open-shortcuts="$emit('open-shortcuts')"
      @sign-out="$emit('sign-out')"
    />
  </div>
</template>
