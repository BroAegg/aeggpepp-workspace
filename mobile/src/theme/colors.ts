export const theme = {
  dark: {
    background: '#09090b',
    card: '#18181b',
    cardBorder: '#27272a',
    text: '#fafafa',
    textMuted: '#a1a1aa',
    primary: '#f43f5e', // Rose accent
    primaryForeground: '#ffffff',
    secondary: '#27272a',
    secondaryText: '#e4e4e7',
    success: '#10b981', // Emerald
    warning: '#f59e0b', // Amber
    destructive: '#ef4444', // Red
    accent: '#6366f1', // Indigo
  },
  light: {
    background: '#ffffff',
    card: '#f4f4f5',
    cardBorder: '#e4e4e7',
    text: '#09090b',
    textMuted: '#71717a',
    primary: '#e11d48',
    primaryForeground: '#ffffff',
    secondary: '#f4f4f5',
    secondaryText: '#27272a',
    success: '#059669',
    warning: '#d97706',
    destructive: '#dc2626',
    accent: '#4f46e5',
  },
}

export type ColorTheme = typeof theme.dark
