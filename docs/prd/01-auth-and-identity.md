# PRD 01 — Auth & Identity

## 0. Status & ownership

| Field | Value |
|---|---|
| **Status** | `DRAFT` (awaiting founder review) |
| **Wave** | 1 (foundation) |
| **Author** | Claude (Opus 4.7) |
| **Reviewer** | Jiho Yang (founder) |
| **Last updated** | 2026-05-15 |
| **Depends on PRDs** | None (this PRD is foundational) |
| **Blocks PRDs** | 02 (Onboarding & Dashboard), 03 (Brand Management), 04 (Account & Stripe), 05 (Brand Kit & Drag-Drop), 12 (Settings & User Prefs) |
| **Source artifacts** | Hi-fi: 5 files. 03 doc: §2.14 + §3C #5b. Q-decisions: Q12 + Q13 partial + Q15. Audit §2.A Cluster 01 + §5.6 items 6 (test-debt deferred) + 9 (this PRD builds cron). |

---

## 1. Problem & outcome

### 1.1 Plain language (for founder)

Users need to create an account, sign in, recover from broken auth states, change their email, and (when they choose) permanently delete their account in a GDPR-compliant way. This PRD ships the **foundation** every other cluster sits on: Supabase Auth (passwordless magic-link + OTP fallback), Vue Router auth middleware (route guards, session-expired detection, deleted-account intercept), GDPR Art. 17 + Art. 19 cascade (30-day soft-delete then daily cron that purges the user from Stripe + Shopify + Anthropic + Supabase Storage + DB), and the auth-error edge surfaces (expired link, OTP lockout, account-exists-on-signup, desktop-only fallback for mobile visitors). The Account page UI shell that hosts the "Delete account" button lives in Cluster 04 — this PRD ships the backend cascade + the modal/confirm dialog logic + the auth-middleware grace-period restore page. Toast/modal/skeleton primitives are imported from Cluster 11.

### 1.2 Caveman summary (per CLAUDE.md communication style)

User make account. User sign in. User change email. User delete account. Auth break sometimes — link expired, code wrong, session die. PRD ship every auth screen + Supabase wiring + GDPR cascade (30 day soft-delete, then cron purge all). Every other cluster wait on this one. No auth = no app.

### 1.3 Outcome (acceptance gate)

User can: (1) sign up via magic-link, (2) sign in via magic-link or 6-digit OTP, (3) recover from every documented error state (expired link, invalid link, wrong OTP, OTP lockout, account-exists, no-account), (4) change their email via a verify-link to the new address, (5) request account deletion → see typed-confirm modal → receive confirmation email → can restore within 30 days by signing in, (6) hits mobile fallback when on a phone/tablet, (7) hits session-expired bridge when their token dies mid-session. Auth middleware enforces every protected route. GDPR cron runs daily and step-by-step retries on failure with terminal-failure capping. Privacy policy + RoPA documents all sub-processors and the cascade.

---

## 2. Scope

### 2.1 In scope (this PRD)

**Pre-auth surfaces:**
- Signup, Login, Magic-link-sent, OTP-entry, Forgot-password (route exists; entry point hidden until email+password upgrade ships), Email-verified post-signup landing
- Auth error states: magic-link expired, magic-link invalid/already-used, OTP wrong code, OTP locked-out, signup email-already-exists, login user-not-found
- Email-change verify landing (success + expired)
- Session-expired bridge (dark, no chrome)
- Mobile / tablet desktop-only fallback (responsive at 375 / 768 / 1440)
- Account-pending-deletion grace-period restore page (post-sign-in intercept)
- Privacy policy + Terms (static SPA routes; copy authored in this PRD's §11.1 deliverables)

**Auth wiring + storage:**
- Supabase Auth: magic-link OTP-token email flow, OTP code-input email flow, email-change verify flow, session lifecycle (30-day refresh on "Keep me signed in"), rate limits (Supabase native), token TTLs
- Vue Router guards: session check, deleted-account intercept, viewport guard (desktop-only), redirect-on-already-signed-in
- `useAuthStore` extension: session, profile, `pendingDeletion`, deletion-request and restore actions, sign-out
- `users` table extension: `deleted_at`, `preferences` JSONB (shared with Cluster 12 — see §11 cross-cuts)
- `gdpr_deletion_queue` table (cron retry state)
- RPCs: `request_account_deletion`, `restore_account` (both SECURITY DEFINER)

**Backend GDPR cascade:**
- Edge Function `POST /api/account/deletion-request` (orchestrate RPC + email + audit-log)
- Edge Function `POST /api/account/restore` (orchestrate RPC + audit-log)
- Edge Function `POST /api/cron/delete-account` (daily; processes `gdpr_deletion_queue` rows step-by-step)
- Cascade steps in cron: `stripe` (cancel sub + delete Customer), `shopify` (per-brand disconnect + OAuth revoke), `anthropic` (purge chat-history rows), `storage` (delete user-scoped Supabase Storage paths), `db` (delete `users` row → FK cascade)
- Email integration via Resend (deletion-confirmed, deletion-completed, restored, email-change-confirmation-to-old-address, email-change-confirmation-to-new-address)

**Compliance + docs:**
- Privacy policy text covering each sub-processor (Stripe, Shopify, Anthropic, Resend, Supabase) and the 30-day-window + 7-day-PITR retention disclosure
- Record of Processing Activities (RoPA) markdown doc with cascade order and sub-processor purposes
- D-3 disclosure (per `00e §6 #4`): Anthropic sub-processor data flow named explicitly because Cluster 05 will scrape storefront content for brand-voice inference

### 2.2 Out of scope (handed to other clusters)

| Item | Owning PRD |
|---|---|
| Account page UI shell (sidebar + sections) | 04 — Account & Stripe |
| Profile section (name/avatar/timezone) | 04 |
| Stripe Checkout / Customer Portal / `stripe-webhook` (foundation cascade step calls Stripe API, but the **wiring** of Stripe Customer creation/portal/webhooks lives in 04) | 04 |
| Brand-creation flow + dashboard | 02 |
| Brand Kit settings (per-brand tone snippets, saved blocks, fonts) | 05 |
| Shopify connect/disconnect UI | 04 (route IA) + M9 reuse |
| Account-preferences sub-section (textSize, reduceMotion, highContrast) — `users.preferences` JSONB column ships here but UI lives in 12 | 12 |
| Toast component, `useToast()`, modal `.dlg` shell, `useConfirm()`, error pages (`/404`, `/500`), Command-K palette, skeletons, offline indicator | 11 |
| Avatar dropdown chrome (Q16) | 06 — Canvas Editor Core Chrome (lives in topbar) and 02 — Dashboard (also has its own topbar) |
| Multi-device auth coordination (P2P presence) | Deferred per Q6 — Trystero/awareness dormant in MVP |

### 2.3 Deferred to Phase 2

- Email + password upgrade path (`/forgot-password` route ships but entry point hidden until then — A15.05 annotation)
- MFA / TOTP
- OAuth providers (Google, Apple) — magic-link only at launch
- Cross-device "active sessions" management page
- Mobile native app
- Account-deletion *immediate* hard-delete (skip 30-day window) — out of scope; GDPR allows the 30-day window

### 2.4 Cross-cut acknowledgments (foreign owners)

- **Cluster 11** owns `useToast()`, `useConfirm()`, `<KovaModal>`, skeletons, error pages. This PRD **consumes** them by composable name only; does not re-spec.
- **Cluster 04** owns the Account page route shell. This PRD ships the `/account-pending-deletion` route (NOT a section of `/account`) and the Danger-zone modal component used by `/account` later (see §6.4).
- **Cluster 12** ships the `usePreferencesStore` that reads `users.preferences`. This PRD adds the JSONB column on the same migration; Cluster 12 consumes it.

---

## 3. Visual spec

Every surface maps to a hi-fi file. Engineers cite the file + scene ID when implementing.

### 3.1 Pre-auth surfaces (LIGHT theme)

| Surface | Route | Hi-fi file | Scene IDs | Notes |
|---|---|---|---|---|
| Signup · email entry | `/signup` | `main-main-kova-scope/batch-a/light/Kova Hi-Fi A15 Auth - Light.html` | A15.01 | Single email field; magic-link primary; "Use a 6-digit code instead" secondary; no password field |
| Login · email entry | `/login` | same | A15.02 | Same shell as signup; "Forgot password?" in field-label row; pre-filled email demonstrates remembered state |
| Magic-link sent | `/login` (state=sent) | same | A15.03 | Headline carries email address; 60-second resend timer; "Enter a 6-digit code instead" secondary |
| OTP code entry | `/login` (state=otp) | same | A15.04 | 6 cells (44×52 px each, 8 px gap); auto-advance on digit; submit disabled until 6 digits |
| Forgot password | `/forgot-password` | same | A15.05 | Hidden link in MVP (only reachable by URL); honest help-line: "We'll only send a link if this email has an account" |
| Email verified (post-signup) | `/auth/callback` | same | A15.06 | 48×48 success medal; "Keep me signed in on this device" toggle (default ON, 30-day refresh); routes conditionally to onboarding (no brands) / brand picker (multi) / single-brand dashboard (one) |

### 3.2 Auth-error surfaces (LIGHT theme, inline-error variants)

| Surface | Route | Hi-fi file | Scene IDs | Notes |
|---|---|---|---|---|
| Magic-link expired | `/auth/magic?status=expired` | `main-main-kova-scope/batch-a-additions/light/Kova Hi-Fi B4 Auth Errors - Light.html` | B4.1 | 30-min link TTL (Supabase setting); primary CTA "Send a new link" |
| Magic-link invalid / already-used | `/auth/magic?status=invalid` | same | B4.2 | Honest copy without disclosure ("invalid or already used"); single CTA "Sign in" |
| OTP wrong code (inline) | `/login` (state=otp, error=wrong) | same | B4.3 | Cells stay filled with wrong code; submit stays enabled; meta-text "Wrong code · N attempts left" |
| OTP locked out | `/login` (state=otp, error=locked) | same | B4.4 | Cells dim to dot-placeholders; secondary "Use email link" removed; single CTA "Request new code"; 15-min server-side lockout |
| Signup · account exists (inline) | `/signup` (error=exists) | same | B4.5 | Warn-tinted input edge; inline meta "Account exists · sign in instead" with accent-link |
| Login · user not found (inline) | `/login` (error=no-account) | same | B4.6 | Mirror of B4.5; **founder must decide whether to ship this as drawn or pivot to enumeration-safe variant — see §12** |

### 3.3 Mid-/post-session bridges + verification surfaces (mixed themes)

| Surface | Route | Hi-fi file | Scene IDs | Theme | Notes |
|---|---|---|---|---|---|
| Email-change verified | `/auth/email-change/verify` (status=success) | `main-main-kova-scope/batch-a-additions/light/Kova Hi-Fi B5 Email Change Landing - Light.html` | B5.1 | LIGHT | 24×24 inline check-circle (smaller than A15.06 medal — different event); new email bolded inline; "We've also notified your previous email"; primary CTA → `/account/profile` |
| Email-change verify expired | same route (status=expired) | same | B5.2 | LIGHT | 24-hr link TTL (Supabase default); clock glyph in `--ink-3`; copy: "Your account is still on the previous email" |
| Session expired | `/auth/session-expired` | `main-main-kova-scope/batch-a-additions/dark/Kova Hi-Fi B4 Session Expired - Dark.html` | B4.7 | DARK | Pre-auth chrome; no sidebar/topbar; B2 error-card chrome lifted byte-identical; clock glyph; "Sign in" primary + greyed/disabled "Go to dashboard" secondary; sub-copy load-bearing on local-Yjs autosave |
| Mobile fallback (primary) | `/desktop-only` (width<640) | `main-main-kova-scope/batch-a-additions/light/Kova Hi-Fi B6 Mobile Fallback - Light.html` | B6.1 | LIGHT | Monitor glyph (24×24, dim); mailto-prefilled "Email myself a desktop link"; secondary "Learn more"; foot link "Reload the page" |
| Tablet edge fallback | `/desktop-only` (width 640–1023) | same | B6.2 | LIGHT | Laptop glyph; secondary "I'll rotate my tablet" (auto-listens for orientation change and reloads on ≥1024) |
| Account pending deletion | `/account-pending-deletion` | NEW — built from B4.7 + A4 modal pattern (no dedicated hi-fi) | n/a | DARK (post-sign-in surface) | Renders when auth middleware detects `users.deleted_at IS NOT NULL` during sign-in; offers "Restore account" or "Sign out (keep deletion scheduled)"; shows scheduled-purge timestamp |

### 3.4 Static legal surfaces

| Surface | Route | Hi-fi file | Theme | Notes |
|---|---|---|---|---|
| Privacy policy | `/privacy` | no dedicated hi-fi; render as long-form light page via shared `<MarketingShell>` (Cluster 11 ships) | LIGHT | Content authored in `docs/legal/privacy-policy.md` (see §5.5 deliverable list); rendered via simple Markdown component |
| Terms of service | `/terms` | same shell | LIGHT | Content in `docs/legal/terms.md` (initial draft included in this PRD; legal review pre-launch) |

### 3.5 Design system references

Light surfaces use `main-main-kova-scope/design-system/kova-hifi-light.css` (no `data-theme="dark"` on `<html>`). Dark surfaces use `main-main-kova-scope/design-system/kova-hifi.css` (set `data-theme="dark"`). Engineers translate the `:root` block to Tailwind `@theme` tokens in `app.css`. Component primitives (`.btn`, `.btn.primary`, `.btn.auth-cta`, `.auth-card`, `.auth-shell`, `.auth-otp .cell`, `.auth-medal`, `.auth-icon`, etc.) are defined in the hi-fi file's inline `<style>` block — translate each to a Vue component that renders the same markup contract.

**Theme detection per route** (per `00c §1.D` cross-cut, owned by Cluster 11): the Vue Router `meta.theme` field selects which stylesheet is active. Routes in §3.1 + §3.2 + §3.3 (B5.x and B6.x) carry `meta.theme = 'light'`. Routes in §3.3 (B4.7 session expired, account-pending-deletion) carry `meta.theme = 'dark'`. Default fallback for unknown routes = dark (matches `feedback_app_dark_website_light`).

---

## 4. Data model

### 4.1 Schema migrations

Single migration file: `kova-open-pencil-1/supabase/migrations/20260520_01_users_account_lifecycle.sql`.

```sql
-- ============================================================
-- Migration 20260520_01_users_account_lifecycle
-- Cluster 01 Auth & Identity — schema for GDPR cascade + user preferences
-- Pairs with: 20260316_users.sql (creates public.users + base RLS)
-- ============================================================

BEGIN;

-- ---- 1. users.deleted_at + preferences ----

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS preferences jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Partial index — only rows with pending deletion are indexed (small set)
CREATE INDEX IF NOT EXISTS idx_users_pending_deletion
  ON public.users(deleted_at)
  WHERE deleted_at IS NOT NULL;

COMMENT ON COLUMN public.users.deleted_at IS
  'GDPR soft-delete timestamp. Set by request_account_deletion(); cleared by restore_account() within 30 days; hard-deleted by delete-account-cron after 30 days.';
COMMENT ON COLUMN public.users.preferences IS
  'Cross-device user preferences JSONB (Q5 Layer 1). Consumed by Cluster 12 usePreferencesStore.';

-- ---- 2. gdpr_deletion_queue (cron retry state) ----

CREATE TABLE IF NOT EXISTS public.gdpr_deletion_queue (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  step            text NOT NULL CHECK (step IN ('stripe', 'shopify', 'anthropic', 'storage', 'db')),
  status          text NOT NULL CHECK (status IN ('pending', 'in_progress', 'succeeded', 'failed_terminal'))
                       DEFAULT 'pending',
  attempts        int  NOT NULL DEFAULT 0,
  queued_at       timestamptz NOT NULL DEFAULT now(),
  last_attempt_at timestamptz,
  succeeded_at    timestamptz,
  error           text,
  idempotency_key text,             -- per-step idempotency anchor (00c §1.D cross-cut)
  UNIQUE (user_id, step)
);

CREATE INDEX IF NOT EXISTS idx_gdpr_queue_pending
  ON public.gdpr_deletion_queue(status, queued_at)
  WHERE status IN ('pending', 'in_progress');

COMMENT ON TABLE public.gdpr_deletion_queue IS
  'Step-by-step retry log for the GDPR delete-account cascade. One row per (user_id, step). Cron walks pending+in_progress rows daily; terminal failure caps at attempts >= 5.';

-- RLS: service_role only — never user-facing
ALTER TABLE public.gdpr_deletion_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY gdpr_queue_service_only
  ON public.gdpr_deletion_queue
  FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- ---- 3. RPCs (SECURITY DEFINER, owner = postgres) ----

CREATE OR REPLACE FUNCTION public.request_account_deletion()
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id      uuid;
  v_scheduled    timestamptz;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  UPDATE public.users
     SET deleted_at = now()
   WHERE id = v_user_id
     AND deleted_at IS NULL
  RETURNING deleted_at + INTERVAL '30 days' INTO v_scheduled;

  IF v_scheduled IS NULL THEN
    RAISE EXCEPTION 'Already pending deletion or user not found' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.gdpr_deletion_queue (user_id, step) VALUES
    (v_user_id, 'stripe'),
    (v_user_id, 'shopify'),
    (v_user_id, 'anthropic'),
    (v_user_id, 'storage'),
    (v_user_id, 'db')
  ON CONFLICT (user_id, step) DO NOTHING;

  RETURN v_scheduled;
END;
$$;

CREATE OR REPLACE FUNCTION public.restore_account()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid;
  v_updated int;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  UPDATE public.users
     SET deleted_at = NULL
   WHERE id = v_user_id
     AND deleted_at IS NOT NULL
     AND deleted_at > now() - INTERVAL '30 days';

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  IF v_updated > 0 THEN
    -- Cancel any pending cascade steps (succeeded/in_progress rows stay — we can't unwind those)
    DELETE FROM public.gdpr_deletion_queue
     WHERE user_id = v_user_id
       AND status = 'pending';
    RETURN true;
  END IF;
  RETURN false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.request_account_deletion() TO authenticated;
GRANT EXECUTE ON FUNCTION public.restore_account() TO authenticated;

COMMIT;
```

**Notes on this migration:**

1. The migration is **idempotent** (`IF NOT EXISTS` on every DDL, `CREATE OR REPLACE` on functions) so re-running on a staging snapshot is safe.
2. `users.preferences` lands here because (a) it's the same `ALTER TABLE` and (b) Q5 Layer 1 storage is a cluster-spanning primitive — Cluster 12 just consumes the column. Documented in §11 cross-cuts.
3. `gdpr_deletion_queue.idempotency_key` is part of the **cross-cut idempotency-key pattern** owned by Cluster 11 (`00c §1.D`); Edge Function (§5.1) stamps it before processing each row.
4. `restore_account()` deletes only `pending` queue rows. If a cascade step has already succeeded (e.g., Stripe customer canceled), it stays as `succeeded` for audit. Restore-after-partial-cascade is acceptable per GDPR Art. 17 (recovery is best-effort once side effects are external — see §12.3).
5. `ON DELETE CASCADE` from `gdpr_deletion_queue.user_id → users.id` keeps queue rows tied to the user lifecycle.

### 4.2 RLS policies

| Table | Policy | Purpose |
|---|---|---|
| `public.users` | Existing policies in `20260316_users.sql` carry over. `users.deleted_at` is read-only from the client side (no user-writable policy); only the RPCs (which are SECURITY DEFINER) can mutate. | Prevent client-side `UPDATE users SET deleted_at = NULL` bypass. |
| `public.gdpr_deletion_queue` | `gdpr_queue_service_only` — `FOR ALL TO service_role`. No `authenticated` policy. | Queue is service-only; users cannot read or mutate. |

**Verification:** the existing `users` RLS policies (created in `20260316_users.sql`) must already restrict writes to `auth.uid() = id`. This PRD does NOT alter existing `users` RLS — only adds columns + cascade-state table.

### 4.3 Storage buckets

No new buckets in this PRD. The cascade `storage` step calls Supabase Storage SDK to delete user-scoped paths in **existing** buckets owned by other clusters:

| Bucket | Purge path | Owning cluster |
|---|---|---|
| `media-assets` | `media-assets/{user_id}/**` | 05 (Brand Kit & Drag-Drop) |
| `canvas-snapshots` | `canvas-snapshots/{user_id}/**` | 09 (Version History) |
| `thumbnails` | `thumbnails/{user_id}/**` | 02 (Onboarding/Dashboard — file thumbnails) |
| `brand-fonts` | `brand-fonts/{brand_id}/**` for each brand the user owns | 05 |

**Cascade ordering:** storage step runs AFTER DB rows are deleted (which is the last step), because we need the FK relationship to enumerate user-owned `brand_id` values. See §5.1 Edge Function flow.

---

## 5. Backend

### 5.1 Edge Functions

All Edge Functions deploy as Vercel Functions under `kova-open-pencil-1/api/`. The repo already uses this pattern (per M9 Shopify integration). Each function uses Fluid Compute (no Edge runtime).

Idempotency-key handling per cross-cut convention (Cluster 11 owns the primitive; this PRD consumes): client sends `X-Idempotency-Key: <uuid v4>` header on POST; server checks `idempotency_keys` table (Cluster 11 creates) and short-circuits on dup.

---

#### 5.1.1 `POST /api/account/deletion-request`

```typescript
// kova-open-pencil-1/api/account/deletion-request.ts
// Method:      POST
// Auth:        Supabase JWT (verifyAuth shared helper)
// Headers:     Authorization: Bearer <jwt>
//              X-Idempotency-Key: <uuid v4>            (optional; recommended)
// Body:        {}
// Response 200: { success: true, scheduled_purge_at: ISO8601 }
// Response 401: { error: 'unauthenticated' }
// Response 409: { error: 'already_pending' }                      (idempotent re-call returns 200 if same key)
// Response 429: { error: 'rate_limited', retry_after_seconds: n }  (5 req/min/user)
// Response 500: { error: 'internal_error', request_id }
// Side effects:
//   1. Calls supabase.rpc('request_account_deletion') — returns scheduled_purge_at
//   2. Inserts audit-log row into public.audit_log (cluster 11 ships table)
//   3. Sends Resend email "deletion-scheduled" with restore link → /account-pending-deletion (signed magic-link from Supabase Auth)
//   4. Signs the user out (clears refresh token via supabase.auth.signOut server-side; client also locally clears)
// Idempotency: per-request via X-Idempotency-Key (Cluster 11 cross-cut)
// Rate limit: 5 req/min/user via existing rate-limit table pattern (M9 reuses; this PRD adds 'account.deletion-request' bucket)
```

**Why idempotency matters here:** retry-on-network-failure must not double-enqueue the cascade. The RPC itself is idempotent (`ON CONFLICT … DO NOTHING`), but the email is not — without an idempotency-key, a retry sends a second "deletion scheduled" email. The Edge Function gates email send on idempotency-key hit.

---

#### 5.1.2 `POST /api/account/restore`

```typescript
// kova-open-pencil-1/api/account/restore.ts
// Method:      POST
// Auth:        Supabase JWT (verifyAuth) — user MUST sign in to call this
// Body:        {}
// Response 200: { success: true }
// Response 401: { error: 'unauthenticated' }
// Response 409: { error: 'no_pending_deletion' }
// Response 500: { error: 'internal_error', request_id }
// Side effects:
//   1. Calls supabase.rpc('restore_account') — boolean
//   2. If true: clears pending queue rows (RPC handles); inserts audit-log row 'account_restored'; sends Resend email "account-restored"
//   3. If false: returns 409
// Notes:
//   - User must have a valid session to call this — the /account-pending-deletion view forces re-auth before the restore button is enabled
//   - Restore does NOT unwind already-succeeded cascade steps (Stripe customer may be gone — Cluster 04 handles re-onboarding on next subscribe)
```

---

#### 5.1.3 `POST /api/auth/email-change-request`

```typescript
// kova-open-pencil-1/api/auth/email-change-request.ts
// Method:      POST
// Auth:        Supabase JWT (verifyAuth)
// Body:        { new_email: string }
// Response 200: { success: true }
// Response 400: { error: 'invalid_email' }
// Response 409: { error: 'email_in_use' }
// Response 429: { error: 'rate_limited' }                          (5 req/hour/user)
// Side effects:
//   1. Calls supabase.auth.admin.updateUserById(userId, { email: new_email }) — Supabase sends verify-link to new address (24-hour TTL — Supabase default)
//   2. Sends Resend email to OLD address ("we received a change request — if not you, reply") via separate mailer
//   3. Inserts audit-log row 'email_change_requested'
// Notes:
//   - Supabase Auth handles the verify-link click → B5.1 / B5.2 landing pages
//   - The OLD-address notification is sent by US, not Supabase — Supabase doesn't notify the previous email by default
//   - Confirmation pattern is OWASP-aligned: notify both addresses (per B5.1 sub-line)
```

---

#### 5.1.4 `POST /api/cron/delete-account`

```typescript
// kova-open-pencil-1/api/cron/delete-account.ts
// Method:      POST
// Auth:        Vercel Cron secret (Authorization: Bearer ${CRON_SECRET})
// Body:        {}  (cron-invoked; no client body)
// Response 200: { processed: n, succeeded: n, failed: n, terminal: n }
// Response 401: { error: 'unauthorized' }                          (bad/missing CRON_SECRET)
// Schedule:    daily at 03:00 UTC (Vercel Cron — vercel.json)
//
// Algorithm (per-row idempotent, parallelizable across users, sequential across steps):
//   1. SELECT users WHERE deleted_at IS NOT NULL
//        AND deleted_at < now() - INTERVAL '30 days'
//        AND id IN (SELECT user_id FROM gdpr_deletion_queue WHERE status IN ('pending','in_progress'))
//      LIMIT 100  (batch size; cron may re-process leftovers next day)
//
//   2. For each user_id, walk steps in fixed order: stripe → shopify → anthropic → storage → db
//      For each (user_id, step) row in gdpr_deletion_queue with status IN ('pending', 'in_progress', 'failed_terminal' AND attempts < 5):
//        BEGIN
//          UPDATE row SET status='in_progress', last_attempt_at=now(), attempts=attempts+1
//            WHERE id=row.id AND status IN ('pending','in_progress','failed_terminal')
//          (lock via SELECT FOR UPDATE SKIP LOCKED — prevents cron-overlap from same-row contention)
//        COMMIT
//
//        Try step handler (5.1.4.x below).
//          On success: UPDATE row SET status='succeeded', succeeded_at=now(), error=null
//          On retriable error (network, 5xx): UPDATE row SET status='failed_terminal' IF attempts >= 5 ELSE 'pending'; error=msg
//          On terminal error (4xx, validation): UPDATE row SET status='failed_terminal', error=msg; surface in Sentry
//
//   3. After all 5 steps for a user_id are 'succeeded', send final Resend email 'account-deleted-confirmation'.
//
//   4. If ANY step is 'failed_terminal' for a user_id, do NOT delete the user row.
//      Open Sentry issue + on-call paging (Cluster 11 ships paging integration; this PRD wires the alert rule).
//
//   5. Return aggregate counts.
//
// Idempotency: per-row status flag prevents double-purge.
//              Step handlers must themselves be idempotent (e.g., Stripe.customers.del returns 200 even if already-deleted).
//              Idempotency-key on every outbound HTTP call uses gdpr_deletion_queue.idempotency_key (one per row).
//
// Concurrency: pg `SELECT FOR UPDATE SKIP LOCKED` on the queue row prevents two cron runs from racing on the same step.
```

##### 5.1.4.1 Step: stripe

```typescript
// Handler: deleteStripe(userId: string, idempKey: string)
//
// Logic:
//   1. SELECT stripe_customer_id, stripe_subscription_id FROM users WHERE id = $1
//   2. If subscription_id: stripe.subscriptions.cancel(subscription_id, { invoice_now: false, prorate: false }, { idempotencyKey })
//      Treats 'not found' as success (already canceled).
//   3. If customer_id: stripe.customers.del(customer_id, { idempotencyKey: idempKey + ':del-customer' })
//      Treats 'not found' as success.
//   4. UPDATE users SET stripe_customer_id=NULL, stripe_subscription_id=NULL, plan='free', plan_status='cancelled'
//      (defensive nullification — the user row itself gets deleted in the 'db' step)
//
// Cluster 04 ships the Stripe wiring. This step exists in cluster 01 because the cascade orchestration belongs to GDPR.
// Sequence requirement: Cluster 04 must ship Stripe foundation BEFORE Cluster 01's cron runs in production.
// At PRD-author time, Cluster 04 isn't yet drafted — but Wave 3 completes Cluster 04 well before MVP launch.
// The 'stripe' step DEGRADES GRACEFULLY: if STRIPE_SECRET_KEY isn't configured at runtime, the handler logs + sets status='succeeded' with note 'stripe-not-configured'. This prevents Wave 2/3 dev cycles from blocking on the cron.
```

##### 5.1.4.2 Step: shopify

```typescript
// Handler: deleteShopify(userId: string, idempKey: string)
//
// Logic:
//   1. SELECT id, shopify_shop_domain, shopify_access_token_id FROM brands WHERE user_id = $1 AND shopify_shop_domain IS NOT NULL
//   2. For each brand: call existing M9 disconnect-shop flow (reuse api/shopify/disconnect.ts handler logic):
//        a. Revoke OAuth token via Shopify Admin API: POST /admin/api/2024-01/access_tokens/{id}/revoke
//           (Treats 401/404 as success — token already revoked or shop uninstalled)
//        b. Set brands.shopify_shop_domain=NULL, shopify_access_token_id=NULL
//        c. Cron-purge will clear shopify_products / shopify_collections / shopify_variants rows via FK cascade when 'db' step runs
//   3. Idempotency: Shopify Admin API uses our request-level idempotency-key prefix
```

##### 5.1.4.3 Step: anthropic

```typescript
// Handler: deleteAnthropic(userId: string, idempKey: string)
//
// Logic:
//   1. Anthropic Messages API does NOT have a customer-data-deletion endpoint at API level.
//      Anthropic's data retention policy is (per Anthropic's published policy as of 2026-05):
//        - Inputs/outputs retained 30 days for safety/abuse review
//        - Default retention can be reduced via ZDR (Zero Data Retention) tier
//        - User-level deletion request → email privacy@anthropic.com
//   2. This step has TWO sub-actions:
//        a. DELETE FROM chat_conversations WHERE user_id = $1
//           DELETE FROM chat_messages WHERE conversation_id IN (...)
//           (Cluster 10 ships these tables — at cron time they will exist)
//        b. Log a deletion-request event for offline operator-driven follow-up:
//           INSERT INTO anthropic_deletion_log (user_id, requested_at, status='queued_for_manual_request')
//           Operator (founder or SRE) periodically batches these into emails to Anthropic
//   3. ZDR onboarding (post-launch when volume justifies) eliminates the manual step
//   4. Idempotency: same idempKey prefix; DB DELETEs are naturally idempotent
//
// Notes:
//   - Privacy policy + RoPA (§5.5 deliverable) must explicitly disclose this hybrid (in-DB instant + Anthropic deferred-manual) model
//   - Founder decision per 00e §6 #4 (D-3 RoPA disclosure) — record in §13 References
```

##### 5.1.4.4 Step: storage

```typescript
// Handler: deleteStorage(userId: string, idempKey: string)
//
// Logic:
//   1. Enumerate user-owned brand IDs: SELECT id FROM brands WHERE user_id = $1
//      (Done BEFORE the 'db' step so FK relationship still exists)
//   2. For each Storage bucket+path pattern (see §4.3):
//        await supabase.storage.from(bucket).list(path, { limit: 1000, offset: 0 })
//        await supabase.storage.from(bucket).remove([file_paths])
//      Paginate through all objects.
//   3. Idempotency: 'remove' on missing path returns OK
//   4. On 500 from Storage API: retry with backoff (in-handler, up to 3); on persistent failure → 'failed_terminal'
```

##### 5.1.4.5 Step: db

```typescript
// Handler: deleteDb(userId: string)
//
// Logic:
//   1. DELETE FROM users WHERE id = $1
//      (FK ON DELETE CASCADE removes: brands, canvases, media, brand_fonts, chat_conversations, etc.)
//   2. The gdpr_deletion_queue row for this (user_id, 'db') is naturally cleaned because the table has
//      ON DELETE CASCADE on user_id. So we explicitly UPDATE status='succeeded' BEFORE the DELETE.
//      Order:
//        a. UPDATE gdpr_deletion_queue SET status='succeeded', succeeded_at=now() WHERE user_id=$1 AND step='db'
//        b. DELETE FROM users WHERE id=$1  (cascades to queue too — but we already wrote 'succeeded')
//   3. After delete, fire Resend email 'account-deleted-confirmation' to the saved email-address
//      (Saved BEFORE step 1 because user row is gone post-delete.)
//   4. Insert audit-log row 'account_hard_deleted' (audit_log is cross-user; survives user-delete)
```

---

### 5.2 RPCs (database functions)

Both ship in the migration in §4.1. Repeated here for visibility:

| Function | Args | Returns | Security | Caller |
|---|---|---|---|---|
| `request_account_deletion()` | (none — uses `auth.uid()`) | `timestamptz` (scheduled-purge-at) | `SECURITY DEFINER`, `search_path = public, pg_temp` | Edge Function 5.1.1 |
| `restore_account()` | (none) | `boolean` (true if restored) | `SECURITY DEFINER`, same search path | Edge Function 5.1.2 |

`GRANT EXECUTE … TO authenticated`. Anonymous role cannot call.

### 5.3 Cron jobs

| Name | Schedule | Function path | Retry policy | Idempotency | Lock | Owner |
|---|---|---|---|---|---|---|
| `delete-account-cron` | `0 3 * * *` (daily 03:00 UTC) | `/api/cron/delete-account` | Per (user_id, step) row; up to 5 attempts; terminal failure caps + opens Sentry alert | Per-row status flag (`pending` → `in_progress` → `succeeded`/`failed_terminal`); per-HTTP-call idempotency-key | `SELECT FOR UPDATE SKIP LOCKED` on each queue row | Cluster 01 |

Vercel Cron config in `kova-open-pencil-1/vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/delete-account",
      "schedule": "0 3 * * *"
    }
  ]
}
```

Cron-secret authentication header: `Authorization: Bearer ${CRON_SECRET}`. `CRON_SECRET` env var is **server-only** (NEVER `VITE_` prefix per CLAUDE.md secrets rule).

### 5.4 External integrations

| Integration | SDK / version | What this PRD uses | Webhooks |
|---|---|---|---|
| **Supabase Auth** | `@supabase/supabase-js` (already installed) | `signInWithOtp` (magic-link), `verifyOtp` (6-digit code OR email token), `updateUser({ email })`, `signOut`, `getUser`, `onAuthStateChange`, `admin.deleteUser` (cascade `db` step uses RPC + raw delete, not admin API) | None directly — Auth events bubble through the SDK client |
| **Resend** | `resend` npm package (NEW dep) | Email send: deletion-scheduled, deletion-completed, deletion-restored, email-change-confirmation-to-old, email-change-confirmation-to-new (Supabase-sent for the verify-link itself — we customize via Supabase email templates) | None |
| **Stripe** | `stripe` npm package (Cluster 04 installs; this PRD's cron step uses it conditionally — see 5.1.4.1) | `subscriptions.cancel`, `customers.del` | None (Cluster 04 ships `stripe-webhook`) |
| **Shopify Admin API** | direct fetch (existing M9 pattern) | `POST /admin/api/2024-01/access_tokens/{id}/revoke` | M9 already ships `shop/uninstalled` webhook handler |
| **Anthropic** | DB-side delete + manual-batch operator workflow (see 5.1.4.3) | n/a (DB-only at cron level) | None |

#### 5.4.1 Supabase Auth configuration

Apply via Supabase Studio / CLI before launch:

| Setting | Value | Why |
|---|---|---|
| Email Auth → Confirm email enabled | YES | Required for magic-link |
| Email Auth → Secure email change enabled | YES | Sends verify-link to new address (B5.1 / B5.2 flow) |
| Email Auth → Magic Link expiry | `1800` sec (30 min) | Matches B4.1 copy ("Magic links last 30 minutes for security") |
| Email Auth → OTP expiry | `300` sec (5 min) | Industry standard short window |
| Email Auth → OTP length | `6` | Matches A15.04 cell count |
| Email Auth → Max OTP attempts | `5` (server-side) | Matches B4.4 lockout copy |
| Sessions → JWT expiry | `3600` sec (1 hr) | Refresh token rotates |
| Sessions → Refresh token lifetime | `30` days (when "Keep me signed in" toggled on) / `1` day otherwise | Matches A15.06 toggle copy |
| Rate limits → email send | `4` per hour per recipient | Supabase default; doesn't conflict with our app-level retry-after timer |
| Email templates | Customized (see §5.4.2) | Supabase default templates are too generic |

#### 5.4.2 Email templates (Supabase + Resend)

Supabase-sent (templated via Supabase Studio):
- Magic link signup confirmation
- Magic link sign-in
- Email change verify (to new address)
- (Forgot-password reset — only when email+password upgrade ships)

Resend-sent from our Edge Functions:
- `account-deletion-scheduled.html` (sent on POST /api/account/deletion-request; includes restore link → `/account-pending-deletion`)
- `account-deletion-completed.html` (sent at cron end, after all 5 steps succeeded)
- `account-restored.html` (sent on POST /api/account/restore)
- `email-change-notification-to-old.html` (sent on POST /api/auth/email-change-request to old address only)

All Resend templates use Inter, Kova branding, plain-text fallback, valid List-Unsubscribe header. Template HTML files live at `kova-open-pencil-1/emails/account/*.html`. Cluster 11 ships a shared `<EmailShell>` template — this PRD's templates extend it.

### 5.5 Compliance + docs deliverables

| Deliverable | Location | Purpose |
|---|---|---|
| Privacy Policy | `kova-open-pencil-1/docs/legal/privacy-policy.md` | Public-facing privacy doc. Names every sub-processor (Stripe, Shopify, Anthropic, Resend, Supabase). Documents 30-day deletion window. Documents Supabase 7-day PITR backup window. Discloses Anthropic deferred-manual deletion step. Per `00e §6 #4` (D-3) explicitly names "storefront content analyzed for brand-voice inference" as Anthropic data flow. |
| Record of Processing Activities (RoPA) | `kova-open-pencil-1/docs/legal/ropa.md` | Internal compliance doc. Per-sub-processor: purpose, data categories, retention, deletion mechanism. Lists cascade order in the GDPR cron. |
| Terms of Service | `kova-open-pencil-1/docs/legal/terms.md` | Public-facing terms. Drafted in this PRD; legal review pre-launch. |
| `users` schema commentary | inline `COMMENT ON COLUMN` in the migration | Self-documenting `deleted_at` + `preferences`. |
| Operator runbook — Anthropic manual deletion | `kova-open-pencil-1/docs/operations/anthropic-manual-deletion-runbook.md` | Step-by-step for whoever batches `anthropic_deletion_log` rows into emails to privacy@anthropic.com. Ships post-Wave 1 if not before launch. |

---

## 6. Frontend

### 6.1 Routes (Vue Router)

```typescript
// kova-open-pencil-1/src/router/routes.ts (extend existing)
// All routes carry meta: { theme: 'light' | 'dark', requiresAuth: boolean, viewportGuard: 'desktop' | null }

const authRoutes = [
  // Pre-auth surfaces (light, no auth required, redirect-if-signed-in)
  {
    path: '/signup',
    name: 'signup',
    component: () => import('@/views/auth/SignupView.vue'),
    meta: { theme: 'light', requiresAuth: false, redirectIfAuth: true, viewportGuard: 'desktop' },
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/auth/LoginView.vue'),
    meta: { theme: 'light', requiresAuth: false, redirectIfAuth: true, viewportGuard: 'desktop' },
  },
  {
    path: '/forgot-password',
    name: 'forgot-password',
    component: () => import('@/views/auth/ForgotPasswordView.vue'),
    meta: { theme: 'light', requiresAuth: false, redirectIfAuth: true, viewportGuard: 'desktop' },
  },

  // Magic-link / OTP error redirect routes (light)
  {
    path: '/auth/magic',
    name: 'auth-magic',
    component: () => import('@/views/auth/MagicLinkErrorView.vue'),
    meta: { theme: 'light', requiresAuth: false, viewportGuard: 'desktop' },
    // Query: ?status=expired | invalid
  },

  // Post-magic-link callback (light)
  {
    path: '/auth/callback',
    name: 'auth-callback',
    component: () => import('@/views/auth/AuthCallbackView.vue'),
    meta: { theme: 'light', requiresAuth: false, viewportGuard: 'desktop' },
  },

  // Email-change verify landing (light)
  {
    path: '/auth/email-change/verify',
    name: 'auth-email-change-verify',
    component: () => import('@/views/auth/EmailChangeVerifyView.vue'),
    meta: { theme: 'light', requiresAuth: false, viewportGuard: 'desktop' },
    // Query: ?status=success | expired
  },

  // Session expired bridge (dark, pre-auth)
  {
    path: '/auth/session-expired',
    name: 'auth-session-expired',
    component: () => import('@/views/auth/SessionExpiredView.vue'),
    meta: { theme: 'dark', requiresAuth: false, viewportGuard: 'desktop' },
  },

  // Account pending deletion intercept (dark, post-sign-in)
  {
    path: '/account-pending-deletion',
    name: 'account-pending-deletion',
    component: () => import('@/views/auth/AccountPendingDeletionView.vue'),
    meta: { theme: 'dark', requiresAuth: true, allowDeletedAccount: true, viewportGuard: 'desktop' },
  },

  // Mobile / desktop-only fallback (light, responsive — no viewport guard since this IS the fallback)
  {
    path: '/desktop-only',
    name: 'desktop-only',
    component: () => import('@/views/auth/DesktopOnlyView.vue'),
    meta: { theme: 'light', requiresAuth: false, viewportGuard: null },
  },

  // Legal pages (light, no auth, no viewport guard — must be readable on mobile)
  {
    path: '/privacy',
    name: 'privacy',
    component: () => import('@/views/legal/PrivacyPolicyView.vue'),
    meta: { theme: 'light', requiresAuth: false, viewportGuard: null },
  },
  {
    path: '/terms',
    name: 'terms',
    component: () => import('@/views/legal/TermsView.vue'),
    meta: { theme: 'light', requiresAuth: false, viewportGuard: null },
  },
]
```

### 6.2 Router guards (`auth-middleware`)

```typescript
// kova-open-pencil-1/src/router/guards/auth-guard.ts
//
// Runs on every route navigation. Composes three checks in order:
//
//   1. viewportGuardCheck   — desktop-only redirect if meta.viewportGuard === 'desktop' and window.innerWidth < 1024
//   2. sessionCheck         — Supabase session validity + deleted-account detection
//   3. authRequiredCheck    — redirect to /login if !session && meta.requiresAuth
//
// Order is deliberate: viewport first (cheap, no DB hit) before session refresh.

export const authGuard: NavigationGuard = async (to, from) => {
  // 1. Viewport
  if (to.meta.viewportGuard === 'desktop' && window.innerWidth < 1024 && to.name !== 'desktop-only') {
    return { name: 'desktop-only', query: { redirect: to.fullPath } }
  }

  // 2. Session check
  const auth = useAuthStore()
  const session = await auth.getCurrentSession()

  if (session) {
    // Check if account is pending deletion
    if (auth.profile?.deleted_at) {
      if (!to.meta.allowDeletedAccount) {
        return { name: 'account-pending-deletion' }
      }
    }
    // If signed in and on a sign-in route, redirect to dashboard
    if (to.meta.redirectIfAuth) {
      return { name: 'dashboard' }
    }
  } else {
    // No session
    if (to.meta.requiresAuth) {
      return { name: 'login', query: { redirect: to.fullPath } }
    }
  }

  return true
}
```

Session-expired detection happens **inside the protected app shell**, not in the router guard. A separate `use-session-watcher` composable (§6.3) listens to `supabase.auth.onAuthStateChange('TOKEN_REFRESHED' | 'SIGNED_OUT')` events and on refresh failure routes to `/auth/session-expired`. This pattern matches Supabase recommendations.

### 6.3 Composables

| Composable | File | Signature | Used by |
|---|---|---|---|
| `useMagicLink` | `src/composables/auth/use-magic-link.ts` | `{ send(email: string): Promise<{ ok: true } \| { ok: false; reason: 'rate_limited' \| 'invalid_email' \| 'no_account' \| 'unknown' }>; cooldown: ComputedRef<number>; }` | `SignupView`, `LoginView` |
| `useOtp` | `src/composables/auth/use-otp.ts` | `{ digits: Ref<string[]>; submit(): Promise<{ ok: true } \| { ok: false; reason: 'wrong_code' \| 'locked_out' \| 'expired' }>; attemptsLeft: ComputedRef<number>; locked: ComputedRef<boolean>; reset(): void; }` | `LoginView` (OTP state) |
| `useAccountDeletion` | `src/composables/auth/use-account-deletion.ts` | `{ requestDeletion(): Promise<{ scheduled_purge_at: string }>; restoreAccount(): Promise<boolean>; pending: ComputedRef<boolean>; scheduledPurgeAt: ComputedRef<string \| null>; }` | `DangerZone` (Cluster 04 consumes), `AccountPendingDeletionView` |
| `useEmailChange` | `src/composables/auth/use-email-change.ts` | `{ requestChange(newEmail: string): Promise<{ ok: true } \| { ok: false; reason: 'in_use' \| 'invalid' \| 'rate_limited' }>; cooldown: ComputedRef<number>; }` | `ProfileSection` (Cluster 04 consumes) |
| `useSessionWatcher` | `src/composables/auth/use-session-watcher.ts` | `(): void` (mount inside `<App>` shell only); listens to `supabase.auth.onAuthStateChange`; routes to `/auth/session-expired` on token-refresh failure | `App.vue` (mount once) |
| `useViewportGuard` | `src/composables/auth/use-viewport-guard.ts` | `(): { isDesktop: ComputedRef<boolean>; isTablet: ComputedRef<boolean>; isMobile: ComputedRef<boolean> }`; reactive on `resize`/`orientationchange` | `DesktopOnlyView` (rotate-listener auto-reload behavior) |

### 6.4 Components

#### 6.4.1 Page components (one per route, lazy-loaded)

| Component | File | Hi-fi reference |
|---|---|---|
| `SignupView` | `src/views/auth/SignupView.vue` | A15.01 + B4.5 inline-error |
| `LoginView` | `src/views/auth/LoginView.vue` | A15.02 + A15.03 + A15.04 + B4.3 + B4.4 + B4.6 (state machine in component) |
| `ForgotPasswordView` | `src/views/auth/ForgotPasswordView.vue` | A15.05 |
| `MagicLinkErrorView` | `src/views/auth/MagicLinkErrorView.vue` | B4.1 + B4.2 |
| `AuthCallbackView` | `src/views/auth/AuthCallbackView.vue` | A15.06 |
| `EmailChangeVerifyView` | `src/views/auth/EmailChangeVerifyView.vue` | B5.1 + B5.2 |
| `SessionExpiredView` | `src/views/auth/SessionExpiredView.vue` | B4.7 |
| `DesktopOnlyView` | `src/views/auth/DesktopOnlyView.vue` | B6.1 + B6.2 |
| `AccountPendingDeletionView` | `src/views/auth/AccountPendingDeletionView.vue` | NEW — composes B4.7 chrome + A4 modal pattern (no dedicated hi-fi) |
| `PrivacyPolicyView` | `src/views/legal/PrivacyPolicyView.vue` | Long-form markdown render |
| `TermsView` | `src/views/legal/TermsView.vue` | Long-form markdown render |

#### 6.4.2 Shared auth-shell components (consumed by every auth page)

| Component | Props | Slots | Emits | Hi-fi origin |
|---|---|---|---|---|
| `AuthShell` (`src/components/auth/AuthShell.vue`) | `theme: 'light' \| 'dark'` (default light); `cornerSlot?: VNode` (optional top-right link); `bottomSlot?: VNode` (default = Status/Docs/Contact links) | `default` (stage content) | none | A15 `.auth-shell` |
| `AuthCard` (`src/components/auth/AuthCard.vue`) | `width?: 'standard' \| 'wide' \| 'fallback'` (380 / 420 / 480 px); `iconLed?: boolean` | `default` | none | A15 `.auth-card` |
| `AuthHeading` (`src/components/auth/AuthHeading.vue`) | `eyebrow?: string`; `title: string`; `lede?: string` | none | none | A15 `.auth-head` |
| `AuthField` (`src/components/auth/AuthField.vue`) | `label: string`; `type: 'email' \| 'text'`; `modelValue: string`; `error?: string`; `helpLink?: { label: string; href: string }`; `helpText?: string`; `state?: 'idle' \| 'error' \| 'locked'` | none | `update:modelValue`, `submit` (on Enter) | A15 `.auth-field` |
| `OtpInput` (`src/components/auth/OtpInput.vue`) | `length: number` (default 6); `digits: string[]`; `state?: 'idle' \| 'error' \| 'locked'`; `disabled?: boolean` | none | `update:digits`, `complete` (when all cells filled) | A15.04 `.auth-otp` |
| `AuthCta` (`src/components/auth/AuthCta.vue`) | `variant: 'primary' \| 'secondary'`; `loading?: boolean`; `disabled?: boolean`; `icon?: string` | `default` (label) | `click` | A15 `.auth-cta` / `.auth-second` |
| `AuthMedal` (`src/components/auth/AuthMedal.vue`) | `tone: 'ok' \| 'pending'`; `icon: string` | none | none | A15.06 `.auth-medal` (48×48 medal) |
| `AuthIcon` (`src/components/auth/AuthIcon.vue`) | `tone: 'ok' \| 'dim'`; `icon: string` | none | none | B5 / B6 `.auth-icon` (24×24 inline) |
| `MagicLinkSentBlock` (`src/components/auth/MagicLinkSentBlock.vue`) | `email: string`; `resendCooldown: number` (seconds; 0 = ready); `tagState?: 'delivered' \| 'pending'` | none | `resend` | A15.03 `.auth-sent` |
| `PersistentSessionToggle` (`src/components/auth/PersistentSessionToggle.vue`) | `modelValue: boolean` (default `true` — pre-toggled on per A15.06 annotation) | none | `update:modelValue` | A15.06 `.auth-route` |
| `DangerZoneCard` (`src/components/account/DangerZoneCard.vue`) | (none — internal state) | none | `requested` (on confirm) | Composes `<KovaModal>` (Cluster 11) + typed-confirm pattern from A4.2 / A9 modal hi-fi. **Lives in `components/account/` not `components/auth/`** because Cluster 04 mounts it inside the Account page sidebar's Danger zone section. This PRD owns the modal logic + the `request_account_deletion` flow it triggers. |

#### 6.4.3 The `LoginView` state machine

`LoginView.vue` carries 5 states (no separate route per state): `email-entry` (A15.02), `magic-link-sent` (A15.03), `otp-entry` (A15.04), `otp-wrong` (B4.3 inline), `otp-locked` (B4.4). State transitions:

```
email-entry  --(submit email, magic-link path)--> magic-link-sent
email-entry  --(click "Use code instead")------>  otp-entry
magic-link-sent --(click "Enter code instead")-> otp-entry
otp-entry    --(submit, wrong)----------------->  otp-wrong  --(edit cells)--> otp-entry (with attemptsLeft--)
otp-entry    --(submit, 5 attempts exhausted)->  otp-locked  --(click "Request new code")--> email-entry
otp-entry    --(submit, success)-->              redirect to /auth/callback (via Supabase verifyOtp)
```

Inline-error states (B4.6 user-not-found, B4.5 email-exists) are surfaced in `email-entry` state via the `error` prop on `<AuthField>`. The decision per `00e §6` + §12 risk register dictates whether B4.5/B4.6 ship as drawn (clear UX, allows enumeration) or pivot to enumeration-safe ("If this email is registered, we sent you a link"). **Default behavior in this draft = ship as drawn (matches hi-fi exactly); founder confirms in §12.5.**

### 6.5 Drag-and-drop handlers

N/A for this cluster.

---

## 7. Tool layer / canvas-engine touches

N/A — this PRD does not touch `packages/core/`, the canvas renderer, or any scene-graph type. Auth lives entirely above the canvas engine.

---

## 8. Acceptance criteria

Every line is testable in code or browser. No "feels right." Engineers verify each before founder review.

### 8.1 Pre-auth flows

- [ ] User can submit `/signup` with a fresh email and receive a magic-link email within 30 seconds (Resend SLA)
- [ ] Clicking the magic-link in email lands the user at `/auth/callback` with a valid session
- [ ] User on `/auth/callback` with no existing brands is routed to `/onboarding` (Cluster 02)
- [ ] User on `/auth/callback` with one brand is routed to that brand's dashboard
- [ ] User on `/auth/callback` with multiple brands is routed to `/dashboard` (brand picker)
- [ ] "Keep me signed in on this device" toggle on A15.06 sets a 30-day refresh-token lifetime; toggled-off → 1-day lifetime
- [ ] `/login` submit with a known email sends a magic-link; submit with an unknown email shows B4.6 inline error (or enumeration-safe variant pending §12.5)
- [ ] `/login` "Use a 6-digit code instead" flips to OTP entry; entering correct 6-digit code lands at `/auth/callback`
- [ ] OTP wrong-code state (B4.3) shows "Wrong code · N attempts left" and keeps cells filled
- [ ] OTP at 5 wrong attempts locks; dim-dot cells render; secondary CTA disappears; "Request new code" routes back to `email-entry` state
- [ ] Resend-cooldown timer counts down from 60 seconds; clicking before 0 is no-op
- [ ] `/forgot-password` is hidden from `/login`'s field-label "Forgot password?" link IF email+password upgrade is not shipped (controlled by hard-coded `FORGOT_PASSWORD_ENABLED=false` feature flag for MVP)

### 8.2 Auth error surfaces

- [ ] Clicking an expired magic-link routes to `/auth/magic?status=expired` (B4.1)
- [ ] Clicking an already-used or malformed magic-link routes to `/auth/magic?status=invalid` (B4.2)
- [ ] B4.1 primary CTA "Send a new link" carries the user's email through (does NOT make them re-type)
- [ ] B4.2 single CTA "Sign in" routes to `/login` with empty email field
- [ ] Signup with an existing email shows B4.5 inline error with accent-link "sign in instead" routing to `/login`
- [ ] Login with non-existent email shows B4.6 inline error with accent-link "sign up instead" routing to `/signup` (pending §12.5)

### 8.3 Email change

- [ ] POST to `/api/auth/email-change-request` with a valid new email triggers Supabase verify-link AND a notification email to the old address
- [ ] Clicking the verify-link routes to `/auth/email-change/verify?status=success` (B5.1)
- [ ] Clicking the verify-link >24 hours after request routes to `/auth/email-change/verify?status=expired` (B5.2)
- [ ] B5.1 primary CTA routes to `/account/profile` (Cluster 04 — `/account` page must exist at this point or the route shows a 404)
- [ ] "Revert email change" foot link on B5.1 (per hi-fi annotation) routes to a confirm modal then triggers another email-change-request back to the old address. **Decision per hi-fi: route through confirm step (irreversible action).**

### 8.4 Session lifecycle

- [ ] On Supabase token-refresh failure mid-session, the app routes to `/auth/session-expired` (B4.7)
- [ ] B4.7 "Sign in" CTA routes to `/login`; "Go to dashboard" secondary stays visually disabled (no click handler bound)
- [ ] After signing in from B4.7, the redirect honors the `?redirect=` query param if present and valid
- [ ] User signed out manually (avatar dropdown → Sign out) goes to `/login` directly (NOT through `/auth/session-expired`)

### 8.5 Mobile fallback

- [ ] Loading any `meta.viewportGuard='desktop'` route on a viewport <640 px redirects to `/desktop-only` with B6.1 copy
- [ ] Loading on 640–1023 px viewport redirects to `/desktop-only` with B6.2 copy (laptop glyph, "I'll rotate my tablet")
- [ ] On `/desktop-only` (B6.2), rotating to landscape ≥1024 px auto-reloads into the originally-requested route
- [ ] Mailto-prefill on B6.1 / B6.2 launches the system mail client with subject + body pre-filled
- [ ] `/privacy` and `/terms` render correctly on any viewport (no fallback redirect)

### 8.6 GDPR cascade

- [ ] User on `/account` Danger-zone clicks "Delete account" → typed-confirm modal "type DELETE to confirm" appears (Cluster 04 mounts; this PRD ships the modal logic via `<DangerZoneCard>`)
- [ ] On confirm → `POST /api/account/deletion-request` → `users.deleted_at` set → 5 queue rows inserted → email sent → user signed out (clientside)
- [ ] On next sign-in within 30 days → auth guard routes to `/account-pending-deletion`
- [ ] `/account-pending-deletion` shows scheduled-purge timestamp + "Restore account" CTA
- [ ] Clicking "Restore" → `POST /api/account/restore` → `users.deleted_at` cleared → pending queue rows deleted → email sent → routed to dashboard
- [ ] After 30 days, daily cron at 03:00 UTC processes the queue:
  - [ ] `stripe` step: subscription canceled + customer deleted (idempotent; safe to retry)
  - [ ] `shopify` step: per-brand OAuth tokens revoked; brand rows null'd
  - [ ] `anthropic` step: `chat_conversations` + `chat_messages` DELETEd; `anthropic_deletion_log` row inserted
  - [ ] `storage` step: all user-owned Storage paths deleted (4 buckets)
  - [ ] `db` step: `users` row deleted → FK cascade clears brands / canvases / media / etc.
- [ ] After all 5 steps succeed → final email "account-deleted-confirmation" sent to saved email
- [ ] If a step fails 5 times → row marked `failed_terminal`; Sentry alert opens; user row NOT deleted; cascade pauses
- [ ] Concurrent cron runs do not double-process the same queue row (verified by `SELECT FOR UPDATE SKIP LOCKED` test)
- [ ] If `STRIPE_SECRET_KEY` is not configured (pre-Cluster-04 dev), `stripe` step degrades gracefully (logs + marks succeeded with note)

### 8.7 Security

- [ ] `users.deleted_at` cannot be mutated by a client-side authenticated request (RLS test)
- [ ] `gdpr_deletion_queue` cannot be SELECTed or mutated by `authenticated` role (RLS test)
- [ ] `/api/cron/delete-account` returns 401 without `Authorization: Bearer ${CRON_SECRET}` header (test against synthetic request)
- [ ] `/api/cron/delete-account` does not expose internal error details in the 500 response (sanitized error body)
- [ ] `ANTHROPIC_API_KEY`, `STRIPE_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `CRON_SECRET` are server-only env vars (no `VITE_` prefix; Vite build verifies via grep — see §9.5)
- [ ] No `access_token` lands in URL query strings during onboarding (security launch-blocker per `00e §6 / 00d` D-1) — verified in Cluster 02; this PRD does NOT use access_token-in-URL pattern (auth callback uses Supabase's standard PKCE-style code exchange)
- [ ] OWASP recommendation: notify both addresses on email change. Implemented (§5.1.3).
- [ ] Privacy policy is published at `/privacy` before any user-facing deployment

### 8.8 Compliance (GDPR Art. 17 + Art. 19)

- [ ] Privacy Policy names: Stripe, Shopify, Anthropic, Resend, Supabase as sub-processors
- [ ] Privacy Policy documents the 30-day soft-delete window
- [ ] Privacy Policy documents the Supabase 7-day PITR backup window (`feedback_explain_for_nontechnical_founder` reminder: rephrase this for legal review — backups expire 7 days after the user is hard-deleted)
- [ ] Privacy Policy explicitly names "storefront content analyzed for brand-voice inference" as an Anthropic data flow (per `00e §6 #4` D-3)
- [ ] RoPA document lists per-step cascade order + retention policy + sub-processor purpose
- [ ] Operator runbook for Anthropic manual deletion is published before launch

---

## 9. Test plan

### 9.1 Unit tests (`bun run test:unit`)

Target coverage: ≥85% on auth composables + middleware + cascade step handlers.

| Test file | Covers |
|---|---|
| `tests/unit/composables/auth/use-magic-link.test.ts` | `useMagicLink.send` — happy path, rate-limited, invalid email, no-account, unknown error; cooldown timer reactivity |
| `tests/unit/composables/auth/use-otp.test.ts` | Digit input, auto-advance, submit, wrong-code state, locked-out state, attemptsLeft computed, reset |
| `tests/unit/composables/auth/use-account-deletion.test.ts` | Request deletion (success, already-pending, 401, 500); restore (success, no-pending, 401); pending + scheduledPurgeAt reactivity |
| `tests/unit/composables/auth/use-email-change.test.ts` | Happy path + every failure reason; cooldown |
| `tests/unit/composables/auth/use-session-watcher.test.ts` | Mock `supabase.auth.onAuthStateChange`; assert route push on `TOKEN_REFRESHED` failure |
| `tests/unit/composables/auth/use-viewport-guard.test.ts` | window.innerWidth mocking; resize event; orientationchange event |
| `tests/unit/router/guards/auth-guard.test.ts` | viewport-first, session-second, requiresAuth-third ordering; deleted-account intercept; redirect-if-auth; query.redirect carry-through |
| `tests/unit/api/account/deletion-request.test.ts` | Mock Supabase RPC + Resend send + audit_log insert; assert idempotency-key dedup; rate-limit branch |
| `tests/unit/api/account/restore.test.ts` | Mock RPC + email + audit log; no-pending → 409 |
| `tests/unit/api/auth/email-change-request.test.ts` | Supabase admin.updateUserById mock + Resend old-address mock + audit log; invalid email, in-use, rate-limited |
| `tests/unit/api/cron/delete-account.test.ts` | Per-step success / retriable-error / terminal-error branches; `SELECT FOR UPDATE SKIP LOCKED` mock; concurrency safety; final email; Sentry alert on terminal failure |
| `tests/unit/api/cron/steps/stripe.test.ts` | Subscription cancel idempotency; customer-not-found = success; STRIPE_SECRET_KEY absent → graceful degrade |
| `tests/unit/api/cron/steps/shopify.test.ts` | Per-brand iteration; OAuth revoke 401/404 = success; M9 disconnect-shop reuse |
| `tests/unit/api/cron/steps/anthropic.test.ts` | DB DELETEs + `anthropic_deletion_log` insert; idempotency |
| `tests/unit/api/cron/steps/storage.test.ts` | Per-bucket per-path iteration; missing-path = success; pagination |
| `tests/unit/api/cron/steps/db.test.ts` | Status update BEFORE delete (so cron sees succeeded); final email fired |
| `tests/unit/components/auth/AuthShell.test.ts` | Theme prop renders correct stylesheet attribute; corner slot; bottom slot defaults |
| `tests/unit/components/auth/OtpInput.test.ts` | Digit entry, auto-advance, backspace, paste handling (6-digit paste fills all cells); `complete` emit on full row; locked state |
| `tests/unit/components/auth/PersistentSessionToggle.test.ts` | v-model bidirectional |
| `tests/unit/components/account/DangerZoneCard.test.ts` | Typed-confirm gating; modal open/close; emit on confirm |

### 9.2 Integration tests (`bun run test:unit` against a local Supabase)

Per `project_pre_prd_audit_ratified.md` decision (local Supabase + CI ephemeral, free, non-negotiable). Run against `supabase start` local instance with migrations applied. Cleanup via test-isolated user IDs.

| Test file | Covers |
|---|---|
| `tests/integration/auth/migrations.test.ts` | Apply migration; verify `users.deleted_at` + `users.preferences` + `gdpr_deletion_queue` exist with correct constraints; RLS enabled |
| `tests/integration/auth/rpc-request-account-deletion.test.ts` | Call RPC as `authenticated`; verify `deleted_at` set; 5 queue rows inserted; re-call returns same scheduled timestamp (RPC raises on second call — handled as 409 by API layer) |
| `tests/integration/auth/rpc-restore-account.test.ts` | Call RPC within 30 days → true; after 30 days → false; pending queue rows deleted on restore; succeeded queue rows preserved |
| `tests/integration/auth/rls-gdpr-queue.test.ts` | `authenticated` role SELECT/INSERT/UPDATE/DELETE on `gdpr_deletion_queue` all return 0 rows / fail |
| `tests/integration/auth/rls-users-deleted-at.test.ts` | `authenticated` role UPDATE `users` SET `deleted_at = NULL` returns "row updated 0" (existing RLS prevents) |
| `tests/integration/api/deletion-request.test.ts` | End-to-end: sign in test user, POST deletion-request, verify queue + email send call + sign-out |
| `tests/integration/api/cron-delete-account.test.ts` | Seed user with `deleted_at = now() - 31 days`, queue rows pending; invoke cron; verify all 5 steps execute in order; verify user row deleted; verify queue cascade'd |
| `tests/integration/api/cron-failure-modes.test.ts` | Inject Stripe API 500 on step `stripe`; verify retry; after 5 attempts → `failed_terminal`; user NOT deleted; Sentry mock invoked |

### 9.3 E2E tests (Playwright — `bun run test`)

Smoke tests via Vercel Agent Browser preferred per `e2e-runner` agent default. Playwright fallback. Critical user flows only — exhaustive coverage stays in unit/integration.

| Spec | Covers |
|---|---|
| `tests/e2e/auth/signup-flow.spec.ts` | Open `/signup`, submit email, intercept Resend mock send, click test magic-link, land at `/auth/callback`, verify session in localStorage |
| `tests/e2e/auth/login-otp.spec.ts` | Open `/login`, click "Use code instead", type 6 digits (from Resend mock), land at `/auth/callback` |
| `tests/e2e/auth/login-otp-wrong-then-success.spec.ts` | Enter wrong code (verify B4.3 state), edit cells, enter right code, land at callback |
| `tests/e2e/auth/desktop-only-fallback.spec.ts` | Set viewport 375 → navigate `/login` → assert `/desktop-only` (B6.1); set viewport 768 → assert B6.2; set viewport 1440 → assert `/login` |
| `tests/e2e/auth/session-expired-bridge.spec.ts` | Sign in, manually expire JWT via test helper, trigger an authenticated API call, assert route to `/auth/session-expired`, click Sign in, redirect-param carries through to dashboard |
| `tests/e2e/auth/deletion-grace-restore.spec.ts` | Sign up, request deletion, sign out, sign in again within 30 days, assert `/account-pending-deletion`, click Restore, assert dashboard |
| `tests/e2e/auth/email-change-flow.spec.ts` | Sign in, POST email-change, verify two emails sent (Resend mock count), click new-address verify link, assert B5.1 |

### 9.4 Manual QA (founder browser smoke)

Per `feedback_browser_smoke_test_before_done` memory — required before claiming the feature done.

- [ ] Sign up with a real email; click magic-link from real inbox; land at `/auth/callback`; click "Continue to Kova" → onboarding (assumes Cluster 02 ships before this can be fully smoked; pre-Cluster-02 the redirect target shows a placeholder "Welcome" page)
- [ ] Sign in with a known email via OTP; type wrong code; observe B4.3; type right code
- [ ] Open the app on a phone; observe `/desktop-only`; click "Email myself a desktop link"; receive email
- [ ] Open the app on a tablet (portrait); observe `/desktop-only` B6.2; rotate to landscape; observe auto-reload into `/login`
- [ ] Change email via `/account/profile` (Cluster 04 in place); receive both notifications; click verify-link in new inbox; observe B5.1; old email still receives the notification with revert link
- [ ] Request account deletion from `/account` Danger zone; type DELETE; submit; observe sign-out + confirmation email
- [ ] Sign in within 30 days; observe `/account-pending-deletion`; restore; observe email + dashboard
- [ ] Trigger cron manually (`vercel cron invoke delete-account-cron` in staging); observe sub-processor cascades + final email

### 9.5 Pre-commit + CI verifications

- `bun run check` — oxlint + type-check zero errors
- `bun run format` — oxfmt no diff
- `bun run test:unit` — all green
- `bun run test:dupes` — jscpd < 3%
- Grep: no `VITE_` prefix on `STRIPE_SECRET_KEY`, `ANTHROPIC_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `CRON_SECRET`
- Grep: no `access_token` query-string assignment in source files (`grep -r "access_token=" src/` returns 0)

---

## 10. Rollout phasing

### Phase A — initial deploy (Wave 1 close)

- Migration `20260520_01_users_account_lifecycle` applied to local + staging Supabase
- All Vue routes 6.1 wired (some placeholder targets for `dashboard` until Cluster 02 lands)
- Edge Functions 5.1.1 + 5.1.2 + 5.1.3 + 5.1.4 deployed (cron NOT yet active in production — see Phase B)
- Auth guard active
- All composables + components shipped
- Privacy + Terms + RoPA + operator runbook docs published
- Supabase Auth config applied per §5.4.1
- Resend integrated + email templates deployed
- `bun run test:unit` 100% green for new files + ≥85% coverage on auth code

### Phase B — pre-launch activation

- Vercel Cron schedule activated in production once Cluster 04 ships and Stripe foundation is in place
- Sentry alert rules wired for `gdpr_deletion_queue` terminal-failure events + cron error rate >0
- ZDR onboarding with Anthropic begins (per §5.1.4.3 — replaces manual deletion runbook)
- Privacy/RoPA legal review complete
- E2E test pack runs green in staging
- Founder manual smoke pass (§9.4) completed against staging

### Feature flags (per `00d` 2.B 10 default — hard-coded constants for MVP)

| Flag | Default | Toggle condition |
|---|---|---|
| `FORGOT_PASSWORD_ENABLED` | `false` | Flip when email+password upgrade ships (Phase 2) |
| `B4_6_ENUMERATION_SAFE` | `false` (default = show drawn B4.6) | Flip if founder pivots per §12.5 |
| `OTP_LOCKOUT_ATTEMPTS` | `5` | Adjust if abuse signals appear |
| `OTP_LOCKOUT_MINUTES` | `15` | Adjust based on Supabase config |
| `ACCOUNT_DELETION_WINDOW_DAYS` | `30` | Hardcoded; matches GDPR + Figma SaaS pattern |
| `EMAIL_CHANGE_LINK_TTL_HOURS` | `24` | Matches Supabase default |
| `MAGIC_LINK_TTL_MINUTES` | `30` | Matches B4.1 copy |

---

## 11. Cross-cuts to other PRDs

| Other PRD | What we depend on (from them) | What they depend on us for |
|---|---|---|
| **11 — Shared UI Infrastructure** | `useToast()` composable; `<KovaModal>` shell; `useConfirm()` composable; skeletons; `<EmailShell>` shared template; `idempotency_keys` table + Edge-Function-side helper; error pages (`/404`, `/500`); Sentry integration; Resend SDK wrapper | Theme detection meta convention (we use `meta.theme` — they own the runtime stylesheet swap) |
| **04 — Account & Stripe** | `/account` route shell + sidebar; Profile section; Stripe Customer + subscription wiring | `<DangerZoneCard>` component; `useAccountDeletion` composable; `/account-pending-deletion` route + `<AccountPendingDeletionView>`; `users.deleted_at` schema; `email-change-request` Edge Function; `<AuthMedal>`, `<AuthIcon>` (Stripe-return surfaces B10 reuse them) |
| **02 — Onboarding & Dashboard** | `/dashboard` route; `/onboarding` route; brand-creation flow | Sign-in + sign-up flows; `/auth/callback` routing logic (post-callback redirect target); auth guard `requiresAuth` enforcement |
| **05 — Brand Kit & Drag-Drop** | `media-assets` + `brand-fonts` Storage buckets (deletion paths) | None (Cluster 01 deletes their data on cascade; they don't depend on us at runtime) |
| **09 — Version History** | `canvas-snapshots` Storage bucket (deletion paths) | None at runtime |
| **10 — AI Chat + Memory** | `chat_conversations` + `chat_messages` tables (cascade DELETE targets); `anthropic_deletion_log` table for the manual-batch operator workflow | None at runtime |
| **12 — Settings & User Preferences** | `usePreferencesStore` consumes `users.preferences` | `users.preferences` JSONB column ships in this PRD's migration |
| **06 — Canvas Editor Core Chrome** | Avatar dropdown (Sign out item) | `useAuthStore.signOut()` action |

### 11.1 Hygiene rules from `00e §6`

Acknowledged + enforced in this PRD:

- **No live multi-device canvas sync promises** (§6 #2): the "Keep me signed in on this device" toggle is per-device only; this PRD does NOT promise cross-device session coordination.
- **D-5E staging trigger** (§6 #3): persistent staging Supabase project required before Phase B cron activation. Trigger named here: "Wave 3 PRD 04 closure" (Account & Stripe landing). If Wave 3 slips, defer cron activation; manual deletion via operator runbook covers the gap.
- **D-3 RoPA disclosure** (§6 #4): privacy policy explicitly names "storefront content analyzed for brand-voice inference" as an Anthropic data flow. Required text included in `docs/legal/privacy-policy.md`.
- **D-3 brand-voice guardrail** (§6 #5): N/A in this PRD (owned by Cluster 05). Acknowledged for awareness.

---

## 12. Risks + open questions

### 12.1 RISK (Medium) — Cluster 04 Stripe sequencing

Cron `stripe` step depends on Stripe SDK + Customer rows existing. Cluster 04 ships these in Wave 3.

**Mitigation:** §5.1.4.1 specifies graceful degrade — if `STRIPE_SECRET_KEY` absent, step logs and marks `succeeded` with note `stripe-not-configured`. Cron stays activatable in dev/staging during Waves 1–2 without false failures. Production cron activation deferred to Phase B (after Cluster 04).

### 12.2 RISK (Medium) — Anthropic ZDR onboarding timing

Step `anthropic` per §5.1.4.3 ships a hybrid model (in-DB DELETE + manual operator email queue) at MVP. Until ZDR is in place with Anthropic, retention is best-effort.

**Mitigation:** Operator runbook published before launch. RoPA discloses the model. Founder + ops batch the `anthropic_deletion_log` rows into emails on a weekly cadence. Migrate to ZDR once volume justifies.

### 12.3 RISK (Low) — Restore-after-partial-cascade edge

If user requests deletion → cron starts → Stripe step succeeds → user restores within 30 days but BEFORE cron completes, Stripe Customer is gone.

**Mitigation:** Restore re-creates Stripe Customer on next subscription action (Cluster 04 owns). `restore_account` RPC explicitly does NOT undo `succeeded` queue rows. Edge case is rare (cron runs daily, restore window is 30 days — cron only starts work at day 30). Document in operator runbook.

### 12.4 ESCALATE: founder — B4.4 OTP lockout values

Hi-fi annotation B4.4 + sources: 5 attempts, 15-minute lockout. Per `00e §6` non-blocker. Default in this draft = `OTP_LOCKOUT_ATTEMPTS=5`, `OTP_LOCKOUT_MINUTES=15`. Supabase server-side has its own rate limits; our app-side gate is a UI affordance for messaging. **Decision needed:** ship these defaults, OR pick different numbers?

**Recommendation:** ship defaults; abuse signals tune later.

### 12.5 ESCALATE: founder — B4.6 enumeration risk

Hi-fi annotation B4.6 explicitly raises this. The drawn UX tells the user "no account with this email" → enables an attacker to probe whether an email is registered.

**Two options:**

| Option | UX | Security |
|---|---|---|
| **A. Ship as drawn (default)** | Clear messaging; user knows immediately to switch to signup | Allows enumeration |
| **B. Enumeration-safe pivot** | Always show A15.03 "Magic link sent to <email>" regardless of registration state | Prevents probing; user with no account never receives an email; user may sit confused on "magic link sent" forever |

**Recommendation:** ship A as drawn for MVP. Re-evaluate post-launch if any abuse signals surface. Toggle behavior is gated by `B4_6_ENUMERATION_SAFE` feature flag for instant pivot.

### 12.6 ESCALATE: founder — "Auto-submit OTP on 6th digit?"

Hi-fi A15 annotation flags this. UX trade-off: auto-submit feels fast but creates accidental submits on paste/keyboard mistakes. Manual submit gives the user one beat to look at what they typed.

**Recommendation:** **auto-submit on 6th digit AND submit triggers immediately** — saves a tap, matches industry norm (Stripe Checkout, Notion, Google). If wrong, the user lands in B4.3 with cells preserved, which is already the correct recovery affordance.

### 12.7 ESCALATE: founder — "Keep me signed in" default state

Hi-fi A15.06 shows toggle pre-toggled ON. This makes the 30-day refresh the default.

**Recommendation:** ship as drawn (pre-toggled ON). Matches Figma + Notion + Linear defaults. User can opt out for shared/library machines.

### 12.8 OPEN QUESTION — Email-change "Revert" button mechanics

B5.1 annotation says "Recommend confirm step (irreversible action)" for the foot-link "Revert email change". This PRD's §8.3 ships that. If founder wants a different model (one-click revert), flag.

### 12.9 OPEN QUESTION — Tablet auto-rotate-and-reload behavior

B6.2 annotation flags the "I'll rotate my tablet" button should auto-listen for orientation change + reload. This PRD ships the auto-listen behavior in `useViewportGuard`. Confirm or change to manual-reload-only?

**Recommendation:** ship auto-listen.

### 12.10 OPEN QUESTION — Account-pending-deletion view contents

No dedicated hi-fi exists. This PRD's §6.4.1 says "compose B4.7 chrome + A4 modal pattern". Confirm visual approach with founder, or sketch a dedicated hi-fi between PRD approval and implementation start?

**Recommendation:** compose at implementation time; if visual ambiguity surfaces, draft a quick hi-fi mid-stream. Not a blocker for PRD approval.

---

## 13. References

### 13.1 03-doc rows covered

- §2.14 Account / billing — Account row (the GDPR cascade orchestrator portion)
- §3C #5b — GDPR delete-account cascade orchestrator (full scope)
- §3C #1 cross-cut row 2 (user-preferences storage) — `users.preferences` column ships here
- §4 Q15 entry — RESOLVED via this PRD's §4 / §5

### 13.2 Q-decisions baked in

- **Q12** — `/account` is a full-page route with sidebar sections. This PRD ships `/account-pending-deletion` as a separate route (NOT a section).
- **Q13** — user-level scope. Account deletion is user-level (cascades all owned brands).
- **Q15** — 30-day soft-delete + daily hard-delete cron cascading Stripe + Shopify + Anthropic + Storage + DB. Full GDPR Art. 17 + Art. 19 cascade.

### 13.3 Hi-fi files

- `main-main-kova-scope/batch-a/light/Kova Hi-Fi A15 Auth - Light.html` (signup, login, magic-link-sent, OTP, forgot password, email verified)
- `main-main-kova-scope/batch-a-additions/light/Kova Hi-Fi B4 Auth Errors - Light.html` (B4.1–B4.6 error states)
- `main-main-kova-scope/batch-a-additions/light/Kova Hi-Fi B5 Email Change Landing - Light.html` (B5.1 success + B5.2 expired)
- `main-main-kova-scope/batch-a-additions/light/Kova Hi-Fi B6 Mobile Fallback - Light.html` (B6.1 mobile + B6.2 tablet edge)
- `main-main-kova-scope/batch-a-additions/dark/Kova Hi-Fi B4 Session Expired - Dark.html` (B4.7)

### 13.4 Design system

- `main-main-kova-scope/design-system/design.md` (spec — token vocabulary, component contracts, bans)
- `main-main-kova-scope/design-system/kova-hifi.css` (canonical dark CSS — used by B4.7 + `/account-pending-deletion`)
- `main-main-kova-scope/design-system/kova-hifi-light.css` (canonical light CSS — used by every other route in this PRD)
- `main-main-kova-scope/design-system/TOKEN_CANONICAL.md` (vocabulary cheat-sheet)
- Auth-shell components are file-local CSS lifted from `A15` hi-fi inline styles per design.md §6 "Extending the system"

### 13.5 Audit + verification inputs

- `kova-open-pencil-1/docs/prd/00-PRD_SCOPE_PLAN.md` (master plan; §3 Cluster 01; §5 PRD template; §5.6 ratification log; §6 cross-cuts; §8 done definition)
- `kova-open-pencil-1/docs/prd/00a-PRD_AUTHORING_GUIDE.md` (operator manual followed for this draft)
- `kova-open-pencil-1/docs/prd/00c-COMPREHENSIVE_AUDIT_REPORT.md` (§2.A Cluster 01 lines 921–1103 lifted as base + §1.D cross-cuts + §1.E.1 M9 Shopify disconnect reuse)
- `kova-open-pencil-1/docs/prd/00d-EXTERNAL_VERIFICATION_HANDOFF.md` (Top-10 decision ratifications; D-1 access_token security, D-5C Vite-only, D-5E staging trigger)
- `kova-open-pencil-1/docs/prd/00e-EXTERNAL_VERIFICATION_VERDICT.md` (§6 PRD-hygiene rules; §8 resolved-concerns log)

### 13.6 External sources cited

- [Supabase Auth — Email Auth with Magic Link](https://supabase.com/docs/guides/auth/auth-magic-link) (magic-link flow)
- [Supabase Auth — One-Time Password](https://supabase.com/docs/guides/auth/auth-email-passwordless#with-otp) (OTP flow)
- [Supabase Auth — Secure email change](https://supabase.com/docs/guides/auth/managing-user-data#email-change-confirmation) (email-change-request flow)
- [Supabase — RLS + SECURITY DEFINER](https://supabase.com/docs/guides/database/postgres/row-level-security) (RPC pattern)
- [GDPR Art. 17 — Right to erasure](https://gdpr-info.eu/art-17-gdpr/) (compliance baseline)
- [GDPR Art. 19 — Notification regarding rectification or erasure of personal data](https://gdpr-info.eu/art-19-gdpr/) (sub-processor notification requirement)
- [Stripe — Cancel a subscription](https://docs.stripe.com/api/subscriptions/cancel) + [Delete a customer](https://docs.stripe.com/api/customers/delete) (cascade `stripe` step)
- [Shopify Admin API — Access tokens](https://shopify.dev/docs/api/admin-rest/2024-01/resources/accesstoken) (cascade `shopify` step)
- [Vercel Cron](https://vercel.com/docs/cron-jobs) (cron config)
- [Resend Email API](https://resend.com/docs/api-reference/emails/send-email) (transactional email)
- [OWASP — Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html) (security baseline)

### 13.7 Memory pointers consulted

- `feedback_app_dark_website_light` — dark inside app, light only on auth + marketing + mobile fallback
- `feedback_figma_ui_theme` — Figma reference for visual decisions
- `feedback_browser_smoke_test_before_done` — §9.4 manual QA gate
- `feedback_verify_with_docs` — context7 + WebFetch help.figma.com (no Figma claims in this PRD; Supabase + Stripe + GDPR sources cited in §13.6)
- `feedback_explain_for_nontechnical_founder` — §1.1 plain language + §1.2 caveman both included
- `project_kova_avatar` — user-level scope for deletion cascade (freelance marketer with many brands)
- `project_design_system_master` — canonical paths cited in §13.4
- `project_pre_prd_audit_ratified` — local Supabase + CI ephemeral (§9.2)

### 13.8 What is NOT in this PRD (handed elsewhere)

- Account page sidebar UI (Cluster 04)
- Profile section UI (Cluster 04)
- Stripe Checkout / Customer Portal / `stripe-webhook` (Cluster 04)
- Onboarding wizard (Cluster 02)
- Dashboard chrome (Cluster 02)
- Avatar dropdown chrome (Cluster 06 — Canvas Editor Core; Cluster 02 — Dashboard topbar)
- Toast component implementation, modal `.dlg` shell (Cluster 11)
- `idempotency_keys` table + helper (Cluster 11)
- Sentry SDK integration (Cluster 11)
- Brand-Kit-extract Anthropic call (Cluster 05)
