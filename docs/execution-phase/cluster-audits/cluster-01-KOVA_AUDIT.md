# Cluster 01 — Phase 1 Audit (KOVA_AUDIT.md)

**Status (draft):** Phase 1 audit gate. Created 2026-05-21 by W8a resume agent (Vue auth-shell amendment).
**Authority:** `docs/execution-phase/claude-design-files/IMPLEMENTATION_PROMPT.md` §3 — `KOVA_AUDIT.md` is the audit-gate output. Companion: `cluster-01-tokens-used.md` (per-property visual values).
**Outcome:** No Vue / TS code until founder approves §1.6 (open questions) + the canonical-token-additions block in `cluster-01-tokens-used.md`.

> **Reference format:** `docs/execution-phase/cluster-audits/cluster-11-audit.md` (approved 2026-05-20). This doc reproduces its section structure; content is c01-specific.

---

## §0 Source files + surface inventory

### 0.1 Hi-fi reference files (in-repo, byte-frozen, copied 2026-05-21)

| Path | Theme | Scenes |
|---|---|---|
| `design-system/hifi/auth/Kova Hi-Fi A15 Auth - Light.html` | LIGHT | A15.01 Signup · A15.02 Login · A15.03 Magic-link sent · A15.04 OTP entry · A15.05 Forgot password · A15.06 Email verified |
| `design-system/hifi/auth/Kova Hi-Fi B4 Auth Errors - Light.html` | LIGHT | B4.1 Magic-link expired · B4.2 Magic-link invalid · B4.3 OTP wrong (inline) · B4.4 OTP locked · B4.5 Signup email-exists (inline) · B4.6 Login user-not-found (inline) |

**Source path (do NOT edit):** `/Users/jihoyang/kova-main/main-main-kova-scope/batch-a/light/Kova Hi-Fi A15 Auth - Light.html` + `/Users/jihoyang/kova-main/main-main-kova-scope/batch-a-additions/light/Kova Hi-Fi B4 Auth Errors - Light.html`. The outer canonical hi-fi is byte-identical to the in-repo copy (verified via `diff` 2026-05-21).

### 0.2 Surfaces in scope (PRD 01 §3.1 + amendment-added Google buttons)

Per PRD 01 §3.1 — Pre-auth surfaces (light); §3.2 — Auth-error surfaces (light). Plus the amendment's two amended views (Signup + Login) which gain the Google sign-in button per `W8a-cluster-01-AMENDMENT-google-oauth.md` §3.4.

| # | Surface | Hi-fi scene | Theme | Route | Vue view target |
|---|---|---|---|---|---|
| 1 | Signup · email entry | A15.01 | LIGHT | `/signup` | `src/views/SignupView.vue` (rewrite) |
| 2 | Login · email entry | A15.02 | LIGHT | `/login` (state=email-entry) | `src/views/LoginView.vue` (rewrite) |
| 3 | Magic-link sent | A15.03 | LIGHT | `/login` (state=sent) | `LoginView.vue` (sub-state) |
| 4 | OTP code entry | A15.04 | LIGHT | `/login` (state=otp) | `LoginView.vue` (sub-state) |
| 5 | Forgot password | A15.05 | LIGHT | `/forgot-password` | `src/views/auth/ForgotPasswordView.vue` |
| 6 | Email verified (post-signup) | A15.06 | LIGHT | `/auth/callback` (success) | `src/views/auth/AuthCallbackView.vue` |
| 7 | Magic-link expired | B4.1 | LIGHT | `/auth/magic?status=expired` | `src/views/auth/MagicLinkErrorView.vue` (sub-state) |
| 8 | Magic-link invalid | B4.2 | LIGHT | `/auth/magic?status=invalid` | `MagicLinkErrorView.vue` (sub-state) |
| 9 | OTP wrong code (inline) | B4.3 | LIGHT | `/login` (state=otp, error=wrong) | `LoginView.vue` (sub-state) |
| 10 | OTP locked out | B4.4 | LIGHT | `/login` (state=otp, error=locked) | `LoginView.vue` (sub-state) |
| 11 | Signup · email exists (inline) | B4.5 | LIGHT | `/signup` (error=exists) | `SignupView.vue` (sub-state) |
| 12 | Login · user not found (inline) | B4.6 | LIGHT | `/login` (error=no-account) | `LoginView.vue` (sub-state) |
| 13 | Signup · with Google button | A15.01-amended | LIGHT | `/signup` | `SignupView.vue` |
| 14 | Login · with Google button | A15.02-amended | LIGHT | `/login` | `LoginView.vue` |

**A15.01/A15.02 amendment-rebuild discipline (founder lock 2026-05-21):** The A15 hi-fi HTML is NOT amended (founder explicitly rejected modifying it). Surfaces 13 + 14 (the amended Signup + Login screens) reuse the entire A15.01 / A15.02 markup; the ONLY visual addition is a `<KovaGoogleSignInButton>` slotted ABOVE the existing `<AuthField>` email field, with a thin `<div class="auth-or">or</div>` divider between the Google button and the email field (the divider is already canonical in A15 — it sits between the email CTA and the "Use 6-digit code" secondary, but is RE-USED above the email field per Notion's pattern). **Google button visual derived from `KovaGoogleSignInButton` primitive per Google brand spec, NOT from a hi-fi HTML mockup; A15 hi-fi is NOT amended per founder lock 2026-05-21.**

### 0.3 Out of scope for this cluster (deferred to others)

- B5 Email change landing (LIGHT) → covered by Plan 01 Task 19 `EmailChangeVerifyView` but visually consumes the same primitives audited here; no new tokens needed.
- B4.7 Session expired (DARK) → Plan 01 Task 19 `SessionExpiredView` consumes Cluster 11 `.err-card` + dark tokens already wired in @theme (Cluster 11 ship). No new tokens.
- B6 Mobile fallback (LIGHT) → Plan 01 Task 19 `DesktopOnlyView` consumes the same A15 chrome audited here.
- Account-pending-deletion (DARK) → composed from B4.7 + A4 modal pattern; no dedicated hi-fi. Inherits dark tokens.
- Privacy + Terms (LIGHT) → Cluster 11 ships `<MarketingShell>`; Plan 01 Task 20 only renders Markdown into it.

Surfaces 1–14 in §0.2 are the audit scope. Out-of-scope surfaces ride on the same token set; no separate analysis needed.

---

## §1.1 Token map — `kova-hifi-light.css :root` → `src/app.css @theme`

Per IMPLEMENTATION_PROMPT.md §3 Output 1 §1.1. The light variant exists in `design-system/canonical/kova-hifi-light.css` but **NOT in `src/app.css @theme`**. The current `@theme` block holds DARK tokens only (Cluster 11 ship). Auth surfaces need a `data-theme="light"` selector that overrides every short-name with the light value.

### 1.1.a Already wired (`src/app.css @theme` — dark variant, unchanged for c01)

| `kova-hifi.css :root` short | `@theme` long | Hex (dark) |
|---|---|---|
| `--page` | `--color-page` | `#1a1a1d` |
| `--bg` | `--color-bg` | `#242428` |
| `--fill` | `--color-fill` | `#26262b` |
| `--fill-2` | `--color-fill-2` / `--color-input-hi` | `#303035` |
| `--line` | `--color-line` | `#2c2c30` |
| `--line-2` | `--color-line-2` / `--color-hover` | `#232327` |
| `--ink` | `--color-ink` / `--color-surface` | `#ebebee` |
| `--ink-2` | `--color-ink-2` / `--color-muted` | `#a8a8ad` |
| `--ink-3` | `--color-ink-3` | `#6e6e73` |
| `--ink-4` | `--color-ink-4` | `#4a4a4f` |
| `--accent` | `--color-accent` | `#3b82f6` |
| `--accent-soft` | `--color-accent-soft` | `#1d3a66` |
| `--accent-ink` | `--color-accent-ai` | `#a9c4ff` |
| `--accent-2` | `--color-accent-2` | `#2a4d80` |
| `--rail` | `--color-rail` | `#1a1a1d` |
| `--warn` / `--warn-soft` / `--warn-edge` / `--ok` / `--ok-soft` / `--review` / `--review-soft` | `--color-warn` / `--color-warn-soft` / etc. | resolve to ink-2 / fill / line per §5 ban 12 |
| `--ink-on-primary` | `--color-ink-on-primary` | `#fff` |
| `--accent-hover` | `--color-accent-hover` | `#2563eb` |
| `--modal-backdrop` | `--color-modal-backdrop` | `rgba(0,0,0,0.72)` |

### 1.1.b MISSING — light-theme overrides (Resolution L-1)

Auth surfaces (`/signup`, `/login`, `/forgot-password`, `/auth/callback`, `/auth/magic`, `/desktop-only`, `/auth/email-change/verify`) render under `<AuthShell theme="light">` which sets `data-theme="light"` on the wrapper. The same `--page` / `--ink` / `--accent` / etc. short-names must resolve to LIGHT values inside that subtree.

| Short token | Light value | Source line in `kova-hifi-light.css` |
|---|---|---|
| `--bg` | `#ffffff` | L13 |
| `--page` | `#ffffff` | L14 |
| `--rail` | `#fafaf9` | L15 |
| `--fill` | `#f4f4f3` | L16 |
| `--fill-2` | `#ececea` | L17 |
| `--line` | `#e4e4e1` | L18 |
| `--line-2` | `#efefed` | L19 |
| `--ink` | `#18181b` | L22 |
| `--ink-2` | `#5a5a60` | L23 |
| `--ink-3` | `#8a8a8f` | L24 |
| `--accent` | `#3b82f6` | L27 — same as dark |
| `--accent-soft` | `#e8f0fe` | L28 |
| `--accent-2` | `#c5dafd` | L29 |
| `--accent-ink` | `#1d4ed8` | L30 |
| `--warn` | `var(--ink-2)` → `#5a5a60` | L33 (degrades) |
| `--warn-soft` | `var(--fill)` | L34 |
| `--warn-edge` | `var(--line)` | L35 |
| `--ok` / `--ok-soft` / `--review` / `--review-soft` | degrade to ink-2 / fill | L36-39 |

**Status:** ⚠️ MISSING. None of the LIGHT tokens are wired into `src/app.css @theme`. Resolution L-1.

### 1.1.c MISSING — `.btn.primary` light-mode hex literal (Resolution L-2)

`kova-hifi-light.css` L208: `.btn.primary { background: var(--ink); color: #fff; border-color: var(--ink); }`. The `#fff` matches the existing dark-mode `--color-ink-on-primary: #fff` exactly — same token can be reused unchanged. ✅ already covered by `--color-ink-on-primary`.

`kova-hifi-light.css` L209: `.btn.primary:hover { background: #000; border-color: #000; }`. **`#000` is RAW HEX inside canonical CSS** — light-mode primary-button hover uses a different ink color than dark mode (`#000` vs `--color-btn-primary-hover-bg: #fff`). ⚠️ MISSING. Resolution L-2.

### 1.1.d MISSING — focus-ring rgba literal (Resolution L-3)

Hi-fi inline style L137: `.auth-field .input:focus { ... box-shadow: 0 0 0 3px rgba(17,17,17,0.06); }`. Same rgba on `.auth-otp .cell.cursor` L234. NOT in `kova-hifi-light.css :root`; NOT in `@theme`. ⚠️ MISSING. Resolution L-3.

---

## §1.2 Existing-component inventory — `src/components/`

Cluster 11 (W6 REDO) shipped 2026-05-20 with all primitives. Auth-domain inventory below.

### 1.2.a Cluster 11 primitives (already shipped — `src/components/ui/`)

| File | Verdict for c01 |
|---|---|
| `KovaIcon.vue` + `kova-icon-registry.ts` | ✅ **REUSE.** Auth surfaces use `arrow-right`, `key-round`, `mail`, `clock`, `check`, `arrow-left`, `link`, `rotate-cw`, `monitor`, `laptop`. Verify each name is in the registry; extend if missing (Plan 01 deliverable). |
| `KovaButton.vue` | ✅ **REUSE.** `.btn`, `.btn.primary`, `.btn.accent`, `.btn.ghost`, `.btn.sm`, `.btn.icon`, `.btn[disabled]` all match A15 hi-fi inline `.btn` block (which lifts from canonical kova-hifi.css). Light-mode `--page` / `--ink` resolve correctly once L-1 ships. |
| `KovaInput.vue` | ⚠️ **MISMATCH** — `kova-hifi.css .input` is `padding: 7px 10px; font-size: 13px; border-radius: 6px` (canonical control). A15 hi-fi `.auth-field .input` is `padding: 9px 12px; font-size: 14px; border-radius: 6px`. **Auth uses an oversized input variant** — needs `<AuthField>` to compose its own input (per Plan 01 Task 15 spec). Do NOT extend KovaInput; build `AuthField` standalone with its own contract. Resolution C-1. |
| `KovaField.vue` | ❌ **DO NOT REUSE.** Cluster 11 `KovaField` wraps `<input>` for canvas-property forms (`.field` selector — `padding: 8px 10px; gap: 3px; font-size: 11px label`). Auth `<AuthField>` is a DIFFERENT contract (`.auth-field` — `gap: 6px; label 11.5px / 500`). Build separately. Resolution C-2. |
| `KovaModal.vue` | ✅ **REUSE** (for Task 16 `DangerZoneCard` typed-confirm — DARK theme, post-sign-in surface). Outside c01 LIGHT-theme audit scope but covered by §1.3 below. |
| `KovaCheckbox.vue` | ❌ **DO NOT REUSE for `PersistentSessionToggle`.** Hi-fi A15.06 shows a SWITCH/TOGGLE (`<span class="toggle on">`) not a checkbox. PRD 01 §6.4.2 calls for a switch component. Resolution C-3. |
| `KovaToast.vue` + `ToastStack.vue` | ✅ **REUSE** (for `useToast()` signup-success notifications post-Task 17). DARK theme only — toasts render outside the AuthShell. |
| `KovaPill.vue` | ✅ **REUSE.** A15.03 `.tag-mono.ok` "DELIVERED" tag composes via `<KovaPill variant="outline">`. Cross-check: pill in canonical is `font-size 11.5 / padding 4px 9px`. A15 `.tag-mono` is `font-size 11.5 / padding 2px 6px`. ⚠️ Drift — see Resolution C-4. |
| `KovaPopover.vue` / `KovaMenu.vue` / `KovaTooltip.vue` / `KovaSkeleton.vue` / `KovaSelect.vue` / `KovaSegmented.vue` / `KovaAvatar.vue` / `EmptyState.vue` | n/a — not consumed by any auth surface. |

### 1.2.b Existing auth-domain code (pre-c01)

| File | Verdict |
|---|---|
| `src/views/LoginView.vue` | ❌ **REPLACE.** Built for M5-era email+password (now deprecated per HANDOFF §4.5). Plan 01 Task 17 rewrites the file end-to-end around `useMagicLink` + `useOtp` composables + 5-state machine + Google button. |
| `src/views/SignupView.vue` | ❌ **REPLACE.** Same as LoginView — M5-era. Plan 01 Task 17 rewrites. |
| `src/components/icons/GoogleIcon.vue` | ✅ **REUSE (verbatim).** Already ships Google's official 4-color G logo SVG (`#4285F4` / `#34A853` / `#FBBC05` / `#EA4335` per Google branding guidelines). `<KovaGoogleSignInButton>` consumes this primitive verbatim. **Token-exempt per Google brand requirement.** |
| `src/components/dashboard/AccountMenu.vue` | Out of scope for Phase 1 — touched by Task 16 (DangerZoneCard mount), no visual change. |
| `src/components/onboarding/NameStep.vue` + others | Out of scope — Cluster 03 surface. |

### 1.2.c Network / shell components (Cluster 11 ship)

| File | Verdict |
|---|---|
| `src/components/network/NetworkStatusIndicator.vue` | ✅ **REUSE.** Renders 14×14 `cloud-off` icon + tooltip when offline. Mounts in `AuthShell` foot per PRD 11 §3.7. |
| `src/components/marketing/MarketingShell.vue` | ✅ **REUSE** for `/privacy` + `/terms` (Task 20). Outside Phase 1 audit scope. |
| `src/components/email/EmailShell.vue` | ✅ **REUSE** for Task 21 email renderers. Server-only (renders HTML for Resend); no Phase 1 visual-audit impact. |

---

## §1.3 Reuse decisions per c01 component

Per IMPLEMENTATION_PROMPT.md §3 Output 1 §1.3 + Hard Rule #17: a component qualifies for reuse ONLY if every visual property matches the hi-fi. Otherwise: extend with new variant prop OR build new.

### 1.3.a c01-owned shared shell components (Plan 01 Tasks 14 + 15)

| Component (Plan 01 §6.4.2) | Source hi-fi class | Verdict | Why |
|---|---|---|---|
| `AuthShell.vue` | A15 `.auth-shell` + `.auth-top` + `.auth-stage` + `.auth-bottom` (L46-83 + L175-183) | **BUILD NEW.** Composes a `data-theme="light"` wrapper, the top wordmark bar (with `corner` slot), stage with default-slot center alignment, bottom strip (with `bottom` slot). Theme prop `'light' \| 'dark'`. | No existing Vue equivalent. |
| `AuthCard.vue` | A15 `.auth-card` + `.auth-card.wide` (L87-96) | **BUILD NEW.** Width prop: `'standard'` (380px) \| `'wide'` (420px — OTP only). Padding 28px / 28px / 24px. Radius 10px. 1px `--line` border. Shadow `0 1px 0 rgba(0,0,0,0.02), 0 14px 40px -24px rgba(0,0,0,0.10)`. Vertical flex with `gap: 18px`. | No existing equivalent. |
| `AuthHeading.vue` | A15 `.auth-head` + `.auth-head .eyebrow` + `.auth-card h1` + `.auth-lede` (L98-111) | **BUILD NEW.** Slots: `eyebrow`, default (h1), `lede`. Center-align prop for A15.06 medal layout. | No existing equivalent. |
| `AuthCta.vue` | A15 `.auth-cta` (full-width primary) + `.auth-second` (full-width secondary) (L145-163) | **BUILD NEW.** Composes `<KovaButton>` (canonical `.btn / .btn.primary`) with `auth-cta` / `auth-second` size+layout overrides. Variant prop: `'primary' \| 'secondary'`. Auto-applies `disabled` class binding. Slot for label + trailing icon. | `<KovaButton>` is NOT full-width by default; Auth needs the full-width variant. |
| `AuthMedal.vue` | A15 `.auth-medal` + `.auth-medal.ok` + `.auth-medal.pending` (L205-219) | **BUILD NEW.** 48×48 circle. Tone prop: `'ok' \| 'pending' \| 'dim'`. Inner icon via `<KovaIcon>`. Used by A15.06 only in this cluster's LIGHT scope (B5.1 success surface — Cluster 01 owns — also consumes). | No existing equivalent. |
| `AuthIcon.vue` | smaller inline check / clock used at the heading row in B5.1 / B5.2 / B4.1 | **BUILD NEW.** Lightweight inline 24×24 icon-tile wrapper (vs the 48×48 medal). Tone prop matches AuthMedal. Used by B5 + B6 surfaces (out of LIGHT-Phase-1 scope but Plan 01 Task 14 includes for completeness). | No existing equivalent. |
| `AuthField.vue` | A15 `.auth-field` + `.auth-field .input` + `.auth-field .input.error` + `.auth-field .lbl` + `.auth-field .lbl .help-link` + `.auth-field .help` + `.auth-field .help.warn` + `.auth-field .help .accent-link` (L113-142, B4 L265, B4 L269-273) | **BUILD NEW.** Label row (with optional `help-link` slot — used for "Forgot password?" in A15.02), input element, help-row (idle / warn / ok states). Error prop: boolean (drives `.input.error` warn-edge). v-model on input. Emits `submit` on Enter. | KovaField is a different contract per §1.2.a. |
| `OtpInput.vue` | A15 `.auth-otp` + `.auth-otp .cell` + `.cell.filled` + `.cell.cursor` + `.cell.empty` + B4 `.auth-otp.locked` + `.cell.error` (A15 L221-242, B4 L266+L276-279) | **BUILD NEW.** 6 cells × 44×52 px. Auto-advance on digit. Backspace clears previous. Paste fills all. Cursor cell shows blinking 1px caret. Cell tone props: `idle / filled / cursor / empty / error / locked`. Emits `complete` when 6 digits entered (auto-submit per founder §12.6). | No existing equivalent. |
| `MagicLinkSentBlock.vue` | A15 `.auth-sent` + `.auth-sent .row` + `.row.timer` (L185-203) | **BUILD NEW.** Rail block (border `--line-2`, bg `--rail`, radius 8px, padding 14px). Mail icon row + DELIVERED tag + cooldown row with clock icon. Props: `email`, `resendCooldown` (number — seconds remaining). Emits `resend` when cooldown=0 + clicked. | No existing equivalent. |
| `PersistentSessionToggle.vue` | A15.06 `.auth-route` row + inline `<span class="toggle on">` (L244-260, A15.06 inline) | **BUILD NEW.** Rail row (mirror of `.auth-sent` chrome, gap 10 px). Switch primitive (NOT KovaCheckbox — different visual; toggle pill, no Reka equivalent shipped). Default `v-model:on` is `true` per founder §12.7. | No existing equivalent. |

### 1.3.b c01 amendment — Google sign-in primitive (Plan 11 amendment)

| Component | Verdict | Source spec |
|---|---|---|
| `KovaGoogleSignInButton.vue` (Cluster 11 primitive) | **BUILD NEW** in `src/components/ui/`. Light theme: white bg + `--ink` text + 1px `--line` border, height 44px (matches `.auth-cta`), radius 5px (`.btn` canonical). Dark theme: `#131314` bg + `#ffffff` text + 1px `#8e918f` border. G logo SVG inline (NOT KovaIcon — Google brand requires exact official SVG). Props: `mode: 'signin' \| 'signup'` (label "Sign in with Google" / "Sign up with Google"), `theme: 'light' \| 'dark'` (defaults from route meta). Emits `click`. **Token-exempt rows:** dark-mode bg / text / border + 4 G-logo brand colors. See cluster-01-tokens-used.md §0. | Google branding guidelines — https://developers.google.com/identity/branding-guidelines |
| `GoogleSignInButton.vue` (c01 wrapper) | **BUILD NEW** in `src/components/auth/`. Thin wrapper consuming `<KovaGoogleSignInButton>`. Calls `useGoogleOAuth().signIn(mode)` on click which delegates to `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: <origin>/auth/callback } })`. Emits `click`. | Amendment §3.1 (PRD 01 §6.4.2). |

### 1.3.c c01-owned account surfaces (Plan 01 Task 16) — DARK theme

| Component | Verdict | Why |
|---|---|---|
| `DangerZoneCard.vue` | **BUILD NEW** at `src/components/account/DangerZoneCard.vue`. Composes `<KovaModal size="sm">` (Cluster 11 — DARK) with typed-confirm input ("type DELETE to confirm"). | Out of LIGHT Phase 1 scope but listed for completeness. Audited under existing Cluster 11 KovaModal token set; no new tokens. |

### 1.3.d Existing views — REPLACE

| File | Verdict |
|---|---|
| `src/views/SignupView.vue` | **REPLACE.** Per Plan 01 Task 17 + amendment. New version composes `<AuthShell theme="light">` + `<AuthCard>` + `<GoogleSignInButton mode="signup">` + `<AuthCta variant="secondary">` (or divider) + `<AuthField label="Work email">` + `<AuthCta variant="primary">` + secondary "Use 6-digit code" + foot terms. Sub-state for B4.5 inline error. |
| `src/views/LoginView.vue` | **REPLACE.** Per Plan 01 Task 17 + amendment. 5-state machine (`'email-entry' / 'sent' / 'otp' / 'otp-wrong' / 'otp-locked'`). Email-entry layout = A15.02 + Google button. Sub-state for B4.6 inline error. |

---

## §1.4 New tokens needed

Per `cluster-01-tokens-used.md` §9 — 4 founder resolutions cover the c01-specific additions. Summary:

1. **L-1** — wire LIGHT-theme short-name overrides for `--bg / --page / --rail / --fill / --fill-2 / --line / --line-2 / --ink / --ink-2 / --ink-3 / --accent-soft / --accent-2 / --accent-ink` (every short name that differs from dark) into `src/app.css @theme` under a `[data-theme="light"]` selector or equivalent Tailwind 4 mechanism. **Required for every auth surface to render correctly.**
2. **L-2** — name a token for light-mode `.btn.primary:hover` background `#000`. Recommend `--color-btn-primary-hover-bg-light: #000` mirrored under `[data-theme="light"]`, OR override the existing `--btn-primary-hover-bg` per-theme.
3. **L-3** — name a token for the input focus-ring rgba `rgba(17,17,17,0.06)`. Recommend `--ring-focus-ink-light: 0 0 0 3px rgba(17,17,17,0.06)`. Pairs with dark-mode `--ring-focus-ink` which Cluster 11 deferred.
4. **L-4** — name primitive-specific tokens for off-scale values used by auth chrome (see `cluster-01-tokens-used.md` §2 + §3): `--auth-card-w-std: 380px`, `--auth-card-w-wide: 420px`, `--auth-card-pad: 28px 28px 24px`, `--auth-card-gap: 18px`, `--auth-card-radius: 10px`, `--auth-card-shadow: 0 1px 0 rgba(0,0,0,0.02), 0 14px 40px -24px rgba(0,0,0,0.10)`, `--auth-cta-pad: 10px 14px`, `--auth-cta-font: 13.5px`, `--auth-second-pad: 9px 14px`, `--auth-second-font: 13px`, `--auth-input-pad: 9px 12px`, `--auth-input-font: 14px`, `--auth-otp-cell-w: 44px`, `--auth-otp-cell-h: 52px`, `--auth-otp-gap: 8px`, `--auth-otp-font: 18px`, `--auth-otp-cursor-h: 22px`, `--auth-medal-size: 48px`, `--auth-medal-icon: 22px`, `--auth-sent-pad: 14px`, `--auth-sent-radius: 8px`, `--auth-route-pad: 12px 14px`, `--auth-route-radius: 8px`, `--auth-h1-font: 22px / 1.22 / 600 / -0.018em`, `--auth-h1-eyebrow-font: 10px`, `--auth-lede-font: 13px / 1.55`, `--auth-lbl-font: 11.5px / 500 / -0.005em`, `--auth-help-font: 11.5px`, `--auth-foot-font: 12px`, `--auth-bottom-font: 11px`, `--auth-top-pad: 22px 28px`, `--auth-bottom-pad: 22px 28px 26px`, `--auth-stage-pad: 24px 24px 56px`, `--cursor-blink-duration: 1.1s steps(2,end) infinite`, `--input-transition: 0.12s ease`.

   Rationale: per Cluster 11 R-5 + R-6 pattern — off-scale primitive values land as primitive-specific tokens (not scale extensions) so the spacing scale stays clean and primitives expose intent.

### 1.4.a GOOGLE-BRAND EXEMPTION rows (token-exempt per IMPLEMENTATION_PROMPT.md §7 + §9)

Per amendment §3.3 + Google branding guidelines:

| Token | Value | Source | Status |
|---|---|---|---|
| (none — token-exempt) | `#131314` | Google branding guidelines (dark theme bg) | **Token-exempt per Google brand requirement.** Annotated inline at `KovaGoogleSignInButton.vue` with `/* token-exempt: Google brand requirement */` |
| (none — token-exempt) | `#8e918f` | Google branding guidelines (dark theme border) | Same as above |
| (none — token-exempt) | `#ffffff` | Google branding guidelines (dark theme text) | Same as above |
| (none — token-exempt) | `#4285F4` | Google G logo brand color (blue arc) | Same as above |
| (none — token-exempt) | `#34A853` | Google G logo brand color (green arc) | Same as above |
| (none — token-exempt) | `#FBBC05` | Google G logo brand color (yellow arc) | Same as above |
| (none — token-exempt) | `#EA4335` | Google G logo brand color (red arc) | Same as above |

All OTHER Google button colors (light theme bg `#ffffff` = `--page` LIGHT; light theme text = `--ink` LIGHT; light theme border = `--line` LIGHT) come from canonical tokens via L-1 mapping.

---

## §1.5 New components needed

Per §1.3 verdict column. Total: **12 new Vue SFCs** to ship in Cluster 01 + amendment.

**Layer 1 — Cluster 11 amendment (one new primitive):**
1. `src/components/ui/KovaGoogleSignInButton.vue`

**Layer 2 — c01 composable (one):**
2. `src/composables/auth/use-google-oauth.ts`

**Layer 3 — c01 thin wrapper (one):**
3. `src/components/auth/GoogleSignInButton.vue`

**Layer 4 — c01 shared auth-shell components (10 — Plan 01 Tasks 14 + 15):**
4. `src/components/auth/AuthShell.vue`
5. `src/components/auth/AuthCard.vue`
6. `src/components/auth/AuthHeading.vue`
7. `src/components/auth/AuthCta.vue`
8. `src/components/auth/AuthMedal.vue`
9. `src/components/auth/AuthIcon.vue`
10. `src/components/auth/AuthField.vue`
11. `src/components/auth/OtpInput.vue`
12. `src/components/auth/MagicLinkSentBlock.vue`
13. `src/components/auth/PersistentSessionToggle.vue`

**Layer 5 — c01 view rewrites (2 — Plan 01 Task 17):**
14. `src/views/SignupView.vue` (rewrite — replace M5 version)
15. `src/views/LoginView.vue` (rewrite — replace M5 version)

**Layer 6 — c01 net-new views (6 — Plan 01 Tasks 18-20):**
16. `src/views/auth/ForgotPasswordView.vue`
17. `src/views/auth/MagicLinkErrorView.vue` (handles B4.1 + B4.2)
18. `src/views/auth/AuthCallbackView.vue`
19. `src/views/auth/EmailChangeVerifyView.vue` (B5.1 + B5.2 — out of LIGHT Phase 1 visual scope but listed)
20. `src/views/auth/SessionExpiredView.vue` (B4.7 — DARK)
21. `src/views/auth/DesktopOnlyView.vue` (B6 — LIGHT)
22. `src/views/auth/AccountPendingDeletionView.vue` (DARK)
23. `src/views/auth/PrivacyPolicyView.vue` (LIGHT via MarketingShell)
24. `src/views/auth/TermsView.vue` (LIGHT via MarketingShell)

**Layer 7 — c01 account surface (1 — Plan 01 Task 16):**
25. `src/components/account/DangerZoneCard.vue` (DARK — composes KovaModal)

**Files to MODIFY:**
- `src/app.css @theme` — add light-theme overrides under `[data-theme="light"]` selector + primitive-specific tokens per L-1..L-4.
- `design-system/canonical/kova-hifi-light.css` — already exists; no changes needed (canonical authority for light tokens).
- `design-system/canonical/kova-hifi.css :root` — no changes needed for c01.
- `src/router.ts` — wire 11 new routes + mount `authGuard` (Plan 01 Task 13.3 deferred).

**Files to LEAVE UNCHANGED:**
- All Cluster 11 `src/components/ui/Kova*.vue` primitives.
- All `design-system/hifi/*` (byte-frozen mockups).

---

## §1.6 Open questions for founder

Route each via `AskUserQuestion`. Cannot proceed to Phase 2 (Vue impl) until every Q is answered. Most have a default recommendation already.

### Q-1 — Light-theme application mechanism

Light tokens currently exist only in `design-system/canonical/kova-hifi-light.css`. They are NOT in `src/app.css @theme`. Tailwind 4's `@theme` block is global by default; auth pages need light values to override the global dark values.

**Pick one:**
- **(1A)** Add a `[data-theme="light"] { ... }` selector block inside `src/app.css` (NOT inside `@theme` — this would re-define utility classes; outside `@theme` it just applies via CSS cascade). The `AuthShell` wrapper sets `data-theme="light"`. Tailwind utilities like `bg-page` keep their dark value globally; the CSS variable override re-targets the SAME utility class to light values inside the subtree.
- **(1B)** Define a parallel `@theme` set of LIGHT tokens with `-light` suffix (`--color-page-light: #ffffff` etc.) and emit them as Tailwind utilities `bg-page-light`, `text-ink-light`. Components opt in per-class. Plan 01 Task 14 example code (line 3024) sketches this approach already.
- **(1C)** Use CSS layers + `@media (prefers-color-scheme)` — REJECTED (per memory `feedback_app_dark_website_light` no theme toggle; per PRD 01 §3.5 the route's `meta.theme` field is the source).

**Recommendation: (1A).** Per `kova-hifi-light.css` lines 10-11, the canonical light file already uses `:root, [data-theme="light"]` as its selector. Mirror that pattern in `app.css` for parity. Plan 01 Task 14 example's `bg-page-light` approach (1B) creates parallel utility name pairs, doubling the API surface for every primitive — error-prone. (1A) keeps `bg-page` as a single utility whose value changes per-subtree.

### Q-2 — `.btn.primary` light-mode hover color (`#000`)

Light-mode `.btn.primary:hover` swaps to `#000` background (kova-hifi-light.css L209). Dark-mode swaps to `#fff` (`--btn-primary-hover-bg`). The existing `@theme` token `--btn-primary-hover-bg: #fff` is hardcoded to the dark value.

**Pick one:**
- **(2A)** Override `--btn-primary-hover-bg` inside `[data-theme="light"]` to `#000`. Single token name, value swaps per theme — matches (1A) pattern. Recommended.
- **(2B)** Add a sibling token `--btn-primary-hover-bg-light: #000` and have `.btn.primary:hover` use a CSS `var(--btn-primary-hover-bg, var(--btn-primary-hover-bg-light, #000))` fallback chain. Convoluted.
- **(2C)** Keep as raw hex inside the light-theme selector with `/* token-exempt */` — viable but discouraged since (2A) is clean.

**Recommendation: (2A).**

### Q-3 — Focus-ring rgba — light variant

A15 input focus uses `box-shadow: 0 0 0 3px rgba(17,17,17,0.06)` — ink-tinted 6% alpha. Cluster 11 deferred naming the dark focus ring (`--ring-focus-ink`) per R-3. This cluster adds the LIGHT equivalent.

**Pick one:**
- **(3A)** Name `--ring-focus-ink-light: 0 0 0 3px rgba(17,17,17,0.06)` + (Cluster 11 catch-up) name `--ring-focus-ink: 0 0 0 3px rgba(235,235,238,0.05)` for dark. Both live in `@theme`; light value overrides under `[data-theme="light"]`. Single utility, theme-aware.
- **(3B)** Use the existing `outline` Tailwind utility with `var(--ring-focus-ink)` — same outcome, different CSS plumbing.
- **(3C)** Keep as raw rgba inside the auth component CSS — discouraged.

**Recommendation: (3A)** + opportunistically close Cluster 11 R-3 (3 lines of CSS).

### Q-4 — KovaPill drift for "DELIVERED" tag

A15.03 `.tag-mono.ok` tag (`padding 2px 6px / font-size 11.5 / radius 3`) is **smaller** than canonical `.pill` (`padding 4px 9px / radius 999 / font-size 11.5`). Two paths:

- **(4A)** Add a `<KovaPill size="xs">` variant matching the A15 `.tag-mono` spec. Extends Cluster 11. Requires CHANGELOG-KOVA.md entry per lift-the-lock for Cluster 11 (if Cluster 11 ship is sealed).
- **(4B)** Build a standalone `<AuthDeliveryTag>` inside `MagicLinkSentBlock` per A15 chrome literally. Avoids touching Cluster 11.
- **(4C)** Reuse `<KovaPill variant="outline">` as-is; accept the 2px / 3px drift visually. Discouraged — Hard Rule #17.

**Recommendation: (4B).** Keep Cluster 11 sealed. The "DELIVERED" tag is a one-off pattern inside `MagicLinkSentBlock`; building a 6-line inline component is cleaner than extending the primitive layer.

### Q-5 — Switch primitive for PersistentSessionToggle

A15.06 shows a SWITCH (`<span class="toggle on" role="switch">`). Cluster 11 ships `KovaCheckbox` but no `KovaSwitch`.

- **(5A)** Build a standalone switch primitive inline inside `PersistentSessionToggle.vue` (no separate Cluster 11 primitive). 30-line SFC with native `<input type="checkbox" role="switch">` + Tailwind styling. Recommended for one-off MVP use.
- **(5B)** Build `KovaSwitch.vue` in Cluster 11 (lift-the-lock entry + CHANGELOG-KOVA.md). Future-proof but heavier.
- **(5C)** Reuse `KovaCheckbox` with a `variant="switch"` prop. Conflates two different ARIA roles (`role=checkbox` vs `role=switch`) — discouraged.

**Recommendation: (5A).** Switch is auth-only at MVP; no other surface needs it. If a second consumer appears, promote to Cluster 11 later.

### Q-6 — KovaButton vs `<AuthCta>` composition pattern

Plan 01 Task 14 spec sketches `<AuthCta>` as a NEW component composing the full-width auth button. Alternative: extend KovaButton with `fullWidth` + `size="auth"` props.

- **(6A)** Build `<AuthCta>` as a thin wrapper around `<KovaButton>` that applies the `.auth-cta` / `.auth-second` size + layout overrides (full-width, taller pad, different font sizes). Plan 01 specs this. Keeps Cluster 11 sealed.
- **(6B)** Extend `<KovaButton>` with `variant="auth-cta"` + `variant="auth-second"`. Requires Cluster 11 amendment.

**Recommendation: (6A).** Auth has unique size-pad-font triples (`auth-cta` = `10px 14px / 13.5px`; `auth-second` = `9px 14px / 13px`); they don't fit the Cluster 11 button size enum (`sm` = `5px 9px / 12px`, default = `7px 12px / 12.5px`, `icon` = 30×30 square). Wrap, don't extend.

### Q-7 — Auto-submit on OTP 6th digit (Plan 01 Task 15 calls this out)

Hi-fi A15.04 shows `<button>Continue</button>` disabled until 6 cells filled. Plan 01 §12.6 says "auto-submit on complete" — submit fires on the 6th digit without requiring a button click. The button stays clickable as a fallback.

- **(7A)** Auto-submit on `complete` (per founder Plan §12.6). The button becomes a visual confirmation, not the action trigger. ✅ matches Plan.
- **(7B)** Require button click. Slower UX. Discouraged.

**Recommendation: (7A).** Already founder-ratified — just flagging for confirmation.

### Q-8 — `meta.theme = 'light'` mechanism in router

PRD 01 §3.5 says routes carry `meta.theme: 'light' | 'dark'`. The `<AuthShell>` reads this and sets `data-theme` on its root. Confirm wiring approach:

- **(8A)** `App.vue` or root layout reads `route.meta.theme` via `useRoute()` and applies `data-theme` to `<html>` or root `<div>`. Single source of truth.
- **(8B)** Each view sets `data-theme` via `<AuthShell :theme="route.meta.theme">`. Local responsibility; slight duplication.

**Recommendation: (8A)** for body-level dark/light + (8B) for per-component `<AuthShell>`. Belt-and-braces. The shell pages render light content even if `<html>` doesn't carry the attribute (defensive).

### Q-9 — A15-amendment hi-fi modification deferred

Per amendment §3.4 + founder lock 2026-05-21: A15 hi-fi HTML is **NOT** modified to add the Google button. The Google button visual is derived from `KovaGoogleSignInButton` primitive (Google brand spec) + slotted above existing `<AuthField>` in `SignupView.vue` / `LoginView.vue`. Confirm:

- **(9A)** Do NOT modify A15.html. Vue impl matches A15.01/A15.02 pixel-for-pixel for everything BELOW the Google button. Google button visual = standalone primitive spec'd against Google brand guidelines. No per-screen visual-diff against A15.html for the Google button itself (no mockup pixels exist for it). Visual-diff against a SEPARATE primitive fixture clipped against the Google brand spec. ✅ matches founder lock.
- **(9B)** Modify A15.html to insert the Google button (REJECTED by founder 2026-05-21 — flagged for confirmation only).

**Recommendation: (9A).** Already founder-ratified — flagging for confirmation.

### Q-10 — Visual-diff fixture for the Google button (no hi-fi reference)

Per IMPLEMENTATION_PROMPT.md §5: "For each primitive that does NOT have a dedicated hi-fi mockup of its own, extract the spec from a screen hi-fi…" The Google button does NOT exist in ANY hi-fi mockup (A15 doesn't have it; B4 doesn't have it; no other surface).

- **(10A)** Build a primitive-only visual fixture at `tests/visual-diff/fixtures/google-sign-in-button.html` rendering the primitive in light + dark themes per Google brand spec. Reference image for visual-diff. Pattern matches Cluster 11 Q-G (G2) for primitives without dedicated hi-fi.
- **(10B)** Skip per-primitive visual-diff; rely on per-screen diff in `SignupView` + `LoginView`. ⚠️ Risk: the per-screen diff includes the Google button area pixel-by-pixel, but with no mockup pixels to compare against, the diff would either mask the region or fail.
- **(10C)** Build a `/dev/google-button` Vue route as the diff target; bake the Google brand spec into the route via static markup. Diff route vs route.

**Recommendation: (10A).** Smallest scope. Single fixture, clip-region pattern (per Cluster 11 G1). Documented in `tests/visual-diff/fixtures/README.md`.

### Q-11 — Pre-flight Google Cloud setup (founder operator step)

Per amendment §4: founder must create Google Cloud OAuth client + paste client ID + secret into Supabase Studio BEFORE Phase 2 Vue impl. Plan 01 Task 23 + `docs/operations/supabase-auth-config.md` capture the steps. Phase 1 does not block on this (Vue impl can develop with the redirect URL stubbed); Task 17 final smoke does.

**Recommendation: confirm operator status before Phase 2 starts.** If Google Cloud not ready, Phase 2 proceeds with `useGoogleOAuth().signIn()` callable but final smoke deferred to operator-ready.

### Q-12 — `useGoogleOAuth` composable contract

Per amendment §3.2 Plan 01 Task 9 update: `store.signInWithGoogle` becomes canonical (un-deprecate). Plan 01 doesn't spell out the composable signature. Propose:

```ts
// src/composables/auth/use-google-oauth.ts
export function useGoogleOAuth() {
  return {
    signIn: async (mode: 'signin' | 'signup') => {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/auth/callback` }
      })
      if (error) throw error
    }
  }
}
```

- **(12A)** Composable as proposed (matches existing `useMagicLink` / `useOtp` shape).
- **(12B)** Different shape — founder dictates.

**Recommendation: (12A).**

---

## §1.7 Phase 1 acceptance criteria (per IMPLEMENTATION_PROMPT.md §12 DoD)

Before agent proceeds to Phase 2 (Vue impl):
- [ ] Founder reads `cluster-01-tokens-used.md` end-to-end.
- [ ] Founder reads this `cluster-01-KOVA_AUDIT.md` end-to-end.
- [ ] Founder answers Q-1 through Q-12 above (via AskUserQuestion).
- [ ] Founder approves L-1 through L-4 in `cluster-01-tokens-used.md` §9 (default recommendations OK as a block, or pick line-by-line).
- [ ] Founder approves the GOOGLE-BRAND EXEMPTION row block in §1.4.a (4 hex literals × 2 themes = 7 exempt values).
- [ ] Founder confirms operator Google Cloud / Supabase Studio pre-flight status (Q-11).

After approval the agent will:
1. **Phase 2:** Build `KovaGoogleSignInButton` primitive in Cluster 11 (Plan 11 amendment / lift-the-lock entry). Test + commit.
2. **Phase 3:** Build `useGoogleOAuth` composable + test.
3. **Phase 4:** Build `GoogleSignInButton.vue` wrapper + test.
4. **Phase 5:** Wire light tokens (L-1..L-4) into `src/app.css @theme`. Pause + screenshot `/dev/tokens` (light variant) for founder approval before Phase 6.
5. **Phase 6:** Build 10 auth-shell components (Tasks 14 + 15) one-by-one. Per-component visual-diff ≤ 0.1%.
6. **Phase 7:** Rewrite SignupView. Per-screen written diff. Visual-diff ≤ 0.5%.
7. **Phase 8:** Rewrite LoginView. Same gates.
8. **Phase 9..12:** Per Plan 01 Tasks 18-25 + cluster-end agents + DONE report.

---

## §1.8 What did the prior W8a ship that's worth keeping?

Per HANDOFF §2 + git log `feat/m9-shopify..HEAD` (9 commits): backend + composables + store extension + router guard + legal docs + Supabase config + GDPR cron + migration. **All 9 commits ✅ keep — no regression.** The Vue layer is a clean greenfield on top.

Specifically:
- `src/composables/auth/use-magic-link.ts` + `use-otp.ts` + `use-account-deletion.ts` + `use-email-change.ts` + `use-session-watcher.ts` + `use-viewport-guard.ts` — REUSE in Vue impl.
- `src/router/guards/auth-guard.ts` — wired into router.ts at Phase 10.
- `src/stores/auth.ts` — REUSE; `signInWithGoogle` un-deprecated per amendment §3.2.
- All `api/` Edge Functions + cron handlers — REUSE; no changes for Phase 2+.

---

## §1.9 Risks + mitigations

| Risk | Mitigation |
|---|---|
| **R1: 4 token resolutions (L-1..L-4) gated on founder.** | tokens-used.md §9 gives a default recommendation per resolution; founder approves block or line-item. Re-mapping cost is low (config-only — no Vue file rewrite needed). |
| **R2: Light-theme switch via `[data-theme="light"]` may interact with existing dark utility classes (e.g., `bg-page` baked at `#1a1a1d` globally).** | Q-1 (1A) routes through CSS variable override, NOT utility re-emission. Tailwind utility classes resolve `var(--color-page)` at render time, so when the parent `[data-theme="light"]` rewrites `--color-page` to `#ffffff`, every descendant `bg-page` resolves to white. Verified by Cluster 11 R-1 pattern (already shipped) where `--rail` etc. swap correctly per context. |
| **R3: Google brand spec colors are token-exempt — lint will flag them.** | Apply `/* token-exempt: Google brand requirement */` comment inline at `KovaGoogleSignInButton.vue`. Lint rule (`scripts/lint/no-raw-visual-values.ts`) honors the override per IMPLEMENTATION_PROMPT.md §9. Founder approval recorded in tokens-used.md §0. |
| **R4: A15 hi-fi doesn't contain the Google button — visual-diff has no source-of-truth pixels for it.** | Q-10 (10A) builds a primitive-only fixture (`tests/visual-diff/fixtures/google-sign-in-button.html`) rendering the primitive against Google brand spec. Clip-region diff matches Cluster 11 G1 precedent. |
| **R5: Plan 01 Task 14 sketch (line 3024) uses `bg-page-light` parallel utility — may conflict with Q-1 (1A) recommendation.** | Update the sketch comment when Phase 5 lands; the Vue impl uses (1A) pattern, not the Plan's (1B) sketch. Plan 01 is illustrative; impl is normative. |
| **R6: KovaPill canonical spec (4px 9px / 999 radius) doesn't match A15 `.tag-mono` (2px 6px / 3 radius) — Q-4.** | Q-4 (4B) builds the tag inline inside `MagicLinkSentBlock` — no Cluster 11 dependency. |
| **R7: PRD 01 §3.1 lists B4.7 + B5 + B6 surfaces (out of LIGHT Phase 1 scope) — agent might silently skip in audit.** | Documented explicitly in §0.3 — these surfaces are listed but their tokens overlap with audited LIGHT or DARK sets already covered by Cluster 11. No silent exclusion. |

---

## §1.10 Estimated timeline (after founder approval)

Per amendment §5 + Plan 01 task block sizing (Tasks 14-25, ~94 steps).

| Phase | Time |
|---|---|
| Phase 2 (`KovaGoogleSignInButton` primitive + test + visual-fixture) | 30-45 min |
| Phase 3 (`useGoogleOAuth` composable + test) | 15 min |
| Phase 4 (`GoogleSignInButton` wrapper + test) | 15 min |
| Phase 5 (light tokens wired into `app.css @theme` + `/dev/tokens` light variant) | 30-45 min |
| Phase 6 (10 auth-shell SFCs × ~12 min including visual-diff loop) | 2 hours |
| Phase 7 (SignupView rewrite — light, B4.5 inline error, Google button slot) | 45 min |
| Phase 8 (LoginView rewrite — 5-state machine, B4.6 + B4.3/4 inline errors, Google button slot) | 75 min |
| Phase 9 (6 remaining views — ForgotPassword + MagicLinkError + AuthCallback + EmailChangeVerify + SessionExpired + DesktopOnly + AccountPendingDeletion + Privacy + Terms) | 2 hours |
| Phase 10 (router.ts wiring + guards + mobile fallback) | 30 min |
| Phase 11 (E2E specs incl. Google OAuth + security verification) | 75 min |
| Phase 12 (cluster-end agents + DONE report) | 60 min |
| **Total** | **8.5-10 hours active agent time** |

---

**End of cluster-01-KOVA_AUDIT.md. Founder reviews → AskUserQuestion next. Pair with cluster-01-tokens-used.md.**
