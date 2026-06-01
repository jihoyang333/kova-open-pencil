<script setup lang="ts">
// Cluster 05 — VisualsTab.vue (PRD §3.2, A7.3.1)
// Colors · Fonts · Logo. Wired to useBrandKitStore + useBrandFontsStore.

import { computed, onMounted, onUnmounted, ref } from 'vue'

import EmptyState from '@/components/ui/EmptyState.vue'
import KovaSkeleton from '@/components/ui/KovaSkeleton.vue'
import BrandColorEditModal from './modals/BrandColorEditModal.vue'
import BrandColorAddTile from './visuals/BrandColorAddTile.vue'
import BrandColorSwatch from './visuals/BrandColorSwatch.vue'
import BrandFontRow from './visuals/BrandFontRow.vue'
import BrandLogoRow from './visuals/BrandLogoRow.vue'
import FontUploadDropzone from './visuals/FontUploadDropzone.vue'
import { useBrandKitStore } from '@/stores/brand-kit'
import { useBrandFontsStore } from '@/stores/brand-fonts'
import { useFontUpload } from '@/composables/brand-kit/use-font-upload'
import { useLogoUpload } from '@/composables/brand-kit/use-logo-upload'
import { toast } from '@/composables/use-toast'
import type { BrandColor } from '@/types/brand-kit'

const brandKitStore = useBrandKitStore()
const fontsStore = useBrandFontsStore()
const fontUpload = useFontUpload()
const logoUpload = useLogoUpload()

// Dropzone expects progress 0–100; useFontUpload exposes 0–1 (code-review MEDIUM-1).
const fontUploadProgress = computed(() =>
  fontUpload.progress.value > 0 ? Math.round(fontUpload.progress.value * 100) : undefined,
)

const loading = ref(true)
const error = ref<string | null>(null)
let unsubFonts: (() => void) | null = null

const brandId = computed(() => brandKitStore.brandId)

onMounted(async () => {
  if (!brandId.value) { loading.value = false; return }
  try {
    await fontsStore.fetchFonts(brandId.value)
    unsubFonts = fontsStore.subscribeRealtime(brandId.value)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load fonts'
  } finally {
    loading.value = false
  }
})

onUnmounted(() => {
  unsubFonts?.()
})

const fonts = computed(() =>
  brandId.value ? fontsStore.fontsForBrand(brandId.value) : [],
)

async function onFontUpload(file: File, familyName: string, licenseAttested: boolean): Promise<void> {
  if (!brandId.value) return
  try {
    // Route through useFontUpload so its progress/error reactive views (bound on
    // the dropzone) surface the failure to the user (code-review HIGH-2).
    await fontUpload.upload(brandId.value, file, familyName, licenseAttested)
  } catch (e) {
    console.warn('[brand-kit] font upload failed', e)
  }
}

async function onFontDelete(fontId: string): Promise<void> {
  try {
    await fontsStore.deleteFont(fontId)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Delete failed'
  }
}

// --- color edit / add (fixed 4-slot model) ---

const colorModalOpen = ref(false)
const colorModalMode = ref<'edit' | 'add'>('edit')
const editingSlotKey = ref<string>('primary')
const editingSlotLabel = ref<string>('Primary')
const editingHex = ref<string>('')
const colorSaving = ref(false)

function onColorEdit(color: BrandColor): void {
  colorModalMode.value = 'edit'
  editingSlotKey.value = color.id
  editingSlotLabel.value = color.label
  editingHex.value = color.hex
  colorModalOpen.value = true
}

function onColorAdd(): void {
  const slot = brandKitStore.nextEmptyColorSlot
  if (!slot) return
  const meta = brandKitStore.colorSlots.find((s) => s.key === slot)
  colorModalMode.value = 'add'
  editingSlotKey.value = slot
  editingSlotLabel.value = meta?.label ?? slot
  editingHex.value = ''
  colorModalOpen.value = true
}

async function onColorSave(hex: string): Promise<void> {
  colorSaving.value = true
  try {
    await brandKitStore.updateBrandColor(
      editingSlotKey.value as Parameters<typeof brandKitStore.updateBrandColor>[0],
      hex,
    )
    colorModalOpen.value = false
  } catch (e) {
    toast.show(e instanceof Error ? e.message : 'Failed to save color', 'error')
  } finally {
    colorSaving.value = false
  }
}

// --- logo upload (primary mark only; wordmark needs a Cluster 03 column) ---

const logoFileInput = ref<HTMLInputElement | null>(null)

function onLogoUpload(kind: 'logo' | 'wordmark'): void {
  if (kind === 'wordmark') {
    toast.show('Wordmark upload is coming soon.')
    return
  }
  logoFileInput.value?.click()
}

async function onLogoFileChange(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = '' // allow re-selecting the same file
  if (!file || !brandId.value) return
  try {
    await logoUpload.upload(brandId.value, file)
    toast.show('Logo updated.')
  } catch {
    toast.show(logoUpload.error.value ?? 'Logo upload failed', 'error')
  }
}
</script>

<template>
  <div class="bk-pane">
    <!-- Skeletons while loading -->
    <template v-if="loading">
      <KovaSkeleton height="88px" variant="card" />
      <KovaSkeleton height="60px" variant="card" />
      <KovaSkeleton height="60px" variant="card" />
    </template>

    <template v-else-if="error">
      <EmptyState
        icon="alert-triangle"
        headline="Failed to load visuals"
        :body="error"
      />
    </template>

    <template v-else>
      <!-- Brand colors -->
      <section aria-label="Brand colors">
        <div class="bk-section-label">Colors</div>
        <div class="sw-list">
          <BrandColorSwatch
            v-for="color in brandKitStore.brandColors"
            :key="color.id"
            :color="color"
            @edit="onColorEdit"
          />
          <BrandColorAddTile
            v-if="brandKitStore.nextEmptyColorSlot"
            @open="onColorAdd"
          />
        </div>
        <EmptyState
          v-if="brandKitStore.brandColors.length === 0"
          variant="inline-32"
          icon="palette"
          headline="No brand colors yet"
          body="Add your first color above."
        />
      </section>

      <!-- Brand fonts -->
      <section aria-label="Brand fonts">
        <div class="bk-section-label">Fonts</div>
        <BrandFontRow
          v-for="font in fonts"
          :key="font.id"
          :font="font"
          @delete="onFontDelete"
        />
        <div class="bk-mt-8">
          <FontUploadDropzone
            :brand-id="brandId ?? ''"
            :progress="fontUploadProgress"
            :error="fontUpload.error.value ?? undefined"
            @upload="onFontUpload"
          />
        </div>
      </section>

      <!-- Logo -->
      <section aria-label="Brand logo">
        <div class="bk-section-label">Logo</div>
        <BrandLogoRow
          kind="logo"
          label="Primary mark"
          :url="brandKitStore.brandLogoUrl"
          @upload="() => onLogoUpload('logo')"
        />
        <BrandLogoRow
          kind="wordmark"
          label="Wordmark"
          :url="null"
          class="bk-mt-8"
          @upload="() => onLogoUpload('wordmark')"
        />
        <input
          ref="logoFileInput"
          type="file"
          accept="image/png,image/jpeg,image/svg+xml,image/webp"
          class="bk-visually-hidden"
          aria-hidden="true"
          tabindex="-1"
          @change="onLogoFileChange"
        />
      </section>

      <BrandColorEditModal
        v-model:open="colorModalOpen"
        :slot-label="editingSlotLabel"
        :initial-hex="editingHex"
        :mode="colorModalMode"
        :saving="colorSaving"
        @save="onColorSave"
      />
    </template>
  </div>
</template>
