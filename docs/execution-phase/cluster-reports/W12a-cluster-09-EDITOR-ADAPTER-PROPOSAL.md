# Cluster 09 — Editor-Snapshot Adapter: Findings + Proposed Approach

**For:** founder decision before building Tasks 8–12 (store/composables).
**Date:** 2026-06-01.

## The problem

The PRD/plan assume the snapshot store talks to an editor with `getStateVector`, per-page
`snapshotPage` (Yjs update bytes), `restorePageFromSnapshot`, `captureThumbnail`, `pushUndoEntry`,
`userId/brandId/canvasId`. **None of these exist.** The editor is a Pinia store (`useEditorStore`)
wrapping `SceneGraph` (locked `packages/core`), and `SceneGraph`'s public API exposes **no** Yjs
doc, no state vector, and no serialization.

## What the editor DOES expose (public, usable today)

- `editor.graph` — the `SceneGraph`
- `editor.renderer` — the Skia renderer
- `editor.undo` — `UndoManager`
- `editor.saveFigFile()` / `editor.openFigFile(file)` — sanctioned `.fig` serialize / load
- `editor.renderExportImage(nodeIds, scale, format) → Uint8Array | null` — render to PNG/JPG bytes
- `exportFigFile(graph, ck?, renderer?, pageId?) → Uint8Array` (from `@open-pencil/core`) — the
  whole-document `.fig` serializer the editor already uses internally (`buildFigFile()`)

`openFigFile` restores by `readFigFile(file) → swap graph → re-render` (and `undo.clear()`).

## Proposed approach

**Snapshot bytes = the whole-document `.fig` blob (kiwi-encoded) via `exportFigFile`** — the
engine's sanctioned serializer. NOT per-page Yjs (no public access). Restore = load that `.fig` blob
back via the `openFigFile` path. This respects the `packages/core` lock entirely.

### 1. Extend `src/stores/editor.ts` (app code, NOT locked) with 3 thin wrappers

```ts
// all wrap EXISTING functionality — no packages/core change
async function serializeSnapshot(): Promise<Uint8Array> { return buildFigFile() }            // = exportFigFile(...)
async function loadSnapshot(bytes: Uint8Array): Promise<void> { /* readFigFile(File(bytes)) → swap graph → render */ }
async function captureSnapshotThumbnail(): Promise<Uint8Array | null> {
  return renderExportImage([], thumbScaleFor(currentPage), 'PNG')                            // ~150px of current page
}
```

`loadSnapshot` is a refactor of the existing `openFigFile` to accept bytes (extract a
`loadFigFromBytes` helper; `openFigFile(file)` calls it with `await file.arrayBuffer()`).

### 2. Snapshot codec — keep, as a thin version wrapper

The codec + `snapshot-migration-registry` + CI guard I already built (and tested) wrap the single
`.fig` blob as one envelope entry (carries `format_version` for future migration). The per-page
structure degenerates to one entry. Keeps the versioning machinery; minimal change.

### 3. The store + composables then use REAL methods (browser-verifiable)

- `create`: `editor.serializeSnapshot()` + `editor.captureSnapshotThumbnail()` → upload → `create_snapshot` RPC.
- `restore`: serialize current (pre-restore) → `restore_snapshot` RPC → download target → `editor.loadSnapshot(bytes)`.
- `userId/brandId/canvasId`: from the auth store + route param + canvases store (not the editor).

### 4. Autosnapshot change-detection

No Yjs state vector. Options: (a) hash the serialized `.fig` bytes and skip if unchanged (the
30-min tick serializes anyway); (b) use `editor.undo` depth as a cheap dirty signal. **Proposed: (a)**.

## Deviations from the PRD/plan this implies (need your OK)

1. **Snapshot = whole-document `.fig`, not per-page Yjs Kiwi** (PRD §5.4.1). Reason: no public Yjs
   access; `.fig` is the engine's sanctioned serialize/load. Restore replaces the whole canvas doc —
   matches "restore to a prior version" semantics.
2. **Drop `useRestoreUndo`'s Yjs undo-entry (Task 9).** `openFigFile` clears the undo stack; "undo a
   restore" is achieved by restoring the auto-created `pre_restore` snapshot (already in the
   `restore_snapshot` RPC). Simpler + matches the engine.
3. **Thumbnail via `renderExportImage` (PNG), ~150px** — not a bespoke `captureThumbnail(150)`.

## Net change footprint

- `src/stores/editor.ts`: +3 small additive wrapper methods (app code, no lock touched).
- Tasks 8–12 build on those real methods → unit-testable AND browser-verifiable.
- No `packages/core` modification. No new heavy deps.

## Open question for you

Approve **whole-doc `.fig` snapshots via `exportFigFile`/`openFigFile`** (this proposal) vs. any
preference to pursue per-page granularity (would require a sanctioned engine change to expose Yjs —
out of MVP scope + touches the lock)?
