<script setup lang="ts">
import KovaIcon from '@/components/ui/KovaIcon.vue'

// PRD 02 §3.1 + Plan T16 — A1.01.f workspace splash with 2x2 starter grid.

export type SplashChoice = 'draft' | 'import' | 'browse' | 'add-brand'

defineProps<{ brandName: string }>()

const emit = defineEmits<{
  enter: []
  pick: [choice: SplashChoice]
}>()
</script>

<template>
  <div data-test-id="onboarding-splash-step" class="onb-card">
    <div class="onb-splash">
      <div class="check-medal">
        <KovaIcon name="check" size="md" />
      </div>
      <div>
        <div class="onb-eyebrow">Workspace ready</div>
        <h1>You're in.</h1>
      </div>
      <p class="onb-lede">
        {{ brandName }}'s brand kit is populated. Pick a starting point — or just dive in.
      </p>

      <div class="onb-next">
        <button class="opt" @click="emit('pick', 'draft')">
          <div class="lbl">Generate</div>
          <div class="nm">Draft your first email</div>
          <div class="sub">Kova will pitch 3 ideas based on your catalog.</div>
        </button>
        <button class="opt" @click="emit('pick', 'import')">
          <div class="lbl">Import</div>
          <div class="nm">Bring in past sends</div>
          <div class="sub">Build a swipe library from your sent emails.</div>
        </button>
        <button class="opt" @click="emit('pick', 'browse')">
          <div class="lbl">Browse</div>
          <div class="nm">Kova swipes</div>
          <div class="sub">DTC reference designs for inspiration.</div>
        </button>
        <button class="opt" @click="emit('pick', 'add-brand')">
          <div class="lbl">Add</div>
          <div class="nm">Another brand</div>
          <div class="sub">Run multiple clients siloed in one workspace.</div>
        </button>
      </div>

      <button
        data-test-id="splash-enter"
        class="btn primary enter-btn"
        @click="emit('enter')"
      >
        Enter {{ brandName }} workspace
        <KovaIcon name="arrow-right" size="sm" class="ic" />
      </button>
    </div>
  </div>
</template>
