# Cluster 01 — Tokens Used (Phase 1 audit gate doc)

**Status (draft):** Phase 1 audit gate doc. Created 2026-05-21 by W8a resume agent.
**Authority:** `docs/execution-phase/claude-design-files/IMPLEMENTATION_PROMPT.md` §3 + §7. No Vue / TS code until founder approves every ⚠️ MISSING row below + the GOOGLE-BRAND EXEMPTION block in §0.
**Method:** every visual value extracted from `design-system/hifi/auth/Kova Hi-Fi A15 Auth - Light.html` + `design-system/hifi/auth/Kova Hi-Fi B4 Auth Errors - Light.html` inline `<style>` blocks. Mapped to either an existing token in `design-system/canonical/kova-hifi-light.css :root` + `src/app.css @theme` — OR ⚠️ MISSING (founder must pick a resolution per drift protocol §7).

> **Reference format:** `docs/execution-phase/cluster-audits/cluster-11-tokens-used.md` (approved 2026-05-20).

---

## 0. GOOGLE-BRAND EXEMPTION block (token-exempt per Google branding guidelines)

Per `W8a-cluster-01-AMENDMENT-google-oauth.md` §3.3 + IMPLEMENTATION_PROMPT.md §7 drift protocol option (c) "Keep the literal with `/* token-exempt: <justification> */` override comment".

Google's [official branding guidelines](https://developers.google.com/identity/branding-guidelines) mandate exact colors for the "Sign in with Google" button + the G logo SVG. These cannot pass through canonical Kova tokens.

| Token | Value | Source | Status |
|---|---|---|---|
| (none — token-exempt) | `#131314` | Google branding guidelines (dark theme bg) | **Token-exempt per Google brand requirement.** Annotated inline at `KovaGoogleSignInButton.vue` with `/* token-exempt: Google brand requirement */` |
| (none — token-exempt) | `#8e918f` | Google branding guidelines (dark theme border) | Same as above |
| (none — token-exempt) | `#ffffff` | Google branding guidelines (dark theme text) | Same as above |
| (none — token-exempt) | `#4285F4` | Google G logo brand color (blue arc) | Same as above (inlined SVG inside `src/components/ui/KovaGoogleSignInButton.vue` per post-Phase-1 fix 2026-05-22 — the pre-existing `GoogleIcon.vue` was deleted to consolidate brand-hex into one file) |
| (none — token-exempt) | `#34A853` | Google G logo brand color (green arc) | Same as above |
| (none — token-exempt) | `#FBBC05` | Google G logo brand color (yellow arc) | Same as above |
| (none — token-exempt) | `#EA4335` | Google G logo brand color (red arc) | Same as above |

**All other Google button colors come from canonical Kova tokens:**

| Surface | Token | Light value | Dark value |
|---|---|---|---|
| Google button (light theme) bg | `--page` | `#ffffff` | n/a |
| Google button (light theme) text | `--ink` | `#18181b` | n/a |
| Google button (light theme) border | `--line` | `#e4e4e1` | n/a |
| Google button height (both themes) | `--auth-cta-height` (proposed L-4) | `44px` | `44px` |
| Google button radius (both themes) | `--auth-cta-radius` (= canonical `.btn` `6px`) | `6px` | `6px` |

---

## 1. Source hi-fi files (cluster-01 surface → spec source)

| Surface | Source hi-fi(s) — selectors used |
|---|---|
| A15.01 Signup · email entry | `Kova Hi-Fi A15 Auth - Light.html` `.auth-shell + .auth-top + .auth-stage + .auth-card + .auth-head + .auth-field + .auth-cta + .auth-or + .auth-second + .auth-foot + .auth-bottom` (lines 46-183) |
| A15.02 Login · email entry | Same selectors as A15.01; help-link variant in `.lbl` (lines 380-385) |
| A15.03 Magic-link sent | `.auth-sent + .auth-sent .row + .auth-sent .row.timer + .tag-mono` (lines 185-203) |
| A15.04 OTP code entry | `.auth-card.wide + .auth-otp + .auth-otp .cell + .cell.filled + .cell.cursor + .cell.empty + @keyframes cursor-blink` (lines 96, 221-242) |
| A15.05 Forgot password | Same as A15.01 + `.auth-field .help` (line 140) |
| A15.06 Email verified | `.auth-medal + .auth-medal.ok + .auth-route + .auth-route .l .nm + .l .sub` (lines 205-260) |
| B4.1 Magic-link expired | A15-lifted chrome only (B4 file lines 51-259 byte-for-byte from A15) |
| B4.2 Magic-link invalid | Same |
| B4.3 OTP wrong (inline) | A15 OTP + B4 extensions `.auth-field .input.error` + `.auth-otp .cell.error` + `.help.warn` (B4 lines 265-266, A15 line 142) |
| B4.4 OTP locked | A15 OTP + B4 extension `.auth-otp.locked .cell` (B4 lines 276-279) |
| B4.5 Signup email-exists (inline) | A15 + B4 extensions `.input.error` + `.help .accent-link` (B4 lines 265, 269-273) |
| B4.6 Login user-not-found (inline) | Same as B4.5 |
| (amended) Signup with Google | A15.01 + `KovaGoogleSignInButton` (no hi-fi — Google brand spec) |
| (amended) Login with Google | A15.02 + `KovaGoogleSignInButton` (no hi-fi — Google brand spec) |

---

## 2. Colors

`--*` short names below are LIGHT-theme resolved values per `kova-hifi-light.css :root`. ALL light-theme tokens are ⚠️ **MISSING from `src/app.css @theme`** — Resolution L-1.

| Surface element | Selector / line | CSS value | Maps to (short) | Status |
|---|---|---|---|---|
| **AuthShell bg** | A15 `.auth-shell` L48 | `var(--bg)` `#ffffff` | `--bg` | ⚠️ L-1 (light @theme missing) |
| **AuthShell top wordmark text** | A15 `.auth-top .wordmark` L61 | `var(--ink)` `#18181b` | `--ink` | ⚠️ L-1 |
| **AuthShell top wordmark glyph bg** | A15 `.wordmark .glyph` L66 | `var(--ink)` | `--ink` | ⚠️ L-1 |
| **AuthShell top wordmark glyph fg** | A15 L66 (A15) / L71 (B4) | `#fff` (A15) / `var(--page)` (B4) — A15 raw, B4 tokenized | `--page` light = `#ffffff` | ⚠️ A15 hex is raw `#fff` — drift L-5 |
| **AuthShell top corner text** | A15 `.auth-top .corner` L73 | `var(--ink-3)` `#8a8a8f` | `--ink-3` | ⚠️ L-1 |
| **AuthShell top corner link idle** | A15 `.corner a` L75 | `var(--ink-2)` `#5a5a60` | `--ink-2` | ⚠️ L-1 |
| **AuthShell top corner link hover** | A15 `.corner a:hover` L76 | `var(--ink)` `#18181b` | `--ink` | ⚠️ L-1 |
| **AuthShell bottom strip text** | A15 `.auth-bottom` L178 | `var(--ink-3)` | `--ink-3` | ⚠️ L-1 |
| **AuthShell bottom link idle** | A15 `.auth-bottom a` L182 | `var(--ink-3)` | `--ink-3` | ⚠️ L-1 |
| **AuthShell bottom link hover** | A15 `.auth-bottom a:hover` L183 | `var(--ink-2)` | `--ink-2` | ⚠️ L-1 |
| **AuthCard bg** | A15 `.auth-card` L89 | `var(--page)` `#ffffff` | `--page` | ⚠️ L-1 |
| **AuthCard border** | A15 `.auth-card` L90 | `1px solid var(--line)` `#e4e4e1` | `--line` | ⚠️ L-1 |
| **AuthHeading eyebrow** | A15 `.auth-head .eyebrow` L103 | `var(--ink-3)` | `--ink-3` | ⚠️ L-1 |
| **AuthHeading h1** | A15 `.auth-card h1` L106 | `var(--ink)` | `--ink` | ⚠️ L-1 |
| **AuthHeading lede** | A15 `.auth-lede` L109 | `var(--ink-2)` | `--ink-2` | ⚠️ L-1 |
| **AuthField label** | A15 `.auth-field .lbl` L116 | `var(--ink-2)` | `--ink-2` | ⚠️ L-1 |
| **AuthField help-link idle** | A15 `.lbl .help-link` L121 | `var(--ink-2)` | `--ink-2` | ⚠️ L-1 |
| **AuthField help-link hover** | A15 `.help-link:hover` L124 | `var(--ink)` | `--ink` | ⚠️ L-1 |
| **AuthField input bg** | A15 `.input` L129 | `var(--page)` | `--page` | ⚠️ L-1 |
| **AuthField input border** | A15 `.input` L127 | `1px solid var(--line)` | `--line` | ⚠️ L-1 |
| **AuthField input text** | A15 `.input` L130 | `var(--ink)` | `--ink` | ⚠️ L-1 |
| **AuthField input focus border** | A15 `.input:focus` L136 | `var(--ink-2)` | `--ink-2` | ⚠️ L-1 |
| **AuthField input focus ring** | A15 L137 | `0 0 0 3px rgba(17,17,17,0.06)` | n/a — focus-ring rgba | ⚠️ L-3 (focus-ring token missing) |
| **AuthField input placeholder** | A15 `.input::placeholder` L139 | `var(--ink-3)` | `--ink-3` | ⚠️ L-1 |
| **AuthField input.locked bg** | A15 `.input.locked` L264 | `var(--rail)` `#fafaf9` | `--rail` | ⚠️ L-1 |
| **AuthField input.locked text** | A15 L265 | `var(--ink-2)` | `--ink-2` | ⚠️ L-1 |
| **AuthField input.error border** | B4 `.input.error` L265 | `var(--warn)` → resolves to `var(--ink-2)` | `--warn` (alias) | ⚠️ L-1 (warn alias degrades to ink-2; same token needs light-theme override) |
| **AuthField help text idle** | A15 `.help` L140 | `var(--ink-3)` | `--ink-3` | ⚠️ L-1 |
| **AuthField help.warn** | A15 `.help.warn` L142 | `var(--warn)` → `var(--ink-2)` | `--warn` alias | ⚠️ L-1 |
| **AuthField help .accent-link idle** | B4 `.help .accent-link` L270 | `var(--accent)` `#3b82f6` | `--accent` | ⚠️ L-1 |
| **AuthField help .accent-link hover** | B4 L273 | `var(--accent-ink)` `#1d4ed8` | `--accent-ink` | ⚠️ L-1 |
| **AuthCta primary bg** | canonical `.btn.primary` (light) | `var(--ink)` | `--ink` | ⚠️ L-1 |
| **AuthCta primary text** | canonical L208 | `#fff` | `--ink-on-primary` `#fff` | ✅ token exists (matches dark) |
| **AuthCta primary border** | canonical L208 | `var(--ink)` | `--ink` | ⚠️ L-1 |
| **AuthCta primary hover bg** | canonical L209 | `#000` | NOT TOKENIZED | ⚠️ L-2 (no light-theme hover token) |
| **AuthCta primary hover border** | canonical L209 | `#000` | NOT TOKENIZED | ⚠️ L-2 |
| **AuthCta disabled bg** | canonical `.btn[disabled]` L218 | `var(--page)` | `--page` | ⚠️ L-1 |
| **AuthCta disabled text** | canonical L217 | `var(--ink-3)` | `--ink-3` | ⚠️ L-1 |
| **AuthCta disabled border** | canonical L218 | `var(--line-2)` | `--line-2` | ⚠️ L-1 |
| **AuthSecond (ghost variant) bg** | canonical `.btn` L202 | `var(--page)` | `--page` | ⚠️ L-1 |
| **AuthSecond border** | canonical L201 | `1px solid var(--line)` | `--line` | ⚠️ L-1 |
| **AuthSecond text** | canonical L204 | `var(--ink)` | `--ink` | ⚠️ L-1 |
| **AuthSecond hover bg** | canonical L207 | `var(--fill)` | `--fill` | ⚠️ L-1 |
| **AuthSecond hover border** | canonical L207 | `var(--ink-3)` | `--ink-3` | ⚠️ L-1 |
| **AuthOr divider color** | A15 `.auth-or` L154 | `var(--ink-3)` | `--ink-3` | ⚠️ L-1 |
| **AuthOr divider rule bg** | A15 `.auth-or::before/::after` L157 | `var(--line-2)` | `--line-2` | ⚠️ L-1 |
| **AuthFoot text** | A15 `.auth-foot` L169 | `var(--ink-3)` | `--ink-3` | ⚠️ L-1 |
| **AuthFoot link idle** | A15 L171 | `var(--ink-2)` | `--ink-2` | ⚠️ L-1 |
| **AuthFoot link hover** | A15 L172 | `var(--ink)` | `--ink` | ⚠️ L-1 |
| **MagicLinkSentBlock bg** | A15 `.auth-sent` L191 | `var(--rail)` `#fafaf9` | `--rail` | ⚠️ L-1 |
| **MagicLinkSentBlock border** | A15 L189 | `1px solid var(--line-2)` | `--line-2` | ⚠️ L-1 |
| **MagicLinkSentBlock row text** | A15 `.row` L195 | `var(--ink-2)` | `--ink-2` | ⚠️ L-1 |
| **MagicLinkSentBlock row icon** | A15 `.row .ic` L197 | `var(--ink-3)` | `--ink-3` | ⚠️ L-1 |
| **MagicLinkSentBlock row b (email)** | A15 L198 | `var(--ink)` | `--ink` | ⚠️ L-1 |
| **MagicLinkSentBlock timer row** | A15 `.row.timer` L201 | `var(--ink-3)` | `--ink-3` | ⚠️ L-1 |
| **MagicLinkSentBlock DELIVERED tag bg** | canonical `.tag-mono` L249 | `var(--fill)` | `--fill` | ⚠️ L-1 (per Q-4 build inline, no KovaPill dep) |
| **MagicLinkSentBlock DELIVERED tag text** | canonical L249 | `var(--ink-2)` | `--ink-2` | ⚠️ L-1 |
| **MagicLinkSentBlock DELIVERED tag border** | canonical L250 | `var(--line)` | `--line` | ⚠️ L-1 |
| **OtpInput cell bg** | A15 `.auth-otp .cell` L228 | `var(--page)` | `--page` | ⚠️ L-1 |
| **OtpInput cell border idle** | A15 L227 | `1px solid var(--line)` | `--line` | ⚠️ L-1 |
| **OtpInput cell text (filled)** | A15 L229 / L231 | `var(--ink)` | `--ink` | ⚠️ L-1 |
| **OtpInput cell.cursor border** | A15 L233 | `var(--ink-2)` | `--ink-2` | ⚠️ L-1 |
| **OtpInput cell.cursor focus ring** | A15 L234 | `0 0 0 3px rgba(17,17,17,0.06)` | n/a | ⚠️ L-3 |
| **OtpInput cell.cursor caret** | A15 `.cell.cursor::after` L238 | `var(--ink)` | `--ink` | ⚠️ L-1 |
| **OtpInput cell.empty text** | A15 L241 | `var(--ink-3)` | `--ink-3` | ⚠️ L-1 |
| **OtpInput cell.error border** | B4 L266 | `var(--warn)` → `var(--ink-2)` | `--warn` alias | ⚠️ L-1 |
| **OtpInput.locked cell bg** | B4 `.auth-otp.locked .cell` L277 | `var(--rail)` | `--rail` | ⚠️ L-1 |
| **OtpInput.locked cell text** | B4 L277 | `var(--ink-3)` | `--ink-3` | ⚠️ L-1 |
| **OtpInput.locked cell border** | B4 L278 | `var(--line-2)` | `--line-2` | ⚠️ L-1 |
| **AuthMedal.ok bg** | A15 `.auth-medal.ok` L212 | `var(--ok-soft)` → `var(--fill)` `#f4f4f3` | `--ok-soft` alias | ⚠️ L-1 |
| **AuthMedal.ok text** | A15 L212 | `var(--ok)` → `var(--ink-2)` | `--ok` alias | ⚠️ L-1 |
| **AuthMedal.ok border** | A15 L213 | `1px solid #d6ecdb` | RAW HEX | ⚠️ L-6 — green-soft hairline, NOT tokenized |
| **AuthMedal.pending bg** | A15 `.medal.pending` L216 | `var(--review-soft)` → `var(--fill)` | `--review-soft` alias | ⚠️ L-1 |
| **AuthMedal.pending text** | A15 L216 | `var(--review)` → `var(--ink-2)` | `--review` alias | ⚠️ L-1 |
| **AuthMedal.pending border** | A15 L217 | `1px solid #f1dfba` | RAW HEX | ⚠️ L-6 — yellow-soft hairline, NOT tokenized |
| **PersistentSessionToggle row bg** | A15 `.auth-route` L250 | `var(--rail)` | `--rail` | ⚠️ L-1 |
| **PersistentSessionToggle row border** | A15 L249 | `1px solid var(--line-2)` | `--line-2` | ⚠️ L-1 |
| **PersistentSessionToggle row nm** | A15 `.auth-route .nm` L256 | `var(--ink)` | `--ink` | ⚠️ L-1 |
| **PersistentSessionToggle row sub** | A15 `.l .sub` L259 | `var(--ink-3)` | `--ink-3` | ⚠️ L-1 |
| **PersistentSessionToggle row icon** | A15 `.auth-route .ic` L260 | `var(--ink-3)` | `--ink-3` | ⚠️ L-1 |
| **Google sign-in button (light) bg** | KovaGoogleSignInButton.vue | `var(--page)` light = `#ffffff` | `--page` (light) | ⚠️ L-1 |
| **Google sign-in button (light) text** | same | `var(--ink)` light = `#18181b` | `--ink` (light) | ⚠️ L-1 |
| **Google sign-in button (light) border** | same | `1px solid var(--line)` light = `#e4e4e1` | `--line` (light) | ⚠️ L-1 |
| **Google sign-in button (dark) bg** | same — dark variant | `#131314` | TOKEN-EXEMPT | ✅ §0 exemption |
| **Google sign-in button (dark) text** | same — dark variant | `#ffffff` | TOKEN-EXEMPT | ✅ §0 exemption |
| **Google sign-in button (dark) border** | same — dark variant | `1px solid #8e918f` | TOKEN-EXEMPT | ✅ §0 exemption |
| **Google G logo (4 colors)** | `src/components/ui/KovaGoogleSignInButton.vue` (inlined 48×48 SVG) | `#4285F4 / #34A853 / #FBBC05 / #EA4335` | TOKEN-EXEMPT | ✅ §0 exemption |

---

## 3. Spacing (px exact)

| Surface element | Selector / line | Value | Maps to | Status |
|---|---|---|---|---|
| **AuthShell top padding** | A15 `.auth-top` L56 | `22px 28px` | NOT ON SCALE (22 ≠ 20/24; 28 ≠ 24/32) | ⚠️ L-4 — `--auth-top-pad` |
| **AuthShell top wordmark gap** | A15 `.wordmark` L60 | `8px` | on scale | ✅ |
| **AuthShell top corner gap** | A15 `.auth-top .corner` L72 | `14px` | on scale | ✅ |
| **AuthShell stage padding** | A15 `.auth-stage` L81 | `24px 24px 56px` | 56 NOT on scale | ⚠️ L-4 — `--auth-stage-pad` |
| **AuthShell bottom strip padding** | A15 `.auth-bottom` L176 | `22px 28px 26px` | 22, 26 NOT on scale | ⚠️ L-4 — `--auth-bottom-pad` |
| **AuthShell bottom links gap** | A15 L181 | `16px` | on scale | ✅ |
| **AuthCard padding** | A15 `.auth-card` L92 | `28px 28px 24px` | 28 NOT on scale | ⚠️ L-4 — `--auth-card-pad` |
| **AuthCard inner gap** | A15 L93 | `18px` | NOT on scale (18 ≠ 16/20) | ⚠️ L-4 — `--auth-card-gap` |
| **AuthHeading gap** | A15 `.auth-head` L100 | `6px` | on scale | ✅ |
| **AuthField gap (label→input→help)** | A15 `.auth-field` L114 | `6px` | on scale | ✅ |
| **AuthField input padding** | A15 `.input` L131 | `9px 12px` | 9 NOT on scale | ⚠️ L-4 — `--auth-input-pad` |
| **AuthCta padding** | A15 `.auth-cta` L147 | `10px 14px` | on scale (10, 14) | ✅ — but flag `--auth-cta-pad` for primitive intent |
| **AuthSecond padding** | A15 `.auth-second` L162 | `9px 14px` | 9 NOT on scale | ⚠️ L-4 — `--auth-second-pad` |
| **AuthOr gap** | A15 `.auth-or` L153 | `12px` | on scale | ✅ |
| **AuthSent padding** | A15 `.auth-sent` L188 | `14px` | on scale | ✅ — flag `--auth-sent-pad` for primitive intent |
| **AuthSent gap** | A15 L187 | `10px` | on scale | ✅ |
| **AuthSent row gap** | A15 `.auth-sent .row` L194 | `10px` | on scale | ✅ |
| **AuthMedal margin-bottom** | A15 `.auth-medal` L209 | `2px` | on scale | ✅ |
| **OtpInput gap** | A15 `.auth-otp` L223 | `8px` | on scale | ✅ |
| **AuthRoute padding** | A15 `.auth-route` L248 | `12px 14px` | on scale | ✅ — flag `--auth-route-pad` for primitive intent |
| **AuthRoute gap (row content)** | A15 L247 | `10px` | on scale | ✅ |
| **AuthRoute left col gap** | A15 `.auth-route .l` L253 | `2px` | on scale | ✅ |
| **AuthFoot margin-top** | A15 `.auth-foot` L167 | `2px` | on scale | ✅ |
| **wordmark.glyph size** | A15 L65 | `20×20px` | on scale (20) | ✅ |
| **AuthHeading eyebrow→h1 gap** | inherits `.auth-head gap: 6px` | `6px` | on scale | ✅ |

**Summary:** 9 ⚠️ off-scale or primitive-intent rows. All collapse to Resolution L-4 (per-primitive named tokens).

---

## 4. Sizing (heights / fixed dims / widths)

| Surface element | Selector / line | Value | Maps to | Status |
|---|---|---|---|---|
| **AuthCard width (standard)** | A15 `.auth-card` L88 | `width: 380px; max-width: 100%` | NOT TOKENIZED | ⚠️ L-4 — `--auth-card-w-std: 380px` |
| **AuthCard width (wide — OTP only)** | A15 `.auth-card.wide` L96 | `420px` | NOT TOKENIZED | ⚠️ L-4 — `--auth-card-w-wide: 420px` |
| **AuthCta height (implicit from padding 10+10 + 13.5 line)** | A15 L147 | ~36-40px (3+3 padding-y + text+icon + 1+1 border) → calc 34-38px depending on font line-height | not explicitly tokenized but visually equals Google's 44px target | ⚠️ L-4 — propose `--auth-cta-height` = match Google brand spec 44px target; current padding+font yields ~38px; investigate per-component visual-diff. **Founder confirm via Q-?** |
| **AuthSecond height** | A15 L162 | implicit (9+9 padding) ~34px | NOT TOKENIZED | ⚠️ L-4 |
| **AuthField input height** | implicit (9+9 padding-y + 14px font + 1+1 border) ~34px | NOT TOKENIZED | ⚠️ L-4 — `--auth-input-height` |
| **AuthMedal size** | A15 `.auth-medal` L207 | `48×48px` | on scale (32+16) | ✅ — flag `--auth-medal-size` for primitive intent |
| **AuthMedal inner icon** | A15 `.auth-medal .ic` L219 | `22×22px` | NOT on scale | ⚠️ L-4 — `--auth-medal-icon: 22px` |
| **AuthCta inner icon** | A15 `.auth-cta .ic` L149 | `14×14px` | on scale | ✅ |
| **AuthFoot inline icon (none in chrome)** | n/a | — | — | — |
| **wordmark.glyph size** | A15 L65 | `20×20px` | on scale (20) | ✅ — flag `--auth-wordmark-glyph-size: 20px` for primitive intent |
| **wordmark.glyph font** | A15 L68 | `11.5px` | NOT on scale | ⚠️ L-4 — `--auth-wordmark-glyph-font: 11.5px / 800 / -0.04em` |
| **OtpInput cell** | A15 `.auth-otp .cell` L226 | `44×52px` | NOT on scale | ⚠️ L-4 — `--auth-otp-cell-w: 44; --auth-otp-cell-h: 52` |
| **OtpInput cursor caret height** | A15 `.cell.cursor::after` L238 | `22px` (×1px wide) | NOT on scale | ⚠️ L-4 — `--auth-otp-cursor-h: 22px` |
| **MagicLinkSentBlock row icon** | A15 `.row .ic` L197 | `14×14px` | on scale | ✅ |
| **MagicLinkSentBlock timer icon** | A15 `.row.timer .ic` L203 | `13×13px` | NOT on scale | ⚠️ L-4 — `--auth-sent-timer-icon: 13px` |
| **PersistentSessionToggle icon** | A15 `.auth-route .ic` L260 | `14×14px` | on scale | ✅ |
| **Google button height** | KovaGoogleSignInButton — Google brand spec | `44px` (matches Material Design touch target) | NOT TOKENIZED | ⚠️ L-4 — `--google-btn-height: 44px` |
| **Google G logo size** | inline SVG viewBox 24×24, rendered ~20×20 inside button | per Google brand spec | TOKEN-EXEMPT (Google brand) | ✅ §0 |

---

## 5. Typography

| Surface element | Selector / line | font-size / line-height / weight / tracking | Maps to | Status |
|---|---|---|---|---|
| **AuthShell wordmark text** | A15 `.wordmark` L61 | 13 / — / 600 / -0.01em | NOT in scale | ⚠️ L-4 — `--auth-wordmark-font: 13/—/600/-0.01em` |
| **AuthShell wordmark glyph** | A15 L68-69 | 11.5 / — / 800 / -0.04em | NOT in scale | ⚠️ L-4 |
| **AuthShell top corner** | A15 `.corner` L73 | 12 / — / — / — | NOT in scale | ⚠️ L-4 — `--auth-corner-font: 12px` |
| **AuthShell bottom strip** | A15 `.auth-bottom` L178 | 11 / — / — / — | NOT in scale | ⚠️ L-4 — `--auth-bottom-font: 11px` |
| **AuthHeading eyebrow** | A15 `.eyebrow` L103 | 10 / — / — / — | NOT in scale | ⚠️ L-4 — `--auth-eyebrow-font: 10px` |
| **AuthHeading h1** | A15 `.auth-card h1` L105 | 22 / 1.22 / 600 / -0.018em | NOT in scale (largest scale entry is 15-16) | ⚠️ L-4 — `--auth-h1-font: 22/1.22/600/-0.018em` |
| **AuthLede** | A15 `.auth-lede` L110 | 13 / 1.55 / — / — | line-height 1.55 NOT in scale | ⚠️ L-4 — `--auth-lede-font: 13/1.55/400/0` |
| **AuthField label** | A15 `.lbl` L116-117 | 11.5 / — / 500 / -0.005em | NOT in scale | ⚠️ L-4 — `--auth-lbl-font: 11.5/—/500/-0.005em` |
| **AuthField help-link** | A15 `.help-link` L121 | 11.5 / — / 500 / — | NOT in scale | ⚠️ L-4 |
| **AuthField input** | A15 `.input` L131 | 14 / — / — / — (inherits `font: inherit` + override) | NOT in scale (canonical input is 13) | ⚠️ L-4 — `--auth-input-font: 14px` |
| **AuthField help (idle)** | A15 `.help` L140 | 11.5 / — / — / — | NOT in scale | ⚠️ L-4 — `--auth-help-font: 11.5px` |
| **AuthCta text** | A15 `.auth-cta` L148 | 13.5 / — / — / — (inherits .btn weight 500) | **13.5 NOT in scale** | ⚠️ L-4 — `--auth-cta-font: 13.5/—/500/-0.003em` |
| **AuthSecond text** | A15 `.auth-second` L163 | 13 / — / 500 / — | NOT in scale | ⚠️ L-4 — `--auth-second-font: 13/—/500` |
| **AuthOr text** | A15 `.auth-or` L154 | 10 / — / — / — | NOT in scale | ⚠️ L-4 — `--auth-or-font: 10px` |
| **AuthFoot text** | A15 `.auth-foot` L169 | 12 / — / — / — | NOT in scale | ⚠️ L-4 — `--auth-foot-font: 12px` |
| **AuthFoot link** | A15 L171 | 12 / — / 500 / — | NOT in scale | ⚠️ L-4 |
| **MagicLinkSentBlock row** | A15 `.row` L195 | 12.5 / — / — / — | matches `--t-body` (12.5/1.35/400/0) if scale ever wires | ⚠️ L-4 |
| **MagicLinkSentBlock row b** | A15 L198 | (inherit 12.5) / — / 500 / — | NOT in scale | ⚠️ L-4 |
| **MagicLinkSentBlock timer row** | A15 `.row.timer` L201 | 11.5 / — / — / — | NOT in scale | ⚠️ L-4 |
| **DELIVERED tag-mono** | canonical `.tag-mono` L246-247 | 11.5 / — / 500 / 0 | NOT in scale | ⚠️ L-4 |
| **OtpInput cell text** | A15 `.cell` L229 | 18 / — / 500 / — | NOT in scale | ⚠️ L-4 — `--auth-otp-font: 18/—/500` |
| **PersistentSessionToggle nm** | A15 `.l .nm` L255-257 | 12.5 / — / 500 / -0.005em | NOT in scale | ⚠️ L-4 |
| **PersistentSessionToggle sub** | A15 `.l .sub` L259 | 11.5 / — / — / — | NOT in scale | ⚠️ L-4 |
| **Google button label** | KovaGoogleSignInButton | 14 / — / 500 / — (Google brand recommends Roboto Medium 14; Kova uses Inter Medium 14 for system consistency) | NOT in scale | ⚠️ L-4 — `--google-btn-font: 14/—/500` |

**Summary:** Cluster 01 introduces ~18 font-size variants not covered by the canonical type scale (which Cluster 11 itself partially wired via R-8 but only for Cluster 11 primitives, not auth). Per Cluster 11 R-8 precedent, these collapse into per-primitive tokens under Resolution L-4 (not scale extensions — keeps the type scale clean and primitives expose intent).

---

## 6. Radii

| Surface element | Selector / line | Value | Maps to | Status |
|---|---|---|---|---|
| **AuthCard** | A15 L91 | `10px` | matches Cluster 11 `--r-2xl` (when shipped) | ⚠️ L-4 — `--auth-card-radius: 10px` |
| **AuthSent** | A15 L190 | `8px` | matches Cluster 11 `--r-overlay` (8) | ⚠️ L-4 — `--auth-sent-radius: 8px` |
| **AuthField input** | A15 L128 | `6px` | matches `--r-lg` (canonical .btn / .input) | ⚠️ L-4 (or use `--r-lg` if Cluster 11 ships into @theme) |
| **AuthRoute** | A15 L249 | `8px` | matches `--r-overlay` (8) | ⚠️ L-4 — `--auth-route-radius: 8px` |
| **AuthCta / AuthSecond / KovaButton** | canonical `.btn` L201 | `6px` | matches `--r-lg` | ✅ inherits .btn radius |
| **wordmark glyph** | A15 L65 | `5px` | matches `--r-md` | ⚠️ L-4 — `--auth-wordmark-glyph-radius: 5px` |
| **OtpInput cell** | A15 L227 | `6px` | matches `--r-lg` | ⚠️ L-4 — `--auth-otp-cell-radius: 6px` |
| **AuthMedal** | A15 L207 | `50%` (circle) | (intrinsic) | ✅ |
| **DELIVERED tag-mono** | canonical L248 | `3px` | matches `--r-xs` | ⚠️ L-4 |
| **Google sign-in button** | KovaGoogleSignInButton — match `.btn` 6px | `6px` | matches `--r-lg` | ✅ — but flag `--google-btn-radius: 6px` for intent (Google brand recommends 4px+; 6px chosen for Kova .btn consistency, founder approve) |

**Drift:** All radii are on the canonical Cluster 11 `--r-*` scale (3/4/5/6/7/10/pill). No new radii needed. Resolution: ride on Cluster 11 tokens once they wire (R-9 in Cluster 11 audit was approved 2026-05-20). For now Resolution L-4 names primitive-intent tokens that resolve to the Cluster 11 scale.

---

## 7. Shadows

| Surface element | Selector / line | Value | Maps to | Status |
|---|---|---|---|---|
| **AuthCard** | A15 L94 | `0 1px 0 rgba(0,0,0,0.02), 0 14px 40px -24px rgba(0,0,0,0.10)` | NOT in Cluster 11 `--shadow-elev-*` (toast, popover, modal, page) — distinct soft-card shadow | ⚠️ L-4 — `--auth-card-shadow: 0 1px 0 rgba(0,0,0,0.02), 0 14px 40px -24px rgba(0,0,0,0.10)` |
| **AuthCta / AuthSecond / KovaButton** | none — per Ban 7 (no shadows on inputs/cards/list rows) | — | per Ban 7 | ✅ |
| **AuthField input** | none | — | per Ban 7 | ✅ |
| **AuthField input:focus** | `box-shadow: 0 0 0 3px rgba(17,17,17,0.06)` | (focus ring, not elevation) | covered by L-3 | ⚠️ L-3 |
| **AuthMedal** | none | — | per Ban 7 | ✅ |
| **AuthSent rail block** | none | — | per Ban 7 (it's a rail block, not floating) | ✅ |
| **OtpInput cell** | none — except `.cell.cursor` focus ring | (focus ring per L-3) | — | ✅ / ⚠️ L-3 |
| **PersistentSessionToggle row** | none | — | per Ban 7 | ✅ |
| **Google sign-in button** | none | — | per Ban 7 + Google brand neutral | ✅ |

**Summary:** One new shadow stack — `--auth-card-shadow` — needed for the soft-elevation drop on the auth card. Distinct from Cluster 11's 4 elevations (`--shadow-elev-1/2/3/page`) because it's a soft form-card shadow, not a floating overlay. Resolution L-4.

---

## 8. Motion

| Surface element | Selector / line | Value | Maps to | Status |
|---|---|---|---|---|
| **AuthField input transition** | A15 L133 | `border-color .12s ease, box-shadow .12s ease` | NOT in design.md §1.7 (Cluster 11 R-12 named `--motion-fast: 100ms` — drift: 120ms here) | ⚠️ L-4 — `--auth-input-transition: 0.12s ease` (or reconcile to Cluster 11 `--motion-fast: 100ms`) |
| **OtpInput cursor blink** | A15 `@keyframes cursor-blink` L242 + `.cursor::after` L239 | `1.1s steps(2,end) infinite` | NOT in motion scale (Cluster 11 names `--motion-skeleton: 1400ms` for shimmer; this is a different rhythm) | ⚠️ L-4 — `--cursor-blink-duration: 1.1s steps(2,end) infinite` |
| **AuthCta / AuthSecond hover transition** | canonical `.btn` — not specified; inherits default browser snap or `border-color 0.1s ease, background 0.1s ease` from kova-hifi.css L340 (DARK only) | match Cluster 11 `--motion-fast: 100ms` | ⚠️ L-4 — apply same `--motion-fast` to light .btn |
| **prefers-reduced-motion** | not specified in A15/B4 | engineering responsibility — `useReducedMotion()` composable disables cursor blink | n/a | ⚠️ engineering — Plan 01 Task 15 OTP impl handles |
| **AuthShell entry / Google OAuth redirect transition** | not specified | n/a — full page nav | n/a | ✅ |

**Summary:** 2 motion tokens needed (`--auth-input-transition`, `--cursor-blink-duration`) under Resolution L-4. Cluster 11 R-12 `--motion-fast: 100ms` covers .btn hovers if the auth .btn light variant matches dark — flag for verification during Phase 5.

---

## 9. ⚠️ MISSING summary — 6 resolutions for founder

Every ⚠️ MISSING row above resolves to one of these 6 questions. The agent CANNOT proceed to Phase 2 until each is answered.

| # | Decision | Default recommendation | Affects |
|---|---|---|---|
| **L-1** | Wire LIGHT-theme short-name overrides into `src/app.css @theme` under `[data-theme="light"]` selector (or equivalent Tailwind 4 mechanism per audit Q-1). Source-of-truth = `design-system/canonical/kova-hifi-light.css :root` (already declared). Affects every short name that differs from dark: `--bg / --page / --rail / --fill / --fill-2 / --line / --line-2 / --ink / --ink-2 / --ink-3 / --accent-soft / --accent-2 / --accent-ink / --warn / --warn-soft / --warn-edge / --ok / --ok-soft / --review / --review-soft`. | YES — match dark precedent (Cluster 11 R-1 wired the dark aliases the same way). Required for EVERY auth surface to render correctly. | All auth surfaces. |
| **L-2** | `.btn.primary:hover` light-mode hover bg `#000` — name as token? Recommend: override `--btn-primary-hover-bg` inside `[data-theme="light"]` to `#000`. Existing dark token = `#fff`. | YES — single token, value swaps per theme. Matches L-1 (1A) pattern. | AuthCta primary hover in light. |
| **L-3** | Focus-ring rgba `rgba(17,17,17,0.06)` (light) — name as `--ring-focus-ink-light: 0 0 0 3px rgba(17,17,17,0.06)`. Pair with Cluster 11 catch-up `--ring-focus-ink: 0 0 0 3px rgba(235,235,238,0.05)` for dark (R-3 was deferred). | YES — name both. Closes Cluster 11 R-3 opportunistically. | AuthField input focus + OtpInput cursor cell. |
| **L-4** | Off-scale primitive-intent tokens for auth chrome. Add ~40 per-primitive tokens under `[data-theme="light"]` and global `@theme` per Cluster 11 R-5/R-6 precedent. Categories: card geometry (width/pad/gap/radius/shadow), CTA geometry (pad/font/height), input geometry (pad/font), OTP cell geometry (size/font/gap/cursor), medal (size/icon), sent/route rail blocks (pad/radius), top/bottom/stage (pad/font), font sizes for h1/lede/eyebrow/lbl/help/foot/corner/bottom/wordmark, motion (input transition, cursor blink), Google button (height/font/radius). Full list in §1.4 of cluster-01-KOVA_AUDIT.md. | YES — primitive-specific tokens. Spacing/type scales stay clean; primitives expose intent. | All auth primitives. |
| **L-5** | Raw `#fff` in A15 wordmark glyph fg (A15 L66) — B4 uses `var(--page)` instead (B4 L71). The B4 form is correct; A15 has a one-character drift between two byte-for-byte-lifted files. Founder picks: (a) hi-fi mockups stay byte-frozen (per hifi/README.md "Do NOT edit the HTML files"); Vue impl uses `var(--page)` per B4 form. (b) Edit A15 to match B4 (would violate byte-frozen rule). | (a) — Vue impl uses `var(--page)`. Hi-fi stays byte-frozen. Visual outcome identical (`#fff` == `--page` in light). | wordmark glyph fg color. |
| **L-6** | Raw hex green-soft + yellow-soft border on `.auth-medal.ok` (`#d6ecdb` — A15 L213) + `.auth-medal.pending` (`#f1dfba` — A15 L217). These are status-tint hairlines NOT degraded through `--ok` / `--review` aliases (which resolve to ink-2 in light per Ban 12). Founder picks: (a) name as exempt with `/* token-exempt: status palette deferred per Ban 12 — green-soft / yellow-soft hairline */`. (b) Strip the border (use the soft bg only) — visual loss. (c) Add to a future status palette ship. | (a) — token-exempt under existing Ban 12 deferral. Matches A15 hi-fi pixel-for-pixel. When status palette ships later, swap to canonical tokens. | AuthMedal.ok + AuthMedal.pending borders (used in A15.06 + B5.1 + B5.2). |

---

## 10. What lands where after founder approval

- **`src/app.css @theme`** — extend with L-1 (light-theme override block under `[data-theme="light"]`), L-2 (light primary-hover bg), L-3 (focus-ring rgba tokens for both themes), L-4 (40 primitive-specific tokens). One commit per resolution batch.
- **`design-system/canonical/kova-hifi-light.css :root`** — NO changes (canonical source-of-truth already declares the short names; app.css just mirrors).
- **`design-system/canonical/kova-hifi.css :root`** — NO changes for c01.
- **`design-system/canonical/design.md`** — note primitive-specific token additions in changelog (similar to Cluster 11 R-5/R-6 pattern).
- **`design-system/canonical/TOKEN_CANONICAL.md`** — add every new auth-* short-name to §2 reference tables.
- **`src/components/ui/KovaGoogleSignInButton.vue`** — annotate the 4 token-exempt rgba/hex literals inline with `/* token-exempt: Google brand requirement */`.
- **Hi-fi mockups** — NOT edited (per hifi/README.md "Do NOT edit the HTML files… preserve original markup"). L-5 + L-6 resolutions ride on the existing byte-frozen files.

**After founder approves L-1 through L-6 + the §0 Google-brand-exemption block, the agent will:**
1. Build `KovaGoogleSignInButton` primitive (Phase 2). Test + visual fixture + commit.
2. Build `useGoogleOAuth` composable (Phase 3). Test + commit.
3. Build `GoogleSignInButton` wrapper (Phase 4). Test + commit.
4. Apply L-1..L-4 token additions to `src/app.css @theme`. Build `/dev/tokens` light variant. Pause + screenshot for founder approval (Phase 5).
5. Build 10 auth-shell components (Phases 6 — Tasks 14 + 15). Per-primitive visual-diff ≤ 0.1%.
6. Rewrite SignupView + LoginView (Phases 7 + 8). Per-screen visual-diff ≤ 0.5%.
7. Phases 9-12 per Plan 01 Tasks 18-25.

---

## 11. Citation discipline

All ✅ rows above reference existing tokens. All ⚠️ rows have the source line in the hi-fi HTML. **No row is silent. No row is rounded.** Per IMPLEMENTATION_PROMPT.md §7 drift protocol.

**Google-brand exemption rows (§0):** all 7 token-exempt hex literals are explicitly listed + sourced to Google branding guidelines. Founder approval recorded in this doc at §0 + Phase 1 acceptance criteria in cluster-01-KOVA_AUDIT.md §1.7.

End of `cluster-01-tokens-used.md`.
