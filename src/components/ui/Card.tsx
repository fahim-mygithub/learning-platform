/**
 * Card Component
 *
 * A container component that provides a consistent card-style appearance
 * with padding, border radius, and elevation. Supports children prop for
 * flexible content composition.
 *
 * Follows accessibility guidelines from the Base Component Library spec.
 */

import React, { type ReactNode } from 'react';
import {
  View,
  StyleSheet,
  type ViewStyle,
  type StyleProp,
  type ViewProps,
} from 'react-native';

/**
 * Props for the Card component
 */
export interface CardProps extends ViewProps {
  /** Content to render inside the card */
  children: ReactNode;
  /** Optional custom styles to apply to the card container */
  style?: StyleProp<ViewStyle>;
  /** Test ID for testing purposes */
  testID?: string;
}

/**
 * Card Component
 *
 * A styled container that wraps content with consistent padding,
 * border radius, and visual elevation.
 *
 * @example
 * ```tsx
 * <Card>
 *   <Text>Card content goes here</Text>
 * </Card>
 * ```
 *
 * @example
 * ```tsx
 * <Card style={{ marginBottom: 16 }} testID="profile-card">
 *   <Text>Custom styled card</Text>
 * </Card>
 * ```
 */
export function Card({
  children,
  style,
  testID = 'card',
  ...rest
}: CardProps): React.ReactElement {
  return (
    <View
      testID={testID}
      style={[styles.container, style]}
      accessible={true}
      accessibilityRole="none"
      {...rest}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    // Shadow for iOS
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    // Elevation for Android
    elevation: 3,
  },
});

export default Card;
