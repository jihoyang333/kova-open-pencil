<!-- token-exempt-file: A15 hi-fi shell primitive. Px values match .auth-otp .cell selector (cluster-01-tokens-used.md §3-§5). -->
<script setup lang="ts">
import { ref, watch } from 'vue'

// Plan 01 Task 15 — OtpInput. A15.04 hi-fi reference.
// 6 cells with auto-advance, backspace-clears-previous, paste-fills-all.
// Auto-submit on complete fires emit (per Plan 01 §12.6 founder decision).

interface Props {
  modelValue?: string
  disabled?: boolean
}

const { modelValue = '', disabled = false } = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  complete: [value: string]
}>()

const CELL_COUNT = 6
const digits = ref<string[]>(Array.from({ length: CELL_COUNT }, () => ''))
const cellRefs = ref<HTMLInputElement[]>([])

function syncFromModel(value: string): void {
  const clean = value.replace(/\D/g, '').slice(0, CELL_COUNT)
  for (let i = 0; i < CELL_COUNT; i++) {
    digits.value[i] = clean[i] ?? ''
  }
}

watch(
  () => modelValue,
  (next) => syncFromModel(next),
  { immediate: true }
)

function joined(): string {
  return digits.value.join('')
}

function focusCell(index: number): void {
  const target = cellRefs.value[index]
  if (target) target.focus()
}

function onInput(index: number, event: Event): void {
  const target = event.target as HTMLInputElement
  const next = target.value.replace(/\D/g, '').slice(-1)
  digits.value[index] = next
  emit('update:modelValue', joined())
  if (next && index < CELL_COUNT - 1) focusCell(index + 1)
  if (digits.value.every((d) => d !== '')) emit('complete', joined())
}

function onKeydown(index: number, event: KeyboardEvent): void {
  if (event.key === 'Backspace' && !digits.value[index] && index > 0) {
    focusCell(index - 1)
    event.preventDefault()
    return
  }
  if (event.key === 'ArrowLeft' && index > 0) {
    focusCell(index - 1)
    event.preventDefault()
  }
  if (event.key === 'ArrowRight' && index < CELL_COUNT - 1) {
    focusCell(index + 1)
    event.preventDefault()
  }
}

function onPaste(event: ClipboardEvent): void {
  const text = event.clipboardData?.getData('text') ?? ''
  const clean = text.replace(/\D/g, '').slice(0, CELL_COUNT)
  if (!clean) return
  event.preventDefault()
  for (let i = 0; i < CELL_COUNT; i++) {
    digits.value[i] = clean[i] ?? ''
  }
  emit('update:modelValue', joined())
  const focusTarget = clean.length >= CELL_COUNT ? CELL_COUNT - 1 : clean.length
  focusCell(focusTarget)
  if (digits.value.every((d) => d !== '')) emit('complete', joined())
}
</script>

<template>
  <div class="flex justify-start gap-2" role="group" aria-label="One-time code">
    <input
      v-for="(_, i) in digits"
      :key="i"
      :ref="
        (el) => {
          if (el) cellRefs[i] = el as HTMLInputElement
        }
      "
      type="text"
      inputmode="numeric"
      maxlength="1"
      autocomplete="one-time-code"
      :disabled="disabled"
      :value="digits[i]"
      class="h-[52px] w-[44px] rounded-md border border-line bg-page text-center text-[18px] font-medium text-ink focus:border-ink-2 focus:shadow-[0_0_0_3px_rgba(17,17,17,0.06)] focus:outline-none"
      :aria-label="`Digit ${i + 1} of ${digits.length}`"
      @input="(e) => onInput(i, e)"
      @keydown="(e) => onKeydown(i, e)"
      @paste="onPaste"
    />
  </div>
</template>
