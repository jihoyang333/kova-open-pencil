<script setup lang="ts">
import { ref, watch } from 'vue'
import { PopoverRoot, PopoverTrigger, PopoverPortal, PopoverContent } from 'reka-ui'

import { isValidHexColor } from '@/utils/onboarding-validators'

const props = defineProps<{
  modelValue: string
  label: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const hexInput = ref(props.modelValue)

watch(
  () => props.modelValue,
  (v) => {
    if (v !== hexInput.value) hexInput.value = v
  }
)

function applyColor(): void {
  if (isValidHexColor(hexInput.value)) {
    emit('update:modelValue', hexInput.value)
  }
}

function handleKeydown(e: KeyboardEvent): void {
  if (e.code === 'Enter') {
    applyColor()
  }
}
</script>

<template>
  <div data-test-id="color-picker" class="relative text-center">
    <PopoverRoot>
      <PopoverTrigger as-child>
        <button
          class="size-10 rounded-lg border border-[#555] transition-shadow hover:shadow-md"
          :style="{ backgroundColor: modelValue }"
          :aria-label="`Edit ${label} color: ${modelValue}`"
        />
      </PopoverTrigger>

      <PopoverPortal>
        <PopoverContent
          data-test-id="color-picker-popover"
          class="z-50 rounded-lg border border-[#555] bg-panel p-3 shadow-lg"
          :side-offset="8"
          side="bottom"
        >
          <!-- Native color input for visual picking -->
          <input
            type="color"
            :value="modelValue"
            :aria-label="`Select ${label} color`"
            class="mb-2 h-[80px] w-[120px] cursor-pointer"
            @input="
              (e: Event) => {
                hexInput = (e.target as HTMLInputElement).value
                emit('update:modelValue', hexInput)
              }
            "
          />

          <!-- Hex text input -->
          <input
            v-model="hexInput"
            type="text"
            placeholder="#000000"
            :aria-label="`${label} hex color code`"
            class="w-full rounded border border-[#555] bg-[#383838] px-2 py-1 text-xs text-white"
            @keydown="handleKeydown"
            @blur="applyColor"
          />
        </PopoverContent>
      </PopoverPortal>
    </PopoverRoot>

    <div class="mt-1 text-[10px] text-[#aaa]">{{ label }}</div>
    <div class="mt-0.5 text-[10px] text-[#999]">{{ modelValue }}</div>
  </div>
</template>
