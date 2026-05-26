<script setup lang="ts">
import { computed, ref } from 'vue'

import KovaIcon from '@/components/ui/KovaIcon.vue'
import { COMING_SOON, type ComingSoonSpec } from '@/constants/coming-soon'
import { toast } from '@/composables/use-toast'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'

// PRD 02 §3.6 + Plan T37 — A12 coming-soon shell. One template + 7 specs.
// Calendar / Swipes / Templates ship with full content; the remaining 4 are
// placeholder stubs until Cluster 05 / 10 deliver.

const props = defineProps<{ kind: string }>()

// M5 audit fix — calendar entry is statically present in COMING_SOON so the
// fallback never returns undefined. Narrow the type instead of using `!`.
const spec = computed<ComingSoonSpec>(() => COMING_SOON[props.kind] ?? COMING_SOON.calendar)
const activeTab = ref(0)
const auth = useAuthStore()

async function onNotifyMe(): Promise<void> {
  const email = auth.user?.email
  if (!email) return
  const { data } = await supabase.auth.getSession()
  if (!data.session) {
    toast.show('Sign in expired. Please sign in again.', 'error')
    return
  }
  try {
    const res = await fetch('/api/marketing/notify-me', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${data.session.access_token}`,
      },
      body: JSON.stringify({ email, surface: props.kind }),
    })
    // L4 audit fix — surface non-2xx responses instead of swallowing them.
    if (!res.ok) {
      toast.show('Could not subscribe. Try again later.', 'error')
      return
    }
    toast.show("We'll let you know")
  } catch {
    toast.show('Could not subscribe. Try again later.', 'error')
  }
}
</script>

<template>
  <div data-test-id="coming-soon-view">
    <div v-if="spec.tabs" class="cs-tabs">
      <button
        v-for="(t, i) in spec.tabs"
        :key="t"
        type="button"
        class="tab"
        :class="{ on: i === activeTab }"
        @click="activeTab = i"
      >
        {{ t }}
      </button>
    </div>
    <div class="cs-pane">
      <div class="ic-tile">
        <KovaIcon :name="spec.icon" size="md" />
      </div>
      <div class="eyebrow">{{ spec.eyebrow }}</div>
      <h1>{{ spec.headline }}</h1>
      <p>{{ spec.body }}</p>
      <ul v-if="spec.roadmap.length" class="roadmap">
        <li v-for="r in spec.roadmap" :key="r">
          <KovaIcon name="check" size="sm" class="ic" />
          <span class="label">{{ r }}</span>
          <span class="tag-mono">PLANNED</span>
        </li>
      </ul>
      <div class="cta-row">
        <button
          data-test-id="cs-notify-me"
          type="button"
          class="btn primary sm"
          @click="onNotifyMe"
        >
          <KovaIcon name="bell" size="sm" class="ic" />
          Notify me when it's ready
        </button>
        <a
          class="btn sm"
          href="https://kova.design/roadmap"
          target="_blank"
          rel="noreferrer"
        >
          <KovaIcon name="external-link" size="sm" class="ic" />
          Read the roadmap
        </a>
      </div>
    </div>
  </div>
</template>
