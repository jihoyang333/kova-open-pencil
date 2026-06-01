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

const FILE_NAME = 'Untitled — Cluster 06 showcase'
const FILE_META = 'auto-saved · just now'
</script>

<template>
  <!-- token-exempt-file: dev preview surface. /dev/cluster-06 is the canonical
       Cluster 06 chrome showcase — placeholder canvas surface intentionally
       uses raw px / arbitrary Tailwind values. Not shipped to end users. -->
  <div
    class="flex flex-col h-screen w-screen bg-page text-ink overflow-hidden"
    data-testid="cluster-06-showcase"
  >
    <TopChrome :file-name="FILE_NAME" />
    <div class="flex flex-1 min-h-0">
      <LeftPanel :file-name="FILE_NAME" :file-meta="FILE_META" />
      <main
        class="flex-1 min-h-0 relative bg-canvas overflow-hidden"
        data-testid="cluster-06-canvas-surface"
      >
        <div
          class="absolute inset-0 flex items-center justify-center text-ink-3 text-[12.5px] pointer-events-none select-none"
        >
          Placeholder canvas — engine mounts via EditorView (T14)
        </div>
        <BottomToolbar />
      </main>
      <RightPanel />
    </div>
  </div>
</template>
