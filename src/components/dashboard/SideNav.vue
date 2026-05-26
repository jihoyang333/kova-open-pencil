<script setup lang="ts">
import { useRoute } from 'vue-router'

import KovaIcon from '@/components/ui/KovaIcon.vue'

// PRD 02 §3.2 + Plan T20 — sidebar nav with 3 sections + SOON pills for
// Phase-2 destinations (A-LOW5: 7 SOON-pilled routes).

interface NavItem {
  route: string
  label: string
  icon: string
  count?: number
  soon?: boolean
}
interface NavSection {
  heading: string
  items: NavItem[]
}

const SECTIONS: NavSection[] = [
  {
    heading: 'Home',
    items: [
      { route: 'brand-recents', label: 'Recents', icon: 'clock-4' },
      { route: 'brand-calendar', label: 'Calendar', icon: 'calendar-days', soon: true },
    ],
  },
  {
    heading: 'Library',
    items: [
      { route: 'brand-swipes', label: 'Swipes', icon: 'bookmark', soon: true },
      { route: 'brand-templates', label: 'Templates', icon: 'layout-template', soon: true },
      { route: 'brand-products', label: 'Products', icon: 'package' },
    ],
  },
  {
    heading: 'Brand',
    items: [
      { route: 'brand-personalization', label: 'Personalization', icon: 'sparkles' },
      { route: 'brand-kb', label: 'Knowledge base', icon: 'book-open' },
      { route: 'brand-memories', label: 'Memories', icon: 'brain' },
    ],
  },
]

const route = useRoute()
defineEmits<{ nav: [routeName: string] }>()
</script>

<template>
  <nav class="nav">
    <template v-for="sec in SECTIONS" :key="sec.heading">
      <div class="section">{{ sec.heading }}</div>
      <button
        v-for="item in sec.items"
        :key="item.route"
        :data-test-id="`nav-${item.route}`"
        class="item"
        :class="{ active: route.name === item.route }"
        @click="$emit('nav', item.route)"
      >
        <KovaIcon :name="item.icon" size="sm" class="ic" />
        <span>{{ item.label }}</span>
        <span v-if="item.soon" class="pill soon">SOON</span>
        <span v-else-if="item.count !== undefined" class="count">{{ item.count }}</span>
      </button>
    </template>
  </nav>
</template>
