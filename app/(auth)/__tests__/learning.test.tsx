/**
 * Learning Screen Tests
 *
 * Tests for the main learning session screen.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';

// Mock dependencies
jest.mock('expo-router', () => ({
  useRouter: () => ({
    replace: jest.fn(),
    back: jest.fn(),
  }),
  useLocalSearchParams: () => ({
    projectId: 'test-project-id',
  }),
}));

jest.mock('@/src/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id' } },
      }),
    },
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        }),
      }),
    }),
  },
}));

jest.mock('@/src/lib/session-context', () => ({
  useSession: () => ({
    capacity: {
      baseCapacity: 4,
      circadianModifier: 1.0,
      sleepModifier: 1.0,
      fatigueModifier: 0,
      effectiveCapacity: 4,
      percentageUsed: 0,
      canLearnNew: true,
      warningLevel: 'none',
    },
  }),
}));

// Import the component after mocks are set up
import LearningScreen from '../learning';

describe('LearningScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders loading state initially', async () => {
      render(<LearningScreen />);

      // Should show loading text
      expect(screen.getByText(/preparing your learning session/i)).toBeTruthy();
    });

    it('shows error state when no concepts found', async () => {
      render(<LearningScreen />);

      await waitFor(() => {
        expect(
          screen.getByText(/no concepts found for this project/i)
        ).toBeTruthy();
      });
    });
  });

  describe('Session Initialization', () => {
    it('starts with loading state and transitions', async () => {
      render(<LearningScreen />);

      // Initial loading state
      expect(screen.getByText(/preparing your learning session/i)).toBeTruthy();

      // Wait for error state (no concepts found)
      await waitFor(() => {
        expect(screen.getByText(/no concepts found/i)).toBeTruthy();
      });
    });
  });
});
