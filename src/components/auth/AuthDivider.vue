<!-- token-exempt-file: A15 hi-fi shell primitive. Px values match .auth-or selector (cluster-01-tokens-used.md §3-§5). -->
<script setup lang="ts">
// Plan 01 Task 14 derivative — Notion-pattern "or" divider between Google
// button and email field. A15 hi-fi .auth-or reference.

interface Props {
  label?: string
}

const { label = 'or' } = defineProps<Props>()
</script>

<template>
  <div
    class="flex items-center gap-3 text-[10px] text-ink-3 before:h-px before:flex-1 before:bg-line-2 before:content-[''] after:h-px after:flex-1 after:bg-line-2 after:content-['']"
  >
    <span>{{ label }}</span>
  </div>
</template>
