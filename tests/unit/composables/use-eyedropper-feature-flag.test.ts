import { describe, expect, it } from 'bun:test'
import { EYEDROPPER_NATIVE_TAURI } from '@/config/feature-flags'

describe('EYEDROPPER_NATIVE_TAURI feature flag (C-LOW07b.5)', () => {
  it('defaults to false in MVP (Q20 canvas-only lock active)', () => {
    expect(EYEDROPPER_NATIVE_TAURI).toBe(false)
  })
})
