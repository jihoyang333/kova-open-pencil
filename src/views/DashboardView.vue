<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import AccountMenu from '@/components/dashboard/AccountMenu.vue'
import BrandList from '@/components/dashboard/BrandList.vue'
import EmptyState from '@/components/dashboard/EmptyState.vue'
import { toast } from '@/composables/use-toast'
import { supabase } from '@/lib/supabase'
import { useBrandsStore } from '@/stores/brands'
import {
  dismissBanner,
  hasBrandMissingShopify,
  isBannerSuppressed,
} from '@/utils/shopify-banner'

const route = useRoute()
const router = useRouter()
const brandsStore = useBrandsStore()

// --- Shopify banner ---
const bannerDismissed = ref(false)
const connectedBrandIds = ref<ReadonlySet<string>>(new Set())

const showShopifyBanner = computed(() => {
  if (bannerDismissed.value) return false
  const brandIds = brandsStore.sortedBrands.map((b) => b.id)
  return hasBrandMissingShopify(brandIds, connectedBrandIds.value)
})

function handleDismissBanner(): void {
  dismissBanner(Date.now(), localStorage)
  bannerDismissed.value = true
}

async function fetchConnectedBrandIds(): Promise<void> {
  const brandIds = brandsStore.sortedBrands.map((b) => b.id)
  if (brandIds.length === 0) return
  const { data } = await supabase
    .from('shopify_connections')
    .select('brand_id')
    .eq('status', 'active')
    .in('brand_id', brandIds)
  connectedBrandIds.value = new Set((data ?? []).map((r) => r.brand_id as string))
}
// ----------------------

const heading = computed(() => {
  if (route.path.endsWith('/trash')) return 'Trash'
  const brand = brandsStore.selectedBrand
  if (route.path.endsWith('/settings') && route.params.brandId)
    return brand ? `${brand.name} › Settings` : 'Brand Settings'
  if (route.path.endsWith('/assets')) return brand ? `${brand.name} › Assets` : 'Brand Assets'
  return brand?.name ?? 'Dashboard'
})

onMounted(async () => {
  bannerDismissed.value = isBannerSuppressed(Date.now(), localStorage)
  await brandsStore.fetchBrands()
  await fetchConnectedBrandIds()
  redirectToFirstBrandIfNeeded()
})

watch(
  () => route.params.brandId,
  (brandId) => {
    if (typeof brandId === 'string') {
      brandsStore.selectBrand(brandId)
    }
  },
  { immediate: true }
)

const isCreating = ref(false)

async function handleNewBrand(): Promise<void> {
  if (isCreating.value) return
  isCreating.value = true
  try {
    const brand = await brandsStore.createBrand('Untitled Brand')
    void router.push(`/dashboard/${brand.id}/settings`)
  } catch {
    toast.show('Failed to create brand', 'error')
  } finally {
    isCreating.value = false
  }
}

function redirectToFirstBrandIfNeeded(): void {
  const atDashboardRoot = route.path === '/dashboard' || route.path === '/dashboard/'
  if (atDashboardRoot && brandsStore.sortedBrands.length > 0) {
    void router.replace(`/dashboard/${brandsStore.sortedBrands[0].id}`)
  }
}
</script>

<template>
  <div data-test-id="dashboard-view" class="flex h-screen bg-white">
    <!-- Sidebar -->
    <aside class="flex w-60 shrink-0 flex-col border-r border-gray-200">
      <div class="flex items-center gap-2 px-4 py-3">
        <img src="/favicon-32.png" class="size-6 rounded" alt="Kova" />
        <span class="text-sm font-semibold text-gray-900">Kova</span>
      </div>
      <BrandList />
    </aside>

    <!-- Main area -->
    <div class="flex flex-1 flex-col overflow-hidden">
      <!-- Shopify connect banner -->
      <div
        v-if="showShopifyBanner"
        data-test-id="shopify-banner"
        class="flex shrink-0 items-center justify-between bg-blue-50 px-6 py-2.5 text-sm text-blue-800"
      >
        <span>Connect Shopify to unlock AI-powered product emails for your brands.</span>
        <button
          data-test-id="shopify-banner-dismiss"
          class="ml-4 shrink-0 text-blue-600 hover:text-blue-800"
          @click="handleDismissBanner"
        >
          Dismiss
        </button>
      </div>

      <!-- Top bar -->
      <header class="flex shrink-0 items-center justify-between border-b border-gray-200 px-6 py-4">
        <h1 class="text-lg font-semibold text-gray-900">{{ heading }}</h1>
        <AccountMenu />
      </header>

      <!-- Content -->
      <main class="flex-1 overflow-auto p-6">
        <div v-if="brandsStore.isLoading" class="flex h-full items-center justify-center">
          <div
            class="size-6 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500"
          />
        </div>
        <EmptyState
          v-else-if="brandsStore.sortedBrands.length === 0"
          title="Create your first brand"
          description="Organize your email designs by brand. Start by creating a new brand."
          action-label="New Brand"
          @action="handleNewBrand"
        />
        <router-view v-else />
      </main>
    </div>
  </div>
</template>
