import { describe, test, expect, beforeEach } from 'bun:test'
import { useOnboardingState } from '@/composables/useOnboardingState'

describe('useOnboardingState', () => {
  let state: ReturnType<typeof useOnboardingState>

  beforeEach(() => {
    state = useOnboardingState()
  })

  test('initializes at step 1 with empty fields', () => {
    expect(state.currentStep.value).toBe(1)
    expect(state.name.value).toBe('')
    expect(state.brandName.value).toBe('')
    expect(state.brandUrl.value).toBe('')
    expect(state.logoFile.value).toBeNull()
    expect(state.logoUrl.value).toBeNull()
    expect(state.colors.value).toBeNull()
    expect(state.fonts.value).toBeNull()
    expect(state.voice.value).toBeNull()
  })

  test('next() advances step', () => {
    state.next()
    expect(state.currentStep.value).toBe(2)
  })

  test('back() decrements step', () => {
    state.currentStep.value = 3
    state.back()
    expect(state.currentStep.value).toBe(2)
  })

  test('back() does not go below 1', () => {
    state.back()
    expect(state.currentStep.value).toBe(1)
  })

  test('next() does not go above 7', () => {
    state.currentStep.value = 7
    state.next()
    expect(state.currentStep.value).toBe(7)
  })

  test('goTo() sets specific step', () => {
    state.goTo(5)
    expect(state.currentStep.value).toBe(5)
  })

  test('goTo() clamps to valid range', () => {
    state.goTo(10)
    expect(state.currentStep.value).toBe(7)
    state.goTo(0)
    expect(state.currentStep.value).toBe(1)
  })

  test('canProceed is false when name is empty on step 2', () => {
    state.currentStep.value = 2
    state.name.value = ''
    expect(state.canProceed.value).toBe(false)
  })

  test('canProceed is true when name is filled on step 2', () => {
    state.currentStep.value = 2
    state.name.value = 'Jiho'
    expect(state.canProceed.value).toBe(true)
  })

  test('canProceed is false when brandName is empty on step 3', () => {
    state.currentStep.value = 3
    state.brandName.value = ''
    expect(state.canProceed.value).toBe(false)
  })

  test('canProceed is true when brandName is filled on step 3', () => {
    state.currentStep.value = 3
    state.brandName.value = 'Kova'
    expect(state.canProceed.value).toBe(true)
  })

  test('canProceed is false when URL is invalid on step 4', () => {
    state.currentStep.value = 4
    state.brandUrl.value = 'notaurl'
    expect(state.canProceed.value).toBe(false)
  })

  test('canProceed is true when URL is valid on step 4', () => {
    state.currentStep.value = 4
    state.brandUrl.value = 'example.com'
    expect(state.canProceed.value).toBe(true)
  })

  test('canProceed is true on step 1 (welcome, always)', () => {
    state.currentStep.value = 1
    expect(state.canProceed.value).toBe(true)
  })

  test('canProceed is true on step 5 (extraction, always)', () => {
    state.currentStep.value = 5
    expect(state.canProceed.value).toBe(true)
  })

  test('canProceed is true on step 6 (review, always)', () => {
    state.currentStep.value = 6
    expect(state.canProceed.value).toBe(true)
  })

  test('skipToReview() jumps from step 4 to step 6', () => {
    state.currentStep.value = 4
    state.skipToReview()
    expect(state.currentStep.value).toBe(6)
  })

  test('totalSteps is 7', () => {
    expect(state.totalSteps).toBe(7)
  })

  test('progress returns fraction of filled steps', () => {
    state.currentStep.value = 3
    expect(state.progress.value).toBeCloseTo(3 / 7)
  })
})
