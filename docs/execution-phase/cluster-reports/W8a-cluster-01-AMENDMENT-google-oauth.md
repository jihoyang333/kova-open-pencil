# W8a Cluster 01 — Scope Amendment: Add Google OAuth

> **Audience:** central agent that reviews scope changes and edits PRDs + impl plans accordingly.
>
> **Your job:** read this doc + the two referenced docs below, then update PRDs / Plans / hi-fi inventory + handoff so the next implementing agent has one coherent spec to work from. Make the edits in place. Commit per affected file.

---

## 0. Where current state lives

| Doc | Path | Status |
|---|---|---|
| Handoff (current state) | `docs/execution-phase/cluster-reports/W8a-cluster-01-HANDOFF.md` | Self-contained — orientation, what's done, blockers, decisions, pitfalls |
| Plan 01 (task source) | `docs/kova-final-impl-plans/01-auth-and-identity-plan.md` | 25 tasks, magic-link + OTP only |
| PRD 01 (why) | `docs/kova-final-prds/01-auth-and-identity.md` | APPROVED 2026-05-15, passwordless |
| PRD 11 (Cluster 11 primitives) | `docs/kova-final-prds/11-*.md` | Owns KovaModal / KovaIcon / KovaToast / etc. |
| Plan 11 | `docs/kova-final-impl-plans/11-*.md` | Where new KovaGoogleSignInButton primitive lands |
| Hi-fi A15 (light) | `/Users/jihoyang/kova-main/main-main-kova-scope/batch-a/light/Kova Hi-Fi A15 Auth - Light.html` | Current — magic-link + OTP only |
| design.md | `/Users/jihoyang/kova-main/main-main-kova-scope/design-system/design.md` | Token canon + 14 bans |
| kova-hifi-light.css | `/Users/jihoyang/kova-main/main-main-kova-scope/design-system/kova-hifi-light.css` | Auth-page light tokens |

Branch state: `app/cluster-01-auth` at `93d4c787`. 10 commits. Backend shipped (Tasks 1–13 + 22 + 23). Vue work (Tasks 14–20) blocked on Phase 1 audit gate. See HANDOFF §1 + §2.

---

## 1. The amendment in one sentence

**Add Google OAuth as alternative sign-in alongside magic-link.** Magic-link stays as the default path per existing A15 hi-fi. Google button added above the email field on Signup + Login views per Notion's pattern.

---

## 2. Founder decision (2026-05-21)

After confirming Notion supports `email + verification code` (magic-link) + `email + password` + `Google` + `Apple` + `Microsoft` + `Passkeys` + `SAML SSO` simultaneously on its login page ([Notion Help — Log in & out](https://www.notion.com/help/log-in-and-out)), founder ratified:

- **IN scope for MVP:** Magic-link + OTP (existing) + **Google OAuth** (new)
- **OUT of scope for MVP:** Email+password, Apple OAuth, Microsoft OAuth, SAML SSO, passkeys
- **Order in UI:** Google button first, then email field for magic-link flow (matches Notion default ordering)

This supersedes PRD 01 §2.3 "OAuth providers (Google, Apple) — magic-link only at launch" — Google specifically lifts to MVP.

---

## 3. Scope of changes (what central agent must edit)

### 3.1 PRD 01 — `docs/kova-final-prds/01-auth-and-identity.md`

| Section | Change |
|---|---|
| §0 Status | Bump `Last updated` to today's date; add line "AMENDED 2026-05-21 — Google OAuth lifted to MVP scope per founder decision; magic-link remains default" |
| §1.3 Outcome | Add bullet: "(8) sign in / sign up via Google OAuth (alternative to magic-link)" |
| §2.1 In scope | Add row: **Google OAuth flow** — `signInWithOAuth({ provider: 'google' })` redirect + `/auth/callback` exchange handling |
| §2.3 Deferred | REMOVE "Google" from "OAuth providers (Google, Apple) — magic-link only at launch"; KEEP Apple/SAML/passkeys/MFA deferred |
| §3.1 Pre-auth surfaces | Annotate A15.01 (Signup) + A15.02 (Login) rows: "**AMENDED:** add Google OAuth button above email field per A15-amended hi-fi" |
| §5.4 External integrations | Add row: **Google OAuth** — provider configured in Supabase Auth (client ID from Google Cloud Console). No SDK install; Supabase Auth handles redirect. |
| §5.4.1 Supabase Auth configuration | Add 2 settings: "Google provider enabled: YES", "Google client ID + secret: configured (founder pre-flight)". Add: "Allowed redirect URLs include `/auth/callback` already" (no new URL needed). |
| §6.4.1 Page components | LoginView/SignupView gain a `<GoogleSignInButton>` slot above the email field. Note: LoginView state machine unchanged — Google click navigates away (full OAuth redirect), state machine only governs the magic-link/OTP path. |
| §6.4.2 Shared auth-shell components | Add row: `GoogleSignInButton` (`src/components/auth/GoogleSignInButton.vue`) consumes `KovaGoogleSignInButton` primitive from Cluster 11. Props: `mode: 'signin' \| 'signup'` controls label ("Continue with Google" vs "Sign up with Google"). Emits `click`. |
| §8.1 Acceptance — Pre-auth flows | Add 4 lines: clicking Google button initiates OAuth redirect; successful Google callback lands at `/auth/callback` with valid session; new-user via Google triggers same onboarding routing as magic-link callback; existing-user via Google routes to their dashboard. |
| §11 Cross-cuts — Cluster 11 | Update "What we depend on (from them)" row to add `<KovaGoogleSignInButton>` primitive. |
| §13.8 NOT in this PRD | REMOVE Google OAuth from the implicit "deferred" list (Apple/Microsoft/SAML/passkeys remain). |

### 3.2 Plan 01 — `docs/kova-final-impl-plans/01-auth-and-identity-plan.md`

| Section | Change |
|---|---|
| Top of plan / `Tech Stack` | No SDK change (Supabase Auth handles Google OAuth natively) — note this explicitly. |
| File structure → Created | Add: `src/components/auth/GoogleSignInButton.vue` + test |
| File structure → Modified | Add note: `src/views/auth/SignupView.vue` + `LoginView.vue` include `<GoogleSignInButton>` |
| `Hi-fi → Task surface mapping` table | Update Task 14 row: include `GoogleSignInButton` in the shared-shell component list. Note hi-fi = `Kova Hi-Fi A15 Auth - Light` (AMENDED — see §3.4 below). |
| Task 9 — `useAuthStore` | Update narrative: `signInWithGoogle` is no longer deprecated; it becomes a CANONICAL method alongside the magic-link composables. Add a new test in `auth-gdpr.test.ts` (or fresh sibling) asserting `store.signInWithGoogle()` calls Supabase `signInWithOAuth({ provider: 'google', options: { redirectTo: ... }})` with the correct `/auth/callback` redirect URL. |
| Task 14 — Shared auth-shell components | Add `GoogleSignInButton` to the per-component build loop. It composes `KovaGoogleSignInButton` from Cluster 11 (built in Plan 11 — see §3.3). Test: renders with correct label per `mode` prop, emits `click`. |
| Task 17 — SignupView + LoginView | Update copy: SignupView mounts `<GoogleSignInButton mode="signup">` above `<AuthField>`. LoginView mounts `<GoogleSignInButton mode="signin">` above the email-entry state. Add Plan acceptance: Google click triggers OAuth redirect (no state-machine transition). |
| Task 18 — AuthCallbackView | Add narrative: callback handles BOTH magic-link AND Google OAuth completions — Supabase exposes the same `session.user` object regardless of provider. Routing logic (no brands → onboarding, etc.) is identical. |
| Task 23 — Supabase Auth config | Add bullet under "Email Auth provider" → new section "OAuth providers": "Google provider enabled: YES; client ID + secret pasted from Google Cloud Console". Add to redirect URLs: Google requires the SAME `/auth/callback` we already use. |
| Task 24 — E2E spec list | Add 1 spec: `tests/e2e/auth/google-oauth-flow.spec.ts` — mocks Google OAuth redirect via Playwright route interception, asserts session landed at `/auth/callback`. |
| Task 25 — Security verification | Add grep check: no `client_secret` literal in `src/` (Google OAuth secret is server-side via Supabase). |
| New `Pre-flight` step | Add step P7: "Founder creates Google OAuth client in Google Cloud Console + pastes client ID + secret into Supabase Studio (Authentication → Providers → Google). Document Google Cloud project ID in `docs/operations/supabase-auth-config.md`." |

### 3.3 PRD 11 + Plan 11 — Cluster 11 foundation

PRD 11 (`docs/kova-final-prds/11-*.md`) primitive inventory + Plan 11 (`docs/kova-final-impl-plans/11-*.md`) task list both need an addition:

**New primitive: `KovaGoogleSignInButton`** at `src/components/ui/KovaGoogleSignInButton.vue`.

Spec:
- Conforms to [Google's official branding guidelines for "Sign in with Google" button](https://developers.google.com/identity/branding-guidelines) — light theme uses white background + colored G logo + Roboto Medium 14px (or Inter per design system); dark theme uses #131314 background + colored G logo + white text
- Props: `mode: 'signin' \| 'signup'` (controls label "Sign in with Google" vs "Sign up with Google"); `theme: 'light' \| 'dark'` (controls bg/text color — defaults from route theme meta)
- Emits: `click`
- Inside: button element (NOT anchor — accessibility), Google G logo SVG inline (allowed exception to KovaIcon ban per Google branding requirement — the G logo must be Google's exact SVG), height matches AuthCta primary (44px), border-radius matches `.btn` (`--r-md` = 5px)
- Token-respecting: text color = `--ink` (light) / `#ffffff` (dark — Google brand spec); background = `#ffffff` (light) / `#131314` (dark — Google brand spec); border = `1px solid --line` (light) / `1px solid #8e918f` (dark — Google brand spec)
- The two dark-mode hex literals are **token-exempt** per the Google branding spec (must match exactly) — annotate in tokens-used.md with `/* token-exempt: Google brand requirement */`
- Tests (Plan 11): renders with correct label per mode prop, renders with correct theme styling, emits click

This is a one-task addition to Plan 11. If Plan 11 is already SHIPPED, this becomes a CHANGELOG-KOVA.md entry per the lift-the-lock policy (CLAUDE.md §"Lift-the-lock policy"). Plan 11 ships via W6 — confirm status before deciding amendment path:
- If Plan 11 W6 not yet merged: amend Plan 11 inline + Task 14 of Plan 01 consumes the primitive
- If Plan 11 W6 already merged: open a Plan 11 follow-up task in the cluster's CHANGELOG-KOVA.md + Plan 01 Task 14 carries a "DEPS Cluster 11 KovaGoogleSignInButton" note

### 3.4 Hi-fi A15 amendment

The current `Kova Hi-Fi A15 Auth - Light.html` shows magic-link + OTP only. Needs a 2-screen amendment (A15.01 Signup + A15.02 Login) with a "Continue with Google" / "Sign up with Google" button above the email field.

**Per founder direction:** the next implementing agent (after central agent finishes the PRD/Plan edits) MUST:

1. **First** build the `KovaGoogleSignInButton` primitive in Cluster 11 per §3.3 above
2. **Second** modify the A15 hi-fi HTML files (both `main-main-kova-scope/batch-a/light/Kova Hi-Fi A15 Auth - Light.html` AND copy into `kova-open-pencil-1/design-system/hifi/auth/`) to insert the Google button above the email field. Use the same primitive markup as the Cluster 11 component. Add a thin "or" divider between the Google button and the email field per Notion's pattern.
3. **Third** proceed with Plan 01 Task 14 (Vue auth-shell components) — Vue impl matches the amended hi-fi pixel-for-pixel

Reference for the Google button visual spec:
- [Google Identity — Sign In with Google branding guidelines](https://developers.google.com/identity/branding-guidelines)
- [Google "G" logo SVG (official)](https://developers.google.com/identity/branding-guidelines#g-logo)

### 3.5 W8a HANDOFF doc — `docs/execution-phase/cluster-reports/W8a-cluster-01-HANDOFF.md`

Update sections of the existing handoff so the resume agent has a single coherent picture:

| Handoff section | Change |
|---|---|
| §3.1 (Founder decisions — auth model) | Amend to "magic-link + OTP (default) + Google OAuth (alternative) per 2026-05-21 amendment. Apple/Microsoft/SAML/passkeys deferred." |
| §4.5 (useAuthStore additive refactor) | Note that `signInWithGoogle` is no longer deprecated — becomes a canonical method post-amendment. |
| §6.2 (Hi-fi files to copy) | Add a banner: "A15 light files need the Google-button amendment per `W8a-cluster-01-AMENDMENT-google-oauth.md` §3.4 BEFORE Vue work begins." |
| §6.3 (Hi-fi → Plan task mapping) | Task 14 row: add `GoogleSignInButton` to the component list. |
| §7 (Remaining Plan tasks TODO) | Insert a new pre-Task-14 step: "Pre-flight Google OAuth setup — Founder creates Google Cloud project + OAuth client, pastes into Supabase Studio; Cluster 11 KovaGoogleSignInButton primitive ready; A15 hi-fi amended". |
| §9.4 (New surface in c01) | Add `src/components/auth/GoogleSignInButton.vue` row. |

### 3.6 Supabase Auth config doc — `docs/operations/supabase-auth-config.md`

Add new section "OAuth providers" with checklist:

```markdown
## OAuth providers

- [ ] Google provider enabled in Supabase Studio → Authentication → Providers
- [ ] Google client ID set (from Google Cloud Console OAuth 2.0 Client IDs)
- [ ] Google client secret set
- [ ] Authorized redirect URI in Google Cloud Console matches Supabase callback:
      `https://<project-ref>.supabase.co/auth/v1/callback`
- [ ] Authorized JavaScript origins: `https://app.kova.io` + `http://localhost:1420`
- [ ] Verify smoke test: click "Continue with Google" → Google consent → return to /auth/callback → session active

## Google Cloud Console pre-flight (operator step, before Supabase config)

1. Create or select a Google Cloud project (record project ID below)
2. Navigate to APIs & Services → Credentials
3. Create OAuth 2.0 Client ID, application type "Web application"
4. Authorized JavaScript origins: app.kova.io + localhost:1420
5. Authorized redirect URIs: https://<supabase-project-ref>.supabase.co/auth/v1/callback
6. Copy client ID + secret into Supabase Studio (NEVER commit to repo)

**Google Cloud project ID — production:** TODO
**Google Cloud project ID — staging:** TODO
```

### 3.7 PROGRESS report — `docs/execution-phase/cluster-reports/W8a-cluster-01-PROGRESS.md`

Add a note at the top: "AMENDED 2026-05-21 — Google OAuth lifted to MVP scope. See `W8a-cluster-01-AMENDMENT-google-oauth.md` + updated HANDOFF for the new task surface."

### 3.8 Execution prompt — `docs/execution-phase/execution-prompts/W8a-cluster-01-auth.md`

The original execution prompt mentions Shopify OAuth (stale — handed to c04 per founder decision earlier) and `signInWithPassword` (stale — passwordless decision overrode this).

**With the Google OAuth amendment, the prompt's "Shopify OAuth flow" section is STILL stale (Shopify stays with c04), but its mention of OAuth machinery becomes partially relevant for Google.**

Central agent: add an inline note at the top of the prompt: "AMENDED 2026-05-21 — see `W8a-cluster-01-AMENDMENT-google-oauth.md`. The Shopify OAuth flow listed in this prompt is OUT OF SCOPE for c01 (per PRD §13.8); Google OAuth IS in scope (per amendment). signInWithPassword reference is stale — auth model is magic-link + OTP + Google OAuth only."

### 3.9 Audit rubric — `docs/execution-phase/wave-audits/W8a-cluster-01-AUDIT.md`

The W8a audit prompt is what a future audit agent will run against the implementation. Central agent: update §E (Shopify OAuth flow security) header to say "SKIPPED for c01 — moved to c04". Update §C / §D / §G to add Google-OAuth-specific checks:

- §C migration: no new tables — Google OAuth uses Supabase Auth's built-in OAuth flow
- §D Edge Functions: verify `/auth/callback` handles BOTH magic-link OTP exchange AND Google PKCE code exchange (Supabase does both natively, but verify session lands correctly)
- §G Vue auth pages: verify `<GoogleSignInButton>` uses Cluster 11 primitive (no raw button); verify Google brand spec compliance (logo SVG inline, exact color tokens for dark mode)

---

## 4. Founder pre-flight (BEFORE implementing agent starts)

These are operator steps founder must complete before the resume agent can build Tasks 14+. Document expected state in the relevant docs above:

1. **Create Google Cloud project** — name: "Kova MVP" (or per founder preference). Record project ID.
2. **Create OAuth 2.0 Client ID** — application type "Web application". Set authorized origins + redirect URI per §3.6 above.
3. **Paste client ID + secret into Supabase Studio** (Authentication → Providers → Google → enable).
4. **Enable Google provider** in Supabase Studio for local + staging + prod environments.
5. **Verify** by manually triggering the Supabase OAuth URL once — should redirect to Google consent screen.
6. **Add to `.env.example`** (server-only env documentation): no new env vars actually — Supabase handles the secret internally.

---

## 5. Execution order for resume agent (post-amendment)

After central agent finishes PRD/Plan edits + founder finishes Google Cloud / Supabase pre-flight, the implementing agent resumes:

```
0. Verify Supabase Auth → Providers → Google = enabled (founder confirms)
1. [Cluster 11] Build KovaGoogleSignInButton primitive — Plan 11 amendment task
2. [Cluster 11] Test + commit + (re-)deploy Cluster 11 if needed
3. [Cluster 01] Phase 1 audit gate — KOVA_AUDIT.md + tokens-used.md
   (include GoogleSignInButton in the component inventory + Google brand exempt tokens)
4. [Cluster 01] Amend A15 hi-fi HTML — insert Google button above email field per §3.4
5. [Cluster 01] Copy amended A15 + other hi-fi files into design-system/hifi/auth/
6. [Cluster 01] Founder approves Phase 1 docs
7. [Cluster 01] Task 14 (shared auth-shell components INCLUDING GoogleSignInButton wrapper)
8. [Cluster 01] Tasks 15 → 20 per existing Plan 01
9. [Cluster 01] Task 13.3 (router.ts wiring) + Task 21 (email renderers) + Task 24 (E2E incl. Google flow spec) + Task 25 (verification incl. client_secret grep)
10. [Cluster 01] Cluster-end agents + DONE report
```

---

## 6. Quick checklist for central agent

- [ ] Read this doc end-to-end
- [ ] Read `W8a-cluster-01-HANDOFF.md` for current state
- [ ] Read `Plan 01` to ground the task numbering
- [ ] Edit PRD 01 per §3.1
- [ ] Edit Plan 01 per §3.2
- [ ] Edit PRD 11 + Plan 11 per §3.3 (verify W6 merge status first — Plan 11 may already be SHIPPED requiring CHANGELOG entry instead)
- [ ] Note in this AMENDMENT doc that A15 hi-fi modification is a TODO for the resume agent per §3.4 (don't edit hi-fi yourself — that's the implementing agent's job after Cluster 11 primitive ships)
- [ ] Update HANDOFF per §3.5
- [ ] Update Supabase Auth config doc per §3.6
- [ ] Update PROGRESS report per §3.7
- [ ] Update execution prompt per §3.8
- [ ] Update W8a audit rubric per §3.9
- [ ] Commit per affected file with messages like `docs(c01-amend): PRD 01 — Google OAuth scope addition` / `docs(c11-amend): KovaGoogleSignInButton primitive added`
- [ ] Push branch (`app/cluster-01-auth` for c01-side edits; whichever branch owns Plan 11 for c11-side edits)
- [ ] Post a summary comment in this AMENDMENT doc when done — central agent's sign-off

---

## 7. What's NOT in scope of this amendment

- Apple OAuth
- Microsoft OAuth
- SAML SSO
- Passkeys
- Email + password (still deferred to Phase 2 per PRD §2.3)
- MFA / TOTP
- Sibling clusters c04 + c12 (unchanged)
- Backend Edge Functions (no new Edge Fn needed — Supabase Auth handles Google OAuth natively)
- Migration changes (no schema change — Supabase Auth uses its own `auth.users` table for OAuth providers)

---

## 8. Risk register

| Risk | Mitigation |
|---|---|
| Google OAuth requires founder pre-flight (Google Cloud Console) before resume agent can ship | Pre-flight steps documented in §4 + supabase-auth-config.md; resume agent verifies before Task 14 |
| Plan 11 may already be SHIPPED — KovaGoogleSignInButton becomes a CHANGELOG entry rather than inline Plan amendment | §3.3 covers both cases; central agent checks status before editing |
| Google's brand spec hex literals violate `design.md` ban 9 (no hex outside `:root`) | Token-exempt with `/* token-exempt: Google brand requirement */` per drift protocol §7 of IMPLEMENTATION_PROMPT.md; tokens-used.md captures founder approval |
| Existing W8a backend tests assume signInWithGoogle is deprecated — they may need narrative update only (no test change) | Test file comments mention "DEPRECATED"; central agent updates comments only |
| A15 hi-fi modification is destructive to the canonical mockup — Plan 11 + design.md need a record of the change | §3.4 directs the resume agent to update BOTH the outer canonical (`main-main-kova-scope/batch-a/light/...`) AND the in-repo copy (`design-system/hifi/auth/...`) — design.md §6 "Extending the system" applies |

---

## 9. References

- Notion login methods confirmation: [Notion Help — Log in & out](https://www.notion.com/help/log-in-and-out)
- Google Sign-In branding spec: [Google Identity — Branding guidelines](https://developers.google.com/identity/branding-guidelines)
- Supabase OAuth setup: [Supabase Auth — Sign in with Google](https://supabase.com/docs/guides/auth/social-login/auth-google)
- PRD 01 §2.3 (current OAuth deferral language to amend): `docs/kova-final-prds/01-auth-and-identity.md`
- IMPLEMENTATION_PROMPT.md drift protocol: `docs/execution-phase/claude-design-files/IMPLEMENTATION_PROMPT.md` §7
- design.md ban list: `/Users/jihoyang/kova-main/main-main-kova-scope/design-system/design.md` §5

---

**End of amendment doc.** Central agent: when finished editing the PRDs/Plans/handoff, leave a sign-off line at the bottom of this file noting the date + which files were touched, then commit + push.
