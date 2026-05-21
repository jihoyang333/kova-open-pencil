<script setup lang="ts">
import KovaIcon from '@/components/ui/KovaIcon.vue'
import KovaTooltip from '@/components/ui/KovaTooltip.vue'

import { useOnlineStatus } from '@/composables/use-online-status'

/**
 * Figma-style offline indicator — PRD 11 §3.7 (W5a decision).
 *   - Online → renders nothing (no chrome consumed).
 *   - Offline → 14×14 `cloud-off` icon (in --ink-2) with tooltip.
 *
 * Mounted globally near the topbar avatar (App.vue) or in topbar slot
 * per surface. PRD §3.7 says single canonical surface; older A13 strip
 * pattern retired.
 */

const { status } = useOnlineStatus()
const TOOLTIP = "You're offline. Changes saved locally and sync when you reconnect."
</script>

<template>
  <KovaTooltip v-if="status === 'offline'" :content="TOOLTIP" side="bottom">
    <span
      aria-label="Offline"
      role="status"
      :style="{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '20px',
        height: '20px',
        color: 'var(--ink-2)',
      }"
    >
      <KovaIcon name="cloud-off" size="sm" aria-hidden="true" />
    </span>
  </KovaTooltip>
</template>
