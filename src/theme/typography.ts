/**
 * Design Tokens: Typography
 *
 * This module defines typography tokens for consistent text styling.
 */

/**
 * Font size scale in pixels
 */
export const fontSize = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
} as const;

/**
 * Font weight values
 * Values are strings to match React Native TextStyle requirements.
 */
export const fontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

/**
 * Line height multipliers
 * These are relative values to multiply against the font size.
 */
export const lineHeight = {
  tight: 1.25,
  normal: 1.5,
  relaxed: 1.75,
} as const;

/**
 * Combined typography object for convenience
 */
export const typography = {
  fontSize,
  fontWeight,
  lineHeight,
};
