<script setup lang="ts">
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuRoot,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from 'reka-ui'

import KovaIcon from '@/components/ui/KovaIcon.vue'
import { useBrandsStore } from '@/stores/brands'

import type { Brand } from '@/types/kova/database'

// PRD 02 §3.2 + Plan T19 — A2.a brand-switcher dropdown. Cluster 03 owns the
// full A2/A3 modal experience; here we only wire the trigger + popover.

defineProps<{ currentBrand: Brand }>()
defineEmits<{
  select: [brandId: string]
  'new-brand': []
  'manage-brands': []
}>()

const brands = useBrandsStore()
</script>

<template>
  <DropdownMenuRoot>
    <DropdownMenuTrigger as-child>
      <button data-test-id="brand-switch" class="brand-switch">
        <div class="logo">{{ currentBrand.name.charAt(0).toUpperCase() }}</div>
        <div class="name">{{ currentBrand.name }}</div>
        <span class="caret">
          <KovaIcon name="chevrons-up-down" size="sm" />
        </span>
      </button>
    </DropdownMenuTrigger>
    <DropdownMenuPortal>
      <DropdownMenuContent class="dlg" align="start" :side-offset="6">
        <DropdownMenuItem
          v-for="b in brands.sortedActiveBrands"
          :key="b.id"
          :data-test-id="`brand-option-${b.id}`"
          @click="$emit('select', b.id)"
        >
          <div class="logo">{{ b.name.charAt(0).toUpperCase() }}</div>
          <span>{{ b.name }}</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          data-test-id="brand-manage"
          @click="$emit('manage-brands')"
        >
          <KovaIcon name="layers" size="sm" />
          <span>Manage brands</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          data-test-id="brand-new"
          @click="$emit('new-brand')"
        >
          <KovaIcon name="plus" size="sm" />
          <span>New brand</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenuPortal>
  </DropdownMenuRoot>
</template>
