// HomeSync design tokens, derived from DESIGN.md
// Two palettes: light and dark. Everything else (spacing, radius, type) is shared.

export const spacing = {
  base: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  containerMargin: 20,
  gutter: 16,
};

export const radius = {
  sm: 4,
  md: 8,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const typography = {
  displayLg: { fontFamily: 'Manrope_700Bold', fontSize: 32, lineHeight: 40 },
  displayLgMobile: { fontFamily: 'Manrope_700Bold', fontSize: 28, lineHeight: 36 },
  headlineMd: { fontFamily: 'Manrope_600SemiBold', fontSize: 24, lineHeight: 32 },
  headlineSm: { fontFamily: 'Manrope_600SemiBold', fontSize: 20, lineHeight: 28 },
  titleLg: { fontFamily: 'Inter_600SemiBold', fontSize: 18, lineHeight: 24 },
  bodyLg: { fontFamily: 'Inter_400Regular', fontSize: 16, lineHeight: 24 },
  bodyMd: { fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 20 },
  labelMd: { fontFamily: 'Inter_500Medium', fontSize: 12, lineHeight: 16, letterSpacing: 0.24 },
};

export const lightColors = {
  background: '#F7F8FA',
  surface: '#FFFFFF',
  surfaceContainerLow: '#EFF4FF',
  surfaceContainer: '#E5EEFF',
  surfaceContainerHigh: '#DCE9FF',
  onSurface: '#0B1C30',
  onSurfaceVariant: '#424654',
  outline: '#737786',
  outlineVariant: '#C2C6D7',
  primary: '#2F6FED',
  onPrimary: '#FFFFFF',
  primaryContainer: '#0055CE',
  secondary: '#34B37A', // success
  onSecondary: '#FFFFFF',
  error: '#E5484D',
  onError: '#FFFFFF',
  errorContainer: '#FFDAD6',
  tertiary: '#9D4200', // warning / attention accent
  warning: '#E5484D',
};

export const darkColors = {
  background: '#0B1C30',
  surface: '#0B1C30',
  surfaceContainerLow: '#16263A',
  surfaceContainer: '#213145',
  surfaceContainerHigh: '#2C3D54',
  onSurface: '#EAF1FF',
  onSurfaceVariant: '#C2C6D7',
  outline: '#737786',
  outlineVariant: '#424654',
  primary: '#B1C5FF',
  onPrimary: '#001847',
  primaryContainer: '#0056D0',
  secondary: '#64DDA0',
  onSecondary: '#002112',
  error: '#FFB4AB',
  onError: '#690005',
  errorContainer: '#93000A',
  tertiary: '#FFB691',
  warning: '#FFB4AB',
};

export type ColorScheme = typeof lightColors;
