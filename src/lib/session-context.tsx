/**
 * Session Context Provider
 *
 * Provides cognitive session state management for the app:
 * - Calculates cognitive capacity based on time of day
 * - Provides session recommendations based on sleep schedule
 * - Generates session previews for the session builder
 * - Refreshes capacity periodically
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';

import { supabase } from './supabase';
import { useAuth } from './auth-context';
import { calculateCapacity } from './session/cognitive-load-service';
import { getSessionRecommendation } from './session/sleep-aware-scheduler';
import { getSessionPreview } from './session/session-builder-service';
import type {
  CognitiveCapacity,
  SessionRecommendation,
  UserSchedulePreferences,
} from '../types/session';

/**
 * Session context value interface
 */
interface SessionContextValue {
  /** Current cognitive capacity, null if not calculated */
  capacity: CognitiveCapacity | null;
  /** Current session recommendation, null if not calculated */
  recommendation: SessionRecommendation | null;
  /** True while loading session data */
  loading: boolean;
  /** Error message if calculation failed */
  error: string | null;
  /** Recalculate capacity based on current time */
  refreshCapacity: () => void;
  /** Get preview for session builder */
  getPreview: (
    reviews: { conceptId: string }[],
    newConcepts: { conceptId: string }[]
  ) => ReturnType<typeof getSessionPreview>;
}

/**
 * Session context - undefined by default to detect usage outside provider
 */
const SessionContext = createContext<SessionContextValue | undefined>(undefined);

/**
 * Props for SessionProvider component
 */
interface SessionProviderProps {
  children: ReactNode;
}

/**
 * Interval for refreshing capacity (30 minutes in milliseconds)
 */
const REFRESH_INTERVAL_MS = 30 * 60 * 1000;

/**
 * Session Provider Component
 *
 * Wraps the app to provide cognitive session state to all components.
 * Handles:
 * - Calculating cognitive capacity based on time of day
 * - Fetching user schedule preferences for sleep-aware recommendations
 * - Periodic refresh of capacity
 *
 * @example
 * ```tsx
 * <SessionProvider>
 *   <App />
 * </SessionProvider>
 * ```
 */
export function SessionProvider({ children }: SessionProviderProps): React.ReactElement {
  const { user } = useAuth();
  const [capacity, setCapacity] = useState<CognitiveCapacity | null>(null);
  const [recommendation, setRecommendation] = useState<SessionRecommendation | null>(null);
  const [preferences, setPreferences] = useState<UserSchedulePreferences | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track user ID for reloading
  const currentUserIdRef = useRef<string | null>(null);
  // Track refresh interval
  const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /**
   * Load user schedule preferences from Supabase
   */
  const loadPreferences = useCallback(async (userId: string) => {
    try {
      const { data, error: queryError } = await supabase
        .from('user_schedule_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (queryError) {
        // It's OK if preferences don't exist - user hasn't set them yet
        if (queryError.code !== 'PGRST116') {
          console.error('Error loading schedule preferences:', queryError);
        }
        return null;
      }

      return data as UserSchedulePreferences;
    } catch (err) {
      console.error('Error loading schedule preferences:', err);
      return null;
    }
  }, []);

  /**
   * Calculate capacity and recommendation based on current time
   */
  const calculateCurrentCapacity = useCallback(
    (prefs: UserSchedulePreferences | null) => {
      const now = new Date();
      const currentHour = now.getHours();

      // Calculate cognitive capacity
      const newCapacity = calculateCapacity({
        currentHour,
        sessionDurationMinutes: 0, // Fresh start
        sleepQuality: 1.0, // Default sleep quality
      });

      // Get session recommendation
      const newRecommendation = getSessionRecommendation({
        currentTime: now,
        preferences: prefs,
      });

      setCapacity(newCapacity);
      setRecommendation(newRecommendation);
      setError(null);
    },
    []
  );

  /**
   * Refresh capacity - recalculate based on current time
   */
  const refreshCapacity = useCallback(() => {
    calculateCurrentCapacity(preferences);
  }, [preferences, calculateCurrentCapacity]);

  /**
   * Get session preview for given reviews and new concepts
   */
  const getPreview = useCallback(
    (reviews: { conceptId: string }[], newConcepts: { conceptId: string }[]) => {
      // Use effective capacity from current capacity, or default to 4
      const effectiveCapacity = capacity?.effectiveCapacity ?? 4;

      // If we have a recommendation that limits new concepts, use that
      const maxNewConcepts = recommendation?.newConceptsAllowed ?? Math.floor(effectiveCapacity);

      return getSessionPreview({
        reviews,
        newConcepts,
        capacity: maxNewConcepts,
      });
    },
    [capacity, recommendation]
  );

  /**
   * Initialize session state for a user
   */
  const initializeSession = useCallback(
    async (userId: string) => {
      setLoading(true);
      setError(null);

      try {
        // Load user preferences
        const prefs = await loadPreferences(userId);
        setPreferences(prefs);

        // Calculate initial capacity
        calculateCurrentCapacity(prefs);
      } catch (err) {
        console.error('Error initializing session:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize session');
      } finally {
        setLoading(false);
      }
    },
    [loadPreferences, calculateCurrentCapacity]
  );

  /**
   * Load session state when user changes
   */
  useEffect(() => {
    if (!user?.id) {
      if (currentUserIdRef.current !== null) {
        // User logged out - reset state
        setCapacity(null);
        setRecommendation(null);
        setPreferences(null);
        setError(null);
      }
      currentUserIdRef.current = null;
      return;
    }

    if (user.id !== currentUserIdRef.current) {
      currentUserIdRef.current = user.id;
      initializeSession(user.id);
    }
  }, [user?.id, initializeSession]);

  /**
   * Set up periodic refresh of capacity
   */
  useEffect(() => {
    // Clear any existing interval
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
    }

    // Only set up refresh if user is logged in
    if (user?.id) {
      refreshIntervalRef.current = setInterval(() => {
        refreshCapacity();
      }, REFRESH_INTERVAL_MS);
    }

    // Cleanup on unmount or user change
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    };
  }, [user?.id, refreshCapacity]);

  /**
   * Memoized context value
   */
  const contextValue = useMemo<SessionContextValue>(
    () => ({
      capacity,
      recommendation,
      loading,
      error,
      refreshCapacity,
      getPreview,
    }),
    [capacity, recommendation, loading, error, refreshCapacity, getPreview]
  );

  return <SessionContext.Provider value={contextValue}>{children}</SessionContext.Provider>;
}

/**
 * Hook to access session state and actions
 *
 * Must be used within a SessionProvider.
 *
 * @returns Session context value
 * @throws Error if used outside of SessionProvider
 *
 * @example
 * ```tsx
 * function HomeScreen() {
 *   const { capacity, recommendation, refreshCapacity } = useSession();
 *
 *   if (!capacity) {
 *     return <LoadingSpinner />;
 *   }
 *
 *   return (
 *     <View>
 *       <Text>Effective Capacity: {capacity.effectiveCapacity}</Text>
 *       <Text>Recommendation: {recommendation?.reason}</Text>
 *     </View>
 *   );
 * }
 * ```
 */
export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);

  if (context === undefined) {
    throw new Error('useSession must be used within a SessionProvider');
  }

  return context;
}

/**
 * Re-export types for consumers
 */
export type { SessionContextValue, SessionProviderProps };
