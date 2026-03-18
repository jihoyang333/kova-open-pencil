export interface MockClient {
  id: string
  name: string
  primaryColor: string
  emailCount: number
  lastActivity: string
  industry: string
}

export const mockClients: MockClient[] = [
  {
    id: 'client-001',
    name: 'Bloom & Co.',
    primaryColor: '#2D5A3D',
    emailCount: 12,
    lastActivity: '2 hours ago',
    industry: 'Fashion & Lifestyle'
  },
  {
    id: 'client-002',
    name: 'Techwave',
    primaryColor: '#3B82F6',
    emailCount: 8,
    lastActivity: '1 day ago',
    industry: 'SaaS & Technology'
  },
  {
    id: 'client-003',
    name: 'Artisan Coffee',
    primaryColor: '#92400E',
    emailCount: 5,
    lastActivity: '3 days ago',
    industry: 'Food & Beverage'
  },
  {
    id: 'client-004',
    name: 'FitLife Pro',
    primaryColor: '#DC2626',
    emailCount: 15,
    lastActivity: '5 hours ago',
    industry: 'Health & Fitness'
  },
  {
    id: 'client-005',
    name: 'Luna Skincare',
    primaryColor: '#7C3AED',
    emailCount: 3,
    lastActivity: '1 week ago',
    industry: 'Beauty & Wellness'
  },
  {
    id: 'client-006',
    name: 'Wanderlust Travel',
    primaryColor: '#0891B2',
    emailCount: 7,
    lastActivity: '2 days ago',
    industry: 'Travel & Hospitality'
  }
]

export interface MockEmailPreview {
  id: string
  name: string
  updatedAt: string
  sectionCount: number
  clientId: string
}

export const mockEmailPreviews: MockEmailPreview[] = [
  {
    id: 'email-001',
    name: 'Spring Collection Launch',
    updatedAt: '2 hours ago',
    sectionCount: 5,
    clientId: 'client-001'
  },
  {
    id: 'email-002',
    name: 'Flash Sale Weekend',
    updatedAt: '1 day ago',
    sectionCount: 4,
    clientId: 'client-001'
  },
  {
    id: 'email-003',
    name: 'New Arrivals — March',
    updatedAt: '3 days ago',
    sectionCount: 6,
    clientId: 'client-001'
  },
  {
    id: 'email-004',
    name: 'Customer Appreciation',
    updatedAt: '5 days ago',
    sectionCount: 3,
    clientId: 'client-001'
  },
  {
    id: 'email-005',
    name: 'Loyalty Program Invite',
    updatedAt: '1 week ago',
    sectionCount: 4,
    clientId: 'client-001'
  },
  {
    id: 'email-006',
    name: 'Summer Preview',
    updatedAt: '2 weeks ago',
    sectionCount: 5,
    clientId: 'client-001'
  },
  {
    id: 'email-007',
    name: 'Welcome Series — Day 1',
    updatedAt: '3 weeks ago',
    sectionCount: 4,
    clientId: 'client-001'
  },
  {
    id: 'email-008',
    name: 'Abandoned Cart Reminder',
    updatedAt: '1 month ago',
    sectionCount: 3,
    clientId: 'client-001'
  }
]

export const mockBrandProfile = {
  name: 'Bloom & Co.',
  colors: {
    primary: '#2D5A3D',
    secondary: '#8B6E4E',
    accent: '#E8985E',
    background: '#FEFAF6'
  },
  fonts: {
    heading: 'Playfair Display',
    body: 'Inter'
  },
  logoUrl: 'https://placehold.co/180x48/2D5A3D/FEFAF6?text=Bloom+%26+Co.',
  voice: 'Warm, elevated, nature-inspired. Speaks to modern women who value sustainable luxury.',
  industry: 'Fashion & Lifestyle'
}

export const mockBrandTokens = {
  colors: {
    primary: '#2D5A3D',
    secondary: '#8B6E4E',
    accent: '#E8985E',
    background: '#FEFAF6',
    textPrimary: '#1A1A1A',
    textSecondary: '#6B7280'
  },
  fonts: {
    heading: 'Playfair Display',
    body: 'Inter'
  },
  voice: 'Warm, elevated, nature-inspired. Speaks to modern women who value sustainable luxury.',
  industry: 'Fashion & Lifestyle'
}
