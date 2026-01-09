/**
 * Learning Session Screen
 *
 * Main learning experience that integrates:
 * - Prerequisite check and pretest flow (Phase 6D)
 * - Progress bar and cognitive load indicator
 * - QuestionRenderer for question phase
 * - ConceptReveal for reveal phase
 * - Session completion navigation
 *
 * Flow:
 * 1. Check prerequisites
 * 2. Show pretest offer modal (if prerequisites exist)
 * 3. Pretest -> Gap Results -> Mini-Lessons (optional)
 * 4. Learning Session: Question -> Answer -> Reveal -> Next Item -> Complete
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';

import { Button } from '@/src/components/ui/Button';
import { QuestionRenderer, ConceptReveal } from '@/src/components/question';
import { CognitiveLoadIndicator } from '@/src/components/session';
import {
  PretestOfferModal,
  PrerequisitePretest,
  GapResultsScreen,
  MiniLesson,
} from '@/src/components/prerequisite';
import {
  PrerequisiteProvider,
  usePrerequisite,
  type PrerequisiteService,
} from '@/src/lib/prerequisite-context';
import {
  LearningSessionProvider,
  useLearningSession,
} from '@/src/lib/learning-session-context';
import { useSession } from '@/src/lib/session-context';
import { useTypography } from '@/src/lib/typography-context';
import { useAuth } from '@/src/lib/auth-context';
import { supabase } from '@/src/lib/supabase';
import { buildInterleavedSession } from '@/src/lib/session/session-builder-service';
import { createPrerequisiteAssessmentService } from '@/src/lib/prerequisite-assessment-service';
import { spacing } from '@/src/theme';
import { type ColorTheme } from '@/src/theme/colors';
import type { Concept, SampleQuestion } from '@/src/types/database';
import type { CognitiveCapacity } from '@/src/types/session';
import type { QuestionType } from '@/src/types/three-pass';
import type { Prerequisite } from '@/src/types/prerequisite';

// ============================================================================
// Types
// ============================================================================

/**
 * Prerequisite flow state machine
 * Controls what view is shown during the prerequisite assessment phase
 */
type PrerequisiteFlowState =
  | 'checking_session' // Checking if first session (NEW: added for first-session detection)
  | 'checking'         // Loading prerequisites
  | 'offer'            // Show PretestOfferModal
  | 'pretest'          // Show PrerequisitePretest
  | 'gaps'             // Show GapResultsScreen
  | 'mini_lesson'      // Show MiniLesson
  | 'learning';        // Show actual learning session

/**
 * Concept data with sample questions loaded from database
 */
interface ConceptWithQuestions extends Concept {
  currentQuestion?: SampleQuestion;
}


// ============================================================================
// Inner Component (uses context)
// ============================================================================

/**
 * LearningScreenContent Component
 *
 * Inner component that uses the LearningSessionContext and PrerequisiteContext.
 * Separated to allow provider wrapping at the top level.
 */
function LearningScreenContent() {
  const router = useRouter();
  const params = useLocalSearchParams();
  // Support both sourceId (from navigation) and projectId (legacy) parameters
  const projectId = (params.sourceId || params.projectId) as string | undefined;
  const { capacity } = useSession();
  const { user } = useAuth();

  // Get dynamic colors from typography context
  const { getColors, isDarkMode } = useTypography();
  const colors = getColors();
  const styles = React.useMemo(() => createStyles(colors), [colors]);

  const {
    phase,
    progress,
    currentResponse,
    getCurrentItem,
    startSession,
    submitAnswer,
    advanceToNextItem,
    endSession,
    isSessionActive,
  } = useLearningSession();

  // Prerequisite context
  const {
    prerequisites,
    pretestStatus,
    questions: pretestQuestions,
    currentQuestionIndex,
    gaps,
    gapAnalysis,
    miniLessons,
    completedMiniLessons,
    currentMiniLessonId,
    isLoading: prereqLoading,
    error: prereqError,
    didSkipPretest,
    checkPrerequisites,
    startPretest,
    skipPretest,
    submitAnswer: submitPretestAnswer,
    completePretest,
    startMiniLesson,
    completeMiniLesson,
    proceedToLearning,
    hasPrerequisites,
  } = usePrerequisite();

  // Prerequisite flow state - starts with session check to determine first vs subsequent
  const [flowState, setFlowState] = useState<PrerequisiteFlowState>('checking_session');

  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [conceptsMap, setConceptsMap] = useState<Map<string, ConceptWithQuestions>>(
    new Map()
  );
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());

  // Track which question index we're on for each concept
  const questionIndexRef = useRef<Map<string, number>>(new Map());

  // Track whether we've initialized the session for this project
  // This prevents re-initialization when phase becomes 'complete'
  const sessionInitializedForProjectRef = useRef<string | null>(null);

  /**
   * Load concepts for the project
   */
  const loadConcepts = useCallback(async (projId: string) => {
    const { data: concepts, error: queryError } = await supabase
      .from('concepts')
      .select('*')
      .eq('project_id', projId)
      .eq('mentioned_only', false)
      .order('tier', { ascending: false }); // Tier 3 first, then 2, then 1

    if (queryError) {
      throw new Error(`Failed to load concepts: ${queryError.message}`);
    }

    return concepts as Concept[];
  }, []);

  /**
   * Load concept mastery states to determine reviews vs new
   */
  const loadMasteryStates = useCallback(async (projId: string, userId: string) => {
    const { data: masteryData, error: masteryError } = await supabase
      .from('concept_mastery')
      .select('concept_id, state')
      .eq('project_id', projId)
      .eq('user_id', userId);

    if (masteryError) {
      // If no mastery data exists yet, that's fine
      if (masteryError.code === 'PGRST116') {
        return new Map<string, string>();
      }
      console.warn('Error loading mastery states:', masteryError);
      return new Map<string, string>();
    }

    const stateMap = new Map<string, string>();
    masteryData?.forEach((m: { concept_id: string; state: string }) => {
      stateMap.set(m.concept_id, m.state);
    });
    return stateMap;
  }, []);

  /**
   * Check if this is the user's first session on mount
   * First sessions show prerequisite pretest; subsequent sessions skip to feed
   */
  useEffect(() => {
    async function checkSessionType() {
      if (!projectId || !user?.id) {
        if (!projectId) {
          setError('No project ID provided');
          setLoading(false);
        }
        return;
      }

      try {
        // Check if user has completed their first session for this source
        const { data, error: queryError } = await supabase
          .from('feed_progress')
          .select('first_session_completed_at')
          .eq('user_id', user.id)
          .eq('source_id', projectId)
          .maybeSingle();

        if (queryError) {
          console.error('Error checking session type:', queryError);
          // On error, assume first session (safer to show prerequisites)
          setFlowState('checking');
          await checkPrerequisites(projectId);
          return;
        }

        // Check if first_session_completed_at is set
        const isFirstSession = !data || data.first_session_completed_at === null;

        if (isFirstSession) {
          // First session: Check prerequisites and show pretest if needed
          console.log('[LEARNING] First session - checking prerequisites');
          setFlowState('checking');
          await checkPrerequisites(projectId);
        } else {
          // Subsequent session: Skip directly to feed (uses brain-priming pretest)
          console.log('[LEARNING] Subsequent session - skipping to feed');
          router.push({
            pathname: '/(auth)/feed',
            params: { sourceId: projectId }
          });
        }
      } catch (err) {
        console.error('Failed to check session type:', err);
        // If check fails, proceed to learning anyway
        setFlowState('checking');
        await checkPrerequisites(projectId);
      }
    }

    checkSessionType();
  }, [projectId, user?.id, checkPrerequisites, router]);

  /**
   * Handle prerequisite check completion
   * Determines whether to show offer modal or proceed to learning
   */
  useEffect(() => {
    // Skip if still in initial checking state or already past offer
    if (flowState !== 'checking') return;
    // Wait for prerequisite loading to complete
    if (prereqLoading) return;

    // After prerequisites are loaded, decide next state
    if (hasPrerequisites()) {
      setFlowState('offer');
    } else {
      // No prerequisites, navigate directly to feed
      router.push({
        pathname: '/(auth)/feed',
        params: { sourceId: projectId }
      });
    }
  }, [flowState, prereqLoading, hasPrerequisites]);

  /**
   * Handle pretest status changes
   * Transitions flow state based on pretest progress
   */
  useEffect(() => {
    console.log('[LEARNING DEBUG] pretestStatus changed', {
      pretestStatus,
      flowState,
      gapsLength: gaps.length,
      currentQuestionIndex,
    });
    if (pretestStatus === 'in_progress') {
      console.log('[LEARNING DEBUG] Setting flowState to pretest');
      setFlowState('pretest');
    } else if (pretestStatus === 'completed') {
      // Check if there are gaps
      if (gaps.length > 0) {
        console.log('[LEARNING DEBUG] Setting flowState to gaps');
        setFlowState('gaps');
      } else {
        console.log('[LEARNING DEBUG] Navigating to feed (no gaps)');
        router.push({
          pathname: '/(auth)/feed',
          params: { sourceId: projectId }
        });
      }
    } else if (pretestStatus === 'skipped') {
      console.log('[LEARNING DEBUG] Navigating to feed (skipped)');
      router.push({
        pathname: '/(auth)/feed',
        params: { sourceId: projectId }
      });
    }
  }, [pretestStatus, gaps.length]);

  /**
   * Handle mini-lesson view
   */
  useEffect(() => {
    if (currentMiniLessonId) {
      setFlowState('mini_lesson');
    } else if (flowState === 'mini_lesson') {
      // Mini-lesson was closed, go back to gaps
      setFlowState('gaps');
    }
  }, [currentMiniLessonId, flowState]);

  /**
   * Initialize the learning session
   * Only runs when flowState transitions to 'learning'
   */
  useEffect(() => {
    async function initSession() {
      // Only initialize when we're in learning state and not already loading
      if (flowState !== 'learning') return;

      // Use ref to track initialization - prevents re-init when phase becomes 'complete'
      // (isSessionActive changes identity when phase changes, which would trigger this effect)
      if (sessionInitializedForProjectRef.current === projectId) return;
      if (isSessionActive()) return; // Already initialized

      if (!projectId) {
        setError('No project ID provided');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setError('Not authenticated');
          setLoading(false);
          return;
        }

        // Load concepts
        const concepts = await loadConcepts(projectId);
        if (concepts.length === 0) {
          setError('No concepts found for this project. Please analyze content first.');
          setLoading(false);
          return;
        }

        // Load mastery states
        const masteryStates = await loadMasteryStates(projectId, user.id);

        // Categorize concepts into reviews and new
        const reviews: Array<{ conceptId: string }> = [];
        const newConcepts: Array<{ conceptId: string }> = [];

        concepts.forEach((concept) => {
          const state = masteryStates.get(concept.id);
          // Concepts with mastery state are reviews, others are new
          if (state && state !== 'unseen') {
            reviews.push({ conceptId: concept.id });
          } else {
            newConcepts.push({ conceptId: concept.id });
          }
        });

        // Build interleaved session
        const effectiveCapacity = capacity?.effectiveCapacity ?? 4;
        const sessionItems = buildInterleavedSession({
          reviews,
          newConcepts,
          capacity: Math.floor(effectiveCapacity),
        });

        if (sessionItems.length === 0) {
          setError('No items to learn. All concepts may be mastered already.');
          setLoading(false);
          return;
        }

        // Build concepts map with questions
        const cMap = new Map<string, ConceptWithQuestions>();
        concepts.forEach((concept) => {
          const conceptWithQ: ConceptWithQuestions = { ...concept };
          // Select first sample question if available
          if (concept.assessment_spec?.sample_questions?.length) {
            conceptWithQ.currentQuestion = concept.assessment_spec.sample_questions[0];
          }
          cMap.set(concept.id, conceptWithQ);
        });
        setConceptsMap(cMap);

        // Start session
        startSession(projectId, sessionItems);
        sessionInitializedForProjectRef.current = projectId; // Mark as initialized
        setQuestionStartTime(Date.now());
        setLoading(false);
      } catch (err) {
        console.error('Failed to initialize learning session:', err);
        setError(err instanceof Error ? err.message : 'Failed to start session');
        setLoading(false);
      }
    }

    initSession();
  }, [flowState, projectId, capacity, loadConcepts, loadMasteryStates, startSession, isSessionActive]);

  /**
   * Reset question timer when moving to new question
   */
  useEffect(() => {
    if (phase === 'question') {
      setQuestionStartTime(Date.now());
    }
  }, [phase, progress.current]);

  /**
   * Get current concept data
   */
  const getCurrentConcept = useCallback((): ConceptWithQuestions | null => {
    const item = getCurrentItem();
    if (!item) return null;
    return conceptsMap.get(item.concept_id) ?? null;
  }, [getCurrentItem, conceptsMap]);

  /**
   * Get current question for the active item
   */
  const getCurrentQuestion = useCallback((): SampleQuestion | null => {
    const concept = getCurrentConcept();
    if (!concept) return null;

    // Get questions from assessment spec
    const questions = concept.assessment_spec?.sample_questions ?? [];
    if (questions.length === 0) {
      // Generate a default definition recall question if no questions exist
      return {
        question_type: 'definition_recall' as QuestionType,
        question_text: `What is ${concept.name}?`,
        correct_answer: concept.definition,
      };
    }

    // Get question index for this concept
    const qIndex = questionIndexRef.current.get(concept.id) ?? 0;
    return questions[qIndex % questions.length];
  }, [getCurrentConcept]);

  /**
   * Handle answer submission
   */
  const handleAnswer = useCallback(
    (answer: string) => {
      const question = getCurrentQuestion();
      const responseTime = Date.now() - questionStartTime;

      // Simple correctness check (can be enhanced with fuzzy matching)
      let isCorrect = false;
      if (question) {
        const normalizedAnswer = answer.toLowerCase().trim();
        const normalizedCorrect = question.correct_answer.toLowerCase().trim();

        // For multiple choice, check exact match
        if (question.question_type === 'multiple_choice') {
          isCorrect = normalizedAnswer === normalizedCorrect;
        }
        // For true/false
        else if (question.question_type === 'true_false') {
          isCorrect = normalizedAnswer === normalizedCorrect;
        }
        // For text-based questions, use fuzzy matching
        else {
          // Check if answer contains key terms from correct answer
          const correctWords = normalizedCorrect.split(/\s+/).filter((w) => w.length > 3);
          const matchCount = correctWords.filter((w) => normalizedAnswer.includes(w)).length;
          isCorrect = matchCount >= Math.ceil(correctWords.length * 0.5);
        }
      }

      submitAnswer(answer, isCorrect, responseTime);
    },
    [getCurrentQuestion, questionStartTime, submitAnswer]
  );

  /**
   * Handle continue to next item
   */
  const handleContinue = useCallback(() => {
    // Advance question index for this concept
    const concept = getCurrentConcept();
    if (concept) {
      const currentIndex = questionIndexRef.current.get(concept.id) ?? 0;
      questionIndexRef.current.set(concept.id, currentIndex + 1);
    }

    advanceToNextItem();
  }, [getCurrentConcept, advanceToNextItem]);

  /**
   * Handle session end/exit
   */
  const handleExit = useCallback(() => {
    sessionInitializedForProjectRef.current = null; // Reset so next visit can re-init
    endSession();
    // Use replace to navigate to project detail instead of back()
    // This is more reliable on web where history may not work as expected
    if (projectId) {
      router.replace(`/projects/${projectId}`);
    } else {
      router.replace('/projects');
    }
  }, [endSession, router, projectId]);

  /**
   * Handle session completion
   */
  const handleComplete = useCallback(() => {
    // Navigate to session complete screen
    // Note: The session-complete screen expects sessionId and projectId params
    // Since we don't persist sessions to DB yet, we navigate with projectId only
    router.replace({
      pathname: '/(auth)/session-complete',
      params: {
        projectId: projectId ?? '',
      },
    });
  }, [router, projectId]);

  // ============================================================================
  // Prerequisite Flow Handlers
  // ============================================================================

  /**
   * Handle taking the pretest
   */
  const handleTakePretest = useCallback(() => {
    startPretest();
  }, [startPretest]);

  /**
   * Handle skipping the pretest
   */
  const handleSkipPretest = useCallback(() => {
    skipPretest();
  }, [skipPretest]);

  /**
   * Handle pretest answer submission
   */
  const handlePretestAnswer = useCallback(
    (selectedIndex: number, responseTimeMs: number) => {
      console.log('[LEARNING DEBUG] handlePretestAnswer called', {
        selectedIndex,
        responseTimeMs,
        currentQuestionIndex,
      });
      submitPretestAnswer(selectedIndex, responseTimeMs);
    },
    [submitPretestAnswer, currentQuestionIndex]
  );

  /**
   * Handle pretest completion
   */
  const handlePretestComplete = useCallback(async () => {
    console.log('[LEARNING DEBUG] handlePretestComplete called');
    await completePretest();
    console.log('[LEARNING DEBUG] handlePretestComplete finished');
  }, [completePretest]);

  /**
   * Handle learning a gap (start mini-lesson)
   */
  const handleLearnGap = useCallback(
    (prerequisiteId: string) => {
      startMiniLesson(prerequisiteId);
    },
    [startMiniLesson]
  );

  /**
   * Handle mini-lesson completion
   */
  const handleMiniLessonComplete = useCallback(
    (prerequisiteId: string) => {
      completeMiniLesson(prerequisiteId);
    },
    [completeMiniLesson]
  );

  /**
   * Handle continuing from gap results to learning
   */
  const handleContinueFromGaps = useCallback(() => {
    proceedToLearning();
    router.push({
      pathname: '/(auth)/feed',
      params: { sourceId: projectId }
    });
  }, [proceedToLearning, router, projectId]);

  /**
   * Handle going back from mini-lesson to gap results
   */
  const handleBackToGaps = useCallback(() => {
    proceedToLearning(); // This clears currentMiniLessonId
  }, [proceedToLearning]);

  /**
   * Get the current prerequisite for mini-lesson display
   */
  const getCurrentMiniLessonPrerequisite = useCallback((): Prerequisite | null => {
    if (!currentMiniLessonId) return null;
    return prerequisites.find((p) => p.id === currentMiniLessonId) ?? null;
  }, [currentMiniLessonId, prerequisites]);

  /**
   * Get the current mini-lesson content
   */
  const getCurrentMiniLessonContent = useCallback(() => {
    if (!currentMiniLessonId) return null;
    return miniLessons.get(currentMiniLessonId) ?? null;
  }, [currentMiniLessonId, miniLessons]);

  // ============================================================================
  // Render States
  // ============================================================================

  // Session type checking state (first vs subsequent session)
  if (flowState === 'checking_session') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Preparing your session...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Prerequisite checking state
  if (flowState === 'checking') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Checking prerequisites...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Pretest offer modal (shown over checking/loading state)
  if (flowState === 'offer') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.loadingText}>Ready to learn!</Text>
        </View>
        <PretestOfferModal
          visible={true}
          prerequisiteCount={prerequisites.length}
          onTakePretest={handleTakePretest}
          onSkip={handleSkipPretest}
          isLoading={prereqLoading}
          testID="pretest-offer-modal"
        />
      </SafeAreaView>
    );
  }

  // Pretest screen
  if (flowState === 'pretest') {
    console.log('[LEARNING DEBUG] Rendering pretest screen', {
      questionsCount: pretestQuestions.length,
      currentQuestionIndex,
      pretestStatus,
    });
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <PrerequisitePretest
          questions={pretestQuestions}
          currentQuestionIndex={currentQuestionIndex}
          onAnswer={handlePretestAnswer}
          onComplete={handlePretestComplete}
          isLoading={prereqLoading}
          testID="prerequisite-pretest"
        />
      </SafeAreaView>
    );
  }

  // Gap results screen
  if (flowState === 'gaps' && gapAnalysis) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <GapResultsScreen
          gapAnalysis={gapAnalysis}
          completedMiniLessons={completedMiniLessons}
          onLearnGap={handleLearnGap}
          onContinue={handleContinueFromGaps}
          isLoading={prereqLoading}
          testID="gap-results-screen"
        />
      </SafeAreaView>
    );
  }

  // Mini-lesson screen
  if (flowState === 'mini_lesson') {
    const prerequisite = getCurrentMiniLessonPrerequisite();
    const miniLesson = getCurrentMiniLessonContent();

    if (prerequisite) {
      return (
        <SafeAreaView style={styles.container} edges={['top']}>
          <MiniLesson
            prerequisite={prerequisite}
            miniLesson={miniLesson}
            onComplete={() => handleMiniLessonComplete(prerequisite.id)}
            onBack={handleBackToGaps}
            isLoading={prereqLoading}
            error={prereqError}
            testID="mini-lesson"
          />
        </SafeAreaView>
      );
    }
  }

  // Loading state (for learning session initialization)
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Preparing your learning session...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.errorIcon}>!</Text>
          <Text style={styles.errorTitle}>Unable to Start Session</Text>
          <Text style={styles.errorText}>{error}</Text>
          <Button onPress={() => router.back()} style={styles.backButton}>
            Go Back
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  // Session complete state
  if (phase === 'complete') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.completeIcon}>*</Text>
          <Text style={styles.completeTitle}>Session Complete!</Text>
          <Text style={styles.completeSubtitle}>
            You learned {progress.newLearned} new concept{progress.newLearned !== 1 ? 's' : ''} and
            reviewed {progress.reviewsCompleted}
          </Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{progress.correctCount}</Text>
              <Text style={styles.statLabel}>Correct</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{progress.total}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {progress.total > 0
                  ? Math.round((progress.correctCount / progress.total) * 100)
                  : 0}
                %
              </Text>
              <Text style={styles.statLabel}>Accuracy</Text>
            </View>
          </View>
          <Button onPress={handleComplete} style={styles.completeButton}>
            View Results
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  // Get current item and concept
  const currentItem = getCurrentItem();
  const currentConcept = getCurrentConcept();
  const currentQuestion = getCurrentQuestion();

  if (!currentItem || !currentConcept) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.errorTitle}>No Items Available</Text>
          <Button onPress={handleExit}>Go Back</Button>
        </View>
      </SafeAreaView>
    );
  }

  // Calculate cognitive load for display
  const conceptsUsed = progress.current;
  const displayCapacity: CognitiveCapacity = capacity ?? {
    baseCapacity: 4,
    circadianModifier: 1.0,
    sleepModifier: 1.0,
    fatigueModifier: 0,
    effectiveCapacity: 4,
    percentageUsed: (conceptsUsed / 4) * 100,
    canLearnNew: true,
    warningLevel: 'none',
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header with progress */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleExit}
          style={styles.closeButton}
          accessibilityLabel="Exit learning session"
          accessibilityRole="button"
          activeOpacity={0.7}
        >
          <Text style={styles.closeText}>X</Text>
        </TouchableOpacity>
        <View style={styles.progressInfo}>
          <Text style={styles.progressText}>
            {progress.current} / {progress.total}
          </Text>
          <Text style={styles.itemTypeText}>
            {currentItem.type === 'new'
              ? 'New Concept'
              : currentItem.type === 'review'
                ? 'Review'
                : 'Pretest'}
          </Text>
        </View>
        <View style={styles.spacer} />
      </View>

      {/* Progress bar */}
      <View style={styles.progressBarContainer}>
        <View
          style={[
            styles.progressBar,
            {
              width: `${(progress.current / progress.total) * 100}%`,
            },
          ]}
        />
      </View>

      {/* Cognitive Load Indicator */}
      <View style={styles.cognitiveLoadContainer}>
        <CognitiveLoadIndicator
          capacity={displayCapacity}
          conceptsUsed={conceptsUsed}
          testID="learning-cognitive-load"
        />
      </View>

      {/* Skipped Pretest Warning Badge */}
      {didSkipPretest && (
        <View
          style={styles.warningBadge}
          testID="skipped-pretest-warning"
          accessible={true}
          accessibilityLabel="Warning: Prerequisite check was skipped. Some concepts may be harder to understand."
        >
          <Text style={styles.warningBadgeIcon}>!</Text>
          <Text style={styles.warningBadgeText}>Prerequisite check skipped</Text>
        </View>
      )}

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Question Phase */}
        {phase === 'question' && currentQuestion && (
          <QuestionRenderer
            questionType={currentQuestion.question_type}
            questionText={currentQuestion.question_text}
            options={
              currentQuestion.question_type === 'multiple_choice'
                ? [
                    currentQuestion.correct_answer,
                    ...(currentQuestion.distractors ?? []),
                  ].sort(() => Math.random() - 0.5)
                : currentQuestion.question_type === 'sequence'
                  ? currentQuestion.distractors ?? []
                  : undefined
            }
            onAnswer={handleAnswer}
            testID="learning-question"
          />
        )}

        {/* Reveal Phase */}
        {phase === 'reveal' && (
          <ConceptReveal
            isCorrect={currentResponse?.isCorrect ?? false}
            conceptName={currentConcept.name}
            definition={currentConcept.definition}
            pedagogicalNotes={currentConcept.why_it_matters}
            misconception={
              !currentResponse?.isCorrect
                ? currentConcept.common_misconceptions?.[0]?.misconception
                : undefined
            }
            onContinue={handleContinue}
            testID="learning-reveal"
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ============================================================================
// Create Prerequisite Service
// ============================================================================

/**
 * Create the prerequisite service for the provider
 * This adapts the assessment service to the PrerequisiteService interface
 */
function createPrerequisiteServiceAdapter(): PrerequisiteService {
  const assessmentService = createPrerequisiteAssessmentService(supabase);

  return {
    getPrerequisites: assessmentService.getPrerequisites,
    generatePretestQuestions: assessmentService.generatePretestQuestions,
    analyzeGaps: assessmentService.analyzeGaps,
    generateMiniLesson: assessmentService.generateMiniLesson,
  };
}

// Create a singleton instance to avoid recreating on every render
let prerequisiteServiceInstance: PrerequisiteService | null = null;

function getPrerequisiteService(): PrerequisiteService {
  if (!prerequisiteServiceInstance) {
    try {
      prerequisiteServiceInstance = createPrerequisiteServiceAdapter();
    } catch (error) {
      // If service creation fails (e.g., no API key), return a stub
      console.warn('Failed to create prerequisite service:', error);
      prerequisiteServiceInstance = {
        getPrerequisites: async () => [],
        generatePretestQuestions: async () => [],
        analyzeGaps: async () => ({
          totalPrerequisites: 0,
          correct: 0,
          percentage: 100,
          gaps: [],
          recommendation: 'proceed' as const,
        }),
        generateMiniLesson: async () => {
          throw new Error('Prerequisite service not available');
        },
      };
    }
  }
  return prerequisiteServiceInstance;
}

// ============================================================================
// Main Component (provides context)
// ============================================================================

/**
 * LearningScreen Component
 *
 * Main learning session screen that wraps content with:
 * - PrerequisiteProvider for prerequisite assessment flow
 * - LearningSessionProvider for learning session state
 */
export default function LearningScreen() {
  const prerequisiteService = getPrerequisiteService();

  return (
    <PrerequisiteProvider service={prerequisiteService}>
      <LearningSessionProvider>
        <LearningScreenContent />
      </LearningSessionProvider>
    </PrerequisiteProvider>
  );
}

// ============================================================================
// Styles
// ============================================================================

/**
 * Create dynamic styles based on theme colors
 */
function createStyles(colors: ColorTheme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.backgroundSecondary,
    },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[6],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.backgroundTertiary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  closeText: {
    fontSize: 18,
    color: colors.text,
    fontWeight: '600',
  },
  progressInfo: {
    flex: 1,
    alignItems: 'center',
  },
  progressText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  itemTypeText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  spacer: {
    width: 40,
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: colors.border,
  },
  progressBar: {
    height: 4,
    backgroundColor: colors.primary,
  },
  cognitiveLoadContainer: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
    paddingBottom: spacing[1],
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing[4],
    paddingBottom: spacing[8],
  },
  loadingText: {
    marginTop: spacing[4],
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  errorIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.error,
    color: colors.white,
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 64,
    marginBottom: spacing[4],
    overflow: 'hidden',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing[2],
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing[4],
  },
  backButton: {
    marginTop: spacing[4],
  },
  completeIcon: {
    fontSize: 64,
    marginBottom: spacing[4],
  },
  completeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing[2],
    textAlign: 'center',
  },
  completeSubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing[6],
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing[8],
    marginBottom: spacing[6],
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.primary,
  },
  statLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: spacing[1],
  },
  completeButton: {
    minWidth: 160,
  },
  // Warning badge for skipped pretest
  warningBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${colors.warning}15`,
    borderWidth: 1,
    borderColor: colors.warning,
    borderRadius: 8,
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    marginHorizontal: spacing[4],
    marginBottom: spacing[2],
  },
  warningBadgeIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.warning,
    color: colors.white,
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 20,
    marginRight: spacing[2],
    overflow: 'hidden',
  },
  warningBadgeText: {
    fontSize: 12,
    color: colors.warning,
    fontWeight: '600',
  },
  });
}
