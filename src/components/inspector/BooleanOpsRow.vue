<script setup lang="ts">
// Boolean-operation row (PRD 07b §11.9 / Q3 #14).
//
// Adapted per handoff R2 + exec-doc #5: there is no `figma.booleanOperation(op)`
// singleton. The real op is FigmaAPI.booleanOperation(op, ids) (needs ≥2 nodes), reached
// from the app via makeFigmaFromStore. We define a 07b-local UI enum (BooleanOpKind),
// NOT a core type. Shortcuts are ⌥⇧U/S/I/E (W5a fix).
import { computed } from 'vue'
import { useEditorStore } from '@/stores/editor'
import { makeFigmaFromStore } from '@/automation/figma-factory'

type BooleanOpKind = 'UNION' | 'SUBTRACT' | 'INTERSECT' | 'EXCLUDE'

const OPS: ReadonlyArray<{ op: BooleanOpKind; label: string; shortcut: string }> = [
  { op: 'UNION', label: 'Union', shortcut: '⌥⇧U' },
  { op: 'SUBTRACT', label: 'Subtract', shortcut: '⌥⇧S' },
  { op: 'INTERSECT', label: 'Intersect', shortcut: '⌥⇧I' },
  { op: 'EXCLUDE', label: 'Exclude', shortcut: '⌥⇧E' }
]

const editor = useEditorStore()
const canApply = computed(() => editor.selectedNodes.value.length >= 2)

function applyOp(op: BooleanOpKind): void {
  if (!canApply.value) return
  const ids = editor.selectedNodes.value.map((n) => n.id)
  makeFigmaFromStore(editor).booleanOperation(op, ids)
  editor.requestRepaint()
}
</script>

<template>
  <section class="flex flex-col gap-2 px-3 py-2">
    <h6 class="text-xs font-medium text-ink-3">Boolean</h6>
    <div class="flex items-center gap-0.5">
      <button
        v-for="entry in OPS"
        :key="entry.op"
        type="button"
        :title="`${entry.label} ${entry.shortcut}`"
        :disabled="!canApply"
        class="flex flex-1 cursor-pointer items-center justify-center rounded border px-2 py-1 text-xs"
        :class="
          canApply
            ? 'border-border bg-input text-muted hover:bg-hover hover:text-surface'
            : 'cursor-not-allowed border-border bg-input text-ink-4 opacity-60'
        "
        @click="applyOp(entry.op)"
      >
        {{ entry.label }}
      </button>
    </div>
  </section>
</template>
