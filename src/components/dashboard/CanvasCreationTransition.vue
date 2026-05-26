<script setup lang="ts">
import KovaIcon from '@/components/ui/KovaIcon.vue'

// PRD 02 §3.3 + Plan T32 — B11.1-B11.4 composer → splash transition (≤500ms
// total in prod). `state` is driven by the parent during the canvas-creation
// handoff.

defineProps<{
  state: 'idle' | 'submitting' | 'review' | 'splash'
  prompt: string
}>()
</script>

<template>
  <div
    v-if="state === 'splash'"
    data-test-id="canvas-creation-splash"
    class="splash-stage fixed inset-0 grid place-items-center bg-[var(--bg)] z-10"
  >
    <KovaIcon
      name="loader-2"
      size="md"
      class="splash-spinner animate-spin text-[var(--ink-2)] w-8 h-8"
    />
    <div class="splash-cap text-sm text-[var(--ink-3)] mt-3">Setting up your canvas…</div>
  </div>
  <div
    v-else
    data-test-id="canvas-creation-transition"
    class="composer"
    :class="{ 'transition-fade': state === 'review' }"
  >
    <div class="composer-input-wrap">
      <div
        class="composer-input"
        :class="{ submitting: state === 'submitting', review: state === 'review' }"
      >
        <span class="typed">{{ prompt }}</span>
      </div>
      <div class="composer-input-tools">
        <div class="grow" />
        <div v-if="state === 'submitting'" data-test-id="canvas-creation-status" class="composer-status text-[var(--ink-3)] text-xs">
          Creating canvas…
        </div>
        <div
          v-else-if="state === 'review'"
          data-test-id="canvas-creation-ready"
          class="composer-status ready"
        >
          <KovaIcon name="check" size="sm" class="tick" />
          Ready
        </div>
        <button class="btn accent go" disabled>
          <span v-if="state === 'review'">Ready</span>
          <span v-else-if="state === 'submitting'">Creating…</span>
          <span v-else>Generate on canvas</span>
          <KovaIcon
            v-if="state === 'submitting'"
            name="loader-2"
            size="sm"
            class="ic animate-spin"
          />
          <KovaIcon
            v-else-if="state === 'review'"
            name="check"
            size="sm"
            class="ic"
          />
          <KovaIcon v-else name="arrow-right" size="sm" class="ic" />
        </button>
      </div>
    </div>
  </div>
</template>
