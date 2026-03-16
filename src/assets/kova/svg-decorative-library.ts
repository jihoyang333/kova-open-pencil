export interface ShapeTemplate {
  name: string;
  category: string;
  fillGeometry: { path: string; windingRule: string }[];
}

const shapes: ShapeTemplate[] = [
  // ---- Arrows ----
  {
    name: 'Arrow Right',
    category: 'Arrows',
    fillGeometry: [{ path: 'M10 40 L65 40 L65 20 L90 50 L65 80 L65 60 L10 60 Z', windingRule: 'NONZERO' }],
  },
  {
    name: 'Arrow Left',
    category: 'Arrows',
    fillGeometry: [{ path: 'M90 40 L35 40 L35 20 L10 50 L35 80 L35 60 L90 60 Z', windingRule: 'NONZERO' }],
  },
  {
    name: 'Arrow Up',
    category: 'Arrows',
    fillGeometry: [{ path: 'M40 90 L40 35 L20 35 L50 10 L80 35 L60 35 L60 90 Z', windingRule: 'NONZERO' }],
  },
  {
    name: 'Arrow Down',
    category: 'Arrows',
    fillGeometry: [{ path: 'M40 10 L40 65 L20 65 L50 90 L80 65 L60 65 L60 10 Z', windingRule: 'NONZERO' }],
  },
  {
    name: 'Double Arrow',
    category: 'Arrows',
    fillGeometry: [{ path: 'M5 50 L25 30 L25 42 L75 42 L75 30 L95 50 L75 70 L75 58 L25 58 L25 70 Z', windingRule: 'NONZERO' }],
  },

  // ---- Stars ----
  {
    name: 'Star 4pt',
    category: 'Stars',
    fillGeometry: [{ path: 'M50 0 L60 40 L100 50 L60 60 L50 100 L40 60 L0 50 L40 40 Z', windingRule: 'NONZERO' }],
  },
  {
    name: 'Star 5pt',
    category: 'Stars',
    fillGeometry: [{ path: 'M50 0 L61 35 L98 35 L68 57 L79 91 L50 70 L21 91 L32 57 L2 35 L39 35 Z', windingRule: 'NONZERO' }],
  },
  {
    name: 'Star 6pt',
    category: 'Stars',
    fillGeometry: [{ path: 'M50 0 L58 35 L93 15 L65 42 L100 50 L65 58 L93 85 L58 65 L50 100 L42 65 L7 85 L35 58 L0 50 L35 42 L7 15 L42 35 Z', windingRule: 'NONZERO' }],
  },

  // ---- Basic Shapes ----
  {
    name: 'Triangle Up',
    category: 'Shapes',
    fillGeometry: [{ path: 'M50 5 L95 95 L5 95 Z', windingRule: 'NONZERO' }],
  },
  {
    name: 'Triangle Down',
    category: 'Shapes',
    fillGeometry: [{ path: 'M5 5 L95 5 L50 95 Z', windingRule: 'NONZERO' }],
  },
  {
    name: 'Diamond',
    category: 'Shapes',
    fillGeometry: [{ path: 'M50 0 L100 50 L50 100 L0 50 Z', windingRule: 'NONZERO' }],
  },
  {
    name: 'Pentagon',
    category: 'Shapes',
    fillGeometry: [{ path: 'M50 2 L97 36 L79 93 L21 93 L3 36 Z', windingRule: 'NONZERO' }],
  },
  {
    name: 'Hexagon',
    category: 'Shapes',
    fillGeometry: [{ path: 'M25 3 L75 3 L100 50 L75 97 L25 97 L0 50 Z', windingRule: 'NONZERO' }],
  },
  {
    name: 'Cross',
    category: 'Shapes',
    fillGeometry: [{ path: 'M35 0 L65 0 L65 35 L100 35 L100 65 L65 65 L65 100 L35 100 L35 65 L0 65 L0 35 L35 35 Z', windingRule: 'NONZERO' }],
  },
  {
    name: 'Plus Sign',
    category: 'Shapes',
    fillGeometry: [{ path: 'M40 10 L60 10 L60 40 L90 40 L90 60 L60 60 L60 90 L40 90 L40 60 L10 60 L10 40 L40 40 Z', windingRule: 'NONZERO' }],
  },
  {
    name: 'Circle Ring',
    category: 'Shapes',
    fillGeometry: [{
      path: 'M50 0 C77.6 0 100 22.4 100 50 C100 77.6 77.6 100 50 100 C22.4 100 0 77.6 0 50 C0 22.4 22.4 0 50 0 Z M50 15 C30.7 15 15 30.7 15 50 C15 69.3 30.7 85 50 85 C69.3 85 85 69.3 85 50 C85 30.7 69.3 15 50 15 Z',
      windingRule: 'EVENODD',
    }],
  },
  {
    name: 'Pill Shape',
    category: 'Shapes',
    fillGeometry: [{ path: 'M30 10 L70 10 C81 10 90 19 90 30 L90 70 C90 81 81 90 70 90 L30 90 C19 90 10 81 10 70 L10 30 C10 19 19 10 30 10 Z', windingRule: 'NONZERO' }],
  },

  // ---- Decorative ----
  {
    name: 'Heart',
    category: 'Decorative',
    fillGeometry: [{ path: 'M50 88 C20 65 2 45 2 28 C2 14 14 2 28 2 C37 2 45 7 50 15 C55 7 63 2 72 2 C86 2 98 14 98 28 C98 45 80 65 50 88 Z', windingRule: 'NONZERO' }],
  },
  {
    name: 'Lightning Bolt',
    category: 'Decorative',
    fillGeometry: [{ path: 'M60 2 L25 52 L45 52 L38 98 L78 42 L55 42 Z', windingRule: 'NONZERO' }],
  },
  {
    name: 'Speech Bubble',
    category: 'Decorative',
    fillGeometry: [{ path: 'M15 5 L85 5 C91 5 95 9 95 15 L95 60 C95 66 91 70 85 70 L40 70 L20 90 L25 70 L15 70 C9 70 5 66 5 60 L5 15 C5 9 9 5 15 5 Z', windingRule: 'NONZERO' }],
  },
  {
    name: 'Check Badge',
    category: 'Decorative',
    fillGeometry: [{ path: 'M50 0 C77.6 0 100 22.4 100 50 C100 77.6 77.6 100 50 100 C22.4 100 0 77.6 0 50 C0 22.4 22.4 0 50 0 Z M43 70 L78 35 L72 29 L43 58 L28 43 L22 49 Z', windingRule: 'EVENODD' }],
  },
  {
    name: 'Cloud',
    category: 'Decorative',
    fillGeometry: [{ path: 'M25 80 C11 80 0 69 0 55 C0 43 8 33 20 30 C20 14 33 0 50 0 C64 0 76 10 79 24 C81 23 83 22 85 22 C93 22 100 29 100 38 C100 40 99 42 98 44 C99 46 100 48 100 50 C100 61 91 70 80 70 L80 80 Z', windingRule: 'NONZERO' }],
  },
  {
    name: 'Moon',
    category: 'Decorative',
    fillGeometry: [{ path: 'M70 5 C55 15 45 32 45 50 C45 68 55 85 70 95 C63 98 56 100 50 100 C22 100 0 78 0 50 C0 22 22 0 50 0 C56 0 63 2 70 5 Z', windingRule: 'NONZERO' }],
  },
  {
    name: 'Sun Rays',
    category: 'Decorative',
    fillGeometry: [{ path: 'M50 0 L54 20 L70 5 L58 23 L80 15 L63 30 L95 25 L67 38 L100 50 L67 62 L95 75 L63 70 L80 85 L58 77 L70 95 L54 80 L50 100 L46 80 L30 95 L42 77 L20 85 L37 70 L5 75 L33 62 L0 50 L33 38 L5 25 L37 30 L20 15 L42 23 L30 5 L46 20 Z', windingRule: 'NONZERO' }],
  },
  {
    name: 'Infinity',
    category: 'Decorative',
    fillGeometry: [{ path: 'M30 30 C15 30 5 38 5 50 C5 62 15 70 30 70 C40 70 46 63 50 55 C54 63 60 70 70 70 C85 70 95 62 95 50 C95 38 85 30 70 30 C60 30 54 37 50 45 C46 37 40 30 30 30 Z M30 40 C38 40 42 47 45 50 C42 53 38 60 30 60 C20 60 15 55 15 50 C15 45 20 40 30 40 Z M70 40 C80 40 85 45 85 50 C85 55 80 60 70 60 C62 60 58 53 55 50 C58 47 62 40 70 40 Z', windingRule: 'EVENODD' }],
  },
  {
    name: 'Bookmark',
    category: 'Decorative',
    fillGeometry: [{ path: 'M15 0 L85 0 L85 100 L50 75 L15 100 Z', windingRule: 'NONZERO' }],
  },
  {
    name: 'Tag',
    category: 'Decorative',
    fillGeometry: [{ path: 'M5 5 L55 5 L95 50 L55 95 L5 95 Z M22 35 C27 35 32 30 32 25 C32 20 27 15 22 15 C17 15 12 20 12 25 C12 30 17 35 22 35 Z', windingRule: 'EVENODD' }],
  },

  // ---- Layout / Dividers ----
  {
    name: 'Divider Line',
    category: 'Layout',
    fillGeometry: [{ path: 'M0 48 L100 48 L100 52 L0 52 Z', windingRule: 'NONZERO' }],
  },
  {
    name: 'Wave',
    category: 'Layout',
    fillGeometry: [{ path: 'M0 50 C12.5 30 25 30 37.5 50 C50 70 62.5 70 75 50 C87.5 30 100 30 100 50 L100 55 C100 35 87.5 35 75 55 C62.5 75 50 75 37.5 55 C25 35 12.5 35 0 55 Z', windingRule: 'NONZERO' }],
  },
  {
    name: 'Bracket Left',
    category: 'Layout',
    fillGeometry: [{ path: 'M60 5 L40 5 C28 5 20 13 20 25 L20 42 C20 46 17 50 10 50 C17 50 20 54 20 58 L20 75 C20 87 28 95 40 95 L60 95 L60 90 L40 90 C32 90 25 83 25 75 L25 58 C25 52 22 47 15 45 L15 50 L15 55 C22 53 25 48 25 42 L25 25 C25 17 32 10 40 10 L60 10 Z', windingRule: 'NONZERO' }],
  },
  {
    name: 'Bracket Right',
    category: 'Layout',
    fillGeometry: [{ path: 'M40 5 L60 5 C72 5 80 13 80 25 L80 42 C80 46 83 50 90 50 C83 50 80 54 80 58 L80 75 C80 87 72 95 60 95 L40 95 L40 90 L60 90 C68 90 75 83 75 75 L75 58 C75 52 78 47 85 45 L85 50 L85 55 C78 53 75 48 75 42 L75 25 C75 17 68 10 60 10 L40 10 Z', windingRule: 'NONZERO' }],
  },
  {
    name: 'Ribbon',
    category: 'Decorative',
    fillGeometry: [{ path: 'M0 20 L15 35 L0 50 L20 50 L20 80 L50 60 L80 80 L80 50 L100 50 L85 35 L100 20 L65 20 L50 0 L35 20 Z', windingRule: 'NONZERO' }],
  },
  {
    name: 'Banner',
    category: 'Decorative',
    fillGeometry: [{ path: 'M0 20 L10 20 L10 80 L0 65 Z M15 10 L85 10 L85 70 L50 85 L15 70 Z M90 20 L100 20 L100 65 L90 80 L90 20 Z', windingRule: 'NONZERO' }],
  },
];

export function getShapeTemplates(): ShapeTemplate[] {
  return shapes;
}

export function getShapeCategories(): string[] {
  const cats = new Set(shapes.map((s) => s.category));
  return Array.from(cats).sort();
}
