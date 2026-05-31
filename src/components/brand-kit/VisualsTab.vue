<script setup lang="ts">
// Cluster 05 — VisualsTab.vue (PRD §3.2, A7.3.1)
// Colors · Fonts · Logo. Wired to useBrandKitStore + useBrandFontsStore.

import { computed, onMounted, onUnmounted, ref } from 'vue'

import EmptyState from '@/components/ui/EmptyState.vue'
import KovaSkeleton from '@/components/ui/KovaSkeleton.vue'
import BrandColorAddTile from './visuals/BrandColorAddTile.vue'
import BrandColorSwatch from './visuals/BrandColorSwatch.vue'
import BrandFontRow from './visuals/BrandFontRow.vue'
import BrandLogoRow from './visuals/BrandLogoRow.vue'
import FontUploadDropzone from './visuals/FontUploadDropzone.vue'
import { useBrandKitStore } from '@/stores/brand-kit'
import { useBrandFontsStore } from '@/stores/brand-fonts'
import { useFontUpload } from '@/composables/brand-kit/use-font-upload'
import type { BrandColor } from '@/types/brand-kit'

const brandKitStore = useBrandKitStore()
const fontsStore = useBrandFontsStore()
const fontUpload = useFontUpload()

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

function onColorEdit(_color: BrandColor): void {
  // TODO: color picker popover — deferred to next sub-task
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
        <div style="font-size: 12px; font-weight: 600; color: var(--ink-3); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px">
          Colors
        </div>
        <div class="sw-list">
          <BrandColorSwatch
            v-for="color in brandKitStore.brandColors"
            :key="color.id"
            :color="color"
            @edit="onColorEdit"
          />
          <BrandColorAddTile @open="() => {}" />
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
        <div style="font-size: 12px; font-weight: 600; color: var(--ink-3); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px">
          Fonts
        </div>
        <BrandFontRow
          v-for="font in fonts"
          :key="font.id"
          :font="font"
          @delete="onFontDelete"
        />
        <div style="margin-top: 8px">
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
        <div style="font-size: 12px; font-weight: 600; color: var(--ink-3); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px">
          Logo
        </div>
        <BrandLogoRow
          kind="logo"
          label="Primary mark"
          :url="brandKitStore.brandLogoUrl"
          @upload="() => {}"
        />
        <BrandLogoRow
          kind="wordmark"
          label="Wordmark"
          :url="null"
          style="margin-top: 8px"
          @upload="() => {}"
        />
      </section>
    </template>
  </div>
</template>
