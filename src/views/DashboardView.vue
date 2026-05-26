<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import DashboardSidebar from '@/components/dashboard/DashboardSidebar.vue'
import DashboardTopbar from '@/components/dashboard/DashboardTopbar.vue'
import { useCanvasCreation } from '@/composables/use-canvas-creation'
import { useBrandsStore } from '@/stores/brands'

// PRD 02 §3.2 + Plan T35 — dashboard shell.
// Hosts DashboardSidebar + DashboardTopbar + <router-view> for the brand-
// scoped children. NetworkStatusIndicator is mounted globally in App.vue
// (CT-020 + H5 audit fix) — no local offline UI here.

const route = useRoute()
const router = useRouter()
const brands = useBrandsStore()
const canvasCreation = useCanvasCreation()

const currentBrand = computed(() => {
  const id = route.params.brandId
  if (typeof id !== 'string') return null
  return brands.brands.find((b) => b.id === id) ?? null
})

const PAGE_LABELS: Record<string, string> = {
  'brand-recents': 'Home',
  'brand-calendar': 'Calendar',
  'brand-swipes': 'Swipes',
  'brand-templates': 'Templates',
  'brand-products': 'Products',
  'brand-personalization': 'Personalization',
  'brand-kb': 'Knowledge base',
  'brand-memories': 'Memories',
  'brand-trash': 'Trash',
}

const pageLabel = computed(() => PAGE_LABELS[String(route.name)] ?? '')

onMounted(async () => {
  await brands.fetchBrands()
  const resolved = await brands.ensureSelectedBrand()
  if (!resolved) {
    await router.push('/onboarding')
    return
  }
  const requested = typeof route.params.brandId === 'string' ? route.params.brandId : ''
  if (!requested || !brands.brands.find((b) => b.id === requested)) {
    await router.push(`/brand/${resolved.id}`)
  }
})

watch(
  () => route.params.brandId,
  (next) => {
    if (typeof next === 'string' && next.length > 0) {
      brands.selectBrand(next)
    }
  }
)

function onNewCanvas(): void {
  // H2 audit fix — publish via canvas-creation bus instead of reaching into
  // vue-router internals. The active child view (RecentsView) registers a
  // handler in onMounted + tears it down in onUnmounted.
  canvasCreation.requestNewCanvas()
}
</script>

<template>
  <div v-if="currentBrand" data-test-id="dashboard-view" class="app">
    <DashboardSidebar :current-brand="currentBrand" />
    <main class="main">
      <DashboardTopbar
        :brand-name="currentBrand.name"
        :current-page="pageLabel"
        @new-canvas="onNewCanvas"
      />
      <router-view />
    </main>
  </div>
</template>
