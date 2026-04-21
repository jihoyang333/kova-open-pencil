<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'

import { supabase } from '@/lib/supabase'
import { normalizeShopDomain } from '@/lib/shop-domain'

const props = defineProps<{ brandId: string }>()

type ConnectionState = 'loading' | 'not-connected' | 'connected' | 'reauthorize'

interface SyncProgress {
  phase: 'idle' | 'running' | 'parsing' | 'done' | 'error'
  count_done: number
  count_total: number
  error?: string
}

interface Connection {
  shop_domain: string
  last_synced_at: string | null
  sync_progress: SyncProgress
}

const DEFAULT_PROGRESS: SyncProgress = { phase: 'idle', count_done: 0, count_total: 0 }

const state = ref<ConnectionState>('loading')
const connection = ref<Connection | null>(null)
const shopInput = ref('')
const inputVisible = ref(false)
const errorMsg = ref<string | null>(null)
const isDisconnecting = ref(false)

let popup: Window | null = null
let syncChannel: ReturnType<typeof supabase.channel> | null = null

const isSyncing = computed(() => {
  const phase = connection.value?.sync_progress?.phase
  return phase === 'running' || phase === 'parsing'
})

function formatSyncTime(ts: string | null): string {
  if (!ts) return 'Never synced'
  return `Last synced ${new Date(ts).toLocaleDateString()}`
}

async function loadConnection(): Promise<void> {
  const { data, error } = await supabase
    .from('shopify_connections')
    .select('shop_domain,status,last_synced_at,sync_progress')
    .eq('brand_id', props.brandId)
    .maybeSingle()

  if (error || !data) {
    state.value = 'not-connected'
    return
  }

  const row = data as {
    shop_domain: string
    status: string
    last_synced_at: string | null
    sync_progress: SyncProgress | null
  }

  if (row.status === 'active') {
    connection.value = {
      shop_domain: row.shop_domain,
      last_synced_at: row.last_synced_at,
      sync_progress: row.sync_progress ?? DEFAULT_PROGRESS,
    }
    state.value = 'connected'
  } else if (row.status === 'error') {
    connection.value = {
      shop_domain: row.shop_domain,
      last_synced_at: row.last_synced_at,
      sync_progress: row.sync_progress ?? DEFAULT_PROGRESS,
    }
    state.value = 'reauthorize'
  } else {
    state.value = 'not-connected'
  }
}

function subscribeToSyncProgress(): void {
  syncChannel?.unsubscribe().catch(() => null)
  syncChannel = supabase
    .channel(`sync-progress-${props.brandId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'shopify_connections',
        filter: `brand_id=eq.${props.brandId}`,
      },
      (payload) => {
        if (connection.value && payload.new?.sync_progress) {
          connection.value = {
            ...connection.value,
            sync_progress: payload.new.sync_progress as SyncProgress,
          }
        }
      },
    )
    .subscribe()
}

function buildOAuthUrl(shop: string): string {
  const params = new URLSearchParams({ shop, brand_id: props.brandId })
  return `/api/shopify/oauth/start?${params.toString()}`
}

function openOAuthPopup(shop: string): void {
  popup = window.open(buildOAuthUrl(shop), 'shopify', 'width=620,height=780')
}

function handleConnect(): void {
  const normalized = normalizeShopDomain(shopInput.value)
  if (!normalized) {
    errorMsg.value = 'Enter a valid Shopify domain like your-store.myshopify.com'
    return
  }
  errorMsg.value = null
  openOAuthPopup(normalized)
}

function handleReauthorize(): void {
  if (connection.value) {
    openOAuthPopup(connection.value.shop_domain)
  }
}

async function handleDisconnect(): Promise<void> {
  if (isDisconnecting.value) return
  isDisconnecting.value = true
  try {
    const res = await fetch('/api/shopify/oauth/disconnect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brand_id: props.brandId }),
    })
    if (!res.ok) throw new Error('Disconnect failed')
    connection.value = null
    state.value = 'not-connected'
  } finally {
    isDisconnecting.value = false
  }
}

async function handleRefreshNow(): Promise<void> {
  if (isSyncing.value) return
  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData.session?.access_token ?? ''
  const res = await fetch('/api/shopify/sync/bulk-start', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ brand_id: props.brandId }),
  })
  if (res.status === 409) {
    return
  }
  if (res.ok && connection.value) {
    connection.value = {
      ...connection.value,
      sync_progress: { phase: 'running', count_done: 0, count_total: 0 },
    }
  }
}

function onMessage(event: MessageEvent): void {
  if ((event.data as { type?: string } | null)?.type === 'shopify_oauth_success') {
    popup?.close()
    popup = null
    void loadConnection()
  }
}

onMounted(async () => {
  await loadConnection()
  subscribeToSyncProgress()
  window.addEventListener('message', onMessage)
})

onUnmounted(() => {
  syncChannel?.unsubscribe().catch(() => null)
  window.removeEventListener('message', onMessage)
})
</script>

<template>
  <div data-test-id="integrations-card" class="rounded-xl border border-gray-200 bg-white p-5">
    <h2 class="text-sm font-semibold text-gray-900">Integrations</h2>

    <!-- Loading -->
    <div
      v-if="state === 'loading'"
      data-test-id="integrations-loading"
      class="mt-4 flex items-center gap-2 text-sm text-gray-500"
    >
      <div class="size-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500" />
      Loading…
    </div>

    <!-- Not connected -->
    <div v-else-if="state === 'not-connected'" data-test-id="integrations-not-connected" class="mt-4">
      <p class="text-sm text-gray-500">No Shopify store connected.</p>
      <div v-if="!inputVisible" class="mt-3">
        <button
          data-test-id="integrations-connect-btn"
          class="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700"
          @click="inputVisible = true"
        >
          Connect Shopify
        </button>
      </div>
      <div v-else class="mt-3 flex flex-col gap-2">
        <input
          v-model="shopInput"
          data-test-id="integrations-shop-input"
          type="text"
          placeholder="your-store.myshopify.com"
          aria-label="Shopify store domain"
          class="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
        />
        <p
          v-if="errorMsg"
          data-test-id="integrations-error"
          class="text-xs text-red-600"
        >
          {{ errorMsg }}
        </p>
        <button
          data-test-id="integrations-confirm-connect"
          class="self-start rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700"
          @click="handleConnect"
        >
          Connect
        </button>
      </div>
    </div>

    <!-- Connected -->
    <div v-else-if="state === 'connected'" data-test-id="integrations-connected" class="mt-4">
      <div class="flex items-center gap-2">
        <icon-lucide-check-circle class="size-4 text-green-500" />
        <span data-test-id="integrations-shop-domain" class="text-sm font-medium text-gray-900">
          {{ connection?.shop_domain }}
        </span>
      </div>
      <p data-test-id="integrations-last-sync" class="mt-1 text-xs text-gray-500">
        {{ formatSyncTime(connection?.last_synced_at ?? null) }}
      </p>

      <!-- Sync progress -->
      <div
        v-if="isSyncing"
        data-test-id="integrations-sync-progress"
        class="mt-2 flex items-center gap-2 text-xs text-gray-500"
      >
        <div class="size-3 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500" />
        <span
          v-if="connection?.sync_progress?.phase === 'parsing' && connection.sync_progress.count_total > 0"
        >
          Syncing… {{ connection.sync_progress.count_done }} / {{ connection.sync_progress.count_total }}
        </span>
        <span v-else>Syncing your products…</span>
      </div>

      <!-- Sync error -->
      <p
        v-if="connection?.sync_progress?.phase === 'error'"
        data-test-id="integrations-sync-error"
        class="mt-2 text-xs text-red-600"
      >
        {{ connection.sync_progress.error ?? 'Sync failed. Please try again.' }}
      </p>

      <div class="mt-3 flex items-center gap-3">
        <button
          data-test-id="integrations-disconnect-btn"
          class="text-xs text-gray-500 underline transition-colors hover:text-red-600 disabled:opacity-50"
          :disabled="isDisconnecting"
          @click="handleDisconnect"
        >
          {{ isDisconnecting ? 'Disconnecting…' : 'Disconnect' }}
        </button>
        <span class="text-xs text-gray-300">|</span>
        <button
          data-test-id="integrations-refresh-btn"
          class="text-xs text-gray-500 underline transition-colors hover:text-gray-900 disabled:opacity-50"
          :disabled="isSyncing"
          @click="handleRefreshNow"
        >
          {{ isSyncing ? 'Syncing…' : 'Refresh now' }}
        </button>
        <span class="text-xs text-gray-300">|</span>
        <router-link
          data-test-id="integrations-settings-link"
          :to="`/dashboard/${brandId}/settings`"
          class="text-xs text-gray-500 underline hover:text-gray-900"
        >
          Settings
        </router-link>
      </div>
    </div>

    <!-- Reauthorize -->
    <div v-else-if="state === 'reauthorize'" data-test-id="integrations-reauthorize" class="mt-4">
      <div class="rounded-lg border border-amber-200 bg-amber-50 p-3">
        <div class="flex items-start gap-2">
          <icon-lucide-alert-triangle class="mt-0.5 size-4 shrink-0 text-amber-600" />
          <div>
            <p class="text-sm font-medium text-amber-800">Shopify needs to be reauthorized</p>
            <p
              data-test-id="integrations-reauth-domain"
              class="mt-0.5 text-xs text-amber-700"
            >
              {{ connection?.shop_domain }}
            </p>
          </div>
        </div>
        <button
          data-test-id="integrations-reauthorize-btn"
          class="mt-3 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-500"
          @click="handleReauthorize"
        >
          Reauthorize
        </button>
      </div>
    </div>
  </div>
</template>
