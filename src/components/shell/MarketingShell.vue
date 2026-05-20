<script setup lang="ts">
// Cluster 11 Plan Task 8.1 — MarketingShell.
// Light-theme container for /privacy + /terms + future marketing pages.
// Route registers `meta: { theme: 'light' }` so useTheme swaps the data-theme
// attribute on <html>.

defineProps<{ title: string }>()
</script>

<template>
  <div class="marketing-shell min-h-screen bg-white text-black">
    <header
      class="mkt-head flex items-center justify-between border-b border-gray-200 px-6 py-4"
    >
      <a href="/" class="brand text-base font-semibold">Kova</a>
      <nav class="flex items-center gap-4 text-sm text-gray-600">
        <a href="/privacy" class="hover:text-black">Privacy</a>
        <a href="/terms" class="hover:text-black">Terms</a>
        <a href="mailto:support@kova.app" class="hover:text-black">Support</a>
      </nav>
    </header>
    <main class="mkt-body mx-auto max-w-2xl px-6 py-12">
      <h1 class="mb-6 text-3xl font-semibold">{{ title }}</h1>
      <slot />
    </main>
    <footer
      class="mkt-foot mx-auto max-w-2xl px-6 py-8 text-xs text-gray-500"
    >
      © 2026 Kova
    </footer>
  </div>
</template>
