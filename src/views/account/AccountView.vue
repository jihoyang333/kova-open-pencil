<script setup lang="ts">
// PRD 04 §6.4.3 — AccountView page shell.
// Wraps sidebar + scrollable content; "Back to dashboard" top chrome.

import { useRouter } from 'vue-router'

import KovaIcon from '@/components/ui/KovaIcon.vue'
import AccountSidebar from '@/components/account/AccountSidebar.vue'
import SectionResolver from './sections/SectionResolver.vue'

const router = useRouter()

function goDashboard(): void {
  void router.push({ name: 'dashboard' }).catch(() => {
    void router.push('/')
  })
}
</script>

<template>
  <div class="acc-shell">
    <header class="acc-topbar">
      <button type="button" class="btn ghost sm" @click="goDashboard">
        <KovaIcon name="arrow-left" size="sm" />
        Back to dashboard
      </button>
    </header>
    <div class="acc-frame">
      <aside class="acc-sidebar-wrap">
        <AccountSidebar />
      </aside>
      <main class="acc-content" id="acc-content">
        <SectionResolver />
      </main>
    </div>
  </div>
</template>
