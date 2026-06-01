<script setup lang="ts">
// Single effect row in the effects list (PRD 07b §11.15). Shadow rows show "X Y Blur";
// blur rows show the blur radius.
import { computed } from 'vue'
import type { Effect } from '@open-pencil/core'
import KovaIcon from '@/components/ui/KovaIcon.vue'

const { effect, isSelected } = defineProps<{
  effect: Effect
  index: number
  isSelected: boolean
}>()
const emit = defineEmits<{ select: []; 'toggle-visibility': []; delete: [] }>()

const TYPE_LABELS: Record<Effect['type'], string> = {
  DROP_SHADOW: 'Drop shadow',
  INNER_SHADOW: 'Inner shadow',
  LAYER_BLUR: 'Layer blur',
  BACKGROUND_BLUR: 'Background blur',
  FOREGROUND_BLUR: 'Foreground blur'
}

const isShadow = computed(
  () => effect.type === 'DROP_SHADOW' || effect.type === 'INNER_SHADOW'
)

const meta = computed(() =>
  isShadow.value ? `${effect.offset.x} ${effect.offset.y} ${effect.radius}` : `${effect.radius}`
)
</script>

<template>
  <div
    class="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-xs hover:bg-fill-2"
    :class="isSelected ? 'bg-fill-2 ring-1 ring-accent' : ''"
    @click="emit('select')"
  >
    <KovaIcon name="grip-vertical" size="xs" class="cursor-grab text-ink-3" />
    <span class="flex-1 text-ink">{{ TYPE_LABELS[effect.type] }}</span>
    <span class="font-mono text-ink-3">{{ meta }}</span>
    <button
      type="button"
      data-test="visibility-toggle"
      class="cursor-pointer text-ink-3 hover:text-ink"
      :title="effect.visible ? 'Hide effect' : 'Show effect'"
      @click.stop="emit('toggle-visibility')"
    >
      <KovaIcon :name="effect.visible ? 'eye' : 'eye-off'" size="xs" />
    </button>
    <button
      type="button"
      data-test="delete-effect"
      class="cursor-pointer text-ink-3 hover:text-ink"
      title="Remove effect"
      @click.stop="emit('delete')"
    >
      ×
    </button>
  </div>
</template>
