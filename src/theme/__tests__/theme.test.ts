/**
 * Theme Module Tests
 *
 * Tests for design tokens: colors, spacing, and typography.
 */

import { colors, palette } from '../colors';
import { spacing, semanticSpacing } from '../spacing';
import { typography, fontSize, fontWeight, lineHeight } from '../typography';
import * as themeExports from '../index';

describe('Theme Module', () => {
  describe('Colors', () => {
    it('exports semantic colors', () => {
      expect(colors).toBeDefined();
      expect(colors.primary).toBeDefined();
      expect(colors.secondary).toBeDefined();
      expect(colors.accent).toBeDefined();
      expect(colors.text).toBeDefined();
      expect(colors.background).toBeDefined();
      expect(colors.error).toBeDefined();
      expect(colors.success).toBeDefined();
    });

    it('has primary color as #6366F1 (indigo)', () => {
      expect(colors.primary).toBe('#6366F1');
    });

    it('exports palette with raw color values', () => {
      expect(palette).toBeDefined();
      expect(palette.indigo500).toBe('#6366F1');
      expect(palette.emerald500).toBe('#10B981');
      expect(palette.amber500).toBe('#F59E0B');
    });

    it('has correct text colors', () => {
      expect(colors.text).toBe('#111827'); // gray900
      expect(colors.textSecondary).toBe('#4B5563'); // gray600
      expect(colors.textTertiary).toBe('#9CA3AF'); // gray400
      expect(colors.textInverse).toBe('#FFFFFF'); // white
    });

    it('has correct background colors', () => {
      expect(colors.background).toBe('#FFFFFF'); // white
      expect(colors.backgroundSecondary).toBe('#F9FAFB'); // gray50
      expect(colors.backgroundTertiary).toBe('#F3F4F6'); // gray100
    });

    it('has correct status colors', () => {
      expect(colors.error).toBe('#EF4444'); // red500
      expect(colors.success).toBe('#22C55E'); // green500
      expect(colors.info).toBe('#3B82F6'); // blue500
      expect(colors.warning).toBe('#F59E0B'); // amber500
    });

    it('has mastery state colors', () => {
      expect(colors.mastery).toBeDefined();
      expect(colors.mastery.unseen).toBe('#9CA3AF');
      expect(colors.mastery.exposed).toBe('#3B82F6');
      expect(colors.mastery.fragile).toBe('#F97316');
      expect(colors.mastery.developing).toBe('#EAB308');
      expect(colors.mastery.solid).toBe('#84CC16');
      expect(colors.mastery.mastered).toBe('#10B981');
    });

    it('has gray scale palette colors', () => {
      expect(palette.gray50).toBe('#F9FAFB');
      expect(palette.gray100).toBe('#F3F4F6');
      expect(palette.gray200).toBe('#E5E7EB');
      expect(palette.gray300).toBe('#D1D5DB');
      expect(palette.gray400).toBe('#9CA3AF');
      expect(palette.gray500).toBe('#6B7280');
      expect(palette.gray600).toBe('#4B5563');
      expect(palette.gray700).toBe('#374151');
      expect(palette.gray800).toBe('#1F2937');
      expect(palette.gray900).toBe('#111827');
    });
  });

  describe('Spacing', () => {
    it('exports spacing scale', () => {
      expect(spacing).toBeDefined();
    });

    it('has correct spacing values', () => {
      expect(spacing[0]).toBe(0);
      expect(spacing[1]).toBe(4);
      expect(spacing[2]).toBe(8);
      expect(spacing[3]).toBe(12);
      expect(spacing[4]).toBe(16);
      expect(spacing[5]).toBe(20);
      expect(spacing[6]).toBe(24);
      expect(spacing[8]).toBe(32);
      expect(spacing[10]).toBe(40);
      expect(spacing[12]).toBe(48);
      expect(spacing[16]).toBe(64);
    });

    it('exports semantic spacing', () => {
      expect(semanticSpacing).toBeDefined();
      expect(semanticSpacing.xs).toBe(4);
      expect(semanticSpacing.sm).toBe(8);
      expect(semanticSpacing.md).toBe(16);
      expect(semanticSpacing.lg).toBe(24);
      expect(semanticSpacing.xl).toBe(32);
      expect(semanticSpacing.xxl).toBe(48);
    });
  });

  describe('Typography', () => {
    it('exports typography object', () => {
      expect(typography).toBeDefined();
      expect(typography.fontSize).toBeDefined();
      expect(typography.fontWeight).toBeDefined();
      expect(typography.lineHeight).toBeDefined();
    });

    it('has correct font sizes', () => {
      expect(fontSize.xs).toBe(12);
      expect(fontSize.sm).toBe(14);
      expect(fontSize.base).toBe(16);
      expect(fontSize.lg).toBe(18);
      expect(fontSize.xl).toBe(20);
      expect(fontSize['2xl']).toBe(24);
      expect(fontSize['3xl']).toBe(32);
    });

    it('has correct font weights', () => {
      expect(fontWeight.regular).toBe('400');
      expect(fontWeight.medium).toBe('500');
      expect(fontWeight.semibold).toBe('600');
      expect(fontWeight.bold).toBe('700');
    });

    it('has correct line heights', () => {
      expect(lineHeight.tight).toBe(1.25);
      expect(lineHeight.normal).toBe(1.5);
      expect(lineHeight.relaxed).toBe(1.75);
    });
  });

  describe('Barrel Exports', () => {
    it('exports colors from index', () => {
      expect(themeExports.colors).toBeDefined();
      expect(themeExports.palette).toBeDefined();
      expect(themeExports.colors.primary).toBe('#6366F1');
    });

    it('exports spacing from index', () => {
      expect(themeExports.spacing).toBeDefined();
      expect(themeExports.semanticSpacing).toBeDefined();
      expect(themeExports.spacing[4]).toBe(16);
    });

    it('exports typography from index', () => {
      expect(themeExports.typography).toBeDefined();
      expect(themeExports.fontSize).toBeDefined();
      expect(themeExports.fontWeight).toBeDefined();
      expect(themeExports.lineHeight).toBeDefined();
    });
  });
});
