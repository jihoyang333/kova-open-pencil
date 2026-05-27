<script setup lang="ts">
import { ref } from 'vue'

import BrandSummaryRow from './BrandSummaryRow.vue'
import KovaButton from '@/components/ui/KovaButton.vue'
import KovaModal from '@/components/ui/KovaModal.vue'
import { toast } from '@/composables/use-toast'
import { useBrandsStore, BrandApiError } from '@/stores/brands'

import type { Brand } from '@/types/kova/database'

// W9b Cluster 03 — B12.3 Restore modal (Plan 03 Task 26.5).
// Neutral confirm. NO typed-confirm. MVP per 2026-05-17 reversal.

interface Props {
  brand: Brand
  open: boolean
}
const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:open', v: boolean): void
  (e: 'restored', brand: Brand): void
}>()

const store = useBrandsStore()
const isRestoring = ref<boolean>(false)

async function restore(): Promise<void> {
  if (isRestoring.value) return
  isRestoring.value = true
  try {
    const updated = await store.restoreBrand(props.brand.id)
    toast.show(`"${updated.name}" restored`)
    emit('restored', updated)
    emit('update:open', false)
  } catch (err) {
    if (err instanceof BrandApiError && err.code === 'feature_disabled') {
      toast.show('Restore is temporarily disabled', 'warning')
      emit('update:open', false)
      return
    }
    if (err instanceof BrandApiError && err.code === 'not_archived') {
      toast.show('Brand is not archived', 'warning')
      emit('update:open', false)
      return
    }
    const code = err instanceof BrandApiError ? err.code : 'unknown'
    toast.show(`Restore failed (${code})`, 'error')
  } finally {
    isRestoring.value = false
  }
}
</script>

<template>
  <KovaModal
    :open="open"
    size="sm"
    :title="`Restore '${brand.name}'?`"
    @update:open="(v) => emit('update:open', v)"
  >
    <div class="dlg-body__stack">
      <BrandSummaryRow :brand="brand" />
      <p class="dlg-body__para">
        Restoring brings this brand back to your active list. Canvases, kit,
        Shopify, and chat are unchanged.
      </p>
    </div>
    <template #foot-left>
      <span class="meta">Restored brands return to your active list. No data changes.</span>
    </template>
    <template #foot>
      <KovaButton variant="ghost" @click="emit('update:open', false)">Cancel</KovaButton>
      <KovaButton variant="primary" :loading="isRestoring" @click="restore">
        Restore brand
      </KovaButton>
    </template>
  </KovaModal>
</template>
