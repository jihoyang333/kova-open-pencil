import { describe, expect, test } from 'bun:test'

import { mount } from '@vue/test-utils'

import AuthDivider from '../../../../src/components/auth/AuthDivider.vue'

describe('<AuthDivider>', () => {
  test('default label is "or"', () => {
    expect(mount(AuthDivider).text()).toBe('or')
  })

  test('custom label renders', () => {
    expect(mount(AuthDivider, { props: { label: 'OR' } }).text()).toBe('OR')
  })
})
