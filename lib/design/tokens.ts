/**
 * EaseMail Design System Tokens
 * Central source of truth for design values
 * Use these instead of arbitrary Tailwind classes
 */

export const designTokens = {
  // ==========================================
  // COLORS
  // ==========================================
  colors: {
    // Brand Primary (Purple/Blue)
    primary: {
      50: '#f0f4ff',
      100: '#e0e7ff',
      200: '#c7d2fe',
      300: '#a5b4fc',
      400: '#818cf8',
      500: '#667eea', // Main brand color
      600: '#5568d3',
      700: '#4c51bf',
      800: '#434190',
      900: '#3c366b',
    },

    // Accent/Success (Green)
    accent: {
      50: '#f0fff4',
      100: '#c6f6d5',
      200: '#9ae6b4',
      300: '#68d391',
      400: '#48bb78', // Main accent
      500: '#38a169',
      600: '#2f855a',
      700: '#276749',
      800: '#22543d',
      900: '#1c4532',
    },

    // Danger/Error (Red)
    danger: {
      50: '#fff5f5',
      100: '#fed7d7',
      200: '#feb2b2',
      300: '#fc8181',
      400: '#f56565', // Main danger
      500: '#e53e3e',
      600: '#c53030',
      700: '#9b2c2c',
      800: '#822727',
      900: '#63171b',
    },

    // Warning (Yellow/Orange)
    warning: {
      50: '#fffaf0',
      100: '#feebc8',
      200: '#fbd38d',
      300: '#f6ad55',
      400: '#ed8936', // Main warning
      500: '#dd6b20',
      600: '#c05621',
      700: '#9c4221',
      800: '#7b341e',
      900: '#652b19',
    },

    // Neutral/Gray
    gray: {
      50: '#f7fafc',
      100: '#edf2f7',
      200: '#e2e8f0',
      300: '#cbd5e0',
      400: '#a0aec0',
      500: '#718096',
      600: '#4a5568',
      700: '#2d3748',
      800: '#1a202c',
      900: '#171923',
    },
  },

  // ==========================================
  // TYPOGRAPHY
  // ==========================================
  typography: {
    fontFamily: {
      sans: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      mono: '"Fira Code", "Courier New", monospace',
    },

    fontSize: {
      xs: '0.75rem',    // 12px
      sm: '0.875rem',   // 14px
      base: '1rem',     // 16px
      lg: '1.125rem',   // 18px
      xl: '1.25rem',    // 20px
      '2xl': '1.5rem',  // 24px
      '3xl': '1.875rem',// 30px
      '4xl': '2.25rem', // 36px - MAX for headings
    },

    fontWeight: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },

    lineHeight: {
      tight: '1.25',
      normal: '1.5',
      relaxed: '1.75',
    },
  },

  // ==========================================
  // SPACING
  // ==========================================
  spacing: {
    0: '0',
    1: '0.25rem',  // 4px
    2: '0.5rem',   // 8px
    3: '0.75rem',  // 12px
    4: '1rem',     // 16px - Most common
    5: '1.25rem',  // 20px
    6: '1.5rem',   // 24px
    8: '2rem',     // 32px
    10: '2.5rem',  // 40px
    12: '3rem',    // 48px
    16: '4rem',    // 64px
    20: '5rem',    // 80px
    24: '6rem',    // 96px
  },

  // ==========================================
  // BORDER RADIUS
  // ==========================================
  borderRadius: {
    none: '0',
    sm: '0.25rem',   // 4px - small elements
    md: '0.5rem',    // 8px - cards, buttons
    lg: '0.75rem',   // 12px - modals
    xl: '1rem',      // 16px - hero sections
    '2xl': '1.5rem', // 24px - large cards
    full: '9999px',  // Pills, avatars
  },

  // ==========================================
  // SHADOWS
  // ==========================================
  shadows: {
    none: 'none',
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
  },

  // ==========================================
  // TRANSITIONS
  // ==========================================
  transitions: {
    duration: {
      fast: '150ms',     // Quick feedback (hover)
      normal: '200ms',   // Default for most things
      slow: '300ms',     // Modals, larger movements
      slower: '500ms',   // Hero sections
    },

    timing: {
      ease: 'ease',
      easeIn: 'ease-in',
      easeOut: 'ease-out',
      easeInOut: 'ease-in-out',
      linear: 'linear',
    },
  },

  // ==========================================
  // Z-INDEX SCALE
  // ==========================================
  zIndex: {
    base: 0,
    dropdown: 1000,
    sticky: 1020,
    fixed: 1030,
    modalBackdrop: 1040,
    modal: 1050,
    popover: 1060,
    tooltip: 1070,
    toast: 1080,
  },

  // ==========================================
  // BREAKPOINTS
  // ==========================================
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },
} as const;

// ==========================================
// HELPER FUNCTIONS
// ==========================================

/**
 * Get spacing value by key
 * Usage: spacing(4) returns "1rem"
 */
export const spacing = (key: keyof typeof designTokens.spacing) => {
  return designTokens.spacing[key];
};

/**
 * Get color value by path
 * Usage: color('primary', 500) returns "#667eea"
 */
export const color = (
  colorName: keyof typeof designTokens.colors,
  shade: keyof typeof designTokens.colors.primary
) => {
  return designTokens.colors[colorName][shade];
};

/**
 * Get transition string
 * Usage: transition('normal', 'ease') returns "200ms ease"
 */
export const transition = (
  duration: keyof typeof designTokens.transitions.duration = 'normal',
  timing: keyof typeof designTokens.transitions.timing = 'ease'
) => {
  return `${designTokens.transitions.duration[duration]} ${designTokens.transitions.timing[timing]}`;
};

// Export for use in Tailwind config
export default designTokens;
