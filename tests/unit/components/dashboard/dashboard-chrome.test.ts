import { describe, test, expect, beforeEach, mock } from 'bun:test'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import * as vueRouter from 'vue-router'

// Plan T18-T22 — dashboard chrome (sidebar parent, BrandSwitcher, SideNav,
// SideFooter, DashboardTopbar) contract.

mock.module('@/components/ui/KovaIcon.vue', () => ({
  default: { name: 'KovaIcon', template: '<span class="kova-icon-stub" />' },
}))
mock.module('vue-router', () => ({
  ...vueRouter,
  useRouter: () => ({
    push: async () => {},
    currentRoute: { value: { params: {} } },
  }),
  useRoute: () => ({ name: 'brand-recents', params: {} }),
}))
// Reka UI portals + teleport are heavy under bun:test; stub the Dropdown* set.
mock.module('reka-ui', () => {
  const passthrough = { template: '<div><slot /></div>' }
  const item = { template: '<button data-reka-item><slot /></button>' }
  return {
    DropdownMenuRoot: passthrough,
    DropdownMenuTrigger: passthrough,
    DropdownMenuPortal: passthrough,
    DropdownMenuContent: passthrough,
    DropdownMenuItem: item,
    DropdownMenuSeparator: { template: '<hr />' },
  }
})

const { default: BrandSwitcher } = await import('@/components/dashboard/BrandSwitcher.vue')
const { default: SideNav } = await import('@/components/dashboard/SideNav.vue')
const { default: SideFooter } = await import('@/components/dashboard/SideFooter.vue')
const { default: DashboardTopbar } = await import('@/components/dashboard/DashboardTopbar.vue')
const { default: DashboardSidebar } = await import('@/components/dashboard/DashboardSidebar.vue')
const { useBrandsStore } = await import('@/stores/brands')
const { useAuthStore } = await import('@/stores/auth')

describe('BrandSwitcher (T19)', () => {
  beforeEach(() => setActivePinia(createPinia()))

  test('renders the current brand name + initial logo', () => {
    const brand = { id: 'b1', name: 'Nike' } as unknown
    const w = mount(BrandSwitcher, { props: { currentBrand: brand } })
    expect(w.text()).toContain('Nike')
    expect(w.find('[data-test-id="brand-switch"] .logo').text()).toBe('N')
  })

  test('renders Manage brands + New brand items', () => {
    const brand = { id: 'b1', name: 'Nike' } as unknown
    const w = mount(BrandSwitcher, { props: { currentBrand: brand } })
    expect(w.find('[data-test-id="brand-manage"]').exists()).toBe(true)
    expect(w.find('[data-test-id="brand-new"]').exists()).toBe(true)
  })

  test('emits select on brand option click', async () => {
    const store = useBrandsStore()
    store.brands = [
      { id: 'b1', name: 'Nike', updated_at: '2026-05-10', user_id: 'u' },
      { id: 'b2', name: 'Allbirds', updated_at: '2026-05-11', user_id: 'u' },
    ] as unknown as typeof store.brands
    const w = mount(BrandSwitcher, { props: { currentBrand: store.brands[0]! } })
    await w.find('[data-test-id="brand-option-b2"]').trigger('click')
    expect(w.emitted('select')?.[0]).toEqual(['b2'])
  })
})

describe('SideNav (T20)', () => {
  test('renders 3 sections (Home, Library, Brand)', () => {
    const w = mount(SideNav)
    const sections = w.findAll('.nav .section')
    expect(sections).toHaveLength(3)
    expect(sections.map((s) => s.text())).toEqual(['Home', 'Library', 'Brand'])
  })

  test('Calendar, Swipes, Templates carry SOON pill', () => {
    const w = mount(SideNav)
    for (const route of ['brand-calendar', 'brand-swipes', 'brand-templates']) {
      const item = w.find(`[data-test-id="nav-${route}"]`)
      expect(item.text()).toContain('SOON')
    }
  })

  test('emits nav with route name on click', async () => {
    const w = mount(SideNav)
    await w.find('[data-test-id="nav-brand-recents"]').trigger('click')
    expect(w.emitted('nav')?.[0]).toEqual(['brand-recents'])
  })

  test('marks active item from current route name', () => {
    const w = mount(SideNav)
    const recents = w.find('[data-test-id="nav-brand-recents"]')
    expect(recents.classes()).toContain('active')
  })
})

describe('SideFooter (T21)', () => {
  beforeEach(() => setActivePinia(createPinia()))

  test('renders user initials in avatar', () => {
    const auth = useAuthStore()
    auth.profile = { name: 'Jiho Yang' } as unknown as typeof auth.profile
    const w = mount(SideFooter)
    expect(w.find('.avatar').text()).toBe('JY')
  })

  test('plan defaults to Free plan when profile.plan absent', () => {
    const auth = useAuthStore()
    auth.profile = { name: 'Anon' } as unknown as typeof auth.profile
    const w = mount(SideFooter)
    expect(w.find('.who span').text()).toBe('Free plan')
  })

  test('plan shows Pro plan when profile.plan = pro', () => {
    const auth = useAuthStore()
    auth.profile = { name: 'X', plan: 'pro' } as unknown as typeof auth.profile
    const w = mount(SideFooter)
    expect(w.find('.who span').text()).toBe('Pro plan')
  })

  test('initials degrade to ? when no name', () => {
    const auth = useAuthStore()
    auth.profile = null
    auth.user = null
    const w = mount(SideFooter)
    expect(w.find('.avatar').text()).toBe('?')
  })
})

describe('DashboardTopbar (T22)', () => {
  test('renders breadcrumb with brandName + currentPage', () => {
    const w = mount(DashboardTopbar, {
      props: { brandName: 'Nike', currentPage: 'Home' },
    })
    expect(w.find('.breadcrumb').text()).toContain('Nike')
    expect(w.find('.breadcrumb b').text()).toBe('Home')
  })

  test('emits new-canvas on button click', async () => {
    const w = mount(DashboardTopbar, {
      props: { brandName: 'Nike', currentPage: 'Home' },
    })
    await w.find('[data-test-id="topbar-new-canvas"]').trigger('click')
    expect(w.emitted('new-canvas')).toHaveLength(1)
  })
})

describe('DashboardSidebar (T18)', () => {
  beforeEach(() => setActivePinia(createPinia()))

  test('renders BrandSwitcher + side-search + SideNav + SideFooter', () => {
    const brand = { id: 'b1', name: 'Nike' } as unknown
    const w = mount(DashboardSidebar, { props: { currentBrand: brand } })
    expect(w.find('[data-test-id="brand-switch"]').exists()).toBe(true)
    expect(w.find('.side-search input').exists()).toBe(true)
    expect(w.find('.nav').exists()).toBe(true)
    expect(w.find('[data-test-id="side-footer"]').exists()).toBe(true)
  })
})
