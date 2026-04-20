<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import { normalizeShopDomain } from '@/utils/shopify-validators'

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

function handleConnect(): void {
  if (!normalizedShop.value) return
  const params = new URLSearchParams({
    shop: normalizedShop.value,
    brand_id: props.brandId,
  })
  emit('connect-shopify', `/api/shopify/oauth/start?${params.toString()}`)
}
</script>

<template>
  <div data-test-id="onboarding-store-type-step">
    <h1 class="text-3xl font-bold text-white">Where does {{ brandName }} sell?</h1>
    <p class="mt-3 text-base text-[#999]">
      Connect your store to sync products and streamline your campaigns.
    </p>

    <div class="mt-8 flex flex-col gap-3">
      <button
        data-test-id="store-type-shopify"
        class="flex w-full items-center gap-4 rounded-lg border px-5 py-4 text-left transition-colors"
        :class="
          selected === 'shopify'
            ? 'border-accent bg-accent/10 text-white'
            : 'border-[#555] bg-[#383838] text-white hover:border-[#888] hover:bg-[#444]'
        "
        @click="handleShopifyClick"
      >
        <span class="text-sm font-semibold">Shopify</span>
        <span class="text-xs text-[#999]">Connect your Shopify store</span>
      </button>

      <button
        data-test-id="store-type-something-else"
        class="flex w-full items-center gap-4 rounded-lg border border-[#555] bg-[#383838] px-5 py-4 text-left transition-colors hover:border-[#888] hover:bg-[#444]"
        @click="emit('something-else')"
      >
        <span class="text-sm font-semibold text-white">Something else</span>
        <span class="text-xs text-[#999]">Paste your brand website URL</span>
      </button>

      <button
        data-test-id="store-type-no-store"
        class="flex w-full items-center gap-4 rounded-lg border border-[#555] bg-[#383838] px-5 py-4 text-left transition-colors hover:border-[#888] hover:bg-[#444]"
        @click="emit('skip')"
      >
        <span class="text-sm font-semibold text-white">No store yet</span>
        <span class="text-xs text-[#999]">Skip and set up your brand kit manually</span>
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
        class="w-full rounded-lg border border-[#555] bg-[#383838] px-4 py-3 text-white placeholder-[#aaa] transition-colors outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
      />
      <button
        data-test-id="store-type-connect"
        class="mt-3 rounded-lg px-6 py-2.5 text-sm font-medium transition-colors duration-200"
        :class="
          canConnect
            ? 'cursor-pointer bg-accent text-white hover:bg-blue-400'
            : 'cursor-not-allowed bg-[#4b4b4b] text-white/40'
        "
        :disabled="!canConnect"
        @click="handleConnect"
      >
        Connect Shopify
      </button>
    </div>
  </div>
</template>
