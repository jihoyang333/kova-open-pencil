<script setup lang="ts">
import { inject, onMounted, ref } from 'vue'

import type { useOnboardingState } from '@/composables/useOnboardingState'
import type { BrandColors, BrandFonts } from '@/types/kova/database'
import { normalizeUrl } from '@/utils/onboarding-validators'

const state = inject('onboardingState') as ReturnType<typeof useOnboardingState>
const emit = defineEmits<{ complete: [] }>()

interface ExtractionItem {
  id: string
  label: string
  status: 'pending' | 'loading' | 'done' | 'error'
  result?: string
}

interface ExtractBrandResponse {
  logo_url: string | null
  colors: { primary: string; secondary: string; accent: string; background: string }
  fonts: { heading: string | null; body: string | null }
}

// Use mock data when Supabase isn't configured (local dev without APIs)
const USE_MOCK = !import.meta.env.VITE_SUPABASE_URL

const items = ref<ExtractionItem[]>([
  { id: 'logo', label: 'Finding your logo...', status: 'pending' },
  { id: 'colors', label: 'Extracting brand colors...', status: 'pending' },
  { id: 'fonts', label: 'Detecting fonts...', status: 'pending' },
  { id: 'voice', label: 'Analyzing writing style...', status: 'pending' }
])

const allDone = ref(false)
const showContinue = ref(false)

const MOCK_RESULTS = {
  logoUrl: 'https://placehold.co/100x100/2563eb/white?text=Logo',
  colors: {
    primary: '#2563eb',
    secondary: '#1e293b',
    accent: '#f59e0b',
    background: '#ffffff'
  } as BrandColors,
  fonts: { heading: 'Inter', body: 'Georgia' } as BrandFonts,
  voice: 'Professional yet approachable, with a focus on clarity and action-oriented language.'
}

function updateItem(id: string, updates: Partial<ExtractionItem>): void {
  items.value = items.value.map((item) => (item.id === id ? { ...item, ...updates } : item))
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function runMockExtraction(): Promise<void> {
  updateItem('logo', { status: 'loading' })
  await delay(800)
  state.logoUrl.value = MOCK_RESULTS.logoUrl
  updateItem('logo', { status: 'done', result: 'Logo found' })

  updateItem('colors', { status: 'loading' })
  await delay(1000)
  state.colors.value = MOCK_RESULTS.colors
  updateItem('colors', { status: 'done' })

  updateItem('fonts', { status: 'loading' })
  await delay(700)
  state.fonts.value = MOCK_RESULTS.fonts
  updateItem('fonts', {
    status: 'done',
    result: `${MOCK_RESULTS.fonts.heading}, ${MOCK_RESULTS.fonts.body}`
  })

  updateItem('voice', { status: 'loading' })
  await delay(900)
  state.voice.value = MOCK_RESULTS.voice
  updateItem('voice', { status: 'done', result: MOCK_RESULTS.voice })

  allDone.value = true
  await delay(1500)
  if (allDone.value) {
    emit('complete')
  }
}

let cachedBrandData: ExtractBrandResponse | null = null

async function fetchBrandData(url: string): Promise<ExtractBrandResponse> {
  if (cachedBrandData) return cachedBrandData
  const res = await fetch('/api/extract-brand', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  })
  if (!res.ok) throw new Error('Extraction failed')
  const data = (await res.json()) as ExtractBrandResponse
  cachedBrandData = data
  return data
}

async function fetchWritingStyle(url: string): Promise<{ writing_style: string | null }> {
  const res = await fetch('/api/analyze-writing-style', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  })
  if (!res.ok) throw new Error('Analysis failed')
  return res.json() as Promise<{ writing_style: string | null }>
}

async function runRealExtraction(): Promise<void> {
  const url = normalizeUrl(state.brandUrl.value)

  // Start both API calls in parallel
  const brandPromise = fetchBrandData(url)
  const voicePromise = fetchWritingStyle(url)

  // Logo
  updateItem('logo', { status: 'loading' })
  try {
    const brandData = await brandPromise
    state.logoUrl.value = brandData.logo_url
    updateItem('logo', {
      status: 'done',
      result: brandData.logo_url ? 'Logo found' : 'No logo found'
    })
  } catch {
    updateItem('logo', { status: 'error' })
  }

  // Colors (from same cached brand response)
  updateItem('colors', { status: 'loading' })
  try {
    const brandData = await brandPromise
    state.colors.value = brandData.colors as BrandColors
    updateItem('colors', { status: 'done' })
  } catch {
    updateItem('colors', { status: 'error' })
  }

  // Fonts (from same cached brand response)
  updateItem('fonts', { status: 'loading' })
  try {
    const brandData = await brandPromise
    state.fonts.value = brandData.fonts as BrandFonts
    const fontResult = [brandData.fonts.heading, brandData.fonts.body].filter(Boolean).join(', ')
    updateItem('fonts', {
      status: 'done',
      result: fontResult || undefined
    })
  } catch {
    updateItem('fonts', { status: 'error' })
  }

  // Voice (from separate API call)
  updateItem('voice', { status: 'loading' })
  try {
    const voiceData = await voicePromise
    state.voice.value = voiceData.writing_style
    updateItem('voice', {
      status: voiceData.writing_style ? 'done' : 'error',
      result: voiceData.writing_style ?? undefined
    })
  } catch {
    updateItem('voice', { status: 'error' })
  }

  allDone.value = true
  await delay(1500)
  if (allDone.value) {
    emit('complete')
  }
}

onMounted(() => {
  if (USE_MOCK) {
    void runMockExtraction()
  } else {
    void runRealExtraction()
  }

  // Show manual continue button after timeout as fallback
  setTimeout(() => {
    showContinue.value = true
  }, 6000)
})
</script>

<template>
  <div data-test-id="onboarding-extraction-step">
    <h1 class="mb-6 text-2xl font-semibold text-gray-900">Setting up your brand...</h1>

    <div class="flex flex-col gap-4">
      <div
        v-for="item in items"
        :key="item.id"
        class="flex items-start gap-3 transition-opacity"
        :class="item.status === 'pending' ? 'opacity-30' : 'opacity-100'"
      >
        <!-- Status icon -->
        <div class="mt-0.5 flex size-5 items-center justify-center">
          <icon-lucide-loader-2
            v-if="item.status === 'loading'"
            class="size-4 animate-spin text-blue-500"
          />
          <icon-lucide-check-circle-2
            v-else-if="item.status === 'done'"
            class="size-4 text-green-500"
          />
          <icon-lucide-x-circle v-else-if="item.status === 'error'" class="size-4 text-red-400" />
          <div v-else class="size-4 rounded-full border border-gray-300" />
        </div>

        <!-- Label + inline result -->
        <div>
          <span class="text-sm text-gray-700">{{ item.label }}</span>

          <!-- Inline color swatches for colors item -->
          <div
            v-if="item.id === 'colors' && item.status === 'done' && state.colors.value"
            class="mt-1 flex gap-1"
          >
            <div
              v-for="(hex, key) in state.colors.value"
              :key="key"
              class="size-5 rounded border border-gray-200"
              :style="{ backgroundColor: hex }"
            />
          </div>

          <!-- Text result for other items -->
          <p v-else-if="item.result && item.status === 'done'" class="mt-0.5 text-xs text-gray-400">
            {{ item.result }}
          </p>
        </div>
      </div>
    </div>

    <!-- Fallback continue button -->
    <button
      v-if="showContinue && allDone"
      data-test-id="onboarding-extraction-continue"
      class="mt-8 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white"
      @click="emit('complete')"
    >
      Continue
    </button>
  </div>
</template>
