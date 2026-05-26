<script setup lang="ts">
import { computed, toRef } from 'vue'

import KovaIcon from '@/components/ui/KovaIcon.vue'
import { useLogoFetch } from '@/composables/use-logo-fetch'
import { useOnboarding } from '@/composables/use-onboarding'

// PRD 02 §3.1 / Plan T13 — A1.01.c first-brand step.
// Consolidates the M9-era BrandNameStep + BrandUrlStep + NameStep (3 screens)
// into one card per hi-fi (single screen).

const { state } = useOnboarding()
const { logoUrl, isFetching, manualOverride } = useLogoFetch(toRef(state, 'brandUrl'))

const monogram = computed(() => state.brandName.trim().charAt(0).toUpperCase() || '?')
const canContinue = computed(
  () => state.brandName.trim().length > 0 && state.brandUrl.trim().length > 0
)

const emit = defineEmits<{ next: [] }>()

async function onLogoSlotClick(): Promise<void> {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/png,image/jpeg,image/svg+xml'
  input.onchange = async () => {
    const file = input.files?.[0]
    if (file) await manualOverride(file)
  }
  input.click()
}
</script>

<template>
  <div data-test-id="onboarding-brand-identity-step" class="onb-card">
    <div class="onb-eyebrow">Your first brand</div>
    <h1>What are we working on?</h1>
    <p class="onb-lede">
      Each brand in Kova is fully siloed — its own canvases, brand kit, and integrations.
      You can add more later from the brand picker.
    </p>

    <div class="onb-id-row">
      <button
        type="button"
        data-test-id="brand-identity-logo-slot"
        class="logo-slot"
        :class="{ fetched: !!logoUrl, loading: isFetching }"
        :aria-label="logoUrl ? 'Replace brand logo' : 'Upload brand logo'"
        @click="onLogoSlotClick"
      >
        <img v-if="logoUrl" :src="logoUrl" alt="Brand logo" />
        <span v-else>{{ monogram }}</span>
        <span v-if="isFetching" class="pulse" aria-hidden="true" />
      </button>

      <div class="flex flex-col gap-[10px]">
        <div class="onb-field">
          <label for="brand-name-input" class="lbl">Brand name</label>
          <input
            id="brand-name-input"
            v-model="state.brandName"
            name="brandName"
            class="input"
            type="text"
            autocomplete="off"
          />
        </div>
        <div class="onb-field">
          <label for="brand-url-input" class="lbl">Website</label>
          <div class="onb-input-affixed">
            <span class="pre">https://</span>
            <input
              id="brand-url-input"
              v-model="state.brandUrl"
              name="brandUrl"
              type="text"
              autocomplete="off"
            />
          </div>
          <div v-if="logoUrl" class="help ok">
            <KovaIcon name="check" size="sm" />
            Logo found
          </div>
        </div>
      </div>
    </div>

    <div class="onb-field">
      <label for="brand-description-input" class="lbl">
        One-line description
        <span class="opt">Optional</span>
      </label>
      <input
        id="brand-description-input"
        v-model="state.industry"
        name="brandDescription"
        class="input"
        type="text"
        placeholder="e.g. Global athletic footwear and apparel."
      />
    </div>

    <div class="onb-actions">
      <span />
      <button
        data-test-id="brand-identity-continue"
        class="btn primary"
        :disabled="!canContinue"
        @click="emit('next')"
      >
        Continue
        <KovaIcon name="arrow-right" size="sm" class="ic" />
      </button>
    </div>
  </div>
</template>
