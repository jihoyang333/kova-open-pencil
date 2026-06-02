# Cluster 10 — KOVA_AUDIT.md (Design Phase 1 gate)

> Per `docs/execution-phase/claude-design-files/IMPLEMENTATION_PROMPT.md`.
> Companion: `tokens-used.md` (this directory).
> **Theme: dark.**

## 1. Fidelity contract recap (§0)

1. Visual values are copied. 2. DOM structure is translated to Vue 3 SFC +
KovaIcon + Reka primitives. 3. Behaviour is engineered (Pinia / refs).
"Copy DOM verbatim" is forbidden.

## 2. Hi-fi sources

Cluster 10 has **no dedicated hi-fi scene** (PRD 10 §3.4). Surfaces compose from:

- `ChatInput.vue` (existing M5 composer chrome) — **authoritative** dark-theme
  vocabulary for the composer + chip row.
- `ChatPanel.vue` (existing 223-line M5 chat surface — NOT a stub; the plan's
  "refactor from stub" premise is stale, see §5).
- Chip pattern: `docs/superpowers/specs/2026-05-14-shopify-product-reference-design.md §4.2`
  ("thumbnail + name + ×", removable, persists per D3/D8).

## 3. Per-surface audit

### 3.1 ProductReferenceChip
- Structure: `div[chip] > (img | div[monogram]) + span[title] + button[×]`.
- States engineered: idle / hover / focus-visible / × at opacity-60 vs full.
- Founder locks honoured: item 4 (body click = no-op), item 6 (× always visible
  opacity-60).
- All tokens existing — see `tokens-used.md`.

### 3.2 ProductReferenceChipRow
- One chip per active reference; `flex flex-wrap`; collapses to height 0 when empty.
- Forwards `remove({productId})`.

### 3.3 ChatInput chip-row insertion
- Footer order (item 7): image attachments → product chips → textarea → send.

### 3.4 ChatPanel tab strip
- Per-canvas conversation tabs, cap 20 (item 3), horizontal scroll w/ edge arrows
  (item 10), new-chat empty chips (item 9). AI accent = `--color-accent-ai`.

## 4. Token decision

**Zero new tokens.** One documented deviation from the plan's literal Tailwind
classes (`bg-surface` → `bg-input`, `bg-muted/20` → `bg-fill-2`) because the
plan's light tokens are illegible on the dark panel. Rationale recorded in
`tokens-used.md` and consistent with `feedback_app_dark_website_light`.

No `⚠️ MISSING` tokens → **no AskUserQuestion founder-decision required for token
additions.** The deviation is a token *selection* correction within the existing
palette, not a new token.

## 5. Scope reality (discovered during audit)

| Plan assumption | Reality in `feat/m9-shopify` base | Consequence |
|---|---|---|
| `ChatPanel.vue` is a stub to be built up | It is a working 223-line M5 chat surface | Task 15 = *additive* (tab strip + chip wiring), not a rebuild. |
| Cluster 06 right-panel host exists (`RightPanelTabs`, `useRightPanelStore`, `activeTab==='ai'`) | **Absent** from base (Cluster 06 not merged) | Task 16 (mount) + Task 17 (Shop "Import to chat" + tab switch) are **cross-cluster-blocked** → defer to handoff (same as c09's deferred cross-cluster task). |
| Per-screen visual-diff @ 1440px | Requires a running dev server + browser | Browser visual-diff + Task 21 manual smoke **deferred to a browser-equipped session** (c09 cadence). |

## 6. Gate status

✅ Audit + `tokens-used.md` produced before any Vue. Zero new tokens, zero hex,
zero `<style>`. Chip/ChatInput Vue (Tasks 12–15 headless portions) cleared to
build against the corrected dark-theme tokens. Browser visual-diff and the
Cluster-06-dependent mount are explicitly carried to the handoff doc.
