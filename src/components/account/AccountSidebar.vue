<script setup lang="ts">
// PRD 04 §6.4.2 — AccountSidebar (6 items per B12 reversal 2026-05-17).
import { computed } from 'vue'

import KovaIcon from '@/components/ui/KovaIcon.vue'
import { useAccountSection, type AccountSection } from '@/composables/account/use-account-section'

interface NavItem {
  section: AccountSection
  label: string
  icon: string
  separatorBefore?: boolean
}

const NAV_ITEMS: readonly NavItem[] = [
  { section: 'profile', label: 'Profile', icon: 'user' },
  { section: 'brands', label: 'Brands', icon: 'tag' },
  { section: 'billing', label: 'Plan & billing', icon: 'credit-card' },
  { section: 'brand-kit', label: 'Brand Kit', icon: 'palette' },
  { section: 'integrations', label: 'Integrations', icon: 'plug' },
  { section: 'danger-zone', label: 'Danger zone', icon: 'trash-2', separatorBefore: true },
] as const

const { activeSection, goto } = useAccountSection()

const items = computed(() => NAV_ITEMS.map(it => ({
  ...it,
  isActive: activeSection.value === it.section,
})))
</script>

<template>
  <nav class="acc-rail" aria-label="Account sections">
    <template v-for="item in items" :key="item.section">
      <div v-if="item.separatorBefore" class="acc-rail-sep" />
      <button
        type="button"
        class="acc-rail-item"
        :class="{ 'is-active': item.isActive, 'is-danger': item.section === 'danger-zone' }"
        :aria-current="item.isActive ? 'page' : undefined"
        @click="goto(item.section)"
      >
        <KovaIcon :name="item.icon" size="sm" class="acc-rail-ic" />
        <span class="acc-rail-lbl">{{ item.label }}</span>
      </button>
    </template>
  </nav>
</template>
