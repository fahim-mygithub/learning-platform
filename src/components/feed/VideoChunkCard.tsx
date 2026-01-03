/**
 * VideoChunkCard Component
 *
 * Displays a video segment for a specific chapter/concept in the learning feed.
 * Handles video playback from start_sec to end_sec with caption overlay support.
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

import React, { useRef, useState, useEffect, useCallback } from 'react';
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
import { colors, spacing } from '@/src/theme';
import type { VideoChunkItem } from '@/src/types/engagement';

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

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * VideoChunkCard Component
 *
 * Plays a specific segment of video content for learning.
 * Auto-plays when active and stops at the chapter end time.
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

  return (
    <Pressable
      testID={testID}
      style={styles.container}
      onPress={togglePlayPause}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={`Video: ${title}. ${playbackState.isPlaying ? 'Playing' : 'Paused'}. Tap to ${playbackState.isPlaying ? 'pause' : 'play'}`}
    >
      {/* Video player */}
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

      {/* Gradient overlay for text readability */}
      <View style={styles.gradientOverlay} />

      {/* Chapter title and teaser */}
      <View style={styles.contentOverlay}>
        <View style={styles.headerContainer}>
          <Text
            style={styles.title}
            testID={`${testID}-title`}
            numberOfLines={2}
          >
            {title}
          </Text>
          {openLoopTeaser && (
            <Text
              style={styles.teaser}
              testID={`${testID}-teaser`}
              numberOfLines={2}
            >
              {openLoopTeaser}
            </Text>
          )}
        </View>

        {/* Caption overlay area */}
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
      </View>

      {/* Play/Pause indicator */}
      {!playbackState.isPlaying && playbackState.isLoaded && (
        <View style={styles.playIndicator} testID={`${testID}-play-indicator`}>
          <View style={styles.playButton}>
            <Text style={styles.playIcon}>&#9658;</Text>
          </View>
        </View>
      )}

      {/* Progress bar */}
      <View style={styles.progressContainer}>
        <View
          style={[styles.progressBar, { width: `${progressPercent}%` }]}
          testID={`${testID}-progress`}
        />
      </View>

      {/* Chapter time indicator */}
      <View style={styles.timeContainer}>
        <Text style={styles.timeText}>
          {formatTime(chapterPositionMs / 1000)} / {formatTime(chapterDurationMs / 1000)}
        </Text>
      </View>
    </Pressable>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  } as ViewStyle,
  video: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  } as ViewStyle,
  gradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '40%',
    backgroundColor: 'transparent',
    // Simulated gradient with multiple layers
    opacity: 0.8,
  } as ViewStyle,
  contentOverlay: {
    position: 'absolute',
    bottom: 80,
    left: 0,
    right: 0,
    paddingHorizontal: spacing[4],
  } as ViewStyle,
  headerContainer: {
    marginBottom: spacing[4],
  } as ViewStyle,
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.white,
    marginBottom: spacing[2],
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  } as TextStyle,
  teaser: {
    fontSize: 16,
    fontWeight: '400',
    color: colors.white,
    opacity: 0.9,
    fontStyle: 'italic',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  } as TextStyle,
  captionContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 8,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    marginBottom: spacing[3],
  } as ViewStyle,
  captionText: {
    fontSize: 16,
    lineHeight: 24,
    color: colors.white,
    textAlign: 'center',
  } as TextStyle,
  captionWord: {
    color: colors.white,
  } as TextStyle,
  captionWordActive: {
    color: colors.captionHighlight,
    fontWeight: '700',
  } as TextStyle,
  playIndicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  } as ViewStyle,
  playButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  } as ViewStyle,
  playIcon: {
    fontSize: 32,
    color: colors.black,
    marginLeft: 4, // Optical alignment for play icon
  } as TextStyle,
  progressContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  } as ViewStyle,
  progressBar: {
    height: '100%',
    backgroundColor: colors.primary,
  } as ViewStyle,
  timeContainer: {
    position: 'absolute',
    bottom: 12,
    right: spacing[4],
  } as ViewStyle,
  timeText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.white,
    opacity: 0.8,
  } as TextStyle,
});

export default VideoChunkCard;
