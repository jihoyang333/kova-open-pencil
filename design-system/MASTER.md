# Kova Design System — In-Repo Canonical

> **Status:** active. Updated 2026-05-20 (Fidelity Contract Inversion). The Kova design system is now SELF-CONTAINED inside `kova-open-pencil-1/design-system/` for CI determinism + the inverted visual-fidelity contract (per `docs/execution-phase/claude-design-files/IMPLEMENTATION_PROMPT.md`).

## Canonical files (this directory)

- `canonical/design.md` — the spec doc. Foundations, semantic tokens, components, density, BANS, extension rules. Source of truth for every visual decision.
- `canonical/kova-hifi.css` — dark stylesheet. `:root` semantic tokens + component primitives. Includes positional-offset tokens added 2026-05-20.
- `canonical/kova-hifi-light.css` — light variant (auth pages ONLY — `/auth/*`).
- `canonical/TOKEN_CANONICAL.md` — three token vocabularies (short / long / scoped) + positional offsets section.

## Hi-fi mockups (visual diff targets)

- `hifi/<cluster>/*.html` — 34 hi-fi HTML files organized by cluster. Version-controlled. The diff target for Playwright visual-diff gates.
- `hifi/README.md` — cluster → file mapping + primitive-spec-extraction map for clusters without their own hi-fi.
- `hifi/index-batch-a.html` — original index from batch-a.

## How agents use this

- Every cluster execution prompt references `docs/execution-phase/claude-design-files/IMPLEMENTATION_PROMPT.md` as the **canonical fidelity contract** — the 3-rule formulation in §0:
  1. Visual values are copied (pixel-for-pixel from mockup).
  2. DOM structure is translated (Vue 3 + Reka UI + `K*` component layer — NOT mockup HTML).
  3. Behavior is engineered (Pinia / refs / composables — NOT static classes).
- "Copy DOM verbatim" is **forbidden**. Trap phrase.
- Phase 1 audit gate (per IMPLEMENTATION_PROMPT.md §3) produces `KOVA_AUDIT.md` + `tokens-used.md` against these canonical files BEFORE any Vue code.
- Per-screen diff loop compares Vue impl against `hifi/<cluster>/*.html` at 1440px viewport.
- Playwright visual-diff gate thresholds: **≤ 0.1% component / ≤ 0.5% screen** per IMPLEMENTATION_PROMPT.md §6.
- PR must include 3-screenshot artifact (mockup / impl / diff) per surface.

## Historical reference

- `/Users/jihoyang/kova-main/main-main-kova-scope/design-system/` — outer-repo canonical (historical reference; same content as this directory's `canonical/`). DO NOT diff against — CI cannot reach.
- `/Users/jihoyang/kova-main/kova-all-hifi-files/` — original handoff bundle from claude.ai/design. Source of truth for the in-repo `hifi/` copy.

## Sync discipline

- If the outer-repo canonical updates, re-copy into `canonical/`. Do not let drift.
- If a new hi-fi mockup ships from claude.ai/design, place into `hifi/<cluster>/` + add a row to `hifi/README.md`.
- If a new token is added (per `design.md` §6 extension protocol), it lands first in `canonical/kova-hifi.css :root` + `canonical/TOKEN_CANONICAL.md`, then mirrors into `src/app.css` `@theme` block.
