# Operator Runbook — Anthropic Manual Deletion Requests

**Owner:** Privacy & Compliance (Jiho, founder)
**Cadence:** weekly (Mondays)
**SLA:** drain backlog within 7 days of cron entry
**Escalation:** if backlog exceeds 50 rows or any row sits > 14 days, page on-call

## Why this runbook exists

Anthropic does not yet offer a programmatic API to delete inference data on a per-user basis. The GDPR deletion cron's `anthropic` step writes a row to `anthropic_deletion_log` for every hard-deleted user; this runbook describes how an operator drains those rows by emailing Anthropic's privacy team.

This manual flow is a **stopgap**. Pre-launch goal: migrate to Anthropic Zero Data Retention (ZDR) tier, which eliminates the retention window entirely. When ZDR is in place, this runbook retires.

## Weekly procedure

### 1. List pending requests

Run via Supabase Studio SQL editor (or `psql` against the production project):

```sql
SELECT
  user_id,
  requested_at,
  status
FROM public.anthropic_deletion_log
WHERE status = 'queued_for_manual_request'
  AND submitted_at IS NULL
ORDER BY requested_at ASC;
```

Note the count. If > 50, see Escalation below.

### 2. Compose email to Anthropic

Email **privacy@anthropic.com** with this template (one email per batch; do not include PII):

```
To: privacy@anthropic.com
Subject: GDPR Art. 17 deletion request — Kova user batch <YYYY-MM-DD>

Hello Anthropic Privacy team,

Kova requests deletion of all inference data (inputs and outputs) associated with the following Kova-internal user IDs. These are GDPR Art. 17 right-to-erasure requests received by Kova; we have already hard-deleted our local copies and need Anthropic to remove its server-side retention.

User IDs:
  <paste user_id list, one per line>

Each user authorized Kova to send their content to Anthropic for AI generation per our Privacy Policy at https://kova.io/privacy. They have since requested account deletion under GDPR Art. 17.

Kova API account: <Anthropic API key alias / org ID>
Anthropic Org: <Kova production org name>

Please confirm receipt and provide an estimated deletion completion date.

Regards,
<Operator name>
Kova Privacy Team
privacy@kova.io
```

**Do NOT include:** email addresses, names, billing data, or any other PII. Only the opaque user UUIDs. Anthropic correlates internally via the API request metadata + your org ID.

### 3. Mark submitted

After sending, update the rows:

```sql
UPDATE public.anthropic_deletion_log
   SET status = 'submitted',
       submitted_at = now()
 WHERE user_id IN (<list>)
   AND status = 'queued_for_manual_request';
```

### 4. On Anthropic confirmation

When Anthropic confirms completion (typically 7–30 days), update again:

```sql
UPDATE public.anthropic_deletion_log
   SET status = 'confirmed_by_anthropic',
       confirmed_at = now(),
       notes = '<Anthropic ticket ID or confirmation reference>'
 WHERE user_id IN (<list>)
   AND status = 'submitted';
```

## Escalation

| Trigger | Action |
|---|---|
| Backlog > 50 rows | Page founder + accelerate runbook to twice-weekly |
| Any row > 14 days unsubmitted | Page founder; investigate why batch is delayed |
| Anthropic confirms partial deletion | Note in `notes` column; re-submit failed user IDs |
| Anthropic declines a request | Document in `notes`; escalate to legal (privacy@kova.io) |

## Retirement criteria

This runbook can retire when:
1. Kova is enrolled in Anthropic Zero Data Retention (ZDR) for the production org
2. ZDR backfill confirmed for any historical inference data
3. New rows in `anthropic_deletion_log` cease to be created (cron skips the manual log step when ZDR env flag is set)

Document the ZDR enrollment date here when complete.

---

**ZDR enrollment status:** TODO (post-launch follow-up tracked in privacy backlog)
