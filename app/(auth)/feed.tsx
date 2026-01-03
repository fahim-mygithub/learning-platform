/**
 * Feed Screen
 *
 * TikTok-style learning feed with full-screen swipeable cards.
 * Implements Phase 6 of Engagement Engineering:
 * - FlatList with snap scrolling
 * - Feed context for state management
 * - Streak and XP displays in header
 * - Session timer with break modal
 * - All card types (video, quiz, fact, synthesis)
 */

import React, { useCallback, useRef, useState } from 'react';
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
import Animated, { FadeIn, FadeOut, SlideInRight } from 'react-native-reanimated';

import { FeedProvider, useFeed } from '@/src/lib/feed-context';
import {
  FeedCard,
  VideoChunkCard,
  QuizCard,
  FactCard,
  SynthesisCard,
  FeedProgressBar,
  SessionBreakModal,
} from '@/src/components/feed';
import { CompactStreak, StreakDisplay } from '@/src/components/engagement/StreakDisplay';
import { XPPopup, XPToast } from '@/src/components/engagement/XPPopup';
import { ConfettiAnimation } from '@/src/components/engagement/ConfettiAnimation';
import { colors, spacing } from '@/src/theme';
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
 * FeedContent Component
 *
 * Main feed content that uses feed context
 */
function FeedContent(): React.ReactElement {
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList<FeedItem>>(null);

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
    sessionStats,
    showBreakModal,
    dismissBreakModal,
    takeBreak,
    streak,
    userXP,
    completionPercentage,
    sourceUrl,
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
   * Handle quiz correct answer
   */
  const handleQuizCorrect = useCallback((xp: number) => {
    setXpAmount(xp);
    setXpReason('Correct answer!');
    setShowXPPopup(true);
  }, []);

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
            {item.type === 'video_chunk' && (
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
      goToNext,
      markAsKnown,
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

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing[2] }]}>
        {/* Back button */}
        <Pressable
          style={styles.headerBackButton}
          onPress={handleBack}
          accessibilityRole="button"
          accessibilityLabel="Close feed"
        >
          <Text style={styles.headerBackIcon}>&#10005;</Text>
        </Pressable>

        {/* Progress bar */}
        <View style={styles.progressContainer}>
          <FeedProgressBar
            currentIndex={currentIndex}
            totalItems={feedItems.length}
            showLabel={false}
            testID="feed-progress"
          />
        </View>

        {/* Streak display */}
        <View style={styles.streakContainer}>
          <CompactStreak
            currentStreak={streak?.currentStreak || 0}
            isActive={true}
            testID="header-streak"
          />
        </View>
      </View>

      {/* XP display in corner */}
      <Animated.View
        entering={FadeIn}
        style={[styles.xpDisplay, { top: insets.top + spacing[12] }]}
      >
        <Text style={styles.xpIcon}>&#11088;</Text>
        <Text style={styles.xpValue}>{userXP?.totalXp || 0}</Text>
        <Text style={styles.xpLabel}>XP</Text>
      </Animated.View>

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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  } as ViewStyle,
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: spacing[6],
  } as ViewStyle,
  loadingText: {
    marginTop: spacing[4],
    fontSize: 16,
    color: colors.textSecondary,
  } as TextStyle,
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
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
  backButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[6],
    borderRadius: 12,
  } as ViewStyle,
  backButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  } as TextStyle,

  // Header styles
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[2],
  } as ViewStyle,
  headerBackButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  } as ViewStyle,
  headerBackIcon: {
    fontSize: 18,
    color: colors.white,
    fontWeight: '600',
  } as TextStyle,
  progressContainer: {
    flex: 1,
    marginHorizontal: spacing[3],
  } as ViewStyle,
  streakContainer: {
    marginLeft: spacing[2],
  } as ViewStyle,

  // XP display
  xpDisplay: {
    position: 'absolute',
    right: spacing[4],
    zIndex: 99,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: 16,
  } as ViewStyle,
  xpIcon: {
    fontSize: 14,
    marginRight: spacing[1],
  } as TextStyle,
  xpValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.xpGold,
  } as TextStyle,
  xpLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: colors.white,
    marginLeft: 2,
    opacity: 0.8,
  } as TextStyle,

  // Card container
  cardContainer: {
    width: SCREEN_WIDTH,
    overflow: 'hidden',
  } as ViewStyle,

  // Level up
  levelUpContainer: {
    position: 'absolute',
    top: '40%',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1000,
  } as ViewStyle,
  levelUpText: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.xpGold,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  } as TextStyle,
  levelUpLevel: {
    fontSize: 48,
    fontWeight: '900',
    color: colors.white,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  } as TextStyle,
});
