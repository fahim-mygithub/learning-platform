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

// File validation utilities
export {
  ALLOWED_VIDEO_TYPES,
  ALLOWED_PDF_TYPES,
  MAX_VIDEO_SIZE,
  MAX_PDF_SIZE,
  validateFileType,
  validateFileSize,
  getSourceTypeFromMime,
  formatFileSize,
  type ValidationResult,
} from './file-validation';

// Sources service
export {
  createSource,
  getSources,
  getSource,
  updateSource,
  deleteSource,
  uploadFile,
  deleteStorageFile,
  type UploadFile,
  type OnProgressCallback,
} from './sources';

// Sources context
export {
  SourcesProvider,
  useSources,
  type SourcesContextValue,
  type SourcesProviderProps,
} from './sources-context';

// DEV ONLY - Development authentication bypass utilities
// REMOVE BEFORE PRODUCTION or ensure these are not used in production code
export {
  isDevEnvironment,
  devSignIn,
  devSignOut,
  getDevAuthState,
  isDevAuthenticated,
  DEV_USER,
  DEV_SESSION,
} from './dev-auth';
