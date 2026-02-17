/**
 * Design system: docs/design/README.md, docs/design/grqaser-app/
 * Slate + teal palette; no purple gradient. Plus Jakarta Sans (load via font linking if desired).
 */
import {MD3LightTheme, MD3DarkTheme} from 'react-native-paper';

// Design tokens from docs/design (slate + teal)
const lightColors = {
  primary: '#0d9488', // teal-600 accent
  secondary: '#0f766e', // teal-700 accent hover (no purple)
  accent: '#0d9488',
  accentHover: '#0f766e',
  accentLight: '#ccfbf1', // teal-100
  background: '#f8fafc', // slate-50
  surface: '#ffffff',
  error: '#dc3545',
  text: '#0f172a', // slate-900
  onSurface: '#64748b', // slate-500 text muted
  disabled: '#94a3b8',
  placeholder: '#94a3b8',
  backdrop: 'rgba(0, 0, 0, 0.5)',
  notification: '#ff6b6b',
  success: '#0d9488',
  warning: '#ffc107',
  info: '#0d9488',
  outline: '#e2e8f0', // slate-200 border
  onPrimary: '#ffffff',
};

const darkColors = {
  ...lightColors,
  background: '#0f172a',
  surface: '#1e293b',
  text: '#f1f5f9',
  onSurface: '#94a3b8',
  placeholder: '#64748b',
  outline: '#334155',
};

export const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    ...lightColors,
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  borderRadius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
  },
  typography: {
    h1: {
      fontSize: 24,
      fontWeight: '800',
      lineHeight: 32,
    },
    h2: {
      fontSize: 20,
      fontWeight: '700',
      lineHeight: 28,
    },
    h3: {
      fontSize: 18,
      fontWeight: '600',
      lineHeight: 24,
    },
    h4: {
      fontSize: 16,
      fontWeight: '600',
      lineHeight: 22,
    },
    body1: {
      fontSize: 16,
      lineHeight: 24,
    },
    body2: {
      fontSize: 14,
      lineHeight: 20,
    },
    caption: {
      fontSize: 12,
      lineHeight: 16,
    },
    button: {
      fontSize: 16,
      fontWeight: '600',
      lineHeight: 24,
    },
  },
  shadows: {
    small: {
      shadowColor: '#0f172a',
      shadowOffset: {width: 0, height: 1},
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 2,
    },
    medium: {
      shadowColor: '#0f172a',
      shadowOffset: {width: 0, height: 4},
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 8,
    },
    large: {
      shadowColor: '#0f172a',
      shadowOffset: {width: 0, height: 8},
      shadowOpacity: 0.12,
      shadowRadius: 24,
      elevation: 16,
    },
  },
};

export const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    ...darkColors,
  },
  spacing: theme.spacing,
  borderRadius: theme.borderRadius,
  typography: theme.typography,
  shadows: theme.shadows,
};

export type Theme = typeof theme;

export type ThemeMode = 'light' | 'dark' | 'auto';

export function getAppTheme(mode: ThemeMode): typeof theme {
  if (mode === 'dark') {
    return darkTheme;
  }
  return theme;
}
