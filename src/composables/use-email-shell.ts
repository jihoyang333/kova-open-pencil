// Cluster 11 Plan Task 8.2 — useEmailShell (STUB until pre-launch).
//
// At MVP, juice + @vue/server-renderer are NOT installed (founder lock #19 /
// project_external_accounts_deferred — Resend wiring is the trigger). The
// composable returns a stub envelope so callers (account-deletion email,
// brand-deletion email, magic-link email) can type-check + integrate today
// without the missing deps.
//
// Pre-launch §11 wiring:
//   1. `bun add juice @vue/server-renderer`
//   2. Uncomment the live branch below.
//   3. Update the Resend wrapper (api/_shared/email.ts) to call buildEmail().

import EmailShell from '@/components/email/EmailShell.vue'

void EmailShell // keep the import in scope for the live branch

export interface EmailShellOptions {
  title: string
  preheader?: string
  /** Markdown -> HTML done by caller. */
  bodyHtml: string
}

export interface BuiltEmail {
  html: string
  text: string
  skipped: boolean
}

export async function buildEmail(opts: EmailShellOptions): Promise<BuiltEmail> {
  // STUB: returns a minimal envelope that satisfies the contract without
  // touching juice / SSR. Callers branch on `skipped` to surface stub-mode
  // divergence in any "email sent" UX.
  const text = opts.bodyHtml.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
  return {
    html: opts.bodyHtml,
    text,
    skipped: true,
  }

  // TODO(pre-launch §11): replace stub with real SSR + juice inlining:
  //   const app = createSSRApp({
  //     render: () => h(EmailShell, { title: opts.title, preheader: opts.preheader },
  //       { default: () => h('div', { innerHTML: opts.bodyHtml }) }),
  //   })
  //   const html = juice(await renderToString(app))
  //   return { html, text, skipped: false }
}
