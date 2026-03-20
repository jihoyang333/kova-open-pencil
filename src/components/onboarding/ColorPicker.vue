<script setup lang="ts">
import { ref, watch } from 'vue'

import { isValidHexColor } from '@/utils/onboarding-validators'

const props = defineProps<{
  modelValue: string
  label: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const open = ref(false)
const hexInput = ref(props.modelValue)

watch(
  () => props.modelValue,
  (v) => {
    hexInput.value = v
  }
)

function applyColor(): void {
  if (isValidHexColor(hexInput.value)) {
    emit('update:modelValue', hexInput.value)
  }
  open.value = false
}

function handleKeydown(e: KeyboardEvent): void {
  if (e.code === 'Enter') {
    applyColor()
  }
  if (e.code === 'Escape') {
    hexInput.value = props.modelValue
    open.value = false
  }
}
</script>

<template>
  <div data-test-id="color-picker" class="relative text-center">
    <!-- Swatch -->
    <button
      class="size-10 rounded-lg border border-gray-200 transition-shadow hover:shadow-md"
      :style="{ backgroundColor: modelValue }"
      @click="open = !open"
    />
    <div class="mt-1 text-[10px] text-gray-500">{{ label }}</div>
    <div class="mt-0.5 text-[10px] text-gray-400">{{ modelValue }}</div>

    <!-- Popover -->
    <div
      v-if="open"
      class="absolute top-full -left-4 z-10 mt-2 rounded-lg border border-gray-200 bg-white p-3 shadow-lg"
    >
      <!-- Native color input for visual picking -->
      <input
        type="color"
        :value="modelValue"
        class="mb-2 size-full cursor-pointer"
        style="width: 120px; height: 80px"
        @input="(e: Event) => { hexInput = (e.target as HTMLInputElement).value; emit('update:modelValue', hexInput) }"
      />

      <!-- Hex text input -->
      <input
        v-model="hexInput"
        type="text"
        placeholder="#000000"
        class="w-full rounded border border-gray-300 px-2 py-1 text-xs"
        @keydown="handleKeydown"
        @blur="applyColor"
      />
    </div>
  </div>
</template>
