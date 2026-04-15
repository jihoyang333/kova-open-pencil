import { resolve } from 'path'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import Icons from 'unplugin-icons/vite'
import IconsResolver from 'unplugin-icons/resolver'
import Components from 'unplugin-vue-components/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { copyFileSync, existsSync, mkdirSync } from 'fs'

import { apiPlugin } from './src/dev/api-plugin'
import { automationPlugin } from './src/automation/vite-plugin'

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST

// `vue-stream-markdown` ships ~100 pre-hashed ESM chunks wired via internal
// `import('./chunk-HASH.js')` calls (one per markdown AST node). Vite's default
// dep-optimizer re-hashes those chunks; any re-optimization pass invalidates the
// old URLs that the already-loaded page holds, producing runtime
// `Failed to fetch dynamically imported module: .../paragraph-*.js` errors the
// moment the assistant streams its first markdown response. Excluding the
// package tells Vite to serve it straight from `node_modules/` where the
// package's own hashes are stable (maintainer guidance: jinghaihan/vue-stream-markdown#27).
// Exported so tests can assert these lists stay in place.
export const VITE_OPTIMIZE_DEPS_EXCLUDE = ['vue-stream-markdown'] as const
// CJS transitive dependencies of `vue-stream-markdown` that need forced pre-bundling.
// Two classes of import trigger `does not provide an export named 'default'` at runtime
// when their ESM ancestor is excluded from dep-optimization:
//
//   1. `fault@2.0.1` (ESM) → `import formatter from 'format'` where `format@0.2.2` is
//      CJS (`module.exports = format`). esbuild keeps `format` external in the `fault`
//      bundle rather than inlining it, so `format` also needs its own pre-bundle pass
//      for the CJS→ESM default-export synthesis.
//   2. `micromark@4.0.2` (dev export condition, ESM) → `import createDebug from 'debug'`
//      where `debug@4.4.3` is CJS (`exports.X = X`). `debug` internally `require()`s
//      `ms@2.1.3` (also CJS); esbuild inlines the CJS require, but we pin `ms` anyway
//      to keep the pre-bundle chain stable across lockfile churn.
//
// Prerequisite — every entry below is ALSO declared as a direct dependency in
// package.json. Bun's isolated install only hoists top-level `node_modules/<pkg>`
// symlinks for direct deps; transitives live under `.bun/<pkg>@<ver>/node_modules/`
// and are unreachable by Vite's resolver. Without the direct-dep declaration, Vite
// silently drops these include entries, pre-bundling never runs, and the canvas entry
// dies with `does not provide an export named 'default'` on first load.
export const VITE_OPTIMIZE_DEPS_INCLUDE = ['fault', 'format', 'debug', 'ms'] as const

export default defineConfig(async () => ({
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      // vue-stream-markdown eagerly loads mermaid/beautiful-mermaid as optional peer deps.
      // Alias to empty shims to avoid runtime errors and reduce bundle size.
      mermaid: resolve(__dirname, 'src/shims/mermaid.ts'),
      'beautiful-mermaid': resolve(__dirname, 'src/shims/mermaid.ts')
    }
  },
  plugins: [
    {
      name: 'copy-canvaskit-wasm',
      buildStart() {
        const src = 'node_modules/canvaskit-wasm/bin/canvaskit.wasm'
        const dest = 'public/canvaskit.wasm'
        if (existsSync(src) && !existsSync(dest)) {
          copyFileSync(src, dest)
        }

        const webgpuSrc = 'packages/core/vendor/canvaskit-webgpu/canvaskit.wasm'
        const webgpuDir = 'public/canvaskit-webgpu'
        const webgpuDest = `${webgpuDir}/canvaskit.wasm`
        if (existsSync(webgpuSrc) && !existsSync(webgpuDest)) {
          mkdirSync(webgpuDir, { recursive: true })
          copyFileSync(webgpuSrc, webgpuDest)
        }

        const webgpuJsSrc = 'packages/core/vendor/canvaskit-webgpu/canvaskit.js'
        const webgpuJsDest = `${webgpuDir}/canvaskit.js`
        if (existsSync(webgpuJsSrc) && !existsSync(webgpuJsDest)) {
          mkdirSync(webgpuDir, { recursive: true })
          copyFileSync(webgpuJsSrc, webgpuJsDest)
        }
      }
    },
    tailwindcss(),
    Icons({ compiler: 'vue3' }),
    Components({ resolvers: [IconsResolver({ prefix: 'icon' })] }),
    apiPlugin(),
    automationPlugin(),
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: { enabled: false },
      workbox: {
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        globPatterns: ['**/*.{js,css,html,wasm,png,ico,ttf,webmanifest}'],
        navigateFallback: '/index.html'
      },
      manifest: {
        name: 'Kova',
        short_name: 'Kova',
        description: 'AI-powered email design editor',
        display: 'standalone',
        orientation: 'any',
        start_url: '/',
        scope: '/',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        categories: ['design', 'productivity'],
        icons: [
          { src: '/pwa-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      }
    })
  ],
  clearScreen: false,
  optimizeDeps: {
    exclude: [...VITE_OPTIMIZE_DEPS_EXCLUDE],
    include: [...VITE_OPTIMIZE_DEPS_INCLUDE]
  },
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: 'ws',
          host,
          port: 1421
        }
      : undefined,
    watch: {
      ignored: [
        '**/desktop/**',
        '**/packages/cli/**',
        '**/packages/mcp/**',
        '**/packages/docs/**',
        '**/tests/**',
        '**/openspec/**',
        '**/.worktrees/**',
        '**/.github/**',
        '**/.pi/**'
      ]
    }
  }
}))
