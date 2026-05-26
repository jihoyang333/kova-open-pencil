import { describe, test, expect, mock } from 'bun:test'
import { mount } from '@vue/test-utils'

// PRD 02 §3.1 + Plan T15 — A1.01.e brand kit step contract.

mock.module('@/components/ui/KovaIcon.vue', () => ({
  default: { name: 'KovaIcon', template: '<span class="kova-icon-stub" />' },
}))

const { default: BrandKitStep } = await import('@/components/onboarding/BrandKitStep.vue')

describe('BrandKitStep (A1.01.e)', () => {
  test('renders drop zone + textarea + AI promise card', () => {
    const w = mount(BrandKitStep)
    expect(w.find('[data-test-id="brand-kit-drop"]').exists()).toBe(true)
    expect(w.find('[data-test-id="brand-kit-guidelines"]').exists()).toBe(true)
    expect(w.find('.onb-ai').exists()).toBe(true)
  })

  test('rejects files larger than 25 MB', () => {
    const w = mount(BrandKitStep)
    // happy-dom does not back File with real bytes — override `size` directly so
    // the >25MB threshold check fires deterministically.
    const big = new File(['x'], 'huge.pdf', { type: 'application/pdf' })
    Object.defineProperty(big, 'size', { value: 26 * 1024 * 1024 })
    const vm = w.vm as unknown as {
      onFiles: (files: File[]) => void
      rejectedFiles: Array<{ name: string; reason: string }>
    }
    vm.onFiles([big])
    expect(vm.rejectedFiles).toHaveLength(1)
    expect(vm.rejectedFiles[0]!.reason).toBe('too-large')
  })

  test('rejects unsupported mime types', () => {
    const w = mount(BrandKitStep)
    const exe = new File(['x'], 'evil.exe', { type: 'application/octet-stream' })
    const vm = w.vm as unknown as {
      onFiles: (files: File[]) => void
      rejectedFiles: Array<{ name: string; reason: string }>
    }
    vm.onFiles([exe])
    expect(vm.rejectedFiles[0]!.reason).toBe('wrong-type')
  })

  test('accepts PDF under 25 MB', () => {
    const w = mount(BrandKitStep)
    const ok = new File(['x'], 'brand.pdf', { type: 'application/pdf' })
    const vm = w.vm as unknown as { onFiles: (files: File[]) => void; files: File[] }
    vm.onFiles([ok])
    expect(vm.files).toHaveLength(1)
  })

  test('emits skip on Do this later', async () => {
    const w = mount(BrandKitStep)
    await w.find('[data-test-id="brand-kit-skip"]').trigger('click')
    expect(w.emitted('skip')).toHaveLength(1)
  })

  test('emits commit with files + guidelines on Extract and continue', async () => {
    const w = mount(BrandKitStep)
    const vm = w.vm as unknown as { guidelines: string }
    vm.guidelines = 'No bolds in body copy.'
    await w.find('[data-test-id="brand-kit-commit"]').trigger('click')
    const emitted = w.emitted('commit')
    expect(emitted).toHaveLength(1)
    expect((emitted![0] as [{ files: File[]; guidelines: string }])[0].guidelines).toBe(
      'No bolds in body copy.'
    )
  })
})
