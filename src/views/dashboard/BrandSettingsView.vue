<script setup lang="ts">
import { ref, watch, computed, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { watchDebounced } from '@vueuse/core'
import { useBrandsStore } from '@/stores/brands'
import { useAuthStore } from '@/stores/auth'
import { supabase } from '@/lib/supabase'
import { toast } from '@/composables/use-toast'
import { getAuthHeaders } from '@/utils/api-headers'
import BrandColorPicker from '@/components/brand/BrandColorPicker.vue'
import {
  DialogRoot,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose
} from 'reka-ui'

const route = useRoute()
const router = useRouter()
const brandsStore = useBrandsStore()

const brandId = computed(() => route.params.brandId as string)
const brand = computed(() => brandsStore.selectedBrand)

// Whether the brand already had extracted data when the page loaded.
// "Re-extract" label only shows when returning to an existing brand.
const hadDataOnLoad = ref(false)
const loadedBrandId = ref('')

// --- Local form state (initialized from brand, auto-saved on change) ---
const name = ref('')
const url = ref('')
const voice = ref('')
const industry = ref('')
const primaryColor = ref('#000000')
const secondaryColor = ref('#000000')
const accentColor = ref('#000000')
const backgroundColor = ref('#FFFFFF')
const headingFont = ref('')
const bodyFont = ref('')

// Declared early so watch(brand) can reference it during extraction guard
const isExtracting = ref(false)

// Sync local state when brand changes (e.g. navigation or extraction)
watch(
  brand,
  (b) => {
    if (!b) return
    // Don't overwrite local refs while extraction is in progress — the store
    // may update (e.g. from logo save) with stale null values for fields that
    // extraction just populated locally but hasn't persisted yet.
    if (isExtracting.value) return
    if (b.id !== loadedBrandId.value) {
      loadedBrandId.value = b.id
      hadDataOnLoad.value = !!(b.colors || b.fonts)
    }
    name.value = b.name
    url.value = b.url ?? ''
    voice.value = b.voice ?? ''
    industry.value = b.industry ?? ''
    primaryColor.value = b.colors?.primary ?? '#000000'
    secondaryColor.value = b.colors?.secondary ?? '#000000'
    accentColor.value = b.colors?.accent ?? '#000000'
    backgroundColor.value = b.colors?.background ?? '#FFFFFF'
    headingFont.value = b.fonts?.heading ?? ''
    bodyFont.value = b.fonts?.body ?? ''
  },
  { immediate: true }
)

// --- Auto-save with debounce ---
const formSnapshot = computed(() => ({
  name: name.value,
  url: url.value || null,
  voice: voice.value || null,
  industry: industry.value || null,
  colors: {
    primary: primaryColor.value,
    secondary: secondaryColor.value,
    accent: accentColor.value,
    background: backgroundColor.value
  },
  fonts: {
    heading: headingFont.value || '',
    body: bodyFont.value || ''
  }
}))

const initialSnapshot = ref('')
watch(
  brand,
  (b) => {
    if (b) initialSnapshot.value = JSON.stringify(formSnapshot.value)
  },
  { immediate: true }
)

watchDebounced(
  formSnapshot,
  async (snapshot) => {
    if (!brand.value) return
    if (JSON.stringify(snapshot) === initialSnapshot.value) return
    try {
      await brandsStore.updateBrand(brand.value.id, snapshot)
      initialSnapshot.value = JSON.stringify(snapshot)
    } catch {
      toast.show('Failed to save', 'error')
    }
  },
  { debounce: 500, deep: true }
)

// --- Extract / Re-extract ---
const showReExtractDialog = ref(false)
const extractionDone = ref(false)

const hasExtractedBefore = computed(
  () => extractionDone.value || !!(brand.value?.colors || brand.value?.fonts)
)

const extractLabel = computed(() => (hadDataOnLoad.value ? 'Re-extract' : 'Extract'))

const extractDomain = computed(() => {
  if (!url.value) return 'website'
  try {
    return new URL(url.value.startsWith('http') ? url.value : `https://${url.value}`).hostname
  } catch {
    return 'website'
  }
})

function isValidHex(v: unknown): v is string {
  return typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v)
}

async function runExtraction(): Promise<void> {
  const targetUrl = url.value
  if (!targetUrl) return
  isExtracting.value = true
  showReExtractDialog.value = false
  try {
    const res = await fetch('/api/extract-brand', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ url: targetUrl })
    })
    if (!res.ok) throw new Error('Extraction failed')
    const data = await res.json()

    // Map extraction response to brand fields with validation
    if (data.colors) {
      if (isValidHex(data.colors.primary)) primaryColor.value = data.colors.primary
      if (isValidHex(data.colors.secondary)) secondaryColor.value = data.colors.secondary
      if (isValidHex(data.colors.accent)) accentColor.value = data.colors.accent
      if (isValidHex(data.colors.background)) backgroundColor.value = data.colors.background
    }
    if (data.fonts) {
      if (typeof data.fonts.heading === 'string') headingFont.value = data.fonts.heading
      if (typeof data.fonts.body === 'string') bodyFont.value = data.fonts.body
    }
    if (typeof data.writing_style === 'string') {
      voice.value = data.writing_style
    }
    if (typeof data.industry === 'string') {
      industry.value = data.industry
    }
    // Map logo_url if present (don't clear existing logo on null)
    if (typeof data.logo_url === 'string' && data.logo_url && brand.value) {
      logoPreviewUrl.value = data.logo_url
      await brandsStore.updateBrand(brand.value.id, { logo_url: data.logo_url })
    }

    // Save extracted data immediately to DB — don't rely on debounced auto-save
    // which can be defeated by watch(brand) re-syncing stale null values from the store.
    if (brand.value) {
      const extractedData: Record<string, unknown> = {}
      if (data.colors) {
        extractedData.colors = {
          primary: primaryColor.value,
          secondary: secondaryColor.value,
          accent: accentColor.value,
          background: backgroundColor.value
        }
      }
      if (data.fonts) {
        extractedData.fonts = {
          heading: headingFont.value || '',
          body: bodyFont.value || ''
        }
      }
      if (typeof data.writing_style === 'string') extractedData.voice = data.writing_style
      if (typeof data.industry === 'string') extractedData.industry = data.industry

      if (Object.keys(extractedData).length > 0) {
        await brandsStore.updateBrand(brand.value.id, extractedData)
        initialSnapshot.value = JSON.stringify(formSnapshot.value)
      }
    }

    extractionDone.value = true
    toast.show('Brand data extracted')
  } catch {
    toast.show('Extraction failed', 'error')
  } finally {
    isExtracting.value = false
  }
}

function confirmReExtract(): void {
  showReExtractDialog.value = true
}

// --- Logo upload ---
const logoPreviewUrl = ref(brand.value?.logo_url ?? '')
watch(
  brand,
  (b) => {
    logoPreviewUrl.value = b?.logo_url ?? ''
  },
  { immediate: true }
)

async function handleLogoUpload(e: Event): Promise<void> {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file || !brand.value) return

  // Revoke old blob URL if any
  if (logoPreviewUrl.value.startsWith('blob:')) {
    URL.revokeObjectURL(logoPreviewUrl.value)
  }

  // Show preview immediately
  logoPreviewUrl.value = URL.createObjectURL(file)

  try {
    const authStore = useAuthStore()
    const userId = authStore.user?.id
    if (!userId) throw new Error('Not authenticated')

    const ext = file.name.split('.').pop() ?? 'png'
    const path = `${userId}/${brand.value.id}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('brand-logos')
      .upload(path, file, { upsert: true })
    if (uploadError) throw uploadError

    const { data: urlData } = supabase.storage.from('brand-logos').getPublicUrl(path)
    await brandsStore.updateBrand(brand.value.id, { logo_url: urlData.publicUrl })
    toast.show('Logo updated')
  } catch {
    toast.show('Failed to upload logo', 'error')
  }
}

function goBack(): void {
  void router.push(`/dashboard/${brandId.value}`)
}

const nameInputRef = ref<HTMLInputElement | null>(null)

watch(
  brand,
  async (b) => {
    if (b?.name === 'Untitled Brand') {
      await nextTick()
      nameInputRef.value?.focus()
      nameInputRef.value?.select()
    }
  },
  { immediate: true }
)
</script>

<template>
  <div
    v-if="brand"
    data-test-id="brand-settings-view"
    class="mx-auto max-w-2xl space-y-8 px-6 py-8"
  >
    <!-- Back link -->
    <button
      data-test-id="brand-settings-back"
      class="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      @click="goBack"
    >
      <icon-lucide-arrow-left class="size-4" />
      Back to canvases
    </button>

    <!-- Section 1: Brand Identity -->
    <section class="space-y-4">
      <h2 class="text-lg font-semibold text-gray-900">Brand Identity</h2>
      <div class="grid grid-cols-[160px_1fr] items-start gap-4">
        <label class="pt-2 text-sm font-medium text-gray-700">Name</label>
        <input
          ref="nameInputRef"
          v-model="name"
          data-test-id="brand-settings-name"
          type="text"
          class="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
        />

        <label class="pt-2 text-sm font-medium text-gray-700">Website URL</label>
        <input
          v-model="url"
          data-test-id="brand-settings-url"
          type="url"
          placeholder="https://example.com"
          class="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
        />
      </div>
    </section>

    <!-- Extract slot -->
    <section class="space-y-4" :aria-busy="isExtracting">
      <!-- State: Extracting — progress banner -->
      <div
        v-if="isExtracting"
        data-test-id="brand-settings-extract-banner"
        role="status"
        aria-live="polite"
        class="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700"
      >
        <icon-lucide-loader-2 class="size-4 shrink-0 animate-spin" />
        Analyzing {{ extractDomain }} — extracting colors, fonts, logo, and voice...
      </div>

      <!-- State: Done — re-extract button -->
      <button
        v-else-if="hasExtractedBefore"
        data-test-id="brand-settings-reextract"
        class="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
        @click="confirmReExtract"
      >
        <icon-lucide-sparkles class="mr-1.5 inline-block size-4" />
        {{ extractLabel }}
      </button>

      <!-- State: Has URL — enabled extract button -->
      <button
        v-else-if="url"
        data-test-id="brand-settings-extract-button"
        class="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600"
        @click="runExtraction"
      >
        <icon-lucide-sparkles class="mr-1.5 inline-block size-4" />
        Extract from website
      </button>

      <!-- State: No URL — disabled extract button -->
      <button
        v-else
        data-test-id="brand-settings-extract-button"
        disabled
        aria-disabled="true"
        class="cursor-not-allowed rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white opacity-50"
      >
        <icon-lucide-sparkles class="mr-1.5 inline-block size-4" />
        Extract from website
      </button>
    </section>

    <!-- Section 2: Logo -->
    <section class="space-y-4">
      <h2 class="text-lg font-semibold text-gray-900">Logo</h2>
      <div class="flex items-center gap-4">
        <div
          class="flex size-20 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-gray-50"
        >
          <img
            v-if="logoPreviewUrl"
            :src="logoPreviewUrl"
            alt="Brand logo"
            class="size-full object-contain"
          />
          <icon-lucide-image v-else class="size-8 text-gray-300" />
        </div>
        <label
          data-test-id="brand-settings-logo-upload"
          class="cursor-pointer rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          Replace logo
          <input type="file" accept="image/*" class="hidden" @change="handleLogoUpload" />
        </label>
      </div>
    </section>

    <!-- Section 3: Colors -->
    <section class="space-y-4">
      <h2 class="text-lg font-semibold text-gray-900">Colors</h2>
      <div class="grid grid-cols-2 gap-4">
        <BrandColorPicker v-model="primaryColor" label="Primary" />
        <BrandColorPicker v-model="secondaryColor" label="Secondary" />
        <BrandColorPicker v-model="accentColor" label="Accent" />
        <BrandColorPicker v-model="backgroundColor" label="Background" />
      </div>
    </section>

    <!-- Section 4: Fonts -->
    <section class="space-y-4">
      <h2 class="text-lg font-semibold text-gray-900">Fonts</h2>
      <div class="grid grid-cols-[160px_1fr] items-start gap-4">
        <label class="pt-2 text-sm font-medium text-gray-700">Heading</label>
        <input
          v-model="headingFont"
          data-test-id="brand-settings-heading-font"
          type="text"
          placeholder="e.g. Montserrat"
          class="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
        />
        <label class="pt-2 text-sm font-medium text-gray-700">Body</label>
        <input
          v-model="bodyFont"
          data-test-id="brand-settings-body-font"
          type="text"
          placeholder="e.g. Open Sans"
          class="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
        />
      </div>
    </section>

    <!-- Section 5: Voice -->
    <section class="space-y-4">
      <h2 class="text-lg font-semibold text-gray-900">Voice</h2>
      <textarea
        v-model="voice"
        data-test-id="brand-settings-voice"
        rows="3"
        placeholder="Describe this brand's tone and voice…"
        class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
      />
    </section>

    <!-- Section 6: Industry -->
    <section class="space-y-4">
      <h2 class="text-lg font-semibold text-gray-900">Industry</h2>
      <input
        v-model="industry"
        data-test-id="brand-settings-industry"
        type="text"
        placeholder="e.g. Technology, Fashion, Food & Beverage"
        class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
      />
    </section>

    <!-- Re-extract confirmation dialog -->
    <DialogRoot :open="showReExtractDialog" @update:open="showReExtractDialog = $event">
      <DialogPortal>
        <DialogOverlay class="fixed inset-0 z-40 bg-black/50" />
        <DialogContent
          class="fixed top-1/2 left-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-6 shadow-xl"
        >
          <DialogTitle class="text-base font-semibold text-gray-900">
            {{ extractLabel }} brand data?
          </DialogTitle>
          <DialogDescription class="mt-2 text-sm text-gray-600">
            This will overwrite your current colors, fonts, voice, and industry with fresh data from
            {{ url }}.
          </DialogDescription>
          <div class="mt-6 flex justify-end gap-3">
            <DialogClose as-child>
              <button
                data-test-id="brand-settings-reextract-cancel"
                class="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            </DialogClose>
            <button
              data-test-id="brand-settings-reextract-confirm"
              class="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600"
              @click="runExtraction"
            >
              {{ extractLabel }}
            </button>
          </div>
        </DialogContent>
      </DialogPortal>
    </DialogRoot>
  </div>
</template>
