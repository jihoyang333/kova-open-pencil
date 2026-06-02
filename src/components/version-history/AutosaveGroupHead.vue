<script setup lang="ts">
import { computed } from 'vue'

import KovaIcon from '@/components/ui/KovaIcon.vue'

/**
 * Collapsible "N autosave versions" group header (hi-fi 17.1 / 17.2). The dot
 * column carries a chevron that flips with the collapsed state; clicking the
 * row toggles the group.
 */

const props = defineProps<{ count: number; collapsed: boolean }>()
defineEmits<{ toggle: [] }>()

const label = computed(() => `${props.count} autosave version${props.count === 1 ? '' : 's'}`)
const chevron = computed(() => (props.collapsed ? 'chevron-right' : 'chevron-down'))
</script>

<template>
  <div class="vh-group-head" @click="$emit('toggle')">
    <div class="dot">
      <div class="chev"><KovaIcon :name="chevron" size="xs" aria-hidden="true" /></div>
    </div>
    <div class="lbl">{{ label }}</div>
  </div>
</template>
