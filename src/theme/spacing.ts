/**
 * Design Tokens: Spacing
 *
 * This module defines the spacing scale for consistent layout and margins.
 * All values are in pixels.
 */

/**
 * Numeric spacing scale
 * Based on a 4px base unit for consistency.
 */
export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
} as const;

/**
 * Semantic spacing tokens
 * Named sizes for common use cases.
 */
export const semanticSpacing = {
  xs: spacing[1], // 4
  sm: spacing[2], // 8
  md: spacing[4], // 16
  lg: spacing[6], // 24
  xl: spacing[8], // 32
  xxl: spacing[12], // 48
} as const;
