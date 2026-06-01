# top-chrome — visual-diff

**Mockup:** `compressed-figma-canvas-ui/top-chrome.png` (outer-repo crop).
**Impl:** `[data-testid="topbar"]` at `/dev/cluster-06`.
**Spec test:** `tests/visual-diff/cluster-06/chrome.visual.spec.ts → top-chrome — Vue impl`.

## Property checklist

| Property | Mockup spec | Impl value | Source | Status |
|---|---|---|---|---|
| height | `var(--h-topbar)` (40px) | `h-[var(--h-topbar)]` | `TopChrome.vue:85` | ✅ |
| background | `var(--bg-rail)` | `bg-rail` | `TopChrome.vue:85` | ✅ |
| border-bottom | `1px solid var(--line)` | `border-b border-line` | `TopChrome.vue:85` | ✅ |
| padding-x | `12px` | `px-3` | `TopChrome.vue:85` | ✅ |
| left cluster gap | `12px` | `gap-3` | `TopChrome.vue:88` | ✅ |
| logo slot | TopChromeLogo (file-menu anchor) | `<TopChromeLogo>` | `TopChrome.vue:89` | ✅ |
| breadcrumb slot | FileBreadcrumb | `<FileBreadcrumb>` | `TopChrome.vue:90-96` | ✅ |
| right cluster | Notifications + Present + Avatar | `<TopChromeActions>` | `TopChrome.vue:98-107` | ✅ |
| comments icon | HIDDEN (§12.3) | absent | `TopChromeActions.vue` | ✅ |

## Regression coverage

- Unit: `TopChromeActions.test.ts` — 3 tests (no `topbar-comments` testid).
- Visual: `top-chrome-impl.png` baseline (this dir, after `--update-snapshots`).

## Outstanding

- Brand pill color resolution against live `brandsStore.selectedBrand` covered
  in the rendered impl. /dev/cluster-06 has no selected brand → fallback path
  (`FALLBACK_ACCENT = var(--color-accent)`) is the captured baseline.
