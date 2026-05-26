<script setup lang="ts">
import { ref } from 'vue'

import KovaIcon from '@/components/ui/KovaIcon.vue'
import { normalizeShopDomain } from '@/lib/shop-domain'
import { useShopifyConnection } from '@/composables/use-shopify-connection'

const props = defineProps<{ brandId: string }>()

const { state, connection, isSyncing, isDisconnecting, handleDisconnect, handleRefreshNow, handleReauthorize, openOAuthPopup } = useShopifyConnection(props.brandId)

const shopInput = ref('')
const inputVisible = ref(false)
const errorMsg = ref<string | null>(null)

function formatSyncTime(ts: string | null): string {
  if (!ts) return 'Never synced'
  return `Last synced ${new Date(ts).toLocaleDateString()}`
}

function handleConnect(): void {
  const normalized = normalizeShopDomain(shopInput.value)
  if (!normalized) {
    errorMsg.value = 'Enter a valid Shopify domain like your-store.myshopify.com'
    return
  }
  errorMsg.value = null
  const opened = openOAuthPopup(normalized)
  if (!opened) {
    errorMsg.value = 'Popup blocked. Allow popups for this site and try again.'
  }
}
</script>

<template>
  <div data-test-id="integrations-card" class="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5">
    <h2 class="text-sm font-semibold text-[var(--ink)]">Integrations</h2>

    <!-- Loading -->
    <div
      v-if="state === 'loading'"
      data-test-id="integrations-loading"
      class="mt-4 flex items-center gap-2 text-sm text-[var(--ink-3)]"
    >
      <div class="size-4 animate-spin rounded-full border-2 border-[var(--line)] border-t-[var(--accent)]" />
      Loading…
    </div>

    <!-- Not connected -->
    <div v-else-if="state === 'not-connected'" data-test-id="integrations-not-connected" class="mt-4">
      <p class="text-sm text-[var(--ink-3)]">No Shopify store connected.</p>
      <div v-if="!inputVisible" class="mt-3">
        <button
          data-test-id="integrations-connect-btn"
          class="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-ink)] transition-colors hover:bg-[var(--accent-2)]"
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
          class="rounded-lg border border-[var(--line)] px-3 py-2 text-sm text-[var(--ink)] placeholder-[var(--ink-3)] outline-none focus:border-[var(--ink-3)]"
        />
        <p
          v-if="errorMsg"
          data-test-id="integrations-error"
          class="text-xs text-[var(--ink-3)]"
        >
          {{ errorMsg }}
        </p>
        <button
          data-test-id="integrations-confirm-connect"
          class="self-start rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-ink)] transition-colors hover:bg-[var(--accent-2)]"
          @click="handleConnect"
        >
          Connect
        </button>
      </div>
    </div>

    <!-- Connected -->
    <div v-else-if="state === 'connected'" data-test-id="integrations-connected" class="mt-4">
      <div class="flex items-center gap-2">
        <KovaIcon name="check-circle" size="sm" class="text-[var(--accent)]" />
        <span data-test-id="integrations-shop-domain" class="text-sm font-medium text-[var(--ink)]">
          {{ connection?.shop_domain }}
        </span>
      </div>
      <p data-test-id="integrations-last-sync" class="mt-1 text-xs text-[var(--ink-3)]">
        {{ formatSyncTime(connection?.last_synced_at ?? null) }}
      </p>

      <!-- Sync progress -->
      <div
        v-if="isSyncing"
        data-test-id="integrations-sync-progress"
        class="mt-2 flex items-center gap-2 text-xs text-[var(--ink-3)]"
      >
        <div class="size-3 animate-spin rounded-full border-2 border-[var(--line)] border-t-[var(--accent)]" />
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
        class="mt-2 text-xs text-[var(--ink-3)]"
      >
        {{ connection.sync_progress.error ?? 'Sync failed. Please try again.' }}
      </p>

      <div class="mt-3 flex items-center gap-3">
        <button
          data-test-id="integrations-disconnect-btn"
          class="text-xs text-[var(--ink-3)] underline transition-colors hover:text-[var(--ink-2)] disabled:opacity-50"
          :disabled="isDisconnecting"
          @click="handleDisconnect"
        >
          {{ isDisconnecting ? 'Disconnecting…' : 'Disconnect' }}
        </button>
        <span class="text-xs text-[var(--ink-3)]">|</span>
        <button
          data-test-id="integrations-refresh-btn"
          class="text-xs text-[var(--ink-3)] underline transition-colors hover:text-[var(--ink)] disabled:opacity-50"
          :disabled="isSyncing"
          @click="handleRefreshNow"
        >
          {{ isSyncing ? 'Syncing…' : 'Refresh now' }}
        </button>
        <span class="text-xs text-[var(--ink-3)]">|</span>
        <router-link
          data-test-id="integrations-settings-link"
          :to="`/dashboard/${brandId}/settings/integrations`"
          class="text-xs text-[var(--ink-3)] underline hover:text-[var(--ink)]"
        >
          Settings
        </router-link>
      </div>
    </div>

    <!-- Reauthorize -->
    <div v-else-if="state === 'reauthorize'" data-test-id="integrations-reauthorize" class="mt-4">
      <div class="rounded-lg border border-[var(--line)] bg-[var(--fill)] p-3">
        <div class="flex items-start gap-2">
          <KovaIcon name="alert-triangle" size="sm" class="mt-0.5 shrink-0 text-[var(--ink-2)]" />
          <div>
            <p class="text-sm font-medium text-[var(--ink)]">Shopify needs to be reauthorized</p>
            <p
              data-test-id="integrations-reauth-domain"
              class="mt-0.5 text-xs text-[var(--ink-3)]"
            >
              {{ connection?.shop_domain }}
            </p>
          </div>
        </div>
        <button
          data-test-id="integrations-reauthorize-btn"
          class="mt-3 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-ink)] transition-colors hover:bg-[var(--accent-2)]"
          @click="handleReauthorize"
        >
          Reauthorize
        </button>
      </div>
    </div>
  </div>
</template>
