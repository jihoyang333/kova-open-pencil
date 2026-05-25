<script setup lang="ts">
import { onMounted } from 'vue'

import BrandIdentityStep from '@/components/onboarding/BrandIdentityStep.vue'
import BrandKitStep from '@/components/onboarding/BrandKitStep.vue'
import SplashStep from '@/components/onboarding/SplashStep.vue'
import StoreTypeStep from '@/components/onboarding/StoreTypeStep.vue'
import { useBrandKitExtractQueue } from '@/composables/use-brand-kit-extract-queue'
import { useOnboarding } from '@/composables/use-onboarding'

// PRD 02 §3.1 + Plan T17 — wizard host. Mounts the right step component
// based on useOnboarding().step.value. Retires the M9 provide/inject pattern
// + 2-pane layout. 5-segment progress strip (dot 1 = auth, dots 2-5 = wizard).

const wizard = useOnboarding()
const { state } = wizard
const { enqueueBrandKitExtract } = useBrandKitExtractQueue()

const STEP_ORDER = ['brand', 'shopify', 'brand-kit', 'splash'] as const

onMounted(() => wizard.restoreDraft())

function dotClass(idx: number): string {
  // Auth (dot 1) is always completed by the time the user reaches this view.
  if (idx === 1) return 'done'
  const currentIdx = STEP_ORDER.indexOf(wizard.step.value) + 2 // +2 because auth fills dot 1
  if (idx < currentIdx) return 'done'
  if (idx === currentIdx) return 'active'
  return ''
}

async function onBrandKitCommit(payload: { files: File[]; guidelines: string }): Promise<void> {
  await enqueueBrandKitExtract({
    brand_id: state.tempBrandId,
    files: payload.files,
    guidelines: payload.guidelines.trim(),
    source: 'onboarding',
  })
  wizard.next()
}

function onShopifyConnect(_redirectUrl: string): void {
  // OAuth start opens the Shopify authorize URL via window.location elsewhere.
  // The wizard advances optimistically; callback will land the user in /brand.
  wizard.next()
}
</script>

<template>
  <div data-test-id="onboarding-view" class="onb-shell">
    <div class="onb-progress">
      <div class="wordmark flex items-center gap-2">
        <div class="glyph w-6 h-6 rounded-md grid place-items-center bg-[var(--surface-on-dark)] text-[var(--ink-on-light)] font-bold">
          K
        </div>
        <span class="text-sm text-[var(--ink-2)]">Kova</span>
      </div>
      <div class="dots">
        <div v-for="i in 5" :key="i" class="dot" :class="dotClass(i)" />
      </div>
      <div class="corner">
        <span v-if="wizard.step.value === 'splash'">Done</span>
        <span v-else>
          Step {{ STEP_ORDER.indexOf(wizard.step.value) + 2 }} / 5
        </span>
      </div>
    </div>

    <div class="onb-stage">
      <BrandIdentityStep
        v-if="wizard.step.value === 'brand'"
        @next="wizard.next"
      />
      <StoreTypeStep
        v-else-if="wizard.step.value === 'shopify'"
        :brand-name="state.brandName"
        :brand-id="state.tempBrandId"
        @skip="wizard.next"
        @connect-shopify="onShopifyConnect"
        @something-else="wizard.next"
      />
      <BrandKitStep
        v-else-if="wizard.step.value === 'brand-kit'"
        @skip="wizard.next"
        @commit="onBrandKitCommit"
      />
      <SplashStep
        v-else-if="wizard.step.value === 'splash'"
        :brand-name="state.brandName"
        @enter="wizard.complete"
      />
    </div>
  </div>
</template>
