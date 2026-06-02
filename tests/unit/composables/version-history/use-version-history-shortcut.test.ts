import { describe, expect, it, afterAll } from 'bun:test'
import { matchesVersionShortcut } from '@/composables/version-history/use-version-history-shortcut'

const origPlatform = navigator.platform
function setPlatform(p: string) {
  Object.defineProperty(navigator, 'platform', { configurable: true, value: p })
}
afterAll(() => setPlatform(origPlatform))

type Mods = Partial<Pick<KeyboardEvent, 'metaKey' | 'altKey' | 'ctrlKey' | 'code'>>
const ev = (m: Mods): KeyboardEvent => ({ metaKey: false, altKey: false, ctrlKey: false, code: '', ...m }) as KeyboardEvent

describe('matchesVersionShortcut', () => {
  it('Mac: Cmd+Alt+S matches', () => {
    setPlatform('MacIntel')
    expect(matchesVersionShortcut(ev({ metaKey: true, altKey: true, code: 'KeyS' }))).toBe(true)
    expect(matchesVersionShortcut(ev({ ctrlKey: true, altKey: true, code: 'KeyS' }))).toBe(false)
  })

  it('Win: Ctrl+Alt+S matches', () => {
    setPlatform('Win32')
    expect(matchesVersionShortcut(ev({ ctrlKey: true, altKey: true, code: 'KeyS' }))).toBe(true)
    expect(matchesVersionShortcut(ev({ metaKey: true, altKey: true, code: 'KeyS' }))).toBe(false)
  })

  it('bare S does not match', () => {
    setPlatform('MacIntel')
    expect(matchesVersionShortcut(ev({ code: 'KeyS' }))).toBe(false)
  })
})
