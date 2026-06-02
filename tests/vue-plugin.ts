import { plugin } from 'bun'
import { mock } from 'bun:test'
import { compileScript, compileTemplate, parse } from '@vue/compiler-sfc'
import { defineComponent, h } from 'vue'

// kova-icon-registry.ts statically imports unplugin-icons virtual modules
// (`~icons/lucide/<name>`) that only exist after Vite's build-time transform.
// Under `bun test` those imports are unresolvable, so any component that renders
// <KovaIcon> would crash at module load. Bun's runtime `onResolve` plugin hook
// does NOT intercept these specifiers (verified empirically on bun 1.3.10), so
// we instead replace the whole registry module with a stub. A Proxy-backed Map
// returns an <svg data-icon="<name>"> stub for ANY name, so every <KovaIcon>
// renders deterministically in tests without per-file mock.module() of the
// component itself (whose process-global leakage poisoned other tests — audit
// item 10). Registering it here in preload makes the stub uniform across the
// whole test process; individual tests may still re-mock the registry locally.
const iconStub = (name: string) =>
  defineComponent({
    name: `IconStub-${name}`,
    inheritAttrs: false,
    setup(_props, { attrs }) {
      return () => h('svg', { ...attrs, 'data-icon': name })
    },
  })

const stubRegistry = new Proxy(new Map<string, unknown>(), {
  get(target, prop, receiver) {
    if (prop === 'get') return (name: string) => iconStub(name)
    if (prop === 'has') return () => true
    return Reflect.get(target, prop, receiver)
  },
})

mock.module('@/components/ui/kova-icon-registry', () => ({
  KOVA_ICON_REGISTRY: stubRegistry,
  KOVA_ICON_SIZE_PX: { xs: 12, sm: 14, md: 16, lg: 20 } as const,
}))

plugin({
  name: 'vue-sfc-loader',
  setup(build) {
    build.module('vue-sfc-loader', () => {
      // no-op module required by bun plugin API
      return { exports: {}, loader: 'object' }
    })

    build.onLoad({ filter: /\.vue$/ }, async (args) => {
      const source = await Bun.file(args.path).text()
      const id = args.path

      const { descriptor } = parse(source, { filename: id })

      // Compile <script setup> or <script>
      let scriptCode = ''
      if (descriptor.scriptSetup || descriptor.script) {
        const compiled = compileScript(descriptor, {
          id,
          inlineTemplate: true,
        })
        scriptCode = compiled.content
      }

      // Replace vue imports to fix __isKeepAlive etc.
      const output = scriptCode
        .replace(
          /import\s*\{([^}]+)\}\s*from\s*['"]vue['"]/g,
          'import {$1} from "vue"'
        )

      return {
        contents: output,
        loader: 'ts',
      }
    })
  },
})
