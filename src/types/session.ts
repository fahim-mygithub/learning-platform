/**
 * Session Construction Types
 * Types for Phase 4 intelligent learning session building
 */

// ============================================================================
// Cognitive Capacity Types
// ============================================================================

/**
 * Warning level for cognitive capacity
 */
export type CognitiveWarningLevel = 'none' | 'caution' | 'blocked';

/**
 * Cognitive capacity calculation result
 * Used to determine how much new learning is advisable
 */
export interface CognitiveCapacity {
  /** Base capacity - always 4 (Miller's Law) */
  baseCapacity: number;
  /** Circadian rhythm modifier (0.7-1.1) */
  circadianModifier: number;
  /** Sleep quality modifier (0.7-1.0) */
  sleepModifier: number;
  /** Accumulated fatigue modifier (0-0.3) */
  fatigueModifier: number;
  /** Calculated effective capacity */
  effectiveCapacity: number;
  /** Percentage of capacity currently used (0-100) */
  percentageUsed: number;
  /** Whether learning new concepts is advisable */
  canLearnNew: boolean;
  /** Warning level for UI display */
  warningLevel: CognitiveWarningLevel;
}

// ============================================================================
// Session Item Types
// ============================================================================

/**
 * Type of session item
 */
export type SessionItemType = 'review' | 'new' | 'pretest';

/**
 * Individual item within a learning session
 */
export interface SessionItem {
  /** Type of learning activity */
  type: SessionItemType;
  /** ID of the concept to learn/review */
  concept_id: string;
  /** Position in session order */
  position: number;
}

// ============================================================================
// Learning Session Types
// ============================================================================

/**
 * Type of learning session
 */
export type LearningSessionType = 'standard' | 'review_only' | 'morning_check';

/**
 * Learning session record from database
 * Represents a constructed learning session with ordered items
 */
export interface LearningSession {
  id: string;
  user_id: string;
  project_id: string | null;
  session_type: LearningSessionType;
  items: SessionItem[];
  estimated_minutes: number;
  cognitive_load_used: number;
  started_at: string;
  completed_at: string | null;
}

/**
 * Data for inserting a new learning session
 */
export interface LearningSessionInsert {
  user_id: string;
  project_id?: string | null;
  session_type: LearningSessionType;
  items: SessionItem[];
  estimated_minutes: number;
  cognitive_load_used: number;
  completed_at?: string | null;
}

/**
 * Data for updating a learning session
 */
export interface LearningSessionUpdate {
  session_type?: LearningSessionType;
  items?: SessionItem[];
  estimated_minutes?: number;
  cognitive_load_used?: number;
  completed_at?: string | null;
}

// ============================================================================
// User Schedule Preferences Types
// ============================================================================

/**
 * User schedule preferences record from database
 * Stores user's sleep schedule for circadian calculations
 */
export interface UserSchedulePreferences {
  user_id: string;
  /** Bedtime in "HH:MM" format (e.g., "22:00") */
  bedtime: string;
  /** Wake time in "HH:MM" format (e.g., "07:00") */
  wake_time: string;
  /** User's timezone (e.g., "America/New_York") */
  timezone: string;
  created_at: string;
  updated_at: string;
}

/**
 * Data for inserting user schedule preferences
 */
export interface UserSchedulePreferencesInsert {
  user_id: string;
  bedtime: string;
  wake_time: string;
  timezone: string;
}

/**
 * Data for updating user schedule preferences
 */
export interface UserSchedulePreferencesUpdate {
  bedtime?: string;
  wake_time?: string;
  timezone?: string;
}

// ============================================================================
// Session Recommendation Types
// ============================================================================

/**
 * Recommended session type
 */
export type SessionRecommendationType = 'standard' | 'review_only' | 'skip';

/**
 * Session recommendation result
 * Generated advice for what kind of session the user should do
 */
export interface SessionRecommendation {
  /** Recommended type of session */
  type: SessionRecommendationType;
  /** Human-readable explanation for the recommendation */
  reason: string;
  /** Suggested session duration in minutes */
  suggestedDuration: number;
  /** Number of new concepts allowed based on cognitive capacity */
  newConceptsAllowed: number;
}

// ============================================================================
// Session Response Types (Task 5A.2)
// ============================================================================

/**
 * Misconception log entry
 * Records a specific misconception detected during a session response
 */
export interface MisconceptionLogEntry {
  /** ID of the misconception pattern detected */
  misconception_id: string;
  /** Timestamp when the misconception was detected */
  detected_at: string;
  /** The user's response text that triggered detection */
  trigger_response: string;
  /** Confidence score for this detection (0-1) */
  confidence: number;
}

/**
 * Session response record from database
 * Represents a user's response to a question within a learning session
 */
export interface SessionResponse {
  id: string;
  /** ID of the learning session this response belongs to */
  session_id: string;
  /** ID of the concept being tested */
  concept_id: string;
  /** Type of question asked */
  question_type: 'multiple_choice' | 'true_false' | 'free_text' | 'interactive';
  /** The question that was presented */
  question_text: string;
  /** The user's response */
  user_response: string;
  /** The correct answer */
  correct_answer: string;
  /** Whether the response was correct */
  is_correct: boolean;
  /** Time taken to respond in milliseconds */
  response_time_ms: number;
  /** Confidence level reported by user (1-5, optional) */
  confidence_level: number | null;
  /** Misconceptions detected in this response */
  misconception_log: MisconceptionLogEntry[];
  /** Timestamp when the response was recorded */
  created_at: string;
}

/**
 * Data for inserting a new session response
 */
export interface SessionResponseInsert {
  session_id: string;
  concept_id: string;
  question_type: 'multiple_choice' | 'true_false' | 'free_text' | 'interactive';
  question_text: string;
  user_response: string;
  correct_answer: string;
  is_correct: boolean;
  response_time_ms: number;
  confidence_level?: number | null;
  misconception_log?: MisconceptionLogEntry[];
}

// ============================================================================
// Question Weighting Types (Task 5A.3)
// ============================================================================

/**
 * Phase of question within a learning session
 * Determines weighting strategy for question type selection
 */
export type QuestionPhase = 'pretest' | 'learning' | 'review';

/**
 * Weights for different question types
 * Higher weights increase probability of selecting that question type
 */
export interface QuestionWeights {
  /** Weight for multiple choice questions (0-1) */
  multiple_choice: number;
  /** Weight for true/false questions (0-1) */
  true_false: number;
  /** Weight for free text/short answer questions (0-1) */
  free_text: number;
  /** Weight for interactive/applied questions (0-1) */
  interactive: number;
}

/**
 * Context for calculating question weights
 * Provides factors that influence question type selection
 */
export interface WeightingContext {
  /** Current phase of the learning session */
  phase: QuestionPhase;
  /** Recent accuracy rate (0-1), influences difficulty adjustment */
  recentAccuracy?: number;
  /** Current mastery state for the concept */
  masteryState?: 'new' | 'learning' | 'reviewing' | 'mastered';
  /** Current cognitive capacity assessment */
  cognitiveCapacity?: CognitiveCapacity;
  /** Bloom's taxonomy level for the concept */
  bloomLevel?: 'remember' | 'understand' | 'apply' | 'analyze' | 'evaluate' | 'create';
}
