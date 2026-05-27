<script setup lang="ts">
/**
 * FileBreadcrumb — Cluster 06 Task 9.
 *
 * Hi-fi source: Kova Canvas - Final.html `.kc .topbar .file` (lines 117-127).
 * Brand pill + slash separator + file name + caret. Brand click navigates
 * to /brand/:brandId per Q17 (no popover, no in-canvas brand switching).
 */
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import KovaIcon from '@/components/ui/KovaIcon.vue'

interface Props {
  brandId: string | null
  brandName: string
  brandColor: string
  fileName: string
}

const props = defineProps<Props>()
const router = useRouter()

defineEmits<{
  'open-file-menu': []
}>()

const brandSwatchStyle = computed(() => ({ backgroundColor: props.brandColor }))

function onBrandClick(): void {
  if (props.brandId) {
    void router.push(`/brand/${props.brandId}`)
  }
}
</script>

<template>
  <div
    class="flex items-center gap-2 text-ink-2 text-[13px]"
    data-testid="topbar-file-breadcrumb"
  >
    <button
      type="button"
      class="inline-flex items-center gap-1.5 cursor-pointer"
      :aria-label="`Open brand ${brandName}`"
      data-testid="topbar-brand-pill"
      @click="onBrandClick"
    >
      <span
        class="w-3.5 h-3.5 rounded-sm"
        :style="brandSwatchStyle"
        aria-hidden="true"
      />
      <span>{{ brandName }}</span>
    </button>
    <span class="text-ink-4" aria-hidden="true">/</span>
    <b class="text-ink font-semibold tracking-[-0.005em]">{{ fileName }}</b>
    <button
      type="button"
      class="grid place-items-center text-ink-3 cursor-pointer"
      aria-label="File options"
      data-testid="topbar-file-caret"
      @click="$emit('open-file-menu')"
    >
      <KovaIcon name="chevron-down" size="xs" />
    </button>
  </div>
</template>
