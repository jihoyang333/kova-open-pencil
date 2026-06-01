// Single-sourced feature flags / tunables (W4 C-MED24).
// Pure constants only — safe to import from both client (src) and server (api) code.

// Free-tier autosave snapshots are pruned after this many days. Manual / pre_restore /
// disconnect / tab_close snapshots and paid-tier autosaves are kept forever.
export const SNAPSHOT_FREE_RETENTION_DAYS = 30
