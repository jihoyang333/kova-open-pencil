<script setup lang="ts">
import { inject, ref } from 'vue'

import ClickToEdit from '@/components/onboarding/ClickToEdit.vue'
import ColorPicker from '@/components/onboarding/ColorPicker.vue'

import type { useOnboardingState } from '@/composables/useOnboardingState'

const state = inject('onboardingState') as ReturnType<typeof useOnboardingState>

const fileInputRef = ref<HTMLInputElement | null>(null)

function handleLogoUpload(e: Event): void {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) {
    state.logoFile.value = file
    state.logoUrl.value = URL.createObjectURL(file)
  }
}

function openFileDialog(): void {
  fileInputRef.value?.click()
}

function updateColor(key: 'primary' | 'secondary' | 'accent' | 'background', value: string): void {
  const current = state.colors.value ?? {
    primary: '#000000',
    secondary: '#333333',
    accent: '#0066ff',
    background: '#ffffff'
  }
  state.colors.value = { ...current, [key]: value }
}

function updateFont(key: 'heading' | 'body', value: string): void {
  const current = state.fonts.value ?? { heading: '', body: '' }
  state.fonts.value = { ...current, [key]: value }
}
</script>

<template>
  <div data-test-id="onboarding-review-step" class="space-y-4 overflow-y-auto pr-2">
    <h1 class="text-2xl font-semibold text-gray-900">Review your brand</h1>
    <p class="text-sm text-gray-500">Tap any field to edit.</p>

    <!-- Identity section -->
    <div class="rounded-xl bg-gray-50 p-4">
      <div class="flex items-center gap-4">
        <!-- Logo -->
        <button
          data-test-id="review-logo-upload"
          class="group relative flex size-14 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-white"
          @click="openFileDialog"
        >
          <img
            v-if="state.logoUrl.value"
            :src="state.logoUrl.value"
            class="size-14 object-contain"
            alt="Brand logo"
          />
          <icon-lucide-image v-else class="size-5 text-gray-300" />
          <div
            class="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100"
          >
            <icon-lucide-pencil class="size-3.5 text-white" />
          </div>
        </button>
        <input
          ref="fileInputRef"
          type="file"
          accept="image/*"
          class="hidden"
          @change="handleLogoUpload"
        />

        <!-- Brand name -->
        <div class="flex-1">
          <ClickToEdit
            :model-value="state.brandName.value"
            placeholder="Brand name"
            display-class="text-base font-semibold"
            @update:model-value="state.brandName.value = $event"
          />
        </div>
      </div>
    </div>

    <!-- Colors section -->
    <div class="rounded-xl bg-gray-50 p-4">
      <div class="mb-3 text-[10px] font-medium tracking-wider text-gray-400 uppercase">Colors</div>
      <div class="flex gap-4">
        <ColorPicker
          :model-value="state.colors.value?.primary ?? '#000000'"
          label="Primary"
          @update:model-value="updateColor('primary', $event)"
        />
        <ColorPicker
          :model-value="state.colors.value?.secondary ?? '#333333'"
          label="Secondary"
          @update:model-value="updateColor('secondary', $event)"
        />
        <ColorPicker
          :model-value="state.colors.value?.accent ?? '#0066ff'"
          label="Accent"
          @update:model-value="updateColor('accent', $event)"
        />
        <ColorPicker
          :model-value="state.colors.value?.background ?? '#ffffff'"
          label="Background"
          @update:model-value="updateColor('background', $event)"
        />
      </div>
    </div>

    <!-- Fonts + Voice section -->
    <div class="rounded-xl bg-gray-50 p-4">
      <div class="mb-3 text-[10px] font-medium tracking-wider text-gray-400 uppercase">
        Fonts & Voice
      </div>
      <div class="mb-3 flex gap-4">
        <div class="flex-1">
          <div class="mb-1 text-[10px] text-gray-500">Heading font</div>
          <ClickToEdit
            :model-value="state.fonts.value?.heading ?? ''"
            placeholder="Heading font"
            @update:model-value="updateFont('heading', $event)"
          />
        </div>
        <div class="flex-1">
          <div class="mb-1 text-[10px] text-gray-500">Body font</div>
          <ClickToEdit
            :model-value="state.fonts.value?.body ?? ''"
            placeholder="Body font"
            @update:model-value="updateFont('body', $event)"
          />
        </div>
      </div>

      <div class="mb-1 text-[10px] text-gray-500">Writing style</div>
      <ClickToEdit
        :model-value="state.voice.value ?? ''"
        tag="textarea"
        placeholder="Describe your brand's writing style..."
        @update:model-value="state.voice.value = $event"
      />
    </div>
  </div>
</template>
