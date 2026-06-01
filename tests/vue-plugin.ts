import { plugin } from 'bun'
import { compileScript, compileTemplate, parse } from '@vue/compiler-sfc'

plugin({
  name: 'vue-sfc-loader',
  setup(build) {
    build.module('vue-sfc-loader', () => {
      // no-op module required by bun plugin API
      return { exports: {}, loader: 'object' }
    })

    // Resolve unplugin-icons virtual modules (~icons/lucide/<name>) to a stub <svg>
    // component so kova-icon-registry.ts (and therefore the real <KovaIcon>) imports
    // cleanly under `bun test`, where Vite's plugin is absent. This removes the need for
    // per-file mock.module('@/components/ui/KovaIcon.vue') stubs whose process-global
    // leakage poisoned other tests (audit item 10 — same root cause as the ai-tools mock).
    build.onResolve({ filter: /^~icons\// }, (args) => ({
      path: args.path,
      namespace: 'virtual-icons',
    }))
    build.onLoad({ filter: /.*/, namespace: 'virtual-icons' }, (args) => {
      const name = args.path.split('/').pop() ?? 'icon'
      return {
        contents: `import { h } from 'vue'
export default { name: 'IconStub', inheritAttrs: false, render() { return h('svg', { ...this.$attrs, 'data-icon': '${name}' }) } }`,
        loader: 'ts',
      }
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
