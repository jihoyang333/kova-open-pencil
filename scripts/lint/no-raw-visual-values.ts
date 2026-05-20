#!/usr/bin/env bun
/**
 * Custom lint rule — block raw hex + raw px in `.vue` files outside `design-system/`.
 *
 * Per `docs/execution-phase/claude-design-files/IMPLEMENTATION_PROMPT.md` §9
 * (Mandate 6). The Kova design system pins every visual value to a named token
 * in `design-system/kova-hifi.css :root` / `app.css @theme`. Components MUST
 * reference tokens, never raw literals.
 *
 * --------------------------------------------------------------------------
 * Why a script (Option B) instead of an oxlint plugin (Option A):
 *   oxlint's plugin API surface is currently focused on TypeScript / Vue
 *   semantic rules. CSS-in-template (Tailwind arbitrary values, inline
 *   `style="..."`) does not parse cleanly via oxlint's AST visitor. A regex
 *   sweep over `.vue` files is faster to ship + maintain. Wires into
 *   `bun run check` per IMPLEMENTATION_PROMPT.md §9.
 * --------------------------------------------------------------------------
 *
 * Block patterns:
 *   - Raw hex color literals: `#[0-9a-fA-F]{3,8}`
 *   - Raw pixel values:       `\b\d+(\.\d+)?px\b`
 *
 * Scope:
 *   - `<style>` / `<style scoped>` blocks in `.vue` files (banned anyway per
 *     CLAUDE.md hard rule — this catches drift if someone reintroduces).
 *   - `class=` attribute values that include Tailwind arbitrary values like
 *     `bg-[#3b82f6]` or `p-[14px]`.
 *   - Inline `style=` attributes.
 *
 * Out-of-scope (intrinsic, not stylistic):
 *   - SVG attributes: `stroke-width`, `viewBox`, `cx`, `cy`, `r`, `d`.
 *   - CSS transform geometric values: `translate(-50%, -50%)`, `rotate(45deg)`.
 *   - Z-index numerics (semantic z-scale; covered by separate rule).
 *   - Files under `design-system/` (source of tokens themselves).
 *
 * Override comment (escape valve):
 *   `<!-- token-exempt: <justification> -->` or `/* token-exempt: ... *​/` on
 *   the same line. Requires founder approval (recorded in `tokens-used.md`).
 *
 * Rollout (per IMPLEMENTATION_PROMPT.md §9):
 *   Warn-mode for the first week, then error. Controlled via env var:
 *     LINT_NO_RAW_VALUES_MODE=warn   (exit 0, log violations)
 *     LINT_NO_RAW_VALUES_MODE=error  (exit 1 on any violation, default)
 *
 * Exit codes:
 *   0 — no violations OR warn-mode + violations present.
 *   1 — error-mode + violations present.
 *   2 — internal error.
 */

import { readdir, readFile, stat } from 'node:fs/promises'
import { join, relative, sep } from 'node:path'

const REPO_ROOT = process.cwd()
const VUE_SEARCH_ROOTS = ['src', 'packages/core/src', 'packages/cli/src']

// Skip these path segments (their files are exempt from the rule).
const SKIP_DIR_SEGMENTS = new Set([
  'node_modules',
  'dist',
  'design-system',
  'desktop',
  '.worktrees',
  '.git',
])

// Block patterns
const HEX_RE = /#[0-9a-fA-F]{3,8}\b/g
const PX_RE = /\b\d+(?:\.\d+)?px\b/g

// Out-of-scope context detectors — if the matched value appears inside one of
// these contexts on the same line, suppress the violation.
const SVG_ATTR_PREFIXES = [
  'stroke-width=',
  'stroke-dasharray=',
  'stroke-dashoffset=',
  'viewBox=',
  'cx=',
  'cy=',
  'r=',
  'rx=',
  'ry=',
  'd=',
  'x1=',
  'x2=',
  'y1=',
  'y2=',
  'points=',
  'transform=',
]
const TRANSFORM_FN_RE = /\b(translate|rotate|scale|skew|matrix|perspective)[XYZ3d]?\(/

// Override comment
const TOKEN_EXEMPT_RE = /token-exempt:/

interface Violation {
  file: string
  line: number
  col: number
  pattern: 'hex' | 'px'
  value: string
  context: string
}

async function* walk(dir: string): AsyncGenerator<string> {
  let entries
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch {
    return
  }
  for (const entry of entries) {
    if (SKIP_DIR_SEGMENTS.has(entry.name)) continue
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      yield* walk(full)
    } else if (entry.isFile() && entry.name.endsWith('.vue')) {
      yield full
    }
  }
}

function isInsideSvgAttribute(line: string, matchIndex: number): boolean {
  // Walk backward from matchIndex looking for an attribute name on this token.
  // Cheap heuristic: check if the match is on a line whose preceding text
  // contains any of the SVG attribute prefixes within a short window.
  const window = line.slice(Math.max(0, matchIndex - 80), matchIndex)
  return SVG_ATTR_PREFIXES.some((prefix) => window.includes(prefix))
}

function isInsideTransform(line: string, matchIndex: number): boolean {
  // Look back for `translate(`, `rotate(`, `scale(`, `skew(`, `matrix(` etc.
  // within ~60 chars and ensure no closing paren has been seen since.
  const window = line.slice(Math.max(0, matchIndex - 60), matchIndex)
  const lastOpen = window.search(TRANSFORM_FN_RE)
  if (lastOpen === -1) return false
  const sliceAfterFn = window.slice(lastOpen)
  // Count unbalanced opens
  let depth = 0
  for (const ch of sliceAfterFn) {
    if (ch === '(') depth += 1
    else if (ch === ')') depth -= 1
  }
  return depth > 0
}

function hasTokenExempt(line: string): boolean {
  return TOKEN_EXEMPT_RE.test(line)
}

function scanFile(filePath: string, content: string): Violation[] {
  const rel = relative(REPO_ROOT, filePath)
  const violations: Violation[] = []
  const lines = content.split('\n')

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]!
    if (hasTokenExempt(line)) continue

    // Hex literals
    HEX_RE.lastIndex = 0
    let m
    while ((m = HEX_RE.exec(line)) !== null) {
      const idx = m.index
      // Skip hex inside SVG fill/stroke literals? No — those should also use
      // tokens (e.g. fill="var(--ink-2)") for chrome SVGs. Allow only when
      // wrapped in `transform=` (geometric) — but transforms don't take hex.
      if (isInsideSvgAttribute(line, idx)) continue
      violations.push({
        file: rel,
        line: i + 1,
        col: idx + 1,
        pattern: 'hex',
        value: m[0],
        context: line.trim().slice(0, 200),
      })
    }

    // px literals
    PX_RE.lastIndex = 0
    while ((m = PX_RE.exec(line)) !== null) {
      const idx = m.index
      if (isInsideSvgAttribute(line, idx)) continue
      if (isInsideTransform(line, idx)) continue
      violations.push({
        file: rel,
        line: i + 1,
        col: idx + 1,
        pattern: 'px',
        value: m[0],
        context: line.trim().slice(0, 200),
      })
    }
  }

  return violations
}

async function main(): Promise<number> {
  const mode = (process.env['LINT_NO_RAW_VALUES_MODE'] ?? 'error').toLowerCase()
  const isWarn = mode === 'warn'

  const allViolations: Violation[] = []

  for (const root of VUE_SEARCH_ROOTS) {
    const abs = join(REPO_ROOT, root)
    try {
      const s = await stat(abs)
      if (!s.isDirectory()) continue
    } catch {
      continue
    }
    for await (const filePath of walk(abs)) {
      const content = await readFile(filePath, 'utf8')
      const found = scanFile(filePath, content)
      allViolations.push(...found)
    }
  }

  if (allViolations.length === 0) {
    return 0
  }

  const label = isWarn ? 'WARN' : 'ERROR'
  process.stderr.write(`\n[no-raw-visual-values] ${label} — ${allViolations.length} violation(s)\n`)
  process.stderr.write(
    `Visual values must reference tokens (design-system/kova-hifi.css :root / app.css @theme).\n`,
  )
  process.stderr.write(
    `Add an exemption: add \`<!-- token-exempt: <one-line justification> -->\` on the violating line.\n`,
  )
  process.stderr.write(`Rule docs: docs/execution-phase/claude-design-files/IMPLEMENTATION_PROMPT.md §9\n\n`)

  for (const v of allViolations) {
    const norm = v.file.split(sep).join('/')
    process.stderr.write(`  ${norm}:${v.line}:${v.col}  ${v.pattern}=${v.value}\n`)
    process.stderr.write(`      ${v.context}\n`)
  }
  process.stderr.write(`\n`)

  return isWarn ? 0 : 1
}

if (import.meta.main) {
  const code = await main().catch((err: unknown) => {
    const message = err instanceof Error ? err.message : String(err)
    process.stderr.write(`[no-raw-visual-values] internal error: ${message}\n`)
    return 2
  })
  process.exit(code)
}
