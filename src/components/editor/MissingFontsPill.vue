<script setup lang="ts">
/**
 * MissingFontsPill — Cluster 06 Task 9 (sub-spec 14.x — C-LOW06.4 + C-LOW06.5).
 *
 * Hi-fi: design-system/hifi/states/Kova Hi-Fi 16 Toasts + Missing Fonts - Dark.html.
 * Anchored top-right of canvas viewport (z-30, above selection visuals but
 * below modal layer). Click opens Brand Kit fonts tab (Cluster 05 owns route).
 */
import KovaIcon from '@/components/ui/KovaIcon.vue'

interface Props {
  missingCount: number
}

const props = defineProps<Props>()

defineEmits<{ 'open-font-manager': [] }>()
</script>

<template>
  <button
    v-if="props.missingCount > 0"
    type="button"
    class="absolute top-3 right-3 z-30 inline-flex items-center gap-2 rounded-[6px] bg-page border border-line px-3 py-1.5 text-ink-2 text-[12px] hover:text-ink hover:border-ink-3 cursor-pointer"
    data-testid="missing-fonts-pill"
    :aria-label="`${missingCount} missing fonts — click to open Brand Kit`"
    @click="$emit('open-font-manager')"
  >
    <KovaIcon name="alert-triangle" size="sm" />
    <span>{{ missingCount }} missing font{{ missingCount === 1 ? '' : 's' }}</span>
  </button>
</template>
