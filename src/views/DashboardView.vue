<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import AccountMenu from '@/components/dashboard/AccountMenu.vue'
import BrandList from '@/components/dashboard/BrandList.vue'
import EmptyState from '@/components/dashboard/EmptyState.vue'
import { useBrandsStore } from '@/stores/brands'

const route = useRoute()
const router = useRouter()
const brandsStore = useBrandsStore()

const heading = computed(() => {
  if (route.path.endsWith('/trash')) return 'Trash'
  const brand = brandsStore.selectedBrand
  if (route.path.endsWith('/assets')) return brand ? `${brand.name} › Assets` : 'Brand Assets'
  return brand?.name ?? 'Dashboard'
})

onMounted(async () => {
  await brandsStore.fetchBrands()
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

async function handleNewBrand(): Promise<void> {
  try {
    const brand = await brandsStore.createBrand('My Brand')
    void router.push(`/dashboard/${brand.id}`)
  } catch (error) {
    console.error('Failed to create brand:', error)
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
