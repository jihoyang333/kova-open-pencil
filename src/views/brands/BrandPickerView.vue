<script setup lang="ts">
import { useLocalStorage } from '@vueuse/core'
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import ArchiveBrandModal from '@/components/brand/ArchiveBrandModal.vue'
import BrandCard from '@/components/brand/BrandCard.vue'
import BrandPickerEmpty from '@/components/brand/BrandPickerEmpty.vue'
import BrandsArchivedFilter, { type ArchivedFilter } from '@/components/brand/BrandsArchivedFilter.vue'
import DeleteBrandModal from '@/components/brand/DeleteBrandModal.vue'
import NewBrandTile from '@/components/brand/NewBrandTile.vue'
import RenameBrandModal from '@/components/brand/RenameBrandModal.vue'
import RestoreBrandModal from '@/components/brand/RestoreBrandModal.vue'
import KovaButton from '@/components/ui/KovaButton.vue'
import KovaIcon from '@/components/ui/KovaIcon.vue'
import KovaInput from '@/components/ui/KovaInput.vue'
import { useBrandsStore } from '@/stores/brands'

import type { Brand } from '@/types/kova/database'

// W9b Cluster 03 — A2 Brand picker (Plan 03 Task 30).

const router = useRouter()
const store = useBrandsStore()

const search = ref<string>('')
const sortMode = useLocalStorage<'updated' | 'name'>('kova:brands:sort-mode', 'updated')
const archivedFilter = ref<ArchivedFilter>('hide')

const renameTarget = ref<Brand | null>(null)
const archiveTarget = ref<Brand | null>(null)
const restoreTarget = ref<Brand | null>(null)
const deleteTarget = ref<Brand | null>(null)

onMounted(async () => {
  if (store.brands.length === 0) {
    await store.fetchBrands()
  }
})

const filtered = computed<Brand[]>(() => {
  const query = search.value.trim().toLowerCase()
  let pool: Brand[] = []
  if (archivedFilter.value === 'only') {
    pool = [...store.archivedBrands]
  } else if (archivedFilter.value === 'show') {
    pool = [...store.activeBrands, ...store.archivedBrands]
  } else {
    pool = [...store.activeBrands]
  }
  if (query.length > 0) {
    pool = pool.filter(
      (b) =>
        b.name.toLowerCase().includes(query) ||
        (b.url?.toLowerCase().includes(query) ?? false)
    )
  }
  if (sortMode.value === 'name') {
    pool.sort((a, b) => a.name.localeCompare(b.name))
  } else {
    pool.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
  }
  return pool
})

const showEmpty = computed(
  () => !store.isLoading && store.activeBrands.length === 0 && archivedFilter.value === 'hide'
)

function gotoAccount(): void {
  router.push('/account').catch(() => router.push('/account/coming-soon'))
}

function gotoNewBrand(): void {
  router.push('/brands/new')
}

function openBrand(id: string): void {
  store.selectBrand(id)
  router.push(`/brand/${id}`)
}
</script>

<template>
  <div class="bp-shell">
    <div class="bp-top">
      <h1 class="bp-top__title">Your brands</h1>
      <div class="bp-top__actions">
        <KovaInput
          v-model="search"
          type="search"
          placeholder="Search brands"
          aria-label="Search brands"
        />
        <BrandsArchivedFilter @change="(v) => (archivedFilter = v)" />
        <KovaButton variant="ghost" icon="user" @click="gotoAccount">Account</KovaButton>
        <KovaButton variant="primary" icon="plus" @click="gotoNewBrand">New brand</KovaButton>
      </div>
    </div>

    <div v-if="store.isLoading" class="bp-skeleton" aria-busy="true" aria-live="polite">
      <KovaIcon name="loader" size="md" aria-hidden="true" /> Loading brands…
    </div>

    <BrandPickerEmpty v-else-if="showEmpty" @cta="gotoNewBrand" />

    <div v-else class="bp-grid">
      <BrandCard
        v-for="brand in filtered"
        :key="brand.id"
        :brand="brand"
        @select="openBrand"
        @rename="(b) => (renameTarget = b)"
        @archive="(b) => (archiveTarget = b)"
        @restore="(b) => (restoreTarget = b)"
        @delete="(b) => (deleteTarget = b)"
      />
      <NewBrandTile @click="gotoNewBrand" />
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
