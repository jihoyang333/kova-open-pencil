# Cluster 05 — tokens-used.md (Phase-1 audit gate)

> Per `docs/execution-phase/claude-design-files/IMPLEMENTATION_PROMPT.md` §3.
> Enumerates every visual value across the Cluster 05 surfaces and maps each to
> an existing canonical token, an existing lifted primitive class, or a
> ⚠️ class-to-lift. **Zero new `:root` design tokens** (execution-prompt §
> "Design-system compliance: Zero new tokens").

## Source surfaces

| Surface | In-repo hi-fi mockup | Scene IDs |
|---|---|---|
| Brand Kit shell + 7-tab sub-nav + brand-picker | `design-system/hifi/account-stripe/Kova Hi-Fi A7 Account Page - Dark.html` | A7.3, A7.3.1 |
| Visuals (colors/fonts/logo) | A7 | A7.3.1 |
| Identity (3 narrative cards) | A7 | A7.3.2 |
| Tone snippets / Saved blocks lists | A7 + `design-system/hifi/brand-kit/Kova Hi-Fi B3 Brand Kit CRUD Modals - Dark.html` | A7.3.3/4, B3.1–B3.5 |
| Writing rules toggles | A7 | A7.3.5 |
| Memories (cross-cut Cluster 10) | A7 | A7.3.6 |
| Knowledge base + upload states | A7 + `design-system/hifi/states/Kova Hi-Fi B8 Upload States - Dark.html` | A7.3.7, B8.2/4/5/6/7/8 |
| Voice-draft confirm modal | composes B3 shell (net-new form) | n/a |

## `:root` tokens — REUSE (zero new)

All color/spacing/type/radius/elevation values resolve to existing canonical
tokens already loaded globally via `src/app.css → design-system/canonical/kova-hifi.css`:

| Need | Canonical token |
|---|---|
| Surface / panel bg | `--bg`, `--fill`, `--fill-2` |
| Text primary / secondary | `--ink`, `--ink-2` |
| Accent (active tab, focus ring, CTA) | `--accent`, `--accent-hover`, `--accent-soft`, `--accent-ink` |
| Control heights | `--h-control`, `--h-control-sm`, `--h-control-xs`, `--h-tabs`, `--h-icon-btn` |
| Hairline / border | `--frame-outline` + existing border tokens |
| Modal shell | `.dlg` / `.dlg.sm` / `.dlg.md` (lifted; 14 rules present) |
| Segmented (saved-block type) | `.seg` (lifted; 10 rules present) |
| Empty states | `.empty-*` token family |
| Error states | `.err-*` token family |

No value in any Cluster 05 surface required a new `:root` token. Any literal in
the mockup that lacked a token (none found at the `:root` level) would be raised
to the founder via AskUserQuestion per RIDER §2.1 — not silently rounded.

## Component classes to LIFT from mockup → canonical

These semantic classes are used by the A7/B3/B8 mockups (and by the already-shipped
Cluster-04 `BrandKitSection.vue` shell) but are **not yet present** in
`design-system/canonical/kova-hifi.css`. They are composed entirely from the
existing `:root` tokens above — lifting copies the rule blocks verbatim from the
mockup `<style>` into canonical (append-only), adding no new tokens:

| Class | Surface | Status |
|---|---|---|
| `.bk-wrap`, `.bk-subnav`, `.bk-subnav-item`, `.bk-pane` | shell (A7.3) | ⚠️ lift |
| `.sw-list`, `.sw-item`, `.sw-add` | Visuals colors (A7.3.1) | ⚠️ lift |
| `.font-row`, `.row-stack` | Visuals fonts/logo (A7.3.1) | ⚠️ lift |
| `.nar-card` | Identity (A7.3.2) | ⚠️ lift |
| `.list-row` (grip + label + category + content) | Tone/Saved (A7.3.3/4) | ⚠️ lift |
| `.wr-stack`, `.wr-row` | Writing rules (A7.3.5) | ⚠️ lift |
| `.dropzone` (+ idle/hover/in-progress/success/error states) | KB + fonts (B8) | ⚠️ lift |
| `.drag-handle` | grips on draggable rows | ⚠️ lift |

`.dlg` / `.seg` / `.empty-*` / `.err-*` are already lifted — reuse directly.

## Visual-diff plan (per IMPLEMENTATION_PROMPT §6 / §10)

- Render `/dev/cluster-05` showcase + each mockup at 1440px.
- Thresholds: ≤ 0.1% component / ≤ 0.5% screen (`maxDiffPixelRatio: 0.005, threshold: 0.2`).
- Per-surface diff logs under `tests/snapshots/cluster-05/<surface>-diff.md`.
- **Requires a running dev server + Playwright** → founder browser smoke + visual
  diff is the final gate before SHIPPED (per `feedback_browser_smoke_test_before_done`).
