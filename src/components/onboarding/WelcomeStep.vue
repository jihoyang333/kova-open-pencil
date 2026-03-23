<script setup lang="ts">
import { APP_NAME } from '@/constants'
</script>

<template>
  <div data-test-id="onboarding-welcome">
    <img src="/favicon-128.png" class="mb-6 size-12 rounded-xl" :alt="APP_NAME" />
    <h1 class="text-3xl font-bold text-white">Welcome to {{ APP_NAME }}</h1>
    <p class="mt-3 text-base text-[#999]">AI-powered email design, tailored to your brand.</p>
  </div>
</template>
