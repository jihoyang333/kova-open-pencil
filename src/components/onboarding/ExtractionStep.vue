<script setup lang="ts">
import { inject, onMounted, onUnmounted, ref, shallowRef } from 'vue'

import type { useOnboardingState } from '@/composables/useOnboardingState'
import type { ExtractBrandResponse } from '@/types/kova/extraction'
import { getAuthHeaders } from '@/utils/api-headers'
import { normalizeUrl } from '@/utils/onboarding-validators'

const state = inject('onboardingState') as ReturnType<typeof useOnboardingState>
const emit = defineEmits<{ complete: [] }>()

interface ExtractionItem {
  id: string
  label: string
  status: 'pending' | 'loading' | 'done' | 'error'
  result?: string
}

// Explicit opt-in: set VITE_USE_MOCK_EXTRACTION=true in .env.local
const USE_MOCK = import.meta.env.VITE_USE_MOCK_EXTRACTION === 'true'

const items = ref<ExtractionItem[]>([
  { id: 'logo', label: 'Finding your logo...', status: 'pending' },
  { id: 'colors', label: 'Extracting brand colors...', status: 'pending' },
  { id: 'fonts', label: 'Detecting fonts...', status: 'pending' },
  { id: 'voice', label: 'Analyzing writing style...', status: 'pending' }
])

const allDone = ref(false)
const retryCount = ref(0)
const showRetry = ref(false)
const errorMessage = ref('')

// Cache scoped to component instance (resets on remount)
const cachedBrandData = shallowRef<ExtractBrandResponse | null>(null)

// Timeout ID for cleanup on unmount
const fallbackTimeoutId = shallowRef<ReturnType<typeof setTimeout> | undefined>(undefined)

const MOCK_RESULTS = {
  logoUrl: 'https://placehold.co/100x100/2563eb/white?text=Logo',
  colors: {
    primary: '#2563eb',
    secondary: '#1e293b',
    accent: '#f59e0b',
    background: '#ffffff'
  },
  fonts: { heading: 'Inter', body: 'Georgia' },
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


async function fetchBrandData(url: string): Promise<ExtractBrandResponse> {
  if (cachedBrandData.value) return cachedBrandData.value
  const res = await fetch('/api/extract-brand', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ url })
  })
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>
    throw new Error((body.error as string) ?? 'Extraction failed')
  }
  const data = (await res.json()) as ExtractBrandResponse
  cachedBrandData.value = data
  return data
}

async function runRealExtraction(): Promise<void> {
  const url = normalizeUrl(state.brandUrl.value)
  errorMessage.value = ''

  // Single API call — resolve in background
  const brandPromise = fetchBrandData(url)

  let brandData: ExtractBrandResponse | null = null
  let fetchError: Error | null = null
  const dataPromise = brandPromise
    .then((data) => { brandData = data })
    .catch((err: unknown) => {
      fetchError = err instanceof Error ? err : new Error('Extraction failed')
    })

  // Sequential steps with accelerating durations.
  // Steps 1-3 use fixed timers. Step 4 keeps spinning until data arrives
  // (min 1000ms floor) so there's never dead time — always a spinner active.

  // Step 1: Logo (3800ms)
  updateItem('logo', { status: 'loading' })
  await delay(3800)
  updateItem('logo', { status: 'done', result: 'Logo found' })

  // Step 2: Colors (3000ms)
  updateItem('colors', { status: 'loading' })
  await delay(3000)
  updateItem('colors', { status: 'done' })

  // Step 3: Fonts (2100ms)
  updateItem('fonts', { status: 'loading' })
  await delay(2100)
  updateItem('fonts', { status: 'done' })

  // Step 4: Voice — spins until data actually arrives (min 1000ms)
  updateItem('voice', { status: 'loading' })
  await Promise.all([delay(1000), dataPromise])

  // Data is here — apply real results to all steps
  if (brandData) {
    state.logoUrl.value = brandData.logo_url
    updateItem('logo', {
      status: 'done',
      result: brandData.logo_url ? 'Logo found' : 'No logo found'
    })

    if (brandData.colors) {
      state.colors.value = brandData.colors
    } else {
      updateItem('colors', { status: 'error', result: 'Could not detect colors' })
    }

    if (brandData.fonts.heading || brandData.fonts.body) {
      state.fonts.value = {
        heading: brandData.fonts.heading ?? '',
        body: brandData.fonts.body ?? ''
      }
      const fontResult = [brandData.fonts.heading, brandData.fonts.body]
        .filter(Boolean)
        .join(', ')
      updateItem('fonts', { status: 'done', result: fontResult || undefined })
    } else {
      updateItem('fonts', { status: 'error', result: 'Could not detect fonts' })
    }

    state.voice.value = brandData.writing_style
    updateItem('voice', {
      status: brandData.writing_style ? 'done' : 'error',
      result: brandData.writing_style ?? 'Could not analyze writing style'
    })
  } else {
    const errMsg = fetchError?.message ?? 'Extraction failed'
    updateItem('logo', { status: 'error', result: errMsg })
    updateItem('colors', { status: 'error', result: errMsg })
    updateItem('fonts', { status: 'error', result: errMsg })
    updateItem('voice', { status: 'error', result: errMsg })
  }

  allDone.value = true

  const hasSuccess = items.value.some((item) => item.status === 'done')
  if (hasSuccess) {
    await delay(1500)
    if (allDone.value) {
      emit('complete')
    }
  } else {
    const failedItem = items.value.find((item) => item.status === 'error')
    errorMessage.value = failedItem?.result ?? 'Extraction failed'
    showRetry.value = true
  }
}

function handleRetry(): void {
  retryCount.value += 1
  showRetry.value = false
  errorMessage.value = ''
  cachedBrandData.value = null
  items.value = items.value.map((item) => ({
    ...item,
    status: 'pending' as const,
    result: undefined
  }))
  allDone.value = false
  void runRealExtraction()
}

onMounted(() => {
  // Reset component-scoped cache on mount
  cachedBrandData.value = null

  if (USE_MOCK) {
    void runMockExtraction()
  } else {
    void runRealExtraction()
  }

  // Show manual continue button after timeout as fallback
  fallbackTimeoutId.value = setTimeout(() => {
    showRetry.value = true
  }, 30000)
})

onUnmounted(() => {
  if (fallbackTimeoutId.value !== undefined) {
    clearTimeout(fallbackTimeoutId.value)
  }
})
</script>

<template>
  <div data-test-id="onboarding-extraction-step">
    <h1 class="text-3xl font-bold text-white">Setting up your brand</h1>
    <p class="mt-3 text-base text-[#999]">Analyzing your website...</p>

    <div class="mt-8 flex flex-col gap-4" aria-live="polite">
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
            class="size-4 animate-spin text-accent"
          />
          <icon-lucide-check-circle-2
            v-else-if="item.status === 'done'"
            class="size-4 text-green-400"
          />
          <icon-lucide-x-circle v-else-if="item.status === 'error'" class="size-4 text-red-400" />
          <div v-else class="size-4 rounded-full border border-[#555]" />
        </div>

        <!-- Label + inline result -->
        <div>
          <span class="text-sm text-[#ccc]">{{ item.label }}</span>

          <!-- Inline color swatches for colors item -->
          <div
            v-if="item.id === 'colors' && item.status === 'done' && state.colors.value"
            class="mt-1 flex gap-1"
            role="img"
            :aria-label="`Brand colors extracted: ${Object.entries(state.colors.value)
              .map(([k, v]) => `${k} ${v}`)
              .join(', ')}`"
          >
            <div
              v-for="(hex, key) in state.colors.value"
              :key="key"
              class="size-5 rounded border border-[#555]"
              :style="{ backgroundColor: hex }"
              :aria-label="`${key}: ${hex}`"
            />
          </div>

          <!-- Text result for other items -->
          <p v-else-if="item.result && item.status === 'done'" class="mt-0.5 text-xs text-[#999]">
            {{ item.result }}
          </p>

          <!-- Error result text -->
          <p v-else-if="item.result && item.status === 'error'" class="mt-0.5 text-xs text-red-400">
            {{ item.result }}
          </p>
        </div>
      </div>
    </div>

    <!-- Error summary -->
    <p v-if="errorMessage" class="mt-4 text-sm text-red-400">
      {{ errorMessage }}
    </p>

    <!-- Retry button (first failure) -->
    <button
      v-if="showRetry && allDone && retryCount === 0"
      data-test-id="onboarding-extraction-retry"
      class="mt-8 rounded-lg bg-accent px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-400"
      @click="handleRetry"
    >
      Retry
    </button>

    <!-- Manual continue button (after retry failure) -->
    <button
      v-if="showRetry && allDone && retryCount >= 1"
      data-test-id="onboarding-extraction-continue"
      class="mt-8 rounded-lg bg-[#444] px-6 py-2.5 text-sm font-medium text-[#ccc] hover:bg-[#555]"
      @click="emit('complete')"
    >
      Continue and fill in manually
    </button>
  </div>
</template>
