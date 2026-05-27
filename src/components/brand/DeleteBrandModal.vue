<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import BrandSummaryRow from './BrandSummaryRow.vue'
import LossList, { type LossListItem } from './LossList.vue'
import TypedConfirmField from './TypedConfirmField.vue'
import KovaButton from '@/components/ui/KovaButton.vue'
import KovaModal from '@/components/ui/KovaModal.vue'
import { toast } from '@/composables/use-toast'
import { useBrandsStore, BrandApiError } from '@/stores/brands'

import type { Brand } from '@/types/kova/database'

// W9b Cluster 03 — A4.3 Delete modal + B12.4 Delete-archived (Plan 03 Task 26).
// Typed-confirm = brand name (case-sensitive). Hard cascade via /api/brands/delete.
// Footer override per PRD §12.8: "This action is permanent." regardless of caller.

interface Props {
  brand: Brand
  open: boolean
}
const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:open', v: boolean): void
  (e: 'deleted', brandId: string): void
}>()

const store = useBrandsStore()
const typed = ref<string>('')
const isDeleting = ref<boolean>(false)
const isMatched = ref<boolean>(false)

watch(
  () => props.open,
  (open) => {
    if (open) {
      typed.value = ''
      isMatched.value = false
    }
  }
)

// PRD §6.4 / §12.5: loss-list counts. Pulled from window globals while child
// stores aren't yet wired in this cluster (Cluster 09 snapshots, Cluster 05
// brand-kit, etc.). Renders as `—` when undefined.
// L7 / Plan T35: TODO(C05,C09) — replace with real store reads once the
// brand-kit + snapshot stores ship. The window globals are a tactical bridge,
// not a long-term interface.
function readGlobalCount(key: string): number | null {
  const winRef = (window as unknown as Record<string, unknown>)[key]
  return typeof winRef === 'number' ? winRef : null
}

const lossItems = computed<LossListItem[]>(() => [
  { icon: 'image', label: 'Canvases', count: readGlobalCount('__kova_canvases_count') },
  { icon: 'history', label: 'Version snapshots', count: readGlobalCount('__kova_snapshots_count') },
  { icon: 'palette', label: 'Brand kit', count: null },
  { icon: 'database', label: 'Knowledge base sources', count: readGlobalCount('__kova_kb_sources_count') },
  { icon: 'shopping-bag', label: 'Shopify connection', count: readGlobalCount('__kova_shopify_count') },
])

const canDelete = computed(() => isMatched.value && !isDeleting.value)

async function confirmDelete(): Promise<void> {
  if (!canDelete.value) return
  isDeleting.value = true
  try {
    await store.deleteBrand(props.brand.id, typed.value)
    toast.show(`"${props.brand.name}" deleted`)
    emit('deleted', props.brand.id)
    emit('update:open', false)
  } catch (err) {
    if (err instanceof BrandApiError && err.code === 'confirm_mismatch') {
      toast.show("Confirmation didn't match", 'error')
      typed.value = ''
      isMatched.value = false
      return
    }
    const code = err instanceof BrandApiError ? err.code : 'unknown'
    toast.show(`Delete failed (${code})`, 'error')
  } finally {
    isDeleting.value = false
  }
}
</script>

<template>
  <KovaModal
    :open="open"
    size="md"
    :title="`Delete brand '${brand.name}'?`"
    description="This action is permanent and cannot be undone."
    @update:open="(v) => emit('update:open', v)"
  >
    <div class="dlg-body__stack">
      <BrandSummaryRow :brand="brand" />
      <LossList :items="lossItems" heading="This will permanently delete:" />
      <div class="fld">
        <label for="delete-brand-typed" class="label">
          Type <strong>{{ brand.name }}</strong> to confirm
        </label>
        <TypedConfirmField
          id="delete-brand-typed"
          v-model="typed"
          :expected="brand.name"
          @matched="(v) => (isMatched = v)"
        />
      </div>
    </div>
    <template #foot-left>
      <span class="meta meta--warn">This action is permanent.</span>
    </template>
    <template #foot>
      <KovaButton variant="ghost" @click="emit('update:open', false)">Cancel</KovaButton>
      <KovaButton
        variant="danger"
        :disabled="!canDelete"
        :loading="isDeleting"
        @click="confirmDelete"
      >
        Delete brand
      </KovaButton>
    </template>
  </KovaModal>
</template>
