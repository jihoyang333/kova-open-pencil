<script setup lang="ts">
import KovaIcon from '@/components/ui/KovaIcon.vue'
import KovaTooltip from '@/components/ui/KovaTooltip.vue'

import { useOnlineStatus } from '@/composables/use-online-status'

// token-exempt-file: offline-indicator chrome. The 20px wrapper sizing sits
// between --h-icon-btn (28px) and the icon target (14px) — Figma-specific
// hit-target tuning. Two lines (width + height) in a multi-line :style
// binding; line-level exemption breaks Vue parser. Founder approved 2026-05-21.
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
    <!-- token-exempt: 20px wrapper sizing is offline-indicator-specific (between --h-icon-btn 28px and icon-tile sub-scale). Centered Lucide icon target. -->
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
