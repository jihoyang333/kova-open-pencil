<!-- token-exempt-file: Auth-shell view. Px values match B6.1 + B6.2 hi-fi (cluster-01-tokens-used.md §3-§5). -->
<script setup lang="ts">
import { computed, watch } from 'vue'

import AuthCard from '@/components/auth/AuthCard.vue'
import AuthCta from '@/components/auth/AuthCta.vue'
import AuthHeader from '@/components/auth/AuthHeader.vue'
import { useViewportGuard } from '@/composables/auth/use-viewport-guard'
import { IS_BROWSER } from '@/constants'

// W8a Cluster 01 — MobileFallbackView (Plan 01 Task 19 / amendment §7 Phase 9.4).
// Two hi-fi variants share a route: B6.1 (mobile, <640px) renders the
// monitor glyph + "phones can offer" copy; B6.2 (tablet, 640–1023px) renders
// the laptop glyph + "rotate your tablet" copy. When the viewport grows past
// 1024px (desktop, e.g. tablet rotated to landscape), we auto-reload the page
// so the user lands at their originally-requested route per A15 §12.9.

const MAILTO_HREF =
  'mailto:?subject=Open%20Kova%20on%20desktop&body=Click%20this%20link%20from%20your%20laptop%3A%20https%3A%2F%2Fapp.kova.io'
const MARKETING_URL = 'https://kova.io'

const viewport = useViewportGuard()
const isMobile = computed(() => viewport.isMobile.value)
const isTablet = computed(() => viewport.isTablet.value)

watch(
  () => viewport.isDesktop.value,
  (desktop) => {
    if (desktop && IS_BROWSER) window.location.reload()
  }
)

function onLearnMore(): void {
  if (IS_BROWSER) window.location.href = MARKETING_URL
}

function onRotateAck(): void {
  // No-op placeholder — the watch above auto-reloads when the rotated
  // viewport actually exceeds the desktop breakpoint. The button itself is a
  // user-affordance acknowledgement, not a wired action.
}

function onReload(): void {
  if (IS_BROWSER) window.location.reload()
}
</script>

<template>
  <div
    data-theme="light"
    data-test-id="mobile-fallback-view"
    class="grid min-h-screen grid-rows-[auto_1fr_auto] bg-bg text-ink"
  >
    <AuthHeader mode="signin" />
    <main class="grid min-h-0 place-items-center overflow-auto px-6 py-6 pb-14">
      <AuthCard>
        <div class="flex flex-col items-center gap-[18px] text-center">
          <div
            class="grid size-12 place-items-center rounded-full bg-fill text-ink-3"
            aria-hidden="true"
          >
            <icon-lucide-monitor v-if="isMobile" class="size-6" />
            <icon-lucide-laptop v-else class="size-6" />
          </div>

          <header class="flex flex-col items-center gap-[6px] text-center">
            <span class="text-[10px] text-ink-3">{{ isTablet ? 'Almost there' : 'For now' }}</span>
            <h1 class="m-0 text-[24px] leading-[1.18] font-semibold tracking-tight text-ink">
              <template v-if="isTablet">Bigger screen needed</template>
              <template v-else>Kova is desktop-only</template>
            </h1>
            <p class="m-0 max-w-[320px] text-[13px] leading-[1.55] text-ink-2">
              <template v-if="isTablet">
                Kova needs a slightly bigger screen than this. Try a laptop or rotate your tablet to
                landscape — the canvas tools start working at 1024 pixels wide.
              </template>
              <template v-else>
                Open Kova on a laptop or desktop to continue. We'll be on mobile eventually — for
                now, the canvas needs more screen real estate than phones can offer.
              </template>
            </p>
          </header>

          <a
            data-test-id="mailto-cta"
            :href="MAILTO_HREF"
            class="flex w-full items-center justify-center gap-2 rounded-md border border-ink bg-ink px-[14px] py-[10px] text-[13.5px] font-medium text-ink-on-primary transition-colors hover:bg-[#000000]"
          >
            <icon-lucide-mail class="size-[14px]" />
            <span>Email myself a desktop link</span>
          </a>

          <AuthCta
            v-if="isTablet"
            label="I'll rotate my tablet"
            type="button"
            variant="secondary"
            @click="onRotateAck"
          />
          <AuthCta
            v-else
            label="Learn more about Kova"
            type="button"
            variant="secondary"
            @click="onLearnMore"
          />

          <p class="text-[12px] text-ink-2">
            Already on desktop?
            <button
              type="button"
              data-test-id="reload-link"
              class="text-ink underline hover:text-ink-2"
              @click="onReload"
            >
              Reload the page</button
            >.
          </p>
        </div>
      </AuthCard>
    </main>
  </div>
</template>
