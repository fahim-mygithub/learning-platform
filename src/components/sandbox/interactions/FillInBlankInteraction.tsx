/**
 * FillInBlankInteraction Component
 *
 * A fill-in-the-blank interaction where users drag words from a word bank
 * to fill in blanks within a statement.
 *
 * Cognitive Type: Factual (Remember)
 * Pattern: Statement with [___] blanks + Word bank at bottom
 *
 * Features:
 * - Inline drop zones for blanks
 * - Word bank with draggable options
 * - Deterministic evaluation (exact match)
 * - Console logging for debugging
 *
 * @see openspec/changes/add-interactive-sandbox/proposal.md
 */

import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, type ViewStyle, type TextStyle } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { DropProvider, Draggable, Droppable } from 'react-native-reanimated-dnd';
import type { ScaffoldLevel } from '../../../types/sandbox';
import { useTypography } from '../../../lib/typography-context';
import { spacing } from '../../../theme';

/**
 * Blank definition
 */
export interface BlankDefinition {
  id: string;
  correctWord: string;
  position: number; // Index in the statement where blank appears
}

/**
 * Props for FillInBlankInteraction
 */
export interface FillInBlankInteractionProps {
  /** Statement with [___] placeholders for blanks */
  statement: string;

  /** Blank definitions with correct answers */
  blanks: BlankDefinition[];

  /** Word bank (includes correct answers + distractors) */
  wordBank: string[];

  /** Scaffold level for fading scaffolding */
  scaffoldLevel: ScaffoldLevel;

  /** Pre-filled blanks for scaffold mode (blankId -> word) */
  preFilled?: Record<string, string>;

  /** Called when state changes */
  onStateChange: (state: Record<string, string[]>) => void;

  /** Test ID for testing */
  testID?: string;
}

/**
 * Drag data for words
 */
interface WordDragData {
  id: string;
  word: string;
}

/**
 * Parse statement into segments (text and blanks)
 */
function parseStatement(
  statement: string,
  blanks: BlankDefinition[]
): Array<{ type: 'text' | 'blank'; content: string; blankId?: string }> {
  const segments: Array<{ type: 'text' | 'blank'; content: string; blankId?: string }> = [];
  const blankPattern = /\[___\]/g;
  let lastIndex = 0;
  let blankIndex = 0;
  let match;

  while ((match = blankPattern.exec(statement)) !== null) {
    // Add text before blank
    if (match.index > lastIndex) {
      segments.push({
        type: 'text',
        content: statement.slice(lastIndex, match.index),
      });
    }

    // Add blank
    const blank = blanks[blankIndex];
    segments.push({
      type: 'blank',
      content: '',
      blankId: blank?.id || `blank-${blankIndex}`,
    });

    lastIndex = match.index + match[0].length;
    blankIndex++;
  }

  // Add remaining text
  if (lastIndex < statement.length) {
    segments.push({
      type: 'text',
      content: statement.slice(lastIndex),
    });
  }

  return segments;
}

/**
 * FillInBlankInteraction Component
 */
export function FillInBlankInteraction({
  statement,
  blanks,
  wordBank,
  scaffoldLevel,
  preFilled = {},
  onStateChange,
  testID = 'fill-in-blank-interaction',
}: FillInBlankInteractionProps): React.ReactElement {
  const { getColors } = useTypography();
  const colors = getColors();

  // Track filled blanks: { [blankId]: [word] }
  const [filledBlanks, setFilledBlanks] = useState<Record<string, string[]>>(() => {
    const initial: Record<string, string[]> = {};

    // Initialize all blanks as empty
    blanks.forEach((blank) => {
      initial[blank.id] = [];
    });

    // Pre-fill for scaffold mode
    if (scaffoldLevel === 'scaffold') {
      Object.entries(preFilled).forEach(([blankId, word]) => {
        initial[blankId] = [word];
      });
    }

    return initial;
  });

  // Parse statement into segments
  const segments = useMemo(
    () => parseStatement(statement, blanks),
    [statement, blanks]
  );

  // Track used words
  const usedWords = useMemo(() => {
    const used = new Set<string>();
    Object.values(filledBlanks).forEach((words) => {
      words.forEach((word) => used.add(word));
    });
    return used;
  }, [filledBlanks]);

  // Handle drop into blank
  const handleDrop = useCallback(
    (blankId: string, data: WordDragData) => {
      console.log('[FillInBlank] Blank filled:', blankId, data.word);

      setFilledBlanks((prev) => {
        const newState = { ...prev };

        // Remove word from any previous blank
        Object.keys(newState).forEach((key) => {
          newState[key] = newState[key].filter((w) => w !== data.word);
        });

        // Add to new blank (single word per blank)
        newState[blankId] = [data.word];

        console.log('[FillInBlank] State:', newState);
        onStateChange(newState);

        return newState;
      });
    },
    [onStateChange]
  );

  // Create styles
  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          padding: spacing[4],
        } as ViewStyle,
        statementContainer: {
          flexDirection: 'row',
          flexWrap: 'wrap',
          alignItems: 'center',
          marginBottom: spacing[6],
          padding: spacing[3],
          backgroundColor: colors.backgroundSecondary,
          borderRadius: 12,
        } as ViewStyle,
        textSegment: {
          fontSize: 16,
          color: colors.text,
          lineHeight: 28,
        } as TextStyle,
        blankZone: {
          minWidth: 80,
          height: 32,
          backgroundColor: colors.backgroundTertiary,
          borderWidth: 2,
          borderColor: colors.border,
          borderStyle: 'dashed',
          borderRadius: 6,
          justifyContent: 'center',
          alignItems: 'center',
          marginHorizontal: 4,
          paddingHorizontal: spacing[2],
        } as ViewStyle,
        blankZoneFilled: {
          borderColor: colors.primary,
          backgroundColor: colors.primary + '20',
          borderStyle: 'solid',
        } as ViewStyle,
        blankText: {
          fontSize: 14,
          color: colors.textSecondary,
        } as TextStyle,
        filledText: {
          fontSize: 14,
          fontWeight: '600',
          color: colors.primary,
        } as TextStyle,
        wordBankContainer: {
          marginTop: spacing[4],
        } as ViewStyle,
        wordBankLabel: {
          fontSize: 14,
          fontWeight: '600',
          color: colors.textSecondary,
          marginBottom: spacing[2],
        } as TextStyle,
        wordBankRow: {
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: spacing[2],
        } as ViewStyle,
        wordItem: {
          backgroundColor: colors.primary,
          paddingHorizontal: spacing[3],
          paddingVertical: spacing[2],
          borderRadius: 6,
          minHeight: 36,
          justifyContent: 'center',
          alignItems: 'center',
        } as ViewStyle,
        wordItemUsed: {
          opacity: 0.3,
        } as ViewStyle,
        wordText: {
          color: colors.white,
          fontSize: 14,
          fontWeight: '500',
        } as TextStyle,
      }),
    [colors]
  );

  // Shuffle word bank (stable across renders)
  const shuffledWordBank = useMemo(() => {
    return [...wordBank].sort(() => Math.random() - 0.5);
  }, [wordBank]);

  return (
    <GestureHandlerRootView style={styles.container} testID={testID}>
      <DropProvider>
        {/* Statement with inline blanks */}
        <View style={styles.statementContainer}>
          {segments.map((segment, index) => {
            if (segment.type === 'text') {
              return (
                <Text key={index} style={styles.textSegment}>
                  {segment.content}
                </Text>
              );
            }

            // Blank segment
            const blankId = segment.blankId!;
            const filledWords = filledBlanks[blankId] || [];
            const isFilled = filledWords.length > 0;

            return (
              <Droppable
                key={index}
                droppableId={blankId}
                onDrop={(data: WordDragData) => handleDrop(blankId, data)}
                dropDisabled={isFilled}
                dropAlignment="center"
              >
                <View
                  style={[styles.blankZone, isFilled && styles.blankZoneFilled]}
                >
                  {isFilled ? (
                    <Text style={styles.filledText}>{filledWords[0]}</Text>
                  ) : (
                    <Text style={styles.blankText}>___</Text>
                  )}
                </View>
              </Droppable>
            );
          })}
        </View>

        {/* Word bank */}
        <View style={styles.wordBankContainer}>
          <Text style={styles.wordBankLabel}>Word Bank:</Text>
          <View style={styles.wordBankRow}>
            {shuffledWordBank.map((word) => {
              const isUsed = usedWords.has(word);
              const dragData: WordDragData = {
                id: `word-${word}`,
                word,
              };

              return (
                <Draggable
                  key={word}
                  data={dragData}
                  dragDisabled={isUsed}
                  onDragStart={() => {
                    console.log('[FillInBlank] Drag started:', word);
                  }}
                >
                  <View style={[styles.wordItem, isUsed && styles.wordItemUsed]}>
                    <Text style={styles.wordText}>{word}</Text>
                  </View>
                </Draggable>
              );
            })}
          </View>
        </View>
      </DropProvider>
    </GestureHandlerRootView>
  );
}

export default FillInBlankInteraction;
