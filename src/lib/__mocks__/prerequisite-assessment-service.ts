/**
 * Mock Prerequisite Assessment Service for Testing
 *
 * Provides predictable responses for testing other services that depend on prerequisite detection.
 * Configurable to simulate different detection results, errors, and custom responses.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { Prerequisite, PrerequisiteInsert } from '@/src/types/prerequisite';

/**
 * Error codes for prerequisite assessment operations
 */
export type PrerequisiteAssessmentErrorCode =
  | 'API_KEY_MISSING'
  | 'DETECTION_FAILED'
  | 'DATABASE_ERROR'
  | 'VALIDATION_ERROR'
  | 'NO_CONTENT_AVAILABLE';

/**
 * Custom error class for prerequisite assessment operations
 */
export class PrerequisiteAssessmentError extends Error {
  code: PrerequisiteAssessmentErrorCode;
  details?: Record<string, unknown>;

  constructor(
    message: string,
    code: PrerequisiteAssessmentErrorCode,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'PrerequisiteAssessmentError';
    this.code = code;
    this.details = details;
  }
}

/**
 * Result of prerequisite detection
 */
export interface PrerequisiteDetectionResult {
  mentionedOnly: PrerequisiteInsert[];
  aiInferred: PrerequisiteInsert[];
  combined: PrerequisiteInsert[];
  stored: Prerequisite[];
}

/**
 * Prerequisite assessment service interface
 */
export interface PrerequisiteAssessmentService {
  detectPrerequisites(
    projectId: string,
    sourceContent?: string
  ): Promise<PrerequisiteDetectionResult>;

  extractMentionedOnlyPrerequisites(
    projectId: string
  ): Promise<PrerequisiteInsert[]>;

  inferDomainPrerequisites(
    projectId: string,
    content: string
  ): Promise<PrerequisiteInsert[]>;

  getPrerequisites(projectId: string): Promise<Prerequisite[]>;

  clearPrerequisites(projectId: string): Promise<void>;
}

/**
 * Mock configuration for controlling behavior in tests
 */
export interface MockPrerequisiteAssessmentConfig {
  /** Default detection result to return */
  defaultResult?: PrerequisiteDetectionResult;
  /** Whether to simulate errors */
  shouldError?: boolean;
  /** Error to throw when shouldError is true */
  errorToThrow?: PrerequisiteAssessmentError | Error;
  /** Custom mentioned_only prerequisites */
  mentionedOnlyPrerequisites?: PrerequisiteInsert[];
  /** Custom AI-inferred prerequisites */
  aiInferredPrerequisites?: PrerequisiteInsert[];
}

/**
 * Global mock configuration
 */
let mockConfig: MockPrerequisiteAssessmentConfig = {
  shouldError: false,
};

/**
 * Configure the mock behavior
 */
export function configureMock(config: Partial<MockPrerequisiteAssessmentConfig>): void {
  mockConfig = { ...mockConfig, ...config };
}

/**
 * Reset mock to default configuration
 */
export function resetMock(): void {
  mockConfig = {
    shouldError: false,
  };
}

/**
 * Get the current mock configuration
 */
export function getMockConfig(): MockPrerequisiteAssessmentConfig {
  return { ...mockConfig };
}

/**
 * Track calls for verification in tests
 */
interface MockCallRecord {
  timestamp: number;
  method: string;
  args: unknown[];
}

const callHistory: MockCallRecord[] = [];

/**
 * Get all calls made to the mock service
 */
export function getMockCallHistory(): MockCallRecord[] {
  return [...callHistory];
}

/**
 * Clear the call history
 */
export function clearMockCallHistory(): void {
  callHistory.length = 0;
}

/**
 * Sample prerequisites for testing
 */
export const samplePrerequisites: Record<string, PrerequisiteInsert[]> = {
  programming: [
    {
      project_id: 'test-project',
      name: 'Basic Algebra',
      description: 'Understanding of variables, equations, and basic algebraic operations',
      source: 'ai_inferred',
      confidence: 0.95,
      domain: 'mathematics',
    },
    {
      project_id: 'test-project',
      name: 'Variables and Data Types',
      description: 'Understanding of how to declare and use variables in programming',
      source: 'mentioned_only',
      confidence: 1.0,
      domain: 'programming',
    },
  ],
  empty: [],
};

/**
 * Create a default detection result
 */
function createDefaultResult(projectId: string): PrerequisiteDetectionResult {
  const mentionedOnly: PrerequisiteInsert[] = mockConfig.mentionedOnlyPrerequisites || [];
  const aiInferred: PrerequisiteInsert[] = mockConfig.aiInferredPrerequisites || [];
  const combined = [...mentionedOnly, ...aiInferred];

  const stored: Prerequisite[] = combined.map((prereq, index) => ({
    ...prereq,
    id: `prereq-${index}`,
    project_id: projectId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));

  return {
    mentionedOnly,
    aiInferred,
    combined,
    stored,
  };
}

/**
 * Create a mock prerequisite assessment service
 */
export function createPrerequisiteAssessmentService(
  _supabase?: SupabaseClient
): PrerequisiteAssessmentService {
  // Check for API key (simulating real service behavior)
  const apiKey = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new PrerequisiteAssessmentError(
      'API key is required. Set EXPO_PUBLIC_ANTHROPIC_API_KEY environment variable.',
      'API_KEY_MISSING'
    );
  }

  return {
    async detectPrerequisites(
      projectId: string,
      _sourceContent?: string
    ): Promise<PrerequisiteDetectionResult> {
      callHistory.push({
        timestamp: Date.now(),
        method: 'detectPrerequisites',
        args: [projectId, _sourceContent],
      });

      if (mockConfig.shouldError) {
        throw mockConfig.errorToThrow || new PrerequisiteAssessmentError('Mock error', 'DETECTION_FAILED');
      }

      return mockConfig.defaultResult || createDefaultResult(projectId);
    },

    async extractMentionedOnlyPrerequisites(
      projectId: string
    ): Promise<PrerequisiteInsert[]> {
      callHistory.push({
        timestamp: Date.now(),
        method: 'extractMentionedOnlyPrerequisites',
        args: [projectId],
      });

      if (mockConfig.shouldError) {
        throw mockConfig.errorToThrow || new PrerequisiteAssessmentError('Mock error', 'DATABASE_ERROR');
      }

      return mockConfig.mentionedOnlyPrerequisites || [];
    },

    async inferDomainPrerequisites(
      projectId: string,
      _content: string
    ): Promise<PrerequisiteInsert[]> {
      callHistory.push({
        timestamp: Date.now(),
        method: 'inferDomainPrerequisites',
        args: [projectId, _content],
      });

      if (mockConfig.shouldError) {
        throw mockConfig.errorToThrow || new PrerequisiteAssessmentError('Mock error', 'DETECTION_FAILED');
      }

      return mockConfig.aiInferredPrerequisites || [];
    },

    async getPrerequisites(projectId: string): Promise<Prerequisite[]> {
      callHistory.push({
        timestamp: Date.now(),
        method: 'getPrerequisites',
        args: [projectId],
      });

      if (mockConfig.shouldError) {
        throw mockConfig.errorToThrow || new PrerequisiteAssessmentError('Mock error', 'DATABASE_ERROR');
      }

      const result = mockConfig.defaultResult || createDefaultResult(projectId);
      return result.stored;
    },

    async clearPrerequisites(projectId: string): Promise<void> {
      callHistory.push({
        timestamp: Date.now(),
        method: 'clearPrerequisites',
        args: [projectId],
      });

      if (mockConfig.shouldError) {
        throw mockConfig.errorToThrow || new PrerequisiteAssessmentError('Mock error', 'DATABASE_ERROR');
      }
    },
  };
}

/**
 * Get the default prerequisite assessment service
 */
export function getDefaultPrerequisiteAssessmentService(
  supabase?: SupabaseClient
): PrerequisiteAssessmentService {
  return createPrerequisiteAssessmentService(supabase);
}

/**
 * Deduplicate prerequisites (mock version)
 */
export function deduplicatePrerequisites(
  mentionedOnly: PrerequisiteInsert[],
  aiInferred: PrerequisiteInsert[]
): PrerequisiteInsert[] {
  const seen = new Map<string, PrerequisiteInsert>();

  for (const prereq of mentionedOnly) {
    seen.set(prereq.name.toLowerCase().trim(), prereq);
  }

  for (const prereq of aiInferred) {
    const normalizedName = prereq.name.toLowerCase().trim();
    if (!seen.has(normalizedName)) {
      seen.set(normalizedName, prereq);
    }
  }

  return Array.from(seen.values());
}
