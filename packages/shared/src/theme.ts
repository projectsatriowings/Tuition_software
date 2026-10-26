/**
 * TuitionOS Enterprise Shared Design System Tokens
 * Common source of truth for Web (Tailwind/CSS) and Mobile (React Native).
 */

export const themeTokens = {
  colors: {
    // Brand Brown/Beige Palette
    espresso: '#3E2723',    // Deep espresso (primary dark headers, navbar)
    cocoa: '#4E342E',       // Dark cocoa (secondary containers, accents)
    primary: '#6D4C41',     // Warm brown (action buttons, primary elements)
    taupe: '#8D6E63',       // Muted taupe (subheadings, active border highlights)
    mocha: '#A1887F',       // Dusty mocha (subtle text, placeholder text)
    greige: '#BCAAA4',      // Warm greige (disabled states, subtle dividers)
    beige: '#D7CCC8',       // Soft beige (borders, input boundaries, dividers)
    
    // Surfaces & Backgrounds
    background: '#F7F2EF',  // Warm off-white page background
    surface: '#FFFFFF',     // Clean card & container surface
    surfaceMuted: '#FDFBF7',// Input fields & subtle callout background
    border: '#D7CCC8',      // Default component border
    borderSubtle: '#EFEBE9',// Table row dividers & lightweight borders
    
    // Text Hierarchy
    textPrimary: '#2D1E18',   // High-contrast primary dark brown text
    textSecondary: '#4E342E', // Secondary readable text
    textMuted: '#6D4C41',     // Labels, hints, metadata
    textSubtle: '#8D6E63',    // Placeholders & disabled text
    textLight: '#FFFFFF',     // Text on dark buttons & espresso headers
    textLightMuted: '#D7CCC8',// Secondary text on espresso headers
    
    // Status & Semantic Colors (Carefully tailored to be distinct from brand brown)
    success: '#15803D',
    successBg: '#F0FDF4',
    successBorder: '#BBF7D0',
    
    warning: '#B45309',
    warningBg: '#FFFBEB',
    warningBorder: '#FDE68A',
    
    error: '#B91C1C',
    errorBg: '#FEF2F2',
    errorBorder: '#FECACA',
    
    info: '#1D4ED8',
    infoBg: '#EFF6FF',
    infoBorder: '#BFDBFE',
  },
  
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
  },
  
  radii: {
    sm: 6,
    md: 10,
    lg: 14,
    xl: 18,
    full: 9999,
  },
  
  typography: {
    fontFamily: 'System',
    sizes: {
      xs: 11,
      sm: 13,
      base: 15,
      lg: 18,
      xl: 20,
      xxl: 24,
      title: 28,
    },
    weights: {
      normal: '400' as const,
      medium: '500' as const,
      semibold: '600' as const,
      bold: '700' as const,
      black: '800' as const,
    },
  },
  
  shadows: {
    card: {
      shadowColor: '#3E2723',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 3,
    },
    cardHover: {
      shadowColor: '#3E2723',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 12,
      elevation: 5,
    },
    modal: {
      shadowColor: '#2D1E18',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.25,
      shadowRadius: 24,
      elevation: 10,
    },
  },
};
