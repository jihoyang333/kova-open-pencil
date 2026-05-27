<script setup lang="ts">
/**
 * FileRow — Cluster 06 Task 11.
 *
 * Hi-fi source: Kova Canvas - Final.html `.kc .left .file-row` (lines 155-167).
 * Padding 14, gap 2.5; 30x30 file-icon tile; bold file name + meta caption.
 */
import KovaIcon from '@/components/ui/KovaIcon.vue'

interface Props {
  fileName: string
  meta: string
}

defineProps<Props>()
</script>

<template>
  <div
    class="p-[14px] border-b border-line-2 flex items-center gap-2.5"
    data-testid="file-row"
  >
    <div
      class="w-[30px] h-[30px] rounded-[7px] bg-fill grid place-items-center text-ink-2 flex-shrink-0"
      aria-hidden="true"
    >
      <KovaIcon name="image" size="md" />
    </div>
    <div class="min-w-0 flex-1">
      <div class="text-ink font-semibold text-[13px] truncate">{{ fileName }}</div>
      <div class="text-ink-3 text-[11.5px] mt-0.5 truncate">{{ meta }}</div>
    </div>
  </div>
</template>
