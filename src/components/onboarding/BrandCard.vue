<script setup lang="ts">
import { inject, computed } from 'vue'

import type { useOnboardingState } from '@/composables/useOnboardingState'

const state = inject('onboardingState') as ReturnType<typeof useOnboardingState>

const colorSwatches = computed(() => {
  if (!state.colors.value) return []
  const c = state.colors.value
  return [
    { label: 'Primary', hex: c.primary },
    { label: 'Secondary', hex: c.secondary },
    { label: 'Accent', hex: c.accent },
    { label: 'Background', hex: c.background }
  ]
})

const hasLogo = computed(() => !!state.logoUrl.value || !!state.logoFile.value)
// Reviewer fix #2: Use nullish coalescing instead of non-null assertion
const logoSrc = computed(() => {
  if (state.logoFile.value) return URL.createObjectURL(state.logoFile.value)
  return state.logoUrl.value
})
</script>

<template>
  <div data-test-id="onboarding-brand-card" class="w-72 rounded-xl bg-[#2a2a2a] p-6 shadow-2xl">
    <!-- Logo -->
    <div class="mb-4 flex items-center gap-3">
      <div
        v-if="hasLogo"
        class="flex size-10 items-center justify-center overflow-hidden rounded-lg bg-white/10"
      >
        <img :src="logoSrc ?? undefined" class="size-10 object-contain" alt="Brand logo" />
      </div>
      <div
        v-else
        class="flex size-10 items-center justify-center rounded-lg border border-dashed border-gray-600"
      >
        <icon-lucide-image class="size-4 text-gray-500" />
      </div>

      <!-- Brand name -->
      <span v-if="state.brandName.value" class="text-lg font-semibold text-white">
        {{ state.brandName.value }}
      </span>
      <span v-else class="text-sm text-gray-500">Brand name</span>
    </div>

    <!-- Colors -->
    <div class="mb-4">
      <div class="mb-2 text-[10px] font-medium tracking-wider text-gray-400 uppercase">Colors</div>
      <div v-if="colorSwatches.length" class="flex gap-2">
        <div v-for="swatch in colorSwatches" :key="swatch.label" class="text-center">
          <div
            class="size-8 rounded-md border border-white/10"
            :style="{ backgroundColor: swatch.hex }"
          />
          <div class="mt-1 text-[9px] text-gray-500">{{ swatch.hex }}</div>
        </div>
      </div>
      <div v-else class="flex gap-2">
        <div
          v-for="i in 4"
          :key="i"
          class="size-8 rounded-md border border-dashed border-gray-600"
        />
      </div>
    </div>

    <!-- Fonts -->
    <div class="mb-4">
      <div class="mb-2 text-[10px] font-medium tracking-wider text-gray-400 uppercase">Fonts</div>
      <div v-if="state.fonts.value" class="flex gap-4 text-xs text-gray-300">
        <div>
          <div class="text-gray-500">Heading</div>
          <div>{{ state.fonts.value.heading }}</div>
        </div>
        <div>
          <div class="text-gray-500">Body</div>
          <div>{{ state.fonts.value.body }}</div>
        </div>
      </div>
      <div v-else class="text-xs text-gray-600">—</div>
    </div>

    <!-- Voice -->
    <div>
      <div class="mb-2 text-[10px] font-medium tracking-wider text-gray-400 uppercase">Voice</div>
      <p v-if="state.voice.value" class="text-xs leading-relaxed text-gray-300">
        {{ state.voice.value }}
      </p>
      <div v-else class="text-xs text-gray-600">—</div>
    </div>
  </div>
</template>
