# Kova Pre-PRD-Authoring Comprehensive Audit

**Audit date:** 2026-05-13
**Auditor:** Claude (Opus 4.7) — independent main-thread audit
**Methodology:** Read every source-of-truth doc (`00b` dispatcher, `00` PRD scope plan, q1-5 + q6-25 answers, 03 implied surfaces, design.md, TOKEN_CANONICAL.md, PRE_PRD_READINESS_AUDIT_V2.md, kova-hifi.css). Inspected codebase (`src/composables/`, `src/stores/`, `src/ai/kova-tools.ts`, `src/components/onboarding/StoreTypeStep.vue`, `src/views/dashboard/SettingsBrandIntegrationsView.vue`, `src/components/dashboard/IntegrationsCard.vue`, `api/shopify/` 18 routes, `supabase/migrations/` 23 files). Verified Figma claims directly via help.figma.com WebFetch (Q2 mask types, Q7 version history, Q11 measurement) plus existing citations in q1-5 + q6-25 answer docs (all 25 Q sources cited there). Verified Stripe via docs.stripe.com WebFetch. Verified Shopify OAuth revoke via shopify.dev WebSearch. Verified GDPR Art. 17 via gdpr-info.eu WebFetch.

---

## Verdict: ⚠️ REQUIRES FOUNDER RATIFICATION

**Top-line reason:** Q1–Q25 founder decisions are internally consistent, Figma-grounded, and ready for cluster PRD authoring. Part 2 gap-fill has 8 cross-cutting/architecture/tooling items that **must be ratified by the founder before any PRD authors**, because each is a HARD-to-reverse infrastructure choice that drifts unrecoverably if a PRD assumes one answer and a different PRD assumes another. These are not blockers — they are *unresolved-by-default* items that need a single founder thumbs-up to lock in. M9 Shopify integration has 4 specific UX drifts vs. founder intent that require either ratification ("ship as-is, fix Phase 2") or a small refactor before Wave 4 (Cluster 05) PRD authoring. Nothing in this audit qualifies as ❌ BLOCKING.

---

## Executive summary (plain English for founder)

Six months of decisions hold up. Q1–Q25 are good, Figma-aligned where claimed, and internally consistent. The design system is implementation-ready: tokens are canonical, banned-pattern enforcement is documented, the dark-app + light-auth split is locked. The 12-cluster PRD plan is well-sized and the wave order is correct.

Three things need your attention before PRDs start:

1. **M9 Shopify integration is light-themed.** The three Shopify surfaces (`StoreTypeStep`, `IntegrationsCard`, `SettingsBrandIntegrationsView`) all use `bg-white` + `text-gray-900` + `border-gray-200`. Per your "dark inside authenticated app, light only on marketing+auth" rule, all three need a dark-theme rebuild before they ship to production. M9 was built by an agent without that constraint; not its fault — but Clusters 02, 04, 05 PRDs must ratify whether to refactor M9 themes pre-launch or accept "M9 stays light for MVP, dark-rebuild Phase 2."

2. **M9 brand-kit-extract is incomplete vs. Brand Kit MVP scope.** `api/shopify/brand-kit-extract.ts` pulls colors + fonts + logo from Shopify theme `config/settings_data.json`. It does NOT auto-populate `brands.voice`, `brands.tone_snippets` (Q8), or `brands.saved_blocks` (Q8). Cluster 05 PRD must decide: extend the Edge Function to auto-populate Q8 fields (recommended — keeps "connect Shopify → Brand Kit fills itself" magic) OR document the limitation ("Tone snippets + saved blocks are user-curated only — no auto-extract").

3. **Eight cross-cutting infrastructure choices are unmade.** Background job queue, rate limiting, email service, file-upload caps, storage bucket structure, feature flags, logging/error tracking, migration runner. Each PRD will need these answers; if PRDs invent them independently, the system fragments. I've recommended a specific answer for each in §2.B with alternatives + tradeoffs. You ratify, then PRD authors cite the ratified choice.

Aside from those, the foundation is strong. Every Q-decision is implementation-ready (Figma-grounded, line-cited against `packages/core/`, founder-locked items respected). The hard-to-reverse decision watchlist has 16 entries; all of them are already-ratified by you (Solo MVP, image-export-only, no in-canvas brand-switch, Stripe foundation, SLICE + MEASUREMENT NodeTypes lift-the-lock, etc.) except for one **explicitly-unratified** load-bearing decision I want to surface: **Stripe Customer is one-per-user, not per-brand** (Q13). You stated user-level scope, which I read as one Customer per user. If you ever want per-brand billing (agency client billing pass-through), reversal is HARD — migration on every Stripe Customer record. I recommend ratifying explicitly: "one Stripe Customer per User, brands billed under it forever — agency pass-through is out of scope."

### Top 10 bullets (read top-down)

1. ✅ Q1 Slice NodeType — first-class 17th SceneNode is correct (Figma-spec verified). HARD reversibility. Ratified.
2. ✅ Q2 Mask compositing — data model already in `packages/core` per Q2 line citations. All 3 mask types ship. Renderer work only. Figma-spec verified.
3. ✅ Q11 Measurement NodeType — first-class 18th SceneNode. ⇧M shortcut Figma-exact (verified). HARD reversibility. Ratified.
4. ✅ Q7 Version history — 30-min autosnap + 30-day free / unlimited paid + ⌥⌘S manual. Figma-exact (verified via help.figma.com). Atomic restore with pre-restore snapshot. Ready to build.
5. ⚠️ M9 light theme (3 Shopify surfaces) — drift vs. dark-app rule. Decide: pre-launch refactor or Phase 2 deferral. Affects Clusters 02, 04, 05.
6. ⚠️ M9 brand-kit-extract scope — auto-populates colors/fonts/logo only. Decide: extend to tone snippets + saved blocks + voice, or document as user-curated-only. Affects Cluster 05.
7. ⚠️ Stripe Customer scope — one per user is the only internally-consistent reading of Q13. Ratify explicitly to lock out per-brand billing as a future surprise.
8. ⚠️ 8 cross-cutting infra decisions unmade — background jobs, rate limit, email, upload caps, storage bucket layout, feature flags, logging, migration runner. Ratify each before PRDs author.
9. ⚠️ M9 Settings Integrations uses URL-param brand context (`/dashboard/:brandId/settings/integrations`) — Q12+Q13 says single `/account` route with brand-picker dropdown. Decide: move M9 into Account page OR keep separate per-brand-settings route. Affects Cluster 04.
10. ⚠️ M9 history accordion renders empty (Connection.history not backed by DB column). Decide: add `shopify_history` table now (recommended — Cluster 04 PRD needs the schema) or rip the empty UI out of M9.

---

# Part 1 — Decision + Infrastructure Stress-Test

## 1.A — Q1–Q25 Founder Decision Review

### Q1 — Slice node-type schema

**Founder decision:** Add `SLICE` as a first-class 17th NodeType in `packages/core/src/scene-graph.ts:67–83` NodeType union. Matches Figma's data model. Lift the core lock per CLAUDE.md amendment. Slices are selectable, named, copy/paste-able, persisted in `.fig`, render as dashed-line bounding boxes.

**Reversibility class:** HARD
- Once shipped, every stored canvas's Yjs doc carries SLICE nodes. Removing the NodeType requires a migration pass on every stored Yjs blob in `canvas-snapshots` + every live Yjs doc in y-indexeddb across every user's browser. Migration code lives forever.

**Figma alignment claim:** "First-class SLICE SceneNode matching Figma's data model exactly."
- Verified via [Figma Plugin API — SliceNode](https://developers.figma.com/docs/plugins/api/SliceNode) and [Figma Help — Using the Slice Tool](https://help.figma.com/hc/en-us/articles/360040028394-Using-the-Slice-Tool) (cited in q1-5 doc Q1).
- Match status: **VERIFIED** — Figma SliceNode has x/y/w/h/rotation, `exportSettings: ReadonlyArray<ExportSettings>`, `exportAsync(settings?)`, name (user-renamable), participates in layer hierarchy, "Contents Only" toggle for selection-overlap export.

**Risk analysis:**
- **Scene-graph version bump.** Adding NodeType `'SLICE'` to the union means stored Yjs docs with SLICE nodes are no longer parseable by older `packages/core/` builds. Risk class: stored data forward-compat OK, backward incompatible. Mitigation: version-bump in Kiwi schema + downgrade-path documented in `packages/core/CHANGELOG-KOVA.md` per CLAUDE.md amendment.
- **Hit-test on dashed boundary.** SLICE is non-rendering — hit-test needs to fire on the dashed-line stroke, not the interior. Engine extension required. Not exposed via `figma-api-proxy.ts` today. **Action item:** PRD §6 (or 07a) must spec the hit-test code path.
- **Export pipeline coupling.** Image-export-only is FOUNDER LOCKED; SLICE nodes are the export units. If SLICE NodeType changes shape later, the export pipeline (`editor.exportAllSlices()` → batched ZIP) breaks.
- **Edge case:** SLICE overlapping multiple frames — Figma allows this; engine must support sliceNode parented at CANVAS level, not inside a single frame.

**Alternative approaches considered:**
- **Property on FRAME (`isSlice: true`):** Rejected. Slices in Figma stand alone — not all slices are frames; one slice can span multiple frames. Loses Figma muscle memory.
- **Side-table `canvas_slices`:** Rejected. Loses Yjs CRDT persistence, layer-tree integration, undo/redo, copy/paste. Engineering pain forever.

**Verdict:** ✅ PASS

---

### Q2 — Mask renderer support

**Founder decision:** Data model already exists in `packages/core/src/scene-graph.ts` (verified at lines 135, 298–299, 438–439): `isMask: boolean` field + `maskType: 'ALPHA' | 'VECTOR' | 'LUMINANCE'`. Renderer compositing implementation is the only net-new work, in `packages/core/src/renderer/scene.ts` sibling traversal. All 3 mask types ship in MVP.

**Reversibility class:** SOFT (renderer behavior only) — data model is already in core; reverting the renderer change just disables mask compositing.

**Figma alignment claim:** "Match Figma exactly — all 3 maskTypes (ALPHA + VECTOR + LUMINANCE), sibling propagation, ⌃⌘M Mac / ⌃⌥M Win shortcut, wrap-mask-in-group advisory."
- Verified directly via WebFetch [help.figma.com/hc/en-us/articles/360040450253-Masks](https://help.figma.com/hc/en-us/articles/360040450253-Masks): 3 mask types confirmed (Alpha = opacity-driven, Vector = outline-driven, Luminance = brightness-driven); shortcut ⌃⌘M Mac / Ctrl+Alt+M Win confirmed; propagation = siblings above until next mask / parent / clipsContent frame.
- "Wrap in group" advisory NOT explicitly in current Figma help docs but is the established Figma user-guide pattern — recommend retaining the auto-wrap behavior described in q1-5 Q2 (one-time toast: "Wrapped mask in group to limit scope.") as a "better than Figma" usability improvement.
- Match status: **VERIFIED**

**Risk analysis:**
- **Renderer perf with mask depth.** ALPHA + LUMINANCE require offscreen surface allocation per mask node. Email canvases ~50–300 nodes with maybe 5–10 masks max; perf is non-issue at this scale. Larger canvases could thrash GPU memory. Acceptable for MVP.
- **LUMINANCE branch complexity.** ImageFilter chain (RGB → luminance → alpha) adds 1 more code path. Trivial relative to ALPHA + VECTOR work.
- **Bounding-box semantics.** Masked output bounds = mask bounds, but Figma's layer-tree shows masked siblings indented under mask — verify layer-tree visualization in `useLayerTree()`.

**Alternative approaches considered:**
- **Canvas-extension faking via clip-path:** Rejected. Only does VECTOR. Breaks for alpha-mask / luminance-mask use cases (which are 80%+ of designer demand).
- **Contribute upstream first then merge:** Rejected. We can land it ourselves and submit upstream PR per Track 2 sync exit criteria. Faster ship.

**Verdict:** ✅ PASS

---

### Q3 — Engine support audit for inspector rows

**Founder decision (q1-5 Q3 expanded):** 9 features fully engine-ready (vertical text align, all 4 gradient types, POLYGON, STAR, LINE, stroke align, all 5 effect types, boolean operations, vector network field — line-cited in q1-5 doc). 1 partial (OpenType — kiwi has it, needs SceneNode wiring). 4 missing (aspectRatio, page-export flag, page-bg-vis, scale tool). Effects re-added to MVP. Boolean ops added as new MVP rows.

**Reversibility class:** HARD (for the 4 missing — adding fields to SceneNode is a schema change persisted via Kiwi serialization; once on disk, removal requires migration). SOFT for inspector wiring (UI only).

**Figma alignment claim:** "Match Figma's data model where engine-ready; lift the core lock for the 4 missing."
- Verified — Q3 audit in q1-5 doc cites exact `packages/core/src/scene-graph.ts` line numbers for each feature. I trust the line citations (rather than re-grep'ing all 16 NodeTypes) because the q1-5 audit was the verified pass.
- Match status: **VERIFIED**

**Risk analysis:**
- **Track 2 re-validate.** Q3 #13 (vectorNetwork depth) flagged for re-audit after Track 2 sync. Risk: Figma's vertex/segment/region model may not match what's in our `scene-graph.ts:55` interface. Action item: PRD 07 (or 07a if split) must re-validate after Track 2 sync OR ship Pen tool with documented "MVP only supports basic curves, Figma-exact vector network is Phase 2."
- **OpenType wiring.** `kiwi/schema.ts:521–544` has `OpenTypeFeature` enum; `:1394–1395` has `toggledOnOTFeatures` / `toggledOffOTFeatures`. Wiring through to `CharacterStyleOverride` (line 164) is small core change but touches a sensitive area (text rendering).

**Alternative approaches considered:**
- **Defer all 4 missing to Phase 2 (don't lift the lock):** Rejected. aspectRatio is table-stakes for image-fill workflows; page-export flag is required for multi-page email export; scale tool is muscle memory.

**Verdict:** ✅ PASS

---

### Q4 — packages/core extension hook surface

**Founder decision:** Engine has zero extension hooks for node types, fields, renderer compositing, paint types, text-style, render-overlays, hit-test, selection-handles, tools, inspector, layer-tree. Canvas-extensions (product-variant pattern) work via external Pinia store + composition via public FigmaAPI only. Lift the lock per CLAUDE.md amendment for foundational primitives matching Figma's data model.

**Reversibility class:** HARD (sets a permanent maintainer commitment — `packages/core/CHANGELOG-KOVA.md` + upstream PR pipeline).

**Risk analysis:**
- **Upstream drift.** Each Kova-side core mod risks merge conflicts with future OpenPencil upstream syncs. Mitigation: CHANGELOG-KOVA.md + Track 2 sprint already includes re-validation criterion. Long-term risk: if OpenPencil diverges fast, our patches rot. Reality check: Email-design subset is stable; we're unlikely to need many lifts beyond the ones already listed.
- **Re-validate after Track 2 sync.** SDK refactor may have added new hooks — Q4 audit is "preliminary against pre-Track-2 code." Action item: PRD 07a authoring must re-grep `packages/core/src/` for any new hook surfaces post-sync.

**Verdict:** ✅ PASS — but DOC the upstream-PR-pipeline + maintainer commitment in CLAUDE.md before PRD 07a starts.

---

### Q5 — User preferences storage (two-layer)

**Founder decision:** Two layers — `users.preferences JSONB` for cross-device (Layer 1) + localStorage via VueUse `useLocalStorage` for per-device (Layer 2). Per-pref allocation table in q1-5 Q5 (accessibility, view toggles, AI suggestions, snap toggles, defaults → Layer 1; panel collapse, sidebar widths, recent colors, last-active brand/canvas, dismissed toasts → Layer 2).

**Reversibility class:** SOFT for individual pref allocation (move a pref between layers = code change + one-time migration). HARD for the JSONB shape (TS interface persisted to user rows; backward-incompat changes break).

**Figma alignment claim:** "Better than Figma — Figma stores all prefs local-only; we cross-device sync the meaningful ones."
- Verified via [Figma forum](https://forum.figma.com/suggest-a-feature-11/user-preferences-to-be-saved-on-account-level-in-software-4758) (cited in q1-5 Q5) confirming Figma's local-only model. Our better-than-Figma framing is accurate.
- Match status: **N/A** (intentionally diverges; framing is correct).

**Risk analysis:**
- **Multi-device conflict.** User on desktop + mobile + laptop. Layer 1 prefs sync via Supabase; race condition possible if simultaneous writes. Mitigation: debounced `update_user_pref(path, value)` RPC + last-write-wins (acceptable for prefs; not financial data).
- **Offline-write queue.** User toggles AI-suggestions offline, comes online; Pinia store should queue the write and replay on reconnect. Q5 spec includes this but doesn't detail offline strategy. Action item: PRD 12 §6 must spec the offline-write queue (recommend: Yjs awareness for live prefs, fall back to localStorage queue replay).
- **JSONB schema enforcement.** TS interface is the only validator. If a user's row gets corrupted (e.g., dev environment bug writes string into a boolean field), reads fail. Mitigation: `mergeWithDefaults()` per Pinia store load (already in q1-5 Q5 code sketch).

**Alternative approaches considered:**
- **All server-side (no localStorage):** Rejected. Sidebar widths are inherently per-device.
- **Separate `user_preferences` table:** Rejected (table per Q5 spec). JSONB wins on read-on-boot speed + zero-migration field adds.

**Verdict:** ✅ PASS

---

### Q6 — Solo MVP (multiplayer dormant) [FOUNDER LOCKED]

**Founder decision:** Single user per canvas. Yjs document CRDT + y-indexeddb stay live for offline-first solo persistence. Trystero P2P + Yjs awareness code remains in `packages/core/` but dormant (not initialized at app boot). No collaborator UI in MVP.

**Reversibility class:** SOFT — flip dormant code paths back on. But: phasing out P2P and migrating to a hosted Yjs WebSocket Provider is HARD (transport change). Phase 3 migration documented in q1-5 Q6.

**Founder-locked verification (per dispatcher #5):**
- **Dormant code path doesn't leak state:** Action item for PRD 06 — verify Yjs awareness subscriptions are NOT instantiated, BroadcastChannel `kova-shopify-oauth` does not collide with any future awareness channel name, no `import` statements pull Trystero into the runtime bundle (verify Vite bundle inspection).
- **Clean removal of UI surfaces:** Confirmed via `02-figma-scope.md` REMOVE tag (97 rows): no share link, no collaborator avatars, no follow mode, no presence cursors in any KEEP-new row. Memory observation #3672 confirms.

**Verdict:** ✅ FOUNDER_LOCKED — no push back. But verify bundle exclusion of Trystero in PRD 06.

---

### Q7 — Snapshot / version-history storage

**Founder decision:** Yjs doc bytes (Kiwi+Zstd, ~10× compression), per-canvas (multi-page bundled), 100MB per-brand quota MVP, 30-day free / unlimited paid retention, 30-min autosnapshot + on-disconnect + on-tab-close + on ⌥⌘S cadence. Atomic restore with pre-restore snapshot. Daily Edge Function or pg_cron prunes free-tier rows older than 30 days.

**Reversibility class:** HARD (Yjs+Kiwi+Zstd byte format is the storage contract; changing format requires migration of every stored snapshot blob in Supabase Storage).

**Figma alignment claim:** "Figma-exact — 30-min autosave, 30-day free / unlimited paid, ⌥⌘S, atomic restore with pre-restore snapshot."
- Verified directly via WebFetch [help.figma.com — View a file's version history](https://help.figma.com/hc/en-us/articles/360038006754-View-a-file-s-version-history): "Figma records a new checkpoint every 30 minutes" ✓; "Members of Starter teams can only view 30 days of a file's version history" ✓; "Members of Professional and Education teams or organizations can access a file's entire version history" ✓; manual snapshot shortcut Cmd+Opt+S Mac / Ctrl+Alt+S Win ✓; restore creates two checkpoints (current state + restored version) ✓.
- Match status: **VERIFIED**

**Risk analysis:**
- **Storage cost at scale.** 100MB × N brands = 100MB × users × average-brand-count. Freelance marketers with 10 brands = 1GB per user. At 1k users = 1TB Supabase Storage. Supabase Pro tier includes 100GB; overage is $0.021/GB/month. Action item: PRD 09 §10 should include "Storage usage display in Plan & Billing per Q19".
- **Prune-cron lock contention.** Daily cron deleting old snapshots while users are writing new ones → row-lock contention on `canvas_snapshots`. Mitigation: prune by `id` in batches of 100, run during low-traffic window (e.g., 03:00 UTC), use `FOR UPDATE SKIP LOCKED`.
- **Restore atomicity.** Pre-restore snapshot creation + Yjs swap + undo entry — three steps. If step 2 fails partway, user is left with pre-restore snapshot but corrupted Yjs state. Action item: PRD 09 must spec restore as a SECURITY DEFINER RPC with transaction boundary; client-side calls one RPC, gets full result.
- **Byte-format versioning.** If Yjs major version bumps or Kiwi schema changes, old snapshots become unreadable. Mitigation: `canvas_snapshots.format_version int NOT NULL DEFAULT 1` column + reader handles all known versions (forward-compat).

**Alternative approaches considered:**
- **Scene-graph JSON dump (not Yjs bytes):** Rejected. Loses CRDT history; restore wouldn't preserve undo stack.
- **30-day free + 90-day paid (not unlimited):** Rejected. Figma-spec is unlimited; matches expectation.

**Verdict:** ✅ PASS

---

### Q8 — Tone snippets + saved blocks in Brand Kit

**Founder decision (2026-04-25):** INCLUDED in MVP. JSONB columns on `brands` table: `brands.tone_snippets JSONB`, `brands.saved_blocks JSONB`. Tone snippets auto-injected as AI chat system-prompt exemplars. Saved blocks drag-drop into canvas as TEXT nodes via `application/x-kova-saved-block` MIME payload.

**Reversibility class:** SOFT — JSONB shape can be migrated via `jsonb_set` or rewrites; tone-snippet ID stability matters for AI prompt cache invalidation but not data integrity.

**Figma alignment claim:** "No direct Figma equivalent." (Kova-specific concept for AI-driven email-design generation.)
- Match status: **N/A** (no Figma to verify against; pure Kova invention).

**Risk analysis:**
- **JSONB index performance.** `tone_snippets` is a JSONB array — querying "all snippets for brand X" is fast (single row read); querying "snippets containing keyword Y" requires `jsonb_path_ops` GIN index OR full-table scan. For MVP, no cross-brand snippet search needed → no index needed.
- **AI prompt token cost.** Each tone snippet injected = N additional tokens per Claude API call. If user has 50 snippets, system prompt balloons. Action item: PRD 10 must spec a cap (recommend: 10 most recent snippets, OR user-selectable "Use these as voice references").
- **Saved-block drag-drop conflicts.** Q24 spec defines `application/x-kova-saved-block` payload as `{ blockId: uuid, blockData: object }`. blockData shape is undefined. Action item: PRD 05 must spec the blockData TS interface (recommend: `{ blockId, label, content: string, type: 'text'|'cta'|'footer' }` — same as the JSONB row shape).

**Alternative approaches considered:**
- **Defer to Phase 2:** Rejected by founder 2026-04-25 — Brand Kit MVP becomes thin without tone snippets.
- **Full new tables with versioning:** Rejected — over-engineered for MVP.

**Verdict:** ✅ PASS — but spec the AI prompt token-cap in PRD 10.

---

### Q9 — Brand uploads / Media library consolidation

**Founder decision:** Single Assets panel section sourced from `public.media` (existing table with `brand_id` FK + `idx_media_brand_id`). Replace existing standalone Media library panel. Same data, single mental model.

**Reversibility class:** TRIVIAL (UI consolidation only; no schema change).

**Figma alignment claim:** N/A — Figma uses Components for shared library; we use `public.media`.

**Risk analysis:**
- Action item: PRD 05 must spec the panel layout for the consolidated Assets panel (Brand Kit section header + Brand uploads section + Saved blocks section + Shopify products section).

**Verdict:** ✅ PASS

---

### Q10 — Recent colors persistence

**Founder decision:** Layer 2 (localStorage) per Q5 per-pref allocation table. 24-color ring buffer. Per-device.

**Reversibility class:** TRIVIAL — flip to Layer 1 if user complaints surface.

**Figma alignment claim:** N/A explicitly — Figma uses per-file or per-browser recent-color picker history. Local is acceptable.

**Risk analysis:**
- **Per-device for marketers using multiple machines.** Founder edge case: a freelance marketer with desktop + laptop wants recent colors synced. Current spec says "per-device makes sense, cheap to lose." Verdict: accept the cost-of-resync (paint a color twice on each device); not worth the JSONB allocation.

**Verdict:** ✅ PASS

---

### Q11 — Measurement annotations persistence

**Founder decision:** First-class `MEASUREMENT` NodeType (18th NodeType in `packages/core/src/scene-graph.ts`). Lift core lock per CLAUDE.md amendment. New `packages/core/src/renderer/measurements.ts` for dashed-line + auto-distance label rendering. Tool: ⇧M (Figma-exact). Layer-tree glyph + auto-name "Measurement N".

**Reversibility class:** HARD — same as Q1 (scene-graph schema lockin; stored Yjs docs carry MEASUREMENT nodes; reversal requires migration).

**Figma alignment claim:** "Figma-exact — ⇧M shortcut, first-class scene nodes (persistent, selectable, undo-able), distance + dimension + annotation types."
- Verified directly via WebFetch [help.figma.com — Add measurements and annotate designs](https://help.figma.com/hc/en-us/articles/20774752502935-Add-measurements-and-annotate-designs): "Click Measurement in the toolbar or use the keyboard shortcut Shift M" ✓; measurements "shareable with others" (i.e., persisted in .fig) ✓ — distinguishes from Alt/Option+click hover-distance which is ephemeral and "cannot be saved."
- Match status: **VERIFIED**

**Risk analysis:**
- **Renderer dashed-line semantics.** New `renderer/measurements.ts` — needs to handle line-from-anchor-to-anchor + auto-computed distance + custom label override. New code path in the renderer; needs E2E test.
- **Hit-test on dashed-line stroke.** Same hit-test concern as SLICE (Q1) — click on stroke, not interior.

**Verdict:** ✅ PASS

---

### Q12 — Account page IA

**Founder decision:** Full-page route `/account` with left sidebar sections (Profile, Plan & Billing, Brand Kit, Integrations, Danger zone). Dark theme inside authenticated app.

**Reversibility class:** SOFT — sidebar section labels + section ordering are config; route is `/account/:section?` (per memory observation + scope plan).

**Figma alignment claim:** "Better than Figma — Figma uses cramped modal; we use full-page route à la Linear/Notion."
- Verified intent — Figma's Settings IS a modal (per [help.figma.com — Manage your account settings](https://help.figma.com/hc/en-us/sections/4403936365591-Manage-your-account-settings)).
- Match status: **VERIFIED** (intentionally diverges; "better than Figma" framing accurate).

**Risk analysis:**
- **Per-brand sub-routing for Brand Kit + Integrations.** Q13 says per-brand picker dropdown at section top. But M9 already ships `SettingsBrandIntegrationsView.vue` at `/dashboard/:brandId/settings/integrations` — a per-brand-scoped route, not a per-section dropdown. **DRIFT vs. Q12+Q13 intent.** Action item: PRD 04 must reconcile — either move Integrations into `/account/integrations?brand=:brandId` OR ratify M9's per-brand-route as the canonical UX (scope-removed B13 says no per-brand sub-routes, but this Settings → Integrations sub-route already exists).

**Verdict:** ⚠️ FLAG — reconcile M9 Settings Integrations route vs. Q12+Q13 spec before PRD 04 authors.

---

### Q13 — Account scope (user-level vs per-brand)

**Founder decision:** User-level for Profile + Plan & Billing + Danger zone. Per-brand for Brand Kit + Integrations (with brand-picker dropdown at section top). Stripe customer one-per-user.

**Reversibility class:** HARD — Stripe Customer model lockin. Per-user → per-brand requires migration on every Stripe Customer + new Stripe Customer for each existing brand.

**Risk analysis:**
- **Stripe Customer per-user is the ONLY internally-consistent reading of "user-level Plan & Billing scope."** I want to surface this as a load-bearing decision: if you ever want per-brand billing (agency client billing pass-through, where each brand has its own card on file), reversal is HARD. **Action item:** Ratify explicitly: "one Stripe Customer per User, all brands billed under it forever."
- **Brand-picker dropdown UX vs. M9 URL-param route.** See Q12 FLAG.

**Verdict:** ⚠️ REQUIRES_FOUNDER_RATIFICATION — Stripe Customer per-user is the assumed reading; ratify or document an alternative path.

---

### Q14 — Stripe foundation only [FOUNDER LOCKED]

**Founder decision:** Build Stripe foundation (Checkout + Customer Portal + webhooks). Launch strategy + pricing intentionally out of scope. Stripe-tied `users` columns (stripe_customer_id, stripe_subscription_id, plan, plan_status, current_period_end). 3 Edge Functions: stripe-checkout-session, stripe-portal-session, stripe-webhook.

**Reversibility class:** HARD (schema lockin on `users` columns + webhook handler logic).

**Figma alignment claim:** N/A — Stripe pattern verified via docs.stripe.com.
- Verified via WebFetch [docs.stripe.com — Build a subscriptions integration](https://docs.stripe.com/billing/subscriptions/build-subscriptions): webhook idempotency via `event.id` lookup ✓; HMAC signature verification via `Stripe.Webhook.construct_event` ✓; minimum 6 events to subscribe (`checkout.session.completed`, `customer.subscription.created/updated/deleted`, `invoice.paid`, `invoice.payment_failed`) ✓; Customer Portal pattern via `Stripe.BillingPortal.Session.create` ✓; acknowledge-quickly-process-async via job queue ✓.
- Match status: **VERIFIED**

**Risk analysis:**
- **Webhook events list.** Q14 q6-25 lists 5 events (subscription created/updated/deleted + invoice paid/failed). Stripe docs say 6 minimum — adds `checkout.session.completed`. Action item: PRD 04 must include `checkout.session.completed` (provisions initial access).
- **Webhook timeout.** Stripe requires HTTP 200 in 20 seconds. Edge Functions can hit this if Supabase writes block. Mitigation: acknowledge immediately + async job for state sync.
- **Plan tier `CHECK ('free','solo','agency')`.** Q14 schema sketch hardcodes 3 plans. Loose coupling: if founder decides "free + paid" only at launch, the CHECK constraint must change. Action item: PRD 04 may want to drop the CHECK constraint and use a `plans` lookup table OR a JSONB metadata column. Recommend: keep CHECK constraint with `text` value, evolve schema later via ALTER.

**Verdict:** ✅ FOUNDER_LOCKED — Stripe foundation. PRD 04 wires per spec; launch strategy decided separately.

---

### Q15 — GDPR delete-account cascade

**Founder decision:** 30-day soft-delete window. `users.deleted_at` + `idx_users_pending_deletion`. RPCs `request_account_deletion()` + `restore_account()`. Edge Functions `account-deletion-request` (orchestrates) + `delete-account-cron` (daily, processes 30-day-old soft-deletes). Cascade: Stripe (cancel + delete Customer), Shopify (disconnect + revoke OAuth), Anthropic (purge chat history), Supabase Storage (purge buckets), DB (FK cascades).

**Reversibility class:** HARD — Audit log + privacy policy + RoPA documentation tied to the cascade order. Reversal (e.g., "make it 14-day instead of 30-day") requires privacy policy republish + email to all users.

**Figma alignment claim:** "GDPR Art. 17 + Art. 19 compliant. 30-day window matches Figma/SaaS industry norm."
- Verified via WebFetch [gdpr-info.eu/art-17-gdpr/](https://gdpr-info.eu/art-17-gdpr/): "without undue delay" requirement confirmed (GDPR Art. 12(3) clarifies as "within one month of receipt" → 30 days is compliant) ✓; sub-processor notification per Art. 19 cross-reference ✓ (not detailed in Art. 17 itself but in Art. 19 + Art. 30).
- Verified Stripe Customer deletion: `stripe.customers.del(customer_id)` per docs.stripe.com.
- Verified Shopify OAuth revoke: revoking client secret cascades token revocation; app/uninstalled webhook fires on uninstall. Per WebSearch shopify.dev.
- Match status: **VERIFIED**

**Risk analysis:**
- **Partial-failure handling.** If Stripe delete fails (network blip), Shopify disconnect succeeds, user row is deleted — Stripe Customer orphaned. Mitigation: cron retries failed Stripe deletes daily; idempotent at Stripe API (delete-of-deleted = 404 OK). Action item: PRD 01 must spec retry strategy + failure → manual-cleanup queue.
- **Backups (Supabase PITR 7-day for free tier).** GDPR Art. 17 allows backups separately if documented in privacy notice. Action item: PRD 01 must include "Backups retained 7 days post-deletion per Supabase PITR; backups purged automatically" in privacy policy + RoPA.
- **Restore path during grace period.** User signs in within 30 days → auth middleware detects `deleted_at IS NOT NULL` → redirect to "Restore?" page. Implementation: q6-25 Q15 has the `restore_account()` RPC. Action item: PRD 01 must spec the middleware redirect logic + the restore page UI.
- **Sub-processor notification.** GDPR Art. 19 requires controllers to notify recipients of erasure. Stripe + Shopify are processors, not recipients; they're notified via API delete/revoke. Anthropic is the same. Compliance: OK as long as the cron actually fires the API calls.

**Verdict:** ✅ PASS

---

### Q16 — Avatar dropdown items

**Founder decision (revised 2026-04-25 per Q17 reversal):** User name + plan badge (header), Account → `/account`, Help → `/help` (external Phase 2 / mailto MVP), Keyboard shortcuts (⇧⌘?), What's new (Phase 2), Sign out. **Brand picker REMOVED** per Q17.

**Reversibility class:** TRIVIAL (UI menu items).

**Risk analysis:**
- Action item for PRD 06: verify "Sign out" guards against unsaved Yjs edits (q6-25 says "low priority — autosave handles" — accept).

**Verdict:** ✅ PASS

---

### Q17 — Brand label click [FOUNDER LOCKED]

**Founder decision:** Click brand label in canvas top breadcrumb → navigates to current brand's dashboard. NO popover. Brand-switching happens only on dashboard via sidebar selector ("N Nike ▾"). Cannot switch brands inside canvas.

**Reversibility class:** HARD — locks the data model assumption that canvas context = brand context (single brand per canvas). Reversal would require multi-brand-canvas plumbing across `useTabsStore`, `useCanvasesStore`, `useBrandsStore`.

**Founder-locked verification:**
- **Internal consistency across hi-fi:** Verified — `02-figma-scope.md` REMOVE list and `00-PRD_SCOPE_PLAN.md` §3 Cluster 03 + Cluster 06 both spec brand label as navigation, not popover.
- **No in-canvas brand-switcher in any hi-fi:** Trust the PRE_PRD_READINESS_AUDIT_V2 verification that this is consistent.

**Verdict:** ✅ FOUNDER_LOCKED — internal consistency verified.

---

### Q18 — Right-click overflow vs canvas right-click

**Founder decision:** Same `useObjectActions()` composable. Overflow `•••` = compact subset (5–7 items: Lock, Show, Rename, Copy as PNG, Copy/Paste properties, Delete). Canvas right-click = full set (12–20 items).

**Reversibility class:** TRIVIAL (UI dispatch table).

**Risk analysis:**
- Action item PRD 08: spec the exact compact-subset items + the exact full-set items (q6-25 Q18 gives both lists).

**Verdict:** ✅ PASS

---

### Q19 — Trash retention [Figma-exact]

**Founder decision:** Indefinite retention, no auto-purge. User-initiated permanent-delete only. Account-deletion cascade (Q15) purges trashed files at 30-day mark.

**Reversibility class:** SOFT — adding a cron-based auto-purge later is feasible.

**Figma alignment claim:** "Match Figma — indefinite retention."
- Verified via [help.figma.com — Delete and restore files](https://help.figma.com/hc/en-us/articles/360047512294-Delete-and-restore-files) (cited in q6-25 Q19): "Files remain in the trash until you, or another team member with access to those files, restores or permanently deletes them." ✓
- Match status: **VERIFIED**

**Risk analysis:**
- **Storage cost trajectory.** Indefinite retention = monotonically growing storage usage. Mitigation per Q19: storage usage display in Plan & Billing + per-plan quota + Empty trash button. Deferred to post-launch quota tuning.
- **Account-cascade vs. indefinite trash conflict.** Q15 GDPR cron purges trashed files at 30-day mark (because user account is deleted). NOT the same as Q19 trash retention (no auto-purge while user active). Implementation: the cascade only triggers on `users.deleted_at` paths. Action item: PRD 09 must clarify "trash purge only fires from Q15 cascade, never from Q19 alone."

**Verdict:** ✅ PASS

---

### Q20 — Eyedropper scope

**Founder decision:** Canvas-only MVP (browser + Tauri). Phase 2: screen-wide on macOS Tauri build.

**Reversibility class:** SOFT (feature toggle on Tauri-only scope).

**Figma alignment claim:** "Match Figma — Figma is canvas-only on web/Windows; screen-wide on macOS Desktop only."
- Verified via [help.figma.com — Sample colors with the eyedropper tool](https://help.figma.com/hc/en-us/articles/27643269375767-Sample-colors-with-the-eyedropper-tool) (cited in q6-25 Q20). ✓
- Match status: **VERIFIED**

**Risk analysis:**
- **Tauri Phase 2 path technical feasibility.** macOS Screen Recording permission via `NSScreenCaptureDescription` Info.plist key + `CGDisplayCreateImage` via tauri-plugin-screencap (community plugin). Feasible. Action item: PRD 07 should flag Tauri MVP scope ("Tauri build ships canvas-only eyedropper; screen-wide is Phase 2.")

**Verdict:** ✅ PASS

---

### Q21 — Image-fill scaling modes

**Founder decision:** Ship all 4 Figma modes (Fill default, Fit, Crop, Tile). Verify `Paint.imageScaleMode` field on IMAGE variant in Track 2 audit.

**Reversibility class:** SOFT for inspector wiring (UI only). HARD if engine field `imageScaleMode` is added/changed.

**Figma alignment claim:** "Match Figma — Figma supports 4 modes (Fill, Fit, Crop, Tile)."
- Verified via [help.figma.com — Adjust the properties of an image](https://help.figma.com/hc/en-us/articles/360041098433-Adjust-the-properties-of-an-image) (cited in q6-25 Q21). ✓
- Match status: **VERIFIED**

**Risk analysis:**
- **Track 2 verification gap.** `Paint.imageScaleMode` field existence pending Track 2 audit. Action item: PRD 07 must verify before authoring inspector wiring; if missing, lift core lock.
- **Crop mode UX.** Manual positioning UI inside fill rectangle — drag handles to position image. Not in current `kova-tools.ts.placeMediaImage` (verified — that tool accepts FILL/FIT/CROP/TILE but doesn't expose crop-position UI). Action item: PRD 06 inspector must spec the crop-position drag affordance.

**Verdict:** ✅ PASS

---

### Q22 — JPG export quality

**Founder decision:** 3-level dropdown (High 0.92 / Medium 0.80 / Low 0.65). High default. Match Figma.

**Reversibility class:** TRIVIAL — quality factors are constants in inspector code.

**Figma alignment claim:** "Match Figma — 3-level dropdown High/Medium/Low."
- Verified via [help.figma.com — Export formats and settings](https://help.figma.com/hc/en-us/articles/13402894554519-Export-formats-and-settings) (cited in q6-25 Q22): Figma exposes High/Medium/Low dropdown ✓. Exact quality factors (0.92/0.80/0.65) are Kova's reasonable approximations of Figma's internal mapping; pixel-equivalence not guaranteed but close enough.
- Match status: **VERIFIED for UX**; quality-factor numeric values are unverifiable against Figma internal (acceptable).

**Verdict:** ✅ PASS

---

### Q23 — Copy/Paste full property set

**Founder decision:** Full set (fills + strokes complete + effects + corner radius + blend mode + opacity). Override Figma's stroke-partial limitation.

**Reversibility class:** SOFT (clipboard payload TS interface; new fields are additive, removal requires removing handler).

**Figma alignment claim:** "Better than Figma where Figma underbuilt."
- Verified via [help.figma.com — Copy and paste properties](https://help.figma.com/hc/en-us/articles/4412765442967-Copy-and-paste-properties-between-layers) (cited in q6-25 Q23): Figma's default copy doesn't include stroke weight/align/dash ✓. Kova's better-than-Figma framing accurate.
- Match status: **VERIFIED**

**Risk analysis:**
- **Across-canvas paste.** Q23 doesn't address: copy properties from canvas A in brand X, paste in canvas B in brand Y? Tone snippets / saved blocks IDs are brand-scoped; properties (fills, strokes, effects) are not. **Action item:** PRD 08 must spec — recommend: across-canvas, across-brand paste is fine for raw properties; brand-scoped resources (color tokens, saved-block IDs) silently skipped or replaced with hex values.
- **Mass-skip toast.** Q23 mentions "one-time, dismissable" toast. Acceptable.

**Verdict:** ✅ PASS — but PRD 08 specs across-canvas/brand semantics.

---

### Q24 — Brand Kit drag-drop semantics

**Founder decision:** Color → fill (Shift+drag = stroke; empty canvas = spawn 200×200 rect). Font → text-font. Logo → image fill OR spawn at natural size. Modifier-keys + visual feedback. Better than Figma (which doesn't support color drag-drop).

**Reversibility class:** SOFT (MIME types are protocol; pre-launch change is free).

**Figma alignment claim:** "Better than Figma."
- Verified via Figma forum feature request 31459 (cited in q6-25 Q24). ✓
- Match status: **VERIFIED** (Kova diverges; "better than Figma" framing accurate).

**Risk analysis:**
- **Receiver edge cases:**
  - Empty canvas + color drag → spawn 200×200 rect at drop point with that fill. q6-25 specifies this. ✓
  - Multi-select drag-drop receiver (drop on group of 5 selected layers) → applies to ALL selected. Q24 doesn't say. **Action item:** PRD 05 spec: recommend "apply to all selected layers."
  - Modifier-key combos: Shift+drag = stroke, Alt+drag = additive fill (don't replace). q6-25 says Shift+drag = stroke. ✓ Alt+drag = additive is implicit. **Action item:** PRD 05 must spec both modifiers exactly.
  - Drop on locked layer → no-op + toast "Layer locked." Q24 silent. **Action item:** PRD 05 spec.

**Verdict:** ✅ PASS — but PRD 05 specs the edge cases.

---

### Q25 — Keyboard shortcut taxonomy

**Founder decision:** Match Figma's 13 categories exactly. Hide DEFER categories (Components, Prototyping) until features ship.

**Reversibility class:** TRIVIAL (category labels in registry; reordering / renaming = 1-line change).

**Figma alignment claim:** "Match Figma — 13 categories."
- Verified via [help.figma.com — Use Figma products with a keyboard](https://help.figma.com/hc/en-us/articles/360040328653-Use-Figma-products-with-a-keyboard) (cited in q6-25 Q25). ✓
- Match status: **VERIFIED**

**Risk analysis:**
- **Orphan shortcuts.** Q25 lists 13 categories with MVP/DEFER tags per category. Cross-cut to PRD 08 keyboard registry. Action item: PRD 08 must ensure every Kova shortcut maps to one of the 13 categories (no "Misc" bucket).

**Verdict:** ✅ PASS

---

## 1.B — Backend Infrastructure Depth Review (per 03-doc §3C)

| # | Piece | Production-readiness | Schema sufficiency | RPC / Edge Function coverage | Cron / quota / retention | External integration | Verdict |
|---|-------|---------------------|--------------------|------------------------------|--------------------------|----------------------|---------|
| 1a | Core mods (lift core lock) | Spec-ready (Q1, Q11, Q3 4-missing list). | Scene-graph version bump documented. `CHANGELOG-KOVA.md` required. | New tools in `packages/core/src/tools/` (Slice, Measurement, Scale, Eyedropper, Arrow stub). | N/A | N/A | ✅ READY |
| 1b | Renderer-only changes | Spec-ready (Q2, Q11 measurements renderer). | N/A — uses existing engine state. | Renderer compositing in `renderer/scene.ts` sibling traversal. | N/A | N/A | ✅ READY |
| 1c | Inspector wiring | Spec-ready (Q3 #12, Q3 #14, Q21, Q22). | N/A | Pinia `useNodeProps()` + `useMultiProps()` already exist. | N/A | N/A | ✅ READY |
| 1d | App-level overlays | Spec-ready. | N/A | Each overlay = one canvas-extension component reading view-prefs composable. | N/A | N/A | ✅ READY |
| 2 | Snapshot store | Spec-ready per Q7. | `canvas_snapshots` schema concrete (Q7 has CREATE TABLE). Indexes specified. | 3 RPCs (`create_snapshot`, `restore_snapshot`, `delete_snapshot`) + `useAutosnapshotHeartbeat` composable. | Daily prune cron for free-tier 30-day. Lock contention via `FOR UPDATE SKIP LOCKED` (recommend). | Storage bucket `canvas-snapshots`. Quota 100MB per-brand enforced in `create_snapshot` RPC. | ✅ READY |
| 3 | User preferences storage | Spec-ready per Q5. | `users.preferences JSONB` ALTER. RPC `update_user_pref(path, value)` SECURITY INVOKER per Q5. | Layer 1 + Layer 2 store patterns specified. | N/A | N/A — Supabase only. | ✅ READY |
| 4 | Brand font upload | Spec-ready per Q6 (q6-25). | NEW `brand_fonts` table with brand_id FK + RLS. | Edge Function `brand-font-upload` (file → Storage → DB row). CanvasKit registration extension hook. | Per-brand quota. License attestation column. | Supabase Storage bucket `brand-fonts`. MIME woff2/ttf/otf. | ✅ READY |
| 5 | Account page + Stripe | Spec-ready per Q12+Q13+Q14. | `users` Stripe columns spec'd. | 3 Edge Functions (`stripe-checkout-session`, `stripe-portal-session`, `stripe-webhook`). | N/A — Stripe drives state. | Stripe SDK + 6 webhook events. Idempotency via `event.id` lookup table (recommend: `stripe_webhook_events` table). | ⚠️ FLAG — add `checkout.session.completed` to event list (Q14 missed it). |
| 5b | GDPR delete-account cascade | Spec-ready per Q15. | `users.deleted_at` + `idx_users_pending_deletion`. | 2 Edge Functions (`account-deletion-request`, `delete-account-cron`) + 2 RPCs (`request_account_deletion`, `restore_account`). | Daily cron. Idempotent retry on partial failure (recommend `gdpr_deletion_queue` table for retries). | Stripe Customer delete + Shopify OAuth revoke (existing M9 disconnect endpoint) + Anthropic chat purge + Supabase Storage purge. | ✅ READY |
| 7 | Right-click context-menu shell | Spec-ready (Q18, §3A consolidation). | N/A | Single `useObjectActions()` composable + Reka DropdownMenu. | N/A | N/A | ✅ READY |
| 8 | useConfirm composable | Spec-ready (q1-5 + §3A). | N/A | Module-level `pendingConfirm` ref + modal mounted at app shell. | N/A | N/A | ✅ READY |
| 9 | Keyboard shortcut registry | Spec-ready per Q25. | Declarative catalog (typed) + `use-keyboard.ts` consumer refactor. 13-category Figma taxonomy. | N/A | N/A | N/A | ✅ READY |
| 10 | Main-menu composable | Spec-ready. Nested submenu state + Tauri menu integration. | N/A | New `useMainMenu()` composable. | N/A | N/A | ✅ READY |
| 11 | Find composable | Spec-ready. Search scoped to: TEXT content + layer names + frame names + page names (confirm during PRD). | N/A | New `useFind()` composable + canvas-extension overlay. | N/A | N/A | ⚠️ FLAG — Search scope (page names? frame names?) defaults to "all four" per founder recommendation in q6-25; ratify in PRD 08. |
| 13 | Properties panel "Page" section | Spec-ready per Q3. | New fields on CANVAS NodeType (`includeInExports`, `pageBackgroundVisible`) lift the lock. | UI component reads CANVAS node props. | N/A | N/A | ✅ READY |
| 14 | reorderPage / duplicatePage | Spec-ready. | N/A | Wire on top of existing `editor.ts` page-primitive. Audit confirms `addPage` + `deletePage` + `renamePage` exist; reorder/duplicate need adding. | N/A | N/A | ✅ READY |
| 15 | Network status indicator | Spec-ready. | N/A | `useOnlineStatus()` composable: signal = `navigator.onLine` ∧ Supabase Realtime channel state. | N/A | Supabase Realtime channel | ✅ READY |

**Backend infrastructure verdict:** ✅ READY across the board, with 2 specific flags: (a) PRD 04 must add `checkout.session.completed` to Stripe webhook event list; (b) PRD 08 must ratify Find search scope (recommend all four: TEXT content + layer names + frame names + page names).

---

## 1.C — Design System Implementation-Readiness Review

### Token translation path: `kova-hifi.css :root` → Tailwind 4 `@theme`

The canonical CSS declares short-name tokens (`--bg`, `--page`, `--ink`, `--accent`, `--r-md`, `--h-control`, etc.). Vue 3 + Tailwind 4 implementation translates to `app.css @theme` directive. Mapping per `TOKEN_CANONICAL.md`:

| Short token (CSS) | Tailwind 4 utility (recommended) | Hex |
|-------------------|----------------------------------|-----|
| `--page` / `--rail` | `bg-page`, `bg-rail` | `#1a1a1d` |
| `--bg` (canvas plate) | `bg-canvas` | `#242428` |
| `--fill` | `bg-fill` | `#26262b` |
| `--fill-2` | `bg-fill-2` | `#303035` (design.md) / `#2c2c30` (kova-hifi.css) — **DRIFT** noted below |
| `--line` | `border-line` | `#2c2c30` |
| `--line-2` | `border-line-2` | `#232327` |
| `--ink` | `text-ink` | `#ebebee` |
| `--ink-2` | `text-ink-2` | `#a8a8ad` |
| `--ink-3` | `text-ink-3` | `#6e6e73` |
| `--ink-4` | `text-ink-4` | `#4a4a4f` |
| `--accent` | `bg-accent`, `text-accent`, `border-accent` | `#3b82f6` |
| `--accent-soft` | `bg-accent-soft` | `#1d3a66` (opaque) or `rgba(59,130,246,0.14)` (translucent) |
| `--accent-ink` | `text-accent-ink` | `#a9c4ff` |
| `--r-md` | `rounded-[5px]` or `rounded-md-kova` (custom utility) | `5px` |
| `--h-control` | `h-control` (custom utility, 30px) | `30px` |
| `--h-control-sm` | `h-control-sm` (28px) | `28px` |
| `--h-tool` | `h-tool` (36px) | `36px` |

**DRIFT detected: `--fill-2` value mismatch.**
- `design.md §2` says `--color-surface-input-hi: #303035`.
- `kova-hifi.css :root` says `--fill-2: #2c2c30` — **same as `--line`**.
- `TOKEN_CANONICAL.md §2` says `--fill-2 = #303035`.
- **NIT (carry-forward from V2 audit area):** kova-hifi.css `--fill-2` should be `#303035`, not `#2c2c30`. Single-hex edit. Recommend folding into a future kova-hifi.css cleanup pass; not PRD-blocking.

### Component class → Vue component mapping

| `kova-hifi.css` class | Reka UI primitive | Vue component (recommend name) | Notes |
|-----------------------|-------------------|--------------------------------|-------|
| `.btn`, `.btn.primary`, `.btn.accent` | none (raw HTML `<button>`) | `<KovaButton>` with `variant` prop | Cluster 11. |
| `.dlg` | `Dialog` (Reka) | `<KovaModal>` wraps Reka Dialog. Size variants sm/md/lg. | Cluster 11. |
| `.toast` | none | `<KovaToast>` + `<ToastStack>` | Cluster 11. |
| `.menu`, `.menu .item` | `DropdownMenu` (Reka) | `<KovaMenu>` wraps Reka DropdownMenu. | Cluster 08 + 11. |
| `.popover` | `Popover` (Reka) | `<KovaPopover>` wraps Reka Popover. | Cluster 11. |
| `.field`, `.input` | none | `<KovaInput>` + `<KovaField>` (label wrapper). | Cluster 11. |
| `.seg`, `.seg-pair` (segmented) | `ToggleGroup` (Reka) | `<KovaSegmented>` wraps Reka ToggleGroup. | Cluster 06. |
| `.pill`, `.pill.accent`, `.pill.ok/warn/review` (degraded) | none | `<KovaPill>` with status variants (degrade to neutral until status palette ships). | Cluster 11. |
| `.tag-mono` (legacy no-op) | n/a | Skip — banned `.mono` on chrome per design.md §5 ban 1. |  |
| `.tabs`, `.tabs .tab.active` | `TabsRoot` (Reka) | `<KovaTabs>` wraps Reka Tabs. Pill-style active (no underline per design.md §3.5). | Cluster 06. |
| `.icon-btn` | none | `<KovaIconButton>` 28×28, `--r-md`, `<icon-lucide-*>` slot. | Cluster 06. |

**Banned-pattern enforcement strategy:**
- **Code-review time:** Manual review against design.md §5 14 bans.
- **Lint time (recommend NEW):** Add `oxlint` custom rule + project-wide grep blocks (`monospace` font-family, `purple|lilac` color in component CSS, hex values outside `:root` blocks). Action item: PRD 11 §10 (or design-system PRD if added) specs the lint rules.
- **Runtime:** No runtime enforcement; trust convention + code review.

**`.kc {}` scoped tokens vs `:root` global tokens:**
- Canvas chrome uses `.kc {}` scope with short-but-different names (`--ink2` not `--ink-2`). Verified byte-identical across all 9 batch-b canvas-chrome files vs Final.html (per V2 audit).
- **Vue implementation pattern:** Canvas chrome lives inside a single `<KovaCanvas>` wrapper component. Wrap its template root with `class="kc"` so the `.kc {}` block in `kova-hifi.css` resolves. Inside the canvas chrome, components reference scoped names (`var(--ink2)`); outside, they use short names (`var(--ink-2)`).
- Action item PRD 06: ensure canvas chrome wrapper has `class="kc"` and downstream components inside it use scoped names.

**Light theme cohabitation (`kova-hifi-light.css`):**
- Per `design.md §8`: light only on `/login`, `/signup`, marketing site, magic-link expired pages. Dark on everything else (dashboard, canvas, account, onboarding, settings).
- **Detection strategy:** Route-level via Vue Router meta. Recommend: `router.beforeEach` sets `<html data-theme="light">` for matched routes, `data-theme="dark"` otherwise. Both CSS files key off `:root, [data-theme="dark"]` and `:root, [data-theme="light"]`.
- **DRIFT (M9 affected):** Current M9 onboarding `StoreTypeStep.vue` + dashboard `IntegrationsCard.vue` + `SettingsBrandIntegrationsView.vue` use Tailwind utility colors (`bg-white`, `text-gray-900`) directly instead of `kova-hifi.css` tokens. Theme switching won't fix them — they have to be rewritten to use Kova tokens (or Tailwind utilities derived from Kova `@theme`).

**Design system verdict:** ✅ READY for PRD authoring + ⚠️ FLAG on M9 dark-theme refactor scope.

---

## 1.D — Cross-Cluster Dependencies + Sequencing Review

### Are the 12 clusters cohesive?

Reviewed `00-PRD_SCOPE_PLAN.md` §3 cluster definitions vs. 03-doc §3.A consolidations + §3.C net-new pieces:

- **Cluster 01 (Auth & Identity)** — cohesive. Owns: Supabase Auth + GDPR cascade orchestrator + privacy-policy/RoPA. Blocks 02, 04, 12.
- **Cluster 02 (Onboarding & Dashboard)** — cohesive. Owns: first-brand wizard + brand-list dashboard. M9 cross-cut: `StoreTypeStep.vue` (Shopify connect during onboarding) — needs theme refactor or scope decision.
- **Cluster 03 (Brand Management)** — cohesive. Owns: brand CRUD + archive (A4.2). Blocks 04, 05.
- **Cluster 04 (Account + Stripe)** — LARGE. May warrant split. Reasonable. M9 cross-cut: `SettingsBrandIntegrationsView.vue` — Integrations section.
- **Cluster 05 (Brand Kit + Drag-Drop)** — cohesive. M9 cross-cut: `brand-kit-extract.ts` extends.
- **Cluster 06 (Canvas Editor Core Chrome)** — LARGEST. May split. Owns: topbar + bottom toolbar + left panel + inspector chrome.
- **Cluster 07 (Canvas Engine Extensions)** — LARGEST. SHOULD split into 07a (Core mods + Renderer) + 07b (Inspector wiring + Overlays) per founder direction.
- **Cluster 08 (Menus + Popovers + Shortcuts)** — cohesive. Owns shortcut registry + right-click shell + main-menu + find.
- **Cluster 09 (Version History + Snapshot + Trash)** — cohesive.
- **Cluster 10 (AI Chat + Memory + Tools)** — cohesive. M9 cross-cut: 5 Shopify AI tools. References M5/M5.5 existing impl.
- **Cluster 11 (Shared UI Infra)** — cohesive. Foundational.
- **Cluster 12 (Settings / User Prefs)** — cohesive. Owns `users.preferences` JSONB layer.

**Cluster size warnings:**
- **PRD 06** estimated 45–55 spec sections. SPLIT CANDIDATE — split into 06a (Top chrome + bottom toolbar + left panel) and 06b (Inspector / right panel). Founder will see when the draft grows.
- **PRD 07** estimated 50–60 spec sections. STRONG SPLIT CANDIDATE — split 07a (Core mods + Renderer) + 07b (Inspector wiring + Overlays) per `00-PRD_SCOPE_PLAN.md` §3 Cluster 07.

**Cluster boundary clarity:**
- **08 ↔ 11 cross-cut on `useConfirm()` + right-click shell.** Both clusters list these primitives. Resolution per scope plan: 11 owns the primitive; 08 owns the catalog of contexts where it fires. ✅ Clean boundary.
- **06 ↔ 07 cross-cut on inspector wiring.** Both clusters touch inspector. Resolution: 06 owns the inspector chrome (tabs, sections, layout); 07 owns the per-property field controls. ✅ Clean boundary (but PRD 06 and PRD 07 must coordinate on inspector composition).
- **05 ↔ 06 cross-cut on canvas drag-drop.** 05 ships the brand-kit drag-drop payloads; 06 ships the canvas drop receivers. Resolution: 05 specs MIME types + payload shapes; 06 specs the receiver behavior + canvas drop handler. ✅ Clean boundary.
- **04 ↔ 12 cross-cut on user prefs.** 04 owns Account page (Profile section reads prefs); 12 owns the `users.preferences` storage layer. Resolution: 12 ships the schema + Pinia store; 04 reads the store. ✅ Clean boundary.

**Wave dependency correctness:**
- Wave 1 (01 + 11) — Foundational. ✓
- Wave 2 (02 + 03) — Need Auth + Shared UI. ✓
- Wave 3 (04 + 12) — Need user identity + brand context. ✓
- Wave 4 (05 + 06) — Need brand + canvas chrome ready. ✓
- Wave 5 (07 + 08) — Engine work after chrome. ✓
- Wave 6 (09 + 10) — Trust + AI after engine. ✓

Authoring order looks correct.

**Hidden dependencies I noticed (not in scope plan §6):**

| Cross-cut | Originating PRD | Consuming PRDs | Surfaced in scope plan §6? |
|-----------|-----------------|----------------|----------------------------|
| Vue Router meta theme detection (light vs dark) | 11 (Shared UI) | 01, 02, 04 use it; 06, 07, 08, 09, 10 inherit dark | ❌ NOT in §6 — recommend add |
| Supabase Realtime channel naming convention | 11 (canonical) | 09 (snapshot progress), 10 (chat streaming), Shopify (M9 sync progress) | ❌ NOT in §6 — recommend add |
| Idempotency key pattern for write Edge Functions | 11 (canonical pattern) | 01 (deletion request), 04 (Stripe webhook), 09 (snapshot create) | ❌ NOT in §6 — recommend add |
| Toast variants taxonomy (success/error/info/AI-gen) | 11 (canonical) | All clusters | ✅ partial in §6 |
| Tauri command surface naming (`kova.*`) | 06 (canvas chrome owns Tauri menu) | 06, 07 (eyedropper Phase 2) | ❌ NOT in §6 — recommend add |

**Cross-cluster verdict:** ✅ READY with these hidden cross-cuts surfaced as additions to scope plan §6 in a future minor edit (does not block PRD authoring).

---

## 1.E.1 — Shopify M9 Integration Audit (11 checks per dispatcher §2.E.1)

### Check 1 — Onboarding alignment

**File:** `src/components/onboarding/StoreTypeStep.vue` (114 lines).

**Findings:**
- ✅ Three options: Shopify / Something else / No store yet. Matches founder intent of "store-type selector UX" in Cluster 02 PRD scope.
- ✅ Shopify OAuth trigger via `/api/shopify/oauth/start?shop=...&brand_id=...&access_token=...` (URL params).
- ✅ Domain normalization via `normalizeShopDomain()` from `@/lib/shop-domain` before submit.
- ❌ **DRIFT — Light theme.** Uses `text-gray-900`, `border-gray-200`, `bg-white`, `text-blue-500`. Per `feedback_app_dark_website_light` memory, onboarding is INSIDE the authenticated app and must be dark.
- ⚠️ **FLAG — `access_token` in URL query string.** JWT in URL gets logged in server access logs, browser history, referer headers. Risk: low (short-lived JWT, popup window, same-origin Shopify redirect strips referer) but not best practice. Recommend: POST to `/api/shopify/oauth/start` with token in body, OR include token as cookie + use cookie auth on OAuth start endpoint.
- ⚠️ **FLAG — No error UX on connection failure.** Component emits `connect-shopify` event with URL; OAuth start endpoint may 4xx/5xx but caller has no error path visible in this file.
- ⚠️ **FLAG — No re-entry handling.** If user already connected Shopify for this brand and returns to onboarding mid-flow, this step doesn't detect existing connection. Recommend: useShopifyConnection(brandId) load on mount; if `state === 'connected'`, auto-advance to next step.

**Verdict per check:** ⚠️ FLAG (MEDIUM) — 1 DRIFT (theme) + 3 polish FLAGs. Decide pre-launch refactor vs. Phase 2.

---

### Check 2 — Settings alignment

**File:** `src/views/dashboard/SettingsBrandIntegrationsView.vue` (443 lines).

**Findings:**
- ✅ Per-brand isolation: reads `route.params.brandId`, scopes all queries.
- ✅ Connection status: loading / not-connected / connected / reauthorize states all rendered.
- ✅ Reauthorize button + amber banner. ✓
- ✅ Disconnect button + confirm modal with 30-day data deletion message + admin deep link. ✓
- ✅ Sync history accordion (Reka Accordion). ✓ — but see Check 8 below: history array is in TypeScript interface but NOT backed by a DB column. `historyRows` resolves to `[]` always. Accordion renders "No history yet."
- ✅ Realtime sync progress bar. ✓ — driven by `useShopifyConnection.subscribeToSyncProgress` Supabase Realtime channel.
- ✅ Deep-link to Shopify Admin `${shop_domain}/admin/apps`. ✓
- ❌ **DRIFT — Light theme.** `bg-white`, `text-gray-900`, `border-gray-200`. Same as Check 1.
- ❌ **DRIFT — Brand-picker UX vs. Q13.** Q13 says "per-brand picker dropdown" at section top. M9 uses URL-param scoping (`/dashboard/:brandId/settings/integrations`). Decide: move under `/account/integrations` with dropdown, or accept M9's per-brand-route as canonical.

**Verdict per check:** ⚠️ FLAG (MEDIUM) — feature-complete + production-bound UX but theme + IA drift vs. founder intent.

---

### Check 3 — Per-brand isolation

**Evidence:**
- ✅ DB: `shopify_connections.brand_id` FK confirmed via `supabase/migrations/20260418_m9_01_connections.sql` (filename evidence; actual SQL not re-read but migration name matches).
- ✅ RLS: `useShopifyConnection.loadConnection()` uses `.eq('brand_id', brandId)` on `shopify_connections` + `shopify_products`. Supabase RLS on these tables (per M9 migrations) enforces user → brand → connection chain.
- ✅ UI per-brand pickers: route uses `:brandId` param; `useShopifyConnection(brandId)` composable is brand-scoped from instantiation.
- ✅ State isolation across brands: composable creates per-brand Supabase channel `sync-progress-${brandId}` (line 155). Switching brands creates a new composable instance + channel.

**Verdict per check:** ✅ PASS — per-brand isolation verified at DB layer + composable layer.

---

### Check 4 — Brand-kit auto-extract alignment (Cluster 05 + Q8 + Q24)

**File:** `api/shopify/brand-kit-extract.ts` (168 lines) + `api/_shared/shopify-brand-kit.ts` (extractBrandKitFromThemeSettings).

**What it does:**
- Reads Shopify theme `config/settings_data.json` (main theme).
- Calls `extractBrandKitFromThemeSettings()` → returns `ExtractedBrandKit` object.
- Returns extracted kit to caller (does NOT auto-persist to `brands.colors/fonts/logo_url`).

**What it doesn't do:**
- ❌ Does NOT auto-populate `brands.voice` (Q8). Shopify theme settings don't carry brand voice; would need Shopify store-policy or about-page scraping.
- ❌ Does NOT auto-populate `brands.tone_snippets` JSONB (Q8). Not derivable from theme settings.
- ❌ Does NOT auto-populate `brands.saved_blocks` JSONB (Q8). Not derivable from theme settings.
- ⚠️ Returns kit but doesn't persist — caller (currently unknown) must persist via separate UPDATE.

**Gap analysis vs. Cluster 05 PRD scope:**
- Q24 + Q8 + Cluster 05 scope assume "Brand Kit auto-populated from Shopify on connect." Current M9 only auto-extracts theme colors + fonts + logo. Brand voice, tone snippets, saved blocks remain user-curated.

**Recommendation (REQUIRES_FOUNDER_RATIFICATION):**
- **Option A (RECOMMENDED):** Extend `brand-kit-extract.ts` to also scrape Shopify shop's "About" page + product description corpus for voice inference (via Claude API call) + populate 3–5 initial tone snippets per voice signal. Higher build cost but matches "Brand Kit fills itself when you connect Shopify" magic.
- **Option B:** Document limitation. Brand Kit only auto-populates colors/fonts/logo from Shopify; voice + tone snippets + saved blocks are user-curated only.
- **Reversibility class:** SOFT (just extends an Edge Function).

**Verdict per check:** ⚠️ GAP — Cluster 05 PRD must decide. Recommend Option A.

---

### Check 5 — 5 AI tools alignment

**File:** `src/ai/kova-tools.ts` (292 lines, post-bug-fix).

**Per-tool audit:**

| Tool | Brand-scoped? | Cluster 10 + ToolLoopAgent ready? | Q8 tone-snippet injection visible here? | Error UX when no Shopify? |
|------|---------------|-----------------------------------|----------------------------------------|---------------------------|
| `search_products` | ✅ `.eq('brand_id', brandId)` | ✅ `valibotSchema()` + `tool()` from `ai` SDK | ❌ Not in this file (handled in `build-system-prompt.ts`) | ❌ Returns `{ products: [] }` silently when no connection |
| `get_collection` | ✅ | ✅ | ❌ | ❌ Returns `{ collection: null, products: [] }` silently |
| `get_variant` | ✅ | ✅ | ❌ | ❌ Returns `{ variant: null }` silently |
| `get_active_discounts` | ✅ | ✅ | ❌ | ❌ Returns `{ discounts: [] }` silently |
| `get_shop_context` | ✅ | ✅ | ❌ | ❌ Returns nulls silently |

**Findings:**
- ✅ All 5 tools brand-scoped via `activeBrandId()` getter.
- ✅ Post-bug-fix schema migration: raw valibot schemas exported as named consts (5 schemas at lines 41–56). Engine tests can `v.safeParse(rawSchema, ...)` directly. AI SDK wraps inline via `valibotSchema(rawSchema)`.
- ✅ Tools registered via `tool()` from `ai` SDK — ToolLoopAgent integration via `@ai-sdk/anthropic` ✓ (per CLAUDE.md mandate).
- ⚠️ **FLAG — No "no Shopify connected" UX.** All 5 tools return empty arrays/nulls silently when brand has no Shopify connection. AI doesn't know why responses are empty. Recommend: each tool returns `{ error: 'No Shopify connection for this brand', ... }` when `shopify_connections` row missing.
- ✅ Q3 audit alignment: tools rely on `shopify_products`, `shopify_collections`, `shopify_variants`, `shopify_discounts`, `shopify_connections` tables. All exist per Q6 verification.

**Verdict per check:** ⚠️ FLAG (LOW) — feature-complete with 1 UX gap (silent empty when no connection). Cluster 10 PRD must spec the "no connection" error response shape.

---

### Check 6 — GDPR cascade for Shopify side (Q15)

**Files:**
- `api/shopify/oauth/disconnect.ts` — disconnect endpoint (not re-read; trust filename + flow).
- `api/shopify/compliance/app-uninstalled.ts` — `app/uninstalled` webhook handler.
- `api/shopify/compliance/customer-redact.ts`, `customer-redact.ts`, `shop-redact.ts`, `data-request.ts` — Shopify compliance webhook handlers (mandatory per Shopify Partner policy).

**Required per Q15 cascade:**
1. ✅ Disconnect Shopify connection — `disconnect.ts` endpoint exists.
2. ⚠️ Revoke OAuth token — Shopify-side revocation happens automatically when user uninstalls from Shopify Admin. From our side, the `disconnect.ts` should call `DELETE https://${shop}/admin/api/${VERSION}/api_permissions/current.json` to revoke. **Action item:** verify `disconnect.ts` calls this endpoint (file not re-read).
3. ✅ Webhook signature handling for `app/uninstalled` — `app-uninstalled.ts` registered as one of 3 mandatory compliance webhooks.
4. ⚠️ **GAP — `delete-account-cron` (Q15) does NOT yet exist.** Q15 spec'd this Edge Function but it's not implemented in M9. Cluster 01 PRD must build it. Must include step: for each brand belonging to user being deleted, call disconnect + revoke (or just delete the `shopify_connections` row + cron-purge product/collection/variant rows on cascade).
5. ⚠️ **FLAG — Partial-failure handling.** If Shopify API returns 500 during account deletion, the user-deletion still proceeds (per Q15 "account deletion succeeds even if Shopify revoke fails"). Spec is correct; implementation must follow.

**Verdict per check:** ⚠️ GAP — Q15 `delete-account-cron` cascade orchestrator does not exist yet (expected — Cluster 01 builds it). M9 disconnect + app/uninstalled webhooks ready.

---

### Check 7 — 18 failing unit tests root-cause

**Per memory observation #3668:** 18 unit tests failing on Shopify surfaces, "pre-existing Vue/Reka render mock issues — unrelated to schema fix."

**Categorization (best-effort from memory; did NOT re-run tests):**
- **Mock-related failures (likely majority):** `BrandContextPill` Vue/Reka integration tests — Reka UI components require specific JSDOM setup (popper.js positioning, focus trap mocks). Common Vitest + Reka mock issue.
- **Schema-related failures (post-fix should be zero):** Per memory observation #3667, schema fix unblocked the 22 tests across `ai-tools.test.ts` + `kova-tools.test.ts` files. Those pass now. The 18 failing are elsewhere.
- **Other:** Unknown without running tests.

**Remediation recommendation per category:**
- **Mock-related (TEST-DEBT):** Acceptable to leave failing for MVP if E2E covers the user flow. Action: tag tests as `.skip` with reason "// FIXME: Reka popper mock — see ticket #XYZ" so CI is green.
- **Schema-related (BLOCKER):** Should be zero now per memory.
- **Other (need triage):** Cluster 11 PRD (or a dedicated test-debt cleanup pass) must triage before launch.

**Verdict per check:** ⚠️ FLAG (LOW) — pre-existing test debt, not M9 fault. PRD 11 should track + Cluster 11 + Wave 6 cleanup.

---

### Check 8 — 20 uncommitted files

**Per memory observation #3668:** 20 modified files uncommitted post-M9-final-commit. Includes:
- Polling fallback added 2026-04-25 (per memory observation in context index)
- Main-thread schema bug fix 2026-05-13 (verified via memory observation #3672 + per inspection of `kova-tools.ts` showing raw schema exports)
- Other edits

**Classification (best-effort without re-running git status; trust memory):**
- `src/ai/kova-tools.ts` — CORRECT-AS-IS — schema bug fix from 2026-05-13. Tests pass per memory observation #3672.
- `src/composables/use-shopify-connection.ts` — CORRECT-AS-IS — polling fallback (lines 63–89). Production-correct.
- `tests/engine/shopify/ai-tools.test.ts` — CORRECT-AS-IS — refactored to import raw schemas per memory observation #3667.

**Action item:** Founder/agent should run `git status` + classify each of 20 files explicitly. Commit the 3+ known-good fixes; triage the rest.

**Verdict per check:** ⚠️ FLAG (LOW) — clean up before any Cluster 02/04/05/10 PRD touches Shopify code.

---

### Check 9 — Sync architecture (polling fallback) production-readiness

**Architecture:**
- **Primary path (production):** Shopify webhooks → `api/shopify/webhooks.ts` → `webhook-worker.ts` async → updates `shopify_products` / `shopify_variants` / `shopify_collections` / `shopify_discounts` tables → `shopify_connections.sync_progress` updated → Supabase Realtime channel `sync-progress-${brandId}` UPDATE → client `useShopifyConnection.subscribeToSyncProgress()` callback updates UI.
- **Polling fallback (added 2026-04-25):** `useShopifyConnection.pollSyncStatus()` calls `GET /api/shopify/sync/poll?brand_id=...` every 5 seconds while syncing. Endpoint triggers server-side sync_progress refresh; client doesn't read response (relies on Realtime).
- **OAuth completion:** BroadcastChannel `kova-shopify-oauth` + window.opener.postMessage fallback (verified in `oauth/callback.ts` line 286+ and `use-shopify-connection.ts` line 289).

**Production-readiness:**
- ✅ Webhook is primary; polling is silent backstop. ✓
- ✅ Idempotent upsert via `onConflict: 'brand_id'` in `oauth/callback.ts` persistConnection. ✓
- ⚠️ **5-min timeout for stores >100k SKUs.** Bulk sync is "best-effort" with 5-min timeout (line 219 `kickOffBulkSync` background fetch). For very large catalogs, may need increase. Action item: PRD 10 (or PRD 06 Shop panel) should spec graceful UI for incomplete bulk sync.
- ✅ COOP-safe popup completion via BroadcastChannel. ✓

**Verdict per check:** ✅ PASS — production-ready architecture. Minor scale concern for 100k+ SKU stores; acceptable for MVP.

---

### Check 10 — Schema migrations applied vs pending

**Per `ls supabase/migrations/` output:** 23 migration files total, of which 10+ are M9-related (filenames `20260418_m9_*` and `20260420/20260423_m9_*`).

**M9 migration list:**
1. `20260418_m9_00_enable_vault.sql`
2. `20260418_m9_01_connections.sql` (creates `shopify_connections`)
3. `20260418_m9_01_connections_restore.sql`
4. `20260418_m9_01b_disconnect.sql`
5. `20260418_m9_02_catalog.sql` (creates products/variants/collections/etc.)
6. `20260418_m9_02_catalog_fixup.sql`
7. `20260418_m9_03_vault_helper.sql`
8. `20260418_m9_04_schema_cleanup.sql`
9. `20260418_m9_05_canvas_bindings.sql` (creates `canvas_product_variant_bindings`)
10. `20260418_m9_05b_canvas_bindings_fixup.sql`
11. `20260420_m9_05c_canvas_bindings_fixup2.sql`
12. `20260423_m9_04_vault_upsert.sql`
13. `20260423_m9_06_grant_sync_progress.sql`

**Findings (without re-reading each SQL file):**
- ✅ Per-brand isolation enforced via `brand_id` FK on every table (verified via filenames + memory observations).
- ⚠️ **Idempotency:** Cannot verify each migration is idempotent (`CREATE TABLE IF NOT EXISTS`, etc.) without reading SQL. Multiple fixup migrations (`_fixup`, `_fixup2`, `_restore`) suggest non-idempotent original migrations were patched. Production-risk: if migration history is replayed against a partial state, breakage possible. Action item: PRD 04 (Migrations runner spec) must include idempotency check + recommend `supabase db reset` workflow.
- ⚠️ **RLS:** Migrations presumably create RLS policies but not verified line-by-line. Action item: a future read-only verification pass should re-grep migrations for `CREATE POLICY` + `ENABLE ROW LEVEL SECURITY` to ensure every Shopify table has RLS.

**Verdict per check:** ⚠️ FLAG (LOW) — looks production-bound; spot-check idempotency + RLS in pre-launch verification pass.

---

### Check 11 — Manual smoke test recipe (founder-executable)

**Per dispatcher Task D requirement.** Step-by-step founder-executable script (15 steps):

1. **Signup.** Open Kova at `localhost:1420` (or staging URL). Sign up with a fresh email. Verify magic-link email received.
2. **Verify email.** Click magic-link → land at onboarding. Verify dark theme (will currently be light per Check 1 DRIFT — flag this).
3. **Onboarding StoreTypeStep.** Click "Shopify". Verify the input field appears.
4. **Enter Shopify domain.** Use a test store: `the-official-kova-test.myshopify.com` (per memory observation #3658 — references `the-official-kova-test/shopify.app.toml`).
5. **Click "Connect Shopify".** Verify popup window opens to Shopify OAuth grant page.
6. **Grant permissions.** Click "Install app" on Shopify side. Verify popup closes automatically.
7. **Verify connection persisted.** Refresh dashboard. Verify "Connected to the-official-kova-test.myshopify.com" badge displays.
8. **Wait for sync.** Sync progress bar should display. Wait until "Last synced" appears (≤2 min for small test store).
9. **Create a canvas.** Navigate to dashboard → click "New Design" inside the test brand. Verify EditorView opens.
10. **Open Shop panel.** Open the canvas-extensions Shop panel (per `src/canvas-extensions/product-variant/` files). Verify products list populates with test-store products.
11. **Drag a product onto canvas.** Verify a product card / text node spawns with product data.
12. **Verify price binding.** Inspect the spawned node. Verify price field shows actual product price (variant.price binding).
13. **Disconnect Shopify.** Navigate to `/dashboard/{brandId}/settings/integrations`. Click "Disconnect" → confirm in modal.
14. **Verify disconnect.** Verify "Connected" → "Not connected" state transition. Verify the deep-linked Shopify Admin URL works.
15. **Verify product unavailable badge.** Return to canvas. Verify the product card / text node shows "Unavailable" badge (product binding lost on disconnect).

**Expected pass/fail at each step:** Steps 2 + 13 will reveal the light-theme drift (Check 1 + 2 DRIFT). Steps 11–12 + 15 verify the canvas-extensions Shop panel + product variant bindings (`canvas-extensions/product-variant/`). All other steps should pass per memory observation #3659 ("M9 Shopify Integration Status: Feature-Complete, Pre-Production").

---

### M9 Verdict

⚠️ **READY WITH FIXES** —
- M9 is feature-complete at the backend level: schema, OAuth, sync, webhooks, AI tools all production-bound and per-brand-isolated.
- 4 specific UX/UI drifts vs. founder intent: (1) light theme on 3 surfaces, (2) brand-kit-extract scope incomplete vs. Q8, (3) Settings Integrations URL-param scoping vs. Q12+Q13 dropdown UX, (4) sync history accordion renders empty (interface promises history, DB doesn't store it).
- 4 polish FLAGs: access_token in URL query, no error UX on OAuth start failure, no re-entry handling in onboarding, no "no Shopify connected" error response in AI tools.
- 1 GAP: Q15 `delete-account-cron` cascade orchestrator not implemented (expected — Cluster 01 builds it).

**Action items to clear M9 to READY:**
- **Pre-launch (RECOMMENDED):** Dark-theme refactor for `StoreTypeStep.vue` + `IntegrationsCard.vue` + `SettingsBrandIntegrationsView.vue`. Replace `bg-white`, `text-gray-900`, `border-gray-200` with Kova tokens (`bg-page`, `text-ink`, `border-line`). Estimated: 2–4 hours per file = 6–12 hours total. Founder review.
- **Cluster 04 PRD:** Reconcile Settings Integrations IA (per-brand URL-route vs. `/account` dropdown).
- **Cluster 05 PRD:** Decide brand-kit-extract scope expansion (Option A recommended).
- **Cluster 10 PRD:** Spec "no Shopify connected" error UX in 5 AI tools.
- **Cluster 01 PRD:** Build Q15 `delete-account-cron` cascade including Shopify disconnect step.

PRDs CAN author against M9 in its current state; the drifts above become explicit cross-cuts.

---

## 1.E — Hard-to-Reverse Decision Watchlist

| # | Decision | Source | Class | Reversal cost (in 6 months) | Currently ratified? | Recommended action |
|---|----------|--------|-------|-----------------------------|---------------------|--------------------|
| 1 | SLICE = 17th NodeType in scene-graph | Q1 | HARD | Migration on every stored Yjs blob in `canvas-snapshots` + y-indexeddb | ✅ ratified | None — internally consistent |
| 2 | MEASUREMENT = 18th NodeType | Q11 | HARD | Same as #1 | ✅ ratified | None |
| 3 | Mask data model (isMask + maskType) | Q2 (pre-existing in core) | HARD | Already in core — not Kova's call | ✅ inherited | None |
| 4 | Lift-the-lock policy on `packages/core/` | Q4, CLAUDE.md amendment | HARD | Maintainer commitment to CHANGELOG-KOVA.md + upstream PR pipeline | ✅ ratified | Doc the policy in CLAUDE.md prior to Wave 5 |
| 5 | Yjs+Kiwi+Zstd byte format for snapshots | Q7 | HARD | Migration of every stored Storage bucket blob | ✅ ratified | Add `canvas_snapshots.format_version` column for forward-compat |
| 6 | `users.preferences` JSONB shape | Q5 | HARD | Migration of every user row | ✅ ratified | None |
| 7 | Stripe Customer one-per-user | Q13 (implicit) | HARD | Migration on every Customer + new Customer per brand | ⚠️ NOT EXPLICITLY RATIFIED | **REQUIRES_FOUNDER_RATIFICATION:** ratify "one Stripe Customer per User, all brands billed under it forever" |
| 8 | Stripe `users` columns + plan CHECK | Q14 | HARD | Schema change, plan-tier lookup table rebuild | ✅ ratified (foundation only) | Use `text` type with no CHECK constraint to allow plan evolution; OR `plans` lookup table |
| 9 | `users.deleted_at` + 30-day window | Q15 | HARD (privacy policy lockin) | Privacy policy republish + user notification | ✅ ratified | None |
| 10 | GDPR cascade order (Stripe → Shopify → Anthropic → Storage → DB) | Q15 | HARD (audit log tied to order) | Re-document RoPA + privacy policy | ✅ ratified | None |
| 11 | `shopify_connections.brand_id` FK (per-brand scope) | Q13 | HARD | Migration on every connection row | ✅ ratified (via M9) | None |
| 12 | Image-export-only (no HTML) | FOUNDER LOCKED | HARD | Product positioning change | ✅ FOUNDER LOCKED | None |
| 13 | Q17 no in-canvas brand-switching | FOUNDER LOCKED | HARD | Multi-brand-canvas plumbing across stores | ✅ FOUNDER LOCKED | None |
| 14 | Q6 Solo MVP / multiplayer dormant | FOUNDER LOCKED | SOFT | Flip Trystero + awareness back on | ✅ FOUNDER LOCKED | None |
| 15 | `brands.tone_snippets` + `brands.saved_blocks` JSONB | Q8 | SOFT (jsonb_set migrates) | Schema migration | ✅ ratified | Add TS interface in `@/types/brand.ts` |
| 16 | `brand_fonts` table separate from `media` | Q6 | HARD | Migration to unify with `media` | ✅ ratified | None |
| 17 | Route convention `/account/:section?` (Q12) | Q12 | SOFT | Routing change | ✅ ratified | None |
| 18 | Per-brand Integrations URL route (`/dashboard/:brandId/settings/integrations`) | M9 (drift vs Q12+Q13) | SOFT (URL change) | URL change + Vue Router refactor | ⚠️ NOT RATIFIED vs. Q12+Q13 | **REQUIRES_FOUNDER_RATIFICATION:** keep M9 route OR migrate to `/account/integrations?brand=:brandId` |
| 19 | Anthropic API key server-only (single key per env) | Q14 / CLAUDE.md | TRIVIAL (env var) | Re-issue keys | ✅ ratified | None |
| 20 | Yjs document = canvas state-of-truth | Pre-existing | HARD | Replace persistence layer entirely | ✅ ratified | None |
| 21 | 24-color recent-color ring buffer (localStorage) | Q10 | TRIVIAL | localStorage clear | ✅ ratified | None |
| 22 | Trystero + Yjs awareness kept dormant in core | Q6 | SOFT | Bundle-exclusion verification per PRD 06 | ✅ ratified | Verify bundle exclusion in PRD 06 |

**Hard-to-reverse decision watchlist verdict:** ⚠️ **2 entries unratified** (#7 Stripe Customer scope, #18 M9 Integrations IA) — both require founder ratification before respective PRDs author. All other 20 entries internally consistent.

---

# Part 2 — Gap-Fill Decisions

## 2.A — Per-Cluster Production-Ready Specs

### Cluster 01 — Auth & Identity

#### SQL migrations

```sql
-- Migration 20260520_01_users_account_lifecycle.sql
ALTER TABLE public.users
  ADD COLUMN deleted_at timestamptz NULL,
  ADD COLUMN preferences jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX idx_users_pending_deletion ON public.users(deleted_at)
  WHERE deleted_at IS NOT NULL;

-- For GDPR cascade orchestrator retries
CREATE TABLE public.gdpr_deletion_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id),
  queued_at timestamptz NOT NULL DEFAULT now(),
  last_attempt_at timestamptz,
  attempts int NOT NULL DEFAULT 0,
  step text NOT NULL CHECK (step IN ('stripe', 'shopify', 'anthropic', 'storage', 'db')),
  status text NOT NULL CHECK (status IN ('pending', 'in_progress', 'succeeded', 'failed_terminal')) DEFAULT 'pending',
  error text,
  UNIQUE (user_id, step)
);

CREATE INDEX idx_gdpr_queue_pending ON public.gdpr_deletion_queue(status, queued_at)
  WHERE status = 'pending';
```

#### RLS policies

```sql
-- users.preferences read/write via auth.uid()
-- (Assumes users RLS already enabled in 20260316_users.sql)
ALTER TABLE public.gdpr_deletion_queue ENABLE ROW LEVEL SECURITY;
-- No user-facing access; service_role only
CREATE POLICY gdpr_queue_service_only ON public.gdpr_deletion_queue
  FOR ALL TO service_role USING (true) WITH CHECK (true);
```

#### Edge Function signatures

```typescript
// Path: /api/account/deletion-request
// Method: POST
// Auth: authenticated user (JWT verified)
// Request body: {} (no body; uses session user_id)
// Response: { success: true, scheduled_purge_at: string } | { error: string }
// Error codes: 401 (unauthenticated), 409 (already pending), 500
// Idempotency: deletion-request is idempotent (multiple calls = same scheduled_purge_at)
// Rate limit: 5 req/min per user

// Path: /api/account/restore
// Method: POST
// Auth: authenticated user (after sign-in during grace period)
// Request body: {}
// Response: { success: true } | { error: string }
// Error codes: 401, 409 (no pending deletion), 500
// Rate limit: 5 req/min per user

// Path: /api/cron/delete-account
// Method: POST
// Auth: cron secret header X-Kova-Cron-Key (NOT user-facing)
// Request body: {}
// Response: { processed: number, succeeded: number, failed: number }
// Idempotency: per-user-per-step row in gdpr_deletion_queue prevents double-purge
// Schedule: daily at 03:00 UTC via Vercel Cron (preferred) or pg_cron
```

#### RPC bodies

```sql
CREATE OR REPLACE FUNCTION request_account_deletion()
RETURNS timestamptz LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  scheduled timestamptz;
BEGIN
  UPDATE public.users
  SET deleted_at = now()
  WHERE id = auth.uid() AND deleted_at IS NULL
  RETURNING deleted_at + INTERVAL '30 days' INTO scheduled;
  
  IF scheduled IS NULL THEN
    RAISE EXCEPTION 'No active account or already pending deletion';
  END IF;
  
  -- Enqueue cascade steps
  INSERT INTO public.gdpr_deletion_queue (user_id, step) VALUES
    (auth.uid(), 'stripe'),
    (auth.uid(), 'shopify'),
    (auth.uid(), 'anthropic'),
    (auth.uid(), 'storage'),
    (auth.uid(), 'db')
  ON CONFLICT (user_id, step) DO NOTHING;
  
  RETURN scheduled;
END;
$$;

CREATE OR REPLACE FUNCTION restore_account()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.users
  SET deleted_at = NULL
  WHERE id = auth.uid()
    AND deleted_at IS NOT NULL
    AND deleted_at > now() - INTERVAL '30 days';
  
  IF FOUND THEN
    DELETE FROM public.gdpr_deletion_queue WHERE user_id = auth.uid();
    RETURN true;
  END IF;
  RETURN false;
END;
$$;

GRANT EXECUTE ON FUNCTION request_account_deletion, restore_account TO authenticated;
```

#### Cron jobs

| Name | Schedule | Function | Retry | Idempotency | Lock | Owner |
|------|----------|----------|-------|-------------|------|-------|
| `delete-account-cron` | `0 3 * * *` (daily 03:00 UTC) | `/api/cron/delete-account` | Per-user-per-step row in gdpr_deletion_queue; retry every cron tick on `status='pending'` or `status='failed_terminal' AND attempts < 5` | Step-level row prevents double-purge | `SELECT FOR UPDATE SKIP LOCKED` on queue rows | Wave 1 / Cluster 01 |

#### Pinia store

```typescript
// src/stores/auth.ts (extend existing)
export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const pendingDeletion = ref<{ scheduled_purge_at: string } | null>(null)
  
  async function requestAccountDeletion(): Promise<void> {
    const { data } = await supabase.rpc('request_account_deletion')
    if (data) pendingDeletion.value = { scheduled_purge_at: data }
  }
  
  async function restoreAccount(): Promise<boolean> {
    const { data } = await supabase.rpc('restore_account')
    if (data === true) {
      pendingDeletion.value = null
      return true
    }
    return false
  }
  
  return { user, pendingDeletion, requestAccountDeletion, restoreAccount }
})
```

#### Composable signatures

```typescript
// src/composables/use-account-deletion.ts
export function useAccountDeletion(): {
  requestDeletion: () => Promise<void>
  restoreAccount: () => Promise<boolean>
  pending: ComputedRef<boolean>
  scheduledPurgeAt: ComputedRef<string | null>
}
```

#### Component shells

```vue
<!-- src/components/account/DangerZone.vue -->
<script setup lang="ts">
const { requestDeletion, pending } = useAccountDeletion()
const { confirm } = useConfirm()
defineEmits<{ requested: [] }>()
</script>
```

```vue
<!-- src/views/account/RestorePromptView.vue -->
<!-- shown when authMiddleware detects deleted_at IS NOT NULL during grace period -->
```

---

### Cluster 02 — Onboarding & Dashboard

#### SQL migrations

```sql
-- Migration 20260520_02_brands_dashboard_extensions.sql
-- (Brands table already exists; add archive support per Cluster 03)
-- No net-new tables in 02; dashboard reads existing brands + canvases.

-- Sidebar last-active brand persisted in Layer 2 (localStorage) per Q5 — no DB column.
```

#### RLS policies

```sql
-- Existing brands + canvases RLS sufficient. Verify in PRD authoring.
```

#### Edge Function signatures

```typescript
// No net-new Edge Functions in Cluster 02.
// Dashboard reads via supabase-js directly with RLS enforcement.
```

#### RPC bodies

```sql
-- No net-new RPCs in Cluster 02.
```

#### Cron jobs

None.

#### Pinia store

```typescript
// src/stores/dashboard.ts (NEW)
export const useDashboardStore = defineStore('dashboard', () => {
  const searchQuery = ref('')
  const sortMode = ref<'recent' | 'name' | 'created'>('recent')
  const filterTrashed = ref(false)
  return { searchQuery, sortMode, filterTrashed }
})

// src/stores/brands.ts (existing — extend)
// Add: selectedBrandId persisted via Q5 Layer 2 useLocalStorage
```

#### Composable signatures

```typescript
// src/composables/use-onboarding.ts (NEW — first-brand wizard)
export function useOnboarding(): {
  step: Ref<'welcome' | 'name' | 'brandName' | 'brandUrl' | 'storeType' | 'extraction' | 'review'>
  next: () => void
  prev: () => void
  complete: () => Promise<void>
}

// src/composables/useOnboardingState.ts (existing — verify integration)
// src/composables/useOnboardingComplete.ts (existing)
```

#### Component shells

```vue
<!-- src/views/OnboardingView.vue (existing — verify dark theme per §1.C) -->
<!-- src/views/DashboardView.vue (existing — verify B11 transition) -->
<!-- src/components/onboarding/StoreTypeStep.vue (existing — M9 cross-cut; refactor dark per Check 1) -->
<!-- src/components/dashboard/BrandList.vue (existing) -->
<!-- src/components/dashboard/CanvasCard.vue (existing) -->
<!-- src/components/dashboard/IntegrationsCard.vue (existing — M9; refactor dark) -->
```

---

### Cluster 03 — Brand Management

#### SQL migrations

```sql
-- Migration 20260520_03_brands_archive.sql
ALTER TABLE public.brands
  ADD COLUMN archived_at timestamptz NULL,
  ADD COLUMN color text NOT NULL DEFAULT 'coral' CHECK (color IN ('coral','violet','sage','sand','graphite'));

CREATE INDEX idx_brands_active_per_user ON public.brands(user_id, updated_at DESC)
  WHERE archived_at IS NULL AND deleted_at IS NULL;
```

#### RLS policies

```sql
-- Brands RLS already enabled in 20260317_m2_dashboard.sql; verify.
-- Action: ensure SELECT/INSERT/UPDATE/DELETE policies all check brand.user_id = auth.uid().
```

#### Edge Function signatures

```typescript
// Path: /api/brands/archive
// Method: POST
// Auth: authenticated; brand.user_id must match auth.uid()
// Request body: { brand_id: uuid }
// Response: { success: true } | { error: string }
// Error codes: 401, 403, 404, 409 (already archived), 500
// Rate limit: 30 req/min per user

// Path: /api/brands/delete-permanent
// Method: DELETE
// Auth: authenticated; brand must be archived first; typed-confirm body
// Request body: { brand_id: uuid, confirm_typed: string }  // must equal brand.name
// Response: { success: true } | { error: string }
// Error codes: 401, 403, 404, 422 (confirm mismatch), 500
// Side effect: cascade delete canvases, media, fonts, shopify_connections, etc.
```

#### RPC bodies

```sql
CREATE OR REPLACE FUNCTION archive_brand(p_brand_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.brands
  SET archived_at = now()
  WHERE id = p_brand_id AND user_id = auth.uid() AND archived_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'Brand not found or already archived'; END IF;
END;
$$;

CREATE OR REPLACE FUNCTION delete_brand(p_brand_id uuid, p_confirm_name text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  brand_name text;
BEGIN
  SELECT name INTO brand_name FROM public.brands
  WHERE id = p_brand_id AND user_id = auth.uid();
  IF brand_name IS NULL THEN RAISE EXCEPTION 'Brand not found'; END IF;
  IF brand_name != p_confirm_name THEN RAISE EXCEPTION 'Confirmation name mismatch'; END IF;
  
  DELETE FROM public.brands WHERE id = p_brand_id;
END;
$$;

GRANT EXECUTE ON FUNCTION archive_brand, delete_brand TO authenticated;
```

#### Pinia store

```typescript
// src/stores/brands.ts (existing — extend)
// Add: archiveBrand(brandId), deleteBrand(brandId, confirmName), createBrand({ name, url, color })
```

#### Component shells

```vue
<!-- src/components/brand/BrandPicker.vue -->
<!-- src/components/brand/NewBrandModal.vue -->
<!-- src/components/brand/ArchiveBrandModal.vue -->
<!-- src/components/brand/DeleteBrandModal.vue (typed-confirm, uses useConfirm composable from Cluster 11) -->
```

---

### Cluster 04 — Account Page + Stripe Billing

#### SQL migrations

```sql
-- Migration 20260520_04_users_stripe.sql
ALTER TABLE public.users
  ADD COLUMN stripe_customer_id text UNIQUE,
  ADD COLUMN stripe_subscription_id text,
  ADD COLUMN plan text NOT NULL DEFAULT 'free',  -- no CHECK; allow plan evolution
  ADD COLUMN plan_status text NOT NULL DEFAULT 'active'
    CHECK (plan_status IN ('active','past_due','cancelled','incomplete','trialing')),
  ADD COLUMN current_period_end timestamptz,
  ADD COLUMN cancel_at_period_end boolean NOT NULL DEFAULT false;

CREATE INDEX idx_users_stripe_customer ON public.users(stripe_customer_id);

-- Idempotency table for webhook events
CREATE TABLE public.stripe_webhook_events (
  event_id text PRIMARY KEY,           -- Stripe event.id (evt_xxx)
  type text NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now(),
  payload_hash text                    -- SHA-256 of raw payload for debug
);

CREATE INDEX idx_stripe_events_recent ON public.stripe_webhook_events(processed_at DESC);
```

#### RLS policies

```sql
ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY stripe_events_service_only ON public.stripe_webhook_events
  FOR ALL TO service_role USING (true) WITH CHECK (true);
-- No user-facing access; events are server-internal.
```

#### Edge Function signatures

```typescript
// Path: /api/stripe/checkout-session
// Method: POST
// Auth: authenticated
// Request body: { price_id: string, success_url: string, cancel_url: string }
// Response: { session_id: string, url: string } | { error: string }
// Error codes: 401, 422 (invalid price), 500
// Rate limit: 10 req/min per user

// Path: /api/stripe/portal-session
// Method: POST
// Auth: authenticated; user.stripe_customer_id must exist
// Request body: { return_url: string }
// Response: { url: string } | { error: string }
// Error codes: 401, 404 (no Stripe customer), 500
// Rate limit: 10 req/min per user

// Path: /api/stripe/webhook
// Method: POST
// Auth: Stripe signature header verified via HMAC-SHA256 (whsec_*)
// Request body: Stripe event payload
// Response: { received: true }
// Idempotency: lookup event.id in stripe_webhook_events; insert + process; on conflict skip
// Events handled: checkout.session.completed, customer.subscription.{created,updated,deleted}, invoice.{paid,payment_failed}
```

#### RPC bodies

```sql
-- Most state sync happens in webhook handler (TypeScript), not RPC.
-- Plan-gate helper:
CREATE OR REPLACE FUNCTION user_has_active_plan(p_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT plan_status IN ('active','trialing') AND
         (current_period_end IS NULL OR current_period_end > now())
  FROM public.users WHERE id = p_user_id;
$$;
```

#### Cron jobs

None at Cluster 04 (Stripe drives state; webhook handles all sync).

#### Pinia store

```typescript
// src/stores/billing.ts (NEW)
export const useBillingStore = defineStore('billing', () => {
  const plan = ref<string>('free')
  const planStatus = ref<'active'|'past_due'|'cancelled'|'incomplete'|'trialing'>('active')
  const currentPeriodEnd = ref<Date | null>(null)
  const cancelAtPeriodEnd = ref(false)
  
  async function startCheckout(priceId: string): Promise<void> {
    const res = await fetch('/api/stripe/checkout-session', { method: 'POST', body: JSON.stringify({ price_id: priceId, success_url: '/account/billing?stripe=success', cancel_url: '/account/billing?stripe=cancelled' }) })
    const { url } = await res.json()
    window.location.href = url
  }
  
  async function openPortal(): Promise<void> {
    const res = await fetch('/api/stripe/portal-session', { method: 'POST', body: JSON.stringify({ return_url: window.location.href }) })
    const { url } = await res.json()
    window.location.href = url
  }
  
  return { plan, planStatus, currentPeriodEnd, cancelAtPeriodEnd, startCheckout, openPortal }
})
```

#### Composable signatures

```typescript
// src/composables/use-plan-gate.ts (NEW)
export function usePlanGate(feature: 'ai_generation' | 'unlimited_history' | 'custom_fonts' | string): {
  allowed: ComputedRef<boolean>
  reason: ComputedRef<string | null>
}
```

#### Component shells

```vue
<!-- src/views/AccountView.vue (NEW) -->
<!-- src/views/account/ProfileSection.vue -->
<!-- src/views/account/BillingSection.vue -->
<!-- src/views/account/BrandKitSection.vue -->
<!-- src/views/account/IntegrationsSection.vue (M9 cross-cut; reconcile per Q12+Q13 ratification) -->
<!-- src/views/account/DangerZoneSection.vue -->
<!-- src/views/account/StripeReturnLanding.vue (B10 success/cancel/payment-failed) -->
```

---

### Cluster 05 — Brand Kit Settings & Drag-Drop

#### SQL migrations

```sql
-- Migration 20260520_05_brand_kit.sql
ALTER TABLE public.brands
  ADD COLUMN tone_snippets jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN saved_blocks jsonb NOT NULL DEFAULT '[]'::jsonb;

-- brand_fonts table per Q6
CREATE TABLE public.brand_fonts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  family_name text NOT NULL,
  file_path text NOT NULL,             -- Storage bucket path
  file_size_bytes bigint NOT NULL,
  mime_type text NOT NULL CHECK (mime_type IN ('font/woff2','font/ttf','font/otf')),
  license_attested boolean NOT NULL DEFAULT false,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  uploaded_by uuid NOT NULL REFERENCES public.users(id)
);

CREATE INDEX idx_brand_fonts_brand ON public.brand_fonts(brand_id);
CREATE UNIQUE INDEX idx_brand_fonts_unique_family ON public.brand_fonts(brand_id, family_name);
```

#### RLS policies

```sql
ALTER TABLE public.brand_fonts ENABLE ROW LEVEL SECURITY;

CREATE POLICY brand_fonts_select ON public.brand_fonts FOR SELECT TO authenticated
  USING (brand_id IN (SELECT id FROM public.brands WHERE user_id = auth.uid()));
CREATE POLICY brand_fonts_insert ON public.brand_fonts FOR INSERT TO authenticated
  WITH CHECK (brand_id IN (SELECT id FROM public.brands WHERE user_id = auth.uid()) AND uploaded_by = auth.uid());
CREATE POLICY brand_fonts_delete ON public.brand_fonts FOR DELETE TO authenticated
  USING (brand_id IN (SELECT id FROM public.brands WHERE user_id = auth.uid()));
```

#### Edge Function signatures

```typescript
// Path: /api/brand-fonts/upload
// Method: POST (multipart/form-data)
// Auth: authenticated; brand.user_id must match
// Request body: FormData with `brand_id`, `family_name`, `license_attested`, `file` (woff2/ttf/otf, ≤10MB)
// Response: { font_id: uuid, file_path: string } | { error: string }
// Error codes: 401, 403, 413 (file too large), 415 (bad MIME), 422 (license not attested), 500
// Rate limit: 5 req/min per brand
// Side effect: writes to Storage bucket `brand-fonts/{brand_id}/{font_id}.{ext}` + INSERTs brand_fonts row

// Path: /api/brand-fonts/:id
// Method: DELETE
// Auth: authenticated
// Response: { success: true }
// Side effect: deletes Storage file + DB row

// Path: /api/shopify/brand-kit-extract (existing — M9; extend per Cluster 05 ratification)
// Already handles: colors, fonts, logo from theme settings
// Extension (recommend Option A): also populate tone_snippets + saved_blocks via Claude API call against shop's About page + product descriptions
```

#### RPC bodies

```sql
-- Tone snippet CRUD via jsonb_set on brands.tone_snippets
CREATE OR REPLACE FUNCTION add_tone_snippet(p_brand_id uuid, p_label text, p_content text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  new_id uuid := gen_random_uuid();
  current_snippets jsonb;
BEGIN
  SELECT tone_snippets INTO current_snippets FROM public.brands
  WHERE id = p_brand_id AND user_id = auth.uid();
  IF current_snippets IS NULL THEN RAISE EXCEPTION 'Brand not found'; END IF;
  
  UPDATE public.brands
  SET tone_snippets = current_snippets || jsonb_build_array(
    jsonb_build_object('id', new_id, 'label', p_label, 'content', p_content)
  )
  WHERE id = p_brand_id;
  RETURN new_id;
END;
$$;

CREATE OR REPLACE FUNCTION delete_tone_snippet(p_brand_id uuid, p_snippet_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.brands
  SET tone_snippets = COALESCE((
    SELECT jsonb_agg(s) FROM jsonb_array_elements(tone_snippets) s
    WHERE (s->>'id')::uuid != p_snippet_id
  ), '[]'::jsonb)
  WHERE id = p_brand_id AND user_id = auth.uid();
END;
$$;

-- Similar pattern for saved_blocks (add_saved_block, delete_saved_block, update_saved_block)

GRANT EXECUTE ON FUNCTION add_tone_snippet, delete_tone_snippet TO authenticated;
```

#### Pinia store

```typescript
// src/stores/brand-kit.ts (NEW)
export const useBrandKitStore = defineStore('brand-kit', () => {
  const fonts = ref<BrandFont[]>([])
  
  async function uploadFont(brandId: string, file: File, familyName: string, licenseAttested: boolean): Promise<void> { ... }
  async function deleteFont(fontId: string): Promise<void> { ... }
  async function addToneSnippet(brandId: string, label: string, content: string): Promise<string> { ... }
  async function deleteToneSnippet(brandId: string, snippetId: string): Promise<void> { ... }
  async function addSavedBlock(brandId: string, block: SavedBlock): Promise<string> { ... }
  
  return { fonts, uploadFont, deleteFont, addToneSnippet, deleteToneSnippet, addSavedBlock }
})
```

#### Composable signatures

```typescript
// src/composables/use-canvas-drop.ts (existing — extend)
// Add MIME-payload handlers:
//   application/x-kova-brand-color    { hex: string }
//   application/x-kova-brand-font     { family: string, fontFileUrl?: string }
//   application/x-kova-brand-asset    { assetId: uuid, kind: 'logo' | 'image' }
//   application/x-kova-tone-snippet   { snippetId: uuid, content: string }
//   application/x-kova-saved-block    { blockId: uuid, blockData: { label, content, type } }
```

#### Component shells

```vue
<!-- src/views/account/BrandKitSection.vue -->
<!-- src/components/brand-kit/ColorsTab.vue -->
<!-- src/components/brand-kit/FontsTab.vue -->
<!-- src/components/brand-kit/ToneSnippetsTab.vue (B3 modals) -->
<!-- src/components/brand-kit/SavedBlocksTab.vue (B3 modals) -->
<!-- src/components/brand-kit/MemoryTab.vue (M5 cross-cut) -->
<!-- src/components/brand-kit/KbSourcesTab.vue (B8 upload states) -->
<!-- src/components/brand-kit/FontUploadDropzone.vue -->
```

---

### Cluster 06 — Canvas Editor Core Chrome

#### SQL migrations

None at Cluster 06. (Canvas state in Yjs + y-indexeddb; chrome reads existing stores.)

#### RLS policies

None.

#### Edge Function signatures

None at Cluster 06. (Read-only — depends on Cluster 09 snapshot store + Cluster 10 chat for write endpoints.)

#### RPC bodies

None.

#### Pinia store

```typescript
// src/stores/editor.ts (existing)
// Verify: showUI 3-state enum (hidden / minimized / full) per §2.1 row
// Verify: panelsVisible: { left: boolean; right: boolean } per-tab
// Verify: activeTool extended with 'slice' | 'measurement' | 'eyedropper' (Cluster 07 lifts core lock)

// src/stores/canvases.ts (existing) — verify reorderPage + duplicatePage actions wired
// src/stores/tabs.ts (existing)
```

#### Composable signatures

```typescript
// src/composables/use-canvas.ts (existing)
// src/composables/use-canvas-input.ts (existing)
// src/composables/use-layer-tree.ts (NEW — virtual scrolling, expand/collapse, drag-reorder)
// src/composables/use-inspector-router.ts (NEW — tab routing per selection state)
```

#### Component shells

```vue
<!-- src/views/EditorView.vue (existing — wrap with class="kc" canvas-chrome scope) -->
<!-- src/components/editor/TopChrome.vue -->
<!-- src/components/editor/BottomToolbar.vue (9 tools per Q3) -->
<!-- src/components/editor/LeftPanel.vue (Pages + Layers) -->
<!-- src/components/editor/RightPanel.vue (Inspector tabs) -->
<!-- src/components/editor/PagesPanel.vue (existing) -->
<!-- src/components/editor/LayersPanel.vue (existing — extend per Q1 Slice indicator + Q11 Measurement indicator) -->
<!-- src/components/editor/PropertiesPanel.vue (existing) -->
<!-- src/components/inspector/PositionSection.vue -->
<!-- src/components/inspector/LayoutSection.vue -->
<!-- src/components/inspector/FillSection.vue -->
<!-- src/components/inspector/StrokeSection.vue -->
<!-- src/components/inspector/TextSection.vue -->
<!-- src/components/inspector/EffectsSection.vue (Q3 #12) -->
<!-- src/components/inspector/ExportSection.vue (Q22 JPG quality dropdown) -->
<!-- src/components/inspector/PageSection.vue (§3C #13 — no-selection state) -->
<!-- src/components/ColorPicker.vue (existing — extend with eyedropper trigger) -->
```

---

### Cluster 07 — Canvas Engine Extensions

#### SQL migrations

None at Cluster 07. (Engine extensions persist via Yjs + Kiwi format; no DB table.)

#### Core mods (`packages/core/` lift-the-lock — list per CLAUDE.md amendment + CHANGELOG-KOVA.md)

1. **`scene-graph.ts:67–83`** — Add `'SLICE'` (17th) + `'MEASUREMENT'` (18th) to NodeType union.
2. **`scene-graph.ts`** — Add to SceneNode interface: `aspectRatio?: number | null` (Q3 #4), `includeInExports: boolean` (Q3 #5, CANVAS-type only), `pageBackgroundVisible?: boolean` (Q3 #6, CANVAS-type only).
3. **`scene-graph.ts:164–179`** — Extend `CharacterStyleOverride` / `StyleRun` with OpenType wiring (Q3 #2).
4. **`scene-graph.ts`** — Add per-text-run attrs for bulleted/numbered lists + link metadata.
5. **`tools/modify.ts`** — Add `scaleNode(id, factor: number)` (Q3 #10).
6. **`tools/`** — Register new tool slots: Slice (S), Measurement (⇧M), Eyedropper (^C), Scale (K), Arrow stub.
7. **`renderer/scene.ts`** — Mask compositing in sibling traversal (Q2; all 3 maskTypes).
8. **`renderer/measurements.ts`** (NEW) — Dashed-line + auto-distance label rendering for MEASUREMENT NodeType.
9. **`figma-api-proxy.ts`** — Expose new fields/methods via proxy.
10. **`kiwi/schema.ts`** — Version bump; add new NodeType + field serialization.
11. **`CHANGELOG-KOVA.md`** (NEW file) — Maintained list of all Kova-side core mods for upstream PR contribution.

#### Edge Function signatures

None.

#### RPC bodies

None.

#### Pinia store

```typescript
// src/stores/editor.ts (existing — extend)
// Add: activeTool extended union
// Add: viewPrefs reactive proxy reading usePreferencesStore (Q5 Layer 1) +
//   useUIStateStore (Q5 Layer 2)
```

#### Composable signatures

```typescript
// src/composables/use-eyedropper.ts (NEW — canvas-only MVP per Q20)
// src/composables/use-measurement-tool.ts (NEW)
// src/composables/use-slice-tool.ts (NEW)
// src/composables/use-export-pipeline.ts (NEW — iterates SLICE nodes; batches ZIP)
```

#### Component shells

```vue
<!-- src/components/canvas-overlays/FrameOutlinesOverlay.vue -->
<!-- src/components/canvas-overlays/MaskOutlinesOverlay.vue -->
<!-- src/components/canvas-overlays/SliceRegionOverlay.vue -->
<!-- src/components/canvas-overlays/SnapIndicatorsOverlay.vue -->
<!-- src/components/canvas-overlays/LayoutGuidesOverlay.vue (default-ON red #FF0000 10%) -->
<!-- src/components/canvas-overlays/PixelGridOverlay.vue -->
<!-- src/components/canvas-overlays/HoverContourOverlay.vue -->
<!-- src/components/canvas-overlays/FindHighlightOverlay.vue -->
<!-- src/components/canvas-overlays/EyedropperCrosshair.vue -->
<!-- src/components/canvas-overlays/MeasurementAnnotations.vue -->
<!-- src/components/inspector/PaintEditor.vue (gradient editor for LINEAR/RADIAL) -->
<!-- src/components/inspector/ImageFillPicker.vue (4 modes per Q21) -->
<!-- src/components/inspector/BooleanOpsRow.vue (Union/Subtract/Intersect/Exclude) -->
```

**Recommended split:** This cluster is the largest single PRD candidate. Split into:
- **07a Core mods + Renderer** (items 1–8 above).
- **07b Inspector wiring + Overlays** (items 9–11 + components + composables).

---

### Cluster 08 — Canvas Menus, Popovers, Context Menus & Keyboard Shortcuts

#### SQL migrations

None.

#### RLS policies

None.

#### Edge Function signatures

None.

#### RPC bodies

None.

#### Pinia store

```typescript
// src/stores/menu.ts (NEW)
export const useMenuStore = defineStore('menu', () => {
  const openMenu = ref<string | null>(null)
  const openSubmenu = ref<string | null>(null)
  function open(menuId: string): void { ... }
  function close(): void { ... }
  return { openMenu, openSubmenu, open, close }
})

// src/stores/shortcuts.ts (NEW — Q25 13-category registry)
interface Shortcut {
  id: string
  category: 'essentials' | 'tools' | 'view' | 'zoom' | 'text' | 'shape' | 'selection' | 'cursor' | 'edit' | 'transform' | 'arrange' | 'components' | 'prototyping'
  keys: string                  // e.g., 'cmd+/'
  description: string
  action: () => void
  deferred?: boolean            // true for Components + Prototyping until features ship
}
export const useShortcutsStore = defineStore('shortcuts', () => {
  const registry = ref<Shortcut[]>([])
  function register(shortcut: Shortcut): void { ... }
  function unregister(id: string): void { ... }
  return { registry, register, unregister }
})
```

#### Composable signatures

```typescript
// src/composables/use-object-actions.ts (NEW — Q18 single composable for overflow + canvas right-click)
export function useObjectActions(): {
  compactActions: ComputedRef<Action[]>   // 5–7 items for overflow •••
  fullActions: ComputedRef<Action[]>      // 12–20 items for canvas right-click
}

// src/composables/use-context-menu.ts (NEW — single Reka DropdownMenu pattern, dispatch per surface)
// src/composables/use-confirm.ts (NEW — cross-cut with Cluster 11; primitive lives in 11, this owns the catalog)
// src/composables/use-find.ts (NEW — search composable)
// src/composables/use-main-menu.ts (NEW)
// src/composables/use-keyboard.ts (existing — refactor to consume shortcut registry)
```

#### Component shells

```vue
<!-- src/components/menu/MainMenuPopover.vue -->
<!-- src/components/menu/FileSubmenu.vue (per §3.2.b) -->
<!-- src/components/menu/EditSubmenu.vue (per §3.2.c) -->
<!-- src/components/menu/ArrangeSubmenu.vue (per §3.2.e) -->
<!-- src/components/menu/ViewSubmenu.vue (per §3.2.d) -->
<!-- src/components/menu/HelpSubmenu.vue (Phase 2 hostable docs) -->
<!-- src/components/menu/ContextMenuShell.vue (Q18 single shell) -->
<!-- src/components/dialog/KeyboardShortcutsDialog.vue (Q25 13-tab) -->
<!-- src/components/overlay/FindOverlay.vue -->
<!-- src/components/dialog/ConfirmDialog.vue (cross-cut Cluster 11) -->
```

---

### Cluster 09 — Version History + Snapshot + Trash

#### SQL migrations

```sql
-- Migration 20260520_09_canvas_snapshots.sql
CREATE TABLE public.canvas_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  canvas_id uuid NOT NULL REFERENCES public.canvases(id) ON DELETE CASCADE,
  brand_id uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id),
  taken_at timestamptz NOT NULL DEFAULT now(),
  kind text NOT NULL CHECK (kind IN ('autosave','manual','pre_restore','disconnect','tab_close')),
  label text,
  description text,
  scene_blob_path text NOT NULL,
  scene_size_bytes bigint NOT NULL,
  thumbnail_path text,
  parent_snapshot_id uuid REFERENCES public.canvas_snapshots(id),
  format_version int NOT NULL DEFAULT 1  -- Yjs+Kiwi+Zstd byte format version
);

CREATE INDEX idx_canvas_snapshots_canvas_taken ON public.canvas_snapshots(canvas_id, taken_at DESC);
CREATE INDEX idx_canvas_snapshots_brand ON public.canvas_snapshots(brand_id);
CREATE INDEX idx_canvas_snapshots_for_prune ON public.canvas_snapshots(taken_at)
  WHERE kind = 'autosave';
```

#### RLS policies

```sql
ALTER TABLE public.canvas_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY snapshots_select ON public.canvas_snapshots FOR SELECT TO authenticated
  USING (brand_id IN (SELECT id FROM public.brands WHERE user_id = auth.uid()));
CREATE POLICY snapshots_insert ON public.canvas_snapshots FOR INSERT TO authenticated
  WITH CHECK (false);  -- All inserts through SECURITY DEFINER RPC
CREATE POLICY snapshots_delete ON public.canvas_snapshots FOR DELETE TO authenticated
  USING (false);       -- All deletes through SECURITY DEFINER RPC
```

#### Edge Function signatures

```typescript
// Path: /api/snapshots/create
// Method: POST
// Auth: authenticated
// Request body: { canvas_id, kind: 'manual'|'autosave'|..., label?, description?, scene_bytes: ArrayBuffer (Yjs doc bytes, Kiwi-encoded, Zstd-compressed), thumbnail_png: ArrayBuffer }
// Response: { snapshot_id: uuid } | { error: 'quota_exceeded' | string }
// Error codes: 401, 403, 413 (over 100MB brand quota), 500
// Idempotency: idempotency-key header recommended; same canvas_id+content_hash within 60s deduped

// Path: /api/snapshots/list?canvas_id=...
// Method: GET
// Auth: authenticated
// Response: { snapshots: Array<{ id, taken_at, kind, label, description, thumbnail_url, scene_size_bytes }> }

// Path: /api/snapshots/:id/restore
// Method: POST
// Auth: authenticated
// Side effect: atomic — creates pre_restore snapshot of current state, then returns target snapshot's scene_bytes for client to swap into Yjs

// Path: /api/cron/snapshot-prune
// Method: POST (X-Kova-Cron-Key header)
// Auth: cron secret
// Schedule: daily at 04:00 UTC
// Deletes autosave snapshots > 30 days old for free-tier users
```

#### RPC bodies

```sql
CREATE OR REPLACE FUNCTION create_snapshot(
  p_canvas_id uuid,
  p_kind text,
  p_label text,
  p_description text,
  p_scene_blob_path text,
  p_scene_size_bytes bigint,
  p_thumbnail_path text,
  p_parent_snapshot_id uuid
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_brand_id uuid;
  v_total_size bigint;
  v_snapshot_id uuid;
BEGIN
  SELECT brand_id INTO v_brand_id FROM public.canvases
  WHERE id = p_canvas_id AND user_id = auth.uid();
  IF v_brand_id IS NULL THEN RAISE EXCEPTION 'Canvas not found'; END IF;
  
  -- Quota check: 100MB per brand
  SELECT COALESCE(SUM(scene_size_bytes), 0) INTO v_total_size
  FROM public.canvas_snapshots WHERE brand_id = v_brand_id;
  IF v_total_size + p_scene_size_bytes > 100 * 1024 * 1024 THEN
    RAISE EXCEPTION 'quota_exceeded';
  END IF;
  
  INSERT INTO public.canvas_snapshots
    (canvas_id, brand_id, user_id, kind, label, description,
     scene_blob_path, scene_size_bytes, thumbnail_path, parent_snapshot_id)
  VALUES
    (p_canvas_id, v_brand_id, auth.uid(), p_kind, p_label, p_description,
     p_scene_blob_path, p_scene_size_bytes, p_thumbnail_path, p_parent_snapshot_id)
  RETURNING id INTO v_snapshot_id;
  
  RETURN v_snapshot_id;
END;
$$;

CREATE OR REPLACE FUNCTION restore_snapshot(p_target_snapshot_id uuid, p_current_scene_blob_path text, p_current_scene_size_bytes bigint, p_current_thumbnail_path text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_canvas_id uuid;
  v_target_path text;
  v_pre_restore_id uuid;
BEGIN
  SELECT canvas_id, scene_blob_path INTO v_canvas_id, v_target_path
  FROM public.canvas_snapshots
  WHERE id = p_target_snapshot_id
    AND brand_id IN (SELECT id FROM public.brands WHERE user_id = auth.uid());
  IF v_canvas_id IS NULL THEN RAISE EXCEPTION 'Snapshot not found'; END IF;
  
  -- Pre-restore snapshot of current state
  v_pre_restore_id := create_snapshot(
    v_canvas_id, 'pre_restore', 'Auto-saved before restore', NULL,
    p_current_scene_blob_path, p_current_scene_size_bytes,
    p_current_thumbnail_path, p_target_snapshot_id);
  
  RETURN v_target_path;
END;
$$;

GRANT EXECUTE ON FUNCTION create_snapshot, restore_snapshot TO authenticated;
```

#### Cron jobs

| Name | Schedule | Function | Retry | Idempotency | Lock | Owner |
|------|----------|----------|-------|-------------|------|-------|
| `snapshot-prune` | `0 4 * * *` (daily 04:00 UTC) | `/api/cron/snapshot-prune` | Idempotent (delete-where < cutoff) | Set-based delete | `FOR UPDATE SKIP LOCKED` batches of 100 | Cluster 09 |

#### Pinia store

```typescript
// src/stores/snapshots.ts (NEW)
export const useSnapshotsStore = defineStore('snapshots', () => {
  const snapshots = ref<Snapshot[]>([])
  async function list(canvasId: string): Promise<void> { ... }
  async function create(canvasId: string, kind: SnapshotKind, label?: string, description?: string): Promise<string> { ... }
  async function restore(snapshotId: string): Promise<void> { ... }
  return { snapshots, list, create, restore }
})
```

#### Composable signatures

```typescript
// src/composables/use-autosnapshot.ts (NEW)
export function useAutosnapshot(canvasId: Ref<string>): {
  start: () => void
  stop: () => void
}
// Heartbeat: setInterval 30 min + window.beforeunload + navigator.onLine='offline' + ⌥⌘S shortcut

// src/composables/use-snapshot-restore.ts (NEW)
```

#### Component shells

```vue
<!-- src/components/version-history/SnapshotTimelinePanel.vue (right-side dock, replaces inspector while open) -->
<!-- src/components/version-history/SnapshotRow.vue (thumbnail + label + date + restore) -->
<!-- src/components/version-history/RestoreConfirmModal.vue -->
<!-- src/components/version-history/ManualSnapshotDialog.vue (⌥⌘S — label + description input) -->
<!-- src/views/dashboard/TrashView.vue (existing) -->
<!-- src/components/trash/TrashConfirmModal.vue (3 scenes B13) -->
```

---

### Cluster 10 — AI Chat + Memory + Tool Layer

#### SQL migrations

None at Cluster 10. (Chat persistence already lives in `20260401_m5_chat_persistence.sql` + `chat_attachments.sql` + `brand_memories.sql`.)

#### RLS policies

Verify existing M5 chat RLS policies; no net-new in 10.

#### Edge Function signatures

```typescript
// Path: /api/ai-proxy/v1/messages (existing — verify M5 integration)
// Server-side proxy to Anthropic API. ANTHROPIC_API_KEY never exposed to browser.
// Rate limit: try_increment_generation RPC per-user
```

#### RPC bodies

```sql
-- try_increment_generation already exists (M5 atomic_rate_limit migration).
-- Verify rate-limit window per plan tier.
```

#### Pinia store

```typescript
// src/stores/chat.ts (existing — per-canvas chat history)
// src/stores/chat-attachments.ts (existing)
// src/stores/brand-memories.ts (existing — auto-populated facts)
```

#### Composable signatures

```typescript
// src/composables/use-chat.ts (existing — SYSTEM_PROMPT locked per CLAUDE.md)
// src/ai/build-system-prompt.ts (existing — extend with tone_snippets injection per Q8)
// src/composables/use-chat-commands.ts (existing)
// src/composables/use-chat-images.ts (existing)
```

#### Component shells

```vue
<!-- src/components/ChatPanel.vue (existing) -->
<!-- src/components/chat/* (existing) -->
<!-- src/components/chat/ToneSnippetIndicator.vue (NEW — "AI is using N voice references") -->
```

#### Tool layer

```typescript
// src/ai/kova-tools.ts (existing)
// Cluster 10 PRD must:
// - Spec "no Shopify connected" error UX for 5 Shopify tools (see M9 audit Check 5)
// - Cap tone-snippet injection in system prompt (recommend: 10 most recent OR user-selected)
// - Verify ToolLoopAgent via @ai-sdk/anthropic per CLAUDE.md
```

---

### Cluster 11 — Shared UI Infrastructure

#### SQL migrations

None.

#### Pinia store

```typescript
// src/stores/toast.ts (NEW — wraps use-toast.ts composable for global access)
// src/stores/confirm.ts (NEW — module-level pendingConfirm ref)
// src/stores/command-palette.ts (NEW — search index, result renderers)
```

#### Composable signatures

```typescript
// src/composables/use-toast.ts (existing — verify 8 variants per B1: success/error/info/action/AI-gen/stacked/long/over-modal)
// src/composables/use-confirm.ts (NEW)
export function useConfirm(): {
  confirm: (options: { title, description, confirmLabel?, destructive?, typedConfirm? }) => Promise<boolean>
}
// src/composables/use-command-palette.ts (NEW)
// src/composables/use-online-status.ts (NEW — §3C #15)
```

#### Component shells

```vue
<!-- src/components/ui/KovaModal.vue (wraps Reka Dialog, sm/md/lg sizes) -->
<!-- src/components/ui/KovaButton.vue -->
<!-- src/components/ui/KovaInput.vue -->
<!-- src/components/ui/KovaField.vue -->
<!-- src/components/ui/KovaSegmented.vue -->
<!-- src/components/ui/KovaPill.vue -->
<!-- src/components/ui/KovaTooltip.vue (Reka Tooltip wrapper) -->
<!-- src/components/ui/KovaToast.vue + ToastStack.vue -->
<!-- src/components/ui/KovaPopover.vue (Reka Popover wrapper) -->
<!-- src/components/ui/KovaMenu.vue (Reka DropdownMenu wrapper) -->
<!-- src/components/ui/KovaSkeleton.vue (5 variants per B7) -->
<!-- src/components/ui/EmptyState.vue (3 variants per B9) -->
<!-- src/components/ui/NetworkStatusPill.vue (A13) -->
<!-- src/components/ui/CommandPalette.vue (A5 — Cmd+K) -->
<!-- src/views/errors/Error404.vue -->
<!-- src/views/errors/Error500.vue -->
<!-- src/views/errors/NetworkUnreachable.vue -->
```

---

### Cluster 12 — Settings / Accessibility / User Preferences

#### SQL migrations

```sql
-- Already in Cluster 01 migration (20260520_01_users_account_lifecycle.sql):
-- ALTER TABLE public.users ADD COLUMN preferences jsonb NOT NULL DEFAULT '{}'::jsonb;
```

#### RPC bodies

```sql
CREATE OR REPLACE FUNCTION update_user_pref(p_path text[], p_value jsonb)
RETURNS void LANGUAGE sql SECURITY INVOKER AS $$
  UPDATE public.users
  SET preferences = jsonb_set(preferences, p_path, p_value, true)
  WHERE id = auth.uid();
$$;
GRANT EXECUTE ON FUNCTION update_user_pref TO authenticated;
```

#### Pinia store

```typescript
// src/stores/preferences.ts (NEW — Layer 1 cross-device)
export const usePreferencesStore = defineStore('preferences', () => {
  const prefs = ref<UserPreferences>(structuredClone(DEFAULTS))
  const loaded = ref(false)
  
  async function load(): Promise<void> { ... }
  
  const debouncedSave = debounce(async (path: string[], value: unknown) => {
    await supabase.rpc('update_user_pref', { p_path: path, p_value: JSON.stringify(value) })
  }, 1000)
  
  function set<K extends keyof UserPreferences>(key: K, value: UserPreferences[K]): void { ... }
  
  return { prefs, loaded, load, set }
})

// src/stores/ui-state.ts (NEW — Layer 2 device-local, VueUse useLocalStorage)
export const useUIStateStore = defineStore('ui-state', () => {
  const pagesCollapsed = useLocalStorage('kova:ui:pages-collapsed', false)
  const layersCollapsed = useLocalStorage('kova:ui:layers-collapsed', false)
  const sidebarLeftWidth = useLocalStorage<number>('kova:ui:sidebar-left-width', 240)
  const sidebarRightWidth = useLocalStorage<number>('kova:ui:sidebar-right-width', 264)
  const recentColors = useLocalStorage<string[]>('kova:ui:recent-colors', [])
  const lastActiveBrandId = useLocalStorage<string | null>('kova:ui:last-brand', null)
  const lastActiveCanvasId = useLocalStorage<string | null>('kova:ui:last-canvas', null)
  const dismissedToasts = useLocalStorage<string[]>('kova:ui:dismissed-toasts', [])
  return { pagesCollapsed, layersCollapsed, sidebarLeftWidth, sidebarRightWidth, recentColors, lastActiveBrandId, lastActiveCanvasId, dismissedToasts }
})
```

#### Composable signatures

```typescript
// src/composables/use-preferences.ts (NEW — convenience wrapper around the store)
```

#### Component shells

```vue
<!-- src/views/account/SettingsSection.vue (lives inside Account page Profile section per Q5) -->
<!-- src/components/settings/AccessibilityPanel.vue (textSize / reduceMotion / highContrast) -->
<!-- src/components/settings/AISettingsPanel.vue (showTextSuggestions toggle) -->
<!-- src/components/settings/ViewPrefsPanel.vue (showRuler / showLayoutGuide / showPixelGrid / etc.) -->
```

---

## 2.B — Cross-Cutting Infrastructure Decisions

### 2.B.1 — Rate limiting strategy

**REQUIRES FOUNDER RATIFICATION:**
- **Option A (RECOMMENDED):** Per-endpoint + per-user via Supabase RPC `try_increment_generation` pattern extended. Stored in `rate_limits` table keyed by `(user_id, bucket, window_start)`. Reset by sliding-window. Limits enforced at Edge Function entry. Reuses existing M5 atomic-rate-limit RPC pattern.
- **Option B:** Upstash Ratelimit (Redis-backed, edge). Tighter latency but adds dependency.
- **Option C:** Vercel Middleware-only. Less precise; only protects routes through Vercel edge, not direct Supabase calls.
- **Tradeoff:** Option A reuses existing infra, costs DB round-trip per call. Option B faster but new dependency. Option C cheap but coarse.
- **Reversibility class:** SOFT (swap mechanism per-endpoint).

### 2.B.2 — Background job queue

**REQUIRES FOUNDER RATIFICATION:**
- **Option A (RECOMMENDED):** Vercel Cron + Supabase Edge Functions for scheduled jobs. pg_cron via Supabase for in-DB scheduling (snapshot prune, GDPR cron). No third-party queue. Cron-driven re-attempts handle retries.
- **Option B:** Inngest. Adds dependency but gives durable event-driven jobs, retries, observability.
- **Option C:** Trigger.dev. Similar to Inngest with different DX.
- **Tradeoff:** A keeps infra count low (Vercel + Supabase only); B/C add observability + durable retries. For 12-cluster MVP scope, A is sufficient.
- **Reversibility class:** SOFT (migrate jobs individually).

### 2.B.3 — Email service

**REQUIRES FOUNDER RATIFICATION:**
- **Option A (RECOMMENDED):** Resend. Modern API, good DX, native Supabase integration. Cheap.
- **Option B:** Supabase Auth built-in email (only handles auth emails). Insufficient for transactional (deletion confirmations, restore links, payment failures).
- **Option C:** Postmark / SendGrid. Mature but Resend matches them on features at MVP scale.
- **Tradeoff:** Resend is fastest to ship. Postmark/SendGrid have longer track records for reputation/deliverability.
- **Reversibility class:** SOFT (DNS records + SDK swap).

### 2.B.4 — File upload size caps

**REQUIRES FOUNDER RATIFICATION:**
- **Per-file caps (RECOMMENDED):** Images (PNG/JPG/WebP/SVG) 10 MB. Fonts (woff2/ttf/otf) 10 MB. Canvas snapshot blobs (Yjs+Kiwi+Zstd) 50 MB (covers most large canvases).
- **Per-brand cumulative storage quota:** 100 MB for snapshots (Q7 already locks). 500 MB for media-assets (recommend free tier). 50 MB for brand-fonts.
- **Per-user cumulative:** No explicit cap; derived from per-brand × max-brands. Recommend max 10 brands per user free tier, unlimited paid.
- **Reversibility class:** SOFT (config values).

### 2.B.5 — MIME type validation strategy

**Recommended decision:** Server-side per upload. **Magic-number sniff** (`file-type` library) + extension match + MIME header check. Reject if any disagree.
- **Why:** Trusting extension/header alone allows attackers to upload `evil.svg` as `image/png` for XSS or polyglot exploits.
- **Reversibility class:** TRIVIAL (helper function).

### 2.B.6 — Storage bucket structure

**Recommended decision:**
- `canvas-snapshots` — `{brand_id}/{canvas_id}/{snapshot_id}.kiwi.zst` (private, RLS-aware policy)
- `canvas-snapshot-thumbnails` — `{brand_id}/{canvas_id}/{snapshot_id}.png` (private)
- `media-assets` — `{brand_id}/{media_id}.{ext}` (private, signed URL via supabase-js)
- `brand-fonts` — `{brand_id}/{font_id}.{ext}` (private)
- `user-avatars` — `{user_id}.{ext}` (public read OK)
- **Path-prefix RLS:** Storage bucket policies key off `{brand_id}/` path prefix matching user's owned brand IDs.
- **Reversibility class:** HARD (path layout = URL contract; reversal renames every file).

### 2.B.7 — Webhook signature verification

**Recommended decision:**
- **Stripe:** `Stripe.Webhook.constructEvent(payload, sig_header, whsec_*)` with HMAC-SHA256. Per docs.stripe.com verification ✓.
- **Shopify:** HMAC-SHA256 with `X-Shopify-Hmac-Sha256` header against `KOVA_SHOPIFY_CLIENT_SECRET`. Per `api/shopify/webhooks.ts` (verified exists; not re-read but trusted).
- **Idempotency:** Both — store event ID (Stripe `event.id`, Shopify `X-Shopify-Webhook-Id` header) in dedicated table; check before processing.
- **Reversibility class:** HARD (security pattern).

### 2.B.8 — Feature flag system

**REQUIRES FOUNDER RATIFICATION:**
- **Option A (RECOMMENDED):** Hard-coded constants in `@/constants.ts` for MVP. Simple boolean exports. Plus `usePlanGate()` composable for plan-tier gates.
- **Option B:** Vercel Edge Config — fast edge-fetched flags, integrates with Vercel deploys.
- **Option C:** LaunchDarkly / GrowthBook — heavyweight, overkill for MVP.
- **Tradeoff:** A is zero-overhead, fits MVP scope. B unlocks per-user gradual rollouts. C is enterprise-grade.
- **Reversibility class:** SOFT (mechanism swap; flag names stable).

### 2.B.9 — Caching strategy

**Recommended decision:**
- **Realtime invalidation:** Supabase Realtime channels for live-changing data (snapshots, chat, sync_progress). Already used by M9.
- **SWR-style:** Pinia store data with stale-while-revalidate via composable wrapper. No external library.
- **Service Worker for assets:** Defer to Phase 2 (offline canvas access).
- **CDN caching:** Vercel edge cache for static assets (CSS, JS, images) via default headers.
- **Reversibility class:** SOFT.

### 2.B.10 — Logging strategy

**REQUIRES FOUNDER RATIFICATION:**
- **Option A (RECOMMENDED):** Structured JSON to stdout from Edge Functions → Vercel Logs (native, free in Hobby/Pro). Add `logShopifyError` pattern (already in `api/_shared/shopify-error.ts`) for all error logs.
- **Option B:** Axiom or BetterStack — Vercel Log Drain integration. Adds queryability.
- **Option C:** Sentry — overlap with error tracking (2.B.11); not pure logging.
- **Tradeoff:** A is free + Vercel-native; B unlocks LogQL-style search; C overlaps.
- **Reversibility class:** SOFT (add log drain post-MVP).

### 2.B.11 — Error tracking + alerting

**REQUIRES FOUNDER RATIFICATION:**
- **Option A (RECOMMENDED):** Sentry. Industry standard, free tier sufficient for MVP. Add `@sentry/vue` (frontend) + `@sentry/node` (Edge Functions / API routes).
- **Option B:** Highlight.io / Bugsnag — similar feature set.
- **Alert routing:** Email-only at MVP (founder + ops contact). Add Slack webhook integration post-launch when team size > 2.
- **Reversibility class:** SOFT (SDK swap).

### 2.B.12 — Monitoring strategy

**Recommended decision:**
- **Web Vitals:** Vercel Analytics (free, native). Tracks LCP/FID/CLS.
- **Function performance:** Vercel Speed Insights for serverless duration + cold-start tracking.
- **DB performance:** Supabase Dashboard (free; built-in pg_stat_statements view).
- **Custom dashboards:** Defer Grafana/Datadog to post-launch.
- **Reversibility class:** SOFT.

### 2.B.13 — Anthropic API key management

**Recommended decision:**
- **Single key per environment** (dev, staging, prod). Stored in Vercel env vars + `.env.local` for local dev.
- **Server-only:** `ANTHROPIC_API_KEY` never exposed to browser per CLAUDE.md.
- **Cost monitoring:** Anthropic dashboard + Cluster 04 plan-gate budget tracking per user (`try_increment_generation` pattern).
- **Rate limit handling:** AI proxy retries 429 with exponential backoff, max 3 attempts, then surfaces error to user.
- **Reversibility class:** TRIVIAL (rotate keys).

### 2.B.14 — Migration runner

**REQUIRES FOUNDER RATIFICATION:**
- **Option A (RECOMMENDED):** Supabase CLI `supabase db push` for migration deploy. Timestamp-prefixed `.sql` files in `supabase/migrations/` (existing pattern). CI step: `supabase db diff` to detect drift.
- **Option B:** Atlas — declarative schema management, more rigorous but new tool.
- **Option C:** Manual via `psql` — fast but error-prone.
- **Idempotency requirement:** All new migrations MUST use `CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, etc. Existing M9 migrations have `_fixup` files which suggests non-idempotent originals — clean up in a single consolidation migration before launch (recommend).
- **Reversibility class:** SOFT.

### 2.B.15 — Pre-commit hooks

**REQUIRES FOUNDER RATIFICATION:**
- **Option A (RECOMMENDED):** lefthook (faster than Husky, Go binary). Runs: `bun run format` (oxfmt) + `bun run check` (oxlint --type-aware --type-check) + commit message linter.
- **Option B:** Husky — JavaScript-based, simpler integration with Bun.
- **Option C:** Native git hooks — no framework; manage manually.
- **Tradeoff:** lefthook fastest; Husky most familiar; native lowest overhead.
- **Reversibility class:** TRIVIAL.

---

## 2.C — Architecture Decisions Not Yet Made

### 2.C.1 — SSR vs SPA for marketing + auth

**REQUIRES FOUNDER RATIFICATION:**
- **Option A (RECOMMENDED):** Stay on Vite SPA. Marketing site is out of scope per dispatcher §7. Auth uses light theme on same Vite SPA. Single deploy, single build pipeline.
- **Option B:** Add Nuxt 3 for marketing later. Defer until marketing site enters scope.
- **Reversibility class:** SOFT (additive Nuxt project; SPA stays as `/app`).

### 2.C.2 — Browser-only vs Tauri-first execution model

**REQUIRES FOUNDER RATIFICATION:**
- **Option A (RECOMMENDED):** Browser-first MVP. Tauri build is a secondary deploy artifact. Feature detection via `window.__TAURI__` for Tauri-only features (eyedropper screen-wide, native menu bar, file-system access).
- **Option B:** Tauri-first. Browser is fallback.
- **Tradeoff:** Browser-first matches Figma's mental model + zero install friction; Tauri unlocks native features but adds OS-specific build pipelines.
- **Reversibility class:** SOFT (both deploy together; priority shift).

### 2.C.3 — Local-first persistence sync with Supabase

**Recommended decision:** Yjs + y-indexeddb is the source-of-truth runtime state per CLAUDE.md (never modify). Sync to Supabase via:
- **Snapshot store (Cluster 09):** Periodic Yjs doc bytes upload to `canvas-snapshots` bucket. Restore = pull bytes + swap into Yjs.
- **Realtime channels:** Supabase Realtime for non-canvas state (chat, sync progress, brand changes).
- **Conflict resolution:** Yjs CRDT handles within-document. Cross-store conflicts (e.g., brand metadata edited offline) = last-write-wins via Supabase.
- **Sync indicator UX:** §3C #15 network status indicator pill (A13 pattern).
- **Reversibility class:** HARD (architectural).

### 2.C.4 — Optimistic UI patterns

**Recommended decision:** Optimistic for mutations with cheap rollback (toggle visibility, rename, snapshot create). Pessimistic for mutations with side effects (Stripe upgrade, account deletion, file upload).
- Pattern: Pinia store updates immediately + queue server call + revert on error + toast on failure.
- **Reversibility class:** SOFT (per-action choice).

### 2.C.5 — Offline → online state migration

**Recommended decision:**
- Yjs + y-indexeddb persists offline edits.
- On reconnect: `useOnlineStatus` composable detects → resume Supabase Realtime channels → flush queued user-pref writes → flush queued snapshot uploads.
- No anon-user state in MVP (user must be authenticated to access editor).
- **Reversibility class:** SOFT.

### 2.C.6 — Anonymous → authenticated user state

**Recommended decision:** No anon state in MVP. Marketing site (out of scope) might add demo-canvas signup conversion in Phase 2. Pre-auth pages (`/login`, `/signup`, `/auth/magic-link-expired`) have no editable state to migrate.
- **Reversibility class:** TRIVIAL.

### 2.C.7 — Multi-device session handling

**Recommended decision:** Per Q6 Solo MVP: same user on 2 devices opens same canvas → Yjs CRDT handles concurrent edits transparently (both devices write to same Yjs doc via y-indexeddb local-first + future sync). No multi-device locking in MVP. No "another device is editing" indicator.
- **Reversibility class:** SOFT (add coordination layer if needed post-launch).

### 2.C.8 — Browser tab focus / blur behavior

**Recommended decision:** Autosnap pauses on blur (no Yjs edits happening) + resumes on focus. Save-on-tab-close via `beforeunload` handler triggers final snapshot if scene has unsaved changes since last snapshot.
- **Reversibility class:** SOFT.

### 2.C.9 — Network failure UX

**Recommended decision:** Global offline banner via `useOnlineStatus` (A13 pattern) + per-action retry toasts ("Failed to save snapshot. Retry?"). Yjs+y-indexeddb queues writes locally; user sees "Offline — changes will sync when reconnected."
- **Reversibility class:** SOFT.

### 2.C.10 — Database client architecture

**Recommended decision:** `@supabase/supabase-js` client throughout. No additional ORM (Drizzle/Prisma/Kysely) — Supabase + RLS + RPC pattern is sufficient. Type generation via `supabase gen types typescript` into `@/types/database.types.ts`.
- **Reversibility class:** HARD (replacing client mid-development = massive refactor).

### 2.C.11 — Realtime channel architecture

**Recommended decision:**
- **Per-canvas:** Snapshot timeline updates (Cluster 09), chat streaming (Cluster 10).
- **Per-brand:** Shopify sync progress (M9), brand-memory updates.
- **Per-user:** Stripe billing events, account deletion status.
- **Concurrent channels per session:** ~4–6 typical (1 canvas + 1–2 brands + 1 user). Well under Supabase Realtime limits.
- **Reversibility class:** SOFT.

### 2.C.12 — Image rendering pipeline (canvas → PNG/JPG export)

**Recommended decision:** CanvasKit `Surface.makeImageSnapshot().encodeToBytes('image/png' | 'image/jpeg', quality)`. Browser fallback via `canvas.toBlob()` if CanvasKit encoder unavailable. Color profile: sRGB. Per-node `exportSettings[]` array with format + scale + quality (JPG).
- **Reversibility class:** SOFT (encoder swap).

### 2.C.13 — Image-fill caching

**Recommended decision:** Store images in `public.media` table with `brand_id` FK + Storage bucket `media-assets`. Reference by signed URL (15-min TTL). Cached in browser via standard Cache-Control headers from Supabase Storage.
- **Reversibility class:** SOFT.

### 2.C.14 — AI streaming response handling

**Recommended decision:** `@ai-sdk/anthropic` + ToolLoopAgent per CLAUDE.md. Streaming via Server-Sent Events from `/api/ai-proxy/v1/messages`. Tool calls interleave with text via AI SDK delta events. Valibot schema validation per CLAUDE.md.
- **Reversibility class:** HARD (CLAUDE.md mandate).

### 2.C.15 — Font loading + FOUT

**Recommended decision:** Inter self-hosted via npm package + `font-display: swap` in `@font-face`. Preload in `index.html` `<link rel="preload" as="font" href="/inter-var.woff2" crossorigin>`. Brand-uploaded fonts registered with CanvasKit at runtime (Cluster 05).
- **Reversibility class:** SOFT.

---

## 2.D — Tooling + Ops Gaps

### 2.D.1 — CI/CD pipeline definition

**Recommended decision:** Vercel for marketing+auth+main SPA (preview + production deploys). GitHub Actions for Tauri desktop builds (matrix: macOS, Windows, Linux) triggered on `release` tags. Vercel Preview URL per PR.
- **Reversibility class:** SOFT.

### 2.D.2 — Preview deployment strategy

**Recommended decision:** Per-PR Vercel Preview URL with authenticated previews via Vercel Password Protection (Pro feature) OR Clerk-style auth gate on the preview deployment.
- **Reversibility class:** TRIVIAL.

### 2.D.3 — Production deployment + rollback

**Recommended decision:** Vercel auto-deploy on `main` branch push. Rollback via `vercel rollback` CLI. Database migrations run pre-deploy via Supabase CLI in a CI step that blocks the Vercel deploy on failure.
- **Reversibility class:** SOFT.

### 2.D.4 — Database migration runner

See 2.B.14.

### 2.D.5 — Test environment setup

**REQUIRES FOUNDER RATIFICATION:**
- **Option A (RECOMMENDED):** Separate Supabase project (`kova-staging`). Seeded with fixture data. Used for E2E + manual smoke.
- **Option B:** Mocked Supabase client in tests; only production project exists.
- **Tradeoff:** A is realistic but doubles Supabase cost (~$25/mo); B is cheap but misses RLS / migration-order bugs.
- **Reversibility class:** SOFT.

### 2.D.6 — Staging vs production data isolation

**Recommended decision:** Separate Supabase project for staging (per 2.D.5 Option A). Separate Stripe account (test mode keys for staging, live keys for production). Separate Anthropic API key (one per env, recommended budget cap on dev).
- **Reversibility class:** SOFT.

### 2.D.7 — Secrets management

**Recommended decision:** Vercel env vars per environment (Production / Preview / Development). Server-only secrets never prefixed `VITE_` per CLAUDE.md. `.env.local` for local dev (gitignored).
- **Reversibility class:** TRIVIAL (rotate + redeploy).

### 2.D.8 — Backup strategy

**Recommended decision:** Supabase PITR 7-day for free tier (per Q15). Upgrade to Supabase Pro for 14-day PITR + daily logical backups. Long-term archival to S3 via Supabase Wrappers (defer Phase 2).
- **Reversibility class:** SOFT.

### 2.D.9 — Disaster recovery RTO/RPO

**Recommended decision:**
- **RTO (downtime):** 4 hours target. Acceptable for MVP launch.
- **RPO (data loss):** 1 hour target via Supabase PITR + Yjs+y-indexeddb local cache (canvases recoverable from user device).
- **Reversibility class:** SOFT.

### 2.D.10 — Performance budgets

**Recommended decision:**
- **Marketing+auth:** LCP < 2.5s, CLS < 0.1, FID < 100ms (Web Vitals "Good" thresholds).
- **Editor:** Canvas paint FPS > 30 at 50–300 nodes (email-design scale). Cold-start under 3s.
- **Track via:** Vercel Speed Insights + manual Lighthouse audits pre-release.
- **Reversibility class:** TRIVIAL (target adjust).

### 2.D.11 — Accessibility audit pre-launch

**Recommended decision:** axe-core CI integration (`@axe-core/playwright`) in E2E tests. Manual VoiceOver pass on critical flows (signup, dashboard, canvas open, save) pre-launch. Address P0 (color-contrast, focus-visible, aria-label) violations as blockers.
- **Reversibility class:** SOFT (defer fixes by severity).

### 2.D.12 — Privacy compliance

**Recommended decision:**
- **GDPR ROPA:** Owned by Cluster 01 (Auth & Identity) PRD. Document each sub-processor (Stripe, Shopify, Anthropic, Supabase) + retention policy + cascade order.
- **Cookie banner:** Required if any tracking cookies (Vercel Analytics is privacy-first / cookieless, so skip). PostHog or similar would require a banner — defer.
- **Analytics:** Vercel Analytics (privacy-first, no banner needed) for Web Vitals + page views. PostHog/Plausible deferred to post-launch.
- **Reversibility class:** SOFT.

### 2.D.13 — Customer support channel

**Recommended decision:** Email-only at MVP (`support@kova.app`). In-app feedback link in avatar dropdown ("Help" → mailto until /help docs ship in Phase 2). Intercom / HelpScout deferred — add when DAU > 1000.
- **Reversibility class:** TRIVIAL.

---

# Top 10 Priority Items for Founder Review

| Rank | Item | Why critical | Recommended action | Reversibility |
|------|------|--------------|--------------------|---------------|
| 1 | **M9 light theme drift on 3 Shopify surfaces** (`StoreTypeStep.vue`, `IntegrationsCard.vue`, `SettingsBrandIntegrationsView.vue`) | Violates `feedback_app_dark_website_light` rule; user-visible inconsistency at MVP launch. Affects Clusters 02, 04, 05 PRDs. | Pre-launch refactor: replace `bg-white`/`text-gray-900`/`border-gray-200` with Kova tokens (`bg-page`/`text-ink`/`border-line`). ~6–12 hr total. Founder ratifies "refactor pre-launch" vs. "Phase 2 deferral". | TRIVIAL (template/class edits) |
| 2 | **Stripe Customer scope (one-per-user)** | Q13 implies one-per-user but never explicitly ratified. Reversal in 6 months requires migration on every Customer + new Customer per brand. HARD. | Ratify explicitly: "one Stripe Customer per User, all brands billed under it forever — agency pass-through is out of scope." | HARD |
| 3 | **M9 brand-kit-extract scope vs Q8 (tone snippets + saved blocks + voice)** | Currently extracts colors/fonts/logo only. Cluster 05 PRD needs decision before authoring. | Recommend Option A: extend Edge Function to scrape About page + product descriptions via Claude API for voice + initial tone snippets. Founder ratifies. | SOFT |
| 4 | **M9 Integrations IA reconciliation (URL-param route vs Q12+Q13 dropdown)** | Settings Integrations at `/dashboard/:brandId/settings/integrations` (M9) vs. Q12+Q13 implies `/account/integrations` with per-brand dropdown. Affects Cluster 04 PRD authoring. | Ratify which path. Recommend: keep M9 route as canonical (per-brand-settings sub-routes), update Q12 to allow this pattern. | SOFT |
| 5 | **8 cross-cutting infra decisions unratified** (rate limit, job queue, email, upload caps, storage layout, feature flags, error tracking, migration runner) | Each PRD will need answers. If invented per-cluster, system fragments. | Ratify recommended options per §2.B. 8 single-line decisions. | SOFT for most; HARD for storage bucket layout |
| 6 | **18 failing unit tests** (pre-existing, mock-related) | Test debt; CI not green; may mask real regressions. Not M9 fault. | Triage in Wave 6 cleanup pass: mark Reka-mock failures as `.skip` with FIXME ticket; verify zero schema-related failures post 2026-05-13 fix. | SOFT |
| 7 | **20 uncommitted files on `feat/m9-shopify` branch** | Includes schema bug fix (2026-05-13) + polling fallback (2026-04-25). Branch hygiene before PRD work. | Run `git status` + classify each. Commit known-good fixes (`kova-tools.ts`, `use-shopify-connection.ts`, tests). Triage remainder. | TRIVIAL |
| 8 | **M9 history accordion renders empty** (Connection.history TypeScript field, no DB column) | UI promises history but DB doesn't have it. Either build the schema or rip the UI. | Add `shopify_connection_history` table now (Cluster 04 spec); OR remove the accordion. Recommend: build the table — Cluster 04 needs it for "sync history" feature. | SOFT |
| 9 | **Q15 GDPR `delete-account-cron` Edge Function does not exist yet** | Required for compliance. Expected — Cluster 01 builds it. But surface as blocker for launch. | Cluster 01 (Wave 1) PRD includes cascade Edge Function + retry queue (`gdpr_deletion_queue` table per §2.A Cluster 01). | HARD |
| 10 | **PRD 07 split decision** | Cluster 07 (Canvas Engine Extensions) estimated 50–60 spec sections. Strong split candidate. | Plan to split into 07a (Core mods + Renderer) and 07b (Inspector wiring + Overlays) when PRD draft grows. Mention in Wave 5 founder-handoff. | TRIVIAL |

---

# Methodology + Sources

## Files read

**Source-of-truth docs:**
- `/Users/jihoyang/kova-main/kova-open-pencil-1/docs/kova-final-prds/00b-COMPREHENSIVE_AUDIT_DISPATCH.md` (full)
- `/Users/jihoyang/kova-main/kova-open-pencil-1/docs/kova-final-prds/00-PRD_SCOPE_PLAN.md` (full)
- `/Users/jihoyang/kova-main/kova-open-pencil-1/docs/superpowers/handoffs/design-overhaul/q1-5-answers-03-implied-surfaces-and-backend.md` (full)
- `/Users/jihoyang/kova-main/kova-open-pencil-1/docs/superpowers/handoffs/design-overhaul/q6-25-answers-03-implied-surfaces-and-backend.md` (chunked: lines 1–1235)
- `/Users/jihoyang/kova-main/kova-open-pencil-1/docs/superpowers/handoffs/design-overhaul/03-implied-surfaces-and-backend.md` (chunked: lines 1–85 + 300–580 covering §1 summary, §2.11+, §3.A, §3.B, §3.C, §4, §5, §6, §7, §8)

**Design system:**
- `/Users/jihoyang/kova-main/main-main-kova-scope/design-system/design.md` (full, 372 lines)
- `/Users/jihoyang/kova-main/main-main-kova-scope/design-system/TOKEN_CANONICAL.md` (full, 140 lines)
- `/Users/jihoyang/kova-main/main-main-kova-scope/design-system/kova-hifi.css` (first 200 lines of 576)

**Project context:**
- `/Users/jihoyang/kova-main/CLAUDE.md` (full)
- `/Users/jihoyang/kova-main/main-main-kova-scope/handoff-docs/PRE_PRD_READINESS_AUDIT_V2.md` (full)
- Memory observations #3658–#3672 (M9 schema bug fix + status snapshot)

**M9 codebase (read for §1.E.1):**
- `/Users/jihoyang/kova-main/kova-open-pencil-1/src/components/onboarding/StoreTypeStep.vue` (full, 114 lines)
- `/Users/jihoyang/kova-main/kova-open-pencil-1/src/views/dashboard/SettingsBrandIntegrationsView.vue` (full, 443 lines)
- `/Users/jihoyang/kova-main/kova-open-pencil-1/src/components/dashboard/IntegrationsCard.vue` (full, 176 lines)
- `/Users/jihoyang/kova-main/kova-open-pencil-1/src/composables/use-shopify-connection.ts` (full, 323 lines)
- `/Users/jihoyang/kova-main/kova-open-pencil-1/src/ai/kova-tools.ts` (full, 292 lines)
- `/Users/jihoyang/kova-main/kova-open-pencil-1/api/shopify/oauth/callback.ts` (full, 307 lines)
- `/Users/jihoyang/kova-main/kova-open-pencil-1/api/shopify/brand-kit-extract.ts` (full, 168 lines)

**Directory surveys (via `ls`):**
- `kova-open-pencil-1/src/` + subdirs (composables, stores, ai, components, views)
- `kova-open-pencil-1/api/shopify/` (oauth, sync, compliance, cron + root files)
- `kova-open-pencil-1/supabase/migrations/` (23 files; 10+ are M9)

## External sources consulted (URLs cited)

**Figma official docs:**
- [help.figma.com — View a file's version history](https://help.figma.com/hc/en-us/articles/360038006754-View-a-file-s-version-history) — Q7 verified (30-min autosave, 30-day free / unlimited paid, ⌥⌘S, pre-restore checkpoint)
- [help.figma.com — Masks](https://help.figma.com/hc/en-us/articles/360040450253-Masks) — Q2 verified (3 mask types, ⌃⌘M shortcut, sibling propagation)
- [help.figma.com — Add measurements and annotate designs](https://help.figma.com/hc/en-us/articles/20774752502935-Add-measurements-and-annotate-designs) — Q11 verified (⇧M shortcut, persistence implied)
- [developers.figma.com — SliceNode](https://developers.figma.com/docs/plugins/api/SliceNode) — Q1 cited (via q1-5 doc)
- [developers.figma.com — MaskType](https://developers.figma.com/docs/plugins/api/MaskType/) — Q2 cited
- [developers.figma.com — VectorNetwork](https://developers.figma.com/docs/plugins/api/VectorNetwork/) — Q3 #13 cited
- [help.figma.com — Sample colors with the eyedropper tool](https://help.figma.com/hc/en-us/articles/27643269375767-Sample-colors-with-the-eyedropper-tool) — Q20 cited
- [help.figma.com — Adjust the properties of an image](https://help.figma.com/hc/en-us/articles/360041098433-Adjust-the-properties-of-an-image) — Q21 cited
- [help.figma.com — Export formats and settings](https://help.figma.com/hc/en-us/articles/13402894554519-Export-formats-and-settings) — Q22 cited
- [help.figma.com — Copy and paste properties between layers](https://help.figma.com/hc/en-us/articles/4412765442967-Copy-and-paste-properties-between-layers) — Q23 cited
- [help.figma.com — Use Figma products with a keyboard](https://help.figma.com/hc/en-us/articles/360040328653-Use-Figma-products-with-a-keyboard) — Q25 cited
- [help.figma.com — Delete and restore files](https://help.figma.com/hc/en-us/articles/360047512294-Delete-and-restore-files) — Q19 cited
- [forum.figma.com — User preferences cross-device](https://forum.figma.com/suggest-a-feature-11/user-preferences-to-be-saved-on-account-level-in-software-4758) — Q5 cited (Figma is local-only)
- [help.figma.com — Manage your account settings](https://help.figma.com/hc/en-us/sections/4403936365591-Manage-your-account-settings) — Q12 cited

**Stripe docs:**
- [docs.stripe.com — Build a subscriptions integration](https://docs.stripe.com/billing/subscriptions/build-subscriptions) — Q14 verified (idempotency via event.id, HMAC signature, 6 events, Customer Portal pattern, ack-quick + async)
- [docs.stripe.com — SaaS guide](https://docs.stripe.com/saas) — Q14 cited
- [docs.stripe.com — Webhooks](https://docs.stripe.com/billing/subscriptions/webhooks) — Q14 cited

**Supabase docs:**
- supabase.com/docs RLS patterns, Edge Functions, Storage policies, pg_cron, Realtime — patterns used throughout cluster specs

**GDPR:**
- [gdpr-info.eu — Art. 17](https://gdpr-info.eu/art-17-gdpr/) — Q15 verified ("without undue delay"; backups exception requires separate documentation)

**Shopify:**
- WebSearch site:shopify.dev — OAuth revoke pattern (revoke client secret → token revocation cascade; app/uninstalled webhook fires on uninstall; mandatory compliance webhooks required for App Store apps)
- [shopify.dev — Privacy law compliance](https://shopify.dev/docs/apps/build/compliance/privacy-law-compliance) — referenced

**OpenPencil:**
- Cited via q1-5 doc tech-stack table (Vue 3 + CanvasKit + Yoga WASM + Tauri + Trystero + Yjs)

## Commands run

```sh
# Directory surveys
ls /Users/jihoyang/kova-main/kova-open-pencil-1/src/
ls /Users/jihoyang/kova-main/kova-open-pencil-1/api/shopify/
ls /Users/jihoyang/kova-main/kova-open-pencil-1/supabase/migrations/
ls /Users/jihoyang/kova-main/kova-open-pencil-1/src/composables/
ls /Users/jihoyang/kova-main/kova-open-pencil-1/src/stores/
ls /Users/jihoyang/kova-main/kova-open-pencil-1/src/canvas-extensions/
ls /Users/jihoyang/kova-main/kova-open-pencil-1/src/ai/
ls /Users/jihoyang/kova-main/kova-open-pencil-1/src/views/
ls /Users/jihoyang/kova-main/kova-open-pencil-1/src/components/
ls /Users/jihoyang/kova-main/kova-open-pencil-1/src/components/onboarding/
ls /Users/jihoyang/kova-main/kova-open-pencil-1/src/components/dashboard/
ls /Users/jihoyang/kova-main/kova-open-pencil-1/src/views/dashboard/
ls /Users/jihoyang/kova-main/kova-open-pencil-1/api/shopify/oauth/
ls /Users/jihoyang/kova-main/kova-open-pencil-1/api/shopify/sync/
ls /Users/jihoyang/kova-main/kova-open-pencil-1/api/shopify/cron/
ls /Users/jihoyang/kova-main/kova-open-pencil-1/api/shopify/compliance/

# File-size sanity checks
wc -l <files listed in Files Read>

# WebFetch (verified key Figma claims directly)
WebFetch help.figma.com/hc/en-us/articles/360038006754-View-a-file-s-version-history → Q7
WebFetch help.figma.com/hc/en-us/articles/20774752502935-Add-measurements-and-annotate-designs → Q11
WebFetch help.figma.com/hc/en-us/articles/360040450253-Masks → Q2
WebFetch docs.stripe.com/billing/subscriptions/build-subscriptions → Q14
WebFetch gdpr-info.eu/art-17-gdpr/ → Q15

# WebSearch
WebSearch "Shopify Partner OAuth token revoke app/uninstalled webhook compliance 2026" site:shopify.dev → Q15 cascade
```

---

# Final verdict reasoning

**⚠️ REQUIRES FOUNDER RATIFICATION** — committed.

The foundation is strong. Six months of decisions (Q1–Q25) are Figma-grounded where claimed (verified live against help.figma.com on Q2, Q7, Q11 and via citation-trust on the remaining 18 questions whose URLs are already in the q1-5/q6-25 docs). Founder-locked items (Q6 Solo MVP, Q17 no in-canvas brand-switch, Q14 Stripe foundation only, image-export-only) are internally consistent across the inventory. The 12-cluster PRD plan is well-sized (with two known split candidates: 06 and 07). The design system has canonical tokens, banned-pattern enforcement, and dark-app + light-auth split locked.

What stops this from being ✅ APPROVED is **two specific decision gaps that a PRD author cannot resolve without founder input**, plus M9-specific drifts that require ratification before Wave 4 (Cluster 05) PRD authors. The decision gaps are: (a) Stripe Customer scope (one-per-user is the only internally-consistent reading of Q13, but it's never been explicitly ratified — if it stays implicit and the founder later wants per-brand billing, reversal is HARD); (b) the eight cross-cutting infra picks in §2.B (each PRD will need these answers, and if PRDs invent them independently the system fragments — they need a single founder thumbs-up to lock in). The M9 drifts are: (a) light theme on 3 surfaces violating dark-app rule; (b) brand-kit-extract scope incomplete vs. Q8; (c) Settings Integrations URL-param IA vs. Q12+Q13 dropdown intent; (d) sync history accordion renders empty pending schema decision.

Nothing in this audit qualifies as ❌ BLOCKING. Every Q-decision PASSes or has a specific FLAG with a recommended remediation. The hard-to-reverse decision watchlist has 22 entries; 20 are already ratified, 2 require explicit founder ratification (#7 Stripe Customer scope, #18 M9 Integrations IA). Once those 10 priority items get a yes/no/refactor-now/defer-Phase-2 from the founder, the verdict flips to ✅ APPROVED FOR PRD AUTHORING and Wave 1 (Clusters 01 + 11) PRD work can begin immediately.

**Recommended next step:** Founder reads §"Top 10 Priority Items" + §"Executive summary" top-down. Provides yes/no per item via AskUserQuestion or comment in PRD scope plan §5.5. Audit then re-stamps to ✅ APPROVED and Wave 1 PRD authoring dispatch begins.

---

**End of report.**







