<script setup lang="ts">
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuRoot,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from 'reka-ui'
import { computed } from 'vue'

import KovaIcon from '@/components/ui/KovaIcon.vue'

/**
 * Dropdown menu wrapper — Reka DropdownMenu. Canonical `.menu` from
 * kova-hifi.css 08 Top Chrome lift.
 *
 * Items pass through default slot (use `<KovaMenuItem>` for individual rows).
 * For simple data-driven menus, pass `items` prop.
 */

export interface KovaMenuItem {
  id: string
  label: string
  /** Keyboard shortcut hint (right side). */
  shortcut?: string
  icon?: string
  disabled?: boolean
  destructive?: boolean
  /** Visual separator before this item. */
  separatorBefore?: boolean
  onSelect?: () => void
}

export interface KovaMenuProps {
  items?: KovaMenuItem[]
  /** min-width preset — default | md (260) | lg (280). */
  width?: 'default' | 'md' | 'lg'
  open?: boolean
  side?: 'top' | 'right' | 'bottom' | 'left'
  align?: 'start' | 'center' | 'end'
  sideOffset?: number
}

const props = withDefaults(defineProps<KovaMenuProps>(), {
  width: 'default',
  side: 'bottom',
  align: 'start',
  sideOffset: 6,
  items: () => [],
})

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'select', item: KovaMenuItem): void
}>()

const klass = computed(() => {
  const c = ['menu']
  if (props.width === 'md') c.push('w-260')
  else if (props.width === 'lg') c.push('w-280')
  return c.join(' ')
})

function itemClass(it: KovaMenuItem): string {
  const c = ['item']
  if (it.disabled) c.push('disabled')
  if (it.destructive) c.push('destructive')
  return c.join(' ')
}

function onSelect(it: KovaMenuItem): void {
  if (it.disabled) return
  it.onSelect?.()
  emit('select', it)
}
</script>

<template>
  <DropdownMenuRoot :open="props.open" @update:open="(v) => emit('update:open', v)">
    <DropdownMenuTrigger as-child>
      <slot name="trigger" />
    </DropdownMenuTrigger>
    <DropdownMenuPortal>
      <DropdownMenuContent
        :class="klass"
        :side="props.side"
        :align="props.align"
        :side-offset="props.sideOffset"
      >
        <slot>
          <template v-for="it in items" :key="it.id">
            <DropdownMenuSeparator v-if="it.separatorBefore" class="sep" />
            <DropdownMenuItem
              :class="itemClass(it)"
              :disabled="it.disabled"
              @select="onSelect(it)"
            >
              <KovaIcon v-if="it.icon" :name="it.icon" size="xs" aria-hidden="true" />
              <span class="lbl">{{ it.label }}</span>
              <span v-if="it.shortcut" class="kbd-row">{{ it.shortcut }}</span>
            </DropdownMenuItem>
          </template>
        </slot>
      </DropdownMenuContent>
    </DropdownMenuPortal>
  </DropdownMenuRoot>
</template>
