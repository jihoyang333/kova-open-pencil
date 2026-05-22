// W8a Cluster 01 — verify CRON_SECRET on cron-handler entry.
// Plan 01 Task 2.3. Uses constant-time compare to defeat timing oracles.
// Throws if CRON_SECRET unset (deployment misconfiguration — fail loud).

export function verifyCronSecret(req: Request): boolean {
  const secret = process.env['CRON_SECRET']
  if (!secret) {
    throw new Error('CRON_SECRET env var not configured')
  }
  const header = req.headers.get('authorization') ?? req.headers.get('Authorization')
  if (!header) return false
  if (!header.startsWith('Bearer ')) return false
  const provided = header.slice('Bearer '.length)
  if (provided.length !== secret.length) return false
  let mismatch = 0
  for (let i = 0; i < secret.length; i++) {
    mismatch |= provided.charCodeAt(i) ^ secret.charCodeAt(i)
  }
  return mismatch === 0
}
