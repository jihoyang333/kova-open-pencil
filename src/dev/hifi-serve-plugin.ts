import type { Plugin } from 'vite'
import { createReadStream, statSync, existsSync } from 'fs'
import { resolve, extname } from 'path'

/**
 * Serves in-repo hi-fi mockups under `/dev/hifi/**` for the Playwright
 * visual-diff gate (per IMPLEMENTATION_PROMPT.md §10 CI-determinism prereq).
 *
 * Static-serves `kova-open-pencil-1/design-system/hifi/**` at URL prefix
 * `/dev/hifi/**`. Dev-only (skipped in production build).
 *
 * Also serves canonical design-system files under `/dev/canonical/**` for
 * mockup `@import url('canonical/kova-hifi.css')` resolution.
 */

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8'
}

const DESIGN_SYSTEM_ROOT = resolve(__dirname, '../../design-system')

function safeJoin(root: string, rel: string): string | undefined {
  const decoded = decodeURIComponent(rel.replace(/\/+/g, '/'))
  const target = resolve(root, decoded.replace(/^\/+/, ''))
  if (!target.startsWith(root)) return undefined
  return target
}

export function hifiServePlugin(): Plugin {
  return {
    name: 'kova-hifi-serve',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url || ''
        let relPath: string | undefined
        let baseRoot = DESIGN_SYSTEM_ROOT

        if (url.startsWith('/dev/hifi/')) {
          relPath = url.replace(/^\/dev\/hifi/, '/hifi').split('?')[0]
        } else if (url.startsWith('/dev/canonical/')) {
          relPath = url.replace(/^\/dev\/canonical/, '/canonical').split('?')[0]
        } else {
          return next()
        }

        const filePath = safeJoin(baseRoot, relPath || '/')
        if (!filePath || !existsSync(filePath)) {
          res.statusCode = 404
          res.end(`hi-fi not found: ${url}`)
          return
        }

        let stat
        try {
          stat = statSync(filePath)
        } catch {
          res.statusCode = 500
          res.end('stat failed')
          return
        }

        if (stat.isDirectory()) {
          res.statusCode = 403
          res.end('directory listing disabled')
          return
        }

        const mime = MIME[extname(filePath).toLowerCase()] || 'application/octet-stream'
        res.setHeader('Content-Type', mime)
        res.setHeader('Content-Length', stat.size.toString())
        res.setHeader('Cache-Control', 'no-cache, no-store')
        createReadStream(filePath).pipe(res)
      })
    }
  }
}
