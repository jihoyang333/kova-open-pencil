<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  AccordionContent,
  AccordionItem,
  AccordionRoot,
  AccordionTrigger,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
} from 'reka-ui'
import { normalizeShopDomain } from '@/lib/shop-domain'
import { useShopifyConnection } from '@/composables/use-shopify-connection'

const route = useRoute()
const router = useRouter()

const brandId = route.params.brandId as string

const {
  state,
  connection,
  isSyncing,
  isDisconnecting,
  handleRefreshNow,
  handleDisconnect,
  handleReauthorize,
  openOAuthPopup,
} = useShopifyConnection(brandId)

// Connect flow
const shopInput = ref('')
const inputVisible = ref(false)
const connectError = ref<string | null>(null)

function handleConnect(): void {
  const normalized = normalizeShopDomain(shopInput.value)
  if (!normalized) {
    connectError.value = 'Enter a valid Shopify domain like your-store.myshopify.com'
    return
  }
  connectError.value = null
  const opened = openOAuthPopup(normalized)
  if (!opened) {
    connectError.value = 'Popup blocked. Allow popups for this site and try again.'
  }
}

// Disconnect confirmation modal
const showDisconnectModal = ref(false)
const disconnectError = ref<string | null>(null)

async function confirmDisconnect(): Promise<void> {
  showDisconnectModal.value = false
  disconnectError.value = null
  try {
    await handleDisconnect()
  } catch {
    disconnectError.value = 'Disconnect failed. Please try again.'
  }
}

// History: last 10 entries, newest first
const historyRows = computed(() =>
  [...(connection.value?.history ?? [])]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 10),
)

// Navigation
function goBack(): void {
  void router.push(`/dashboard/${brandId}/settings`)
}

function goToBrandKit(): void {
  void router.push(`/dashboard/${brandId}/settings`)
}

// Helpers
function formatSyncTime(ts: string | null): string {
  if (!ts) return 'Never synced'
  return `Last synced ${new Date(ts).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })}`
}

function formatProductCount(count: number): string {
  if (count === 0) return 'No products synced'
  return `${count.toLocaleString()} product${count === 1 ? '' : 's'}`
}

function formatScope(scope: string): string {
  return scope
    .replace(/^(read|write)_/, '')
    .replace(/_/g, ' ')
}
</script>

<template>
  <div
    data-test-id="settings-integrations-view"
    class="mx-auto max-w-2xl space-y-8 px-6 py-8"
  >
    <!-- Back -->
    <button
      data-test-id="integrations-back"
      class="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      @click="goBack"
    >
      <icon-lucide-arrow-left class="size-4" />
      Back to brand settings
    </button>

    <h1 class="text-xl font-semibold text-gray-900">Integrations</h1>

    <!-- Shopify section -->
    <section class="space-y-4">
      <h2 class="text-base font-semibold text-gray-900">Shopify</h2>

      <!-- Loading -->
      <div
        v-if="state === 'loading'"
        data-test-id="integrations-loading"
        class="flex items-center gap-2 text-sm text-gray-500"
      >
        <div class="size-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500" />
        Loading…
      </div>

      <!-- Not connected -->
      <div
        v-else-if="state === 'not-connected'"
        data-test-id="integrations-not-connected"
        class="rounded-xl border border-gray-200 bg-white p-5"
      >
        <p class="text-sm text-gray-600">No Shopify store connected to this brand.</p>

        <div v-if="!inputVisible" class="mt-4">
          <button
            data-test-id="integrations-connect-btn"
            class="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700"
            @click="inputVisible = true"
          >
            Connect Shopify
          </button>
        </div>

        <div v-else class="mt-4 flex flex-col gap-2">
          <input
            v-model="shopInput"
            data-test-id="integrations-shop-input"
            type="text"
            placeholder="your-store.myshopify.com"
            aria-label="Shopify store domain"
            class="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          />
          <p
            v-if="connectError"
            data-test-id="integrations-connect-error"
            class="text-xs text-red-600"
          >
            {{ connectError }}
          </p>
          <div class="flex gap-2">
            <button
              data-test-id="integrations-confirm-connect"
              class="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700"
              @click="handleConnect"
            >
              Connect
            </button>
            <button
              class="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              @click="inputVisible = false; connectError = null"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>

      <!-- Connected -->
      <div
        v-else-if="state === 'connected'"
        data-test-id="integrations-connected"
        class="rounded-xl border border-gray-200 bg-white p-5 space-y-4"
      >
        <!-- Header: domain + status -->
        <div class="flex items-start justify-between gap-4">
          <div class="flex items-center gap-2">
            <icon-lucide-check-circle class="size-4 shrink-0 text-green-500" />
            <span
              data-test-id="integrations-shop-domain"
              class="text-sm font-semibold text-gray-900"
            >
              {{ connection?.shop_domain }}
            </span>
          </div>
          <a
            :href="`https://${connection?.shop_domain}/admin/apps`"
            target="_blank"
            rel="noopener noreferrer"
            data-test-id="integrations-admin-link"
            class="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900"
          >
            Open in Shopify admin
            <icon-lucide-external-link class="size-3" />
          </a>
        </div>

        <!-- Details -->
        <div class="flex items-center gap-4 text-xs text-gray-500">
          <span data-test-id="integrations-last-sync">
            {{ formatSyncTime(connection?.last_synced_at ?? null) }}
          </span>
          <span class="text-gray-300">·</span>
          <span data-test-id="integrations-product-count">
            {{ formatProductCount(connection?.product_count ?? 0) }}
          </span>
        </div>

        <!-- Scope chips -->
        <div
          v-if="connection?.scopes.length"
          data-test-id="integrations-scopes"
          class="flex flex-wrap gap-1.5"
        >
          <span
            v-for="scope in connection.scopes"
            :key="scope"
            class="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-600"
          >
            {{ formatScope(scope) }}
          </span>
        </div>

        <!-- Sync progress -->
        <div
          v-if="isSyncing"
          data-test-id="integrations-sync-progress"
          class="space-y-1.5"
        >
          <template
            v-if="connection?.sync_progress?.phase === 'parsing' && connection.sync_progress.count_total > 0"
          >
            <div class="flex items-center justify-between text-xs text-gray-500">
              <span>Syncing your products…</span>
              <span data-test-id="integrations-sync-count">
                {{ connection.sync_progress.count_done }} / {{ connection.sync_progress.count_total }}
              </span>
            </div>
            <div
              data-test-id="integrations-sync-bar"
              class="h-1.5 w-full overflow-hidden rounded-full bg-gray-100"
              role="progressbar"
              :aria-valuenow="connection.sync_progress.count_done"
              :aria-valuemax="connection.sync_progress.count_total"
              aria-valuemin="0"
            >
              <div
                class="h-full rounded-full bg-blue-500 transition-all duration-300"
                :style="{ width: `${(connection.sync_progress.count_done / connection.sync_progress.count_total) * 100}%` }"
              />
            </div>
          </template>
          <div v-else class="flex items-center gap-2 text-xs text-gray-500">
            <div class="size-3 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500" />
            Syncing your products…
          </div>
        </div>

        <!-- Sync error banner -->
        <div
          v-if="connection?.sync_progress?.phase === 'error'"
          data-test-id="integrations-sync-error"
          class="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5"
        >
          <icon-lucide-alert-circle class="mt-0.5 size-3.5 shrink-0 text-red-500" />
          <p class="text-xs text-red-700">
            {{ connection.sync_progress.error ?? 'Sync failed. Please try again.' }}
          </p>
        </div>

        <!-- Actions -->
        <div class="flex flex-wrap items-center gap-3 pt-1">
          <button
            data-test-id="integrations-refresh-btn"
            class="rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="isSyncing"
            @click="handleRefreshNow"
          >
            <icon-lucide-refresh-cw class="mr-1 inline-block size-3" />
            {{ isSyncing ? 'Syncing…' : 'Refresh now' }}
          </button>

          <button
            data-test-id="integrations-brand-kit-btn"
            class="rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-700 transition-colors hover:bg-gray-50"
            @click="goToBrandKit"
          >
            <icon-lucide-palette class="mr-1 inline-block size-3" />
            Brand kit
          </button>

          <button
            data-test-id="integrations-disconnect-btn"
            class="rounded-lg border border-red-200 px-3 py-1.5 text-xs text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="isDisconnecting"
            @click="showDisconnectModal = true"
          >
            {{ isDisconnecting ? 'Disconnecting…' : 'Disconnect' }}
          </button>
        </div>

        <!-- Disconnect error -->
        <p
          v-if="disconnectError"
          data-test-id="integrations-disconnect-error"
          class="text-xs text-red-600"
        >
          {{ disconnectError }}
        </p>
      </div>

      <!-- Reauthorize -->
      <div
        v-else-if="state === 'reauthorize'"
        data-test-id="integrations-reauthorize"
        class="rounded-xl border border-amber-200 bg-amber-50 p-5"
      >
        <div class="flex items-start gap-2">
          <icon-lucide-alert-triangle class="mt-0.5 size-4 shrink-0 text-amber-600" />
          <div class="flex-1">
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
          class="mt-4 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-500"
          @click="handleReauthorize"
        >
          Reauthorize
        </button>
      </div>
    </section>

    <!-- History section (collapsed accordion) -->
    <section>
      <AccordionRoot type="single" collapsible default-value="" class="space-y-2">
        <AccordionItem value="history">
          <AccordionTrigger
            data-test-id="integrations-history-toggle"
            class="flex w-full items-center justify-between text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            <span>History</span>
            <icon-lucide-chevron-down class="size-4 transition-transform data-[state=open]:rotate-180" />
          </AccordionTrigger>
          <AccordionContent
            data-test-id="integrations-history-content"
            class="mt-2 rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-500"
          >
            <p v-if="historyRows.length === 0">
              No history yet.
            </p>
            <ul v-else class="space-y-2">
              <li
                v-for="row in historyRows"
                :key="`${row.timestamp}-${row.event_type}`"
                data-test-id="integrations-history-row"
                class="flex items-center gap-3"
              >
                <span class="text-xs text-gray-400">{{ new Date(row.timestamp).toLocaleString() }}</span>
                <span class="text-xs font-medium capitalize text-gray-700">{{ row.event_type.replace(/_/g, ' ') }}</span>
              </li>
            </ul>
          </AccordionContent>
        </AccordionItem>
      </AccordionRoot>
    </section>

    <!-- Disconnect confirmation modal -->
    <DialogRoot :open="showDisconnectModal" @update:open="showDisconnectModal = $event">
      <DialogPortal>
        <DialogOverlay class="fixed inset-0 z-40 bg-black/50" />
        <DialogContent
          class="fixed top-1/2 left-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-6 shadow-xl"
        >
          <DialogTitle class="text-base font-semibold text-gray-900">
            Disconnect Shopify?
          </DialogTitle>
          <DialogDescription class="mt-3 text-sm text-gray-600 leading-relaxed">
            Your emails stay. Products will show as unavailable until you reconnect. We'll delete
            your store data in 30 days unless you reconnect.
          </DialogDescription>
          <p class="mt-2 text-sm text-gray-600">
            To fully uninstall Kova from Shopify admin →
            <a
              v-if="connection?.shop_domain"
              :href="`https://${connection.shop_domain}/admin/apps`"
              target="_blank"
              rel="noopener noreferrer"
              data-test-id="integrations-disconnect-admin-link"
              class="text-blue-600 underline hover:text-blue-800"
            >
              {{ connection.shop_domain }}/admin/apps
            </a>
          </p>
          <div class="mt-6 flex justify-end gap-3">
            <DialogClose as-child>
              <button
                data-test-id="integrations-disconnect-cancel"
                class="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            </DialogClose>
            <button
              data-test-id="integrations-disconnect-confirm"
              class="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              :disabled="isDisconnecting"
              @click="confirmDisconnect"
            >
              {{ isDisconnecting ? 'Disconnecting…' : 'Disconnect' }}
            </button>
          </div>
        </DialogContent>
      </DialogPortal>
    </DialogRoot>
  </div>
</template>
