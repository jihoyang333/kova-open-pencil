import { plugin } from 'bun'
import { compileScript, compileTemplate, parse } from '@vue/compiler-sfc'

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
