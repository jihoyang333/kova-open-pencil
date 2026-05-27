<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'

import KovaButton from '@/components/ui/KovaButton.vue'
import KovaModal from '@/components/ui/KovaModal.vue'
import { toast } from '@/composables/use-toast'
import { sanitizePlainText } from '@/lib/sanitize-text'
import { useBrandsStore, BrandApiError } from '@/stores/brands'

import type { Brand } from '@/types/kova/database'

// W9b Cluster 03 — A4.1 Rename modal (Plan 03 Task 24).

interface Props {
  brand: Brand
  open: boolean
}
const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:open', v: boolean): void
  (e: 'saved', brand: Brand): void
}>()

const store = useBrandsStore()
const draft = ref<string>(props.brand.name)
const isSaving = ref<boolean>(false)
const inputRef = ref<HTMLInputElement | null>(null)

watch(
  () => props.open,
  async (open) => {
    if (open) {
      draft.value = props.brand.name
      await nextTick()
      inputRef.value?.focus()
      inputRef.value?.select()
    }
  }
)

const canSave = computed(() => {
  const cleaned = sanitizePlainText(draft.value)
  return cleaned.length > 0 && cleaned !== props.brand.name && !isSaving.value
})

async function save(): Promise<void> {
  if (!canSave.value) return
  const cleaned = sanitizePlainText(draft.value)
  isSaving.value = true
  try {
    const updated = await store.renameBrand(props.brand.id, cleaned)
    toast.show('Brand renamed')
    emit('saved', updated)
    emit('update:open', false)
  } catch (err) {
    const code = err instanceof BrandApiError ? err.code : 'unknown'
    toast.show(`Rename failed (${code})`, 'error')
  } finally {
    isSaving.value = false
  }
}

function onSubmit(): void {
  void save()
}

// M12: bare Enter already submits via the <form> default. The Cmd/Ctrl+Enter
// handler stays because the modal's expected next iteration adds a multi-line
// description textarea (PRD A4.1 Phase 2) where the implicit form submit no
// longer fires. Keep the seam so the shortcut continues to work.
function onKey(e: KeyboardEvent): void {
  if ((e.metaKey || e.ctrlKey) && e.code === 'Enter') {
    e.preventDefault()
    void save()
  }
}
</script>

<template>
  <KovaModal
    :open="open"
    size="sm"
    title="Rename brand"
    @update:open="(v) => emit('update:open', v)"
  >
    <form class="fld-stack" @submit.prevent="onSubmit" @keydown="onKey">
      <div class="fld">
        <label for="rename-brand-name" class="label">Brand name</label>
        <input
          id="rename-brand-name"
          ref="inputRef"
          v-model="draft"
          class="input"
          type="text"
          maxlength="80"
          autocomplete="off"
        />
      </div>
      <div class="fld">
        <label class="label">URL slug</label>
        <input
          class="input"
          type="text"
          readonly
          :value="brand.slug ?? '(generated on save)'"
          aria-readonly="true"
        />
        <p class="help">Slug is immutable after creation.</p>
      </div>
    </form>
    <template #foot-left>
      <span class="meta">Renaming is reversible. No data is touched.</span>
    </template>
    <template #foot>
      <KovaButton variant="ghost" @click="emit('update:open', false)">Cancel</KovaButton>
      <KovaButton
        variant="primary"
        :disabled="!canSave"
        :loading="isSaving"
        @click="save"
      >
        Save
      </KovaButton>
    </template>
  </KovaModal>
</template>
