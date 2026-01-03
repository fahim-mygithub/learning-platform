/**
 * Design Tokens: Colors
 *
 * This module defines the color palette and semantic colors for the design system.
 * Use semantic colors (from `colors` or `darkColors`) for component styling.
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

  // Dark mode specific
  darkBackground: '#121212',
  darkBackgroundSecondary: '#1E1E1E',
  darkBackgroundTertiary: '#2D2D2D',
  darkBorder: '#3D3D3D',
  darkBorderLight: '#2D2D2D',

  // Engagement gamification
  xpGold: '#FFD700',
  streakOrange: '#FF6B35',
  captionHighlight: '#FFD700',

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

  // Engagement gamification (consistent with dark mode)
  captionHighlight: palette.captionHighlight,
  xpGold: palette.xpGold,
  streakOrange: palette.streakOrange,
} as const;

/**
 * Dark mode semantic colors
 * Optimized for OLED screens and reduced eye strain
 * Maintains WCAG 2.1 AA contrast ratios (minimum 4.5:1 for text)
 */
export const darkColors = {
  // Brand (same as light mode)
  primary: palette.indigo500,
  secondary: palette.emerald500,
  accent: palette.amber500,

  // Text (inverted from light mode)
  text: palette.white,
  textSecondary: '#B0B0B0', // Slightly off-white for reduced glare
  textTertiary: palette.gray400,
  textInverse: palette.gray900,

  // Backgrounds (dark variants)
  background: palette.darkBackground,
  backgroundSecondary: palette.darkBackgroundSecondary,
  backgroundTertiary: palette.darkBackgroundTertiary,

  // Borders (dark variants)
  border: palette.darkBorder,
  borderLight: palette.darkBorderLight,

  // Status (same as light mode - these are already accessible)
  error: '#F44336', // Slightly adjusted red for dark mode
  success: '#4CAF50', // Slightly adjusted green for dark mode
  info: palette.blue500,
  warning: palette.amber500,

  // Interactive
  disabled: palette.gray500,

  // Mastery states (same as light mode)
  mastery: {
    unseen: palette.masteryGray,
    exposed: palette.masteryBlue,
    fragile: palette.masteryOrange,
    developing: palette.masteryYellow,
    solid: palette.masteryLime,
    mastered: palette.masteryEmerald,
  },

  // Engagement gamification
  captionHighlight: palette.captionHighlight,
  xpGold: palette.xpGold,
  streakOrange: palette.streakOrange,

  // Common
  white: palette.white,
  black: palette.black,
  transparent: palette.transparent,
} as const;

/**
 * Light color theme type
 */
export type LightColorTheme = typeof colors;

/**
 * Dark color theme type
 */
export type DarkColorTheme = typeof darkColors;

/**
 * Color theme type - union of light and dark themes
 * Use this type when you need to accept either theme
 */
export type ColorTheme = LightColorTheme | DarkColorTheme;

/**
 * Get colors for the specified mode
 */
export function getThemeColors(darkMode: boolean): LightColorTheme | DarkColorTheme {
  return darkMode ? darkColors : colors;
}

export { palette };
