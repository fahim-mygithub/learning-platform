/**
 * YouTubeSegmentPlayer Component Tests
 *
 * TDD: These tests verify the expected behavior of the YouTubeSegmentPlayer component.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';
import { Platform } from 'react-native';

import { YouTubeSegmentPlayer } from '../YouTubeSegmentPlayer';

// Mock Platform for web/native testing
const mockPlatformOS = (os: 'web' | 'ios' | 'android') => {
  Object.defineProperty(Platform, 'OS', {
    get: jest.fn(() => os),
    configurable: true,
  });
};

describe('YouTubeSegmentPlayer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default to web platform
    mockPlatformOS('web');
  });

  describe('rendering', () => {
    it('renders player for valid YouTube URL', () => {
      render(
        <YouTubeSegmentPlayer
          videoUrl="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
          startSec={0}
          endSec={30}
          testID="youtube-player"
        />
      );

      expect(screen.getByTestId('youtube-player')).toBeTruthy();
    });

    it('renders player for short youtu.be URL', () => {
      render(
        <YouTubeSegmentPlayer
          videoUrl="https://youtu.be/dQw4w9WgXcQ"
          startSec={10}
          endSec={60}
          testID="youtube-player"
        />
      );

      expect(screen.getByTestId('youtube-player')).toBeTruthy();
    });

    it('shows error state for non-YouTube URL', () => {
      render(
        <YouTubeSegmentPlayer
          videoUrl="https://vimeo.com/12345"
          startSec={0}
          endSec={30}
          testID="youtube-player"
        />
      );

      expect(screen.getByTestId('youtube-player-error')).toBeTruthy();
      expect(screen.getByText(/invalid youtube url/i)).toBeTruthy();
    });

    it('shows error state for empty URL', () => {
      render(
        <YouTubeSegmentPlayer
          videoUrl=""
          startSec={0}
          endSec={30}
          testID="youtube-player"
        />
      );

      expect(screen.getByTestId('youtube-player-error')).toBeTruthy();
    });
  });

  describe('embed URL construction', () => {
    // Test the exported buildEmbedUrl function logic by checking the iframe src
    // Since we can't easily inspect iframe src in JSDOM, we test the component renders
    // and rely on the component's internal logic being correct

    it('renders with segment parameters', () => {
      render(
        <YouTubeSegmentPlayer
          videoUrl="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
          startSec={30}
          endSec={60}
          testID="youtube-player"
        />
      );

      // Component renders without error - embed URL is constructed internally
      expect(screen.getByTestId('youtube-player')).toBeTruthy();
    });

    it('renders with isActive=true for autoplay', () => {
      render(
        <YouTubeSegmentPlayer
          videoUrl="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
          startSec={0}
          endSec={30}
          isActive={true}
          testID="youtube-player"
        />
      );

      expect(screen.getByTestId('youtube-player')).toBeTruthy();
    });

    it('renders with isActive=false for no autoplay', () => {
      render(
        <YouTubeSegmentPlayer
          videoUrl="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
          startSec={0}
          endSec={30}
          isActive={false}
          testID="youtube-player"
        />
      );

      expect(screen.getByTestId('youtube-player')).toBeTruthy();
    });

    it('handles various video ID formats', () => {
      // Full URL
      const { rerender } = render(
        <YouTubeSegmentPlayer
          videoUrl="https://www.youtube.com/watch?v=abc123XYZ_-"
          startSec={0}
          endSec={30}
          testID="youtube-player"
        />
      );
      expect(screen.getByTestId('youtube-player')).toBeTruthy();

      // Short URL
      rerender(
        <YouTubeSegmentPlayer
          videoUrl="https://youtu.be/abc123XYZ_-"
          startSec={0}
          endSec={30}
          testID="youtube-player"
        />
      );
      expect(screen.getByTestId('youtube-player')).toBeTruthy();

      // Embed URL
      rerender(
        <YouTubeSegmentPlayer
          videoUrl="https://www.youtube.com/embed/abc123XYZ_-"
          startSec={0}
          endSec={30}
          testID="youtube-player"
        />
      );
      expect(screen.getByTestId('youtube-player')).toBeTruthy();
    });
  });

  describe('platform-specific rendering', () => {
    it('renders on web platform', () => {
      mockPlatformOS('web');

      render(
        <YouTubeSegmentPlayer
          videoUrl="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
          startSec={0}
          endSec={30}
          testID="youtube-player"
        />
      );

      // On web, renders the player container
      expect(screen.getByTestId('youtube-player')).toBeTruthy();
    });

    it('uses WebView on native platform (iOS)', () => {
      mockPlatformOS('ios');

      render(
        <YouTubeSegmentPlayer
          videoUrl="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
          startSec={0}
          endSec={30}
          testID="youtube-player"
        />
      );

      // On native, should render WebView (mocked as 'WebView' string)
      expect(screen.getByTestId('youtube-player-webview')).toBeTruthy();
    });

    it('uses WebView on native platform (Android)', () => {
      mockPlatformOS('android');

      render(
        <YouTubeSegmentPlayer
          videoUrl="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
          startSec={0}
          endSec={30}
          testID="youtube-player"
        />
      );

      expect(screen.getByTestId('youtube-player-webview')).toBeTruthy();
    });
  });

  describe('accessibility', () => {
    it('has correct accessibility label', () => {
      render(
        <YouTubeSegmentPlayer
          videoUrl="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
          startSec={0}
          endSec={30}
          testID="youtube-player"
        />
      );

      const player = screen.getByTestId('youtube-player');
      expect(player.props.accessibilityLabel).toContain('YouTube video');
    });
  });

  describe('callbacks', () => {
    it('accepts onSegmentComplete callback', () => {
      const onSegmentComplete = jest.fn();

      render(
        <YouTubeSegmentPlayer
          videoUrl="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
          startSec={0}
          endSec={30}
          onSegmentComplete={onSegmentComplete}
          testID="youtube-player"
        />
      );

      // Component accepts the callback prop without error
      expect(screen.getByTestId('youtube-player')).toBeTruthy();
    });
  });

  describe('loading state', () => {
    it('shows loading indicator initially', () => {
      render(
        <YouTubeSegmentPlayer
          videoUrl="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
          startSec={0}
          endSec={30}
          testID="youtube-player"
        />
      );

      expect(screen.getByTestId('youtube-player-loading')).toBeTruthy();
    });
  });

  describe('TikTok-style looping', () => {
    // Import buildEmbedUrl to test directly - this is tested through the component
    // We test the component renders correctly and verify URL params through unit tests

    it('includes loop parameter in embed URL to prevent recommendations', () => {
      // BUG: YouTube shows recommendations when video ends
      // The embed URL should include loop=1 to enable looping
      mockPlatformOS('web');

      // Test that component renders - URL construction is tested via exported function
      render(
        <YouTubeSegmentPlayer
          videoUrl="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
          startSec={0}
          endSec={30}
          isActive={true}
          testID="youtube-player"
        />
      );

      // Component should render successfully with loop parameters
      expect(screen.getByTestId('youtube-player')).toBeTruthy();

      // Verify the buildEmbedUrl function output contains loop parameters
      // We import and test the function directly
      const { buildEmbedUrl } = require('../YouTubeSegmentPlayer');
      const url = buildEmbedUrl('dQw4w9WgXcQ', 0, 30, true);
      const urlObj = new URL(url);

      // Should have loop=1 parameter
      expect(urlObj.searchParams.get('loop')).toBe('1');

      // Should also have playlist parameter (required for loop with single video)
      expect(urlObj.searchParams.get('playlist')).toBe('dQw4w9WgXcQ');
    });

    it('includes playlist parameter for single video looping', () => {
      // For YouTube to loop a single video, playlist param must contain the video ID
      const { buildEmbedUrl } = require('../YouTubeSegmentPlayer');
      const videoId = 'abc123XYZ';
      const url = buildEmbedUrl(videoId, 10, 60, true);

      // URL should contain playlist parameter with same video ID for loop to work
      expect(url).toContain(`playlist=${videoId}`);
      expect(url).toContain('loop=1');
    });
  });
});
