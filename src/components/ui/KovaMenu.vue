<script setup lang="ts">
// Cluster 11 Plan Task 4.3a — KovaMenu.
// Reka DropdownMenu wrapper. Items / sections / separators driven by the
// MenuEntry type so consumer clusters declare menus as data, not template.

import {
  DropdownMenuRoot,
  DropdownMenuTrigger,
  DropdownMenuPortal,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from 'reka-ui'
import {
  type MenuEntry,
  type MenuItem,
  isMenuItem,
  isMenuSeparator,
  isMenuSection,
} from '@/types/menu'
import KovaIcon from './KovaIcon.vue'

interface Props {
  items: MenuEntry[]
  align?: 'start' | 'end'
  width?: number
}

withDefaults(defineProps<Props>(), { align: 'start', width: 240 })
const emit = defineEmits<{ select: [item: MenuItem] }>()

function onSelect(item: MenuItem) {
  emit('select', item)
  item.handler()
}
</script>

<template>
  <DropdownMenuRoot>
    <DropdownMenuTrigger as-child>
      <slot name="trigger" />
    </DropdownMenuTrigger>
    <DropdownMenuPortal>
      <DropdownMenuContent
        class="menu z-40 rounded-md border border-line bg-panel py-1 text-sm text-ink shadow-xl"
        :align="align"
        :style="{ minWidth: `${width}px` }"
      >
        <template v-for="(entry, i) in items" :key="i">
          <DropdownMenuLabel
            v-if="isMenuSection(entry)"
            class="px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-ink-3"
          >
            {{ entry.label }}
          </DropdownMenuLabel>
          <DropdownMenuSeparator
            v-else-if="isMenuSeparator(entry)"
            class="my-1 h-px bg-line"
          />
          <DropdownMenuItem
            v-else-if="isMenuItem(entry)"
            :disabled="entry.disabled"
            :data-destructive="entry.destructive ? 'true' : undefined"
            class="mx-1 flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 hover:bg-line-2 data-[destructive=true]:text-red-400 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50"
            @select="onSelect(entry)"
          >
            <KovaIcon v-if="entry.icon" :name="entry.icon" />
            <span class="lbl flex-1 truncate">{{ entry.label }}</span>
            <kbd
              v-if="entry.shortcut"
              class="text-xs text-ink-3"
            >{{ entry.shortcut }}</kbd>
          </DropdownMenuItem>
        </template>
      </DropdownMenuContent>
    </DropdownMenuPortal>
  </DropdownMenuRoot>
</template>
