# PRD 09 — Version History + Trash

## 0. Status & ownership

| Field | Value |
|---|---|
| **Status** | `DRAFT` |
| **Wave** | 6 |
| **Author** | Claude (Opus 4.7) |
| **Reviewer** | Jiho Yang (founder) |
| **Last updated** | 2026-05-15 |
| **Depends on PRDs** | 01 (Auth — `users` table, Storage cleanup contract), 02 (Dashboard — trash inbox host + canvas-creation RPC for Duplicate), 06 (Canvas Core Chrome — right-panel mount slot), 07a (Canvas Engine Core — scene-graph stability), 08 (Menus & Shortcuts — `⌥⌘S` registration), 11 (Shared UI — `useConfirm`, `<KovaModal>`, `<ToastStack>`, skeletons) |
| **Blocks PRDs** | None |
| **Source artifacts** | Hi-fi: 2 files (17 Version History, 15 Trash Confirm). 03 doc: §2.11 (2 rows), §2.12 (1 row), §3C #2, §3.A snapshot infra row, §3.B trash reuse row. Q-decisions: Q7 (snapshot model Figma-exact), Q19 (trash indefinite retention). Audit §2.A Cluster 09 (lines 1764–1945). 00d/00e ratifications: snapshot 50 MB blob cap + 100 MB per-brand quota + Vercel Cron + autosnap on blur/beforeunload (2.C.8). |

---

## 1. Problem & outcome

### 1.1 Plain language (for founder)

Users edit a canvas for days or weeks across many sessions. They need to (a) trust that recent work is auto-saved, (b) explicitly name a milestone they can come back to, (c) recover from an accidental large edit or AI misfire by restoring an earlier snapshot, (d) move stale canvases out of their dashboard without permanent loss. This PRD ships the **trust layer**: a Figma-exact version-history panel in the canvas right rail (timeline of every autosave + every named save), an autosnapshot heartbeat (every 30 minutes plus tab-close, disconnect, and `⌥⌘S`), an atomic restore that always snapshots the current state first so the restore itself can be undone, and a destructive trash-confirm modal hooked to the dashboard's right-click "Move to trash" action. Trash retention is indefinite — nothing auto-purges; Cluster 01's account-deletion cron is the only thing that ultimately removes trashed data, 30 days after the user requests account deletion. The compare/diff viewer is **NOT** in this PRD — Figma's version history has no diff viewer either, and shipping list + preview + restore matches Figma muscle memory exactly.

### 1.2 Caveman summary

Auto-save every 30 min. Save by hand with `⌥⌘S`. Right-panel timeline show every save + autosave. Pick one → restore. Restore = atomic, take pre-restore snap first, `⌘Z` undo work. Trash = right-click on dashboard → confirm modal → file moves to Trash, snapshots ride along. Nothing auto-purge. Account-delete cron sweep at 30 days only. No diff view (Figma no have either).

### 1.3 Outcome (acceptance gate)

User can: (1) see auto-saved snapshots in the right-panel timeline within 30 minutes of opening any canvas, (2) press `⌥⌘S` to open the Add-to-version-history modal and save a named snapshot with optional description, (3) right-click any row → 5-item dropdown (Name this version / Restore this version / Duplicate / Delete version info / Copy link), (4) restore any snapshot — the act of restoring creates a pre-restore snapshot of the current state and pushes an undo entry so `⌘Z` reverses the restore, (5) duplicate a snapshot → opens a new canvas in the same brand seeded from that snapshot's Yjs bytes, (6) right-click a file in the dashboard → "Move to trash" → typed-confirm modal → file (+ its snapshots) lands in Trash with a "Restore anytime" toast, (7) hit the 100 MB-per-brand quota → snapshot-create returns `quota_exceeded` and the client surfaces a non-blocking toast. Daily prune cron removes free-tier autosaves > 30 days old. No live multi-device sync promised (per `00e §6 #2`).

---

## 2. Scope

### 2.1 In scope (this PRD)

**Schema + storage:**
- New `canvas_snapshots` table (id, canvas_id, brand_id, user_id, taken_at, kind, label, description, scene_blob_path, scene_size_bytes, thumbnail_path, parent_snapshot_id, format_version, retention_class)
- RLS via brand ownership; writes only through SECURITY DEFINER RPCs
- New private Supabase Storage bucket `canvas-snapshots` with user-scoped path prefix
- Reuse of existing `canvases.trashed_at` column (no migration — already in `20260317_m2_dashboard.sql`)

**Backend:**
- 3 RPCs: `create_snapshot` (quota-checked insert), `restore_snapshot` (atomic with pre-restore), `rename_snapshot` (handles Name + Delete-version-info)
- 1 helper RPC `purge_canvas_snapshot_paths(canvas_id)` returning text[] — used by Cluster 02's canvas-permanent-delete flow to enumerate Storage paths for client-side bulk deletion before the canvas row is hard-deleted (FK cascade then removes the snapshot rows)
- 2 Edge Functions: `POST /api/snapshots/duplicate-to-canvas` (cross-cluster: reads snapshot blob, calls Cluster 02 `create_canvas` RPC, seeds Yjs initial state, registers new tab), `POST /api/cron/snapshot-prune` (daily 04:00 UTC, free-tier autosave pruner)

**Frontend:**
- `useSnapshotsStore` Pinia store (list / create / restore / rename / delete-version-info / duplicate-to-canvas; signed-URL fetcher for blobs + thumbnails)
- `useAutosnapshot(canvasId, isActive)` composable — 30-min heartbeat, pause-on-blur, resume-on-focus, `beforeunload` final snap, `navigator.onLine` offline detect, `⌥⌘S` listener; skip-if-unchanged via Yjs state-vector compare
- 8 components in `components/version-history/`: `SnapshotTimelinePanel`, `SnapshotRow` (hover ••• + 5-item dropdown), `AutosaveGroupHead`, `AddVersionDialog` (supersedes retired A8.1 Snapshot dialog), `RestoreConfirmModal` (non-destructive), `SnapshotEmptyState` (A11 `.empty-pane`), `FilterDropdown` (autosave toggle only), `CurrentVersionRow`
- 1 component in `components/trash/`: `TrashConfirmModal` (destructive `.btn.danger`)
- `useSnapshotThumbnail` composable wraps existing `editor.ts.captureThumbnail` for ~150×150 PNG generation
- Right-panel mount: the version-history panel takes over the entire right rail when active, replacing the inspector; close (`x`) returns to inspector. Mount slot owned by Cluster 06's canvas chrome.

**Cron:**
- `snapshot-prune` Vercel Cron (daily 04:00 UTC) — deletes rows + Storage objects for autosave snapshots where `retention_class = 'free' AND taken_at < now() - INTERVAL '30 days'`

**Trash:**
- `TrashConfirmModal` mounted at the dashboard (Cluster 02 host) — wires the existing `useCanvasesStore.confirmMoveToTrash` flow through `useConfirm` (Cluster 11) with the B13-series hi-fi copy. The cascade behavior (snapshots travel with the canvas; nothing else changes) is specified here.

### 2.2 Out of scope (handed to other clusters)

| Item | Owning PRD |
|---|---|
| Right-panel mount slot in canvas chrome | 06 — Canvas Editor Core Chrome |
| `⌥⌘S` keybinding entry in the global keyboard registry | 08 — Menus & Shortcuts (this PRD declares the binding contract; 08 wires it into `use-keyboard.ts`) |
| Trash inbox view at `/dashboard` (file list, "Empty trash", per-file restore + permanent-delete) | 02 — Onboarding & Dashboard |
| `useCanvasesStore.moveToTrash` / `restoreCanvas` / `permanentlyDelete` actions | Already shipped (per 03-doc §3.B); this PRD wraps `moveToTrash` in the new confirm modal |
| Account-deletion cron `storage` step that purges `canvas-snapshots/{user_id}/**` at the 30-day mark | 01 — Auth & Identity (this PRD specifies the path-prefix layout it consumes) |
| `useConfirm()` composable, `<KovaModal>` shell, `<ToastStack>`, skeleton primitives | 11 — Shared UI Infrastructure |
| Anthropic-paid plan gate logic (`users.plan = 'paid'` distinction) and the Stripe webhook hook that flips `retention_class` from `'free'` to `'paid'` on upgrade | 04 — Account & Stripe (this PRD specs the contract; 04 fires the UPDATE) |
| Canvas-creation RPC `create_canvas` used by Duplicate-to-canvas | 02 — Onboarding & Dashboard |
| Scene-graph stability for Yjs round-trip | 07a — Canvas Engine Core |
| AI-driven snapshot triggers (e.g., "save a version after each AI edit") | Deferred (see §2.3) — Cluster 10's AI tools may opt into manual snapshots later but this PRD does not pre-build the integration |

### 2.3 Deferred to Phase 2

- **Compare / diff viewer** — Figma does not ship a diff viewer (verified `help.figma.com/hc/en-us/articles/360038006754`); no row-vs-row visual comparison in MVP.
- **"All / Only yours" filter from hi-fi 17.7** — Kova MVP is single-user (freelancer scope per `project_kova_avatar`). Only the "Show autosave versions" toggle ships; the visibility filter is hidden until multi-user collaboration arrives.
- **Per-snapshot full deletion by user** — Figma's "Delete Version Info" only clears label + description (verified). MVP matches Figma exactly; no user-driven row deletion. The prune cron handles autosave cleanup; manual + pre_restore snapshots are kept indefinitely. If the per-brand quota becomes a real problem post-launch, ship a deferred admin/user "Delete this snapshot" RPC.
- **Shared / public version links** — `Copy link` ships an authenticated deep-link `/canvas/{id}?version={snapshot_id}` that requires the same user's auth on load. No public-share token in MVP (matches Q6 single-user scope + `00e §6 #2` no-live-sync rule).
- **Cross-canvas snapshot diff** — out.
- **Snapshot search by label** — out (hi-fi 17 has no search box).
- **Manual "Empty trash" button** — Cluster 02 dashboard scope, not 09.

### 2.4 Cross-cut acknowledgments (foreign owners)

- **Cluster 06** owns the right-panel slot mechanic. This PRD's `SnapshotTimelinePanel` mounts inside that slot; Cluster 06 specifies the slot props (open-state, theme passthrough). This PRD's panel listens for a `vh:open` / `vh:close` event from Cluster 06's chrome.
- **Cluster 08** owns the keyboard registry. This PRD declares the `⌥⌘S` binding entry; Cluster 08 wires the runtime handler that invokes `useSnapshotsStore.openAddDialog()`.
- **Cluster 11** owns `useConfirm`, `<KovaModal>` shell, `<ToastStack>`, skeletons. This PRD consumes by composable + component name only.
- **Cluster 02** owns the dashboard. The `TrashConfirmModal` ships in this PRD but is *mounted* by Cluster 02's dashboard view (right-click → confirm). Same pattern as Cluster 01's `<DangerZoneCard>` (ships in 01, mounted by 04).
- **Cluster 04** owns the Stripe webhook. This PRD's `retention_class` column expects 04 to fire `UPDATE canvas_snapshots SET retention_class = 'paid' WHERE user_id = $1 AND retention_class = 'free'` on plan upgrade. Documented in §11.

---

## 3. Visual spec

Every surface maps to a hi-fi scene. Engineers cite the file + scene ID when implementing.

### 3.1 Version-history panel (DARK theme, mounted in canvas right rail)

| Surface | Scene | Hi-fi file | Notes |
|---|---|---|---|
| Panel · populated · autosave group expanded | 17.1 | `main-main-kova-scope/batch-b/chunk-b6/Kova Hi-Fi 17 Version History - Dark.html` | Header: title "Version history" + filter `≡` + add `+` + close `x` icons. Instruction strip: "Press ⌘ + ⌥ + S to add to version history while editing." Timeline: "Current version" pinned row + group head "8 autosave versions" (chevron expanded) + N autosave rows. Each row: timestamp + author avatar + name; `•••` invisible until hover. |
| Panel · populated · autosave group collapsed | 17.2 | same | Same panel; chevron flipped to collapsed; 8 autosave rows tucked under the group head. |
| Panel · mixed named + autosave | 17.3 | same | Named versions interleaved into the timeline outside the autosave group. Named row shows title + author line + timestamp underneath (autosave rows show only timestamp + author). |
| Row hover | 17.4 | same | Background lifts to `--line2`, ink to `--ink`, `•••` icon-button fades in. Same reveal pattern as the layer-row hover. |
| Row right-click dropdown | 17.5 | same | 5 items, no kbd chips: **Name this version** / **Restore this version** / **Duplicate** / **Delete version info** (disabled for autosaves — only enabled for named rows) / **Copy link**. Row stays in `active` state while menu open. Menu uses Cluster 11 Reka DropdownMenu shell. |
| Row inline rename | 17.6 | same | "Name this version" turns the row's title region into an inline text field with focus ring matching canonical `.input:focus`. Esc cancels, Enter commits. After commit the row promotes out of the autosave group and renders the new title with the author line + timestamp underneath. Reuses `use-inline-rename.ts` (§3.A in 03 doc). |
| Filter dropdown | 17.7 | same | **MVP ships only the autosave toggle** ("Show autosave versions", default ON). Per founder direction 2026-05-15 — Kova solo-MVP omits the "All / Only yours" visibility filter (Figma has no filter at all; we keep the autosave toggle because it reduces timeline noise). |
| Add-to-version-history modal · initial | 17.8 | same | `⌘ + ⌥ + S` opens this. Title field auto-focused (blue ring). Save disabled. **Supersedes the retired A8.1 Snapshot dialog** — Cluster 08's keyboard registry routes the shortcut here, not to A8.1. |
| Add-to-version-history modal · filled | 17.9 | same | Title + Description filled. Save flips to `.btn.primary`. Cancel discards; Save commits → new named row appears outside the autosave group; success toast: "Saved to version history". |
| Restore confirm modal | 17.10 | same | Triggered from row dropdown → "Restore this version". Title: "Restore this version?" Sub: "Your current canvas will be saved as a backup snapshot before restoring. You can undo with ⌘Z." Foot: ℹ "Restoring {label or formatted date}" + Cancel + **`.btn.primary` "Restore"** (non-destructive — orange `.btn.danger` is reserved for irreversible actions). |
| Empty state | 17.11 | same | `.empty-pane` from A11. "No version history yet" + "Press ⌘+⌥+S to save manually, or autosave will create one in the background." No CTA — the keyboard hint is the affordance. Rare in practice — autosave accrues immediately on edit. |

### 3.2 Trash confirm flow (DARK theme, mounted at dashboard)

| Surface | Scene | Hi-fi file | Notes |
|---|---|---|---|
| Move-to-trash confirm modal · idle | B13.1 | `main-main-kova-scope/batch-b/chunk-b2/Kova Hi-Fi 15 Trash Confirm - Dark.html` | Title: 'Move "{canvas name}" to trash?' Sub: "Restore anytime from Trash." Body: "This canvas and all of its snapshots will be moved to Trash. You can restore it from Trash whenever you want." Foot: Cancel + `.btn.danger` "Move to trash". Modal-backdrop `rgba(26,26,29,0.72)` derived from `--bg #1a1a1d`. Anchor: dashboard right-click only (founder 2026-05-09 — canvas trash entry-point removed; in-canvas file-name dropdown does NOT carry "Move to trash"). |
| Move-to-trash · CTA hover | B13.2 | same | `.btn.danger:hover` = `#d36a3a` warm-orange. Same modal shell. |
| Post-confirm · success toast | B13.3 | same | Modal closed; dashboard returns to file-grid (rendered behind the modal here is a mockup artifact — production overlays the dashboard, not the canvas). Toast: "Moved to trash. Restore anytime from Trash." `.toast.success` with `check-circle` lead glyph. |

### 3.3 Design system references

All surfaces use **dark theme** — `main-main-kova-scope/design-system/kova-hifi.css`. No light-theme surfaces in this PRD.

Component primitive classes consumed: `.dlg.sm`, `.btn`, `.btn.primary`, `.btn.danger` (B13 only), `.menu`, `.menu .item`, `.menu .item.disabled`, `.menu .sep`, `.toast.success`, `.input`, `.empty-pane`, `.modal-backdrop`. Plus three new local classes only used by this PRD:

- `.vh-timeline` — the vertical timeline container with the 1 px hairline connector + dot glyphs
- `.vh-row` — single snapshot row (state classes: idle, hover, `.active`, `.current`)
- `.vh-group-head` — collapsible "N autosave versions" header row

These three are translated to Vue components in §6.4; markup contract matches hi-fi 17 byte-for-byte.

---

## 4. Data model

### 4.1 Schema migration

Single migration file: `kova-open-pencil-1/supabase/migrations/20260615_09_canvas_snapshots.sql`.

```sql
-- ============================================================
-- Migration 20260615_09_canvas_snapshots
-- Cluster 09 Version History + Trash — snapshot table, RLS, RPCs
-- Pairs with: 20260317_m2_dashboard.sql (canvases.trashed_at already exists)
-- ============================================================

BEGIN;

-- ---- 1. canvas_snapshots table ----

CREATE TABLE IF NOT EXISTS public.canvas_snapshots (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  canvas_id           uuid NOT NULL REFERENCES public.canvases(id) ON DELETE CASCADE,
  brand_id            uuid NOT NULL REFERENCES public.brands(id)   ON DELETE CASCADE,
  user_id             uuid NOT NULL REFERENCES public.users(id),
  taken_at            timestamptz NOT NULL DEFAULT now(),
  kind                text NOT NULL CHECK (kind IN ('autosave','manual','pre_restore','disconnect','tab_close')),
  label               text,
  description         text,
  scene_blob_path     text NOT NULL,
  scene_size_bytes    bigint NOT NULL CHECK (scene_size_bytes > 0 AND scene_size_bytes <= 52428800),  -- 50 MB blob cap per 00d ratification
  thumbnail_path      text,
  parent_snapshot_id  uuid REFERENCES public.canvas_snapshots(id) ON DELETE SET NULL,
  format_version      int  NOT NULL DEFAULT 1,
  retention_class     text NOT NULL DEFAULT 'free' CHECK (retention_class IN ('free','paid','permanent'))
);

COMMENT ON TABLE public.canvas_snapshots IS
  'Per-canvas Yjs document snapshots (Kiwi-encoded + Zstd-compressed). Q7 Figma-exact: 30-min autosave + manual + pre-restore + disconnect + tab-close kinds. Retention: free-tier autosaves prune at 30 days; manual + pre_restore + paid-tier autosaves kept forever. Bytes live in Storage bucket canvas-snapshots; this row carries the path only.';

COMMENT ON COLUMN public.canvas_snapshots.kind IS
  'Trigger that produced the snapshot. autosave = 30-min heartbeat; manual = user pressed ⌥⌘S (named); pre_restore = automatic backup taken at the start of a restore operation; disconnect = navigator.onLine flipped offline; tab_close = beforeunload final snap.';

COMMENT ON COLUMN public.canvas_snapshots.retention_class IS
  'Prune-cron filter. free = autosave on free-tier user → 30-day prune. paid = autosave on paid-tier user → kept forever. permanent = manual, pre_restore, disconnect, tab_close → kept forever regardless of plan. Set by create_snapshot at insert time; Cluster 04 Stripe webhook bulk-updates free→paid on plan upgrade.';

-- ---- 2. Indexes ----

CREATE INDEX IF NOT EXISTS idx_canvas_snapshots_canvas_taken
  ON public.canvas_snapshots(canvas_id, taken_at DESC);
COMMENT ON INDEX idx_canvas_snapshots_canvas_taken IS
  'Powers the right-panel timeline list query (list_snapshots → SELECT ... WHERE canvas_id = $1 ORDER BY taken_at DESC).';

CREATE INDEX IF NOT EXISTS idx_canvas_snapshots_brand
  ON public.canvas_snapshots(brand_id);
COMMENT ON INDEX idx_canvas_snapshots_brand IS
  'Powers per-brand quota arithmetic in create_snapshot (SELECT SUM(scene_size_bytes) ... WHERE brand_id = $1).';

CREATE INDEX IF NOT EXISTS idx_canvas_snapshots_prune
  ON public.canvas_snapshots(taken_at)
  WHERE retention_class = 'free' AND kind = 'autosave';
COMMENT ON INDEX idx_canvas_snapshots_prune IS
  'Partial index — only free-tier autosaves are pruning candidates. Keeps prune-cron index scan small.';

CREATE INDEX IF NOT EXISTS idx_canvas_snapshots_user_for_account_cascade
  ON public.canvas_snapshots(user_id);
COMMENT ON INDEX idx_canvas_snapshots_user_for_account_cascade IS
  'Powers Cluster 01 delete-account-cron storage step (enumerate user-owned blob paths).';

-- ---- 3. RLS ----

ALTER TABLE public.canvas_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY snapshots_select
  ON public.canvas_snapshots
  FOR SELECT
  TO authenticated
  USING (brand_id IN (SELECT id FROM public.brands WHERE user_id = auth.uid()));

-- All writes go through SECURITY DEFINER RPCs (create_snapshot / restore_snapshot / rename_snapshot).
-- These two negative policies block any client-side bypass attempt.
CREATE POLICY snapshots_insert_blocked
  ON public.canvas_snapshots
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

CREATE POLICY snapshots_update_blocked
  ON public.canvas_snapshots
  FOR UPDATE
  TO authenticated
  USING (false) WITH CHECK (false);

CREATE POLICY snapshots_delete_blocked
  ON public.canvas_snapshots
  FOR DELETE
  TO authenticated
  USING (false);

-- ---- 4. RPCs (SECURITY DEFINER) ----

-- 4a. create_snapshot — enforces 100 MB per-brand quota; assigns retention_class
CREATE OR REPLACE FUNCTION public.create_snapshot(
  p_canvas_id       uuid,
  p_kind            text,
  p_label           text,
  p_description     text,
  p_scene_blob_path text,
  p_scene_size_bytes bigint,
  p_thumbnail_path  text,
  p_parent_snapshot_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id          uuid;
  v_brand_id         uuid;
  v_plan             text;
  v_retention_class  text;
  v_total_size       bigint;
  v_snapshot_id      uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  -- Verify canvas ownership; pin brand_id
  SELECT c.brand_id INTO v_brand_id
    FROM public.canvases c
   WHERE c.id = p_canvas_id
     AND c.user_id = v_user_id
     AND c.trashed_at IS NULL;  -- Cannot snapshot a trashed canvas
  IF v_brand_id IS NULL THEN
    RAISE EXCEPTION 'Canvas not found or not owned' USING ERRCODE = 'P0002';
  END IF;

  -- Per-brand quota: 100 MB MVP (00d ratification)
  SELECT COALESCE(SUM(scene_size_bytes), 0) INTO v_total_size
    FROM public.canvas_snapshots
   WHERE brand_id = v_brand_id;
  IF v_total_size + p_scene_size_bytes > 100 * 1024 * 1024 THEN
    RAISE EXCEPTION 'quota_exceeded' USING ERRCODE = 'P0001';
  END IF;

  -- Resolve retention_class: kind != 'autosave' → permanent;
  -- kind == 'autosave' → plan-derived (free | paid)
  IF p_kind = 'autosave' THEN
    SELECT plan INTO v_plan FROM public.users WHERE id = v_user_id;
    v_retention_class := CASE WHEN v_plan = 'free' OR v_plan IS NULL THEN 'free' ELSE 'paid' END;
  ELSE
    v_retention_class := 'permanent';
  END IF;

  INSERT INTO public.canvas_snapshots
    (canvas_id, brand_id, user_id, taken_at, kind, label, description,
     scene_blob_path, scene_size_bytes, thumbnail_path, parent_snapshot_id, retention_class)
  VALUES
    (p_canvas_id, v_brand_id, v_user_id, now(), p_kind, p_label, p_description,
     p_scene_blob_path, p_scene_size_bytes, p_thumbnail_path, p_parent_snapshot_id, v_retention_class)
  RETURNING id INTO v_snapshot_id;

  RETURN v_snapshot_id;
END;
$$;

-- 4b. restore_snapshot — atomic: pre-restore snap of current state, then return target blob path
CREATE OR REPLACE FUNCTION public.restore_snapshot(
  p_target_snapshot_id           uuid,
  p_current_scene_blob_path      text,
  p_current_scene_size_bytes     bigint,
  p_current_thumbnail_path       text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id           uuid;
  v_canvas_id         uuid;
  v_target_blob_path  text;
  v_pre_restore_id    uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  -- Verify target snapshot ownership + read its canvas_id + blob path
  SELECT s.canvas_id, s.scene_blob_path INTO v_canvas_id, v_target_blob_path
    FROM public.canvas_snapshots s
    JOIN public.brands b ON b.id = s.brand_id
   WHERE s.id = p_target_snapshot_id
     AND b.user_id = v_user_id;
  IF v_canvas_id IS NULL THEN
    RAISE EXCEPTION 'Snapshot not found or not owned' USING ERRCODE = 'P0002';
  END IF;

  -- Pre-restore snapshot of current state — kind = 'pre_restore', retention = permanent
  v_pre_restore_id := public.create_snapshot(
    v_canvas_id,
    'pre_restore',
    'Auto-saved before restore',
    NULL,
    p_current_scene_blob_path,
    p_current_scene_size_bytes,
    p_current_thumbnail_path,
    p_target_snapshot_id
  );

  -- Client downloads v_target_blob_path from Storage + swaps Yjs document.
  RETURN v_target_blob_path;
END;
$$;

-- 4c. rename_snapshot — handles "Name this version" (set label+description) AND
--     "Delete version info" (clear label+description). Pass NULL to clear.
CREATE OR REPLACE FUNCTION public.rename_snapshot(
  p_snapshot_id  uuid,
  p_label        text,
  p_description  text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id  uuid;
  v_updated  int;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  UPDATE public.canvas_snapshots
     SET label = p_label,
         description = p_description
   WHERE id = p_snapshot_id
     AND brand_id IN (SELECT id FROM public.brands WHERE user_id = v_user_id);

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated = 0 THEN
    RAISE EXCEPTION 'Snapshot not found or not owned' USING ERRCODE = 'P0002';
  END IF;
END;
$$;

-- 4d. purge_canvas_snapshot_paths — helper for Cluster 02's canvas-permanent-delete flow
-- Returns Storage object paths the caller must delete BEFORE deleting the canvas row.
-- (Canvas DELETE then FK-cascades the rows themselves; this RPC just enumerates Storage paths.)
CREATE OR REPLACE FUNCTION public.purge_canvas_snapshot_paths(
  p_canvas_id uuid
)
RETURNS text[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid;
  v_owned   boolean;
  v_paths   text[];
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  SELECT EXISTS (SELECT 1 FROM public.canvases c WHERE c.id = p_canvas_id AND c.user_id = v_user_id)
    INTO v_owned;
  IF NOT v_owned THEN
    RAISE EXCEPTION 'Canvas not found or not owned' USING ERRCODE = 'P0002';
  END IF;

  SELECT COALESCE(array_agg(scene_blob_path), '{}')
       || COALESCE(array_agg(thumbnail_path) FILTER (WHERE thumbnail_path IS NOT NULL), '{}')
    INTO v_paths
    FROM public.canvas_snapshots
   WHERE canvas_id = p_canvas_id;

  RETURN v_paths;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_snapshot(uuid, text, text, text, text, bigint, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.restore_snapshot(uuid, text, bigint, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rename_snapshot(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.purge_canvas_snapshot_paths(uuid) TO authenticated;

COMMIT;
```

**Notes on this migration:**

1. **No migration for `canvases.trashed_at`** — already exists from M2 (`20260317_m2_dashboard.sql`). Verified via `project_pre_prd_audit_ratified` memory.
2. **`scene_size_bytes` CHECK** enforces the 50 MB per-blob cap server-side (defense-in-depth; client also enforces via upload-size guard).
3. **`retention_class` is plan-state at insert time**, not a live join — fast prune query, but means Cluster 04 must fire a bulk UPDATE on plan upgrade. The alternative (joining `users.plan` at every prune run) would lose the ability for Cluster 04 to set a downgrade grace window via the same UPDATE path (see §12.2).
4. **`parent_snapshot_id` ON DELETE SET NULL** — if a pre-restore's parent is somehow deleted (admin tool, future flow), the orphan keeps its data and just loses its parent link.
5. **`SECURITY DEFINER` + `SET search_path`** on every RPC follows the Cluster 01 pattern and the OWASP recommendation for SECURITY DEFINER hygiene.
6. **`create_snapshot` rejects trashed canvases** — autosnapshot heartbeat MUST stop when a canvas is trashed mid-session (see §6.3 composable behavior).

### 4.2 RLS policies

| Table | Policy | Purpose |
|---|---|---|
| `public.canvas_snapshots` | `snapshots_select` (FOR SELECT TO authenticated USING brand-ownership) | Users read only snapshots for canvases they own (via their brands). |
| `public.canvas_snapshots` | `snapshots_insert_blocked` / `snapshots_update_blocked` / `snapshots_delete_blocked` (FOR INSERT/UPDATE/DELETE TO authenticated WITH CHECK false / USING false) | Hard-block direct client writes. All mutations go through the 3 SECURITY DEFINER RPCs (create_snapshot / restore_snapshot / rename_snapshot). |

`service_role` automatically bypasses RLS (Supabase default) — used by the prune cron via the server-side SDK.

### 4.3 Storage bucket

New private bucket: **`canvas-snapshots`**.

**Path layout** (every object lives under `{user_id}/` so Cluster 01's account-deletion cascade can mass-delete with a single path-prefix `canvas-snapshots/{user_id}/**`):

```
canvas-snapshots/
  {user_id}/
    {brand_id}/
      {canvas_id}/
        {snapshot_id}.kiwi.zst              ← Yjs doc bytes, Kiwi-encoded + Zstd-compressed
    thumbnails/
      {brand_id}/
        {canvas_id}/
          {snapshot_id}.png                  ← ~150×150 PNG via editor.ts.captureThumbnail
```

**Bucket config:**

| Setting | Value | Why |
|---|---|---|
| Public | NO | All access is via signed URLs from the client; bucket is fully private |
| File size limit | `52428800` bytes (50 MB) | Matches `scene_size_bytes` CHECK; 00d ratification |
| Allowed MIME types | `application/octet-stream` (for `.kiwi.zst`) + `image/png` (for thumbnails) | Restrict to expected formats |

**Storage RLS (path-prefix policy):**

```sql
-- Bucket policy: users SELECT (download via signed URL) only their own objects
CREATE POLICY "canvas-snapshots: select own"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'canvas-snapshots'
     AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "canvas-snapshots: insert own"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'canvas-snapshots'
          AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "canvas-snapshots: delete own"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'canvas-snapshots'
     AND (storage.foldername(name))[1] = auth.uid()::text);
```

`service_role` bypasses RLS — used by `snapshot-prune` cron to delete pruned blobs.

**Signed-URL TTL:** 10 minutes for read (long enough to download a 50 MB blob on a slow connection), 30 seconds for write (upload immediately after URL generation).

**Provisioning:** bucket created via Supabase CLI migration in the same release as the table migration. SQL:

```sql
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('canvas-snapshots', 'canvas-snapshots', false, 52428800,
        ARRAY['application/octet-stream', 'image/png'])
ON CONFLICT (id) DO NOTHING;
```

---

## 5. Backend

### 5.1 Edge Functions

Two Vercel Functions under `kova-open-pencil-1/api/`. Fluid Compute runtime (matches PRD 01 + M9 pattern). Idempotency-key handling per Cluster 11 cross-cut.

---

#### 5.1.1 `POST /api/snapshots/duplicate-to-canvas`

```typescript
// kova-open-pencil-1/api/snapshots/duplicate-to-canvas.ts
// Method:      POST
// Auth:        Supabase JWT (verifyAuth shared helper)
// Headers:     Authorization: Bearer <jwt>
//              X-Idempotency-Key: <uuid v4>            (optional; recommended)
// Body:        { snapshot_id: uuid, target_brand_id?: uuid }  (omit target_brand_id → reuse snapshot's brand)
// Response 200: { canvas_id: uuid, redirect_to: '/canvas/{canvas_id}' }
// Response 401: { error: 'unauthenticated' }
// Response 403: { error: 'snapshot_not_owned' | 'target_brand_not_owned' }
// Response 404: { error: 'snapshot_not_found' }
// Response 500: { error: 'internal_error', request_id }
// Side effects:
//   1. Reads the snapshot row (RLS-gated SELECT via the user's JWT) — verifies ownership + reads scene_blob_path
//   2. Downloads the blob from Storage via service-role signed URL (Edge has service_role; client doesn't)
//   3. Calls Cluster 02's create_canvas RPC with name = COALESCE(snapshot.label, formatted_taken_at) + ' (copy)' and target brand
//   4. Uploads the same blob bytes to the new canvas's initial-state path (Cluster 02 + Yjs y-indexeddb layer reads this on first open — see §11)
//   5. Inserts a "manual" snapshot row on the new canvas pointing at the uploaded blob, label = 'Duplicated from {original}'
//   6. Returns the new canvas_id; client routes to /canvas/{canvas_id}
// Idempotency: idempotency-key keyed on (user_id, snapshot_id) within 5 minutes → returns same new canvas_id on retry
// Rate limit: 10 req/min/user (cheap to do; high enough to not get in the way)
```

Why an Edge Function and not an RPC: the duplicate flow crosses three boundaries — read a Storage blob (requires SDK), call another cluster's RPC (`create_canvas`), and upload to Storage again. SQL alone can't orchestrate this. Edge keeps it transactional from the user's POV.

---

#### 5.1.2 `POST /api/cron/snapshot-prune`

```typescript
// kova-open-pencil-1/api/cron/snapshot-prune.ts
// Method:      POST
// Auth:        Vercel Cron secret (Authorization: Bearer ${CRON_SECRET})
// Body:        {}
// Response 200: { scanned: n, pruned: n, storage_failures: n }
// Response 401: { error: 'unauthorized' }
// Schedule:    daily at 04:00 UTC (Vercel Cron via vercel.json — see §5.3)
//
// Algorithm (idempotent, batched):
//   1. Begin TX
//   2. SELECT id, scene_blob_path, thumbnail_path
//        FROM canvas_snapshots
//       WHERE retention_class = 'free'
//         AND kind = 'autosave'
//         AND taken_at < now() - INTERVAL '30 days'
//       ORDER BY taken_at ASC
//       LIMIT 1000
//       FOR UPDATE SKIP LOCKED;   -- protects against cron overlap
//   3. For each chunk of 100 paths: supabase.storage.from('canvas-snapshots').remove([paths])
//      (Storage API supports batch remove up to ~1000 paths per call; we chunk to 100 to keep payloads small.)
//      Track storage_failures count for any 4xx/5xx but proceed.
//   4. DELETE FROM canvas_snapshots WHERE id = ANY(returned_ids)
//      (Storage failures do NOT block DB delete — orphan blobs get retried next run via a sweep step;
//       see "Step 5" below)
//   5. Sweep step (every 7th day): list all objects in canvas-snapshots/ via Storage API + diff against
//      canvas_snapshots.scene_blob_path. Anything in Storage not referenced in DB → delete. Cheap
//      garbage collection.
//   6. COMMIT
//
// Idempotency: set-based DELETE WHERE taken_at < cutoff is naturally idempotent; FOR UPDATE SKIP LOCKED
//              prevents two cron runs from racing on the same rows.
//
// Failure mode: if Storage API is down, rows are not deleted (kept for next run); no data loss.
```

---

### 5.2 RPCs (database functions)

Ship in the migration in §4.1. Repeated here for §-cross-reference visibility:

| Function | Args | Returns | Security | Caller |
|---|---|---|---|---|
| `create_snapshot(p_canvas_id uuid, p_kind text, p_label text, p_description text, p_scene_blob_path text, p_scene_size_bytes bigint, p_thumbnail_path text, p_parent_snapshot_id uuid)` | uuid, text, text, text, text, bigint, text, uuid | `uuid` (new snapshot id) | `SECURITY DEFINER` | `useSnapshotsStore.create()` (autosnapshot + manual save), `restore_snapshot` (calls itself for pre-restore), `duplicate-to-canvas` Edge Function |
| `restore_snapshot(p_target_snapshot_id uuid, p_current_scene_blob_path text, p_current_scene_size_bytes bigint, p_current_thumbnail_path text)` | uuid, text, bigint, text | `text` (target blob path; client downloads + Yjs-swaps) | `SECURITY DEFINER` | `useSnapshotsStore.restore()` |
| `rename_snapshot(p_snapshot_id uuid, p_label text, p_description text)` | uuid, text, text | `void` | `SECURITY DEFINER` | `useSnapshotsStore.rename()` (covers Name + Delete-version-info) |
| `purge_canvas_snapshot_paths(p_canvas_id uuid)` | uuid | `text[]` (Storage paths for caller to delete) | `SECURITY DEFINER` | Cluster 02 canvas-permanent-delete flow (the actual canvas DELETE then cascades the snapshot rows themselves) |

`GRANT EXECUTE ... TO authenticated` on all four. Anonymous role cannot call.

`list_snapshots` is **not** an RPC — direct supabase-js `from('canvas_snapshots').select(...).eq('canvas_id', id).order('taken_at', { ascending: false })` is sufficient; RLS via `snapshots_select` policy gates ownership.

### 5.3 Cron jobs

| Name | Schedule | Function path | Retry policy | Idempotency | Lock | Owner |
|---|---|---|---|---|---|---|
| `snapshot-prune` | `0 4 * * *` (daily 04:00 UTC) | `/api/cron/snapshot-prune` | Set-based DELETE is naturally retriable; Storage failures sweep next run | `WHERE taken_at < cutoff AND retention_class = 'free' AND kind = 'autosave'` | `SELECT ... FOR UPDATE SKIP LOCKED` chunks of 1000 | Cluster 09 |

Vercel Cron config in `kova-open-pencil-1/vercel.json` (extending the file Cluster 01 already populated):

```json
{
  "crons": [
    { "path": "/api/cron/delete-account", "schedule": "0 3 * * *" },
    { "path": "/api/cron/snapshot-prune", "schedule": "0 4 * * *" }
  ]
}
```

Cron-secret authentication: `Authorization: Bearer ${CRON_SECRET}`. `CRON_SECRET` is server-only (already provisioned by Cluster 01; no new env var).

**Why 04:00 UTC** — Cluster 01's `delete-account-cron` runs at 03:00 UTC. Snapshot prune runs an hour later so the two cron jobs don't share a peak window. Vercel's free tier allows the spacing easily.

### 5.4 External integrations

| Integration | SDK / version | What this PRD uses | Webhooks |
|---|---|---|---|
| **Supabase Storage** | `@supabase/supabase-js` (already installed) | `storage.from('canvas-snapshots').createSignedUploadUrl()` (client write), `createSignedUrl()` (client read), `remove()` (cron + canvas-permanent-delete) | None |
| **Supabase Postgres (RPC)** | same SDK | `rpc('create_snapshot' \| 'restore_snapshot' \| 'rename_snapshot' \| 'purge_canvas_snapshot_paths', ...)` | None |
| **Yjs + Kiwi + Zstd** | existing engine deps (`yjs`, `kiwi-schema`, `@bokuweb/zstd-wasm` per OpenPencil `packages/core/codec/`) | Encode `editor.graph` to `Uint8Array` via `editor.ts.snapshotPage()` → Kiwi binary → Zstd compress → upload to Storage. Restore reverses. | n/a (lib) |
| **Vercel Cron** | platform | `snapshot-prune` schedule | n/a |

#### 5.4.1 Yjs snapshot encoding contract

`packages/core/` already exposes `editor.ts.snapshotPage(pageId): Uint8Array` and `restorePageFromSnapshot(pageId, bytes): void` per existing codec (Q7 implementation impact line). This PRD wraps those:

```typescript
// src/composables/version-history/use-snapshot-codec.ts (NEW, app-level — does NOT modify packages/core)
//
// encodeCanvasSnapshot(editor: EditorAPI): Promise<{ bytes: Uint8Array; size_bytes: number }>
//   1. Collect Uint8Array for every page in the canvas via editor.snapshotPage(pageId)
//   2. Concatenate into a single Kiwi-encoded envelope { format: 'kova/canvas-snapshot/v1', pages: [...] }
//   3. Zstd compress (level 3 — fast + ~10× reduction for typical email-canvas docs)
//   4. Return bytes + size
//
// decodeCanvasSnapshot(bytes: Uint8Array): Promise<{ format_version: number; pages: PageSnap[] }>
//   1. Zstd decompress
//   2. Kiwi decode
//   3. Return pages array for the consumer (editor.restorePageFromSnapshot loops)
//
// Edge cases:
//   - format_version mismatch → throw 'format_version_unsupported' (Phase 2 may add migration shims)
//   - empty pages array → throw 'malformed_snapshot' (defensive — should never happen given server-side size check)
```

The `format_version` column on `canvas_snapshots` is set to 1 by default. Future engine changes that break the Kiwi schema must bump format_version + ship a decoder shim or refuse to restore (with a user-facing message) rather than silently corrupt state.

### 5.5 Compliance + docs deliverables

| Deliverable | Location | Purpose |
|---|---|---|
| Privacy Policy update | `kova-open-pencil-1/docs/legal/privacy-policy.md` (Cluster 01 publishes) | Add one sentence: "Snapshots of your design state are stored in our private Supabase Storage bucket and retained per your plan tier (30 days free, indefinite paid). Account deletion permanently removes all snapshots." |
| RoPA update | `kova-open-pencil-1/docs/legal/ropa.md` (Cluster 01 publishes) | Add `canvas_snapshots` data category + retention table |
| `canvases.trashed_at` semantics doc | inline `COMMENT ON COLUMN` in this migration referencing the existing column (we add a comment, not the column) | Clarifies that trashed canvases keep their snapshots (Q19 indefinite retention) |

---

## 6. Frontend

### 6.1 Routes (Vue Router)

**Zero new routes.** The version-history panel mounts inside the existing `/canvas/:canvasId` route via Cluster 06's right-panel slot. Deep-link to a specific version uses an existing route plus a query param: `/canvas/{id}?version={snapshot_id}` — when this query is present, the canvas opens with the version-history panel open and the matching row focused in `preview` state.

Trash flows happen entirely on dashboard routes owned by Cluster 02 (`/dashboard`); this PRD ships only the modal component that 02 mounts.

### 6.2 Pinia stores

```typescript
// kova-open-pencil-1/src/stores/snapshots.ts (NEW)
// Single store per domain (CLAUDE.md convention). Composition API setup style.

export interface Snapshot {
  id: string
  canvas_id: string
  brand_id: string
  user_id: string
  taken_at: string                // ISO8601
  kind: 'autosave' | 'manual' | 'pre_restore' | 'disconnect' | 'tab_close'
  label: string | null
  description: string | null
  scene_blob_path: string
  scene_size_bytes: number
  thumbnail_path: string | null
  parent_snapshot_id: string | null
  format_version: number
  retention_class: 'free' | 'paid' | 'permanent'
}

export const useSnapshotsStore = defineStore('snapshots', () => {
  // ---- State ----
  const byCanvasId   = reactive<Record<string, Snapshot[]>>({})     // canvas_id → sorted desc by taken_at
  const loadingByCanvas = reactive<Record<string, boolean>>({})
  const previewingId = ref<string | null>(null)                     // when set, canvas renders this snapshot read-only
  const panelOpen    = ref<boolean>(false)                          // version-history panel open?
  const addDialogOpen = ref<boolean>(false)                         // ⌥⌘S modal open?
  const showAutosaves = ref<boolean>(true)                          // 17.7 filter toggle (default ON)

  // ---- Getters ----
  const forCanvas = (canvasId: string) => computed(() => byCanvasId[canvasId] ?? [])
  const namedFor = (canvasId: string) => computed(() =>
    (byCanvasId[canvasId] ?? []).filter(s => s.kind === 'manual' || (s.kind === 'pre_restore' && s.label))
  )
  const autosavesFor = (canvasId: string) => computed(() =>
    (byCanvasId[canvasId] ?? []).filter(s => s.kind !== 'manual')
  )
  const visibleFor = (canvasId: string) => computed(() => {
    const all = byCanvasId[canvasId] ?? []
    return showAutosaves.value ? all : all.filter(s => s.kind === 'manual' || s.label)
  })

  // ---- Actions ----
  async function list(canvasId: string): Promise<void> { /* RLS-gated SELECT */ }

  async function create(args: {
    canvasId: string
    kind: Snapshot['kind']
    label?: string
    description?: string
    parentSnapshotId?: string
  }): Promise<{ ok: true; id: string } | { ok: false; reason: 'quota_exceeded' | 'unauthenticated' | 'canvas_trashed' | 'unknown' }> {
    // 1. encodeCanvasSnapshot(editor) → bytes + size
    // 2. Generate thumbnail via editor.captureThumbnail()
    // 3. getSignedUploadUrl(scene_blob_path) + upload bytes
    // 4. getSignedUploadUrl(thumbnail_path) + upload PNG
    // 5. supabase.rpc('create_snapshot', { ... })
    // 6. Push the new row into byCanvasId[canvasId]
    // 7. Toast on success; on 'quota_exceeded' → non-blocking warning toast
  }

  async function restore(snapshotId: string): Promise<{ ok: true } | { ok: false; reason: string }> {
    // 1. First encode the CURRENT scene state (for the pre-restore snapshot inserted by the RPC)
    //    encodeCanvasSnapshot(editor) → upload current bytes to a temp Storage path
    // 2. supabase.rpc('restore_snapshot', { ... }) → returns target blob path
    // 3. Download target blob via signed URL
    // 4. decodeCanvasSnapshot(bytes) → restorePageFromSnapshot for each page
    // 5. editor.pushUndoEntry({ kind: 'restore-from-snapshot', preRestoreId }) so ⌘Z reverses
    // 6. Toast: "Restored to {label or formatted date}"
  }

  async function rename(snapshotId: string, label: string | null, description: string | null): Promise<void> {
    // RPC call; also covers "Delete version info" with label=null, description=null
  }

  async function duplicateToCanvas(snapshotId: string): Promise<{ canvas_id: string }> {
    // POST /api/snapshots/duplicate-to-canvas → return new canvas_id
  }

  function copyLink(snapshotId: string, canvasId: string): void {
    // Build /canvas/{canvasId}?version={snapshotId} absolute URL → navigator.clipboard.writeText
    // Toast: "Link copied to clipboard"
  }

  async function getSignedThumbnailUrl(thumbnailPath: string): Promise<string> { /* 10-min TTL */ }
  async function getSignedBlobUrl(blobPath: string): Promise<string> { /* 10-min TTL */ }

  function previewSnapshot(snapshotId: string): void { previewingId.value = snapshotId }
  function exitPreview(): void { previewingId.value = null }

  function openPanel(): void { panelOpen.value = true }
  function closePanel(): void { panelOpen.value = false; exitPreview() }
  function openAddDialog(): void { addDialogOpen.value = true }
  function closeAddDialog(): void { addDialogOpen.value = false }

  return {
    byCanvasId, loadingByCanvas, previewingId, panelOpen, addDialogOpen, showAutosaves,
    forCanvas, namedFor, autosavesFor, visibleFor,
    list, create, restore, rename, duplicateToCanvas, copyLink,
    getSignedThumbnailUrl, getSignedBlobUrl,
    previewSnapshot, exitPreview, openPanel, closePanel, openAddDialog, closeAddDialog,
  }
})
```

### 6.3 Composables

| Composable | File | Signature | Used by |
|---|---|---|---|
| `useAutosnapshot` | `src/composables/version-history/use-autosnapshot.ts` | `(canvasId: Ref<string>, isActive: Ref<boolean>): { start(): void; stop(): void; lastSnapAt: ComputedRef<Date \| null> }` | Mount in canvas view; starts on canvas open, stops on canvas close OR when canvas is trashed mid-session |
| `useSnapshotCodec` | `src/composables/version-history/use-snapshot-codec.ts` | `{ encodeCanvasSnapshot(editor): Promise<{ bytes: Uint8Array; size_bytes: number }>; decodeCanvasSnapshot(bytes): Promise<{ pages: PageSnap[] }> }` | `useSnapshotsStore.create()` + `.restore()` |
| `useSnapshotThumbnail` | `src/composables/version-history/use-snapshot-thumbnail.ts` | `(editor): { capture(): Promise<Uint8Array> }` — wraps `editor.captureThumbnail()` to 150×150 PNG | `useSnapshotsStore.create()` |
| `useRestoreUndo` | `src/composables/version-history/use-restore-undo.ts` | `(): { pushRestoreEntry(opts: { preRestoreSnapshotId: string }): void }` — pushes a custom entry into `editor.undoStack` | `useSnapshotsStore.restore()` |
| `useVersionHistoryShortcut` | `src/composables/version-history/use-version-history-shortcut.ts` | `(): void` — registers `Alt+Meta+KeyS` (Mac) / `Alt+Control+KeyS` (Win) → `useSnapshotsStore.openAddDialog()` via Cluster 08 keyboard registry | Mount once at canvas view |
| `useDeepLinkedVersion` | `src/composables/version-history/use-deep-linked-version.ts` | `(): void` — reads `?version=` query param on canvas mount; if present, opens VH panel + scrolls to + previews that snapshot | `CanvasView.vue` |

#### 6.3.1 Autosnapshot heartbeat detail

```typescript
// kova-open-pencil-1/src/composables/version-history/use-autosnapshot.ts
//
// LIFECYCLE EVENTS (per Q7 Figma-exact + 00e 2.C.8 ratified):
//
//   1. Interval — every 30 minutes while canvas open + active tab + online
//      - Pause on blur, resume on focus (matches 00e 2.C.8)
//      - Skip if Yjs state-vector hasn't changed since last snap (no edits = no work)
//
//   2. beforeunload — final snapshot on tab close
//      - Encode synchronously (browser may kill the tab before async resolves)
//      - Skip the size/quota check at the client; let the RPC reject on the server next session
//      - kind = 'tab_close'
//
//   3. navigator.onLine = false → kind = 'disconnect'
//      - Best-effort upload may fail; bytes are persisted to y-indexeddb regardless
//      - On reconnect, retry the upload; success → row inserted with the original taken_at timestamp
//
//   4. ⌥⌘S — opens the AddVersionDialog (NOT an immediate snap; user types label/description first)
//      - Implementation: Cluster 08 keyboard registry calls useSnapshotsStore.openAddDialog()
//
// SKIP-IF-UNCHANGED CHECK:
//   Track yjsDoc.getStateVector() at last snap. If current state vector matches → no-op.
//   This avoids 30-min snaps that contain zero changes (user idle on the canvas).
//
// STOP CONDITIONS:
//   - Canvas is closed (component unmount)
//   - Canvas is trashed via dashboard (subscribe to useCanvasesStore.trashedAt for current canvas)
//   - User signs out
//
// FAILURE SURFACE:
//   - Quota_exceeded → non-blocking toast: "Snapshot quota reached (100 MB per brand). Upgrade to paid for unlimited history."
//   - Network failure → silent retry up to 3 times with exponential backoff; on final failure → toast: "Snapshot failed to save remotely. Local autosave still works."
```

### 6.4 Components

#### 6.4.1 Version-history components

| Component | File | Hi-fi scene | Props | Slots | Emits |
|---|---|---|---|---|---|
| `SnapshotTimelinePanel` | `src/components/version-history/SnapshotTimelinePanel.vue` | 17.1 / 17.2 / 17.3 / 17.11 | `canvasId: string` | none | `close` (when × clicked) |
| `SnapshotRow` | `src/components/version-history/SnapshotRow.vue` | 17.4 / 17.5 / 17.6 | `snapshot: Snapshot`, `isActive: boolean`, `isCurrent: boolean` | none | `restore-clicked`, `rename-clicked`, `duplicate-clicked`, `copy-link-clicked`, `delete-info-clicked`, `preview` |
| `AutosaveGroupHead` | `src/components/version-history/AutosaveGroupHead.vue` | 17.1 / 17.2 (group head) | `count: number`, `collapsed: boolean` | none | `toggle` |
| `AddVersionDialog` | `src/components/version-history/AddVersionDialog.vue` | 17.8 / 17.9 | (none — uses store) | none | `saved`, `cancelled` |
| `RestoreConfirmModal` | `src/components/version-history/RestoreConfirmModal.vue` | 17.10 | `snapshot: Snapshot` | none | `confirmed`, `cancelled` |
| `SnapshotEmptyState` | `src/components/version-history/SnapshotEmptyState.vue` | 17.11 | none | none | none |
| `FilterDropdown` | `src/components/version-history/FilterDropdown.vue` | 17.7 (autosave toggle only) | `showAutosaves: boolean` | none | `update:showAutosaves` |
| `CurrentVersionRow` | `src/components/version-history/CurrentVersionRow.vue` | 17.1 (top row of timeline) | none | none | none |

**`SnapshotRow` 5-item dropdown logic** (matches Figma 1:1; verified `help.figma.com/hc/en-us/articles/360038006754`):

| Item | Behavior | Enabled when |
|---|---|---|
| Name this version | Activates inline rename (17.6) | Always |
| Restore this version | Opens `<RestoreConfirmModal>` | Always |
| Duplicate | `useSnapshotsStore.duplicateToCanvas(snapshot.id)` → router.push(`/canvas/{new_id}`) | Always |
| Delete version info | `useSnapshotsStore.rename(snapshot.id, null, null)` (clears label + description; row demotes back into autosave group) | Only when `snapshot.kind === 'manual'` (named) OR `snapshot.label !== null` |
| Copy link | `useSnapshotsStore.copyLink(snapshot.id, canvas.id)` | Always |

#### 6.4.2 Trash component

| Component | File | Hi-fi scene | Props | Slots | Emits |
|---|---|---|---|---|---|
| `TrashConfirmModal` | `src/components/trash/TrashConfirmModal.vue` | B13.1 / B13.2 | `canvasName: string` | none | `confirmed`, `cancelled` |

**Mounting:** Cluster 02's dashboard view imports `<TrashConfirmModal>` and wires it through Cluster 11's `useConfirm()`:

```typescript
// Cluster 02 dashboard usage example (not in this PRD's code, shown for cross-cut clarity):
const { confirm } = useConfirm()
async function onMoveToTrash(canvas: Canvas) {
  const ok = await confirm({
    component: TrashConfirmModal,
    props: { canvasName: canvas.name },
  })
  if (ok) await canvasesStore.moveToTrash(canvas.id)
}
```

This PRD ships the modal markup + the confirm/cancel emit contract. Cluster 02 owns the right-click trigger + post-confirm `moveToTrash` call + post-success toast.

### 6.5 Drag-and-drop handlers

N/A for this cluster.

---

## 7. Tool layer / canvas-engine touches

**Read-only consumer of `packages/core/`.** This PRD does NOT modify `packages/core/`. It calls the following existing APIs (verified to exist per `q1-5-answers` tech-stack table + 03-doc §2.11 row):

| API | File | Used by | Purpose |
|---|---|---|---|
| `editor.snapshotPage(pageId): Uint8Array` | `packages/core/src/editor.ts` | `useSnapshotCodec.encodeCanvasSnapshot` | Serialize one page's Yjs state to bytes |
| `editor.restorePageFromSnapshot(pageId, bytes): void` | same | `useSnapshotsStore.restore()` | Re-hydrate Yjs from bytes |
| `editor.captureThumbnail(): Promise<Uint8Array>` | same | `useSnapshotThumbnail` | 150×150 PNG of current canvas |
| `editor.getStateVector(): Uint8Array` | same | `useAutosnapshot` skip-if-unchanged | CRDT state-vector compare |
| `editor.pushUndoEntry(entry): void` | same | `useRestoreUndo` | Push the restore op so `⌘Z` reverses |
| `editor.graph` (Yjs Doc) | same | observation only | Watching mutations to schedule autosnap |

No SceneNode additions, no renderer changes, no new tools. The lock on `packages/core/` (per CLAUDE.md hard constraint) stays intact.

---

## 8. Acceptance criteria

Every line is testable. No "feels right."

### 8.1 Schema + RLS

- [ ] Migration `20260615_09_canvas_snapshots` applies cleanly on a fresh local Supabase
- [ ] `canvas_snapshots` table has all 13 columns with stated types + CHECKs
- [ ] All 4 indexes exist with correct partial-index predicates
- [ ] RLS is enabled on `canvas_snapshots`
- [ ] `authenticated` role can SELECT only rows where `brand_id` belongs to the user (verified via JWT-impersonated SELECT)
- [ ] `authenticated` role CANNOT INSERT / UPDATE / DELETE directly (verified via JWT-impersonated mutation attempts — all return 0 rows or error)
- [ ] `service_role` can read + write + delete (cron path)
- [ ] `canvas-snapshots` Storage bucket exists with `public = false`, 50 MB size limit, MIME allowlist
- [ ] Storage RLS: `authenticated` role can only INSERT / SELECT / DELETE objects under `canvas-snapshots/{auth.uid()}/` prefix

### 8.2 RPCs

- [ ] `create_snapshot` inserts a row + returns its id when called with valid args
- [ ] `create_snapshot` raises `quota_exceeded` when the user's brand total would exceed 100 MB
- [ ] `create_snapshot` raises `Canvas not found or not owned` when called with a canvas owned by another user
- [ ] `create_snapshot` raises when called against a trashed canvas (`canvases.trashed_at IS NOT NULL`)
- [ ] `create_snapshot` sets `retention_class = 'free'` when user.plan = `'free'` or NULL AND kind = `'autosave'`
- [ ] `create_snapshot` sets `retention_class = 'paid'` when user.plan = `'solo'` or `'agency'` AND kind = `'autosave'`
- [ ] `create_snapshot` sets `retention_class = 'permanent'` when kind ∈ `('manual','pre_restore','disconnect','tab_close')` regardless of plan
- [ ] `restore_snapshot` creates a pre-restore snapshot of the current state BEFORE returning the target blob path
- [ ] The pre-restore snapshot has `kind = 'pre_restore'`, `retention_class = 'permanent'`, `label = 'Auto-saved before restore'`, `parent_snapshot_id = target.id`
- [ ] `restore_snapshot` returns the target blob path (text) — client uses it to download from Storage
- [ ] `restore_snapshot` raises when called against another user's snapshot
- [ ] `rename_snapshot` sets label + description; passing NULL for both clears them (= Delete version info behavior)
- [ ] `rename_snapshot` raises when called against another user's snapshot
- [ ] `purge_canvas_snapshot_paths` returns an array of every blob + thumbnail path for the canvas's snapshots
- [ ] `purge_canvas_snapshot_paths` raises when called against another user's canvas

### 8.3 Edge Functions

- [ ] `POST /api/snapshots/duplicate-to-canvas` requires a valid JWT (401 otherwise)
- [ ] On success, returns `{ canvas_id, redirect_to }`; client navigates and the new canvas opens at the duplicated state
- [ ] The duplicated canvas's initial snapshot row is labeled `Duplicated from {original label or formatted date}`
- [ ] Idempotency key dedups within a 5-minute window (same `snapshot_id` + key → same `canvas_id` returned)
- [ ] `POST /api/cron/snapshot-prune` requires `Authorization: Bearer ${CRON_SECRET}`; 401 otherwise
- [ ] Cron deletes only rows where `retention_class = 'free' AND kind = 'autosave' AND taken_at < now() - INTERVAL '30 days'`
- [ ] Cron does NOT delete `manual`, `pre_restore`, `disconnect`, `tab_close`, or any `retention_class IN ('paid','permanent')` rows even if they're older than 30 days
- [ ] After cron deletes a row, the corresponding Storage objects (blob + thumbnail if present) are removed
- [ ] If the Storage API fails, the DB row stays + the sweep step on the 7th day reconciles orphans

### 8.4 Autosnapshot heartbeat

- [ ] Autosnapshot fires on canvas open + every 30 minutes while the tab is active and the user is online
- [ ] Autosnapshot pauses on `window.blur` and resumes on `window.focus` (verified via DOM event injection)
- [ ] Autosnapshot fires on `beforeunload` (tab close) with `kind = 'tab_close'`
- [ ] Autosnapshot fires when `navigator.onLine` flips to false (kind = `'disconnect'`); a fresh attempt fires on reconnect
- [ ] Autosnapshot SKIPS the cycle when `editor.getStateVector()` hasn't changed since the last successful snap (verified by inserting an idle 30-min window and asserting no new row)
- [ ] Autosnapshot stops entirely when the canvas is trashed mid-session (verified by setting `canvases.trashed_at` from another tab and asserting no further rows)
- [ ] `quota_exceeded` from `create_snapshot` surfaces as a non-blocking toast and the heartbeat keeps trying every interval (so a quota bump or paid upgrade resumes saves without a refresh)

### 8.5 Version-history panel UI

- [ ] Pressing `⌥⌘S` opens `<AddVersionDialog>`; Save is disabled until Title is non-empty
- [ ] Saving a manual snapshot inserts a row with `kind = 'manual'`, the typed label + description, and shows a success toast
- [ ] The panel renders the timeline matching hi-fi 17.1 (group expanded), 17.2 (group collapsed), 17.3 (named + autosave interleaved)
- [ ] Row hover reveals the `•••` icon-button (17.4)
- [ ] Right-clicking a row OR clicking `•••` opens the 5-item dropdown (17.5); Delete Version Info is disabled when row is a pure autosave (no label)
- [ ] "Name this version" turns the title region into an inline text field (17.6); Esc cancels, Enter commits via `rename_snapshot`
- [ ] After a successful rename, the row promotes out of the autosave group (per 17.3 layout — named row shows title + author line + timestamp)
- [ ] "Restore this version" opens `<RestoreConfirmModal>` (17.10); confirm → `restore_snapshot` RPC → blob download → Yjs swap → toast "Restored to {label or formatted date}"
- [ ] After restore, `⌘Z` reverses the restore (Yjs undo entry pushed)
- [ ] "Duplicate" → `/api/snapshots/duplicate-to-canvas` → router navigates to new canvas with the snapshot state hydrated
- [ ] "Copy link" copies `/canvas/{id}?version={snapshot_id}` to clipboard + shows toast "Link copied"
- [ ] "Delete version info" on a named row → `rename_snapshot(id, null, null)` → row visually demotes back into the autosave group
- [ ] Filter dropdown (17.7) shows ONLY the "Show autosave versions" toggle (default ON); MVP omits the "All / Only yours" visibility filter
- [ ] Toggling "Show autosave versions" off hides the autosave-group rows; named rows remain (verified by snapshot of DOM after toggle)
- [ ] Empty state (17.11) renders when zero rows exist for the canvas

### 8.6 Deep-linked version preview

- [ ] Visiting `/canvas/{id}?version={snapshot_id}` opens the canvas with the VH panel open and the row focused
- [ ] The canvas renders the snapshot's state read-only (no edits possible) until the user either restores or closes the panel
- [ ] Closing the panel (`x`) reverts to the live canvas state — no data is mutated by preview
- [ ] If `snapshot_id` is invalid or owned by another user, the panel opens with an empty preview overlay + toast "Version not found"

### 8.7 Trash modal

- [ ] `<TrashConfirmModal>` renders with the exact copy from B13.1: title `Move "{name}" to trash?`, sub "Restore anytime from Trash.", body "This canvas and all of its snapshots will be moved to Trash. You can restore it from Trash whenever you want.", primary `.btn.danger` "Move to trash"
- [ ] Modal backdrop is `rgba(26,26,29,0.72)` (not the banned warm-brown variant)
- [ ] Hover on the destructive CTA renders the `#d36a3a` warm-orange treatment (B13.2)
- [ ] Confirm emits → caller (Cluster 02) invokes `useCanvasesStore.moveToTrash(canvasId)`
- [ ] On success, the toast "Moved to trash. Restore anytime from Trash." appears (B13.3)
- [ ] Trashed canvases keep their snapshots — verified by `SELECT count(*) FROM canvas_snapshots WHERE canvas_id = $1` before vs after `moveToTrash` (no change)

### 8.8 Per-canvas permanent delete (cross-cut)

- [ ] When Cluster 02's permanent-delete flow runs, it calls `purge_canvas_snapshot_paths(canvas_id)` and removes the returned Storage objects BEFORE deleting the canvas row
- [ ] After the canvas row DELETE, FK cascade removes all `canvas_snapshots` rows for that canvas (verified by row count)
- [ ] If `purge_canvas_snapshot_paths` raises (not owned), the cascade is aborted; no canvas deletion happens

### 8.9 Account deletion cascade (cross-cut to 01)

- [ ] Cluster 01's `delete-account-cron` `storage` step deletes every object under `canvas-snapshots/{user_id}/**` for the user being purged
- [ ] After the `db` step deletes `users`, the `canvas_snapshots` rows for that user cascade via FK on `user_id` (verified by row count in integration test that seeds + invokes the cron)

### 8.10 Security

- [ ] `CRON_SECRET` is server-only (no `VITE_` prefix)
- [ ] Signed URLs for snapshot blobs expire in ≤10 minutes
- [ ] Signed UPLOAD URLs for snapshot blobs expire in ≤30 seconds
- [ ] No `SUPABASE_SERVICE_ROLE_KEY` reference in any browser-shipped file (grep verified in CI)
- [ ] `create_snapshot` rate-limited indirectly via the 30-min heartbeat throttle on the client; server-side soft rate-limit is the 100 MB quota (any user trying to spam snapshots hits the cap fast)

---

## 9. Test plan

### 9.1 Unit tests (`bun run test:unit`)

Target coverage: ≥85% on the snapshot store + composables + RPC simulations + Edge Function handlers.

| Test file | Covers |
|---|---|
| `tests/unit/stores/snapshots.test.ts` | list (RLS-gated SELECT), create (encode + upload + RPC + state update), restore (pre-restore + RPC + decode + Yjs swap + undo push), rename (cover both Name + Delete-version-info paths), duplicateToCanvas (API mock), copyLink (clipboard mock + toast), preview/exitPreview, signed-URL fetchers |
| `tests/unit/composables/version-history/use-autosnapshot.test.ts` | 30-min interval; blur/focus pause/resume; beforeunload sync encode; navigator.onLine offline trigger; skip-if-unchanged via state-vector compare; stop on canvas-trashed; quota-exceeded retry-next-cycle |
| `tests/unit/composables/version-history/use-snapshot-codec.test.ts` | encodeCanvasSnapshot (multi-page concat + Kiwi + Zstd); decodeCanvasSnapshot (round-trip equality); format_version mismatch error; malformed-snapshot error |
| `tests/unit/composables/version-history/use-snapshot-thumbnail.test.ts` | 150×150 PNG sizing; capture-failure fallback (returns null thumbnail path) |
| `tests/unit/composables/version-history/use-restore-undo.test.ts` | pushUndoEntry called with correct payload; undo dispatch fires reverse restore |
| `tests/unit/composables/version-history/use-deep-linked-version.test.ts` | Query param parsing; panel open + preview state set on mount; invalid id → toast |
| `tests/unit/api/snapshots/duplicate-to-canvas.test.ts` | Happy path (read blob + create_canvas + upload + new snapshot row + return id); 401 unauthenticated; 403 snapshot-not-owned; 404 not-found; idempotency-key dedup |
| `tests/unit/api/cron/snapshot-prune.test.ts` | Filter predicate matches retention_class + kind + cutoff; chunked Storage.remove; orphan-sweep on 7th day; Storage failure does not block DB DELETE |
| `tests/unit/components/version-history/SnapshotTimelinePanel.test.ts` | Renders 17.1 layout from snapshot fixture; group-expand toggle; empty state when zero rows |
| `tests/unit/components/version-history/SnapshotRow.test.ts` | Hover reveal of •••; 5-item dropdown render; Delete-version-info disabled for autosaves; inline rename + commit + cancel; emit names |
| `tests/unit/components/version-history/AddVersionDialog.test.ts` | Title-required Save gating; Cancel discards; Save calls store.create with kind='manual' |
| `tests/unit/components/version-history/RestoreConfirmModal.test.ts` | Renders 17.10; .btn.primary not .btn.danger; confirm/cancel emit |
| `tests/unit/components/version-history/FilterDropdown.test.ts` | Only autosave toggle visible (no "All / Only yours"); v-model bidirectional |
| `tests/unit/components/trash/TrashConfirmModal.test.ts` | Renders B13.1 exact copy + .btn.danger; confirm emit + cancel emit |

### 9.2 Integration tests (against a local Supabase)

Run against `supabase start` local instance with migrations applied. Cleanup via test-isolated user IDs.

| Test file | Covers |
|---|---|
| `tests/integration/snapshots/migrations.test.ts` | Apply migration; verify columns, indexes, RLS state, RPC function existence, Storage bucket created |
| `tests/integration/snapshots/rpc-create-snapshot.test.ts` | Insert + return id; quota enforcement at boundary 99.99 MB → ok / 100.01 MB → quota_exceeded; retention_class assignment per plan + kind matrix |
| `tests/integration/snapshots/rpc-restore-snapshot.test.ts` | Pre-restore row inserted before return; parent_snapshot_id set correctly; cross-user attempt raises |
| `tests/integration/snapshots/rpc-rename-snapshot.test.ts` | Name path; Delete-version-info path (NULL both); cross-user attempt raises |
| `tests/integration/snapshots/rpc-purge-paths.test.ts` | Returns blob + thumbnail paths; nulls filtered from thumbnail array; cross-user attempt raises |
| `tests/integration/snapshots/rls-select.test.ts` | JWT impersonate user A → SELECT returns only A's brand snapshots; user B's snapshots not visible |
| `tests/integration/snapshots/rls-write-blocked.test.ts` | JWT impersonate INSERT / UPDATE / DELETE on canvas_snapshots → all fail or 0-row |
| `tests/integration/snapshots/storage-path-prefix.test.ts` | User A cannot INSERT/SELECT/DELETE objects under `canvas-snapshots/{userB_id}/**` |
| `tests/integration/api/duplicate-to-canvas.test.ts` | E2E: seed user + canvas + snapshot → call Edge → assert new canvas exists with hydrated state + new snapshot row with "Duplicated from..." label |
| `tests/integration/api/cron-snapshot-prune.test.ts` | Seed 100 free-tier autosaves (50 older than 30 days, 50 newer) + 10 manual snapshots → invoke cron → assert 50 free-autosaves deleted + 0 manual deleted + 50 newer kept + Storage objects gone |
| `tests/integration/snapshots/cascade-with-trashed-canvas.test.ts` | Trash a canvas → `canvas_snapshots` rows for that canvas still exist (Q19 indefinite retention) |
| `tests/integration/snapshots/cascade-with-permanent-delete.test.ts` | Call `purge_canvas_snapshot_paths` → DELETE canvas row → assert FK cascade removes snapshot rows |

### 9.3 E2E tests (Playwright / Vercel Agent Browser)

Smoke tests via Vercel Agent Browser per `e2e-runner` default. Playwright fallback. Critical user flows only.

| Spec | Covers |
|---|---|
| `tests/e2e/version-history/manual-save-and-restore.spec.ts` | Open canvas, edit, press ⌥⌘S, fill title + description, Save → assert toast + row in panel; edit again; right-click named row → Restore → confirm → assert canvas state matches saved snapshot + ⌘Z reverses |
| `tests/e2e/version-history/autosnapshot-30-min.spec.ts` | Open canvas, fake-clock advance 30 minutes, assert one autosave row inserted; advance 30 more minutes with no edits, assert NO new row (skip-if-unchanged) |
| `tests/e2e/version-history/rename-and-delete-info.spec.ts` | Right-click autosave row → "Name this version" → type + Enter → assert row promoted out of group; right-click → "Delete version info" → assert row demoted back into group |
| `tests/e2e/version-history/duplicate-to-canvas.spec.ts` | Right-click row → Duplicate → assert URL changes to new canvas + state matches snapshot + new snapshot row labeled "Duplicated from..." |
| `tests/e2e/version-history/copy-link-preview.spec.ts` | Right-click row → Copy link → assert clipboard text → navigate to copied link → assert panel open + that row focused + canvas in read-only preview |
| `tests/e2e/version-history/empty-state.spec.ts` | Fresh canvas with zero snapshots → open VH panel → assert 17.11 empty state |
| `tests/e2e/trash/move-to-trash-flow.spec.ts` | Dashboard right-click → Move to trash → assert modal B13.1 → confirm → assert toast B13.3 + file removed from list + appears in Trash inbox (Cluster 02 host) |
| `tests/e2e/trash/permanent-delete-cleans-snapshots.spec.ts` | Trashed canvas in Trash inbox → Permanent delete → assert canvas removed + snapshot rows gone + Storage objects gone |

### 9.4 Manual QA (founder browser smoke)

Per `feedback_browser_smoke_test_before_done` memory — required before claiming the feature done.

- [ ] Open a real canvas; let 30 minutes elapse; observe an autosave row appear in the timeline
- [ ] Press ⌥⌘S; fill title "Test save" + description; Save; observe a named row in the timeline and a toast
- [ ] Right-click the named row; observe the 5-item dropdown; click Name this version; type "Test save renamed"; press Enter; observe the row title update
- [ ] Right-click the same row; Delete version info; observe the row drop back into the autosave group (no title)
- [ ] Right-click an autosave row; Restore this version; observe the confirm modal copy; click Restore; observe the canvas swap + a "Restored to..." toast; press ⌘Z; observe the canvas revert
- [ ] Right-click a row; Duplicate; observe a new canvas open with the same state; verify a new snapshot row labeled "Duplicated from..."
- [ ] Right-click a row; Copy link; paste in a fresh tab; observe the canvas open with the panel + read-only preview
- [ ] Toggle the filter "Show autosave versions" off; observe autosave rows hidden; toggle on; observe them back
- [ ] Move a canvas to trash from the dashboard right-click; observe the B13.1 modal copy exactly; confirm; observe the toast + file removed
- [ ] Open the moved-to-trash file from the Trash inbox; observe its snapshots are still intact
- [ ] Permanently delete a trashed canvas; observe it is gone forever; verify Storage usage drops by the size of its snapshots

### 9.5 Pre-commit + CI verifications

- `bun run check` — oxlint + type-check zero errors
- `bun run format` — oxfmt no diff
- `bun run test:unit` — all green
- `bun run test:dupes` — jscpd < 3%
- Grep: no `SUPABASE_SERVICE_ROLE_KEY` reference in `src/` (server-only)
- Grep: no `CRON_SECRET` reference in `src/` (server-only)
- Grep: no `Math.random()` in this PRD's new code (CLAUDE.md hard rule)

---

## 10. Rollout phasing

### Phase A — initial deploy (Wave 6 close)

- Migration `20260615_09_canvas_snapshots` applied to local + staging Supabase
- `canvas-snapshots` Storage bucket provisioned
- All 4 RPCs deployed
- Both Edge Functions deployed
- `useSnapshotsStore` + 6 composables + 9 components shipped
- Right-panel mount slot wired (Cluster 06 ships the slot mechanism; Cluster 09 fills it)
- ⌥⌘S keybinding registered in Cluster 08's registry
- `<TrashConfirmModal>` available to Cluster 02 (mounted at dashboard right-click)
- `bun run test:unit` 100% green for new files + ≥85% coverage on snapshot code
- Manual founder smoke (§9.4) green on staging

### Phase B — post-launch follow-up

- Vercel Cron `snapshot-prune` schedule activated in production once Cluster 04 Stripe webhook is firing (so plan-derived `retention_class` is accurate)
- Sentry alert rule wired for `snapshot-prune` failure rate >0
- Operator-side observability: a daily metric of `quota_exceeded` toast counts (cluster 11 toast taxonomy ships this hook)
- Phase 2 candidate: compare/diff viewer if user requests pile up (currently not on roadmap because Figma also doesn't ship this)

### Feature flags (hard-coded constants per `00d 2.B 10` default)

| Flag | Default | Toggle condition |
|---|---|---|
| `AUTOSNAPSHOT_INTERVAL_MS` | `1800000` (30 min) | Match Figma; tune if quota signals appear |
| `SNAPSHOT_BLOB_SIZE_LIMIT_BYTES` | `52428800` (50 MB) | 00d ratified |
| `SNAPSHOT_BRAND_QUOTA_BYTES` | `104857600` (100 MB) | MVP; revisit at paid-tier launch |
| `SNAPSHOT_FREE_RETENTION_DAYS` | `30` | Match Figma free plan |
| `VERSION_HISTORY_COMPARE_ENABLED` | `false` | Flip in Phase 2 if compare modal ships |
| `VERSION_HISTORY_VISIBILITY_FILTER_ENABLED` | `false` | Flip when multi-user ships |

---

## 11. Cross-cuts to other PRDs

| Other PRD | What we depend on (from them) | What they depend on us for |
|---|---|---|
| **01 — Auth & Identity** | `users.id` for FK; `users.plan` column for retention_class derivation; account-deletion-cron `storage` step that purges our user-prefixed bucket paths; `idempotency_keys` cross-cut for the duplicate-to-canvas Edge Function | Storage path layout under `canvas-snapshots/{user_id}/**` (specified in §4.3) — Cluster 01 walks this prefix during account deletion |
| **02 — Onboarding & Dashboard** | `canvases` table + `create_canvas` RPC (for Duplicate-to-canvas); Trash inbox view that hosts our `<TrashConfirmModal>` + the post-confirm `useCanvasesStore.moveToTrash` + Trash inbox listing of trashed canvases | `<TrashConfirmModal>` component for dashboard's right-click flow; `purge_canvas_snapshot_paths` RPC for dashboard's permanent-delete flow |
| **04 — Account & Stripe** | `users.plan` column populated; Stripe webhook on subscription.updated that fires `UPDATE canvas_snapshots SET retention_class = 'paid' WHERE user_id = $1 AND retention_class = 'free'` on free→paid; `UPDATE ... SET retention_class = 'free' WHERE ... = 'paid'` on paid→free (rare downgrade) | Documented column contract; nothing else |
| **06 — Canvas Editor Core Chrome** | Right-panel slot mechanic (open/close state, theme passthrough); the topbar Version-history menu item (File menu → Version history → opens panel); right-rail occupied-state CSS so the inspector and our panel don't collide | None — we live inside their slot |
| **07a — Canvas Engine Core** | `editor.snapshotPage`, `editor.restorePageFromSnapshot`, `editor.captureThumbnail`, `editor.getStateVector`, `editor.pushUndoEntry`, `editor.graph` — all stable APIs; format-version stability so format_version=1 round-trips | None — read-only consumer |
| **08 — Canvas Menus & Shortcuts** | Keyboard registry that resolves `⌥⌘S` → `useSnapshotsStore.openAddDialog()`; main-menu File → Version history → `useSnapshotsStore.openPanel()` | Keyboard binding declaration + main-menu item declaration |
| **10 — AI Chat + Memory** | None at MVP — AI does not auto-trigger snapshots in MVP; deferred opt-in for Phase 2 | None |
| **11 — Shared UI Infrastructure** | `useConfirm()` composable; `<KovaModal>` shell; `<ToastStack>` + variants (success / warning / error); skeleton primitives for the panel's loading state | None |
| **12 — Settings & User Preferences** | None at MVP — autosnapshot interval is hard-coded; if Phase 2 exposes "Pause autosnapshot" preference, 12's `users.preferences` JSONB carries it | None |

### 11.1 Hygiene rules from `00e §6`

- **No live multi-device canvas sync promises** (§6 #2): the version-history panel reads its own snapshots; it does NOT subscribe to other users' Realtime events to merge edits. Cross-device sync of *snapshots* is last-write-wins via the Storage bucket — if two devices edit and both autosnap, the later upload wins as a new row, no merge. Documented in §1.1 and §2.3 (Phase 2 deferral list).
- **D-5E staging trigger**: not relevant to this PRD's Phase A; Phase B cron activation in production gates on Cluster 04 Stripe foundation being live, which is the same trigger Cluster 01 carries.
- **D-3 RoPA disclosure**: Cluster 01 owns the Privacy Policy file; this PRD contributes one sentence on snapshot retention (§5.5).

---

## 12. Risks + open questions

### 12.1 RISK (Medium) — Yjs format-version drift between PRDs

A future Cluster 07a or 07b change to `packages/core/` scene-graph types could break `format_version = 1` decoding. Snapshots taken under v1 would no longer restore.

**Mitigation:** every `packages/core/` change that touches Kiwi schema MUST bump `format_version` AND ship a decoder shim OR explicitly refuse-with-message in `decodeCanvasSnapshot`. CI grep verifies `format_version` bumps when `packages/core/codec/` changes. Documented as a Cluster 07a acceptance criterion (cross-cut to add when 07a is drafted).

### 12.2 RISK (Medium) — Quota math after plan changes

If a user takes 100 MB of free-tier autosaves (all `retention_class='free'`), then upgrades to paid, Cluster 04's webhook bulk-UPDATEs them to `retention_class='paid'`. They are kept forever. Good. But if the user later downgrades to free, Cluster 04 bulk-UPDATEs back to `'free'`, and the very next prune cycle deletes everything older than 30 days at once — including everything they kept while paid. Sudden mass deletion = bad UX.

**Mitigation:** Cluster 04's downgrade webhook adds a 30-day grace period — sets `retention_class='free'` but tags an internal `downgrade_at` column on `users` so the prune cron skips that user for 30 days, giving them time to upgrade back or export. Documented in §11 as a Cluster 04 dependency. **Action: confirm with Cluster 04 author during Wave 3 PRD review.**

### 12.3 RISK (Medium) — Storage cost growth from indefinite trash retention

Q19 (Figma-exact) keeps trashed canvases + their snapshots forever. A heavy user could accumulate hundreds of MB of trashed canvas snapshots that never prune. Cluster 01's account-deletion cron is the only sweep.

**Mitigation:** the 100 MB per-brand quota applies to LIVE canvases. Trashed canvases keep their snapshot bytes but their bytes still count against the brand's 100 MB. So heavy users who fill up trash effectively block themselves from new snapshots until they Empty Trash. Documented in §2.1 — quota counts both live and trashed. **Open question: should Empty Trash be a Cluster 02 MVP feature or Phase 2? Recommend MVP — without it, the quota math feels punitive. Confirm with Cluster 02 author.**

### 12.4 RISK (Low) — Tab-close snapshot upload race

On `beforeunload`, the browser may kill the tab before the async upload finishes. The Yjs bytes persist in `y-indexeddb` locally (CLAUDE.md hard constraint preserves this), but the Storage upload may fail silently.

**Mitigation:** `useAutosnapshot` enqueues a "pending upload" record in IndexedDB; on next canvas open, the composable checks for pending uploads and retries with `kind='tab_close'` and the original timestamp. Worst case: a snapshot ends up missing for an hour until the next session. Acceptable.

### 12.5 RISK (Low) — Pre-restore snapshot quota consumption

Every restore creates a pre-restore snapshot (kind=`pre_restore`, retention=`permanent`). A user who restores many times eats into their quota fast.

**Mitigation:** pre-restore snapshots are kept indefinitely BUT they are clearly listed in the timeline as named snapshots — the user can rename them or treat them as their save points. If quota becomes a problem, document a Phase 2 admin/user delete path. Not blocking MVP.

### 12.6 OPEN QUESTION — Copy-link auth requirement

The Copy link feature copies `/canvas/{id}?version={snapshot_id}` to clipboard. Loading the link requires the same user's auth. No public-share token. This is intentional (matches Q6 single-user MVP + `00e §6 #2`).

**Question for founder:** confirm that "Copy link" is acceptable as an authenticated deep-link for personal use (e.g., bookmarking a version for later) and NOT advertised as a sharing feature. If marketing copy ever says "share a version with a teammate", this PRD's Copy link needs a Phase 2 public-share-token upgrade.

**Default in this draft:** ship as authenticated deep-link with no "share" framing in the UI. Tooltip on the menu item: "Copy a link to this version."

### 12.7 OPEN QUESTION — Empty Trash button placement

Not in this PRD's scope (Cluster 02). But the storage-cost mitigation in §12.3 depends on it being available at MVP. Flag for Cluster 02 PRD author.

### 12.8 RESOLVED 2026-05-15 — Compare/diff viewer

Founder confirmed: Phase 2 deferral. Figma also doesn't ship a diff viewer (verified `help.figma.com/hc/en-us/articles/360038006754`). MVP ships list + preview + restore only.

### 12.9 RESOLVED 2026-05-15 — Blob storage strategy

Founder confirmed: always Storage bucket. `scene_blob_path text NOT NULL` per audit §2.A. Single code path. 50 MB blob cap (00d ratified).

### 12.10 RESOLVED 2026-05-15 — Duplicate verb

Founder confirmed: Figma-exact behavior. "Duplicate" creates a new canvas in the same brand seeded from the snapshot's Yjs bytes. Source: `help.figma.com` + `figma.com/blog/now-you-can-name-and-annotate-your-figma-version-history/`.

### 12.11 RESOLVED 2026-05-15 — Filter scope

Founder confirmed: ship the autosave toggle only; omit "All / Only yours" (single-user MVP). Diverges from hi-fi 17.7 by minus-one-toggle; matches Figma (which has no filter at all).

---

## 13. References

### 13.1 03-doc rows covered

- §2.11 row 1 — "Save to version history (⌥⌘S)" (3 doc, line 303)
- §2.11 row 2 — "Show version history" (3 doc, line 304)
- §2.12 row 1 — "Move to trash (file-name dropdown)" — refactored per founder 2026-05-09 to dashboard right-click only (3 doc, line 312)
- §3.A row 9 — "Snapshot infrastructure" (3 doc, line 346) — full scope
- §3.B row 2 — "Trash / soft-delete" reuse statement (3 doc, line 360) — confirms useCanvasesStore exists
- §3C #2 — "Snapshot / version-history store" net-new infra (3 doc, line 383)

### 13.2 Q-decisions baked in

- **Q7** — Yjs Kiwi+Zstd snapshot bytes; per-canvas (multi-page bundled); 30-day free / unlimited paid retention; 30-min autosnap + on-disconnect + on-tab-close + on `⌥⌘S`; 100 MB per-brand quota MVP; atomic restore with pre-restore snapshot. Verified Figma-exact via `help.figma.com/hc/en-us/articles/360038006754-View-a-file-s-version-history`.
- **Q19** — Trash indefinite retention; no auto-purge; user-initiated permanent-delete only; account-deletion cascade (Q15) purges trashed files at the 30-day mark. Verified Figma-exact via `help.figma.com/hc/en-us/articles/360047512294-Delete-and-restore-files`.

### 13.3 Hi-fi files

- `main-main-kova-scope/batch-b/chunk-b6/Kova Hi-Fi 17 Version History - Dark.html` (11 scenes: 17.1, 17.2, 17.3, 17.4, 17.5, 17.6, 17.7, 17.8, 17.9, 17.10, 17.11)
- `main-main-kova-scope/batch-b/chunk-b2/Kova Hi-Fi 15 Trash Confirm - Dark.html` (3 scenes: B13.1, B13.2, B13.3)

### 13.4 Design system

- `main-main-kova-scope/design-system/design.md` (spec — token vocabulary, `.btn` / `.btn.primary` / `.btn.danger` / `.dlg` / `.menu` / `.toast` / `.empty-pane` / `.input` contracts)
- `main-main-kova-scope/design-system/kova-hifi.css` (canonical dark CSS — every class consumed by this PRD is defined here; engineers translate `:root` → Tailwind `@theme`)
- `main-main-kova-scope/design-system/TOKEN_CANONICAL.md` (vocabulary cheat-sheet)
- *No light surfaces in this PRD; `kova-hifi-light.css` not consumed*

### 13.5 Audit + verification inputs

- `kova-open-pencil-1/docs/kova-final-prds/00-PRD_SCOPE_PLAN.md` §3 Cluster 09 (scope), §5 (PRD template), §5.6 (ratification log — items 1, 2, 5 relevant), §6 (cross-cuts table)
- `kova-open-pencil-1/docs/kova-final-prds/00a-PRD_AUTHORING_GUIDE.md` (operator manual followed for this draft)
- `kova-open-pencil-1/docs/kova-final-prds/00c-COMPREHENSIVE_AUDIT_REPORT.md` §2.A Cluster 09 (lines 1764–1945) lifted as base
- `kova-open-pencil-1/docs/kova-final-prds/00d-EXTERNAL_VERIFICATION_HANDOFF.md` §3 ratifications: 2.B.2 Vercel Cron, 2.C.3 Yjs + y-indexeddb persistence, 2.C.4 optimistic UI (snapshot-create), 2.C.7 multi-device wording, 2.C.8 autosnap blur/beforeunload, 2.C.10 RPC discipline, 2.C.11 Realtime channel naming
- `kova-open-pencil-1/docs/kova-final-prds/00e-EXTERNAL_VERIFICATION_VERDICT.md` Q7 row (confirms all four Figma sub-claims); §6 #2 hygiene rule (no live multi-device sync promises); §6 #3 staging trigger; §6 #4 RoPA contribution

### 13.6 External sources cited

- [Figma Help — View a file's version history](https://help.figma.com/hc/en-us/articles/360038006754-View-a-file-s-version-history) — confirms 5-item row menu (Name / Restore / Duplicate / Copy link / Delete Version Info); confirms NO compare/diff view; confirms NO filter
- [Figma Blog — Now you can name and annotate your Figma Version History](https://www.figma.com/blog/now-you-can-name-and-annotate-your-figma-version-history/) — confirms Duplicate creates new file; named-version annotation pattern
- [Figma Help — Delete and restore files](https://help.figma.com/hc/en-us/articles/360047512294-Delete-and-restore-files) — confirms indefinite trash retention; no auto-purge
- [Supabase — Storage path-prefix RLS](https://supabase.com/docs/guides/storage/security/access-control) — pattern used in §4.3 storage RLS
- [Supabase — SECURITY DEFINER functions](https://supabase.com/docs/guides/database/postgres/row-level-security#policies-with-security-definer-functions) — RPC pattern
- [Vercel Cron](https://vercel.com/docs/cron-jobs) — `snapshot-prune` schedule
- [Yjs — Document state vectors](https://docs.yjs.dev/api/document-updates) — `getStateVector` skip-if-unchanged check
- [Zstandard](https://facebook.github.io/zstd/) — compression algorithm reference (existing dep)
- [Kiwi schema](https://github.com/evanw/kiwi) — binary encoding (existing dep via OpenPencil `packages/core/codec`)

### 13.7 Memory pointers consulted

- `feedback_app_dark_website_light` — dark theme inside authenticated app (every surface here is dark)
- `feedback_figma_ui_theme` — Figma as visual reference (confirmed)
- `feedback_verify_with_docs` — context7 + WebFetch verification before proposing patterns (Figma docs verified above)
- `feedback_browser_smoke_test_before_done` — §9.4 manual QA gate
- `feedback_explain_for_nontechnical_founder` — §1.1 plain language + §1.2 caveman both included
- `feedback_build_better_not_easier` — informed the decision to ship all 5 row actions (matching Figma) instead of deferring Duplicate / Copy link / Delete Version Info to Phase 2
- `project_kova_avatar` — single-user freelancer scope (informs the filter-omit decision)
- `project_design_system_master` — canonical CSS paths cited in §13.4
- `project_pre_prd_audit_ratified` — confirms `canvases.trashed_at` already exists (no migration); confirms Vercel Cron + Resend + Sentry tooling decisions
- `project_m5_chat_memory_decisions` — referenced for understanding Yjs persistence layer (not modified by this PRD)

### 13.8 What is NOT in this PRD (handed elsewhere)

- Right-panel slot mechanics (Cluster 06)
- Keyboard registry runtime (Cluster 08)
- Trash inbox view UI / "Empty trash" button (Cluster 02)
- Permanent-delete-from-trash flow chrome (Cluster 02 — uses our `purge_canvas_snapshot_paths` RPC)
- Account-deletion cascade `storage` step (Cluster 01 — walks our bucket prefix)
- Stripe webhook bulk-UPDATE of `retention_class` (Cluster 04)
- Compare / diff viewer (Phase 2, not currently planned)
- Public version sharing (Phase 2, not currently planned)
- AI auto-snapshot triggers (Phase 2, not currently planned)
- `useConfirm` / `<KovaModal>` / `<ToastStack>` / skeleton primitives (Cluster 11)
