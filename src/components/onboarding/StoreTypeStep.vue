<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import { normalizeShopDomain } from '@/lib/shop-domain'
import { supabase } from '@/lib/supabase'

const props = defineProps<{
  brandName: string
  brandId: string
}>()

const emit = defineEmits<{
  'something-else': []
  skip: []
  'connect-shopify': [url: string]
}>()

const selected = ref<'shopify' | null>(null)
const shopInput = ref('')
const inputRef = ref<HTMLInputElement | null>(null)

const normalizedShop = computed(() => normalizeShopDomain(shopInput.value))
const canConnect = computed(() => normalizedShop.value !== null)

onMounted(() => {
  if (selected.value === 'shopify') {
    inputRef.value?.focus()
  }
})

function handleShopifyClick(): void {
  selected.value = 'shopify'
}

async function handleConnect(): Promise<void> {
  if (!normalizedShop.value) return
  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData.session?.access_token ?? ''
  const params = new URLSearchParams({
    shop: normalizedShop.value,
    brand_id: props.brandId,
    access_token: token,
  })
  emit('connect-shopify', `/api/shopify/oauth/start?${params.toString()}`)
}
</script>

<template>
  <div data-test-id="onboarding-store-type-step" class="mx-auto max-w-xl p-8">
    <h1 class="text-3xl font-bold text-gray-900">Where does {{ brandName }} sell?</h1>
    <p class="mt-3 text-base text-gray-500">
      Connect your store to sync products and streamline your campaigns.
    </p>

    <div class="mt-8 flex flex-col gap-3">
      <button
        data-test-id="store-type-shopify"
        class="flex w-full items-center gap-4 rounded-lg border px-5 py-4 text-left transition-colors"
        :class="
          selected === 'shopify'
            ? 'border-blue-500 bg-blue-50 text-gray-900'
            : 'border-gray-200 bg-white text-gray-900 hover:border-gray-300 hover:bg-gray-50'
        "
        @click="handleShopifyClick"
      >
        <span class="text-sm font-semibold">Shopify</span>
        <span class="text-xs text-gray-500">Connect your Shopify store</span>
      </button>

      <button
        data-test-id="store-type-something-else"
        class="flex w-full items-center gap-4 rounded-lg border border-gray-200 bg-white px-5 py-4 text-left transition-colors hover:border-gray-300 hover:bg-gray-50"
        @click="emit('something-else')"
      >
        <span class="text-sm font-semibold text-gray-900">Something else</span>
        <span class="text-xs text-gray-500">Paste your brand website URL</span>
      </button>

      <button
        data-test-id="store-type-no-store"
        class="flex w-full items-center gap-4 rounded-lg border border-gray-200 bg-white px-5 py-4 text-left transition-colors hover:border-gray-300 hover:bg-gray-50"
        @click="emit('skip')"
      >
        <span class="text-sm font-semibold text-gray-900">No store yet</span>
        <span class="text-xs text-gray-500">Skip and set up your brand kit manually</span>
      </button>
    </div>

    <div v-if="selected === 'shopify'" class="mt-6">
      <input
        ref="inputRef"
        v-model="shopInput"
        data-test-id="store-type-shop-input"
        type="text"
        placeholder="your-store.myshopify.com"
        aria-label="Shopify store domain"
        class="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder-gray-400 transition-colors outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
      />
      <button
        data-test-id="store-type-connect"
        class="mt-3 rounded-lg px-6 py-2.5 text-sm font-medium transition-colors duration-200"
        :class="
          canConnect
            ? 'cursor-pointer bg-gray-900 text-white hover:bg-gray-700'
            : 'cursor-not-allowed bg-gray-200 text-gray-400'
        "
        :disabled="!canConnect"
        @click="handleConnect"
      >
        Connect Shopify
      </button>
    </div>
  </div>
</template>
