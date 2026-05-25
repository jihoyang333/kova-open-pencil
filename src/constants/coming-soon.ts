// PRD 02 §3.6 + Plan T36 — A12 coming-soon shell content per route.

export interface ComingSoonSpec {
  icon: string
  eyebrow: string
  headline: string
  body: string
  roadmap: string[]
  tabs?: string[]
}

export const COMING_SOON: Record<string, ComingSoonSpec> = {
  calendar: {
    icon: 'calendar-days',
    eyebrow: 'Phase 2 · planning surface',
    headline: 'A calendar for everything you ship',
    body: 'See campaigns, drops, and one-off sends in one timeline. Drag a canvas onto a date to schedule it.',
    roadmap: ['Month + week views', 'Drag canvases onto dates', 'Shopify product drop overlay'],
  },
  swipes: {
    icon: 'bookmark',
    eyebrow: 'Phase 2 · inspiration library',
    headline: 'Save what works — references at your fingertips',
    body: 'Capture emails that work, organize by tag, and reference them inside the editor.',
    roadmap: ['Save from any URL', 'Tag-based filtering', 'In-editor sidebar quick-view'],
  },
  templates: {
    icon: 'layout-template',
    eyebrow: 'Phase 2 · starting points',
    headline: 'Battle-tested templates for every campaign type',
    body: 'Start from a curated template tuned for your brand voice, not generic stock.',
    roadmap: ['Curated DTC templates', 'Brand-kit auto-styled', 'One-click duplicate to your library'],
    tabs: ['Templates', 'Examples'],
  },
  products: {
    icon: 'package',
    eyebrow: 'From your Shopify catalog',
    headline: 'Products',
    body: 'Browse your Shopify catalog from inside Kova (ships with Cluster 05).',
    roadmap: ['Live catalog sync', 'Filter by collection', 'Drag products into AI chat'],
  },
  personalization: {
    icon: 'sparkles',
    eyebrow: 'Phase 2',
    headline: 'Personalization',
    body: 'Per-segment AI tuning (ships with Cluster 10).',
    roadmap: [],
  },
  'knowledge-base': {
    icon: 'book-open',
    eyebrow: 'Phase 2',
    headline: 'Knowledge base',
    body: 'Per-brand docs the AI references (ships with Cluster 05).',
    roadmap: [],
  },
  memories: {
    icon: 'brain',
    eyebrow: 'Phase 2',
    headline: 'Memories',
    body: 'Per-brand AI memory (ships with Cluster 10).',
    roadmap: [],
  },
}
