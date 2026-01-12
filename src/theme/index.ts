/**
 * Design Tokens
 *
 * Barrel export for all design tokens.
 * Import from '@/theme' for colors, spacing, and typography.
 */

export { colors, darkColors, palette, getThemeColors } from './colors';
export type { ColorTheme, LightColorTheme, DarkColorTheme } from './colors';
export { spacing, semanticSpacing } from './spacing';
export { typography, fontSize, fontWeight, lineHeight } from './typography';
export {
  animations,
  timing,
  spring,
  scale,
  stagger,
  entrance,
  opacity,
} from './animations';
export type { AnimationConfig } from './animations';
