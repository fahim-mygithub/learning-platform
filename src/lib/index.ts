/**
 * Library Index
 *
 * Re-exports all library utilities from a single entry point for convenient imports.
 *
 * @example
 * ```ts
 * import { validateEmail, validatePassword, supabase } from '@/src/lib';
 * ```
 */

// Environment configuration
export { env, validateEnv, type EnvVariables } from './env';

// Supabase client and utilities
export {
  supabase,
  isNetworkError,
  withOfflineHandling,
  validateSupabaseConnection,
  type SupabaseError,
} from './supabase';

// Form validation utilities
export { validateEmail, validatePassword } from './validation';

// Projects service
export {
  createProject,
  getProjects,
  getProject,
  updateProject,
  deleteProject,
  touchProject,
} from './projects';
