<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { useBrandsStore } from '@/stores/brands'
import NewClientDialog from './NewClientDialog.vue'

const route = useRoute()
const router = useRouter()
const brandsStore = useBrandsStore()

const showNewClientDialog = ref(false)

function isSelected(brandId: string): boolean {
  return route.params.brandId === brandId
}

function navigateToBrand(brandId: string): void {
  void router.push(`/dashboard/${brandId}`)
}

function navigateToAssets(brandId: string): void {
  void router.push(`/dashboard/${brandId}/assets`)
}

function navigateToTrash(): void {
  void router.push('/dashboard/trash')
}

function navigateToSettings(): void {
  void router.push('/dashboard/settings')
}
</script>

<template>
  <nav data-test-id="brand-list" class="flex flex-1 flex-col overflow-auto">
    <div class="flex-1 space-y-0.5 px-2 py-1">
      <div v-for="brand in brandsStore.sortedBrands" :key="brand.id" class="group">
        <button
          :data-test-id="`brand-item-${brand.id}`"
          class="flex w-full items-center rounded-md px-2 py-1.5 text-left text-sm transition-colors"
          :class="
            isSelected(brand.id)
              ? 'bg-gray-100 font-medium text-gray-900'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
          "
          @click="navigateToBrand(brand.id)"
        >
          <span class="truncate">{{ brand.name }}</span>
          <router-link
            :to="`/dashboard/${brand.id}/settings`"
            :data-test-id="`brand-settings-link-${brand.id}`"
            class="ml-auto opacity-0 transition-opacity group-hover:opacity-100"
            @click.stop
          >
            <icon-lucide-settings class="size-3.5 text-gray-400 hover:text-gray-600" />
          </router-link>
        </button>
        <button
          v-if="isSelected(brand.id)"
          :data-test-id="`brand-assets-link-${brand.id}`"
          class="flex w-full items-center gap-1.5 rounded-md px-2 py-1 pl-6 text-xs text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700"
          @click="navigateToAssets(brand.id)"
        >
          <icon-lucide-image class="size-3" />
          Assets
        </button>
      </div>
    </div>

    <!-- Bottom actions -->
    <div class="space-y-0.5 border-t border-gray-200 px-2 py-2">
      <button
        data-test-id="brand-new-button"
        class="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
        @click="showNewClientDialog = true"
      >
        <icon-lucide-plus class="size-4" />
        Add Client
      </button>
      <button
        data-test-id="trash-link"
        class="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-sm transition-colors"
        :class="
          route.path.endsWith('/trash')
            ? 'bg-gray-100 font-medium text-gray-900'
            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
        "
        @click="navigateToTrash"
      >
        <icon-lucide-trash-2 class="size-4" />
        Trash
      </button>
      <button
        data-test-id="settings-link"
        class="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-sm transition-colors"
        :class="
          route.path === '/dashboard/settings'
            ? 'bg-gray-100 font-medium text-gray-900'
            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
        "
        @click="navigateToSettings"
      >
        <icon-lucide-settings class="size-4" />
        Settings
      </button>
    </div>

    <NewClientDialog v-model:open="showNewClientDialog" />
  </nav>
</template>
