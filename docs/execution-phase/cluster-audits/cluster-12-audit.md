# Cluster 12 — KOVA_AUDIT (Phase 1)

Generated 2026-05-23 per IMPLEMENTATION_PROMPT.md §3 (audit gate). Cluster 12 = Settings + User Preferences (3 hi-fi surfaces, 3 small Vue components, store + composable layer).

---

## 1.1 Token map (kova-hifi.css → @theme short-name)

Cluster 12 consumes existing tokens only (per design-system rider §2.1). No new token roles introduced.

| Short-name | Hex | Used by |
|---|---|---|
| `--bg` | #242428 | row/page background |
| `--page` | #1a1a1d | section panel background, `.seg` background |
| `--fill` | #26262b | input idle, `.seg .o.on` background |
| `--line` | #2c2c30 | `.toggle` idle background, hairlines |
| `--line-2` | #232327 | `.seg` cell divider |
| `--ink` | #ebebee | primary text |
| `--ink-2` | #a8a8ad | secondary text (meta "Email · monthly") |
| `--ink-3` | #6e6e73 | `.sub` copy, "Off · default" meta |
| `--accent` | #3b82f6 | (none consumed in this cluster — no selection state on rows) |

## 1.2 Existing-component inventory (Cluster 11 primitives consumed)

| Component | Status | Notes |
|---|---|---|
| `KovaModal` | ✅ exists | Used for A8.3 modal shell |
| `KovaSegmented` | ✅ exists | Text-size 3-segment (Small/Medium/Large) |
| `KovaToggle` | ❌ **MISSING from Cluster 11** | Required by Reduce motion + High contrast + Product updates + Sync alerts |
| `KovaIcon` | ✅ exists | `info` glyph in modal foot |
| `KovaButton` | ✅ exists | Cancel + Save in modal foot |
| `useToast` | ✅ exists | Save-confirm toast |

**Action:** ship `KovaToggle.vue` as part of this cluster (drift from Cluster 11 — primitive expected but not shipped). Spec lifted from A7.1 inline `.toggle` styles (lines 133–145 of `design-system/hifi/account-stripe/Kova Hi-Fi A7 Account Page - Dark.html`).

## 1.3 Reuse decisions

| Need | Decision | Reason |
|---|---|---|
| Text-size segmented | Reuse `KovaSegmented` | Existing component matches hi-fi `.seg` markup contract 1:1 |
| Binary toggle | **Build new** `KovaToggle.vue` | Cluster 11 ships Checkbox not Toggle; PRD 12 specifies KovaToggle |
| Modal shell | Reuse `KovaModal` size="md" | A8.3 = 540px (`.dlg.md`) |
| Icon glyphs | Reuse `KovaIcon` | `info` |

## 1.4 New tokens needed

None for the documented design system. **Three drift values present in A7.1 inline `.toggle` styles:**

- `#ededea` — toggle thumb idle + toggle on-state background
- `#0d0d0c` — toggle thumb on-state background
- `rgba(0,0,0,0.4)` — toggle thumb drop shadow

**Drift protocol resolution (§7c — keep literal with token-exempt):** these are one-off toggle artifact values from the A7.1 inline `<style>` block. They are not part of the canonical `kova-hifi.css :root` token set. Per IMPLEMENTATION_PROMPT.md §4.5 (inline-style protocol), lift into `src/styles/accessibility.css` with `/* token-exempt: toggle artifact, hi-fi inline source */` comment. Document in `cluster-12-tokens-used.md`.

## 1.5 New components needed

| Component | Path | Source |
|---|---|---|
| `KovaToggle.vue` | `src/components/ui/` | A7.1 inline `.toggle` + `.toggle::after` + `.toggle.on` rules |
| `AccessibilityPanel.vue` | `src/components/settings/` | A7.1 §3 + A8.3 body (single shell, two surfaces) |
| `NotificationsPanel.vue` | `src/components/settings/` | A7.1 §4 |
| `PreferencesModal.vue` | `src/components/settings/` | A8.3 modal host |

## 1.6 Open questions

- **Cluster 01 sibling dep:** `users.preferences` JSONB column ships in Cluster 01 (W8a parallel sibling). Our RPC migration (Task 1) references the column but `LANGUAGE sql` validates lazily; the migration applies cleanly. Task 6 integration test execution deferred until both clusters merge into integration branch.
- **`_shared/resend-client.ts`:** Cluster 01 ships this helper. Until that lands, Task 16.0 ships a temporary stub that throws if `RESEND_API_KEY` is set (env-guard returns `skipped:no_api_key` otherwise, so dev runs without Resend).
- **`KovaToggle` Cluster 11 gap:** primitive was expected per PRD 12 dependency but Cluster 11 shipped only `KovaCheckbox` + `KovaSegmented`. Ship `KovaToggle.vue` in this cluster — to be moved into Cluster 11's primitive set or kept here per Cluster 11 owner's call post-merge.

---

## Definition-of-Done coverage

- [x] §1.1 token map populated
- [x] §1.2 component inventory populated
- [x] §1.3 reuse decisions made
- [x] §1.4 new tokens — drift documented (none needed beyond existing tokens; toggle literals lifted with `/* token-exempt */`)
- [x] §1.5 new components listed
- [x] §1.6 open questions logged
