<script setup lang="ts">
import { ref } from 'vue'

import ArchiveBrandModalBody from './ArchiveBrandModalBody.vue'
import BrandSummaryRow from './BrandSummaryRow.vue'
import InfoCard from './InfoCard.vue'
import KovaButton from '@/components/ui/KovaButton.vue'
import KovaModal from '@/components/ui/KovaModal.vue'
import { toast } from '@/composables/use-toast'
import { useBrandsStore, BrandApiError } from '@/stores/brands'

import type { Brand } from '@/types/kova/database'

// W9b Cluster 03 — A4.2 Archive modal (Plan 03 Task 25).
// Neutral primary CTA (NOT .danger). Info-card + brand-summary + paragraph.

interface Props {
  brand: Brand
  open: boolean
}
const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:open', v: boolean): void
  (e: 'archived', brand: Brand): void
}>()

const store = useBrandsStore()
const isArchiving = ref<boolean>(false)

const BULLETS = [
  'Hidden from brand picker, switcher, and brand-list dropdowns.',
  'Canvases, brand kit, and chat history are preserved.',
  'Shopify connection stays connected.',
  'Restore anytime from /account/brands.',
] as const

async function archive(): Promise<void> {
  if (isArchiving.value) return
  isArchiving.value = true
  try {
    const { brand: updated } = await store.archiveBrand(props.brand.id)
    toast.show(`"${updated.name}" archived`)
    emit('archived', updated)
    emit('update:open', false)
  } catch (err) {
    if (err instanceof BrandApiError && err.code === 'already_archived') {
      toast.show('Already archived', 'warning')
      emit('update:open', false)
      return
    }
    const code = err instanceof BrandApiError ? err.code : 'unknown'
    toast.show(`Archive failed (${code})`, 'error')
  } finally {
    isArchiving.value = false
  }
}
</script>

<template>
  <KovaModal
    :open="open"
    size="md"
    :title="`Archive '${brand.name}'?`"
    @update:open="(v) => emit('update:open', v)"
  >
    <ArchiveBrandModalBody>
      <template #summary>
        <BrandSummaryRow :brand="brand" />
      </template>
      <template #explainer>
        <InfoCard :bullets="BULLETS" icon="info" />
      </template>
      <template #para>
        <p class="dlg-body__para">
          Archiving hides this brand from your active list. Nothing is deleted —
          restore anytime from
          <router-link to="/account/brands">/account/brands</router-link>.
        </p>
      </template>
    </ArchiveBrandModalBody>
    <template #foot-left>
      <span class="meta">Reversible. Browse archived brands in /account/brands.</span>
    </template>
    <template #foot>
      <KovaButton variant="ghost" @click="emit('update:open', false)">Cancel</KovaButton>
      <KovaButton variant="primary" :loading="isArchiving" @click="archive">
        Archive brand
      </KovaButton>
    </template>
  </KovaModal>
</template>
