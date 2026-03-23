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
const editInputClass =
  'w-full rounded-md border border-accent bg-[#383838] px-3 py-2 text-sm text-white ring-1 ring-accent outline-none'

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

function handleEditKeydown(e: KeyboardEvent): void {
  if (e.code === 'Escape') {
    stopEditing()
  }
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
        :aria-label="placeholder"
        :class="editInputClass"
        rows="3"
        @input="handleInput"
        @blur="stopEditing"
        @keydown.enter.exact="stopEditing"
        @keydown="handleEditKeydown"
      />
      <input
        v-else
        ref="inputRef"
        :value="modelValue"
        type="text"
        :aria-label="placeholder"
        :class="editInputClass"
        @input="handleInput"
        @blur="stopEditing"
        @keydown.enter="stopEditing"
        @keydown="handleEditKeydown"
      />
    </template>

    <!-- Display mode -->
    <div
      v-else
      role="button"
      tabindex="0"
      class="cursor-pointer rounded-md px-3 py-2 text-sm transition-colors hover:bg-[#444] focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
      :class="[displayClass, isEmpty ? 'text-[#888] italic' : 'text-white']"
      @click="startEditing"
      @keydown.enter="startEditing"
      @keydown.space.prevent="startEditing"
    >
      {{ displayText }}
    </div>
  </div>
</template>
