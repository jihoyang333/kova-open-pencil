import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import type { ComputedRef, Ref } from 'vue'

import { supabase } from '@/lib/supabase'

const POLL_INTERVAL_MS = 5000

export type ConnectionState = 'loading' | 'not-connected' | 'connected' | 'reauthorize'

export interface SyncProgress {
  phase: 'idle' | 'running' | 'parsing' | 'done' | 'error'
  count_done: number
  count_total: number
  error?: string
}

export type HistoryEventType = 'connected' | 'disconnected' | 'scope_changed'

export interface HistoryEntry {
  timestamp: string
  event_type: HistoryEventType
}

export interface Connection {
  shop_domain: string
  last_synced_at: string | null
  sync_progress: SyncProgress
  scopes: string[]
  product_count: number
  history?: HistoryEntry[]
}

const DEFAULT_PROGRESS: SyncProgress = { phase: 'idle', count_done: 0, count_total: 0 }

export interface UseShopifyConnection {
  state: Ref<ConnectionState>
  connection: Ref<Connection | null>
  isSyncing: ComputedRef<boolean>
  isDisconnecting: Ref<boolean>
  loadConnection(): Promise<void>
  subscribeToSyncProgress(): void
  unsubscribe(): void
  handleRefreshNow(): Promise<void>
  handleDisconnect(): Promise<void>
  handleReauthorize(): boolean
  openOAuthPopup(shop: string): boolean
}

export function useShopifyConnection(brandId: string): UseShopifyConnection {
  const state = ref<ConnectionState>('loading')
  const connection = ref<Connection | null>(null)
  const isDisconnecting = ref(false)

  let popup: Window | null = null
  let syncChannel: ReturnType<typeof supabase.channel> | null = null
  let pollTimer: ReturnType<typeof setInterval> | null = null

  const isSyncing = computed(() => {
    const phase = connection.value?.sync_progress?.phase
    return phase === 'running' || phase === 'parsing'
  })

  async function pollSyncStatus(): Promise<void> {
    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData.session?.access_token ?? ''
    try {
      await fetch(`/api/shopify/sync/poll?brand_id=${encodeURIComponent(brandId)}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      })
      // Response intentionally ignored — the realtime subscription picks up
      // any sync_progress mutations the poll triggered server-side.
    } catch {
      // Network blip — next tick will retry. Do not surface to UI.
    }
  }

  function startPollLoop(): void {
    if (pollTimer) return
    pollTimer = setInterval(() => {
      void pollSyncStatus()
    }, POLL_INTERVAL_MS)
  }

  function stopPollLoop(): void {
    if (!pollTimer) return
    clearInterval(pollTimer)
    pollTimer = null
  }

  async function loadConnection(): Promise<void> {
    const [connResult, countResult] = await Promise.all([
      supabase
        .from('shopify_connections')
        .select('shop_domain,status,last_synced_at,sync_progress,scope')
        .eq('brand_id', brandId)
        .maybeSingle(),
      supabase
        .from('shopify_products')
        .select('*', { count: 'exact', head: true })
        .eq('brand_id', brandId),
    ])

    const { data, error } = connResult
    if (error || !data) {
      state.value = 'not-connected'
      return
    }

    const row = data as {
      shop_domain: string
      status: string
      last_synced_at: string | null
      sync_progress: SyncProgress | null
      scope: string | null
    }

    const product_count = (countResult.count as number | null) ?? 0
    // DB stores scope as a comma-separated string (Shopify's format); the UI wants an array.
    const scopes = (row.scope ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    // History isn't backed by a DB column yet; accordion renders empty until we add one.
    const history: HistoryEntry[] = []

    if (row.status === 'active') {
      connection.value = {
        shop_domain: row.shop_domain,
        last_synced_at: row.last_synced_at,
        sync_progress: row.sync_progress ?? DEFAULT_PROGRESS,
        scopes,
        product_count,
        history,
      }
      state.value = 'connected'
    } else if (row.status === 'error') {
      connection.value = {
        shop_domain: row.shop_domain,
        last_synced_at: row.last_synced_at,
        sync_progress: row.sync_progress ?? DEFAULT_PROGRESS,
        scopes,
        product_count,
        history,
      }
      state.value = 'reauthorize'
    } else {
      state.value = 'not-connected'
    }
  }

  function subscribeToSyncProgress(): void {
    syncChannel?.unsubscribe().catch(() => null)
    syncChannel = supabase
      .channel(`sync-progress-${brandId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'shopify_connections',
          filter: `brand_id=eq.${brandId}`,
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

  function unsubscribe(): void {
    syncChannel?.unsubscribe().catch(() => null)
  }

  // Must stay synchronous so window.open() is called inside the user-gesture
  // stack. Any `await` before window.open() lets the browser treat the popup
  // as non-user-initiated and trigger the popup blocker.
  function openOAuthPopup(shop: string): boolean {
    popup = window.open('', 'shopify', 'width=620,height=780')
    if (!popup) return false

    void (async () => {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token ?? ''
      // PRD 02 §5.4.1 — POST + Bearer; never put the JWT in the popup URL.
      try {
        const response = await fetch('/api/shopify/oauth/start', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ shop, brand_id: brandId }),
        })
        if (!response.ok) {
          popup?.close()
          popup = null
          return
        }
        const { redirectUrl } = (await response.json()) as { redirectUrl: string }
        if (popup && !popup.closed) {
          popup.location.href = redirectUrl
        }
      } catch {
        popup?.close()
        popup = null
      }
    })()

    return true
  }

  function handleReauthorize(): boolean {
    if (!connection.value) return true
    return openOAuthPopup(connection.value.shop_domain)
  }

  async function handleDisconnect(): Promise<void> {
    if (isDisconnecting.value) return
    isDisconnecting.value = true
    try {
      const res = await fetch('/api/shopify/oauth/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brand_id: brandId }),
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
      body: JSON.stringify({ brand_id: brandId }),
    })
    if (res.status === 409) {
      return
    }
    if (res.ok && connection.value) {
      connection.value = {
        ...connection.value,
        sync_progress: { phase: 'running', count_done: 0, count_total: 0 },
      }
      return
    }
    if (!res.ok && connection.value) {
      connection.value = {
        ...connection.value,
        sync_progress: { phase: 'error', count_done: 0, count_total: 0, error: 'Sync failed. Please try again.' },
      }
    }
  }

  let oauthChannel: BroadcastChannel | null = null

  interface OAuthSuccessPayload {
    type?: string
    brandId?: string
  }

  function handleOAuthSuccess(payload: OAuthSuccessPayload | null): void {
    if (payload?.type !== 'shopify_oauth_success') return
    if (payload.brandId && payload.brandId !== brandId) return
    popup?.close()
    popup = null
    void loadConnection()
  }

  function onMessage(event: MessageEvent): void {
    handleOAuthSuccess(event.data as OAuthSuccessPayload | null)
  }

  watch(isSyncing, (syncing) => {
    if (syncing) {
      void pollSyncStatus()
      startPollLoop()
    } else {
      stopPollLoop()
    }
  })

  onMounted(async () => {
    await loadConnection()
    subscribeToSyncProgress()
    window.addEventListener('message', onMessage)
    // BroadcastChannel is the primary cross-popup transport — postMessage
    // breaks when Shopify's cross-origin OAuth page severs window.opener.
    try {
      oauthChannel = new BroadcastChannel('kova-shopify-oauth')
      oauthChannel.onmessage = (event: MessageEvent) =>
        handleOAuthSuccess(event.data as OAuthSuccessPayload | null)
    } catch {
      oauthChannel = null
    }
    if (isSyncing.value) {
      void pollSyncStatus()
      startPollLoop()
    }
  })

  onUnmounted(() => {
    stopPollLoop()
    unsubscribe()
    window.removeEventListener('message', onMessage)
    oauthChannel?.close()
    oauthChannel = null
  })

  return {
    state,
    connection,
    isSyncing,
    isDisconnecting,
    loadConnection,
    subscribeToSyncProgress,
    unsubscribe,
    handleRefreshNow,
    handleDisconnect,
    handleReauthorize,
    openOAuthPopup,
  }
}
