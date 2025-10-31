export interface Theme {
  id: string;
  name: string;
  description: string;
  colors: {
    background: string;
    foreground: string;
    card: string;
    cardForeground: string;
    popover: string;
    popoverForeground: string;
    primary: string;
    primaryForeground: string;
    secondary: string;
    secondaryForeground: string;
    muted: string;
    mutedForeground: string;
    accent: string;
    accentForeground: string;
    destructive: string;
    destructiveForeground: string;
    border: string;
    input: string;
    ring: string;
  };
}

export const themes: Theme[] = [
  // Light Professional Themes
  {
    id: 'pure-white',
    name: 'Pure White',
    description: 'Clean white workspace - Maximum clarity and focus',
    colors: {
      background: '0 0% 100%',
      foreground: '0 0% 10%',
      card: '0 0% 100%',
      cardForeground: '0 0% 10%',
      popover: '0 0% 100%',
      popoverForeground: '0 0% 10%',
      primary: '215 20% 40%',
      primaryForeground: '0 0% 100%',
      secondary: '0 0% 96%',
      secondaryForeground: '0 0% 10%',
      muted: '0 0% 96%',
      mutedForeground: '0 0% 45%',
      accent: '0 0% 94%',
      accentForeground: '0 0% 10%',
      destructive: '0 84.2% 60.2%',
      destructiveForeground: '0 0% 100%',
      border: '0 0% 90%',
      input: '0 0% 90%',
      ring: '215 20% 40%',
    },
  },
  {
    id: 'light-grey',
    name: 'Corporate Grey',
    description: 'Light grey with blue accents - Professional and modern',
    colors: {
      background: '220 10% 96%',
      foreground: '220 15% 12%',
      card: '0 0% 100%',
      cardForeground: '220 15% 12%',
      popover: '0 0% 100%',
      popoverForeground: '220 15% 12%',
      primary: '215 28% 42%',
      primaryForeground: '0 0% 100%',
      secondary: '220 10% 94%',
      secondaryForeground: '220 15% 12%',
      muted: '220 10% 94%',
      mutedForeground: '220 10% 40%',
      accent: '220 15% 92%',
      accentForeground: '220 15% 12%',
      destructive: '0 84.2% 60.2%',
      destructiveForeground: '0 0% 100%',
      border: '220 10% 85%',
      input: '220 10% 85%',
      ring: '215 28% 42%',
    },
  },
  {
    id: 'warm-grey',
    name: 'Executive Warm',
    description: 'Warm grey with subtle beige tones - Comfortable and elegant',
    colors: {
      background: '30 8% 95%',
      foreground: '30 15% 15%',
      card: '0 0% 100%',
      cardForeground: '30 15% 15%',
      popover: '0 0% 100%',
      popoverForeground: '30 15% 15%',
      primary: '25 35% 45%',
      primaryForeground: '0 0% 100%',
      secondary: '30 10% 92%',
      secondaryForeground: '30 15% 15%',
      muted: '30 10% 92%',
      mutedForeground: '30 10% 40%',
      accent: '30 12% 90%',
      accentForeground: '30 15% 15%',
      destructive: '0 84.2% 60.2%',
      destructiveForeground: '0 0% 100%',
      border: '30 8% 84%',
      input: '30 8% 84%',
      ring: '25 35% 45%',
    },
  },
  {
    id: 'cool-grey',
    name: 'Cool Professional',
    description: 'Cool grey with blue undertones - Calm and trustworthy',
    colors: {
      background: '210 10% 94%',
      foreground: '210 18% 15%',
      card: '0 0% 100%',
      cardForeground: '210 18% 15%',
      popover: '0 0% 100%',
      popoverForeground: '210 18% 15%',
      primary: '210 50% 45%',
      primaryForeground: '0 0% 100%',
      secondary: '210 12% 91%',
      secondaryForeground: '210 18% 15%',
      muted: '210 12% 91%',
      mutedForeground: '210 12% 38%',
      accent: '210 15% 88%',
      accentForeground: '210 18% 15%',
      destructive: '0 84.2% 60.2%',
      destructiveForeground: '0 0% 100%',
      border: '210 12% 82%',
      input: '210 12% 82%',
      ring: '210 50% 45%',
    },
  },
  {
    id: 'platinum',
    name: 'Platinum Silver',
    description: 'Silver grey with dark text - Sophisticated and neutral',
    colors: {
      background: '0 0% 92%',
      foreground: '0 0% 15%',
      card: '0 0% 98%',
      cardForeground: '0 0% 15%',
      popover: '0 0% 98%',
      popoverForeground: '0 0% 15%',
      primary: '0 0% 30%',
      primaryForeground: '0 0% 100%',
      secondary: '0 0% 88%',
      secondaryForeground: '0 0% 15%',
      muted: '0 0% 88%',
      mutedForeground: '0 0% 42%',
      accent: '0 0% 85%',
      accentForeground: '0 0% 15%',
      destructive: '0 84.2% 60.2%',
      destructiveForeground: '0 0% 100%',
      border: '0 0% 80%',
      input: '0 0% 80%',
      ring: '0 0% 30%',
    },
  },
  {
    id: 'soft-white',
    name: 'Soft White',
    description: 'Off-white with warm undertones - Easy on the eyes',
    colors: {
      background: '40 15% 97%',
      foreground: '40 20% 12%',
      card: '0 0% 100%',
      cardForeground: '40 20% 12%',
      popover: '0 0% 100%',
      popoverForeground: '40 20% 12%',
      primary: '210 40% 45%',
      primaryForeground: '0 0% 100%',
      secondary: '40 12% 94%',
      secondaryForeground: '40 20% 12%',
      muted: '40 12% 94%',
      mutedForeground: '40 15% 40%',
      accent: '40 15% 92%',
      accentForeground: '40 20% 12%',
      destructive: '0 84.2% 60.2%',
      destructiveForeground: '0 0% 100%',
      border: '40 10% 87%',
      input: '40 10% 87%',
      ring: '210 40% 45%',
    },
  },
  
  // Dark Professional Themes
  {
    id: 'charcoal',
    name: 'Charcoal Dark',
    description: 'Dark grey with subtle blue accents - Professional night mode',
    colors: {
      background: '220 8% 18%',
      foreground: '220 8% 95%',
      card: '220 8% 22%',
      cardForeground: '220 8% 95%',
      popover: '220 8% 22%',
      popoverForeground: '220 8% 95%',
      primary: '215 50% 55%',
      primaryForeground: '0 0% 100%',
      secondary: '220 8% 26%',
      secondaryForeground: '220 8% 95%',
      muted: '220 8% 26%',
      mutedForeground: '220 8% 65%',
      accent: '220 8% 28%',
      accentForeground: '220 8% 95%',
      destructive: '0 84.2% 60.2%',
      destructiveForeground: '0 0% 100%',
      border: '220 8% 30%',
      input: '220 8% 30%',
      ring: '215 50% 55%',
    },
  },
  {
    id: 'navy-gold',
    name: 'Corporate Navy',
    description: 'Navy blue with gold accents - Trustworthy and premium',
    colors: {
      background: '220 30% 10%',
      foreground: '210 20% 95%',
      card: '220 28% 14%',
      cardForeground: '210 20% 95%',
      popover: '220 28% 14%',
      popoverForeground: '210 20% 95%',
      primary: '45 90% 55%',
      primaryForeground: '220 30% 10%',
      secondary: '220 25% 18%',
      secondaryForeground: '210 20% 95%',
      muted: '220 25% 18%',
      mutedForeground: '210 15% 65%',
      accent: '220 25% 20%',
      accentForeground: '210 20% 95%',
      destructive: '0 84.2% 60.2%',
      destructiveForeground: '0 0% 100%',
      border: '220 20% 24%',
      input: '220 20% 24%',
      ring: '45 90% 55%',
    },
  },
  {
    id: 'dark-red',
    name: 'Executive Dark',
    description: 'Dark grey with bold red accents - Professional and commanding',
    colors: {
      background: '0 0% 12%',
      foreground: '0 0% 95%',
      card: '0 0% 16%',
      cardForeground: '0 0% 95%',
      popover: '0 0% 16%',
      popoverForeground: '0 0% 95%',
      primary: '0 72% 45%',
      primaryForeground: '0 0% 100%',
      secondary: '0 0% 22%',
      secondaryForeground: '0 0% 95%',
      muted: '0 0% 22%',
      mutedForeground: '0 0% 65%',
      accent: '0 0% 22%',
      accentForeground: '0 0% 95%',
      destructive: '0 84.2% 60.2%',
      destructiveForeground: '0 0% 100%',
      border: '0 0% 26%',
      input: '0 0% 26%',
      ring: '0 72% 45%',
    },
  },
];

export const defaultTheme = themes[0];


