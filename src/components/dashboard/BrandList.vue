<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { useBrandsStore } from '@/stores/brands'

const route = useRoute()
const router = useRouter()
const brandsStore = useBrandsStore()

const isCreating = ref(false)
const newBrandName = ref('')

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

function startCreating(): void {
  isCreating.value = true
  newBrandName.value = ''
}

async function submitNewBrand(): Promise<void> {
  const name = newBrandName.value.trim()
  if (!name) {
    isCreating.value = false
    return
  }
  try {
    const brand = await brandsStore.createBrand(name)
    navigateToBrand(brand.id)
  } catch (error) {
    console.error('Failed to create brand:', error)
  } finally {
    isCreating.value = false
    newBrandName.value = ''
  }
}

function cancelCreating(): void {
  isCreating.value = false
  newBrandName.value = ''
}
</script>

<template>
  <nav data-test-id="brand-list" class="flex flex-1 flex-col overflow-auto">
    <div class="flex-1 space-y-0.5 px-2 py-1">
      <div v-for="brand in brandsStore.sortedBrands" :key="brand.id">
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

    <!-- New Brand form -->
    <div v-if="isCreating" class="px-2 pb-2">
      <input
        data-test-id="brand-new-name-input"
        v-model="newBrandName"
        class="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm text-gray-900 outline-none focus:border-blue-500"
        placeholder="Brand name"
        autofocus
        @keydown.enter="submitNewBrand"
        @keydown.escape="cancelCreating"
        @blur="submitNewBrand"
      />
    </div>

    <!-- Bottom actions -->
    <div class="space-y-0.5 border-t border-gray-200 px-2 py-2">
      <button
        data-test-id="brand-new-button"
        class="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
        @click="startCreating"
      >
        <icon-lucide-plus class="size-4" />
        New Brand
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
    </div>
  </nav>
</template>
