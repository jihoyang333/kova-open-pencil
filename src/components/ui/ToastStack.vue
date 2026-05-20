<script setup lang="ts">
import { useToastStore } from '@/stores/toast'
import KovaToast from './KovaToast.vue'

const store = useToastStore()
</script>

<template>
  <Teleport to="body">
    <div
      class="toast-stack pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col gap-2"
      role="region"
      aria-label="Notifications"
    >
      <TransitionGroup name="toast">
        <KovaToast
          v-for="t in store.visible"
          :key="t.id"
          :toast="t"
          @dismiss="store.dismiss"
        />
      </TransitionGroup>
    </div>
  </Teleport>
</template>
