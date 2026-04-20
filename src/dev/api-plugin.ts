import { type IncomingMessage, type ServerResponse } from 'node:http'
import path from 'node:path'

import { loadEnv } from 'vite'

import type { Plugin, ResolvedConfig, ViteDevServer } from 'vite'

const API_ROUTES: Record<string, string> = {
  '/api/extract-brand': 'extract-brand.ts',
  '/api/analyze-writing-style': 'analyze-writing-style.ts',
  '/api/ai-proxy/v1/messages': 'ai-proxy/v1/messages.ts'
}

async function bufferBody(req: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = []
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  return Buffer.concat(chunks)
}

export function apiPlugin(): Plugin {
  let resolvedConfig: ResolvedConfig

  return {
    name: 'kova-dev-api',
    apply: 'serve',

    configResolved(config) {
      resolvedConfig = config

      // Load ALL env vars (empty prefix = no VITE_ filter) so server-only
      // keys like ANTHROPIC_API_KEY and FIRECRAWL_API_KEY are available.
      const env = loadEnv(config.mode, config.root, '')
      for (const [key, value] of Object.entries(env)) {
        if (!(key in process.env)) {
          process.env[key] = value
        }
      }
    },

    configureServer(server: ViteDevServer) {
      server.middlewares.use(
        async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
          if (req.method !== 'POST' || !req.url) {
            next()
            return
          }

          const pathname = new URL(req.url, 'http://localhost').pathname
          const routeFile = API_ROUTES[pathname]
          if (!routeFile) {
            next()
            return
          }

          try {
            const modulePath = path.resolve(resolvedConfig.root, 'api', routeFile)
            const mod = (await server.ssrLoadModule(modulePath)) as {
              default: (request: Request) => Promise<Response>
            }

            const body = await bufferBody(req)
            const headers = new Headers()
            for (const [key, value] of Object.entries(req.headers)) {
              if (typeof value === 'string') {
                headers.set(key, value)
              }
            }

            const request = new Request(`http://localhost${req.url}`, {
              method: req.method,
              headers,
              body: body.length > 0 ? body : undefined
            })

            const response = await mod.default(request)

            res.statusCode = response.status
            response.headers.forEach((value, key) => {
              res.setHeader(key, value)
            })

            if (response.body) {
              const reader = response.body.getReader()
              const pump = async (): Promise<void> => {
                const { done, value } = await reader.read()
                if (done) {
                  res.end()
                  return
                }
                res.write(value)
                return pump()
              }
              await pump()
            } else {
              res.end()
            }
          } catch (err) {
            console.error(`[api-plugin] Error handling ${pathname}:`, err)
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            const message = err instanceof Error ? err.message : 'Internal server error'
            const stack = err instanceof Error ? err.stack : undefined
            res.end(JSON.stringify({ error: message, stack }))
          }
        }
      )
    }
  }
}
