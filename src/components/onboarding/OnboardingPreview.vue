<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  step: number
}>()

const showHeader = computed(() => props.step >= 2)
const showContent = computed(() => props.step >= 3)
const showCta = computed(() => props.step >= 4)
const showFooter = computed(() => props.step >= 4)
const isPulsing = computed(() => props.step === 5)
const ctaAccent = computed(() => props.step >= 6)
</script>

<template>
  <div
    data-test-id="onboarding-preview"
    class="w-[65%] overflow-hidden rounded-xl bg-panel shadow-2xl"
    role="img"
    aria-label="Email design preview showing how your brand will appear in Kova"
  >
    <!-- Title bar -->
    <div
      class="flex items-center justify-between border-b border-[#3a3a3a] bg-[#242424] px-4 py-2.5"
      aria-hidden="true"
    >
      <div class="flex items-center gap-2">
        <div class="flex size-5 items-center justify-center rounded bg-[#555]">
          <icon-lucide-pen-tool class="size-3 text-[#888]" />
        </div>
      </div>
      <span class="text-xs text-[#999]">New Design</span>
      <div class="size-5 rounded-full bg-emerald-500/80" />
    </div>

    <!-- Canvas area -->
    <div
      class="relative p-8 motion-reduce:animate-none"
      :class="isPulsing ? 'animate-pulse' : ''"
      aria-hidden="true"
    >
      <!-- Header bars -->
      <div
        class="mb-5 flex gap-2 transition-all duration-500"
        :class="showHeader ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'"
      >
        <div class="h-2.5 w-14 rounded bg-[#555]" />
        <div class="h-2.5 w-20 rounded bg-[#4a4a4a]" />
        <div class="h-2.5 w-12 rounded bg-[#4a4a4a]" />
      </div>

      <!-- Hero placeholder -->
      <div
        class="mb-5 h-24 w-full rounded-lg bg-[#3a3a3a] transition-all duration-500"
        :class="showContent ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'"
      />

      <!-- Two-column layout -->
      <div
        class="mb-5 flex gap-3 transition-all duration-500"
        :class="showContent ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'"
      >
        <!-- Left: card grid -->
        <div class="flex-1">
          <div class="grid grid-cols-2 gap-2">
            <div class="h-14 rounded bg-[#4a4a4a]" />
            <div class="h-14 rounded bg-[#4a4a4a]" />
            <div class="h-14 rounded bg-[#4a4a4a]" />
            <div class="h-14 rounded bg-[#4a4a4a]" />
          </div>
        </div>

        <!-- Right: text card -->
        <div class="flex-1 space-y-2 rounded-lg bg-[#3a3a3a] p-3">
          <div class="h-2 w-3/4 rounded bg-[#666]" />
          <div class="h-2 w-full rounded bg-[#555]" />
          <div class="h-2 w-5/6 rounded bg-[#555]" />
          <div class="h-2 w-2/3 rounded bg-[#555]" />
        </div>
      </div>

      <!-- CTA button -->
      <div
        class="mx-auto mb-5 h-8 w-28 rounded-lg transition-all duration-500"
        :class="[
          showCta ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0',
          ctaAccent ? 'bg-accent/60' : 'bg-[#555]'
        ]"
      />

      <!-- Footer lines -->
      <div
        class="flex flex-col items-center gap-1.5 transition-all duration-500"
        :class="showFooter ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'"
      >
        <div class="h-1.5 w-24 rounded bg-[#444]" />
        <div class="h-1.5 w-16 rounded bg-[#444]" />
      </div>
    </div>
  </div>
</template>
