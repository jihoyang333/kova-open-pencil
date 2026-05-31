# Cluster 05 — KOVA_AUDIT.md (Phase-1 gate)

> Per `IMPLEMENTATION_PROMPT.md` §0/§3. 3-rule fidelity contract:
> (1) visual values copied, (2) DOM structure translated to Vue 3 SFC + Kova\*
> primitives, (3) behavior engineered (Pinia/refs/composables). "Copy DOM
> verbatim" is FORBIDDEN. Theme: dark throughout.

## Architecture finding (supersedes PRD §6.1 nested routes)

Cluster 04 already shipped `src/views/account/sections/BrandKitSection.vue` — the
section **shell** (BrandPicker + 7-tab sub-nav + `activeTab` state) — routed via
the account `SectionResolver` over `/account/:section(...|brand-kit|...)`.

→ Cluster 05 **fills the tab panes** inside that shell. It does **not** add the
PRD §6.1 nested `/account/brand-kit/:tab` child routes (that plan predates the
shipped SectionResolver). No router changes. This matches the surrounding code.

## Build inventory (Vue layer)

**Wire point:** replace the `.bk-pane` stub in `BrandKitSection.vue` with a
`<component :is>` switch over the existing `activeTab`.

7 tab components (`src/components/brand-kit/`):
`VisualsTab`, `IdentityTab`, `ToneSnippetsTab`, `SavedBlocksTab`,
`WritingRulesTab`, `MemoriesTab`, `KbSourcesTab`.

Primitives (`src/components/brand-kit/{visuals,identity,writing-rules,kb-sources,shared}/`):
`BrandColorSwatch`, `BrandColorAddTile`, `BrandFontRow`, `FontUploadDropzone`,
`BrandLogoRow`, `IdentityCard`, `BrandKitListRow`, `WritingRuleToggle`,
`MemoryRow`, `KbSourceRow`, `KbSourceDropzone`.

Modals (`src/components/brand-kit/modals/`): `ToneSnippetAddModal`,
`ToneSnippetEditModal`, `SavedBlockAddModal`, `SavedBlockEditModal`,
`VoiceDraftConfirmModal` (guardrail). Delete = Cluster 11 `useConfirm()`.

## Data + behavior layer (SHIPPED — this audit's prerequisite, already merged on branch)

- `useBrandKitStore` (getters + optimistic RPC actions), `useBrandFontsStore`,
  `useBrandKbSourcesStore`, `useVoiceDraft`, `useFontUpload`, `useKbSourceUpload`,
  `useBrandKitDrag`, `resolveBrandKitDrop` + MIME contract.
- All wired to the 12 RPCs / 7 edge functions. 114 unit tests green.

## Icon convention (W0-4)

Every icon = `<KovaIcon name="..." />` (Cluster 11). The 4 retired alternates
(raw `<icon-lucide-*>` dynamic, template-literal resolution, `i-lucide-*` class,
`<Icon name="lucide:...">`) are FORBIDDEN.

## Token compliance

Zero new `:root` tokens. Component classes lifted append-only from A7/B3/B8
mockups into `design-system/canonical/kova-hifi.css` (see
`cluster-05-tokens-used.md`). `.dlg`/`.seg`/`.empty-*`/`.err-*` reused as-is.

## Gate status

- ✅ Phase-1 audit produced (this doc + tokens-used.md).
- ⏳ Founder approval of token plan + browser visual-diff (≤0.5% screen) = the
  final pre-SHIPPED gate; requires a running dev server (cannot be closed headless).
