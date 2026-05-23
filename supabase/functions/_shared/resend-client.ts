// TEMPORARY STUB — Cluster 12 C-HIGH14.
//
// Cluster 01 (W8a sibling) ships the real resend-client wrapper at this same
// path. Until that branch merges into the integration branch, this stub
// satisfies imports so Cluster 12's send-sync-alert edge function compiles
// and tests can pass.
//
// Behavior:
//   - If RESEND_API_KEY is unset → return { id: 'stub-no-api-key', skipped: true }.
//   - If RESEND_API_KEY is set → throw, forcing the swap to the real client
//     before any real send happens.
//
// Remove this file the moment Cluster 01's real `_shared/resend-client.ts` lands.

export interface SendEmailArgs {
  to: string
  subject: string
  text?: string
  html?: string
  idempotencyKey?: string
}

export interface SendEmailResult {
  id: string
  skipped?: boolean
}

export async function sendEmail(args: SendEmailArgs): Promise<SendEmailResult> {
  const apiKey = Deno.env.get('RESEND_API_KEY')
  if (!apiKey) {
    console.warn(
      '[resend-client stub] RESEND_API_KEY unset — returning skipped:true',
      args.idempotencyKey ?? '',
    )
    return { id: 'stub-no-api-key', skipped: true }
  }
  throw new Error(
    'resend-client stub invoked with RESEND_API_KEY set. Cluster 01 must ship the real client (Plan 01 Task 2.5) before this code path runs.',
  )
}
