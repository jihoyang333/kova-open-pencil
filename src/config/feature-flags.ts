/**
 * Hardcoded build-time feature flags (no runtime flag service in MVP, per 00d §2.B).
 * Each flag reads a VITE_ env var so it can flip per-environment without code change.
 */

/**
 * Cluster 07b (C-LOW07b.5) — macOS Tauri-native screen-wide eyedropper.
 * Default false: MVP ships canvas-only sampling (PRD 07b §12.9 Q20 lock).
 * Flip true only when (1) the `eyedropper_sample_screen` Rust command ships,
 * (2) the signed/notarized macOS build is verified, (3) the Q20 lock is lifted.
 */
export const EYEDROPPER_NATIVE_TAURI = import.meta.env.VITE_EYEDROPPER_NATIVE_TAURI === 'true'
