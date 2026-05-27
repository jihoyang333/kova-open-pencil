<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import ArchiveBrandModal from '@/components/brand/ArchiveBrandModal.vue'
import BrandCard from '@/components/brand/BrandCard.vue'
import BrandPickerEmpty from '@/components/brand/BrandPickerEmpty.vue'
import BrandsSegmentedControl, { type SegmentFilter } from '@/components/brand/BrandsSegmentedControl.vue'
import DeleteBrandModal from '@/components/brand/DeleteBrandModal.vue'
import RenameBrandModal from '@/components/brand/RenameBrandModal.vue'
import RestoreBrandModal from '@/components/brand/RestoreBrandModal.vue'
import KovaButton from '@/components/ui/KovaButton.vue'
import { useBrandsStore } from '@/stores/brands'

import type { Brand } from '@/types/kova/database'

// W9b Cluster 03 — B12 /account/brands page (Plan 03 Task 33.7).
// MVP per 2026-05-17 reversal. NO "Import" CTA anywhere.

const route = useRoute()
const router = useRouter()
const store = useBrandsStore()

function parseFilter(v: unknown): SegmentFilter {
  if (v === 'active' || v === 'archived' || v === 'all') return v
  return 'all'
}

const filter = ref<SegmentFilter>(parseFilter(route.query.filter))

watch(filter, (v) => {
  router.replace({ query: { ...route.query, filter: v } }).catch(() => {})
})

watch(
  () => route.query.filter,
  (v) => {
    filter.value = parseFilter(v)
  }
)

const renameTarget = ref<Brand | null>(null)
const archiveTarget = ref<Brand | null>(null)
const restoreTarget = ref<Brand | null>(null)
const deleteTarget = ref<Brand | null>(null)

onMounted(async () => {
  if (store.brands.length === 0) await store.fetchBrands()
  await store.fetchArchivedBrands()
})

const visible = computed<Brand[]>(() => {
  if (filter.value === 'active') return store.activeBrands
  if (filter.value === 'archived') return store.archivedBrands
  return [...store.activeBrands, ...store.archivedBrands]
})

const isEmptyArchived = computed(
  () => filter.value === 'archived' && store.archivedBrands.length === 0
)

function gotoNewBrand(): void {
  router.push('/brands/new')
}

function openBrand(id: string): void {
  store.selectBrand(id)
  router.push(`/brand/${id}`)
}
</script>

<template>
  <div class="acc-content">
    <div class="acc-hero">
      <h1 class="acc-hero__title">Brands</h1>
      <KovaButton variant="primary" icon="plus" @click="gotoNewBrand">New brand</KovaButton>
    </div>

    <BrandsSegmentedControl v-model="filter" />

    <BrandPickerEmpty
      v-if="isEmptyArchived"
      title="No archived brands"
      body="Archive a brand from /brands to see it here."
      :show-cta="false"
    />

    <div v-else class="bp-grid bp-grid--account">
      <BrandCard
        v-for="brand in visible"
        :key="brand.id"
        :brand="brand"
        @select="openBrand"
        @rename="(b) => (renameTarget = b)"
        @archive="(b) => (archiveTarget = b)"
        @restore="(b) => (restoreTarget = b)"
        @delete="(b) => (deleteTarget = b)"
      />
    </div>

    <RenameBrandModal
      v-if="renameTarget"
      :brand="renameTarget"
      :open="renameTarget !== null"
      @update:open="(v) => { if (!v) renameTarget = null }"
    />
    <ArchiveBrandModal
      v-if="archiveTarget"
      :brand="archiveTarget"
      :open="archiveTarget !== null"
      @update:open="(v) => { if (!v) archiveTarget = null }"
    />
    <RestoreBrandModal
      v-if="restoreTarget"
      :brand="restoreTarget"
      :open="restoreTarget !== null"
      @update:open="(v) => { if (!v) restoreTarget = null }"
    />
    <DeleteBrandModal
      v-if="deleteTarget"
      :brand="deleteTarget"
      :open="deleteTarget !== null"
      @update:open="(v) => { if (!v) deleteTarget = null }"
    />
  </div>
</template>
