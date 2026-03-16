export interface BrandProfile {
  name: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
  };
  fonts: {
    heading: string;
    body: string;
  };
  logoUrl?: string;
  voice?: string;
  industry?: string;
}

export interface BrandProfileData {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
  };
  fonts: {
    heading: string;
    body: string;
  };
  logoUrl?: string;
  voice?: string;
  industry?: string;
}

export interface BrandTokens {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    textPrimary: string;
    textSecondary: string;
  };
  fonts: {
    heading: string;
    body: string;
  };
  voice: string;
  industry: string;
}
