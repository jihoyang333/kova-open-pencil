<script setup lang="ts">
// Cluster 11 Plan Task 6.4 — NetworkStatusIndicator (Figma-style icon+tooltip).
//
// Renders nothing while online. When offline, renders a 14x14 cloud-off icon
// wrapped in a KovaTooltip. Positioning is the consumer cluster's
// responsibility (e.g. Cluster 02 topbar mounts this beside the avatar).
//
// Legacy pill / sidebar-strip / 28px banner variants are RETIRED per the
// 2026-05-17 founder decision.

import { useOnlineStatus } from '@/composables/use-online-status'
import KovaTooltip from './KovaTooltip.vue'
import KovaIcon from './KovaIcon.vue'

const { status } = useOnlineStatus()
</script>

<template>
  <KovaTooltip
    v-if="status === 'offline'"
    content="You're offline. Changes saved locally and sync when you reconnect."
  >
    <span class="grid h-4 w-4 place-items-center">
      <KovaIcon
        name="cloud-off"
        class="h-3.5 w-3.5 text-ink-2"
        aria-label="Offline"
      />
    </span>
  </KovaTooltip>
</template>
