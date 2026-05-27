<script setup lang="ts">
import { onMounted, onUnmounted, provide, ref, watch } from 'vue'
import { useBreakpoints, useEventListener, useUrlSearchParams, watchDebounced } from '@vueuse/core'
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router'
import { useHead } from '@unhead/vue'
import { SplitterGroup, SplitterPanel, SplitterResizeHandle } from 'reka-ui'

import { useCanvasBindingsPersistence } from '@/composables/useCanvasBindingsPersistence'
import { useImportImages } from '@/composables/use-import-images'
import { useKeyboard } from '@/composables/use-keyboard'
import { useMenu } from '@/composables/use-menu'
import { useCollab, COLLAB_KEY } from '@/composables/use-collab'
import { connectAutomation } from '@/automation/server'
import { spawnMCPIfNeeded } from '@/automation/spawn-mcp'
import { APP_NAME, IS_TAURI, TOGGLE_MEDIA_PANEL_KEY } from '@/constants'
import { createDemoShapes } from '@/demo'
import { useBrandsStore } from '@/stores/brands'
import { useCanvasesStore } from '@/stores/canvases'
import { useEditorStore } from '@/stores/editor'
import { captureThumbnail } from '@/utils/capture-thumbnail'
import { createTab, activeTab, getActiveStore } from '@/stores/tabs'

import CollabPanel from '@/components/CollabPanel.vue'
import EditorCanvas from '@/components/EditorCanvas.vue'
import LayersPanel from '@/components/LayersPanel.vue'
import MobileDrawer from '@/components/MobileDrawer.vue'
import MobileHud from '@/components/MobileHud.vue'
import PropertiesPanel from '@/components/PropertiesPanel.vue'
import SafariBanner from '@/components/SafariBanner.vue'
import TabBar from '@/components/TabBar.vue'
import MediaLibraryPanel from '@/components/media/MediaLibraryPanel.vue'
import Toolbar from '@/components/Toolbar.vue'
import ChatPopup from '@/components/chat/ChatPopup.vue'
import ShopBuildPrompt from '@/components/editor/ShopBuildPrompt.vue'
import ShopPanel from '@/components/editor/sidebar/ShopPanel.vue'
import { useShopDrop } from '@/composables/use-shop-drop'

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

// Canvas integration (only for non-demo routes with canvasId)
const router = useRouter()
const canvasId = route.params.canvasId as string | undefined
const brandsStore = useBrandsStore()

if (canvasId) {
  const canvasesStore = useCanvasesStore()

  // Track the initially loaded name to prevent redundant sync on mount
  let loadedName = ''
  let saveBindings: (() => Promise<void>) | null = null

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

    // Load the associated brand
    await brandsStore.fetchBrands()
    if (data.brand_id) {
      brandsStore.selectBrand(data.brand_id)
      const persistence = useCanvasBindingsPersistence(canvasId, data.brand_id as string)
      await persistence.loadBindings()
      saveBindings = persistence.saveBindings
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

  // Capture thumbnail and save bindings on leave (non-blocking)
  onBeforeRouteLeave(() => {
    if (saveBindings) void saveBindings()
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

const leftPanel = ref<'layers' | 'shop'>('layers')
const { handleCanvasDrop, confirmBuildAround, dismissBuildPrompt, buildPromptVisible, buildPromptTitle } = useShopDrop()

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

    <!-- Desktop layout -->
    <SplitterGroup
      v-if="!isMobile && showChrome && store.state.showUI === 'full'"
      :key="activeTab?.id"
      direction="horizontal"
      class="flex-1 overflow-hidden"
      auto-save-id="editor-layout"
    >
      <SplitterPanel :default-size="18" :min-size="10" :max-size="30" class="flex">
        <div class="flex min-w-0 flex-1 flex-col overflow-hidden">
          <!-- Shop/Layers tab strip (only when brand is connected) -->
          <div
            v-if="brandsStore.selectedBrandId"
            class="flex h-7 shrink-0 items-stretch border-b border-r border-border bg-panel"
          >
            <button
              data-test-id="left-panel-tab-layers"
              class="flex-1 text-[10px] font-medium tracking-wide uppercase transition-colors"
              :class="leftPanel === 'layers' ? 'text-surface' : 'text-muted hover:text-surface'"
              @click="leftPanel = 'layers'"
            >
              Layers
            </button>
            <button
              data-test-id="left-panel-tab-shop"
              class="flex-1 text-[10px] font-medium tracking-wide uppercase transition-colors"
              :class="leftPanel === 'shop' ? 'text-surface' : 'text-muted hover:text-surface'"
              @click="leftPanel = 'shop'"
            >
              Shop
            </button>
          </div>
          <LayersPanel v-if="leftPanel !== 'shop' || !brandsStore.selectedBrandId" />
          <ShopPanel
            v-else
            :brand-id="brandsStore.selectedBrandId"
            class="flex-1"
          />
        </div>
      </SplitterPanel>
      <SplitterResizeHandle
        data-test-id="left-splitter-handle"
        class="group relative z-10 -mx-1 w-2 cursor-col-resize"
      >
        <div class="pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2" />
      </SplitterResizeHandle>
      <SplitterPanel :default-size="64" :min-size="30" class="flex">
        <div
          class="relative flex min-w-0 flex-1"
          @dragover.prevent
          @drop.prevent="handleCanvasDrop"
        >
          <EditorCanvas />
          <Toolbar />
          <MediaLibraryPanel v-if="showMediaPanel" @close="showMediaPanel = false" />
        </div>
      </SplitterPanel>
      <SplitterResizeHandle class="group relative z-10 -mx-1 w-2 cursor-col-resize">
        <div class="pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2" />
      </SplitterResizeHandle>
      <SplitterPanel :default-size="18" :min-size="10" :max-size="30" class="flex flex-col">
        <div
          class="flex shrink-0 items-center gap-2 border-b border-border px-1.5 py-1.5"
        >
          <CollabPanel />
        </div>
        <PropertiesPanel />
      </SplitterPanel>
    </SplitterGroup>

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

    <!-- Chat popup overlay (always rendered, manages its own visibility) -->
    <ChatPopup
      v-if="canvasId && brandsStore.selectedBrandId"
      :canvas-id="canvasId"
      :brand-id="brandsStore.selectedBrandId"
    />

    <!-- Shop drop: build-around prompt -->
    <ShopBuildPrompt
      :visible="buildPromptVisible"
      :product-title="buildPromptTitle"
      @confirm="confirmBuildAround"
      @dismiss="dismissBuildPrompt"
    />
  </div>
</template>
