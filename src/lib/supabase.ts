/**
 * Supabase Client Configuration
 *
 * Initializes and exports the Supabase client with:
 * - Environment-based credentials
 * - AsyncStorage for session persistence
 * - Auto-refresh for token management
 * - Graceful offline handling
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

import { env } from './env';

/**
 * Custom storage adapter using AsyncStorage for React Native
 * Enables session persistence across app restarts
 */
const asyncStorageAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      return await AsyncStorage.getItem(key);
    } catch (error) {
      console.error('AsyncStorage getItem error:', error);
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      console.error('AsyncStorage setItem error:', error);
    }
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('AsyncStorage removeItem error:', error);
    }
  },
};

/**
 * Supabase client instance
 *
 * Configured with:
 * - AsyncStorage for session persistence (survives app restarts)
 * - Auto-refresh enabled (tokens refresh before expiration)
 * - Detect session in URL disabled (not needed for mobile)
 */
export const supabase: SupabaseClient = createClient(
  env.supabaseUrl,
  env.supabaseAnonKey,
  {
    auth: {
      storage: asyncStorageAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);

/**
 * Error type for Supabase operations
 * Used for consistent error handling across the app
 */
export interface SupabaseError {
  message: string;
  status?: number;
  code?: string;
}

/**
 * Check if an error is a network/offline error
 * @param error - The error to check
 * @returns true if the error indicates network unavailability
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes('network') ||
      message.includes('fetch') ||
      message.includes('connection') ||
      message.includes('offline') ||
      message.includes('timeout')
    );
  }
  return false;
}

/**
 * Wrapper for Supabase operations with graceful offline handling
 * @param operation - Async function that performs a Supabase operation
 * @returns Result of the operation or error state
 */
export async function withOfflineHandling<T>(
  operation: () => Promise<T>
): Promise<{ data: T | null; error: SupabaseError | null; isOffline: boolean }> {
  try {
    const data = await operation();
    return { data, error: null, isOffline: false };
  } catch (error) {
    const isOffline = isNetworkError(error);
    const supabaseError: SupabaseError = {
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      code: isOffline ? 'NETWORK_ERROR' : 'UNKNOWN_ERROR',
    };
    return { data: null, error: supabaseError, isOffline };
  }
}

/**
 * Validate Supabase connection
 * Call during app initialization to verify configuration
 * @returns Promise that resolves when connection is validated
 * @throws Error if connection cannot be established
 */
export async function validateSupabaseConnection(): Promise<void> {
  try {
    // Perform a lightweight request to validate the connection
    // This will also validate that credentials are correct
    const { error } = await supabase.auth.getSession();
    if (error) {
      throw new Error(`Supabase connection error: ${error.message}`);
    }
  } catch (error) {
    if (isNetworkError(error)) {
      // Don't throw on network errors - app should work offline
      console.warn('Supabase connection check skipped: device appears to be offline');
      return;
    }
    throw error;
  }
}
