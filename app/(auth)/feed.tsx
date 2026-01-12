/**
 * Feed Screen - Luminous Focus Design
 *
 * Full-screen immersive learning experience with TikTok-style swipeable cards.
 * Implements the "Luminous Focus" design direction:
 * - Full-screen immersive experience (no tab bar)
 * - Premium quiz cards with glowing correct/incorrect feedback
 * - Progress bar at top
 * - XP display that animates on reward
 * - Open-loop teasers in indigo
 * - Deep blacks with luminous highlights
 */

import React, { useCallback, useRef, useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Dimensions,
  ActivityIndicator,
  Text,
  Pressable,
  StatusBar,
  type ViewStyle,
  type TextStyle,
  type ViewToken,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInRight,
  SlideInUp,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { FeedProvider, useFeed } from '@/src/lib/feed-context';
import { useTypography } from '@/src/lib/typography-context';
import {
  FeedCard,
  VideoChunkCard,
  VideoQuestionCard,
  TextChunkCard,
  QuizCard,
  FactCard,
  SynthesisCard,
  FeedProgressBar,
  SessionBreakModal,
  SessionCompleteCard,
  SandboxPreviewCard,
} from '@/src/components/feed';
import { SandboxModal } from '@/src/components/sandbox';
import { XPDisplay } from '@/src/components/engagement/XPDisplay';
import { XPPopup } from '@/src/components/engagement/XPPopup';
import { ConfettiAnimation } from '@/src/components/engagement/ConfettiAnimation';
import { spacing } from '@/src/theme';
import { type ColorTheme } from '@/src/theme/colors';
import type { FeedItem } from '@/src/types/engagement';

/**
 * Screen dimensions for snap scrolling
 */
const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * Feed Screen Component
 *
 * Entry point that wraps content in FeedProvider
 */
export default function FeedScreen(): React.ReactElement {
  const { sourceId } = useLocalSearchParams<{ sourceId: string }>();

  // Get dynamic colors from typography context
  const { getColors, isDarkMode } = useTypography();
  const colors = getColors();
  const styles = useMemo(() => createStyles(colors, isDarkMode), [colors, isDarkMode]);

  if (!sourceId) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>No source selected</Text>
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <FeedProvider sourceId={sourceId}>
      <FeedContent />
    </FeedProvider>
  );
}

/**
 * FeedContent Component - Luminous Focus Design
 *
 * Main feed content with premium immersive UI:
 * - Full-screen cards with no distractions
 * - XP display with animated counter
 * - Progress bar showing session progress
 * - Close button to exit
 * - Glowing feedback on quiz answers
 */
function FeedContent(): React.ReactElement {
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList<FeedItem>>(null);

  // Get dynamic colors from typography context
  const { getColors, isDarkMode } = useTypography();
  const colors = getColors();
  const styles = useMemo(() => createStyles(colors, isDarkMode), [colors, isDarkMode]);

  const {
    feedItems,
    currentIndex,
    isLoading,
    error,
    goToNext,
    goToPrevious,
    jumpToIndex,
    markAsKnown,
    addToReviewQueue,
    submitQuizAnswer,
    completeSynthesis,
    sessionComplete,
    masterySummary,
    sessionStats,
    showBreakModal,
    dismissBreakModal,
    takeBreak,
    streak,
    userXP,
    completionPercentage,
    sourceUrl,
    // Sandbox state
    sandboxModalVisible,
    currentSandboxItem,
    startSandboxInteraction,
    completeSandboxInteraction,
    closeSandboxModal,           // NEW: Triggers exit animation
    handleSandboxModalHidden,    // NEW: Called after exit animation completes
  } = useFeed();

  // XP popup state
  const [showXPPopup, setShowXPPopup] = useState(false);
  const [xpAmount, setXpAmount] = useState(0);
  const [xpReason, setXpReason] = useState<string | undefined>();

  // Level up state
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [newLevel, setNewLevel] = useState(1);

  // Confetti state
  const [showConfetti, setShowConfetti] = useState(false);

  // XP animation value
  const xpScale = useSharedValue(1);

  // Animated XP style
  const animatedXPStyle = useAnimatedStyle(() => ({
    transform: [{ scale: xpScale.value }],
  }));

  /**
   * Handle viewable items change for tracking current card
   */
  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index !== null) {
        jumpToIndex(viewableItems[0].index);
      }
    },
    [jumpToIndex]
  );

  /**
   * Viewability config for accurate tracking
   */
  const viewabilityConfig = {
    itemVisiblePercentThreshold: 50,
  };

  /**
   * Handle swipe left (I know this)
   */
  const handleSwipeLeft = useCallback(
    async (item: FeedItem) => {
      await markAsKnown(item.id);
    },
    [markAsKnown]
  );

  /**
   * Handle swipe right (review later)
   */
  const handleSwipeRight = useCallback(
    async (item: FeedItem) => {
      if ('conceptId' in item) {
        await addToReviewQueue(item.conceptId);
      }
    },
    [addToReviewQueue]
  );

  /**
   * Handle quiz correct answer with XP animation
   */
  const handleQuizCorrect = useCallback((xp: number) => {
    setXpAmount(xp);
    setXpReason('Correct answer!');
    setShowXPPopup(true);

    // Trigger XP bounce animation
    xpScale.value = withSequence(
      withSpring(1.3, { damping: 10, stiffness: 400 }),
      withSpring(1, { damping: 15, stiffness: 200 })
    );
  }, [xpScale]);

  /**
   * Handle quiz submission
   */
  const handleQuizComplete = useCallback(
    async (itemId: string, answer: string) => {
      const result = await submitQuizAnswer(itemId, answer);
      if (result.isCorrect) {
        handleQuizCorrect(result.xpAwarded);
        if (result.levelUp) {
          setNewLevel(result.newLevel);
          setShowLevelUp(true);
          setShowConfetti(true);
        }
      }
    },
    [submitQuizAnswer, handleQuizCorrect]
  );

  /**
   * Handle synthesis completion
   */
  const handleSynthesisComplete = useCallback(
    async (itemId: string, response: string) => {
      await completeSynthesis(itemId, response);
      setXpAmount(75);
      setXpReason('Synthesis complete!');
      setShowXPPopup(true);
      setShowConfetti(true);
    },
    [completeSynthesis]
  );

  /**
   * Handle starting a sandbox interaction
   */
  const handleStartSandbox = useCallback(
    (itemId: string) => {
      console.log('[Feed] Starting sandbox interaction:', itemId);
      startSandboxInteraction(itemId);
    },
    [startSandboxInteraction]
  );

  /**
   * Handle sandbox modal close
   */
  const handleCloseSandbox = useCallback(() => {
    console.log('[Feed] Closing sandbox modal');
    // If there's a current sandbox item with ready interaction, complete it with a default result
    if (currentSandboxItem && currentSandboxItem.status === 'ready' && currentSandboxItem.interaction) {
      completeSandboxInteraction(currentSandboxItem.id, {
        interactionId: currentSandboxItem.interaction.interactionId,
        conceptId: currentSandboxItem.conceptId,
        passed: false,
        score: 0,
        timeToCompleteMs: 0,
        hintsUsed: 0,
        attemptCount: 0,
        feedback: 'Interaction was cancelled.',
      });
    }
  }, [currentSandboxItem, completeSandboxInteraction]);

  /**
   * Handle XP popup complete
   */
  const handleXPPopupComplete = useCallback(() => {
    setShowXPPopup(false);
    setXpAmount(0);
    setXpReason(undefined);
  }, []);

  /**
   * Handle back navigation
   */
  const handleBack = useCallback(() => {
    router.back();
  }, []);

  /**
   * Render individual feed card
   */
  const renderFeedCard = useCallback(
    ({ item, index }: { item: FeedItem; index: number }) => {
      const isActive = index === currentIndex;

      return (
        <View style={[styles.cardContainer, { height: SCREEN_HEIGHT - insets.top - insets.bottom }]}>
          <FeedCard
            onSwipeLeft={() => handleSwipeLeft(item)}
            onSwipeRight={() => handleSwipeRight(item)}
            gesturesEnabled={isActive}
            testID={`feed-card-${index}`}
          >
            {item.type === 'video_chunk' && item.question ? (
              <VideoQuestionCard
                videoUrl={sourceUrl || ''}
                startSec={item.startSec}
                endSec={item.endSec}
                title={item.title}
                question={item.question}
                conceptId={item.conceptId}
                isActive={isActive}
                onComplete={(correct) => {
                  if (correct) {
                    handleQuizCorrect(10);
                  }
                }}
                onSwipeUp={() => goToNext()}
                testID={`video-question-card-${index}`}
              />
            ) : item.type === 'video_chunk' ? (
              <VideoChunkCard
                videoUrl={sourceUrl || ''}
                startSec={item.startSec}
                endSec={item.endSec}
                title={item.title}
                openLoopTeaser={item.openLoopTeaser}
                isActive={isActive}
                onChapterComplete={() => markAsKnown(item.id)}
                testID={`video-card-${index}`}
              />
            ) : null}

            {item.type === 'text_chunk' && (
              <TextChunkCard
                text={item.text}
                propositions={item.propositions}
                chunkIndex={item.chunkIndex}
                totalChunks={item.totalChunks}
                onComplete={() => markAsKnown(item.id)}
                testID={`text-card-${index}`}
              />
            )}

            {item.type === 'quiz' && (
              <QuizCard
                question={item.question}
                conceptId={item.conceptId}
                onCorrectAnswer={handleQuizCorrect}
                onIncorrectAnswer={() => {}}
                onComplete={() => goToNext()}
                isActive={isActive}
                testID={`quiz-card-${index}`}
              />
            )}

            {item.type === 'fact' && (
              <FactCard
                conceptId={item.conceptId}
                factText={item.factText}
                whyItMatters={item.whyItMatters}
                testID={`fact-card-${index}`}
              />
            )}

            {item.type === 'synthesis' && (
              <SynthesisCard
                conceptsToConnect={item.conceptsToConnect}
                synthesisPrompt={item.synthesisPrompt}
                chaptersCompleted={item.chaptersCompleted}
                totalChapters={item.totalChapters}
                onComplete={(response) => handleSynthesisComplete(item.id, response)}
                testID={`synthesis-card-${index}`}
              />
            )}

            {item.type === 'sandbox' && (
              <SandboxPreviewCard
                item={item}
                onStart={() => handleStartSandbox(item.id)}
                testID={`sandbox-preview-${index}`}
              />
            )}
          </FeedCard>
        </View>
      );
    },
    [
      currentIndex,
      insets,
      handleSwipeLeft,
      handleSwipeRight,
      handleQuizCorrect,
      handleSynthesisComplete,
      handleStartSandbox,
      goToNext,
      markAsKnown,
      sourceUrl,
    ]
  );

  // Loading state
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading your learning feed...</Text>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Oops!</Text>
        <Text style={styles.errorText}>{error.message}</Text>
        <Pressable
          style={styles.backButton}
          onPress={handleBack}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  // Empty state
  if (feedItems.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>No Content Yet</Text>
        <Text style={styles.emptyText}>
          This source doesn't have any learning content yet.
          Make sure analysis is complete.
        </Text>
        <Pressable
          style={styles.backButton}
          onPress={handleBack}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  // Get current concept name for header
  const currentItem = feedItems[currentIndex];
  const currentConceptName = currentItem && 'title' in currentItem
    ? currentItem.title
    : currentItem && 'conceptId' in currentItem
      ? 'Concept'
      : '';

  // Show session complete card when session is done
  if (sessionComplete && masterySummary) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <ConfettiAnimation
          visible={true}
          duration={4000}
          onComplete={() => {}}
        />
        <SessionCompleteCard
          masterySummary={masterySummary}
          xpEarned={sessionStats.xpEarned}
          streak={streak?.currentStreak}
          onEndSession={handleBack}
          onContinue={() => {
            // Reset for continuing - implementation depends on requirements
            goToNext();
          }}
          testID="session-complete"
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Luminous Focus Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing[2] }]}>
        {/* Close button (X) */}
        <Pressable
          style={styles.closeButton}
          onPress={handleBack}
          accessibilityRole="button"
          accessibilityLabel="Close feed and return to project"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.closeIcon}>&#10005;</Text>
        </Pressable>

        {/* Center: Progress and current concept */}
        <View style={styles.headerCenter}>
          {/* Current concept title */}
          {currentConceptName && (
            <Text style={styles.conceptTitle} numberOfLines={1}>
              {currentConceptName}
            </Text>
          )}
          {/* Progress bar */}
          <View style={styles.progressContainer}>
            <FeedProgressBar
              currentIndex={currentIndex}
              totalItems={feedItems.length}
              showLabel={false}
              height={4}
              fillColor={colors.primary}
              backgroundColor="rgba(255, 255, 255, 0.2)"
              testID="feed-progress"
            />
            {/* Progress label */}
            <Text style={styles.progressLabel}>
              {currentIndex + 1} / {feedItems.length}
            </Text>
          </View>
        </View>

        {/* XP Display with animation */}
        <Animated.View style={[styles.xpContainer, animatedXPStyle]}>
          <XPDisplay
            xp={userXP?.totalXp || 0}
            size="small"
            showIcon={true}
            animated={true}
            testID="header-xp"
          />
        </Animated.View>
      </View>

      {/* Feed list */}
      <FlatList
        ref={flatListRef}
        data={feedItems}
        renderItem={renderFeedCard}
        keyExtractor={(item) => item.id}
        pagingEnabled
        snapToInterval={SCREEN_HEIGHT - insets.top - insets.bottom}
        snapToAlignment="start"
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        initialScrollIndex={currentIndex}
        getItemLayout={(_, index) => ({
          length: SCREEN_HEIGHT - insets.top - insets.bottom,
          offset: (SCREEN_HEIGHT - insets.top - insets.bottom) * index,
          index,
        })}
        testID="feed-list"
      />

      {/* XP Popup */}
      <XPPopup
        amount={xpAmount}
        visible={showXPPopup}
        onComplete={handleXPPopupComplete}
        reason={xpReason}
        position="bottom"
        testID="xp-popup"
      />

      {/* Level up celebration */}
      {showLevelUp && (
        <Animated.View
          entering={SlideInRight}
          exiting={FadeOut}
          style={styles.levelUpContainer}
        >
          <Text style={styles.levelUpText}>Level Up!</Text>
          <Text style={styles.levelUpLevel}>Level {newLevel}</Text>
        </Animated.View>
      )}

      {/* Confetti animation */}
      <ConfettiAnimation
        visible={showConfetti}
        duration={3000}
        onComplete={() => {
          setShowConfetti(false);
          setShowLevelUp(false);
        }}
      />

      {/* Session break modal */}
      <SessionBreakModal
        visible={showBreakModal}
        sessionStats={sessionStats}
        onContinue={dismissBreakModal}
        onTakeBreak={takeBreak}
        testID="break-modal"
      />

      {/* Sandbox modal - only render if interaction is ready */}
      {currentSandboxItem && currentSandboxItem.status === 'ready' && currentSandboxItem.interaction && (
        <SandboxModal
          visible={sandboxModalVisible}
          interaction={currentSandboxItem.interaction}
          onClose={handleCloseSandbox}
          onHidden={handleSandboxModalHidden}  // NEW: Called after exit animation completes
          onSubmit={(result) => {
            console.log('[Feed] Sandbox submitted:', result);
            // Create full evaluation result with required fields and feedback
            const fullResult = {
              ...result,
              feedback: result.passed ? 'Great job!' : 'Keep practicing!',
            };
            completeSandboxInteraction(currentSandboxItem.id, fullResult);
            if (result.passed) {
              handleQuizCorrect(25);
            }
          }}
          testID="sandbox-modal"
        />
      )}
    </View>
  );
}

/**
 * Create dynamic styles based on theme colors
 * Implements "Luminous Focus" design direction:
 * - Deep black backgrounds
 * - Premium luminous highlights
 * - Full-screen immersive experience
 */
function createStyles(colors: ColorTheme, isDarkMode: boolean) {
  // Get luminous accent colors
  const glowPrimary = (colors as any).glowPrimary || 'rgba(99, 102, 241, 0.5)';
  const xpGlow = (colors as any).glowXp || 'rgba(251, 191, 36, 0.4)';

  return StyleSheet.create({
    // Main container - deep black for immersive experience
    container: {
      flex: 1,
      backgroundColor: isDarkMode ? '#09090b' : colors.background, // zinc-950 for deep black
    } as ViewStyle,

    // Loading state
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: isDarkMode ? '#09090b' : colors.background,
      padding: spacing[6],
    } as ViewStyle,
    loadingText: {
      marginTop: spacing[4],
      fontSize: 16,
      color: colors.textSecondary,
    } as TextStyle,

    // Error state
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: isDarkMode ? '#09090b' : colors.background,
      padding: spacing[6],
    } as ViewStyle,
    errorTitle: {
      fontSize: 24,
      fontWeight: '700',
      color: colors.text,
      marginBottom: spacing[2],
    } as TextStyle,
    errorText: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: spacing[6],
    } as TextStyle,

    // Empty state
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: isDarkMode ? '#09090b' : colors.background,
      padding: spacing[6],
    } as ViewStyle,
    emptyTitle: {
      fontSize: 24,
      fontWeight: '700',
      color: colors.text,
      marginBottom: spacing[2],
    } as TextStyle,
    emptyText: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: spacing[6],
    } as TextStyle,

    // Back/action button
    backButton: {
      backgroundColor: colors.primary,
      paddingVertical: spacing[3],
      paddingHorizontal: spacing[6],
      borderRadius: 12,
      // Glow effect
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.5,
      shadowRadius: 12,
      elevation: 6,
    } as ViewStyle,
    backButtonText: {
      color: colors.white,
      fontSize: 16,
      fontWeight: '600',
    } as TextStyle,

    // Header - Luminous Focus Design
    header: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 100,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing[4],
      paddingBottom: spacing[3],
      // Gradient fade from top
      backgroundColor: 'rgba(0, 0, 0, 0.4)',
    } as ViewStyle,

    // Close button (X)
    closeButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: 'rgba(255, 255, 255, 0.15)',
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.1)',
    } as ViewStyle,
    closeIcon: {
      fontSize: 16,
      color: colors.white,
      fontWeight: '400',
    } as TextStyle,

    // Header center section
    headerCenter: {
      flex: 1,
      marginHorizontal: spacing[3],
    } as ViewStyle,
    conceptTitle: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.white,
      opacity: 0.9,
      marginBottom: spacing[1],
      textAlign: 'center',
    } as TextStyle,
    progressContainer: {
      alignItems: 'center',
    } as ViewStyle,
    progressLabel: {
      fontSize: 11,
      fontWeight: '500',
      color: 'rgba(255, 255, 255, 0.6)',
      marginTop: spacing[1],
    } as TextStyle,

    // XP container
    xpContainer: {
      marginLeft: spacing[2],
    } as ViewStyle,

    // Card container
    cardContainer: {
      width: SCREEN_WIDTH,
      overflow: 'hidden',
    } as ViewStyle,

    // Level up celebration
    levelUpContainer: {
      position: 'absolute',
      top: '35%',
      left: 0,
      right: 0,
      alignItems: 'center',
      zIndex: 1000,
    } as ViewStyle,
    levelUpText: {
      fontSize: 28,
      fontWeight: '800',
      color: colors.xpGold,
      textShadowColor: xpGlow,
      textShadowOffset: { width: 0, height: 0 },
      textShadowRadius: 20,
      marginBottom: spacing[2],
    } as TextStyle,
    levelUpLevel: {
      fontSize: 56,
      fontWeight: '900',
      color: colors.white,
      textShadowColor: glowPrimary,
      textShadowOffset: { width: 0, height: 0 },
      textShadowRadius: 30,
    } as TextStyle,

    // XP reward animation
    xpRewardContainer: {
      position: 'absolute',
      bottom: '25%',
      left: 0,
      right: 0,
      alignItems: 'center',
      zIndex: 999,
    } as ViewStyle,
    xpRewardText: {
      fontSize: 48,
      fontWeight: '900',
      color: colors.xpGold,
      textShadowColor: xpGlow,
      textShadowOffset: { width: 0, height: 0 },
      textShadowRadius: 24,
    } as TextStyle,
    xpRewardLabel: {
      fontSize: 18,
      fontWeight: '600',
      color: 'rgba(255, 255, 255, 0.8)',
      marginTop: spacing[1],
    } as TextStyle,
  });
}
