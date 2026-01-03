/**
 * SynthesisCard Component
 *
 * "Connect the dots" card that prompts users to synthesize multiple concepts
 * they've learned. Appears every 5-6 chapters to reinforce learning connections.
 *
 * @example
 * ```tsx
 * <SynthesisCard
 *   conceptsToConnect={['Variables', 'Data Types', 'Operators']}
 *   synthesisPrompt="How do these concepts work together to perform calculations?"
 *   chaptersCompleted={6}
 *   totalChapters={12}
 *   onComplete={(response) => awardSynthesisXP()}
 * />
 * ```
 */

import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import Animated, {
  FadeIn,
  SlideInUp,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { colors, spacing } from '@/src/theme';
import { haptics } from '@/src/lib/haptic-feedback';
import type { SynthesisItem } from '@/src/types/engagement';

/**
 * Props for the SynthesisCard component
 */
export interface SynthesisCardProps {
  /** Names of concepts to connect */
  conceptsToConnect: string[];
  /** The synthesis prompt/question */
  synthesisPrompt: string;
  /** Number of chapters completed so far */
  chaptersCompleted: number;
  /** Total number of chapters in the feed */
  totalChapters: number;
  /** Called when user submits their synthesis */
  onComplete?: (response: string) => void;
  /** Called when user skips the synthesis */
  onSkip?: () => void;
  /** Whether this card is currently active */
  isActive?: boolean;
  /** Test ID for testing purposes */
  testID?: string;
}

/**
 * Minimum response length for synthesis
 */
const MIN_RESPONSE_LENGTH = 20;

/**
 * SynthesisCard Component
 *
 * Interactive card that encourages learners to make connections between concepts.
 */
export function SynthesisCard({
  conceptsToConnect,
  synthesisPrompt,
  chaptersCompleted,
  totalChapters,
  onComplete,
  onSkip,
  isActive = false,
  testID = 'synthesis-card',
}: SynthesisCardProps): React.ReactElement {
  const [response, setResponse] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const submitScale = useSharedValue(1);

  /**
   * Check if response is valid
   */
  const isResponseValid = response.trim().length >= MIN_RESPONSE_LENGTH;

  /**
   * Handle submit with animation
   */
  const handleSubmit = useCallback(async () => {
    if (!isResponseValid || isSubmitted) return;

    // Button press animation
    submitScale.value = withSpring(0.95, { damping: 15, stiffness: 400 }, () => {
      submitScale.value = withSpring(1);
    });

    // Haptic feedback
    await haptics.success();

    setIsSubmitted(true);
    onComplete?.(response.trim());
  }, [isResponseValid, isSubmitted, response, submitScale, onComplete]);

  /**
   * Handle skip
   */
  const handleSkip = useCallback(async () => {
    await haptics.light();
    onSkip?.();
  }, [onSkip]);

  /**
   * Animated style for submit button
   */
  const submitAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: submitScale.value }],
  }));

  /**
   * Calculate progress percentage
   */
  const progressPercent = Math.round((chaptersCompleted / totalChapters) * 100);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.keyboardAvoid}
    >
      <ScrollView
        testID={testID}
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <Animated.View
          entering={FadeIn.delay(100)}
          style={styles.header}
        >
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>&#129504;</Text>
          </View>
          <Text style={styles.headerTitle}>Connect the Dots</Text>
          <Text style={styles.headerSubtitle}>
            Synthesis checkpoint: {chaptersCompleted} of {totalChapters} chapters
          </Text>
        </Animated.View>

        {/* Progress indicator */}
        <Animated.View
          entering={SlideInUp.delay(150)}
          style={styles.progressSection}
        >
          <View style={styles.progressBar}>
            <View
              style={[styles.progressFill, { width: `${progressPercent}%` }]}
            />
          </View>
          <Text style={styles.progressText}>{progressPercent}% Complete</Text>
        </Animated.View>

        {/* Concepts to connect */}
        <Animated.View
          entering={SlideInUp.delay(200)}
          style={styles.conceptsSection}
        >
          <Text style={styles.conceptsLabel}>Concepts Covered</Text>
          <View style={styles.conceptsList}>
            {conceptsToConnect.map((concept, index) => (
              <ConceptChip
                key={concept}
                concept={concept}
                index={index}
                testID={`${testID}-concept-${index}`}
              />
            ))}
          </View>
        </Animated.View>

        {/* Synthesis prompt */}
        <Animated.View
          entering={SlideInUp.delay(250)}
          style={styles.promptSection}
        >
          <Text
            style={styles.promptText}
            testID={`${testID}-prompt`}
          >
            {synthesisPrompt}
          </Text>
        </Animated.View>

        {/* Response input */}
        {!isSubmitted ? (
          <Animated.View
            entering={SlideInUp.delay(300)}
            style={styles.inputSection}
          >
            <TextInput
              testID={`${testID}-input`}
              style={[
                styles.textInput,
                isFocused && styles.textInputFocused,
              ]}
              placeholder="Share your thoughts on how these concepts connect..."
              placeholderTextColor={colors.textTertiary}
              multiline
              numberOfLines={4}
              value={response}
              onChangeText={setResponse}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              accessible={true}
              accessibilityLabel="Synthesis response input"
              accessibilityHint="Type your response connecting the concepts"
            />

            {/* Character count */}
            <View style={styles.charCountContainer}>
              <Text
                style={[
                  styles.charCount,
                  isResponseValid && styles.charCountValid,
                ]}
              >
                {response.length} / {MIN_RESPONSE_LENGTH}+ characters
              </Text>
            </View>

            {/* Action buttons */}
            <View style={styles.actionsContainer}>
              <Pressable
                testID={`${testID}-skip`}
                style={styles.skipButton}
                onPress={handleSkip}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel="Skip synthesis"
              >
                <Text style={styles.skipButtonText}>Skip for now</Text>
              </Pressable>

              <Animated.View style={submitAnimatedStyle}>
                <Pressable
                  testID={`${testID}-submit`}
                  style={[
                    styles.submitButton,
                    !isResponseValid && styles.submitButtonDisabled,
                  ]}
                  onPress={handleSubmit}
                  disabled={!isResponseValid}
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel="Submit synthesis"
                  accessibilityState={{ disabled: !isResponseValid }}
                >
                  <Text style={styles.submitButtonText}>Submit</Text>
                </Pressable>
              </Animated.View>
            </View>
          </Animated.View>
        ) : (
          <Animated.View
            entering={FadeIn}
            style={styles.submittedSection}
            testID={`${testID}-submitted`}
          >
            <View style={styles.successIcon}>
              <Text style={styles.successIconText}>&#10003;</Text>
            </View>
            <Text style={styles.successTitle}>Great synthesis!</Text>
            <Text style={styles.successMessage}>
              You've made meaningful connections between these concepts.
              Keep building on this understanding!
            </Text>
          </Animated.View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/**
 * ConceptChip Component
 */
interface ConceptChipProps {
  concept: string;
  index: number;
  testID?: string;
}

function ConceptChip({ concept, index, testID }: ConceptChipProps): React.ReactElement {
  const delay = 100 + index * 50;

  return (
    <Animated.View
      entering={SlideInUp.delay(delay)}
      style={styles.conceptChip}
      testID={testID}
    >
      <Text style={styles.conceptChipText}>{concept}</Text>
    </Animated.View>
  );
}

/**
 * Create SynthesisCard props from a SynthesisItem
 */
export function createSynthesisCardProps(
  item: SynthesisItem
): Omit<SynthesisCardProps, 'onComplete' | 'onSkip' | 'isActive'> {
  return {
    conceptsToConnect: item.conceptsToConnect,
    synthesisPrompt: item.synthesisPrompt,
    chaptersCompleted: item.chaptersCompleted,
    totalChapters: item.totalChapters,
  };
}

const styles = StyleSheet.create({
  keyboardAvoid: {
    flex: 1,
  } as ViewStyle,
  container: {
    flex: 1,
    backgroundColor: colors.background,
  } as ViewStyle,
  contentContainer: {
    padding: spacing[4],
    paddingTop: spacing[8],
  } as ViewStyle,
  header: {
    alignItems: 'center',
    marginBottom: spacing[6],
  } as ViewStyle,
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.secondary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[3],
  } as ViewStyle,
  icon: {
    fontSize: 36,
  } as TextStyle,
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing[1],
  } as TextStyle,
  headerSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  } as TextStyle,
  progressSection: {
    marginBottom: spacing[6],
  } as ViewStyle,
  progressBar: {
    height: 6,
    backgroundColor: colors.borderLight,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: spacing[2],
  } as ViewStyle,
  progressFill: {
    height: '100%',
    backgroundColor: colors.secondary,
    borderRadius: 3,
  } as ViewStyle,
  progressText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
    textAlign: 'center',
  } as TextStyle,
  conceptsSection: {
    marginBottom: spacing[5],
  } as ViewStyle,
  conceptsLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing[2],
  } as TextStyle,
  conceptsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  } as ViewStyle,
  conceptChip: {
    backgroundColor: colors.primary + '15',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  } as ViewStyle,
  conceptChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.primary,
  } as TextStyle,
  promptSection: {
    backgroundColor: colors.backgroundSecondary,
    padding: spacing[4],
    borderRadius: 12,
    marginBottom: spacing[5],
    borderLeftWidth: 4,
    borderLeftColor: colors.secondary,
  } as ViewStyle,
  promptText: {
    fontSize: 18,
    fontWeight: '500',
    color: colors.text,
    lineHeight: 26,
  } as TextStyle,
  inputSection: {
    marginBottom: spacing[4],
  } as ViewStyle,
  textInput: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 12,
    padding: spacing[4],
    fontSize: 16,
    color: colors.text,
    minHeight: 120,
    textAlignVertical: 'top',
    borderWidth: 2,
    borderColor: colors.borderLight,
  } as TextStyle,
  textInputFocused: {
    borderColor: colors.primary,
  } as ViewStyle,
  charCountContainer: {
    alignItems: 'flex-end',
    marginTop: spacing[2],
    marginBottom: spacing[4],
  } as ViewStyle,
  charCount: {
    fontSize: 12,
    color: colors.textTertiary,
  } as TextStyle,
  charCountValid: {
    color: colors.success,
  } as TextStyle,
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  } as ViewStyle,
  skipButton: {
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
  } as ViewStyle,
  skipButtonText: {
    fontSize: 14,
    color: colors.textSecondary,
  } as TextStyle,
  submitButton: {
    backgroundColor: colors.secondary,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[6],
    borderRadius: 8,
  } as ViewStyle,
  submitButtonDisabled: {
    backgroundColor: colors.disabled,
  } as ViewStyle,
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  } as TextStyle,
  submittedSection: {
    alignItems: 'center',
    padding: spacing[6],
    backgroundColor: colors.success + '10',
    borderRadius: 16,
  } as ViewStyle,
  successIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.success,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[4],
  } as ViewStyle,
  successIconText: {
    fontSize: 32,
    color: colors.white,
  } as TextStyle,
  successTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.success,
    marginBottom: spacing[2],
  } as TextStyle,
  successMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  } as TextStyle,
});

export default SynthesisCard;
