<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'

import { useBrandsStore } from '@/stores/brands'

// PRD 02 §6.4.1 + Plan T34 — placeholder picker (Cluster 03 ships full A2/A3
// experience). Lists every active brand as a clickable row that routes to
// /brand/:brandId.

const brands = useBrandsStore()
const router = useRouter()

onMounted(async () => {
  if (brands.brands.length === 0) {
    await brands.fetchBrands()
  }
})

function onPick(brandId: string): void {
  void router.push(`/brand/${brandId}`)
}
</script>

<template>
  <div data-test-id="brand-picker" class="min-h-screen bg-[var(--page)] text-[var(--ink)] p-12">
    <div class="max-w-xl mx-auto flex flex-col gap-6">
      <header class="flex flex-col gap-2">
        <div class="text-xs text-[var(--ink-3)] uppercase tracking-wider">Brands</div>
        <h1 class="text-2xl font-semibold">Choose a brand</h1>
        <p class="text-sm text-[var(--ink-2)]">
          Cluster 03 will replace this page with the full A2 brand picker.
        </p>
      </header>

      <ul class="flex flex-col gap-1">
        <li v-for="b in brands.sortedActiveBrands" :key="b.id">
          <button
            :data-test-id="`pick-${b.id}`"
            class="brand-switch w-full"
            @click="onPick(b.id)"
          >
            <div class="logo">{{ b.name.charAt(0).toUpperCase() }}</div>
            <div class="name">{{ b.name }}</div>
          </button>
        </li>
      </ul>
    </div>
  </div>
</template>
