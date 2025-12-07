/**
 * Design System Theme
 * 
 * Mission-control aesthetic with neon accents and glass morphism.
 * Inspired by SpaceX mission control and cyberpunk interfaces.
 */

export const theme = {
  colors: {
    // Background layers
    background: {
      primary: '#0a0a0f',      // Deep space black
      secondary: '#12121a',    // Slightly lighter panel
      tertiary: '#1a1a24',     // Card backgrounds
      overlay: 'rgba(10, 10, 15, 0.85)', // Glass morphism overlay
    },

    // Neon accents
    neon: {
      cyan: '#00d4ff',         // Primary accent - electric cyan
      magenta: '#ff00ff',      // Secondary accent - hot magenta
      green: '#00ff88',        // Success/healthy - neon green
      orange: '#ffaa00',       // Warning - amber
      red: '#ff3366',          // Error/critical - hot red
      purple: '#a855f7',       // Info - deep purple
      blue: '#3b82f6',         // Link blue
    },

    // Status colors
    status: {
      excellent: '#00ff88',    // Bright green
      good: '#00d4ff',         // Cyan
      warning: '#ffaa00',      // Orange
      critical: '#ff3366',     // Red
      offline: '#6b7280',      // Gray
    },

    // Text colors
    text: {
      primary: '#ffffff',      // Pure white for primary text
      secondary: '#a0a0b0',    // Dimmed white for secondary
      tertiary: '#606070',     // Even more dimmed for hints
      inverse: '#0a0a0f',      // Dark text on light backgrounds
    },

    // Border colors
    border: {
      default: 'rgba(0, 212, 255, 0.2)',   // Cyan with transparency
      strong: 'rgba(0, 212, 255, 0.4)',    // More visible cyan
      accent: '#00d4ff',                    // Full cyan
      subtle: 'rgba(255, 255, 255, 0.1)',  // Very subtle white
    },

    // Glass morphism
    glass: {
      background: 'rgba(26, 26, 36, 0.6)', // Semi-transparent background
      border: 'rgba(255, 255, 255, 0.1)',  // Subtle border
      shadow: 'rgba(0, 212, 255, 0.1)',    // Glow effect
    },
  },

  // Typography
  fonts: {
    mono: '"JetBrains Mono", "Fira Code", "Consolas", monospace',
    sans: '"Inter", "SF Pro Display", -apple-system, system-ui, sans-serif',
  },

  fontSize: {
    xs: '0.75rem',    // 12px
    sm: '0.875rem',   // 14px
    base: '1rem',     // 16px
    lg: '1.125rem',   // 18px
    xl: '1.25rem',    // 20px
    '2xl': '1.5rem',  // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem', // 36px
  },

  // Spacing scale
  spacing: {
    xs: '0.25rem',   // 4px
    sm: '0.5rem',    // 8px
    md: '1rem',      // 16px
    lg: '1.5rem',    // 24px
    xl: '2rem',      // 32px
    '2xl': '3rem',   // 48px
  },

  // Border radius
  borderRadius: {
    sm: '0.25rem',   // 4px
    md: '0.5rem',    // 8px
    lg: '0.75rem',   // 12px
    xl: '1rem',      // 16px
    full: '9999px',  // Pill shape
  },

  // Shadows and glows
  shadows: {
    sm: '0 1px 2px rgba(0, 0, 0, 0.5)',
    md: '0 4px 6px rgba(0, 0, 0, 0.5)',
    lg: '0 10px 15px rgba(0, 0, 0, 0.5)',
    xl: '0 20px 25px rgba(0, 0, 0, 0.5)',
    
    // Neon glows
    glow: {
      cyan: '0 0 20px rgba(0, 212, 255, 0.5)',
      magenta: '0 0 20px rgba(255, 0, 255, 0.5)',
      green: '0 0 20px rgba(0, 255, 136, 0.5)',
      red: '0 0 20px rgba(255, 51, 102, 0.5)',
    },

    // Inner shadows for depth
    inner: 'inset 0 2px 4px rgba(0, 0, 0, 0.6)',
  },

  // Transitions
  transitions: {
    fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
    base: '300ms cubic-bezier(0.4, 0, 0.2, 1)',
    slow: '500ms cubic-bezier(0.4, 0, 0.2, 1)',
  },

  // Z-index layers
  zIndex: {
    base: 0,
    dropdown: 1000,
    sticky: 1100,
    modal: 1200,
    popover: 1300,
    tooltip: 1400,
  },

  // Breakpoints for responsive design
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },
}

// Export type for TypeScript
export type Theme = typeof theme

// Helper function to get theme values
export const getTheme = () => theme

export default theme