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
    id: 'forest-cream',
    name: 'Natural Green',
    description: 'Forest green with cream accents - Calm and balanced',
    colors: {
      background: '150 25% 12%',
      foreground: '120 10% 95%',
      card: '150 22% 16%',
      cardForeground: '120 10% 95%',
      popover: '150 22% 16%',
      popoverForeground: '120 10% 95%',
      primary: '150 45% 50%',
      primaryForeground: '0 0% 100%',
      secondary: '150 20% 20%',
      secondaryForeground: '120 10% 95%',
      muted: '150 20% 20%',
      mutedForeground: '120 10% 65%',
      accent: '150 20% 22%',
      accentForeground: '120 10% 95%',
      destructive: '0 84.2% 60.2%',
      destructiveForeground: '0 0% 100%',
      border: '150 18% 26%',
      input: '150 18% 26%',
      ring: '150 45% 50%',
    },
  },
  {
    id: 'cyber-blue',
    name: 'Cyber Tech',
    description: 'Charcoal with electric blue - Modern and innovative',
    colors: {
      background: '210 15% 8%',
      foreground: '210 10% 96%',
      card: '210 15% 12%',
      cardForeground: '210 10% 96%',
      popover: '210 15% 12%',
      popoverForeground: '210 10% 96%',
      primary: '195 100% 50%',
      primaryForeground: '0 0% 100%',
      secondary: '210 15% 18%',
      secondaryForeground: '210 10% 96%',
      muted: '210 15% 18%',
      mutedForeground: '210 10% 70%',
      accent: '210 15% 20%',
      accentForeground: '210 10% 96%',
      destructive: '0 84.2% 60.2%',
      destructiveForeground: '0 0% 100%',
      border: '210 12% 25%',
      input: '210 12% 25%',
      ring: '195 100% 50%',
    },
  },
  {
    id: 'light-slate',
    name: 'Minimal Light',
    description: 'White with slate accents - Clean and distraction-free',
    colors: {
      background: '0 0% 100%',
      foreground: '220 15% 15%',
      card: '210 20% 98%',
      cardForeground: '220 15% 15%',
      popover: '0 0% 100%',
      popoverForeground: '220 15% 15%',
      primary: '215 25% 45%',
      primaryForeground: '0 0% 100%',
      secondary: '210 20% 95%',
      secondaryForeground: '220 15% 15%',
      muted: '210 20% 96%',
      mutedForeground: '220 10% 45%',
      accent: '210 20% 94%',
      accentForeground: '220 15% 15%',
      destructive: '0 84.2% 60.2%',
      destructiveForeground: '0 0% 100%',
      border: '210 20% 88%',
      input: '210 20% 88%',
      ring: '215 25% 45%',
    },
  },
];

export const defaultTheme = themes[0];


