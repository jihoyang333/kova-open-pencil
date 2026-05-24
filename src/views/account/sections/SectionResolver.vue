<script setup lang="ts">
// PRD 04 §6.4.1 — SectionResolver. Dispatches the :section URL param to
// the right section component.

import { computed, defineAsyncComponent } from 'vue'

import { useAccountSection, type AccountSection } from '@/composables/account/use-account-section'

const ProfileSection = defineAsyncComponent(() => import('./ProfileSection.vue'))
const BrandsSection = defineAsyncComponent(() => import('./BrandsSection.vue'))
const BillingSection = defineAsyncComponent(() => import('./BillingSection.vue'))
const BrandKitSection = defineAsyncComponent(() => import('./BrandKitSection.vue'))
const IntegrationsSection = defineAsyncComponent(() => import('./IntegrationsSection.vue'))
const DangerZoneSection = defineAsyncComponent(() => import('./DangerZoneSection.vue'))

const SECTION_MAP: Record<AccountSection, ReturnType<typeof defineAsyncComponent>> = {
  profile: ProfileSection,
  brands: BrandsSection,
  billing: BillingSection,
  'brand-kit': BrandKitSection,
  integrations: IntegrationsSection,
  'danger-zone': DangerZoneSection,
}

const { activeSection } = useAccountSection()
const SectionComponent = computed(() => SECTION_MAP[activeSection.value])
</script>

<template>
  <Suspense>
    <template #default>
      <component :is="SectionComponent" />
    </template>
    <template #fallback>
      <div class="acc-section-loading" role="status" aria-live="polite">Loading…</div>
    </template>
  </Suspense>
</template>
