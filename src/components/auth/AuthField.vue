<!-- token-exempt-file: A15 hi-fi shell primitive. Px values match .auth-field selector (cluster-01-tokens-used.md §3-§5). -->
<script setup lang="ts">
// Plan 01 Task 15 — AuthField. Two-way v-model. Emits submit on Enter so
// parent views can keep their handler at the form level.

interface Props {
  label: string
  modelValue: string
  type?: 'email' | 'text' | 'password'
  error?: string
  placeholder?: string
  autocomplete?: string
  id?: string
  helpLink?: { label: string; to: string }
}

const {
  label,
  modelValue,
  type = 'text',
  error,
  placeholder,
  autocomplete,
  id,
  helpLink
} = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  submit: []
}>()

function onInput(event: Event): void {
  const target = event.target as HTMLInputElement
  emit('update:modelValue', target.value)
}

function onKeydown(event: KeyboardEvent): void {
  // Use e.code per CLAUDE.md keyboard-handler convention.
  if (event.code === 'Enter' || event.code === 'NumpadEnter') emit('submit')
}

const inputId = id ?? `auth-field-${label.toLowerCase().replace(/\s+/g, '-')}`
const errorId = `${inputId}-error`
</script>

<template>
  <div class="flex flex-col gap-[6px]">
    <label
      :for="inputId"
      class="flex items-center justify-between text-[11.5px] font-medium text-ink-2"
    >
      <span>{{ label }}</span>
      <RouterLink
        v-if="helpLink"
        :to="helpLink.to"
        class="text-[11.5px] font-medium text-ink-2 hover:text-ink hover:underline"
      >
        {{ helpLink.label }}
      </RouterLink>
    </label>
    <input
      :id="inputId"
      :type="type"
      :value="modelValue"
      :placeholder="placeholder"
      :autocomplete="autocomplete"
      :aria-invalid="!!error"
      :aria-describedby="error ? errorId : undefined"
      class="w-full rounded-md border border-line bg-page px-3 py-[9px] text-[14px] text-ink placeholder:text-ink-3 focus:border-ink-2 focus:shadow-[0_0_0_3px_rgba(17,17,17,0.06)] focus:outline-none"
      @input="onInput"
      @keydown="onKeydown"
    />
    <p v-if="error" :id="errorId" class="text-[11.5px] text-warn">{{ error }}</p>
  </div>
</template>
