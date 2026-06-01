<script setup lang="ts">
/**
 * Cluster06Showcase — /dev/cluster-06 surface.
 *
 * Composes TopChrome + LeftPanel + RightPanel + BottomToolbar over a static
 * placeholder canvas for visual-diff baselines. Mirrors the chrome layout
 * EditorView (Task 14, deferred) will mount in the production canvas route.
 *
 * Reference: docs/kova-final-impl-plans/06-canvas-editor-core-chrome-plan.md.
 * Hi-fi source: outer-repo `compressed-figma-canvas-ui/` PNG tree.
 */
import BottomToolbar from '@/components/editor/BottomToolbar.vue'
import LeftPanel from '@/components/editor/LeftPanel.vue'
import RightPanel from '@/components/editor/RightPanel.vue'
import TopChrome from '@/components/editor/TopChrome.vue'
import { createEditorStore, setActiveEditorStore } from '@/stores/editor'
import { useRightPanelStore } from '@/stores/right-panel'

// The chrome components read the active per-tab editor store via useEditorStore.
// On the real /canvas route EditorView's createTab() provides it; the showcase
// has no tab, so bootstrap a standalone store here. AI tab is default-active
// per §12.13 (initFor with no persisted localStorage key).
setActiveEditorStore(createEditorStore())
useRightPanelStore().initFor('cluster-06-showcase')

const FILE_NAME = 'Untitled — Cluster 06 showcase'
const FILE_META = 'auto-saved · just now'
</script>

<template>
  <!-- token-exempt-file: dev preview surface. /dev/cluster-06 is the canonical
       Cluster 06 chrome showcase — placeholder canvas surface intentionally
       uses raw px / arbitrary Tailwind values. Not shipped to end users. -->
  <div
    class="flex h-screen w-screen flex-col overflow-hidden bg-page text-ink"
    data-testid="cluster-06-showcase"
  >
    <TopChrome :file-name="FILE_NAME" />
    <div class="flex min-h-0 flex-1">
      <LeftPanel :file-name="FILE_NAME" :file-meta="FILE_META" />
      <main
        class="relative min-h-0 flex-1 overflow-hidden bg-canvas"
        data-testid="cluster-06-canvas-surface"
      >
        <div
          class="pointer-events-none absolute inset-0 flex items-center justify-center text-[12.5px] text-ink-3 select-none"
        >
          Placeholder canvas — engine mounts via EditorView (T14)
        </div>
        <BottomToolbar />
      </main>
      <RightPanel />
    </div>
  </div>
</template>
