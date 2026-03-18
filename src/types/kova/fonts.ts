export interface FontOption {
  value: string
  label: string
  category: 'serif' | 'sans-serif' | 'display' | 'monospace'
  isGoogleFont: boolean
}

export const CURATED_FONTS: FontOption[] = [
  // Google Fonts — Sans-serif
  { value: 'Inter', label: 'Inter', category: 'sans-serif', isGoogleFont: true },
  { value: 'Montserrat', label: 'Montserrat', category: 'sans-serif', isGoogleFont: true },
  { value: 'Poppins', label: 'Poppins', category: 'sans-serif', isGoogleFont: true },
  { value: 'Lato', label: 'Lato', category: 'sans-serif', isGoogleFont: true },
  { value: 'Open Sans', label: 'Open Sans', category: 'sans-serif', isGoogleFont: true },
  { value: 'Roboto', label: 'Roboto', category: 'sans-serif', isGoogleFont: true },
  { value: 'Raleway', label: 'Raleway', category: 'sans-serif', isGoogleFont: true },
  { value: 'Nunito', label: 'Nunito', category: 'sans-serif', isGoogleFont: true },
  { value: 'Work Sans', label: 'Work Sans', category: 'sans-serif', isGoogleFont: true },
  { value: 'DM Sans', label: 'DM Sans', category: 'sans-serif', isGoogleFont: true },
  { value: 'Outfit', label: 'Outfit', category: 'sans-serif', isGoogleFont: true },
  { value: 'Space Grotesk', label: 'Space Grotesk', category: 'sans-serif', isGoogleFont: true },
  { value: 'Barlow', label: 'Barlow', category: 'sans-serif', isGoogleFont: true },
  { value: 'Jost', label: 'Jost', category: 'sans-serif', isGoogleFont: true },
  { value: 'Source Sans 3', label: 'Source Sans 3', category: 'sans-serif', isGoogleFont: true },

  // Google Fonts — Serif
  { value: 'Playfair Display', label: 'Playfair Display', category: 'serif', isGoogleFont: true },
  { value: 'Merriweather', label: 'Merriweather', category: 'serif', isGoogleFont: true },
  { value: 'Libre Baskerville', label: 'Libre Baskerville', category: 'serif', isGoogleFont: true },
  {
    value: 'Cormorant Garamond',
    label: 'Cormorant Garamond',
    category: 'serif',
    isGoogleFont: true
  },
  { value: 'Lora', label: 'Lora', category: 'serif', isGoogleFont: true },

  // Google Fonts — Display
  { value: 'Oswald', label: 'Oswald', category: 'display', isGoogleFont: true },

  // Web-safe fonts
  { value: 'Arial', label: 'Arial', category: 'sans-serif', isGoogleFont: false },
  { value: 'Helvetica', label: 'Helvetica', category: 'sans-serif', isGoogleFont: false },
  { value: 'Verdana', label: 'Verdana', category: 'sans-serif', isGoogleFont: false },
  { value: 'Georgia', label: 'Georgia', category: 'serif', isGoogleFont: false },
  { value: 'Times New Roman', label: 'Times New Roman', category: 'serif', isGoogleFont: false },
  { value: 'Trebuchet MS', label: 'Trebuchet MS', category: 'sans-serif', isGoogleFont: false }
]

export const INDUSTRY_OPTIONS = [
  'Fashion',
  'Beauty',
  'Food & Beverage',
  'Health & Fitness',
  'Home & Garden',
  'Technology',
  'Lifestyle',
  'Other'
] as const

export type Industry = (typeof INDUSTRY_OPTIONS)[number]
