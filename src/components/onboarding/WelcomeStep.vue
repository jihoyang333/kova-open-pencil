<script setup lang="ts">
import { APP_NAME } from '@/constants'

const emit = defineEmits<{
  continue: []
}>()
</script>

<template>
  <div data-test-id="onboarding-welcome">
    <img src="/favicon-128.png" class="mb-6 size-12 rounded-xl" :alt="APP_NAME" />
    <h1 class="text-2xl font-semibold text-gray-900">Welcome to {{ APP_NAME }}</h1>
    <p class="mt-3 text-base text-gray-500">
      AI-powered email design, tailored to your brand. Let's set up your brand profile to get
      started.
    </p>
    <button
      data-test-id="onboarding-get-started"
      class="mt-8 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white transition-opacity hover:bg-blue-700"
      @click="emit('continue')"
    >
      Get Started
    </button>
  </div>
</template>
