<script setup lang="ts">
/**
 * Email shell — transactional HTML template per PRD 11 §3.8 + §5.5.
 *
 * Rendered server-side (Edge Function) via vue-email-style template
 * inlining. **CSS lives INLINE** on each element — many email clients
 * (Gmail, Outlook) strip `<style>` blocks. Hi-fi tokens are flattened
 * to concrete hex at render time by `useEmailShell()` (Cluster 11
 * Task 8.2 — composable helper).
 *
 * Max width 600 px, single-column at <600 px.
 * Plain-text fallback rendered from Markdown intermediate by Resend.
 */

export interface EmailShellProps {
  title: string
  /** Recipient email — shown in footer "Sent to {{email}}". */
  recipientEmail: string
  /** URL to email preferences page (footer link). */
  settingsUrl: string
  /** Optional Kova wordmark URL. Default points at Vercel /public/email/wordmark.png. */
  wordmarkUrl?: string
  /** Footer year. Defaults to current year. */
  year?: number
}

const props = defineProps<EmailShellProps>()

/* token-exempt: HTML email medium constraint. Many email clients
   (Gmail, Outlook) strip <style> blocks AND CSS variables. Tokens MUST
   be flattened to concrete hex/px at render time. Per PRD 11 §3.8 +
   §5.5 + IMPLEMENTATION_PROMPT.md §9 escape valve. */
const PAGE = '#ffffff'
const INK = '#0d0d0c'
const INK_2 = '#4f5060'
const INK_3 = '#82828a'
const LINE = '#e9e9eb'
const ACCENT = '#3b82f6'

const wordmarkSrc = props.wordmarkUrl ?? '/email/wordmark@2x.png'
const currentYear = props.year ?? new Date().getFullYear()
</script>

<template>
  <table
    role="presentation"
    width="100%"
    cellpadding="0"
    cellspacing="0"
    border="0"
    :style="{
      background: PAGE,
      color: INK,
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, \'Helvetica Neue\', Arial, sans-serif',
      lineHeight: '1.55',
      WebkitFontSmoothing: 'antialiased',
    }"
  >
    <tbody>
      <tr>
        <td align="center" :style="{ padding: '32px 0' }">
          <table
            role="presentation"
            width="600"
            cellpadding="0"
            cellspacing="0"
            border="0"
            :style="{ width: '100%', maxWidth: '600px' }"
          >
            <tbody>
              <tr>
                <td :style="{ padding: '0 24px 24px', textAlign: 'center' }">
                  <img
                    :src="wordmarkSrc"
                    alt="Kova"
                    width="80"
                    height="24"
                    :style="{ display: 'inline-block', border: '0', height: '24px' }"
                  />
                </td>
              </tr>
              <tr>
                <td :style="{ padding: '0 24px 32px' }">
                  <h1
                    :style="{
                      margin: '0 0 16px',
                      fontSize: '20px',
                      lineHeight: '1.3',
                      fontWeight: '600',
                      letterSpacing: '-0.01em',
                      color: INK,
                    }"
                  >
                    {{ title }}
                  </h1>
                  <slot />
                </td>
              </tr>
              <tr>
                <td
                  :style="{
                    padding: '24px',
                    borderTop: `1px solid ${LINE}`,
                    fontSize: '11.5px',
                    color: INK_3,
                    lineHeight: '1.55',
                  }"
                >
                  <p :style="{ margin: '0 0 4px' }">
                    Sent to <a :href="`mailto:${recipientEmail}`" :style="{ color: ACCENT, textDecoration: 'none' }">{{ recipientEmail }}</a>.
                    <a :href="settingsUrl" :style="{ color: ACCENT, textDecoration: 'none' }">Manage email preferences</a>.
                  </p>
                  <p :style="{ margin: 0 }">© {{ currentYear }} Kova.</p>
                </td>
              </tr>
            </tbody>
          </table>
        </td>
      </tr>
    </tbody>
  </table>
</template>
