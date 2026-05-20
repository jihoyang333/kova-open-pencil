<script setup lang="ts">
// Cluster 11 Plan Task 6.4 — EmptyState (CT-024 closure: XSS-safe headline).
//
// The `query` prop highlights a substring of the headline (used by search-
// empty surfaces — "No results for \"foo\""). The split into pre / match /
// post pieces and standard Vue text interpolation prevents v-html on user
// input. NEVER reintroduce v-html here or anywhere else this component is
// used (B-CRIT14).

import { computed } from 'vue'
import KovaIcon from './KovaIcon.vue'

interface Props {
  size?: 'inline-32' | 'panel-40' | 'full-48'
  icon: string
  headline: string
  body?: string
  query?: string
}

const props = withDefaults(defineProps<Props>(), { size: 'panel-40' })

interface HeadlineParts {
  pre: string
  match: string | null
  post: string
}

const parts = computed<HeadlineParts>(() => {
  if (!props.query) {
    return { pre: props.headline, match: null, post: '' }
  }
  const needle = `"${props.query}"`
  const idx = props.headline.indexOf(needle)
  if (idx === -1) {
    return { pre: props.headline, match: null, post: '' }
  }
  return {
    pre: props.headline.slice(0, idx),
    match: needle,
    post: props.headline.slice(idx + needle.length),
  }
})

const iconWrapSize = computed(() => {
  switch (props.size) {
    case 'inline-32':
      return 'h-8 w-8'
    case 'full-48':
      return 'h-12 w-12'
    case 'panel-40':
    default:
      return 'h-10 w-10'
  }
})
</script>

<template>
  <div
    class="empty-pane flex flex-col items-center gap-2 p-6 text-center"
    :class="size"
  >
    <div
      class="ic-wrap grid place-items-center rounded-full bg-line-2 text-ink-2"
      :class="iconWrapSize"
    >
      <KovaIcon :name="icon" />
    </div>
    <h5 class="text-sm font-medium text-ink">
      <template v-if="parts.match">
        <span>{{ parts.pre }}</span><span class="q text-accent">{{ parts.match }}</span><span>{{ parts.post }}</span>
      </template>
      <template v-else>{{ parts.pre }}</template>
    </h5>
    <p v-if="body" class="body text-xs text-ink-2">{{ body }}</p>
    <div v-if="$slots.cta" class="cta-row mt-1">
      <slot name="cta" />
    </div>
  </div>
</template>
