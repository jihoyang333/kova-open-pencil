<script setup lang="ts">
import { onMounted, onUnmounted, provide, ref, computed, watch } from 'vue'
import { useBreakpoints, useEventListener, useUrlSearchParams, watchDebounced } from '@vueuse/core'
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router'
import { useHead } from '@unhead/vue'
import { isFontLoaded, DEFAULT_FONT_FAMILY } from '@open-pencil/core'

import { useImportImages } from '@/composables/use-import-images'
import { useKeyboard } from '@/composables/use-keyboard'
import { useShortcutRegistration } from '@/composables/use-shortcut-registration'
import { useFindSearch } from '@/composables/use-find-search'
import { useCameraPan } from '@/composables/use-camera-pan'
import { registerInspectorSections } from '@/inspector/register-inspector-sections'
import { useMenu } from '@/composables/use-menu'
import { useCollab, COLLAB_KEY } from '@/composables/use-collab'
import { connectAutomation } from '@/automation/server'
import { spawnMCPIfNeeded } from '@/automation/spawn-mcp'
import { APP_NAME, IS_TAURI, TOGGLE_MEDIA_PANEL_KEY } from '@/constants'
import { createDemoShapes } from '@/demo'
import { useBrandsStore } from '@/stores/brands'
import { useCanvasesStore } from '@/stores/canvases'
import { useEditorStore } from '@/stores/editor'
import { useShopifyProductsStore } from '@/stores/shopify-products'
import { captureThumbnail } from '@/utils/capture-thumbnail'
import { createTab, activeTab, getActiveStore } from '@/stores/tabs'

import EditorCanvas from '@/components/EditorCanvas.vue'
import MobileDrawer from '@/components/MobileDrawer.vue'
import MobileHud from '@/components/MobileHud.vue'
import SafariBanner from '@/components/SafariBanner.vue'
import TabBar from '@/components/TabBar.vue'
import MediaLibraryPanel from '@/components/media/MediaLibraryPanel.vue'
import Toolbar from '@/components/Toolbar.vue'
import PagesPanel from '@/components/PagesPanel.vue'

// Cluster 06 chrome (replaces the OpenPencil Toolbar / LayersPanel /
// PropertiesPanel in the desktop "full" editing surface).
import TopChrome from '@/components/editor/TopChrome.vue'
import LeftPanel from '@/components/editor/LeftPanel.vue'
import RightPanel from '@/components/editor/RightPanel.vue'
import BottomToolbar from '@/components/editor/BottomToolbar.vue'
import CanvasOverlayHost from '@/components/editor/CanvasOverlayHost.vue'
import CanvasOverlayLayer from '@/components/canvas-overlays/CanvasOverlayLayer.vue'
import SearchPanel from '@/components/find/SearchPanel.vue'
import ZoomHud from '@/components/editor/ZoomHud.vue'
import MissingFontsPill from '@/components/editor/MissingFontsPill.vue'
import ShopPanel from '@/components/editor/sidebar/ShopPanel.vue'
import type { SelectedProduct } from '@/components/editor/sidebar/ShopPanelProducts.vue'

const route = useRoute()
const params = useUrlSearchParams('history')
const showChrome = !('no-chrome' in params)

const firstTab = createTab()
const store = useEditorStore()
const breakpoints = useBreakpoints({ mobile: 768 })
const isMobile = breakpoints.smaller('mobile')

if (route.meta.demo && !('test' in params)) {
  createDemoShapes(firstTab.store)
}

useHead({ title: route.meta.demo ? 'Demo' : undefined })
useKeyboard()
useMenu()
// 07b: register inspector/find/boolean/pixel-grid shortcuts (Phase-A fallback, PRD §12.5/12.7/12.12)
useShortcutRegistration()
// 07b CT-022: bring the find-search + camera-pan watchers alive. The store's
// setQuery()/focusNode() only write state; these composables hold the watchers
// that turn a query into matchedNodeIds and a single match into a camera pan.
// Without instantiating them here the find panel is inert (audit C1).
useFindSearch()
useCameraPan()
// 07b: populate the InspectorRouter registry so the desktop right-panel renders the
// inspector sections (PRD 06 §12.15). Idempotent — safe across editor re-mounts.
registerInspectorSections()

// Canvas integration (only for non-demo routes with canvasId)
const router = useRouter()
const canvasId = route.params.canvasId as string | undefined
const brandsStore = useBrandsStore()
const shopProducts = useShopifyProductsStore()

if (canvasId) {
  const canvasesStore = useCanvasesStore()

  // Track the initially loaded name to prevent redundant sync on mount
  let loadedName = ''

  onMounted(async () => {
    // Fetch canvas record directly (search active + trashed)
    const { data } = await import('@/lib/supabase').then((m) =>
      m.supabase.from('canvases').select('*').eq('id', canvasId).single()
    )

    if (!data || data.trashed_at) {
      void router.replace('/dashboard')
      return
    }

    // Set document name from canvas record
    loadedName = data.name
    store.state.documentName = data.name

    // Load the associated brand + its Shopify catalog (for the Shop section)
    await brandsStore.fetchBrands()
    if (data.brand_id) {
      brandsStore.selectBrand(data.brand_id)
      void shopProducts.loadForBrand(data.brand_id as string)
    }
  })

  // Sync name changes back to canvas record, debounced to avoid rapid-fire Supabase writes
  watchDebounced(
    () => store.state.documentName,
    (newName) => {
      if (newName && canvasId && newName !== loadedName) {
        void canvasesStore.renameCanvas(canvasId, newName)
      }
      // After first real user edit, clear the guard so subsequent renames work normally
      if (newName !== loadedName) {
        loadedName = ''
      }
    },
    { debounce: 500 }
  )

  // Capture thumbnail on leave (non-blocking)
  onBeforeRouteLeave(() => {
    void captureThumbnail(canvasId)
  })

  // Consume images queued by "Import to canvas" from brand assets
  useImportImages(store)
}

const collab = useCollab(firstTab.store)
provide(COLLAB_KEY, collab)

const showMediaPanel = ref(false)
provide(TOGGLE_MEDIA_PANEL_KEY, () => {
  showMediaPanel.value = !showMediaPanel.value
})

// ── Cluster 06 chrome bindings ───────────────────────────────────────
const brandId = computed(() => brandsStore.selectedBrandId)
const productCount = computed(() => shopProducts.productsById.size)
// A populated catalog is a reliable proxy for "this brand has Shopify
// connected" without spinning up the heavier useShopifyConnection poller here.
const shopifyConnected = computed(() => productCount.value > 0)
const fileMeta = computed(() => (store.state.documentName ? 'Auto-saved' : ''))

// Aggregate missing-font count across the current page's TEXT nodes; drives
// the MissingFontsPill (C-LOW06.4). Touches sceneVersion for reactivity.
const missingFontsCount = computed(() => {
  void store.state.sceneVersion
  const families = new Set<string>()
  for (const node of store.graph.flattenTree(store.state.currentPageId)) {
    if (node.type !== 'TEXT') continue
    families.add(node.fontFamily || DEFAULT_FONT_FAMILY)
  }
  return [...families].filter((f) => !isFontLoaded(f)).length
})

function onImportProducts(products: SelectedProduct[]): void {
  // Cluster 10 owns useChatProductReferencesStore.importProducts; the chrome
  // emits the selection and the wave-merge wires it to the real chat-refs
  // store (Shopify spec §4.1 / PRD 06 §12.19).
  if (import.meta.env.DEV) {
    console.warn(
      '[EditorView] import products → Cluster 10 chat refs',
      products.map((p) => p.id)
    )
  }
}

function onOpenFontManager(): void {
  // Cluster 05 owns the Brand Kit fonts route; wired at wave-merge.
  if (import.meta.env.DEV) {
    console.warn('[EditorView] open font manager — Cluster 05 Brand Kit fonts tab')
  }
}

useEventListener(
  document,
  'wheel',
  (e: WheelEvent) => {
    if (e.ctrlKey || e.metaKey) e.preventDefault()
  },
  { passive: false }
)

const automationCleanup = ref<(() => void) | null>(null)
const mcpCleanup = ref<(() => void) | null>(null)

onMounted(async () => {
  if (import.meta.env.DEV || IS_TAURI) {
    automationCleanup.value = connectAutomation(getActiveStore).disconnect
  }
  try {
    mcpCleanup.value = await spawnMCPIfNeeded()
  } catch (e) {
    console.error(e)
  }
})

onUnmounted(() => {
  mcpCleanup.value?.()
  automationCleanup.value?.()
})
</script>

<template>
  <div data-test-id="editor-root" class="flex h-screen w-screen flex-col">
    <SafariBanner />
    <TabBar />

    <!-- Desktop "full" editing surface — Cluster 06 chrome -->
    <div
      v-if="!isMobile && showChrome && store.state.showUI === 'full'"
      :key="activeTab?.id"
      class="flex min-h-0 flex-1 flex-col"
    >
      <TopChrome :file-name="store.state.documentName" />
      <div class="relative flex min-h-0 flex-1">
        <!-- 07b: find panel slides in over the layers panel when find active (PRD §12.12) -->
        <SearchPanel />
        <LeftPanel
          v-show="store.state.panelsVisible.left"
          :file-name="store.state.documentName"
          :file-meta="fileMeta"
          :product-count="productCount"
          :shopify-connected="shopifyConnected"
        >
          <template #pages>
            <PagesPanel />
          </template>
          <template #shop>
            <ShopPanel v-if="brandId" :brand-id="brandId" @import="onImportProducts" />
          </template>
        </LeftPanel>

        <main
          class="relative flex min-h-0 min-w-0 flex-1 overflow-hidden"
          data-testid="canvas-viewport"
        >
          <EditorCanvas />
          <CanvasOverlayHost>
            <CanvasOverlayLayer />
          </CanvasOverlayHost>
          <MissingFontsPill
            :missing-count="missingFontsCount"
            @open-font-manager="onOpenFontManager"
          />
          <BottomToolbar />
          <ZoomHud />
          <MediaLibraryPanel v-if="showMediaPanel" @close="showMediaPanel = false" />
        </main>

        <RightPanel v-show="store.state.panelsVisible.right" />
      </div>
    </div>

    <!-- Mobile layout -->
    <div
      v-else-if="isMobile && showChrome && store.state.showUI === 'full'"
      :key="'mobile-' + activeTab?.id"
      class="flex flex-1 overflow-hidden"
    >
      <div class="relative flex min-w-0 flex-1">
        <EditorCanvas />
        <MobileHud />
        <Toolbar />
      </div>
      <MobileDrawer />
    </div>

    <!-- Collapsed UI (showUI != 'full') -->
    <div
      v-else-if="showChrome"
      :key="'collapsed-' + activeTab?.id"
      class="flex flex-1 overflow-hidden"
    >
      <div class="relative flex min-w-0 flex-1">
        <EditorCanvas />
        <div
          v-if="!isMobile"
          class="absolute top-7 left-7 z-10 flex items-center gap-2 rounded-lg border border-border bg-panel px-2 py-1 shadow-sm"
        >
          <img src="/favicon-32.png" class="size-4" :alt="APP_NAME" />
          <span data-test-id="editor-document-name" class="text-xs text-surface">{{
            store.state.documentName
          }}</span>
          <button
            data-test-id="editor-show-ui"
            class="ml-1 flex size-6 cursor-pointer items-center justify-center rounded text-muted transition-colors hover:bg-hover hover:text-surface"
            title="Show UI (⌘\)"
            @click="store.setUIVisibility('full')"
          >
            <icon-lucide-sidebar class="size-3.5" />
          </button>
        </div>
      </div>
    </div>

    <!-- Bare canvas (no chrome, e.g. ?no-chrome) -->
    <div v-else :key="'bare-' + activeTab?.id" class="flex flex-1 overflow-hidden">
      <div class="relative flex min-w-0 flex-1">
        <EditorCanvas />
      </div>
    </div>
  </div>
</template>
