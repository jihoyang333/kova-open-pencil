<script setup lang="ts">
import type { CampaignType } from '@/ai/build-system-prompt'

const emit = defineEmits<{
  select: [text: string, campaignType?: CampaignType]
}>()

const chips: ReadonlyArray<{ label: string; campaignType: CampaignType }> = [
  {
    label: 'A tips-and-tricks email that teaches something useful',
    campaignType: 'educational',
  },
  {
    label: 'Behind-the-scenes story about how we started',
    campaignType: 'community',
  },
  {
    label: 'Flash sale with a countdown and bold CTA',
    campaignType: 'sales',
  },
  {
    label: 'Customer testimonial spotlight with before-and-after',
    campaignType: 'social-proof',
  },
  {
    label: 'New product drop with hero image and feature callouts',
    campaignType: 'product-highlights',
  },
] as const

function handleChipClick(chip: (typeof chips)[number]) {
  emit('select', chip.label, chip.campaignType)
}
</script>

<template>
  <div class="flex flex-wrap justify-center gap-2 px-2">
    <button
      v-for="chip in chips"
      :key="chip.campaignType"
      class="flex items-center gap-1.5 rounded-full border border-border bg-transparent px-3 py-1.5 text-xs text-[#ccc] transition-all hover:border-[#555] hover:bg-hover hover:text-white"
      @click="handleChipClick(chip)"
    >
      <icon-lucide-lightbulb v-if="chip.campaignType === 'educational'" class="size-3" />
      <icon-lucide-users v-else-if="chip.campaignType === 'community'" class="size-3" />
      <icon-lucide-zap v-else-if="chip.campaignType === 'sales'" class="size-3" />
      <icon-lucide-star v-else-if="chip.campaignType === 'social-proof'" class="size-3" />
      <icon-lucide-package v-else-if="chip.campaignType === 'product-highlights'" class="size-3" />
      <span class="max-w-[200px] truncate">{{ chip.label }}</span>
    </button>
  </div>
</template>
