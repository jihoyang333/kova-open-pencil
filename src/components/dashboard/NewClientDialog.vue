<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  DialogRoot,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from 'reka-ui'
import { useBrandsStore } from '@/stores/brands'
import { toast } from '@/composables/use-toast'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const router = useRouter()
const brandsStore = useBrandsStore()

const name = ref('')
const url = ref('')
const isSubmitting = ref(false)

function resetForm(): void {
  name.value = ''
  url.value = ''
  isSubmitting.value = false
}

async function handleCreate(): Promise<void> {
  if (!name.value.trim()) return
  isSubmitting.value = true

  try {
    const brand = url.value.trim()
      ? await brandsStore.createBrandFull({
          name: name.value.trim(),
          url: url.value.trim(),
        })
      : await brandsStore.createBrand(name.value.trim())

    emit('update:open', false)
    resetForm()

    if (brand) {
      void router.push(`/dashboard/${brand.id}`)
    }
  } catch {
    toast.show('Failed to create brand', 'error')
  } finally {
    isSubmitting.value = false
  }
}

function handleOpenChange(open: boolean): void {
  emit('update:open', open)
  if (!open) resetForm()
}
</script>

<template>
  <DialogRoot :open="props.open" @update:open="handleOpenChange">
    <DialogPortal>
      <DialogOverlay class="fixed inset-0 z-40 bg-black/50" />
      <DialogContent
        class="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-6 shadow-xl"
      >
        <DialogTitle class="text-base font-semibold text-gray-900">
          New Client
        </DialogTitle>
        <DialogDescription class="mt-1 text-sm text-gray-500">
          Create a new brand profile. Optionally provide a website URL to auto-extract brand data.
        </DialogDescription>

        <div class="mt-4 space-y-3">
          <div>
            <label for="new-client-name" class="mb-1 block text-sm font-medium text-gray-700">
              Brand Name <span class="text-red-500">*</span>
            </label>
            <input
              id="new-client-name"
              v-model="name"
              data-test-id="new-client-name"
              type="text"
              placeholder="e.g. Acme Corp"
              class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              @keydown.enter="handleCreate"
            />
          </div>

          <div>
            <label for="new-client-url" class="mb-1 block text-sm font-medium text-gray-700">
              Website URL
              <span class="text-xs text-gray-400">(optional)</span>
            </label>
            <input
              id="new-client-url"
              v-model="url"
              data-test-id="new-client-url"
              type="url"
              placeholder="https://example.com"
              class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              @keydown.enter="handleCreate"
            />
          </div>
        </div>

        <div class="mt-6 flex justify-end gap-3">
          <DialogClose as-child>
            <button
              data-test-id="new-client-cancel"
              class="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </DialogClose>
          <button
            data-test-id="new-client-create"
            class="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-50"
            :disabled="!name.trim() || isSubmitting"
            @click="handleCreate"
          >
            {{ isSubmitting ? 'Creating…' : 'Create' }}
          </button>
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
