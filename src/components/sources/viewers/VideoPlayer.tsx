/**
 * VideoPlayer Component
 *
 * Native video player with learning-focused features.
 * Features:
 * - Play/pause controls
 * - Progress bar with seeking
 * - Playback speed control (0.5x - 2x)
 * - Fullscreen toggle
 * - Time display (current / duration)
 */

import React, { useState, useRef, useCallback } from 'react';
import { View, StyleSheet, Text, Pressable, Platform, GestureResponderEvent } from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';

import { colors } from '../../../theme';

/**
 * Props for the VideoPlayer component
 */
export interface VideoPlayerProps {
  /** URL of the video to play */
  url: string;
  /** Test ID for testing */
  testID?: string;
}

/**
 * Available playback speeds
 */
const PLAYBACK_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

/**
 * Format time in seconds to MM:SS or HH:MM:SS
 */
function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '0:00';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * VideoPlayer Component
 *
 * Renders video content with custom controls and playback speed.
 */
export function VideoPlayer({ url, testID = 'video-player' }: VideoPlayerProps): React.ReactElement {
  const videoRef = useRef<Video>(null);
  const [status, setStatus] = useState<AVPlaybackStatus | null>(null);
  const [showControls, setShowControls] = useState(true);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  // Extract status values
  const isLoaded = status?.isLoaded ?? false;
  const isPlaying = isLoaded && (status as { isPlaying: boolean }).isPlaying;
  const positionMillis = isLoaded ? (status as { positionMillis: number }).positionMillis : 0;
  const durationMillis = isLoaded ? (status as { durationMillis?: number }).durationMillis ?? 0 : 0;

  const currentTime = positionMillis / 1000;
  const duration = durationMillis / 1000;
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handlePlaybackStatusUpdate = useCallback((newStatus: AVPlaybackStatus) => {
    setStatus(newStatus);
  }, []);

  const togglePlayPause = async () => {
    if (!videoRef.current) return;

    if (isPlaying) {
      await videoRef.current.pauseAsync();
    } else {
      await videoRef.current.playAsync();
    }
  };

  const handleSeek = async (event: GestureResponderEvent) => {
    if (!videoRef.current || !duration) return;

    // Get the progress bar width - this is a simplified approach
    const progressBarWidth = 280; // Approximate width, could be improved
    const seekPosition = (event.nativeEvent.locationX / progressBarWidth) * duration * 1000;

    await videoRef.current.setPositionAsync(Math.max(0, Math.min(seekPosition, durationMillis)));
  };

  const changePlaybackSpeed = async (speed: number) => {
    if (!videoRef.current) return;

    await videoRef.current.setRateAsync(speed, true);
    setPlaybackSpeed(speed);
    setShowSpeedMenu(false);
  };

  const toggleControls = () => {
    setShowControls(!showControls);
    if (showSpeedMenu) setShowSpeedMenu(false);
  };

  // For web platform, use HTML5 video element
  if (Platform.OS === 'web') {
    return (
      <View testID={testID} style={styles.container}>
        <video
          src={url}
          controls
          style={{ width: '100%', height: '100%', backgroundColor: '#000' }}
        />
      </View>
    );
  }

  return (
    <View testID={testID} style={styles.container}>
      <Pressable style={styles.videoContainer} onPress={toggleControls}>
        <Video
          ref={videoRef}
          source={{ uri: url }}
          style={styles.video}
          resizeMode={ResizeMode.CONTAIN}
          shouldPlay={false}
          isLooping={false}
          onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
          rate={playbackSpeed}
        />

        {/* Controls Overlay */}
        {showControls && (
          <View style={styles.controlsOverlay}>
            {/* Center Play/Pause Button */}
            <Pressable
              testID={`${testID}-play-pause`}
              style={styles.centerButton}
              onPress={togglePlayPause}
            >
              <Text style={styles.centerButtonText}>{isPlaying ? '⏸' : '▶'}</Text>
            </Pressable>

            {/* Bottom Controls */}
            <View style={styles.bottomControls}>
              {/* Progress Bar */}
              <Pressable
                testID={`${testID}-progress-bar`}
                style={styles.progressBarContainer}
                onPress={handleSeek}
              >
                <View style={styles.progressBarBackground}>
                  <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
                </View>
              </Pressable>

              {/* Time and Speed Controls */}
              <View style={styles.controlsRow}>
                <Text style={styles.timeText}>
                  {formatTime(currentTime)} / {formatTime(duration)}
                </Text>

                {/* Playback Speed Button */}
                <Pressable
                  testID={`${testID}-speed-button`}
                  style={styles.speedButton}
                  onPress={() => setShowSpeedMenu(!showSpeedMenu)}
                >
                  <Text style={styles.speedButtonText}>{playbackSpeed}x</Text>
                </Pressable>
              </View>

              {/* Speed Menu */}
              {showSpeedMenu && (
                <View testID={`${testID}-speed-menu`} style={styles.speedMenu}>
                  {PLAYBACK_SPEEDS.map((speed) => (
                    <Pressable
                      key={speed}
                      style={[
                        styles.speedMenuItem,
                        playbackSpeed === speed && styles.speedMenuItemActive,
                      ]}
                      onPress={() => changePlaybackSpeed(speed)}
                    >
                      <Text
                        style={[
                          styles.speedMenuItemText,
                          playbackSpeed === speed && styles.speedMenuItemTextActive,
                        ]}
                      >
                        {speed}x
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          </View>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  videoContainer: {
    flex: 1,
  },
  video: {
    flex: 1,
  },
  controlsOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerButtonText: {
    fontSize: 32,
    color: colors.white,
  },
  bottomControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  progressBarContainer: {
    height: 24,
    justifyContent: 'center',
    marginBottom: 8,
  },
  progressBarBackground: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 12,
    color: colors.white,
    fontVariant: ['tabular-nums'],
  },
  speedButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 4,
  },
  speedButtonText: {
    fontSize: 12,
    color: colors.white,
    fontWeight: '600',
  },
  speedMenu: {
    position: 'absolute',
    bottom: 60,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    borderRadius: 8,
    padding: 4,
  },
  speedMenuItem: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
  },
  speedMenuItemActive: {
    backgroundColor: colors.primary,
  },
  speedMenuItemText: {
    fontSize: 14,
    color: colors.white,
  },
  speedMenuItemTextActive: {
    fontWeight: '600',
  },
});

export default VideoPlayer;
