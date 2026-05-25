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

// PRD 02 §5.4.1 — POST + Bearer header. Token never appears in URL.
async function handleConnect(): Promise<void> {
  if (!normalizedShop.value) return
  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData.session?.access_token
  if (!token) return
  const response = await fetch('/api/shopify/oauth/start', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      shop: normalizedShop.value,
      brand_id: props.brandId,
    }),
  })
  if (!response.ok) return
  const { redirectUrl } = (await response.json()) as { redirectUrl: string }
  emit('connect-shopify', redirectUrl)
}
</script>

<template>
  <div data-test-id="onboarding-store-type-step" class="mx-auto max-w-xl p-8">
    <h1 class="text-3xl font-bold text-[var(--ink)]">Where does {{ brandName }} sell?</h1>
    <p class="mt-3 text-base text-[var(--ink-3)]">
      Connect your store to sync products and streamline your campaigns.
    </p>

    <div class="mt-8 flex flex-col gap-3">
      <button
        data-test-id="store-type-shopify"
        class="flex w-full items-center gap-4 rounded-lg border px-5 py-4 text-left transition-colors"
        :class="
          selected === 'shopify'
            ? 'border-[var(--accent-2)] bg-[var(--accent-soft)] text-[var(--accent-ink)]'
            : 'border-[var(--line)] text-[var(--ink)] hover:border-[var(--ink-3)] hover:bg-[var(--fill)]'
        "
        @click="handleShopifyClick"
      >
        <span class="text-sm font-semibold">Shopify</span>
        <span class="text-xs text-[var(--ink-3)]">Connect your Shopify store</span>
      </button>

      <button
        data-test-id="store-type-something-else"
        class="flex w-full items-center gap-4 rounded-lg border border-[var(--line)] px-5 py-4 text-left transition-colors hover:border-[var(--ink-3)] hover:bg-[var(--fill)]"
        @click="emit('something-else')"
      >
        <span class="text-sm font-semibold text-[var(--ink)]">Something else</span>
        <span class="text-xs text-[var(--ink-3)]">Paste your brand website URL</span>
      </button>

      <button
        data-test-id="store-type-no-store"
        class="flex w-full items-center gap-4 rounded-lg border border-[var(--line)] px-5 py-4 text-left transition-colors hover:border-[var(--ink-3)] hover:bg-[var(--fill)]"
        @click="emit('skip')"
      >
        <span class="text-sm font-semibold text-[var(--ink)]">No store yet</span>
        <span class="text-xs text-[var(--ink-3)]">Skip and set up your brand kit manually</span>
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
        class="w-full rounded-lg border border-[var(--line)] px-4 py-3 text-[var(--ink)] placeholder-[var(--ink-3)] transition-colors outline-none focus:border-[var(--ink-3)]"
      />
      <button
        data-test-id="store-type-connect"
        class="mt-3 rounded-lg px-6 py-2.5 text-sm font-medium transition-colors duration-200"
        :class="
          canConnect
            ? 'cursor-pointer bg-[var(--accent)] text-[var(--accent-ink)] hover:bg-[var(--accent-2)]'
            : 'cursor-not-allowed bg-[var(--fill)] text-[var(--ink-3)]'
        "
        :disabled="!canConnect"
        @click="handleConnect"
      >
        Connect Shopify
      </button>
    </div>
  </div>
</template>
