import { computed, onMounted, onUnmounted, ref } from 'vue'
import type { ComputedRef, Ref } from 'vue'

import { supabase } from '@/lib/supabase'

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
  handleReauthorize(): void
  openOAuthPopup(shop: string): void
}

export function useShopifyConnection(brandId: string): UseShopifyConnection {
  const state = ref<ConnectionState>('loading')
  const connection = ref<Connection | null>(null)
  const isDisconnecting = ref(false)

  let popup: Window | null = null
  let syncChannel: ReturnType<typeof supabase.channel> | null = null

  const isSyncing = computed(() => {
    const phase = connection.value?.sync_progress?.phase
    return phase === 'running' || phase === 'parsing'
  })

  async function loadConnection(): Promise<void> {
    const [connResult, countResult] = await Promise.all([
      supabase
        .from('shopify_connections')
        .select('shop_domain,status,last_synced_at,sync_progress,scopes')
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
      scopes: string[] | null
    }

    const product_count = (countResult.count as number | null) ?? 0
    const scopes = row.scopes ?? []

    // Fetch history separately so a missing column doesn't break connection load
    const histResult = await supabase
      .from('shopify_connections')
      .select('history')
      .eq('brand_id', brandId)
      .maybeSingle()
    const histRow = histResult.data as { history?: HistoryEntry[] | null } | null
    const history: HistoryEntry[] = Array.isArray(histRow?.history) ? histRow.history : []

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

  function openOAuthPopup(shop: string): void {
    const params = new URLSearchParams({ shop, brand_id: brandId })
    popup = window.open(`/api/shopify/oauth/start?${params.toString()}`, 'shopify', 'width=620,height=780')
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
    unsubscribe()
    window.removeEventListener('message', onMessage)
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
