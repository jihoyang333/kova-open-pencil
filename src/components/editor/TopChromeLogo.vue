<script setup lang="ts">
/**
 * TopChromeLogo — Cluster 06 Task 9.
 *
 * Hi-fi source: Kova Canvas - Final.html `.kc .topbar .logo` (lines 109-116).
 * 24x24 K-monogram. Click anchors the File menu (Cluster 08 mounts).
 */
defineEmits<{ 'open-file-menu': [] }>()
</script>

<template>
  <button
    type="button"
    class="w-6 h-6 grid place-items-center rounded-md bg-ink text-page font-bold text-[11px] tracking-[-0.04em] cursor-pointer"
    aria-label="File menu"
    data-testid="topbar-logo"
    @click="$emit('open-file-menu')"
  >
    K
  </button>
</template>
