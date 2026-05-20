<script setup lang="ts">
import { useToastStore } from '@/stores/toast'

import KovaToast from '@/components/ui/KovaToast.vue'

/**
 * Global toast container — mounted once in App.vue shell.
 * Position fixed bottom-right per PRD 11 §3.1 (z-toast above modal).
 */

const store = useToastStore()
</script>

<template>
  <div class="toast-stack" aria-live="polite" aria-atomic="false">
    <KovaToast
      v-for="t in store.visible"
      :key="t.id"
      :toast="t"
      @dismiss="(id) => store.dismiss(id)"
    />
  </div>
</template>
