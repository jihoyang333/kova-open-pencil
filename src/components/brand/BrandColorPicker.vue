<script setup lang="ts">
import { ref, watch } from 'vue'
import { PopoverRoot, PopoverTrigger, PopoverPortal, PopoverContent } from 'reka-ui'

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
    hexInput.value = v
  }
)

function applyHexInput(): void {
  const cleaned = hexInput.value.trim()
  if (/^#[0-9a-fA-F]{6}$/.test(cleaned)) {
    emit('update:modelValue', cleaned)
  } else {
    hexInput.value = props.modelValue
  }
}

function handleNativeChange(e: Event): void {
  const value = (e.target as HTMLInputElement).value
  hexInput.value = value
  emit('update:modelValue', value)
}
</script>

<template>
  <div class="flex items-center gap-3">
    <label class="text-sm font-medium text-gray-700">{{ label }}</label>
    <PopoverRoot>
      <PopoverTrigger as-child>
        <button
          :data-test-id="`brand-color-${label.toLowerCase()}`"
          class="size-8 rounded-lg border border-gray-300 transition-shadow hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
          :style="{ backgroundColor: modelValue }"
          :aria-label="`Pick ${label} color`"
        />
      </PopoverTrigger>
      <PopoverPortal>
        <PopoverContent
          class="z-50 rounded-lg border border-gray-200 bg-white p-3 shadow-lg"
          :side-offset="8"
        >
          <input
            type="color"
            :value="modelValue"
            class="mb-2 h-20 w-30 cursor-pointer"
            @input="handleNativeChange"
          />
          <input
            v-model="hexInput"
            data-test-id="brand-color-hex-input"
            type="text"
            placeholder="#000000"
            maxlength="7"
            class="w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-900"
            @keydown.enter="applyHexInput"
            @blur="applyHexInput"
          />
        </PopoverContent>
      </PopoverPortal>
    </PopoverRoot>
  </div>
</template>
