<script setup lang="ts">
/**
 * LeftPanel — Cluster 06 Task 11.
 *
 * Hi-fi source: Kova Canvas - Final.html `.kc .left` (lines 147-216).
 * 240px wide, rail bg, hairline right border, file-row at top.
 *
 * Per PRD 06 §12.1 RATIFIED 2026-05-17: THREE stacked collapsible sections
 * (Pages, Layers, Shop). Shop default-expanded only when active brand has
 * Shopify connection; else collapsed with "Connect Shopify" CTA empty state.
 *
 * NOTE: Until the LeftPanel is wired into EditorView (T14), Cluster 03's
 * existing PagesPanel chrome continues to render via the M5 editor view.
 */
import { computed, onMounted } from 'vue'
import { CollapsibleContent, CollapsibleRoot, CollapsibleTrigger } from 'reka-ui'
import { useEditorStore } from '@/stores/editor'
import { useBrandsStore } from '@/stores/brands'
import { useLeftPanelStore } from '@/stores/left-panel'
import { useLayerTree } from '@/composables/use-layer-tree'
import KovaIcon from '@/components/ui/KovaIcon.vue'
import FileRow from './FileRow.vue'
import LayersChromePanel from './LayersChromePanel.vue'

interface Props {
  fileName: string
  fileMeta: string
  productCount?: number
  shopifyConnected?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  productCount: 0,
  shopifyConnected: false,
})

const editor = useEditorStore()
const lp = useLeftPanelStore()
const brands = useBrandsStore()
const tree = useLayerTree()
void brands

const pageCount = computed(() => editor.graph.getPages().length)
const layerCount = computed(() => tree.flatRows.value.length)

onMounted(() => {
  if (props.shopifyConnected && !lp.expanded.shop) {
    lp.setExpanded('shop', true)
  }
})
</script>

<template>
  <aside
    class="w-[240px] bg-rail border-r border-line flex flex-col min-h-0 overflow-hidden"
    data-testid="left-panel"
  >
    <FileRow :file-name="fileName" :meta="fileMeta" />

    <CollapsibleRoot v-model:open="lp.expanded.pages" class="flex-shrink-0">
      <CollapsibleTrigger
        class="w-full pt-[14px] px-[14px] pb-1.5 flex items-center justify-between text-ink-3 text-[11px] font-medium uppercase tracking-[0.04em] cursor-pointer hover:text-ink-2"
        data-testid="left-panel-section-pages"
      >
        <span>Pages</span>
        <span class="inline-flex items-center gap-1.5 normal-case tracking-normal">
          <span data-testid="pages-count">{{ pageCount }}</span>
          <KovaIcon name="plus" size="xs" />
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent class="px-2 pb-1.5">
        <slot name="pages">
          <div class="text-ink-3 text-[12.5px] px-1.5 py-1">
            Pages list mounts via existing PagesPanel.
          </div>
        </slot>
      </CollapsibleContent>
    </CollapsibleRoot>

    <CollapsibleRoot
      v-model:open="lp.expanded.layers"
      class="flex-1 min-h-0 flex flex-col"
    >
      <CollapsibleTrigger
        class="w-full pt-[14px] px-[14px] pb-1.5 flex items-center justify-between text-ink-3 text-[11px] font-medium uppercase tracking-[0.04em] cursor-pointer hover:text-ink-2"
        data-testid="left-panel-section-layers"
      >
        <span>Layers</span>
        <span class="normal-case tracking-normal" data-testid="layers-count">{{ layerCount }}</span>
      </CollapsibleTrigger>
      <CollapsibleContent class="flex-1 overflow-hidden flex flex-col min-h-0">
        <LayersChromePanel />
      </CollapsibleContent>
    </CollapsibleRoot>

    <CollapsibleRoot
      v-model:open="lp.expanded.shop"
      class="flex-shrink-0 max-h-[40vh] border-t border-line-2"
    >
      <CollapsibleTrigger
        class="w-full pt-[14px] px-[14px] pb-1.5 flex items-center justify-between text-ink-3 text-[11px] font-medium uppercase tracking-[0.04em] cursor-pointer hover:text-ink-2"
        data-testid="left-panel-section-shop"
      >
        <span>Shop</span>
        <span class="normal-case tracking-normal" data-testid="shop-count">{{ productCount }}</span>
      </CollapsibleTrigger>
      <CollapsibleContent class="overflow-hidden">
        <slot name="shop">
          <div
            v-if="!shopifyConnected"
            class="px-[14px] py-4 text-ink-3 text-[12.5px]"
            data-testid="shop-empty-state"
          >
            Connect Shopify in Account → Integrations
          </div>
        </slot>
      </CollapsibleContent>
    </CollapsibleRoot>
  </aside>
</template>
