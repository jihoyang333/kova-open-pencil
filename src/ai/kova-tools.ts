import { valibotSchema } from '@ai-sdk/valibot'
import { tool } from 'ai'
import * as v from 'valibot'

import { makeFigmaFromStore } from '@/automation/figma-factory'
import { computeAllLayouts } from '@open-pencil/core'

import type { EditorStore } from '@/stores/editor'

const SUPABASE_STORAGE_PATTERN = /^https:\/\/[a-z0-9-]+\.supabase\.co\/storage\//

const FETCH_TIMEOUT_MS = 10_000

export function validateImageUrl(url: string): void {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    throw new Error(`Invalid URL: ${url}`)
  }

  if (parsed.protocol !== 'https:') {
    throw new Error('Only HTTPS URLs are allowed')
  }

  if (!SUPABASE_STORAGE_PATTERN.test(url)) {
    throw new Error(`Only Supabase Storage URLs are allowed. Got: ${url}`)
  }
}

export function createKovaTools(store: EditorStore) {
  const placeMediaImage = tool({
    description:
      'Place an image from Supabase Storage onto a canvas node. ' +
      'Fetches the image and sets it as an image fill on the target node. ' +
      'Only accepts Supabase Storage URLs.',
    parameters: valibotSchema(
      v.object({
        node_id: v.pipe(
          v.string(),
          v.description('The ID of the target node to place the image on')
        ),
        image_url: v.pipe(
          v.string(),
          v.description('Supabase Storage URL of the image')
        ),
        scale_mode: v.optional(
          v.pipe(
            v.picklist(['FILL', 'FIT', 'CROP', 'TILE']),
            v.description('How to scale the image within the node')
          ),
          'FILL'
        ),
      })
    ),
    execute: async ({ node_id, image_url, scale_mode }) => {
      try {
        validateImageUrl(image_url)
      } catch (e) {
        return { error: e instanceof Error ? e.message : 'Invalid URL' }
      }

      const beforeSnapshot = store.snapshotPage()

      let imageBytes: Uint8Array
      try {
        const response = await fetch(image_url, {
          signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        })

        if (!response.ok) {
          return {
            error: `Failed to load image from ${image_url}. HTTP ${response.status}. Using a placeholder instead.`,
          }
        }

        imageBytes = new Uint8Array(await response.arrayBuffer())
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Unknown error'
        return {
          error: `Failed to load image from ${image_url}. ${message}. Using a placeholder instead.`,
        }
      }

      const figma = makeFigmaFromStore(store)
      const node = figma.getNodeById(node_id)
      if (!node) {
        return { error: `Node ${node_id} not found` }
      }

      const image = figma.createImage(imageBytes)
      const mode = (scale_mode ?? 'FILL') as 'FILL' | 'FIT' | 'CROP' | 'TILE'
      node.fills = [
        {
          type: 'IMAGE',
          color: { r: 1, g: 1, b: 1, a: 1 },
          opacity: 1,
          visible: true,
          imageHash: image.hash,
          imageScaleMode: mode,
        },
      ]

      const pageId = store.state.currentPageId
      computeAllLayouts(store.graph, pageId)
      store.requestRender()

      const afterSnapshot = store.snapshotPage()
      store.pushUndoEntry({
        label: 'AI: placeMediaImage',
        forward: () => store.restorePageFromSnapshot(afterSnapshot),
        inverse: () => store.restorePageFromSnapshot(beforeSnapshot),
      })

      store.renderer?.aiClearActive()
      store.aiFlashDone([node_id])

      return { success: true, node_id, scale_mode: mode }
    },
  })

  return { placeMediaImage }
}
