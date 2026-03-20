<script setup lang="ts"></script>

<template>
  <div data-test-id="onboarding-email-wireframe" class="relative">
    <!-- Canvas-style container with selection handles -->
    <div class="relative">
      <!-- Dimension label -->
      <div
        class="absolute -top-6 left-1/2 -translate-x-1/2 rounded bg-blue-600 px-2 py-0.5 text-xs text-white"
      >
        Email — 600 x 900
      </div>

      <!-- Email frame with selection border -->
      <div
        class="relative rounded border-[1.5px] border-blue-500 bg-white p-6"
        style="width: 280px; aspect-ratio: 600/900"
      >
        <!-- Corner handles -->
        <div class="absolute -top-1 -left-1 size-2 rounded-sm border border-blue-500 bg-white" />
        <div class="absolute -top-1 -right-1 size-2 rounded-sm border border-blue-500 bg-white" />
        <div class="absolute -bottom-1 -left-1 size-2 rounded-sm border border-blue-500 bg-white" />
        <div
          class="absolute -right-1 -bottom-1 size-2 rounded-sm border border-blue-500 bg-white"
        />

        <!-- Wireframe content -->
        <div class="flex h-full flex-col gap-3">
          <!-- Header bar -->
          <div class="h-5 w-24 rounded bg-gray-200" />

          <!-- Hero image placeholder -->
          <div class="flex h-28 items-center justify-center rounded bg-gray-100">
            <icon-lucide-image class="size-8 text-gray-300" />
          </div>

          <!-- Heading line -->
          <div class="h-3 w-3/4 rounded bg-gray-200" />

          <!-- Text lines -->
          <div class="flex flex-col gap-1.5">
            <div class="h-2 w-full rounded bg-gray-100" />
            <div class="h-2 w-full rounded bg-gray-100" />
            <div class="h-2 w-5/6 rounded bg-gray-100" />
          </div>

          <!-- CTA button placeholder -->
          <div class="mx-auto mt-2 h-7 w-28 rounded bg-gray-200" />

          <!-- Spacer -->
          <div class="flex-1" />

          <!-- Footer lines -->
          <div class="flex flex-col items-center gap-1">
            <div class="h-1.5 w-1/2 rounded bg-gray-100" />
            <div class="h-1.5 w-1/3 rounded bg-gray-100" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
