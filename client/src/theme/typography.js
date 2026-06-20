/**
 * SpendWise Typography
 * Font family, size scale, and weight definitions.
 */

export const fontFamily = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semiBold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  // Fallback to system fonts when Inter is unavailable
  system: 'System',
  systemIOS: 'SF Pro Display',
};

export const fontSize = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
};

export const fontWeight = {
  regular: '400',
  medium: '500',
  semiBold: '600',
  bold: '700',
};

export const lineHeight = {
  xs: 16,
  sm: 20,
  base: 24,
  lg: 28,
  xl: 32,
  xxl: 40,
};

export const typography = {
  h1: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    lineHeight: lineHeight.xxl,
  },
  h2: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semiBold,
    lineHeight: lineHeight.xl,
  },
  h3: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semiBold,
    lineHeight: lineHeight.lg,
  },
  body: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.regular,
    lineHeight: lineHeight.base,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    lineHeight: lineHeight.sm,
  },
  caption: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.regular,
    lineHeight: lineHeight.xs,
  },
};
