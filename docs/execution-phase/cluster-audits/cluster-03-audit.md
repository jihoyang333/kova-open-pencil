# Cluster 03 — KOVA_AUDIT (Phase 1)

Phase 1 audit per `claude-design-files/IMPLEMENTATION_PROMPT.md` §3. Pairs with `cluster-03-tokens-used.md`. No Vue until both green.

## §1.1 Token map (short-name flow)

All canonical short tokens already present in `kova-hifi.css :root` + Tailwind `@theme` translation block in `src/app.css`. Cluster 03 consumes:

`--page`, `--rail`, `--bg`, `--fill`, `--fill-2`, `--line`, `--line-2`, `--ink`, `--ink-2`, `--ink-3`, `--ink-4`, `--accent`, `--accent-soft`, `--accent-ink`, `--warn` (degraded), `--r-md`, `--r-lg`, `--r-2xl`, `--r-pill`, `--h-control`, `--h-control-sm`, `--h-icon-btn`, `--font-sans`.

**Net-new tokens proposed** (see cluster-03-tokens-used.md MISSING section): `--k-{coral|violet|sage|sand|graphite}`, `--dlg-{sm|md|lg}-w`, `--shadow-dialog`, `--modal-backdrop`, `--blur-backdrop`, `--motion-fast`, `--z-backdrop`, `--z-dialog`, `--t-section-head`, `--r-logo`, `--h-brand-top`.

## §1.2 Existing-component inventory (Cluster 11 primitives shipped)

Verified in `src/components/ui/`:

| Component | Path | Role |
|---|---|---|
| `<KovaModal>` | `src/components/ui/KovaModal.vue` | Reka Dialog wrapper; `.dlg` shell |
| `<KovaButton>` | `src/components/ui/KovaButton.vue` | `.btn` + variants |
| `<KovaInput>` | `src/components/ui/KovaInput.vue` | `.input` field |
| `<KovaField>` | `src/components/ui/KovaField.vue` | `.fld` form-field group |
| `<KovaSelect>` | `src/components/ui/KovaSelect.vue` | Reka Select wrapper |
| `<KovaMenu>` | `src/components/ui/KovaMenu.vue` | Reka DropdownMenu wrapper |
| `<KovaPopover>` | `src/components/ui/KovaPopover.vue` | Reka Popover wrapper |
| `<KovaTooltip>` | `src/components/ui/KovaTooltip.vue` | Reka Tooltip wrapper |
| `<KovaToast>` + `<ToastStack>` | `src/components/ui/KovaToast.vue` etc. | Toast + global stack |
| `<KovaIcon>` | `src/components/ui/KovaIcon.vue` | Lucide-bound icon component |
| `<KovaSkeleton>` | `src/components/ui/KovaSkeleton.vue` | Shimmer placeholder |
| `<KovaPill>` | `src/components/ui/KovaPill.vue` | `.pill` + variants |
| `<KovaSegmented>` | `src/components/ui/KovaSegmented.vue` | Segmented control |
| `<KovaCheckbox>` | `src/components/ui/KovaCheckbox.vue` | `.cbx` checkbox |
| `<KovaAvatar>` | `src/components/ui/KovaAvatar.vue` | 26×26 pill |
| `<ConfirmModal>` | `src/components/ui/ConfirmModal.vue` | Existing confirm pattern |

**Conclusion:** Cluster 03 needs ZERO Cluster 11 adapter shims (Plan 03 Task 21 is moot — Cluster 11 already shipped). Proceed direct.

**Missing primitive:** `<TypedConfirmField>` not present. Build inline as a sub-component of `<DeleteBrandModal>` (NOT promoted to Cluster 11 — single-use right now).

**Missing primitive:** `<NotShippedYet>` placeholder. Build minimal stub in Cluster 03 (Task 33.8 from Plan digest); Cluster 11 can promote later.

## §1.3 Reuse decisions per surface

| Surface | Strategy | Notes |
|---|---|---|
| A2.a Brand picker grid + A2.b empty | Build new `<BrandPickerView>` + `<BrandCard>` + `<NewBrandTile>` + `<BrandPickerEmpty>` | Reuse `<KovaIcon>`, `<KovaMenu>` (for kebab), `<KovaPill>` for status |
| A3.a-d New-brand wizard | Build new `<NewBrandWizardView>` + 4 step components | Reuse `<KovaInput>`, `<KovaButton>`. New: `<WizardShell>`, `<WizardProgress>` |
| A4.1 Rename modal | Build new `<RenameBrandModal>` | Wrap `<KovaModal>` size sm, `<KovaField>` + `<KovaInput>` |
| A4.2 Archive modal | Build new `<ArchiveBrandModal>` | Wrap `<KovaModal>` size md, new sub-components `<InfoCard>` + `<BrandSummaryRow>` |
| A4.3 Delete modal (typed-confirm) | Build new `<DeleteBrandModal>` | Wrap `<KovaModal>` size md. New `<TypedConfirmField>` + `<LossList>` |
| B12.1 Brands page | Build new `<BrandsAccountView>` | Mounted by C04 route; uses C04 `.acc-rail` chrome. New `<BrandsSegmentedControl>`. Hi-fi in-repo at `design-system/hifi/brand-mgmt/Kova Hi-Fi B12 Brands page - Dark.html` ✅ |
| B12.2 Archived empty | Inside `<BrandsAccountView>` | Reuse `<BrandPickerEmpty>` body slot |
| B12.3 Restore modal | Build new `<RestoreBrandModal>` | Wrap `<KovaModal>` size sm. No typed-confirm |
| B12.4 Delete-archived | Reuse `<DeleteBrandModal>` | Footer override → "This action is permanent." (PRD §12.8) |
| A2.a Archived filter dropdown | Build new `<BrandsArchivedFilter>` | Wrap `<KovaSelect>`. localStorage-persisted |

## §1.4 New tokens needed

See `cluster-03-tokens-used.md` MISSING summary. All 11 token extensions are non-controversial.

## §1.5 New components needed (Cluster 03 owned)

Components to ship (file paths):

```
src/components/brand/BrandCard.vue
src/components/brand/NewBrandTile.vue
src/components/brand/BrandPickerEmpty.vue
src/components/brand/BrandsArchivedFilter.vue
src/components/brand/BrandSummaryRow.vue
src/components/brand/InfoCard.vue
src/components/brand/LossList.vue
src/components/brand/TypedConfirmField.vue
src/components/brand/RenameBrandModal.vue
src/components/brand/ArchiveBrandModal.vue
src/components/brand/DeleteBrandModal.vue
src/components/brand/RestoreBrandModal.vue
src/components/brand/BrandsSegmentedControl.vue
src/components/brand/wizard/WizardShell.vue
src/components/brand/wizard/WizardProgress.vue
src/components/brand/wizard/WizardCard.vue
src/components/brand/wizard/StepNameUrl.vue
src/components/brand/wizard/StepShopify.vue
src/components/brand/wizard/StepBrandKit.vue
src/components/brand/wizard/StepDone.vue
src/components/ui/NotShippedYet.vue
src/views/brands/BrandPickerView.vue
src/views/brands/NewBrandWizardView.vue
src/views/account/BrandsAccountView.vue
src/views/_misc/ComingSoonView.vue (already exists from C02 — reuse)
src/composables/use-new-brand-flow.ts
src/composables/use-brand-color.ts
```

Backend:
```
supabase/migrations/20260601_03_brands_lifecycle.sql      # 7 RPCs + schema
api/brands/create.ts
api/brands/rename.ts
api/brands/archive.ts
api/brands/restore.ts
api/brands/delete.ts
api/_shared/storage-sweep.ts
api/_shared/brand-validation.ts
api/_shared/sanitize.ts                                    # DOMPurify wrapper (B-CRIT14)
```

## §1.6 Open questions for founder

**None blocking.** Every drift question resolved in cluster-03-tokens-used.md MISSING summary via baked-in PRD locks (5-color palette named per §4.1, modal widths locked per §3.3-3.4, motion deferral lifted per IMPLEMENTATION_PROMPT.md §1.7).

If a hi-fi surface during Phase 4 reveals a value not anticipated here, fire AskUserQuestion at that moment per drift protocol §7.

---

## Decision record

- **Phase 1 gate: GREEN.** Proceed to Phase 2 token setup + Phase 3 component build + Phase 4 per-screen translation.
- **Cluster 11 adapter shims (Plan 03 Task 21): SKIPPED.** Primitives shipped; consume direct.
- **Audit_log table: PRESENT.** Migration `20260519_w1_audit_log.sql` shipped (Cluster 11). `writeAudit` helper writes real rows now, not breadcrumb stopgap.
- **idempotency_keys table: PRESENT.** Migration `20260521_11_idempotency_keys.sql` shipped. Edge Functions wire `verifyIdempotency` helper.
- **`<BrandColorPicker>` already shipped** (C05 Phase 2 work pre-staged at `src/components/brand/BrandColorPicker.vue`) — left intact; Cluster 03 work additive.
- **`brands.ts` store: extend in place** — keep existing actions (`createBrand`, `deleteBrand`, `createBrandFull`, `applyKitSelection`, `proposeFromShopify`); ADD `renameBrand`, `archiveBrand`, `restoreBrand`, `fetchArchivedBrands`, `archivedBrands` getter, `isMutating` flag. Refactor `deleteBrand` to call Edge Function (cascade + sweep server-side) instead of client manual sweep.

Phase 1 gate green. Begin Phase 2 (migration + tokens).
