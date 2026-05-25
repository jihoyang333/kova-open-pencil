<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

import KovaIcon from '@/components/ui/KovaIcon.vue'

import BrandSwitcher from './BrandSwitcher.vue'
import SideFooter from './SideFooter.vue'
import SideNav from './SideNav.vue'

import type { Brand } from '@/types/kova/database'

// PRD 02 §3.2 + Plan T18 — dashboard sidebar parent wrapper.
// 236px column hosting BrandSwitcher (top) + side-search + SideNav + SideFooter.

defineProps<{ currentBrand: Brand }>()

const router = useRouter()
const searchQuery = ref('')

function onSelectBrand(brandId: string): void {
  void router.push(`/brand/${brandId}`)
}

function onNavTo(routeName: string): void {
  void router.push({ name: routeName, params: router.currentRoute.value.params })
}

function onNewBrand(): void {
  // Cluster 03 owns the new-brand modal. Placeholder noop until then.
}

function onManageBrands(): void {
  void router.push('/account/brands')
}

function onOpenAccountMenu(): void {
  // Cluster 04 owns the account-menu popover.
}
</script>

<template>
  <aside data-test-id="dashboard-sidebar" class="sidebar">
    <BrandSwitcher
      :current-brand="currentBrand"
      @select="onSelectBrand"
      @new-brand="onNewBrand"
      @manage-brands="onManageBrands"
    />
    <label class="side-search">
      <KovaIcon name="search" size="sm" />
      <input v-model="searchQuery" type="search" placeholder="Search" />
    </label>
    <SideNav @nav="onNavTo" />
    <SideFooter @open-account-menu="onOpenAccountMenu" />
  </aside>
</template>
