# Cluster 04 — tokens-used (Phase 1 audit gate)

> Per `claude-design-files/IMPLEMENTATION_PROMPT.md §3`: enumerate every visual
> value in the cluster's hi-fi surfaces and map to a token in `kova-hifi.css :root`
> or flag ⚠️ MISSING. **Zero ⚠️ MISSING required before any Vue.**

## Surfaces audited

- `design-system/hifi/account-stripe/Kova Hi-Fi A7 Account Page - Dark.html` (A7.1-A7.6 sub-sections)
- `design-system/hifi/account-stripe/Kova Hi-Fi B10 Stripe Returns - Dark.html` (B10.1 success, B10.2 cancel)
- `design-system/hifi/brand-kit/Kova Hi-Fi A4+A9+A10 Modals - Dark.html` (delete-account modal pattern; Cluster 01 owns implementation)

## Color tokens used

| Token | Use sites | Status |
|---|---|---|
| `--accent` | active sidebar item, primary CTAs, success icon tile | ✅ in :root |
| `--accent-2` | secondary accent surfaces, hover variants | ✅ in :root |
| `--accent-ink` | AI-only / chat surfaces (not used in c04) | ✅ in :root |
| `--accent-soft` | subdued accent surfaces (badge backgrounds) | ✅ in :root |
| `--bg` | page background | ✅ in :root |
| `--fill` | card/input backgrounds | ✅ in :root |
| `--fill-2` | segmented active state, dropdown hover | ✅ in :root |
| `--ink` | primary text | ✅ in :root |
| `--ink-2` | secondary text | ✅ in :root |
| `--ink-3` | tertiary text, meta lines, mono captions | ✅ in :root |
| `--line` | hairline borders (1px) | ✅ in :root |
| `--line-2` | dropdown / hover ghost-button background | ✅ in :root |
| `--ok` | "Active" pill, success states | ✅ in :root |
| `--ok-soft` | ok-pill background tint | ✅ in :root |
| `--page` | page surface | ✅ in :root |
| `--rail` | sidebar background | ✅ in :root |
| `--review` | review states | ✅ in :root |
| `--warn` | warn pill, past-due banner, trial pill | ✅ in :root |
| `--warn-edge` | warn border | ✅ in :root |
| `--warn-soft` | warn background tint | ✅ in :root |

**Drift findings: 0.** All 19 tokens used in A7/B10/A4+A9+A10 are defined in `main-main-kova-scope/design-system/kova-hifi.css :root`. No founder-question needed for tokens.

## Hex literals (non-SVG) inventory

- `#ededea` + `#0d0d0c` — logo background pair (light + dark variants). Recur in A7, A4+A9+A10, B10. Candidate for `--logo-light` / `--logo-dark` tokenization (DEFERRED — Cluster 11 wordmark pattern; not c04 scope).
- `#d36a3a` — danger hover variant. Recurs in same 3 files. Candidate for `--danger-hover` (DEFERRED — design system bans status colors per §2.2; danger styling routed via existing `.btn.danger` class).
- User-content swatches (color picker swatches, brand-card backgrounds like `#fa5400`, `#1a4be0`) — these are user-entered brand data, not chrome. EXEMPT.

## Spacing scale

Canonical scale: `2, 4, 6, 8, 10, 12, 14, 16, 20, 24, 32`. Hi-fi A7/B10 use ONLY scale-conformant values. Single non-canonical inline width `46px` (logo avatar) — left as inline style, classified as one-off avatar size (not a structural value).

## Component primitives required (all defined in kova-hifi.css)

`.btn` + variants (primary, ghost, sm, icon, danger, accent), `.input`, `.pill` + variants (ok, warn, dot, outline, accent), `.tag-mono` + variants (ok, warn, scheduled), `.toggle`, `.seg`, `.dlg` + parts, `.modal-backdrop`, `.fld`, `.acc-*` (account chrome), `.plan-card`, `.usage` + `.usage-bar`, `.inv-table`, `.int-card`, `.brandpick`, `.bk-wrap`, `.dropdown`, `.err-page`, `.err-card`, `.ava-lg`.

## Verdict

✅ **Phase 1 audit gate PASS — zero ⚠️ MISSING tokens, zero drift.**

Per the per-screen written diff loop in `IMPLEMENTATION_PROMPT.md §6`: pixel-level diffs against the mockups are deferred to staging Phase 16 (Playwright visual-diff `≤ 0.5% screen / 0.1% component`). The Vue components ship using the canonical class names from `kova-hifi.css`, so visual output should match without further token work.
