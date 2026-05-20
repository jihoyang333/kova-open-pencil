<script setup lang="ts">
// Cluster 11 Plan Task 8.2 — EmailShell.
//
// Transactional-email layout. Rendered server-side via @vue/server-renderer +
// CSS-inlined by juice (both deferred to pre-launch per founder lock #19 —
// see src/composables/use-email-shell.ts).
//
// The v-pre footer guards Resend's `{{email}}` + `{{settings_url}}`
// placeholders (C-MED-11.4). Without v-pre, Vue would parse them as
// expressions at SSR time and ship empty strings to Resend.

import { computed } from 'vue'

interface Props {
  title: string
  preheader?: string
  wordmarkUrl?: string
}

const props = defineProps<Props>()

// C-MED-11.3 — never hardcode prod host. Fallback keeps prod builds working
// without env wiring; preview / dev / test override via VITE_PUBLIC_APP_URL.
// Uses import.meta.env (Vite build-time injection, browser-safe) instead of
// process.env so the SFC can be statically imported from src/ without
// crashing the browser bundle if the bundler ever hoists it client-side.
const PUBLIC_APP_URL_FALLBACK = 'https://kova.app'
const PUBLIC_APP_URL =
  (import.meta.env['VITE_PUBLIC_APP_URL'] as string | undefined) ??
  PUBLIC_APP_URL_FALLBACK
const wordmark = computed(
  () =>
    props.wordmarkUrl ??
    `${PUBLIC_APP_URL}/email/wordmark-light@2x.png`,
)
</script>

<template>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width" />
      <title>{{ title }}</title>
      <style>
        body { margin: 0; font-family: 'Inter', system-ui, sans-serif; background: #f6f6f5; color: #1a1a1d; }
        .container { max-width: 600px; margin: 0 auto; padding: 24px; background: #fff; }
        .head { text-align: left; padding-bottom: 16px; border-bottom: 1px solid #e6e6e3; }
        .body { padding: 24px 0; line-height: 1.55; font-size: 15px; }
        .foot { padding-top: 16px; border-top: 1px solid #e6e6e3; font-size: 12px; color: #6e6e73; }
        @media (max-width: 600px) { .container { padding: 16px; } }
      </style>
    </head>
    <body>
      <div
        v-if="preheader"
        style="display: none; font-size: 1px; color: #fff;"
      >{{ preheader }}</div>
      <div class="container">
        <div class="head">
          <img :src="wordmark" alt="Kova" width="80" />
        </div>
        <div class="body"><slot /></div>
        <div v-pre class="foot">
          Sent to {{email}}. <a href="{{settings_url}}">Manage preferences</a>.<br />
          © 2026 Kova
        </div>
      </div>
    </body>
  </html>
</template>
