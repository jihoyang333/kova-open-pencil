<script setup lang="ts">
import KovaIcon from '@/components/ui/KovaIcon.vue'

/**
 * Filter dropdown (hi-fi 17.7), reduced to the autosave toggle per founder
 * direction (the All / Only-yours visibility filter is out of MVP scope — the
 * store carries a single `showAutosaves` flag). Reka `.menu` shell.
 */

const props = defineProps<{ showAutosaves: boolean }>()
const emit = defineEmits<{ 'update:showAutosaves': [value: boolean] }>()
</script>

<template>
  <div class="menu">
    <div
      class="item checkable"
      :class="{ checked: props.showAutosaves }"
      role="menuitemcheckbox"
      :aria-checked="props.showAutosaves"
      @click="emit('update:showAutosaves', !props.showAutosaves)"
    >
      <span class="check"><KovaIcon name="check" class="ic" aria-hidden="true" /></span>
      <span class="lbl">Show autosave versions</span>
    </div>
  </div>
</template>
