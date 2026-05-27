<script setup lang="ts">
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuRoot,
  DropdownMenuTrigger,
} from 'reka-ui'
import { computed } from 'vue'

import { brandLogoTintClass } from '@/composables/use-brand-color'
import KovaIcon from '@/components/ui/KovaIcon.vue'
import KovaPill from '@/components/ui/KovaPill.vue'
import { sanitizePlainText } from '@/lib/sanitize-text'

import type { Brand } from '@/types/kova/database'

// W9b Cluster 03 — `.bp-card` (Plan 03 Task 28).
// Active state: full opacity, kebab → Rename / Archive / Delete.
// Archived state: 78% opacity + "Archived" outline pill, kebab → Restore / Delete.

interface Props {
  brand: Brand
  canvasCount?: number
  shopifyConnected?: boolean
  /** True when this card is rendered inside /account/brands archived grid. */
  isArchived?: boolean
}
const props = withDefaults(defineProps<Props>(), { canvasCount: 0, shopifyConnected: false, isArchived: false })

const emit = defineEmits<{
  (e: 'select', brandId: string): void
  (e: 'rename', brand: Brand): void
  (e: 'archive', brand: Brand): void
  (e: 'restore', brand: Brand): void
  (e: 'delete', brand: Brand): void
}>()

const archived = computed(() => props.brand.archived_at != null || props.isArchived)
const safeName = computed(() => sanitizePlainText(props.brand.name))
const safeUrl = computed(() => (props.brand.url ? sanitizePlainText(props.brand.url) : ''))
const logoClass = computed(() => `bp-card__logo ${brandLogoTintClass(props.brand.color)}`)
const initial = computed(() => safeName.value.charAt(0).toUpperCase() || 'B')
const lastEdited = computed(() => {
  const d = new Date(props.brand.updated_at)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
})

const cardClass = computed(() => ['bp-card', archived.value ? 'bp-card--archived' : null].filter(Boolean).join(' '))

function onBodyClick(): void {
  if (archived.value && !props.isArchived) return // No nav from archived rendered in /brands picker
  if (archived.value) return // /account/brands archived row body is no-op per PRD §8.6
  emit('select', props.brand.id)
}
</script>

<template>
  <div :class="cardClass" :data-archived="archived">
    <button
      type="button"
      class="bp-card__body"
      :aria-label="`Open brand ${safeName}`"
      :disabled="archived"
      @click="onBodyClick"
    >
      <div :class="logoClass" aria-hidden="true">{{ initial }}</div>
      <div class="bp-card__meta">
        <div class="bp-card__name">{{ safeName }}</div>
        <div v-if="safeUrl" class="bp-card__url">{{ safeUrl }}</div>
      </div>
      <div class="bp-card__pills">
        <KovaPill v-if="archived" variant="outline">Archived</KovaPill>
        <KovaPill v-else-if="shopifyConnected" variant="ok">Shopify</KovaPill>
        <KovaPill v-else variant="warn">Not connected</KovaPill>
      </div>
      <div class="bp-card__foot">
        <span>{{ canvasCount }} {{ canvasCount === 1 ? 'canvas' : 'canvases' }}</span>
        <span v-if="lastEdited">· {{ lastEdited }}</span>
      </div>
    </button>

    <DropdownMenuRoot>
      <DropdownMenuTrigger as-child>
        <button class="bp-card__kebab" aria-label="Brand actions" type="button">
          <KovaIcon name="more-horizontal" size="sm" aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuPortal>
        <DropdownMenuContent class="kc-menu" :align="'end'" :side-offset="4">
          <template v-if="!archived">
            <DropdownMenuItem class="kc-menu__item" @select="emit('rename', brand)">
              <KovaIcon name="pencil" size="xs" aria-hidden="true" /> Rename
            </DropdownMenuItem>
            <DropdownMenuItem class="kc-menu__item" @select="emit('archive', brand)">
              <KovaIcon name="archive" size="xs" aria-hidden="true" /> Archive
            </DropdownMenuItem>
            <DropdownMenuItem class="kc-menu__item kc-menu__item--danger" @select="emit('delete', brand)">
              <KovaIcon name="trash-2" size="xs" aria-hidden="true" /> Delete brand
            </DropdownMenuItem>
          </template>
          <template v-else>
            <DropdownMenuItem class="kc-menu__item" @select="emit('restore', brand)">
              <KovaIcon name="rotate-ccw" size="xs" aria-hidden="true" /> Restore
            </DropdownMenuItem>
            <DropdownMenuItem class="kc-menu__item kc-menu__item--danger" @select="emit('delete', brand)">
              <KovaIcon name="trash-2" size="xs" aria-hidden="true" /> Delete
            </DropdownMenuItem>
          </template>
        </DropdownMenuContent>
      </DropdownMenuPortal>
    </DropdownMenuRoot>
  </div>
</template>
