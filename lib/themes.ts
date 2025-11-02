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
];

export const defaultTheme = themes[0]; // Corporate Grey as default


