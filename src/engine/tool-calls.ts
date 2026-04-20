import { FigmaAPI } from '@open-pencil/core'
import type { Fill, LayoutMode } from '@open-pencil/core'
import { makeFigmaFromStore } from '@/automation/figma-factory'
import { useEditorStore } from '@/stores/editor'

type SupportedNodeType = 'FRAME' | 'TEXT' | 'RECTANGLE' | 'ELLIPSE'

interface CreateNodeInput {
  type: SupportedNodeType
  name?: string
  parent?: string
}

interface LayoutInput {
  direction: 'VERTICAL' | 'HORIZONTAL'
  gap?: number
  padding?: number
  width?: number
  height?: number
}

function getFigma(): FigmaAPI {
  return makeFigmaFromStore(useEditorStore())
}

export async function createNode(input: CreateNodeInput): Promise<string> {
  const figma = getFigma()
  const creators: Record<SupportedNodeType, () => ReturnType<typeof figma.createFrame>> = {
    FRAME: () => figma.createFrame(),
    TEXT: () => figma.createText(),
    RECTANGLE: () => figma.createRectangle(),
    ELLIPSE: () => figma.createEllipse(),
  }
  const node = creators[input.type]()
  if (input.name) node.name = input.name
  if (input.parent) {
    const parent = figma.getNodeById(input.parent)
    parent?.appendChild(node)
  }
  return node.id
}

export async function setLayout(nodeId: string, layout: LayoutInput): Promise<void> {
  const figma = getFigma()
  const node = figma.getNodeById(nodeId)
  if (!node) return
  node.layoutMode = layout.direction as LayoutMode
  if (layout.gap != null) node.itemSpacing = layout.gap
  if (layout.padding != null) {
    node.paddingTop = layout.padding
    node.paddingBottom = layout.padding
    node.paddingLeft = layout.padding
    node.paddingRight = layout.padding
  }
  if (layout.width != null) node.resize(layout.width, node.height)
  if (layout.height != null) node.resize(node.width, layout.height)
}

export async function setText(nodeId: string, text: string): Promise<void> {
  const figma = getFigma()
  const node = figma.getNodeById(nodeId)
  if (!node) return
  node.characters = text
}

export async function setImage(nodeId: string, url: string): Promise<void> {
  const figma = getFigma()
  const node = figma.getNodeById(nodeId)
  if (!node) return
  const response = await fetch(url)
  const buffer = await response.arrayBuffer()
  const image = figma.createImage(new Uint8Array(buffer))
  const fill: Fill = {
    type: 'IMAGE',
    color: { r: 0, g: 0, b: 0, a: 1 },
    opacity: 1,
    visible: true,
    imageHash: image.hash,
    imageScaleMode: 'FILL',
  }
  node.fills = [fill]
}

export async function setFill(nodeId: string, fill: { color: string }): Promise<void> {
  const figma = getFigma()
  const node = figma.getNodeById(nodeId)
  if (!node) return
  const { parse } = await import('culori')
  const parsed = parse(fill.color)
  if (!parsed) return
  const c = parsed as { r?: number; g?: number; b?: number }
  const solidFill: Fill = {
    type: 'SOLID',
    color: { r: c.r ?? 0, g: c.g ?? 0, b: c.b ?? 0, a: 1 },
    opacity: 1,
    visible: true,
  }
  node.fills = [solidFill]
}
