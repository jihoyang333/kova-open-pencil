<script setup lang="ts">
import KovaIcon from '@/components/ui/KovaIcon.vue'

// PRD 02 §3.2 + Plan T22 — dashboard topbar (52px) with breadcrumb +
// "New canvas" button + slot for surface-specific actions.

defineProps<{ brandName: string; currentPage: string }>()
defineEmits<{ 'new-canvas': [] }>()
</script>

<template>
  <header data-test-id="dashboard-topbar" class="topbar">
    <div class="breadcrumb">
      <span>{{ brandName }}</span>
      <span class="sep">
        <KovaIcon name="chevron-right" size="sm" />
      </span>
      <b>{{ currentPage }}</b>
    </div>
    <div class="actions">
      <slot name="actions" />
      <button
        data-test-id="topbar-new-canvas"
        class="btn sm"
        @click="$emit('new-canvas')"
      >
        <KovaIcon name="folder-plus" size="sm" class="ic" />
        New canvas
      </button>
    </div>
  </header>
</template>
