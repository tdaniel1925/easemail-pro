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
  // Light Theme
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
  // Dark Theme
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
  // Relaxed Theme
  {
    id: 'relaxed',
    name: 'Relaxed View',
    description: 'Soft, calming colors with warm neutrals and gentle accents - Easy on the eyes',
    colors: {
      background: '40 25% 97%',
      foreground: '30 8% 25%',
      card: '0 0% 100%',
      cardForeground: '30 8% 25%',
      popover: '0 0% 100%',
      popoverForeground: '30 8% 25%',
      primary: '150 30% 50%',
      primaryForeground: '0 0% 100%',
      secondary: '40 20% 93%',
      secondaryForeground: '30 8% 25%',
      muted: '40 20% 93%',
      mutedForeground: '30 8% 50%',
      accent: '150 25% 90%',
      accentForeground: '30 8% 25%',
      destructive: '0 72% 65%',
      destructiveForeground: '0 0% 100%',
      border: '40 15% 88%',
      input: '40 15% 88%',
      ring: '150 30% 50%',
    },
  },
];

export const defaultTheme = themes[0]; // Corporate Grey as default


