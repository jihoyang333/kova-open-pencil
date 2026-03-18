<script setup lang="ts">
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuRoot,
  DropdownMenuTrigger,
} from 'reka-ui'

import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

const initials = (() => {
  const email = authStore.user?.email ?? ''
  return email.charAt(0).toUpperCase()
})()

async function handleSignOut(): Promise<void> {
  await authStore.signOut()
}
</script>

<template>
  <DropdownMenuRoot>
    <DropdownMenuTrigger
      data-test-id="account-menu-trigger"
      class="flex size-8 cursor-pointer items-center justify-center rounded-full bg-blue-500 text-xs font-medium text-white transition-opacity hover:opacity-90"
    >
      {{ initials }}
    </DropdownMenuTrigger>
    <DropdownMenuPortal>
      <DropdownMenuContent
        :side-offset="8"
        align="end"
        class="z-50 min-w-40 rounded-lg border border-gray-200 bg-white p-1 shadow-lg"
      >
        <div class="px-2 py-1.5 text-xs text-gray-500">
          {{ authStore.user?.email }}
        </div>
        <div class="mx-1 my-1 h-px bg-gray-100" />
        <DropdownMenuItem
          data-test-id="account-menu-sign-out"
          class="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-gray-700 outline-none select-none data-[highlighted]:bg-gray-100"
          @select="handleSignOut"
        >
          <icon-lucide-log-out class="size-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenuPortal>
  </DropdownMenuRoot>
</template>
