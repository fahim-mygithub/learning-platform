/**
 * Design Tokens: Colors
 *
 * This module defines the color palette and semantic colors for the design system.
 * Use semantic colors (from `colors`) for component styling.
 * Only use palette colors directly when creating new semantic tokens.
 */

/**
 * Raw color palette values
 * These are the base colors that semantic tokens are built from.
 */
const palette = {
  // Primary
  indigo500: '#6366F1',

  // Secondary
  emerald500: '#10B981',

  // Accent
  amber500: '#F59E0B',

  // Grays
  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray300: '#D1D5DB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray600: '#4B5563',
  gray700: '#374151',
  gray800: '#1F2937',
  gray900: '#111827',

  // Status
  red500: '#EF4444',
  green500: '#22C55E',
  blue500: '#3B82F6',

  // Mastery states (for spaced repetition visualization)
  masteryGray: '#9CA3AF',
  masteryBlue: '#3B82F6',
  masteryOrange: '#F97316',
  masteryYellow: '#EAB308',
  masteryLime: '#84CC16',
  masteryEmerald: '#10B981',

  // Common
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
} as const;

/**
 * Semantic colors for component usage
 * These colors have meaningful names based on their purpose.
 */
export const colors = {
  // Brand
  primary: palette.indigo500,
  secondary: palette.emerald500,
  accent: palette.amber500,

  // Text
  text: palette.gray900,
  textSecondary: palette.gray600,
  textTertiary: palette.gray400,
  textInverse: palette.white,

  // Backgrounds
  background: palette.white,
  backgroundSecondary: palette.gray50,
  backgroundTertiary: palette.gray100,

  // Borders
  border: palette.gray300,
  borderLight: palette.gray200,

  // Status
  error: palette.red500,
  success: palette.green500,
  info: palette.blue500,
  warning: palette.amber500,

  // Interactive
  disabled: palette.gray400,

  // Mastery states (for learning progress visualization)
  mastery: {
    unseen: palette.masteryGray,
    exposed: palette.masteryBlue,
    fragile: palette.masteryOrange,
    developing: palette.masteryYellow,
    solid: palette.masteryLime,
    mastered: palette.masteryEmerald,
  },

  // Common
  white: palette.white,
  black: palette.black,
  transparent: palette.transparent,
} as const;

export { palette };
