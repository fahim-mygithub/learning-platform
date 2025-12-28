/**
 * Type-safe environment variable accessor
 *
 * Expo automatically loads EXPO_PUBLIC_ prefixed variables from .env files.
 * This module provides type-safe access with runtime validation.
 */

/**
 * Required environment variables for the application
 */
interface EnvVariables {
  EXPO_PUBLIC_SUPABASE_URL: string;
  EXPO_PUBLIC_SUPABASE_ANON_KEY: string;
}

/**
 * Get an environment variable value with type safety
 * @param key - The environment variable key
 * @returns The environment variable value
 * @throws Error if the variable is not defined
 */
function getEnvVar(key: keyof EnvVariables): string {
  const value = process.env[key];

  if (value === undefined || value === '') {
    throw new Error(
      `Missing required environment variable: ${key}. ` +
        `Please check your .env file and ensure it's properly configured.`
    );
  }

  return value;
}

/**
 * Environment configuration object
 * Provides type-safe access to all required environment variables
 */
export const env = {
  /**
   * Supabase project URL
   * @example "https://xxxxx.supabase.co"
   */
  get supabaseUrl(): string {
    return getEnvVar('EXPO_PUBLIC_SUPABASE_URL');
  },

  /**
   * Supabase anonymous/public key
   * Used for client-side authentication
   */
  get supabaseAnonKey(): string {
    return getEnvVar('EXPO_PUBLIC_SUPABASE_ANON_KEY');
  },
} as const;

/**
 * Validate that all required environment variables are present
 * Call this during app initialization to fail fast if config is missing
 * @throws Error if any required variable is missing
 */
export function validateEnv(): void {
  // Accessing all env vars will throw if any are missing
  const _url = env.supabaseUrl;
  const _key = env.supabaseAnonKey;
}

export type { EnvVariables };
