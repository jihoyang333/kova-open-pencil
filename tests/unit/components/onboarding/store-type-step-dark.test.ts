import { describe, expect, test, beforeAll } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// PRD 02 §5.6 item 1 + Plan T02 — StoreTypeStep + IntegrationsCard refactor
// from M9 light Tailwind classes to dark theme via kova-hifi.css tokens.
// Static-source contract — same approach used for migration shape tests.
// PRD 02 §9.5 will enforce these grep checks in CI (Plan T40).

const ROOT = join(import.meta.dir, '../../../..')
const STORE_TYPE = join(ROOT, 'src/components/onboarding/StoreTypeStep.vue')
const INTEGRATIONS = join(ROOT, 'src/components/dashboard/IntegrationsCard.vue')

const LIGHT_PATTERNS = [
  'bg-white',
  'text-gray-900',
  'text-gray-500',
  'text-gray-400',
  'text-gray-300',
  'text-gray-700',
  'border-gray-200',
  'border-gray-300',
  'bg-blue-50',
  'bg-gray-50',
  'bg-gray-200',
  'bg-gray-900',
  'bg-gray-700',
  'border-blue-500',
  'focus:ring-blue-500',
  'placeholder-gray-400',
  'hover:bg-gray-50',
  'hover:bg-gray-700',
  'hover:border-gray-300',
  'border-amber-200',
  'bg-amber-50',
  'bg-amber-600',
  'bg-amber-500',
  'text-amber-800',
  'text-amber-700',
  'text-amber-600',
  'text-red-600',
  'text-green-500',
] as const

let storeType: string
let integrations: string

beforeAll(() => {
  storeType = readFileSync(STORE_TYPE, 'utf-8')
  integrations = readFileSync(INTEGRATIONS, 'utf-8')
})

describe('StoreTypeStep — dark theme (Plan T02)', () => {
  test('no light Tailwind classes in source', () => {
    for (const pattern of LIGHT_PATTERNS) {
      expect(storeType).not.toContain(pattern)
    }
  })

  test('uses kova-hifi.css token vars', () => {
    expect(storeType).toMatch(/var\(--ink(?:-\d)?\)/)
    expect(storeType).toMatch(/var\(--line\)/)
  })
})

describe('IntegrationsCard — dark theme (Plan T02)', () => {
  test('no light Tailwind classes in source', () => {
    for (const pattern of LIGHT_PATTERNS) {
      expect(integrations).not.toContain(pattern)
    }
  })

  test('uses kova-hifi.css token vars', () => {
    expect(integrations).toMatch(/var\(--ink(?:-\d)?\)/)
    expect(integrations).toMatch(/var\(--line\)/)
  })
})
