<script setup lang="ts">
import { APP_NAME } from '@/constants'
</script>

<template>
  <div
    data-test-id="dashboard-view"
    class="flex min-h-screen items-center justify-center bg-white px-4"
  >
    <div class="text-center">
      <img src="/favicon-128.png" class="mx-auto mb-4 size-12 rounded-xl" :alt="APP_NAME" />
      <h1 class="text-xl font-semibold text-gray-900">Dashboard</h1>
      <p class="mt-2 text-sm text-gray-500">Coming in Milestone 2</p>
    </div>
  </div>
</template>
