import { describe, expect, test } from 'bun:test'

import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'

// Stub the unplugin-icons virtual modules so jsdom doesn't need Vite.
const stubIcon = (name: string) =>
  defineComponent({
    name,
    inheritAttrs: false,
    setup(_, { attrs }) {
      return () => h('span', { ...attrs, 'data-icon': name })
    }
  })

import MagicLinkSentBlock from '../../../../src/components/auth/MagicLinkSentBlock.vue'

const mountIt = (props: {
  email: string
  resendCooldown: number
  tagState?: 'delivered' | 'pending'
}) =>
  mount(MagicLinkSentBlock, {
    props,
    global: {
      stubs: {
        'icon-lucide-mail': stubIcon('mail'),
        'icon-lucide-clock': stubIcon('clock')
      }
    }
  })

describe('<MagicLinkSentBlock>', () => {
  test('renders the email in the rail line', () => {
    const wrapper = mountIt({ email: 'a@b.co', resendCooldown: 60 })
    expect(wrapper.text()).toContain('a@b.co')
  })

  test('renders the "Delivered" tag by default', () => {
    const wrapper = mountIt({ email: 'a@b.co', resendCooldown: 60 })
    expect(wrapper.text()).toContain('Delivered')
  })

  test('tagState="pending" renders "Pending"', () => {
    const wrapper = mountIt({ email: 'a@b.co', resendCooldown: 60, tagState: 'pending' })
    expect(wrapper.text()).toContain('Pending')
  })

  test('shows cooldown countdown when resendCooldown > 0', () => {
    const wrapper = mountIt({ email: 'a@b.co', resendCooldown: 45 })
    expect(wrapper.text()).toContain('Resend in 45s')
    expect(wrapper.find('button:not([data-test-id])').text()).not.toBe('Resend link')
  })

  test('shows "Resend link" button when cooldown is 0', () => {
    const wrapper = mountIt({ email: 'a@b.co', resendCooldown: 0 })
    const buttons = wrapper.findAll('button').map((b) => b.text())
    expect(buttons).toContain('Resend link')
  })

  test('clicking Resend link emits resend when cooldown is 0', async () => {
    const wrapper = mountIt({ email: 'a@b.co', resendCooldown: 0 })
    const resendBtn = wrapper.findAll('button').find((b) => b.text() === 'Resend link')
    await resendBtn?.trigger('click')
    expect(wrapper.emitted('resend')).toBeDefined()
  })

  test('clicking "Enter a 6-digit code instead" emits enter-code-instead', async () => {
    const wrapper = mountIt({ email: 'a@b.co', resendCooldown: 0 })
    const codeBtn = wrapper
      .findAll('button')
      .find((b) => b.text() === 'Enter a 6-digit code instead')
    await codeBtn?.trigger('click')
    expect(wrapper.emitted('enter-code-instead')).toBeDefined()
  })
})
