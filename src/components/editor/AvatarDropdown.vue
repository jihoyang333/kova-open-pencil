<script setup lang="ts">
/**
 * AvatarDropdown — Cluster 06 Task 9.
 *
 * Hi-fi sources: Kova Canvas - Final.html `.kc .topbar .avatar` (lines 136-141)
 * + Kova Hi-Fi 08 Top Chrome Menus - Dark.html (avatar dropdown panel).
 *
 * Per Q16 + PRD §2.1: 5 items — User header / Account / Help / Keyboard
 * shortcuts / Sign out. NO Brand picker (Q17 reversed). NO What's new (Phase 2).
 */
import { computed, ref } from 'vue'
import KovaMenu, { type KovaMenuItem } from '@/components/ui/KovaMenu.vue'

interface Props {
  userName: string
  userInitials: string
  avatarColor: string
  plan: 'Free' | 'Pro' | 'Trial'
}

const props = defineProps<Props>()

// KovaMenu binds DropdownMenuRoot's `open` (controlled), so consumers must own
// the open state or the trigger can't toggle it. Manage it locally here.
const open = ref(false)

const emit = defineEmits<{
  'open-account': []
  'open-help': []
  'open-shortcuts': []
  'sign-out': []
}>()

const avatarStyle = computed(() => ({ backgroundColor: props.avatarColor }))

const items = computed<KovaMenuItem[]>(() => [
  {
    id: 'account',
    label: 'Account',
    onSelect: () => emit('open-account'),
  },
  {
    id: 'help',
    label: 'Help',
    onSelect: () => emit('open-help'),
  },
  {
    id: 'shortcuts',
    label: 'Keyboard shortcuts',
    shortcut: '⇧⌘?',
    onSelect: () => emit('open-shortcuts'),
  },
  {
    id: 'sign-out',
    label: 'Sign out',
    separatorBefore: true,
    onSelect: () => emit('sign-out'),
  },
])
</script>

<template>
  <KovaMenu v-model:open="open" :items="items" align="end" :side-offset="8">
    <template #trigger>
      <button
        type="button"
        class="w-[26px] h-[26px] rounded-full grid place-items-center text-white font-semibold text-[10.5px] cursor-pointer"
        :style="avatarStyle"
        :aria-label="`Account menu — ${userName} (${plan})`"
        data-testid="topbar-avatar"
      >
        {{ userInitials }}
      </button>
    </template>
  </KovaMenu>
</template>
