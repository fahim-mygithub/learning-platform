/**
 * Typography Context Provider
 *
 * Provides typography and accessibility preference management:
 * - Font family selection (System vs Lexend)
 * - Bionic reading toggle
 * - Dark mode toggle
 * - Font scaling for accessibility
 *
 * Preferences are persisted to Supabase and cached locally for offline use.
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  useCallback,
  type ReactNode,
} from 'react';
import { Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { supabase } from './supabase';
import { useAuth } from './auth-context';
import {
  type TypographyPreferences,
  type FontFamily,
  DEFAULT_TYPOGRAPHY_PREFERENCES,
} from '@/src/types/engagement';
import {
  applyBionicReading,
  type BionicTextSegment,
} from './bionic-text';
import { getThemeColors, type ColorTheme } from '@/src/theme/colors';

// ============================================================================
// Constants
// ============================================================================

/** Key for storing typography preferences in AsyncStorage */
const TYPOGRAPHY_STORAGE_KEY = '@typography_preferences';

/** Database table name for typography preferences */
const TYPOGRAPHY_TABLE = 'user_typography_preferences';

// ============================================================================
// Types
// ============================================================================

/**
 * Font weight name as used in Lexend font variants
 */
export type LexendFontWeight = 'regular' | 'medium' | 'semibold' | 'bold';

/**
 * Map font weight names to actual font family values
 */
const LEXEND_FONTS: Record<LexendFontWeight, string> = {
  regular: 'Lexend_400Regular',
  medium: 'Lexend_500Medium',
  semibold: 'Lexend_600SemiBold',
  bold: 'Lexend_700Bold',
};

/**
 * Map font weight names to system font weights
 */
const SYSTEM_FONT_WEIGHTS: Record<LexendFontWeight, string> = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
};

/**
 * Typography context value interface
 */
interface TypographyContextValue {
  /** Current typography preferences */
  preferences: TypographyPreferences;
  /** True while loading preferences */
  isLoading: boolean;
  /** Update typography preferences (partial updates supported) */
  updatePreferences: (updates: Partial<TypographyPreferences>) => Promise<void>;
  /** Process text for bionic reading (returns React nodes) */
  processText: (text: string) => React.ReactNode;
  /** Get the current font family name based on preferences */
  getFontFamily: (weight?: LexendFontWeight) => string;
  /** Get a font size scaled by the user's preference */
  getScaledFontSize: (baseSize: number) => number;
  /** Get colors for the current theme mode */
  getColors: () => ColorTheme;
  /** Whether dark mode is enabled */
  isDarkMode: boolean;
}

/**
 * Default context value used before provider is mounted
 */
const defaultContextValue: TypographyContextValue = {
  preferences: DEFAULT_TYPOGRAPHY_PREFERENCES,
  isLoading: true,
  updatePreferences: async () => {},
  processText: (text: string) => text,
  getFontFamily: () => 'System',
  getScaledFontSize: (baseSize: number) => baseSize,
  getColors: () => getThemeColors(false),
  isDarkMode: false,
};

// ============================================================================
// Context
// ============================================================================

const TypographyContext = createContext<TypographyContextValue>(defaultContextValue);

// ============================================================================
// Provider Props
// ============================================================================

interface TypographyProviderProps {
  children: ReactNode;
}

// ============================================================================
// Provider Component
// ============================================================================

/**
 * Typography Provider Component
 *
 * Wraps the app to provide typography preferences to all components.
 * Handles:
 * - Loading preferences from Supabase on mount
 * - Caching preferences locally for offline use
 * - Updating preferences in both local storage and database
 * - Processing text for bionic reading
 *
 * @example
 * ```tsx
 * <AuthProvider>
 *   <TypographyProvider>
 *     <App />
 *   </TypographyProvider>
 * </AuthProvider>
 * ```
 */
export function TypographyProvider({ children }: TypographyProviderProps): React.ReactElement {
  const { user, isAuthenticated } = useAuth();
  const [preferences, setPreferences] = useState<TypographyPreferences>(DEFAULT_TYPOGRAPHY_PREFERENCES);
  const [isLoading, setIsLoading] = useState(true);

  // ============================================================================
  // Load Preferences
  // ============================================================================

  useEffect(() => {
    const loadPreferences = async () => {
      setIsLoading(true);

      try {
        // First, try to load from local cache for immediate display
        const cachedPrefs = await loadFromCache();
        if (cachedPrefs) {
          setPreferences(cachedPrefs);
        }

        // If authenticated, fetch from database and sync
        if (isAuthenticated && user?.id) {
          const dbPrefs = await loadFromDatabase(user.id);
          if (dbPrefs) {
            setPreferences(dbPrefs);
            // Update cache with database values
            await saveToCache(dbPrefs);
          } else {
            // No database record exists, create one with current preferences
            const currentPrefs = cachedPrefs || DEFAULT_TYPOGRAPHY_PREFERENCES;
            await saveToDatabase(user.id, currentPrefs);
          }
        }
      } catch (error) {
        console.error('Error loading typography preferences:', error);
        // Continue with cached or default preferences
      } finally {
        setIsLoading(false);
      }
    };

    loadPreferences();
  }, [isAuthenticated, user?.id]);

  // ============================================================================
  // Update Preferences
  // ============================================================================

  const updatePreferences = useCallback(
    async (updates: Partial<TypographyPreferences>): Promise<void> => {
      const newPreferences = { ...preferences, ...updates };

      // Update state immediately for responsive UI
      setPreferences(newPreferences);

      // Save to cache
      await saveToCache(newPreferences);

      // If authenticated, save to database
      if (isAuthenticated && user?.id) {
        await saveToDatabase(user.id, newPreferences);
      }
    },
    [preferences, isAuthenticated, user?.id]
  );

  // ============================================================================
  // Process Text for Bionic Reading
  // ============================================================================

  const processText = useCallback(
    (text: string): React.ReactNode => {
      if (!preferences.bionicReadingEnabled) {
        return text;
      }

      const segments = applyBionicReading(text);

      return segments.map((segment: BionicTextSegment, index: number) => (
        <Text key={index}>
          {segment.bold && (
            <Text style={{ fontWeight: 'bold' }}>{segment.bold}</Text>
          )}
          {segment.regular}
        </Text>
      ));
    },
    [preferences.bionicReadingEnabled]
  );

  // ============================================================================
  // Get Font Family
  // ============================================================================

  const getFontFamily = useCallback(
    (weight: LexendFontWeight = 'regular'): string => {
      if (preferences.fontFamily === 'lexend') {
        return LEXEND_FONTS[weight];
      }
      // Return system with appropriate weight
      return 'System';
    },
    [preferences.fontFamily]
  );

  // ============================================================================
  // Get Scaled Font Size
  // ============================================================================

  const getScaledFontSize = useCallback(
    (baseSize: number): number => {
      return Math.round(baseSize * preferences.fontScale);
    },
    [preferences.fontScale]
  );

  // ============================================================================
  // Get Theme Colors
  // ============================================================================

  const getColors = useCallback((): ColorTheme => {
    return getThemeColors(preferences.darkModeEnabled);
  }, [preferences.darkModeEnabled]);

  // ============================================================================
  // Context Value
  // ============================================================================

  const contextValue = useMemo<TypographyContextValue>(
    () => ({
      preferences,
      isLoading,
      updatePreferences,
      processText,
      getFontFamily,
      getScaledFontSize,
      getColors,
      isDarkMode: preferences.darkModeEnabled,
    }),
    [
      preferences,
      isLoading,
      updatePreferences,
      processText,
      getFontFamily,
      getScaledFontSize,
      getColors,
    ]
  );

  return (
    <TypographyContext.Provider value={contextValue}>
      {children}
    </TypographyContext.Provider>
  );
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook to access typography preferences and utilities
 *
 * Must be used within a TypographyProvider.
 *
 * @returns Typography context value with preferences and utility functions
 *
 * @example
 * ```tsx
 * function ReadingScreen() {
 *   const { preferences, processText, getScaledFontSize, getColors } = useTypography();
 *
 *   const colors = getColors();
 *   const fontSize = getScaledFontSize(16);
 *
 *   return (
 *     <View style={{ backgroundColor: colors.background }}>
 *       <Text style={{ fontSize, color: colors.text }}>
 *         {processText("Hello world")}
 *       </Text>
 *     </View>
 *   );
 * }
 * ```
 */
export function useTypography(): TypographyContextValue {
  const context = useContext(TypographyContext);

  if (context === undefined) {
    throw new Error('useTypography must be used within a TypographyProvider');
  }

  return context;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Load preferences from AsyncStorage cache
 */
async function loadFromCache(): Promise<TypographyPreferences | null> {
  try {
    const cached = await AsyncStorage.getItem(TYPOGRAPHY_STORAGE_KEY);
    if (cached) {
      return JSON.parse(cached) as TypographyPreferences;
    }
  } catch (error) {
    console.error('Error loading typography preferences from cache:', error);
  }
  return null;
}

/**
 * Save preferences to AsyncStorage cache
 */
async function saveToCache(preferences: TypographyPreferences): Promise<void> {
  try {
    await AsyncStorage.setItem(TYPOGRAPHY_STORAGE_KEY, JSON.stringify(preferences));
  } catch (error) {
    console.error('Error saving typography preferences to cache:', error);
  }
}

/**
 * Load preferences from Supabase database
 */
async function loadFromDatabase(userId: string): Promise<TypographyPreferences | null> {
  try {
    const { data, error } = await supabase
      .from(TYPOGRAPHY_TABLE)
      .select('font_family, bionic_reading_enabled, dark_mode_enabled, font_scale')
      .eq('user_id', userId)
      .single();

    if (error) {
      // PGRST116 means no rows found, which is expected for new users
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error('Error loading typography preferences from database:', error);
      return null;
    }

    if (data) {
      return {
        fontFamily: data.font_family as FontFamily,
        bionicReadingEnabled: data.bionic_reading_enabled,
        darkModeEnabled: data.dark_mode_enabled,
        fontScale: data.font_scale,
      };
    }
  } catch (error) {
    console.error('Error loading typography preferences from database:', error);
  }
  return null;
}

/**
 * Save preferences to Supabase database
 */
async function saveToDatabase(
  userId: string,
  preferences: TypographyPreferences
): Promise<void> {
  try {
    const { error } = await supabase
      .from(TYPOGRAPHY_TABLE)
      .upsert(
        {
          user_id: userId,
          font_family: preferences.fontFamily,
          bionic_reading_enabled: preferences.bionicReadingEnabled,
          dark_mode_enabled: preferences.darkModeEnabled,
          font_scale: preferences.fontScale,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id',
        }
      );

    if (error) {
      console.error('Error saving typography preferences to database:', error);
    }
  } catch (error) {
    console.error('Error saving typography preferences to database:', error);
  }
}

// ============================================================================
// Type Exports
// ============================================================================

export type { TypographyContextValue, TypographyProviderProps };
