<script setup lang="ts">
// PRD 02 §3.4 + Plan T30 — B7.1 dashboard skeleton.
// Mirrors the dashboard chrome byte-by-byte so the populated render lands in
// the same grid cells. Shimmer animation registered globally in app.css via
// @keyframes shimmer + .animate-shimmer (uses --motion-shimmer token).

const SHIMMER_CLASS =
  'bg-[linear-gradient(90deg,var(--rail)_0%,var(--fill)_50%,var(--rail)_100%)] [background-size:200%_100%] animate-shimmer rounded'

// Expose for template via destructuring constants — keeps template terse.
const sidebarRows = 6
const cardCount = 8
</script>

<template>
  <div data-test-id="dashboard-skeleton" class="app">
    <aside class="sidebar">
      <div :class="SHIMMER_CLASS" class="h-10 m-3" />
      <div
        v-for="i in sidebarRows"
        :key="i"
        :class="SHIMMER_CLASS"
        class="h-6 mx-3 my-1"
      />
    </aside>
    <main class="main">
      <header class="topbar">
        <div :class="SHIMMER_CLASS" class="h-5 w-32" />
      </header>
      <div class="dash-content">
        <div :class="SHIMMER_CLASS" class="h-7 w-64 mx-auto mt-6" />
        <div :class="SHIMMER_CLASS" class="h-24 w-full max-w-[760px] mx-auto rounded-2xl mt-6" />
        <div class="file-grid mt-10">
          <div
            v-for="i in cardCount"
            :key="i"
            data-test-id="skeleton-card"
            class="skeleton-card"
          >
            <div :class="SHIMMER_CLASS" class="aspect-[4/3]" />
            <div :class="SHIMMER_CLASS" class="h-3 w-3/4 mt-3" />
            <div :class="SHIMMER_CLASS" class="h-3 w-1/2 mt-1" />
          </div>
        </div>
      </div>
    </main>
  </div>
</template>
