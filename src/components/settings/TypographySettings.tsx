/**
 * Typography Settings Component
 *
 * Provides UI controls for customizing typography and accessibility preferences:
 * - Font family selection (System vs Lexend)
 * - Bionic reading toggle
 * - Dark mode toggle
 * - Font scale slider
 *
 * Changes are saved to the database in real-time.
 */

import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  type ViewStyle,
  type StyleProp,
} from 'react-native';

import { useTypography } from '@/src/lib/typography-context';
import type { FontFamily } from '@/src/types/engagement';
import { semanticSpacing } from '@/src/theme/spacing';

// ============================================================================
// Types
// ============================================================================

/**
 * Props for the TypographySettings component
 */
export interface TypographySettingsProps {
  /** Optional custom styles for the container */
  style?: StyleProp<ViewStyle>;
  /** Test ID for testing purposes */
  testID?: string;
}

// ============================================================================
// Constants
// ============================================================================

/** Font scale options available to users */
const FONT_SCALE_OPTIONS = [
  { value: 0.8, label: 'S' },
  { value: 0.9, label: 'M-' },
  { value: 1.0, label: 'M' },
  { value: 1.1, label: 'M+' },
  { value: 1.2, label: 'L' },
  { value: 1.3, label: 'L+' },
  { value: 1.5, label: 'XL' },
];

/** Font family options */
const FONT_FAMILY_OPTIONS: { value: FontFamily; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'lexend', label: 'Lexend' },
];

// ============================================================================
// Component
// ============================================================================

/**
 * Typography Settings Component
 *
 * Renders settings controls for typography preferences.
 *
 * @example
 * ```tsx
 * <TypographySettings />
 * ```
 *
 * @example
 * ```tsx
 * <TypographySettings style={{ marginTop: 16 }} testID="typography-settings" />
 * ```
 */
export function TypographySettings({
  style,
  testID = 'typography-settings',
}: TypographySettingsProps): React.ReactElement {
  const { preferences, updatePreferences, getColors, getScaledFontSize } = useTypography();
  const colors = getColors();

  // ============================================================================
  // Handlers
  // ============================================================================

  const handleBionicReadingToggle = useCallback(
    (enabled: boolean) => {
      updatePreferences({ bionicReadingEnabled: enabled });
    },
    [updatePreferences]
  );

  const handleDarkModeToggle = useCallback(
    (enabled: boolean) => {
      updatePreferences({ darkModeEnabled: enabled });
    },
    [updatePreferences]
  );

  const handleFontFamilyChange = useCallback(
    (fontFamily: FontFamily) => {
      updatePreferences({ fontFamily });
    },
    [updatePreferences]
  );

  const handleFontScaleChange = useCallback(
    (fontScale: number) => {
      updatePreferences({ fontScale });
    },
    [updatePreferences]
  );

  // ============================================================================
  // Dynamic Styles
  // ============================================================================

  const dynamicStyles = {
    container: {
      backgroundColor: colors.backgroundSecondary,
    },
    settingRow: {
      borderBottomColor: colors.borderLight,
    },
    settingSection: {
      borderBottomColor: colors.borderLight,
    },
    sectionTitle: {
      color: colors.text,
      fontSize: getScaledFontSize(14),
    },
    settingLabel: {
      color: colors.text,
      fontSize: getScaledFontSize(16),
    },
    settingDescription: {
      color: colors.textSecondary,
      fontSize: getScaledFontSize(13),
    },
    optionButton: {
      backgroundColor: colors.backgroundTertiary,
      borderColor: colors.border,
    },
    optionButtonSelected: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    optionText: {
      color: colors.text,
      fontSize: getScaledFontSize(14),
    },
    optionTextSelected: {
      color: colors.white,
      fontSize: getScaledFontSize(14),
    },
    previewText: {
      color: colors.text,
      fontSize: getScaledFontSize(16),
    },
  };

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <View testID={testID} style={[styles.container, dynamicStyles.container, style]}>
      {/* Bionic Reading Toggle */}
      <View style={[styles.settingRow, dynamicStyles.settingRow]}>
        <View style={styles.settingInfo}>
          <Text style={[styles.settingLabel, dynamicStyles.settingLabel]}>
            Bionic Reading
          </Text>
          <Text style={[styles.settingDescription, dynamicStyles.settingDescription]}>
            Bold the first part of words to guide reading
          </Text>
        </View>
        <Switch
          testID={`${testID}-bionic-toggle`}
          value={preferences.bionicReadingEnabled}
          onValueChange={handleBionicReadingToggle}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor={colors.white}
          accessibilityLabel="Toggle bionic reading"
          accessibilityHint="Enables or disables bionic reading mode"
        />
      </View>

      {/* Dark Mode Toggle */}
      <View style={[styles.settingRow, dynamicStyles.settingRow]}>
        <View style={styles.settingInfo}>
          <Text style={[styles.settingLabel, dynamicStyles.settingLabel]}>
            Dark Mode
          </Text>
          <Text style={[styles.settingDescription, dynamicStyles.settingDescription]}>
            Reduce eye strain in low-light environments
          </Text>
        </View>
        <Switch
          testID={`${testID}-dark-mode-toggle`}
          value={preferences.darkModeEnabled}
          onValueChange={handleDarkModeToggle}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor={colors.white}
          accessibilityLabel="Toggle dark mode"
          accessibilityHint="Enables or disables dark mode"
        />
      </View>

      {/* Font Family Selection */}
      <View style={[styles.settingSection, dynamicStyles.settingSection]}>
        <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>
          Font Family
        </Text>
        <View style={styles.optionsRow}>
          {FONT_FAMILY_OPTIONS.map((option) => {
            const isSelected = preferences.fontFamily === option.value;
            return (
              <TouchableOpacity
                key={option.value}
                testID={`${testID}-font-${option.value}`}
                style={[
                  styles.optionButton,
                  isSelected ? dynamicStyles.optionButtonSelected : dynamicStyles.optionButton,
                ]}
                onPress={() => handleFontFamilyChange(option.value)}
                accessibilityLabel={`Select ${option.label} font`}
                accessibilityState={{ selected: isSelected }}
              >
                <Text
                  style={[
                    styles.optionText,
                    isSelected ? dynamicStyles.optionTextSelected : dynamicStyles.optionText,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Font Scale Selection */}
      <View style={[styles.settingSection, dynamicStyles.settingSection]}>
        <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>
          Text Size
        </Text>
        <View style={styles.optionsRow}>
          {FONT_SCALE_OPTIONS.map((option) => {
            const isSelected = preferences.fontScale === option.value;
            return (
              <TouchableOpacity
                key={option.value}
                testID={`${testID}-scale-${option.value}`}
                style={[
                  styles.scaleButton,
                  isSelected ? dynamicStyles.optionButtonSelected : dynamicStyles.optionButton,
                ]}
                onPress={() => handleFontScaleChange(option.value)}
                accessibilityLabel={`Set text size to ${option.label}`}
                accessibilityState={{ selected: isSelected }}
              >
                <Text
                  style={[
                    styles.scaleText,
                    isSelected ? dynamicStyles.optionTextSelected : dynamicStyles.optionText,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Preview Section */}
      <View style={styles.previewSection}>
        <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>
          Preview
        </Text>
        <View style={[styles.previewBox, { backgroundColor: colors.background }]}>
          <Text
            style={[
              dynamicStyles.previewText,
              preferences.fontFamily === 'lexend' && styles.lexendFont,
            ]}
          >
            {preferences.bionicReadingEnabled ? (
              <>
                <Text style={styles.bold}>The</Text>
                {' quick '}
                <Text style={styles.bold}>bro</Text>
                {'wn '}
                <Text style={styles.bold}>fo</Text>
                {'x '}
                <Text style={styles.bold}>jum</Text>
                {'ps '}
                <Text style={styles.bold}>ov</Text>
                {'er '}
                <Text style={styles.bold}>th</Text>
                {'e '}
                <Text style={styles.bold}>la</Text>
                {'zy '}
                <Text style={styles.bold}>do</Text>
                {'g.'}
              </>
            ) : (
              'The quick brown fox jumps over the lazy dog.'
            )}
          </Text>
        </View>
      </View>
    </View>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: semanticSpacing.md,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: semanticSpacing.sm,
    borderBottomWidth: 1,
    // borderBottomColor set dynamically in dynamicStyles
  },
  settingInfo: {
    flex: 1,
    marginRight: semanticSpacing.md,
  },
  settingLabel: {
    fontWeight: '500',
    marginBottom: 2,
  },
  settingDescription: {
    lineHeight: 18,
  },
  settingSection: {
    paddingVertical: semanticSpacing.md,
    borderBottomWidth: 1,
    // borderBottomColor set dynamically in dynamicStyles
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: semanticSpacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: semanticSpacing.xs,
  },
  optionButton: {
    paddingHorizontal: semanticSpacing.md,
    paddingVertical: semanticSpacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 80,
    alignItems: 'center',
  },
  optionText: {
    fontWeight: '500',
  },
  scaleButton: {
    paddingHorizontal: semanticSpacing.sm,
    paddingVertical: semanticSpacing.xs,
    borderRadius: 6,
    borderWidth: 1,
    minWidth: 40,
    alignItems: 'center',
  },
  scaleText: {
    fontWeight: '600',
  },
  previewSection: {
    paddingTop: semanticSpacing.md,
  },
  previewBox: {
    padding: semanticSpacing.md,
    borderRadius: 8,
    marginTop: semanticSpacing.xs,
  },
  lexendFont: {
    fontFamily: 'Lexend_400Regular',
  },
  bold: {
    fontWeight: 'bold',
  },
});

export default TypographySettings;
