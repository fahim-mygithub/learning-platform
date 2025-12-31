/**
 * Three-Pass Pedagogical Analysis Types
 *
 * These types support the full learning optimization pipeline:
 * - Content extraction with pedagogical awareness
 * - Question generation based on Bloom's level and cognitive type
 * - AI tutoring with scaffolding depth
 * - Adaptive assessment with tier-based weighting
 */

import { CognitiveType } from './database';

// ============================================================================
// Core Enums
// ============================================================================

/**
 * Content type classification from Pass 1 (Rhetorical Router)
 * Determines extraction constraints and time multipliers
 */
export type ContentType = 'survey' | 'conceptual' | 'procedural';

/**
 * Bloom's Taxonomy levels - drives question generation and scaffolding
 * - remember: Recall/recognition questions
 * - understand: Explain/summarize questions
 * - apply: Problem-solving exercises
 * - analyze: Compare/contrast, case studies
 * - evaluate: Critique, judge quality
 * - create: Design challenges, synthesis
 */
export type BloomLevel =
  | 'remember'
  | 'understand'
  | 'apply'
  | 'analyze'
  | 'evaluate'
  | 'create';

/**
 * Bloom's level ordering for comparison
 */
export const BLOOM_LEVEL_ORDER: BloomLevel[] = [
  'remember',
  'understand',
  'apply',
  'analyze',
  'evaluate',
  'create',
];

/**
 * Bloom's Taxonomy verbs for learning objective generation
 * Each level maps to action verbs appropriate for that cognitive level
 */
export const BLOOM_VERBS: Record<BloomLevel, string[]> = {
  remember: ['Define', 'List', 'Recall', 'Identify', 'Name'],
  understand: ['Explain', 'Describe', 'Summarize', 'Classify', 'Compare'],
  apply: ['Apply', 'Demonstrate', 'Use', 'Solve', 'Calculate'],
  analyze: [
    'Analyze',
    'Differentiate',
    'Examine',
    'Compare/Contrast',
    'Deconstruct',
  ],
  evaluate: ['Evaluate', 'Critique', 'Judge', 'Justify', 'Assess'],
  create: ['Create', 'Design', 'Develop', 'Construct', 'Formulate'],
};

/**
 * Concept tier classification from Understanding by Design
 * - 1: Familiar (background knowledge, mentioned but not core)
 * - 2: Important (core concepts explained in content)
 * - 3: Enduring Understanding (thesis-level concepts)
 *
 * Tier drives:
 * - Question prioritization (focus on tier 2-3)
 * - Tutoring depth (more explanation for tier 3)
 * - Assessment weighting (tier 3 required for completion)
 */
export type ConceptTier = 1 | 2 | 3;

/**
 * Extraction depth setting from Pass 1
 */
export type ExtractionDepth = 'mentions' | 'explanations';

/**
 * Question types for assessment specification
 * Maps to different cognitive demands and Bloom's levels
 */
export type QuestionType =
  | 'definition_recall'
  | 'true_false'
  | 'multiple_choice'
  | 'comparison'
  | 'sequence'
  | 'cause_effect'
  | 'application';

/**
 * Difficulty level for module summaries
 * Used for user-facing content categorization
 */
export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';

// ============================================================================
// Pass 1: Rhetorical Router Types
// ============================================================================

/**
 * Result from Pass 1: Content classification and constraint setting
 */
export interface Pass1Result {
  /** Content type classification */
  contentType: ContentType;

  /** Thesis statement if identified */
  thesisStatement: string | null;

  /** Maximum Bloom's level this content can support */
  bloomCeiling: BloomLevel;

  /** Time multiplier for calibration (survey=1.5, conceptual=2.5, procedural=4.0) */
  modeMultiplier: number;

  /** Whether to extract mentions or only explanations */
  extractionDepth: ExtractionDepth;

  /** Source duration in seconds (for time calibration) */
  sourceDurationSeconds: number | null;

  /** Concepts per minute (for density modifier) */
  conceptDensity: number | null;

  /** Number of topics/sections identified in content */
  topicCount?: number;
}

/**
 * Content analysis record stored in database
 */
export interface ContentAnalysis {
  id: string;
  source_id: string;
  project_id: string;
  content_type: ContentType;
  thesis_statement: string | null;
  bloom_ceiling: BloomLevel;
  mode_multiplier: number;
  extraction_depth: ExtractionDepth;
  source_duration_seconds: number | null;
  concept_density: number | null;
  /** Number of topics/sections identified in content (for multi-topic detection) */
  topic_count?: number | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/**
 * Insert type for content_analyses table
 */
export interface ContentAnalysisInsert {
  source_id: string;
  project_id: string;
  content_type: ContentType;
  thesis_statement?: string | null;
  bloom_ceiling: BloomLevel;
  mode_multiplier: number;
  extraction_depth?: ExtractionDepth;
  source_duration_seconds?: number | null;
  concept_density?: number | null;
  topic_count?: number | null;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Learning Objectives Types
// ============================================================================

/**
 * Learning objective aligned with Bloom's Taxonomy
 * Provides measurable learning outcomes for each concept
 */
export interface LearningObjective {
  /** Bloom's action verb (e.g., "Define", "Explain", "Compare") */
  bloom_verb: string;

  /** Complete objective statement (e.g., "You will be able to...") */
  objective_statement: string;

  /** Criteria that demonstrate mastery of this objective */
  success_criteria: string[];
}

// ============================================================================
// Assessment Specification Types
// ============================================================================

/**
 * Sample question for concept assessment
 * Used for question generation and quiz building
 */
export interface SampleQuestion {
  /** Type of question determining format and cognitive demand */
  question_type: QuestionType;

  /** The question text to present to the learner */
  question_text: string;

  /** The correct answer */
  correct_answer: string;

  /** Incorrect options for multiple choice (optional) */
  distractors?: string[];

  /** Explanation of why the answer is correct (optional) */
  explanation?: string;
}

/**
 * Assessment specification for a concept
 * Guides question generation and mastery evaluation
 */
export interface AssessmentSpec {
  /** Question types suitable for this concept's Bloom level */
  appropriate_question_types: QuestionType[];

  /** Question types to avoid for this concept */
  inappropriate_question_types: QuestionType[];

  /** Pre-generated sample questions */
  sample_questions: SampleQuestion[];

  /** Observable behaviors indicating mastery */
  mastery_indicators: string[];

  /** Score threshold for mastery (0.0-1.0) */
  mastery_threshold: number;
}

// ============================================================================
// Source Mapping Types
// ============================================================================

/**
 * Timestamp mapping to source content
 * Enables navigation back to original material
 */
export interface SourceMapping {
  /** Primary segment where concept is explained */
  primary_segment: {
    start_sec: number;
    end_sec: number;
  };

  /** Key moments within the content */
  key_moments: Array<{
    timestamp_sec: number;
    description: string;
  }>;

  /** Suggested clip for review/recap */
  review_clip: {
    start_sec: number;
    end_sec: number;
  };
}

// ============================================================================
// Misconception Types
// ============================================================================

/**
 * Common misconception and remediation strategy
 * Supports adaptive tutoring and quiz feedback
 */
export interface Misconception {
  /** What learners commonly get wrong */
  misconception: string;

  /** The correct understanding */
  reality: string;

  /** Pattern to detect this misconception in quiz responses */
  trigger_detection: string;

  /** Remediation strategy when detected */
  remediation: string;
}

// ============================================================================
// Module Summary Types
// ============================================================================

/**
 * User-facing module summary
 * Provides overview for content preview and navigation
 */
export interface ModuleSummary {
  /** Module title */
  title: string;

  /** One paragraph summary of the module content */
  one_paragraph_summary: string;

  /** 3-5 learning outcomes in bullet form */
  learning_outcomes: string[];

  /** Prerequisite knowledge */
  prerequisites: {
    /** Required prerequisites (must have) */
    required: string[];
    /** Helpful prerequisites (nice to have) */
    helpful: string[];
  };

  /** Time investment breakdown */
  time_investment: {
    /** Minutes spent on source material */
    source_minutes: number;
    /** Minutes spent on review activities */
    review_minutes: number;
    /** Total learning time */
    total_minutes: number;
  };

  /** Overall difficulty classification */
  difficulty_level: DifficultyLevel;

  /** Explanation of why this difficulty level was assigned */
  difficulty_explanation: string;

  /** Skills/competencies gained after completion */
  skills_gained: string[];
}

// ============================================================================
// Pass 2: Enhanced Concept Extraction Types
// ============================================================================

/**
 * Enhanced extracted concept with pedagogical metadata
 * Used during extraction before database storage
 */
export interface EnhancedExtractedConcept {
  /** Concept name (2-5 words) */
  name: string;

  /** Clear definition (1-2 sentences) */
  definition: string;

  /** Key learning points (3-5 items) */
  key_points: string[];

  /** Cognitive type for activity selection */
  cognitive_type: CognitiveType;

  /** Difficulty score 1-10 */
  difficulty: number;

  /** Source timestamps for video concepts */
  source_timestamps?: { start: number; end: number }[];

  // Pedagogical metadata (new in three-pass)

  /**
   * Concept tier (1-3)
   * Drives question prioritization and assessment weighting
   */
  tier: ConceptTier;

  /**
   * THE CRITICAL FLAG
   * true = concept mentioned but NOT explained in source
   * Drives: exclusion from roadmap, glossary-only display, distractor generation
   */
  mentioned_only: boolean;

  /**
   * Bloom's taxonomy level
   * Drives: question type, scaffolding depth, scoring rubric
   */
  bloom_level: BloomLevel;

  /**
   * Whether source provided a definition
   * If false, AI tutor must provide external definition
   */
  definition_provided: boolean;

  /**
   * Suggested percentage of learning time
   * Used for session planning in AI tutor
   */
  time_allocation_percent: number;

  // Enhanced pedagogical fields (optional enrichments)

  /**
   * One sentence summary of the concept
   * Used for quick reference and tooltips
   */
  one_sentence_summary?: string;

  /**
   * Why this concept matters to the learner
   * Provides motivation and context
   */
  why_it_matters?: string;

  /**
   * Learning objectives for this concept
   * Provides measurable outcomes aligned with Bloom's Taxonomy
   */
  learning_objectives?: LearningObjective[];

  /**
   * Assessment specification for this concept
   * Guides question generation and mastery evaluation
   */
  assessment_spec?: AssessmentSpec;

  /**
   * Source mapping with timestamps
   * Enables navigation back to original material
   */
  source_mapping?: SourceMapping;

  /**
   * Common misconceptions about this concept
   * Supports adaptive tutoring and quiz feedback
   */
  common_misconceptions?: Misconception[];
}

/**
 * Result from Pass 2: Concepts with Pass 1 constraints applied
 */
export interface Pass2Result {
  /** Extracted concepts with pedagogical metadata */
  concepts: EnhancedExtractedConcept[];

  /** Pass 1 constraints that were applied */
  pass1Constraints: Pass1Result;

  /** Count of concepts filtered as mentioned_only */
  mentionedOnlyCount: number;

  /** Count of concepts included as learning objectives */
  learningObjectiveCount: number;
}

// ============================================================================
// Pass 3: Roadmap Architect Types
// ============================================================================

/**
 * RST-based relationship types for richer semantic graph
 */
export type RSTRelationshipType =
  | 'prerequisite'
  | 'causal'
  | 'taxonomic'
  | 'temporal'
  | 'contrasts_with'
  | 'elaboration_of'
  | 'evidence_for'
  | 'example_of'
  | 'definition_of';

/**
 * Elaboration Theory level in roadmap
 */
export interface ElaborationLevel {
  /** Level number (0 = epitome, 1+ = elaborations) */
  level: number;

  /** Level title */
  title: string;

  /** Concept IDs in this level */
  concept_ids: string[];

  /** Estimated time in minutes */
  estimated_minutes: number;

  /** Target Bloom's level for this level */
  bloom_target?: BloomLevel;
}

/**
 * Time calibration formula components
 * Learning_Time = Source_Duration × Mode × Density × Knowledge
 */
export interface TimeCalibration {
  /** From Pass 1 (survey=1.5, conceptual=2.5, procedural=4.0) */
  mode_multiplier: number;

  /** Based on concepts per minute (low=0.8, medium=1.0, high=1.5) */
  density_modifier: number;

  /** Based on cognitive types (factual=0.8, conceptual=1.0, procedural=1.5) */
  knowledge_type_factor: number;

  /** Source duration in seconds */
  source_duration_seconds: number | null;

  /** Final calculated learning time */
  calculated_learning_time_minutes: number;
}

/**
 * Validation gate results
 */
export interface ValidationResults {
  /** Concept count reasonable for content length */
  proportionality_passed: boolean;

  /** No concepts exceed Bloom's ceiling */
  bloom_ceiling_passed: boolean;

  /** Learning time within reasonable bounds */
  time_sanity_passed: boolean;

  /** Tier 2-3 concepts have learning objectives (optional) */
  learning_objectives_passed?: boolean;

  /** Assessment spec has appropriate question types for Bloom level (optional) */
  assessment_spec_passed?: boolean;

  /** Source mapping has valid timestamps (optional) */
  source_mapping_passed?: boolean;

  /** Warning messages for failed checks */
  warnings: string[];
}

/**
 * Result from Pass 3: Roadmap with elaboration hierarchy
 */
export interface Pass3Result {
  /** Epitome (thesis) concept ID at Level 0 */
  epitomeConceptId: string | null;

  /** Elaboration levels */
  levels: ElaborationLevel[];

  /** RST-based relationships identified */
  relationships: Array<{
    from_concept_id: string;
    to_concept_id: string;
    relationship_type: RSTRelationshipType;
    strength: number;
  }>;

  /** Time calibration details */
  timeCalibration: TimeCalibration;

  /** Validation gate results */
  validationResults: ValidationResults;
}

// ============================================================================
// Pipeline Types
// ============================================================================

/**
 * Extended pipeline stages with three-pass architecture
 */
export type ThreePassPipelineStage =
  | 'pending'
  | 'transcribing'
  | 'routing_content'            // Pass 1
  | 'extracting_concepts'        // Pass 2 (enhanced)
  | 'generating_misconceptions'  // Misconception generation (after Pass 2)
  | 'building_graph'
  | 'architecting_roadmap'       // Pass 3 (enhanced)
  | 'generating_summary'         // Module summary generation (after Pass 3)
  | 'validating'                 // Validation gate
  | 'completed'
  | 'failed';

/**
 * Progress allocation for each stage
 */
export const THREE_PASS_STAGE_PROGRESS: Record<
  ThreePassPipelineStage,
  { start: number; end: number }
> = {
  pending: { start: 0, end: 0 },
  transcribing: { start: 0, end: 15 },
  routing_content: { start: 15, end: 25 },
  extracting_concepts: { start: 25, end: 40 },
  generating_misconceptions: { start: 40, end: 50 },
  building_graph: { start: 50, end: 60 },
  architecting_roadmap: { start: 60, end: 75 },
  generating_summary: { start: 75, end: 85 },
  validating: { start: 85, end: 100 },
  completed: { start: 100, end: 100 },
  failed: { start: 0, end: 0 },
};

/**
 * Human-readable stage descriptions
 */
export const THREE_PASS_STAGE_DESCRIPTIONS: Record<
  ThreePassPipelineStage,
  string
> = {
  pending: 'Waiting to start',
  transcribing: 'Transcribing audio',
  routing_content: 'Analyzing content type',
  extracting_concepts: 'Extracting concepts',
  generating_misconceptions: 'Generating misconceptions',
  building_graph: 'Building knowledge graph',
  architecting_roadmap: 'Creating learning roadmap',
  generating_summary: 'Generating module summary',
  validating: 'Validating results',
  completed: 'Analysis complete',
  failed: 'Analysis failed',
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Compare two Bloom's levels
 * @returns negative if a < b, 0 if equal, positive if a > b
 */
export function compareBloomLevels(a: BloomLevel, b: BloomLevel): number {
  return BLOOM_LEVEL_ORDER.indexOf(a) - BLOOM_LEVEL_ORDER.indexOf(b);
}

/**
 * Check if a Bloom's level exceeds a ceiling
 */
export function exceedsBloomCeiling(
  level: BloomLevel,
  ceiling: BloomLevel
): boolean {
  return compareBloomLevels(level, ceiling) > 0;
}

/**
 * Get mode multiplier for content type
 */
export function getModeMultiplier(contentType: ContentType): number {
  switch (contentType) {
    case 'survey':
      return 1.5;
    case 'conceptual':
      return 2.5;
    case 'procedural':
      return 4.0;
  }
}

/**
 * Get default Bloom's ceiling for content type
 */
export function getDefaultBloomCeiling(contentType: ContentType): BloomLevel {
  switch (contentType) {
    case 'survey':
      return 'understand';
    case 'conceptual':
      return 'analyze';
    case 'procedural':
      return 'apply';
  }
}

/**
 * Get tier label for display
 */
export function getTierLabel(tier: ConceptTier): string {
  switch (tier) {
    case 1:
      return 'Familiar';
    case 2:
      return 'Important';
    case 3:
      return 'Enduring';
  }
}

/**
 * Get Bloom's level label for display
 */
export function getBloomLevelLabel(level: BloomLevel): string {
  return level.charAt(0).toUpperCase() + level.slice(1);
}
