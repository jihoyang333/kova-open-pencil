<script setup lang="ts">
import { ref, nextTick, computed } from 'vue'

const props = withDefaults(
  defineProps<{
    modelValue: string
    tag?: 'input' | 'textarea'
    placeholder?: string
    displayClass?: string
  }>(),
  {
    tag: 'input',
    placeholder: 'Click to edit',
    displayClass: ''
  }
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const editing = ref(false)
const inputRef = ref<HTMLInputElement | HTMLTextAreaElement | null>(null)

const displayText = computed(() => props.modelValue || props.placeholder)
const isEmpty = computed(() => !props.modelValue)

async function startEditing(): Promise<void> {
  editing.value = true
  await nextTick()
  inputRef.value?.focus()
  if (inputRef.value instanceof HTMLInputElement) {
    inputRef.value.select()
  }
}

function stopEditing(): void {
  editing.value = false
}

function handleInput(e: Event): void {
  const target = e.target as HTMLInputElement | HTMLTextAreaElement
  emit('update:modelValue', target.value)
}
</script>

<template>
  <div data-test-id="click-to-edit">
    <!-- Edit mode -->
    <template v-if="editing">
      <textarea
        v-if="tag === 'textarea'"
        ref="inputRef"
        :value="modelValue"
        class="w-full rounded-md border border-blue-300 bg-white px-3 py-2 text-sm text-gray-900 ring-1 ring-blue-300 outline-none"
        rows="3"
        @input="handleInput"
        @blur="stopEditing"
        @keydown.enter.exact="stopEditing"
      />
      <input
        v-else
        ref="inputRef"
        :value="modelValue"
        type="text"
        class="w-full rounded-md border border-blue-300 bg-white px-3 py-2 text-sm text-gray-900 ring-1 ring-blue-300 outline-none"
        @input="handleInput"
        @blur="stopEditing"
        @keydown.enter="stopEditing"
      />
    </template>

    <!-- Display mode -->
    <div
      v-else
      class="cursor-pointer rounded-md px-3 py-2 text-sm transition-colors hover:bg-gray-100"
      :class="[displayClass, isEmpty ? 'text-gray-400 italic' : 'text-gray-900']"
      @click="startEditing"
    >
      {{ displayText }}
    </div>
  </div>
</template>
