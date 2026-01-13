/**
 * VideoChunkCard Component - Luminous Focus Design
 *
 * Displays a video segment for a specific chapter/concept in the learning feed.
 * Implements "Luminous Focus" design direction:
 * - Full-screen video player with play button overlay
 * - Caption text below video
 * - Open-loop teaser in indigo color to drive curiosity
 * - Continue button to advance
 *
 * @example
 * ```tsx
 * <VideoChunkCard
 *   videoUrl="https://example.com/video.mp4"
 *   startSec={30}
 *   endSec={60}
 *   title="Introduction to Variables"
 *   openLoopTeaser="What makes variables so powerful?"
 *   onChapterComplete={() => awardXP()}
 *   isActive={true}
 * />
 * ```
 */

import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  Dimensions,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { Video, ResizeMode, type AVPlaybackStatus } from 'expo-av';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  FadeIn,
  FadeOut,
  SlideInUp,
} from 'react-native-reanimated';
import { spacing } from '@/src/theme';
import { type ColorTheme } from '@/src/theme/colors';
import { useTypography } from '@/src/lib/typography-context';
import type { VideoChunkItem } from '@/src/types/engagement';
import { isYouTubeUrl } from '@/src/lib/youtube-url-utils';
import { YouTubeSegmentPlayer } from '@/src/components/video';

/**
 * Word data for caption synchronization
 */
export interface CaptionWord {
  text: string;
  startMs: number;
  endMs: number;
}

/**
 * Props for the VideoChunkCard component
 */
export interface VideoChunkCardProps {
  /** URL of the video source */
  videoUrl: string;
  /** Start time in seconds for this chapter */
  startSec: number;
  /** End time in seconds for this chapter */
  endSec: number;
  /** Chapter/concept title */
  title: string;
  /** Optional open loop teaser question */
  openLoopTeaser?: string;
  /** Whether this card is currently active in the feed */
  isActive?: boolean;
  /** Called when chapter playback completes */
  onChapterComplete?: () => void;
  /** Called with current playback position (for caption sync) */
  onPositionUpdate?: (positionMs: number) => void;
  /** Called when video is paused/resumed */
  onPlaybackStateChange?: (isPlaying: boolean) => void;
  /** Caption words with timestamps (optional) */
  captionWords?: CaptionWord[];
  /** Test ID for testing purposes */
  testID?: string;
}

/**
 * Playback state for the video
 */
interface PlaybackState {
  isPlaying: boolean;
  positionMs: number;
  durationMs: number;
  isLoaded: boolean;
  hasEnded: boolean;
}

// Note: We no longer use fixed screen dimensions here.
// The parent container controls sizing, enabling responsive desktop layouts.

/**
 * VideoChunkCard Component - Luminous Focus Design
 *
 * Plays a specific segment of video content for learning.
 * Auto-plays when active and stops at the chapter end time.
 * Features:
 * - Play button overlay
 * - Indigo open-loop teaser
 * - Continue button after video ends
 */
export function VideoChunkCard({
  videoUrl,
  startSec,
  endSec,
  title,
  openLoopTeaser,
  isActive = false,
  onChapterComplete,
  onPositionUpdate,
  onPlaybackStateChange,
  captionWords,
  testID = 'video-chunk-card',
}: VideoChunkCardProps): React.ReactElement {
  // Get dynamic colors from typography context
  const { getColors, isDarkMode } = useTypography();
  const colors = getColors();
  const styles = useMemo(() => createStyles(colors, isDarkMode), [colors, isDarkMode]);

  const videoRef = useRef<Video>(null);
  const [playbackState, setPlaybackState] = useState<PlaybackState>({
    isPlaying: false,
    positionMs: startSec * 1000,
    durationMs: 0,
    isLoaded: false,
    hasEnded: false,
  });
  const [isPaused, setIsPaused] = useState(false);
  const hasCompletedRef = useRef(false);

  // Animation values
  const playButtonScale = useSharedValue(1);
  const continueButtonOpacity = useSharedValue(0);

  // Animated play button style
  const animatedPlayButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: playButtonScale.value }],
  }));

  // Animated continue button style
  const animatedContinueStyle = useAnimatedStyle(() => ({
    opacity: continueButtonOpacity.value,
  }));

  /**
   * Handle playback status updates
   */
  const handlePlaybackStatusUpdate = useCallback(
    (status: AVPlaybackStatus) => {
      if (!status.isLoaded) {
        return;
      }

      const positionMs = status.positionMillis ?? 0;
      const endMs = endSec * 1000;

      setPlaybackState({
        isPlaying: status.isPlaying ?? false,
        positionMs,
        durationMs: status.durationMillis ?? 0,
        isLoaded: true,
        hasEnded: positionMs >= endMs,
      });

      // Report position for caption sync
      onPositionUpdate?.(positionMs);

      // Check if chapter has ended
      if (positionMs >= endMs && !hasCompletedRef.current) {
        hasCompletedRef.current = true;
        videoRef.current?.pauseAsync();
        onChapterComplete?.();
      }
    },
    [endSec, onPositionUpdate, onChapterComplete]
  );

  /**
   * Toggle play/pause
   */
  const togglePlayPause = useCallback(async () => {
    if (!videoRef.current || !playbackState.isLoaded) return;

    try {
      if (playbackState.isPlaying) {
        await videoRef.current.pauseAsync();
        setIsPaused(true);
        onPlaybackStateChange?.(false);
      } else {
        // If chapter has ended, restart from beginning
        if (playbackState.hasEnded) {
          hasCompletedRef.current = false;
          await videoRef.current.setPositionAsync(startSec * 1000);
        }
        await videoRef.current.playAsync();
        setIsPaused(false);
        onPlaybackStateChange?.(true);
      }
    } catch (error) {
      console.error('Error toggling playback:', error);
    }
  }, [playbackState, startSec, onPlaybackStateChange]);

  /**
   * Seek to position within chapter bounds
   */
  const seekToPosition = useCallback(
    async (positionMs: number) => {
      if (!videoRef.current) return;

      const clampedPosition = Math.max(
        startSec * 1000,
        Math.min(positionMs, endSec * 1000)
      );

      try {
        await videoRef.current.setPositionAsync(clampedPosition);
      } catch (error) {
        console.error('Error seeking:', error);
      }
    },
    [startSec, endSec]
  );

  /**
   * Effect to handle active state changes
   */
  useEffect(() => {
    if (isActive && videoRef.current && playbackState.isLoaded && !isPaused) {
      videoRef.current.playAsync();
    } else if (!isActive && videoRef.current) {
      videoRef.current.pauseAsync();
    }
  }, [isActive, playbackState.isLoaded, isPaused]);

  /**
   * Effect to set initial position when video loads
   */
  useEffect(() => {
    if (playbackState.isLoaded && videoRef.current) {
      videoRef.current.setPositionAsync(startSec * 1000);
    }
  }, [playbackState.isLoaded, startSec]);

  /**
   * Calculate progress percentage within chapter
   */
  const chapterDurationMs = (endSec - startSec) * 1000;
  const chapterPositionMs = playbackState.positionMs - startSec * 1000;
  const progressPercent = Math.max(
    0,
    Math.min(100, (chapterPositionMs / chapterDurationMs) * 100)
  );

  /**
   * Find current caption word based on position
   */
  const currentWordIndex =
    captionWords?.findIndex(
      (word) =>
        playbackState.positionMs >= word.startMs &&
        playbackState.positionMs < word.endMs
    ) ?? -1;

  // Show continue button when chapter ends
  useEffect(() => {
    if (playbackState.hasEnded) {
      continueButtonOpacity.value = withTiming(1, { duration: 300 });
    } else {
      continueButtonOpacity.value = withTiming(0, { duration: 200 });
    }
  }, [playbackState.hasEnded, continueButtonOpacity]);

  // Handle continue button press
  const handleContinue = useCallback(() => {
    onChapterComplete?.();
  }, [onChapterComplete]);

  return (
    <View testID={testID} style={styles.container}>
      {/* Video player area */}
      <Pressable
        style={styles.videoArea}
        onPress={togglePlayPause}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={`Video: ${title}. ${playbackState.isPlaying ? 'Playing' : 'Paused'}. Tap to ${playbackState.isPlaying ? 'pause' : 'play'}`}
      >
        {/* Video player - Use YouTube iframe for YouTube URLs, expo-av for others */}
        {isYouTubeUrl(videoUrl) ? (
          <YouTubeSegmentPlayer
            videoUrl={videoUrl}
            startSec={startSec}
            endSec={endSec}
            isActive={isActive && !isPaused}
            onSegmentComplete={onChapterComplete}
            testID={`${testID}-youtube`}
          />
        ) : (
          <Video
            ref={videoRef}
            source={{ uri: videoUrl }}
            style={styles.video}
            resizeMode={ResizeMode.COVER}
            shouldPlay={isActive && !isPaused}
            isLooping={false}
            isMuted={false}
            onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
            positionMillis={startSec * 1000}
            testID={`${testID}-video`}
          />
        )}

        {/* Play/Pause indicator - premium play button */}
        {!playbackState.isPlaying && playbackState.isLoaded && !playbackState.hasEnded && (
          <Animated.View
            style={[styles.playIndicator, animatedPlayButtonStyle]}
            testID={`${testID}-play-indicator`}
          >
            <View style={styles.playButton}>
              <Text style={styles.playIcon}>&#9658;</Text>
            </View>
          </Animated.View>
        )}

        {/* Progress bar at bottom of video */}
        <View style={styles.progressContainer}>
          <View
            style={[styles.progressBar, { width: `${progressPercent}%` }]}
            testID={`${testID}-progress`}
          />
        </View>
      </Pressable>

      {/* Content overlay - below video */}
      <View style={styles.contentOverlay}>
        {/* Chapter title */}
        <Animated.Text
          entering={FadeIn.delay(100)}
          style={styles.title}
          testID={`${testID}-title`}
          numberOfLines={2}
        >
          {title}
        </Animated.Text>

        {/* Caption area */}
        {captionWords && captionWords.length > 0 && (
          <View style={styles.captionContainer} testID={`${testID}-captions`}>
            <Text style={styles.captionText}>
              {captionWords.map((word, index) => (
                <Text
                  key={`${word.startMs}-${index}`}
                  style={[
                    styles.captionWord,
                    index === currentWordIndex && styles.captionWordActive,
                  ]}
                >
                  {word.text}{' '}
                </Text>
              ))}
            </Text>
          </View>
        )}

        {/* Open-loop teaser in indigo */}
        {openLoopTeaser && (
          <Animated.View
            entering={SlideInUp.delay(200)}
            style={styles.teaserContainer}
          >
            <Text style={styles.teaserIcon}>{'\u2728'}</Text>
            <Text
              style={styles.teaser}
              testID={`${testID}-teaser`}
              numberOfLines={2}
            >
              {openLoopTeaser}
            </Text>
          </Animated.View>
        )}

        {/* Time indicator */}
        <View style={styles.timeContainer}>
          <Text style={styles.timeText}>
            {formatTime(chapterPositionMs / 1000)} / {formatTime(chapterDurationMs / 1000)}
          </Text>
        </View>

        {/* Continue button - appears when video ends */}
        {playbackState.hasEnded && (
          <Animated.View
            entering={SlideInUp.springify()}
            style={styles.continueContainer}
          >
            <Pressable
              style={styles.continueButton}
              onPress={handleContinue}
              accessibilityRole="button"
              accessibilityLabel="Continue to next section"
              testID={`${testID}-continue`}
            >
              <Text style={styles.continueText}>Continue</Text>
              <Text style={styles.continueArrow}>{'\u2192'}</Text>
            </Pressable>
          </Animated.View>
        )}
      </View>
    </View>
  );
}

/**
 * Format seconds to MM:SS
 */
function formatTime(seconds: number): string {
  const mins = Math.floor(Math.max(0, seconds) / 60);
  const secs = Math.floor(Math.max(0, seconds) % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Create VideoChunkCard props from a VideoChunkItem
 */
export function createVideoChunkCardProps(
  item: VideoChunkItem,
  videoUrl: string
): Omit<VideoChunkCardProps, 'isActive' | 'onChapterComplete'> {
  return {
    videoUrl,
    startSec: item.startSec,
    endSec: item.endSec,
    title: item.title,
    openLoopTeaser: item.openLoopTeaser,
  };
}

/**
 * Create dynamic styles based on theme colors
 * Implements "Luminous Focus" design:
 * - Deep black backgrounds
 * - Indigo open-loop teasers
 * - Premium play button
 * - Continue button with glow
 */
function createStyles(colors: ColorTheme, isDarkMode: boolean) {
  // Indigo color for open-loop teasers
  const indigoColor = '#6366f1'; // Tailwind indigo-500
  const indigoGlow = 'rgba(99, 102, 241, 0.4)';

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDarkMode ? '#09090b' : colors.background, // zinc-950
      // Removed hardcoded width/height to support responsive desktop layouts
      // Parent container controls sizing
    } as ViewStyle,

    // Video area - takes 60% of screen
    videoArea: {
      flex: 0.6,
      backgroundColor: '#000',
      position: 'relative',
    } as ViewStyle,
    video: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    } as ViewStyle,

    // Content overlay - below video
    contentOverlay: {
      flex: 0.4,
      paddingHorizontal: spacing[5],
      paddingTop: spacing[4],
      paddingBottom: spacing[6],
      justifyContent: 'space-between',
    } as ViewStyle,

    // Title
    title: {
      fontSize: 22,
      fontWeight: '700',
      color: colors.text,
      marginBottom: spacing[3],
      lineHeight: 28,
    } as TextStyle,

    // Caption
    captionContainer: {
      backgroundColor: isDarkMode ? 'rgba(39, 39, 42, 0.8)' : 'rgba(0, 0, 0, 0.05)',
      borderRadius: 12,
      paddingHorizontal: spacing[4],
      paddingVertical: spacing[3],
      marginBottom: spacing[3],
    } as ViewStyle,
    captionText: {
      fontSize: 15,
      lineHeight: 22,
      color: colors.text,
      textAlign: 'left',
    } as TextStyle,
    captionWord: {
      color: colors.text,
    } as TextStyle,
    captionWordActive: {
      color: colors.primary,
      fontWeight: '700',
    } as TextStyle,

    // Open-loop teaser - INDIGO COLOR
    teaserContainer: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: isDarkMode ? 'rgba(99, 102, 241, 0.15)' : 'rgba(99, 102, 241, 0.1)',
      borderRadius: 12,
      paddingHorizontal: spacing[4],
      paddingVertical: spacing[3],
      borderWidth: 1,
      borderColor: isDarkMode ? 'rgba(99, 102, 241, 0.3)' : 'rgba(99, 102, 241, 0.2)',
      marginBottom: spacing[3],
    } as ViewStyle,
    teaserIcon: {
      fontSize: 16,
      marginRight: spacing[2],
      marginTop: 2,
    } as TextStyle,
    teaser: {
      flex: 1,
      fontSize: 15,
      fontWeight: '500',
      color: indigoColor,
      fontStyle: 'italic',
      lineHeight: 22,
    } as TextStyle,

    // Play button - premium glassmorphism
    playIndicator: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.4)',
    } as ViewStyle,
    playButton: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      justifyContent: 'center',
      alignItems: 'center',
      // Glow effect
      shadowColor: '#fff',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.5,
      shadowRadius: 20,
      elevation: 10,
    } as ViewStyle,
    playIcon: {
      fontSize: 36,
      color: '#09090b',
      marginLeft: 6, // Optical alignment for play icon
    } as TextStyle,

    // Progress bar
    progressContainer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: 4,
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
    } as ViewStyle,
    progressBar: {
      height: '100%',
      backgroundColor: colors.primary,
      // Glow effect
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.8,
      shadowRadius: 4,
    } as ViewStyle,

    // Time indicator
    timeContainer: {
      alignSelf: 'flex-start',
    } as ViewStyle,
    timeText: {
      fontSize: 13,
      fontWeight: '500',
      color: colors.textSecondary,
    } as TextStyle,

    // Continue button
    continueContainer: {
      marginTop: spacing[4],
    } as ViewStyle,
    continueButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
      paddingVertical: spacing[4],
      paddingHorizontal: spacing[6],
      borderRadius: 14,
      // Glow effect
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.5,
      shadowRadius: 12,
      elevation: 8,
    } as ViewStyle,
    continueText: {
      fontSize: 17,
      fontWeight: '700',
      color: colors.white,
      marginRight: spacing[2],
    } as TextStyle,
    continueArrow: {
      fontSize: 18,
      color: colors.white,
    } as TextStyle,
  });
}

export default VideoChunkCard;
