<script setup lang="ts">
/**
 * RightPanelAiSlot — Cluster 06 Task 15.
 *
 * Mounts Cluster 10's <ChatPanel> in the right-panel AI tab body.
 * Lazy-loaded so Cluster 06 ships without a hard dep on Cluster 10 mount.
 *
 * Per PRD 06 §6.4.5, the slot host is OWNED by Cluster 06; the component
 * itself is provided by Cluster 10. If Cluster 10 hasn't shipped yet, the
 * placeholder copy below renders.
 */
import { defineAsyncComponent } from 'vue'

const ChatPanel = defineAsyncComponent({
  loader: () => import('@/components/ChatPanel.vue'),
  errorComponent: {
    template:
      '<div class="px-[14px] py-4 text-ink-3 text-[12px]" data-testid="chat-panel-error">ChatPanel failed to load.</div>',
  },
  loadingComponent: {
    template:
      '<div class="px-[14px] py-4 text-ink-3 text-[12px]" data-testid="chat-panel-loading">Loading chat…</div>',
  },
  onError(error, retry, fail, attempts) {
    // H5 from code review — log failures so silent mount errors don't hide
    // production breakage. Sentry hook lives in main.ts initBrowserSentry.
    console.error('[RightPanelAiSlot] ChatPanel mount failed', {
      attempts,
      error,
    })
    if (attempts <= 2) {
      retry()
    } else {
      fail()
    }
  },
})
</script>

<template>
  <div class="flex flex-col h-full" data-testid="right-panel-ai-slot">
    <ChatPanel />
  </div>
</template>
