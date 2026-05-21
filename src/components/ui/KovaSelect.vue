<script setup lang="ts">
import {
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectItemIndicator,
  SelectItemText,
  SelectPortal,
  SelectRoot,
  SelectTrigger,
  SelectValue,
  SelectViewport,
} from 'reka-ui'
import { computed } from 'vue'

import KovaIcon from '@/components/ui/KovaIcon.vue'

/**
 * Select wrapper — Reka Select.
 * Trigger styled to match canonical `.input` (modal-form contexts).
 * Content panel uses `.popover` chrome (consistent with dropdown overlays).
 */

export interface KovaSelectOption {
  value: string
  label: string
  disabled?: boolean
}

export interface KovaSelectProps {
  modelValue: string
  options: KovaSelectOption[]
  placeholder?: string
  disabled?: boolean
  ariaLabel?: string
}

const props = defineProps<KovaSelectProps>()
const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const triggerStyle = computed(() => ({
  background: 'var(--page)',
  border: '1px solid var(--line)',
  borderRadius: 'var(--r-lg)',
  padding: '0 var(--popover-row-pad-x)',
  height: 'var(--h-control)',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 'var(--popover-row-gap)',
  color: 'var(--ink)',
  fontSize: 'var(--t-input-fz)',
  cursor: props.disabled ? 'not-allowed' : 'pointer',
  opacity: props.disabled ? '0.5' : '1',
  minWidth: 'var(--select-min-w)',
  width: '100%',
}))

// Items consume canonical `.popover .pop-row` chrome (hover via
// :hover + Reka keyboard via [data-highlighted]). No inline style.
</script>

<template>
  <SelectRoot
    :model-value="modelValue"
    :disabled="disabled"
    @update:model-value="(v) => emit('update:modelValue', String(v))"
  >
    <SelectTrigger :aria-label="ariaLabel" :style="triggerStyle">
      <SelectValue :placeholder="placeholder ?? ''" />
      <KovaIcon name="chevron-down" size="xs" aria-hidden="true" :style="{ marginLeft: 'auto', color: 'var(--ink-3)' }" />
    </SelectTrigger>
    <SelectPortal>
      <SelectContent class="popover" :style="{ padding: 'var(--popover-pad)' }">
        <SelectViewport>
          <SelectGroup>
            <SelectItem
              v-for="opt in options"
              :key="opt.value"
              :value="opt.value"
              :disabled="opt.disabled"
              class="pop-row"
            >
              <SelectItemIndicator>
                <KovaIcon name="check" size="xs" class="ck" aria-hidden="true" />
              </SelectItemIndicator>
              <SelectItemText class="nm">{{ opt.label }}</SelectItemText>
            </SelectItem>
          </SelectGroup>
        </SelectViewport>
      </SelectContent>
    </SelectPortal>
  </SelectRoot>
</template>
