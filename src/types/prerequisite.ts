/**
 * Prerequisite Assessment Types
 * Types for Phase 4 prerequisite detection and gap remediation
 */

// ============================================================================
// Prerequisite Types
// ============================================================================

/**
 * Source of prerequisite identification
 */
export type PrerequisiteSource = 'mentioned_only' | 'ai_inferred';

/**
 * Gap severity levels
 */
export type GapSeverity = 'none' | 'minor' | 'significant' | 'critical';

/**
 * Pretest question difficulty levels
 */
export type PretestDifficulty = 'basic' | 'intermediate';

/**
 * Prerequisite record from database
 * Represents a prerequisite concept that may need assessment
 */
export interface Prerequisite {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  source: PrerequisiteSource;
  confidence: number; // 0-1
  domain: string | null;
  created_at: string;
}

/**
 * Data for inserting a new prerequisite
 */
export interface PrerequisiteInsert {
  project_id: string;
  name: string;
  description?: string | null;
  source: PrerequisiteSource;
  confidence: number;
  domain?: string | null;
}

/**
 * Data for updating a prerequisite
 */
export interface PrerequisiteUpdate {
  name?: string;
  description?: string | null;
  source?: PrerequisiteSource;
  confidence?: number;
  domain?: string | null;
}

// ============================================================================
// Pretest Question Types
// ============================================================================

/**
 * Pretest question record from database
 * Multiple choice question for assessing prerequisite knowledge
 */
export interface PretestQuestion {
  id: string;
  prerequisite_id: string;
  question_text: string;
  options: string[]; // 4 options
  correct_index: number;
  explanation: string | null;
  difficulty: PretestDifficulty;
  created_at: string;
}

/**
 * Data for inserting a new pretest question
 */
export interface PretestQuestionInsert {
  prerequisite_id: string;
  question_text: string;
  options: string[];
  correct_index: number;
  explanation?: string | null;
  difficulty: PretestDifficulty;
}

/**
 * Data for updating a pretest question
 */
export interface PretestQuestionUpdate {
  question_text?: string;
  options?: string[];
  correct_index?: number;
  explanation?: string | null;
  difficulty?: PretestDifficulty;
}

// ============================================================================
// Pretest Session Types
// ============================================================================

/**
 * Pretest session record from database
 * Tracks a user's pretest assessment session
 */
export interface PretestSession {
  id: string;
  user_id: string;
  project_id: string;
  started_at: string;
  completed_at: string | null;
  total_questions: number;
  correct_answers: number;
}

/**
 * Data for inserting a new pretest session
 */
export interface PretestSessionInsert {
  user_id: string;
  project_id: string;
  total_questions?: number;
  correct_answers?: number;
  completed_at?: string | null;
}

/**
 * Data for updating a pretest session
 */
export interface PretestSessionUpdate {
  completed_at?: string | null;
  total_questions?: number;
  correct_answers?: number;
}

// ============================================================================
// Pretest Response Types
// ============================================================================

/**
 * Pretest response record from database
 * Individual response to a pretest question
 */
export interface PretestResponse {
  id: string;
  pretest_session_id: string;
  question_id: string;
  selected_index: number;
  is_correct: boolean;
  response_time_ms: number | null;
  created_at: string;
}

/**
 * Data for inserting a new pretest response
 */
export interface PretestResponseInsert {
  pretest_session_id: string;
  question_id: string;
  selected_index: number;
  is_correct: boolean;
  response_time_ms?: number | null;
}

/**
 * Data for updating a pretest response
 */
export interface PretestResponseUpdate {
  selected_index?: number;
  is_correct?: boolean;
  response_time_ms?: number | null;
}

// ============================================================================
// Prerequisite Gap Types
// ============================================================================

/**
 * Prerequisite gap record from database
 * Identifies knowledge gaps for a user on a specific prerequisite
 */
export interface PrerequisiteGap {
  id: string;
  user_id: string;
  prerequisite_id: string;
  pretest_session_id: string;
  score: number; // 0-100
  gap_severity: GapSeverity;
  questions_attempted: number;
  questions_correct: number;
  created_at: string;
}

/**
 * Data for inserting a new prerequisite gap
 */
export interface PrerequisiteGapInsert {
  user_id: string;
  prerequisite_id: string;
  pretest_session_id: string;
  score: number;
  gap_severity: GapSeverity;
  questions_attempted: number;
  questions_correct: number;
}

/**
 * Data for updating a prerequisite gap
 */
export interface PrerequisiteGapUpdate {
  score?: number;
  gap_severity?: GapSeverity;
  questions_attempted?: number;
  questions_correct?: number;
}

// ============================================================================
// Mini-Lesson Types
// ============================================================================

/**
 * Mini-lesson record from database
 * Short remediation content for addressing prerequisite gaps
 */
export interface MiniLesson {
  id: string;
  prerequisite_id: string;
  title: string;
  content_markdown: string;
  key_points: string[];
  estimated_minutes: number;
  created_at: string;
}

/**
 * Data for inserting a new mini-lesson
 */
export interface MiniLessonInsert {
  prerequisite_id: string;
  title: string;
  content_markdown: string;
  key_points?: string[];
  estimated_minutes: number;
}

/**
 * Data for updating a mini-lesson
 */
export interface MiniLessonUpdate {
  title?: string;
  content_markdown?: string;
  key_points?: string[];
  estimated_minutes?: number;
}

// ============================================================================
// Prerequisite Progress Types
// ============================================================================

/**
 * Prerequisite progress record from database
 * Tracks user progress through mini-lessons
 */
export interface PrerequisiteProgress {
  id: string;
  user_id: string;
  mini_lesson_id: string;
  started_at: string | null;
  completed_at: string | null;
  post_test_score: number | null;
}

/**
 * Data for inserting a new prerequisite progress record
 */
export interface PrerequisiteProgressInsert {
  user_id: string;
  mini_lesson_id: string;
  started_at?: string | null;
  completed_at?: string | null;
  post_test_score?: number | null;
}

/**
 * Data for updating a prerequisite progress record
 */
export interface PrerequisiteProgressUpdate {
  started_at?: string | null;
  completed_at?: string | null;
  post_test_score?: number | null;
}
