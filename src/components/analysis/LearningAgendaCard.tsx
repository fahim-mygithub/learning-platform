/**
 * LearningAgendaCard Component
 *
 * Displays the Learning Agenda - the "learning contract" between the platform
 * and the learner. Shows:
 * - Module title and central question
 * - Learning promise and module objectives
 * - Key concepts with tiers
 * - Learning path with phases and timing
 * - Total time investment and prerequisites
 * - Mastery definition and assessment preview
 *
 * @example
 * ```tsx
 * <LearningAgendaCard
 *   agenda={learningAgenda}
 *   onStartLearning={() => navigateToRoadmap()}
 * />
 * ```
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  type ViewStyle,
  type StyleProp,
} from 'react-native';
import type { LearningAgenda, AgendaLearningPhase } from '@/src/types/three-pass';
import { colors, spacing } from '@/src/theme';
import { Card } from '../ui';

/**
 * Props for the LearningAgendaCard component
 */
export interface LearningAgendaCardProps {
  /** The learning agenda to display */
  agenda: LearningAgenda;
  /** Callback when "Start Learning" is pressed */
  onStartLearning?: () => void;
  /** Test ID for testing */
  testID?: string;
  /** Custom styles for the container */
  style?: StyleProp<ViewStyle>;
}

/**
 * Format minutes to human readable string
 */
function formatTime(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${mins}m`;
}

/**
 * Tier badge component for key concepts
 */
function TierIndicator({ tier }: { tier: 2 | 3 }): React.ReactElement {
  const isEnduring = tier === 3;
  return (
    <View
      style={[
        styles.tierBadge,
        isEnduring ? styles.tierBadgeEnduring : styles.tierBadgeImportant,
      ]}
    >
      <Text
        style={[
          styles.tierBadgeText,
          isEnduring ? styles.tierBadgeTextEnduring : styles.tierBadgeTextImportant,
        ]}
      >
        {isEnduring ? 'Core' : 'Key'}
      </Text>
    </View>
  );
}

/**
 * Learning phase item component
 */
function PhaseItem({ phase, isLast }: { phase: AgendaLearningPhase; isLast: boolean }): React.ReactElement {
  return (
    <View style={styles.phaseItem}>
      <View style={styles.phaseConnector}>
        <View style={styles.phaseNumber}>
          <Text style={styles.phaseNumberText}>{phase.phase}</Text>
        </View>
        {!isLast && <View style={styles.phaseLine} />}
      </View>
      <View style={styles.phaseContent}>
        <View style={styles.phaseHeader}>
          <Text style={styles.phaseTitle}>{phase.phase_title}</Text>
          <Text style={styles.phaseTime}>{formatTime(phase.estimated_minutes)}</Text>
        </View>
        <Text style={styles.phaseDescription}>{phase.description}</Text>
        {phase.concept_names.length > 0 && (
          <Text style={styles.phaseConcepts}>
            Covers: {phase.concept_names.join(', ')}
          </Text>
        )}
      </View>
    </View>
  );
}

/**
 * LearningAgendaCard Component
 */
export function LearningAgendaCard({
  agenda,
  onStartLearning,
  testID,
  style,
}: LearningAgendaCardProps): React.ReactElement {
  const [showAllObjectives, setShowAllObjectives] = useState(false);

  // Show first 3 objectives by default
  const visibleObjectives = showAllObjectives
    ? agenda.module_objectives
    : agenda.module_objectives.slice(0, 3);
  const hasMoreObjectives = agenda.module_objectives.length > 3;

  return (
    <Card testID={testID} style={[styles.card, style]}>
      {/* Header Section */}
      <View style={styles.header}>
        <Text style={styles.moduleTitle}>{agenda.module_title}</Text>
        <View style={styles.timeContainer}>
          <Text style={styles.timeLabel}>Total Time</Text>
          <Text style={styles.timeValue}>{formatTime(agenda.total_time_minutes)}</Text>
        </View>
      </View>

      {/* Central Question */}
      <View style={styles.questionSection}>
        <Text style={styles.questionLabel}>Central Question</Text>
        <Text style={styles.questionText}>{agenda.central_question}</Text>
      </View>

      {/* Learning Promise */}
      <View style={styles.promiseSection}>
        <Text style={styles.promiseText}>{agenda.learning_promise}</Text>
      </View>

      {/* Module Objectives */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>What You'll Learn</Text>
        {visibleObjectives.map((objective, index) => (
          <View key={index} style={styles.objectiveItem}>
            <Text style={styles.objectiveBullet}>•</Text>
            <Text style={styles.objectiveText}>{objective}</Text>
          </View>
        ))}
        {hasMoreObjectives && (
          <Pressable
            onPress={() => setShowAllObjectives(!showAllObjectives)}
            style={styles.showMoreButton}
          >
            <Text style={styles.showMoreText}>
              {showAllObjectives
                ? 'Show less'
                : `Show ${agenda.module_objectives.length - 3} more`}
            </Text>
          </Pressable>
        )}
      </View>

      {/* Key Concepts */}
      {agenda.key_concepts.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Key Concepts</Text>
          {agenda.key_concepts.map((concept, index) => (
            <View key={index} style={styles.conceptItem}>
              <View style={styles.conceptHeader}>
                <Text style={styles.conceptName}>{concept.name}</Text>
                <TierIndicator tier={concept.tier} />
              </View>
              <Text style={styles.conceptOneLiner}>{concept.one_liner}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Learning Path */}
      {agenda.learning_path.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Learning Path</Text>
          {agenda.learning_path.map((phase, index) => (
            <PhaseItem
              key={phase.phase}
              phase={phase}
              isLast={index === agenda.learning_path.length - 1}
            />
          ))}
        </View>
      )}

      {/* Prerequisites */}
      {(agenda.prerequisites.required.length > 0 ||
        agenda.prerequisites.helpful.length > 0) && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Prerequisites</Text>
          {agenda.prerequisites.required.length > 0 && (
            <View style={styles.prerequisiteGroup}>
              <Text style={styles.prerequisiteLabel}>Required:</Text>
              {agenda.prerequisites.required.map((prereq, index) => (
                <Text key={index} style={styles.prerequisiteItem}>
                  • {prereq}
                </Text>
              ))}
            </View>
          )}
          {agenda.prerequisites.helpful.length > 0 && (
            <View style={styles.prerequisiteGroup}>
              <Text style={styles.prerequisiteLabel}>Helpful:</Text>
              {agenda.prerequisites.helpful.map((prereq, index) => (
                <Text key={index} style={styles.prerequisiteItem}>
                  • {prereq}
                </Text>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Time Investment */}
      <View style={styles.investmentSection}>
        <View style={styles.investmentRow}>
          <Text style={styles.investmentLabel}>Session length:</Text>
          <Text style={styles.investmentValue}>
            ~{agenda.recommended_session_length} min
          </Text>
        </View>
      </View>

      {/* Mastery & Assessment */}
      <View style={styles.section}>
        <Text style={styles.masteryLabel}>Mastery Definition</Text>
        <Text style={styles.masteryText}>{agenda.mastery_definition}</Text>
        <Text style={styles.assessmentLabel}>Assessment</Text>
        <Text style={styles.assessmentText}>{agenda.assessment_preview}</Text>
      </View>

      {/* Start Learning Button */}
      {onStartLearning && (
        <Pressable
          testID={testID ? `${testID}-start-button` : undefined}
          style={({ pressed }) => [
            styles.startButton,
            pressed && styles.startButtonPressed,
          ]}
          onPress={onStartLearning}
          accessibilityRole="button"
          accessibilityLabel="Start learning"
        >
          <Text style={styles.startButtonText}>Start Learning</Text>
        </Pressable>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing[4],
    marginBottom: spacing[4],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing[3],
  },
  moduleTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginRight: spacing[3],
  },
  timeContainer: {
    alignItems: 'flex-end',
  },
  timeLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  timeValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  questionSection: {
    backgroundColor: colors.backgroundSecondary,
    padding: spacing[3],
    borderRadius: 8,
    marginBottom: spacing[3],
  },
  questionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing[1],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  questionText: {
    fontSize: 16,
    fontStyle: 'italic',
    color: colors.text,
    lineHeight: 24,
  },
  promiseSection: {
    marginBottom: spacing[4],
  },
  promiseText: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 22,
  },
  section: {
    marginBottom: spacing[4],
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing[2],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  objectiveItem: {
    flexDirection: 'row',
    marginBottom: spacing[2],
  },
  objectiveBullet: {
    fontSize: 14,
    color: colors.primary,
    marginRight: spacing[2],
    width: 12,
  },
  objectiveText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  showMoreButton: {
    paddingVertical: spacing[1],
  },
  showMoreText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
  conceptItem: {
    marginBottom: spacing[3],
    paddingLeft: spacing[2],
    borderLeftWidth: 2,
    borderLeftColor: colors.borderLight,
  },
  conceptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[1],
  },
  conceptName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginRight: spacing[2],
  },
  conceptOneLiner: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  tierBadge: {
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    borderRadius: 4,
  },
  tierBadgeEnduring: {
    backgroundColor: '#EEF2FF',
  },
  tierBadgeImportant: {
    backgroundColor: '#ECFDF5',
  },
  tierBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  tierBadgeTextEnduring: {
    color: colors.primary,
  },
  tierBadgeTextImportant: {
    color: colors.secondary,
  },
  phaseItem: {
    flexDirection: 'row',
    marginBottom: spacing[2],
  },
  phaseConnector: {
    width: 32,
    alignItems: 'center',
  },
  phaseNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  phaseNumberText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textInverse,
  },
  phaseLine: {
    flex: 1,
    width: 2,
    backgroundColor: colors.borderLight,
    marginVertical: 4,
  },
  phaseContent: {
    flex: 1,
    paddingLeft: spacing[2],
    paddingBottom: spacing[2],
  },
  phaseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[1],
  },
  phaseTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  phaseTime: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '500',
  },
  phaseDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing[1],
  },
  phaseConcepts: {
    fontSize: 12,
    color: colors.textTertiary,
    fontStyle: 'italic',
  },
  prerequisiteGroup: {
    marginBottom: spacing[2],
  },
  prerequisiteLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: spacing[1],
  },
  prerequisiteItem: {
    fontSize: 14,
    color: colors.text,
    marginLeft: spacing[2],
    marginBottom: 4,
  },
  investmentSection: {
    backgroundColor: colors.backgroundSecondary,
    padding: spacing[3],
    borderRadius: 8,
    marginBottom: spacing[4],
  },
  investmentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  investmentLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  investmentValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  masteryLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: spacing[1],
  },
  masteryText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
    marginBottom: spacing[3],
  },
  assessmentLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: spacing[1],
  },
  assessmentText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  startButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    borderRadius: 8,
    alignItems: 'center',
    marginTop: spacing[2],
  },
  startButtonPressed: {
    opacity: 0.8,
  },
  startButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textInverse,
  },
});

export default LearningAgendaCard;
