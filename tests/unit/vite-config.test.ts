import { describe, test, expect } from 'bun:test'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

const projectRoot = resolve(import.meta.dir, '../..')

describe('vite optimizeDeps contract', () => {
  test('vue-stream-markdown is excluded from Vite dep pre-bundling', async () => {
    const { VITE_OPTIMIZE_DEPS_EXCLUDE } = await import('../../vite.config')
    expect(
      VITE_OPTIMIZE_DEPS_EXCLUDE,
      'vue-stream-markdown MUST stay in optimizeDeps.exclude — removing it resurrects runtime ' +
        '"Failed to fetch dynamically imported module: .../paragraph-*.js" errors the moment an ' +
        'assistant streams markdown. The package ships ~100 pre-hashed ESM chunks that Vite ' +
        're-hashes on every dep-optimization pass, invalidating URLs held by the loaded page. ' +
        'See vite.config.ts header comment and jinghaihan/vue-stream-markdown#27.'
    ).toContain('vue-stream-markdown')
  })

  test('CJS transitives are force-included in Vite dep pre-bundling', async () => {
    const { VITE_OPTIMIZE_DEPS_INCLUDE } = await import('../../vite.config')
    const reasons: Record<string, string> = {
      fault:
        'fault@2.0.1 (ESM) imports format@0.2.2 (CJS) via a default import. Because ' +
        'vue-stream-markdown (its ancestor) is excluded from pre-bundling, Vite never ' +
        'discovers fault at startup; esbuild also keeps format external rather than ' +
        'inlining it, so format needs its own pre-bundle pass too.',
      format:
        'format@0.2.2 is CJS (no default export). Without an explicit pre-bundle pass, ' +
        'Vite serves it raw and fault (its ESM consumer) breaks with "does not provide ' +
        'an export named default", taking down the canvas.',
      debug:
        'debug@4.4.3 is CJS and is imported as a default import by micromark@4.0.2 ' +
        '(dev export condition, via `import createDebug from \'debug\'` in ' +
        'dev/lib/create-tokenizer.js). Without pre-bundling, Vite serves debug/src/' +
        'browser.js raw and the canvas entry dies with "does not provide an export ' +
        'named default".',
      ms:
        'ms@2.1.3 is CJS and is required by debug internally. esbuild inlines the ' +
        'require when debug is pre-bundled, but we pin ms here to keep the chain ' +
        'stable — a lockfile bump that puts ms behind a different interop boundary ' +
        'would otherwise resurface the default-export error without warning.'
    }
    for (const [pkg, reason] of Object.entries(reasons)) {
      expect(VITE_OPTIMIZE_DEPS_INCLUDE, `${pkg} MUST stay in optimizeDeps.include — ${reason}`).toContain(
        pkg
      )
    }
  })

  test('CJS transitives resolve from project root node_modules', () => {
    // Bun's isolated install only hoists DIRECT package.json deps to the top-level
    // node_modules as symlinks. Transitive deps live under .bun/<pkg>@<ver>/node_modules/
    // and aren't reachable by Vite's resolver when it processes optimizeDeps.include.
    // If any of these aren't resolvable here, Vite silently drops them from the include
    // list and pre-bundling never happens — the exact failure mode that brings down the
    // canvas with "does not provide an export named 'default'". Declaring them as direct
    // deps in package.json creates the top-level symlinks Vite needs.
    for (const pkg of ['fault', 'format', 'debug', 'ms'] as const) {
      const pkgJson = resolve(projectRoot, 'node_modules', pkg, 'package.json')
      expect(
        existsSync(pkgJson),
        `node_modules/${pkg}/package.json must exist at project root. Missing = Bun has not ` +
          `hoisted it because it is not a direct dep in package.json. Vite's optimizeDeps.include ` +
          `then silently no-ops and the pre-bundle pass never runs, resurrecting the canvas-entry ` +
          `error "does not provide an export named 'default'".`
      ).toBe(true)
    }
  })
})
