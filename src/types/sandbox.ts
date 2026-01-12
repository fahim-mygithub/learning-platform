/**
 * Interactive Sandbox Types
 *
 * Types for Phase 6: Interactive Sandbox - a source-agnostic canvas system
 * where AI generates learning interactions based on concept cognitive types.
 *
 * Architecture:
 * - Modal/Full-screen mode (not embedded in feed)
 * - React Native Reanimated DnD for drag-drop
 * - Deterministic evaluation first, AI only for text
 * - FSRS integration via Friction Formula
 *
 * @see openspec/changes/add-interactive-sandbox/proposal.md
 */

import type { CognitiveType, BloomLevel } from './database';

// ============================================================================
// Core Enums
// ============================================================================

/**
 * Scaffold level for fading scaffolding pedagogical model
 * - worked: AI shows complete solution with annotations
 * - scaffold: AI builds 70%, user fills critical 30%
 * - faded: Blank canvas, user reconstructs from memory
 */
export type ScaffoldLevel = 'worked' | 'scaffold' | 'faded';

/**
 * Evaluation mode for sandbox interactions
 * - deterministic: Zone contents matching, sequence order (0ms, $0)
 * - ai_assisted: Semantic similarity for text inputs only (~$0.002-0.01)
 */
export type EvaluationMode = 'deterministic' | 'ai_assisted';

/**
 * Interaction type for sandbox elements
 */
export type SandboxInteractionType =
  | 'matching'
  | 'fill_in_blank'
  | 'sequencing'
  | 'diagram_build'
  | 'branching';

/**
 * Element types within a sandbox interaction
 */
export type SandboxElementType =
  | 'draggable'
  | 'dropzone'
  | 'text_input'
  | 'connector'
  | 'label'
  | 'image';

// ============================================================================
// Element Types
// ============================================================================

/**
 * Position in canvas coordinates
 */
export interface Position {
  x: number;
  y: number;
}

/**
 * Dimensions of an element
 */
export interface Dimensions {
  width: number;
  height: number;
}

/**
 * Element styling configuration
 */
export interface ElementStyle {
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  textColor?: string;
  fontSize?: number;
  fontWeight?: 'normal' | 'bold';
  shadowColor?: string;
  shadowOffset?: { x: number; y: number };
  shadowRadius?: number;
}

/**
 * Image source for image elements
 */
export interface ImageSource {
  uri: string;
  width: number;
  height: number;
  alt?: string;
}

/**
 * A single element within a sandbox interaction
 */
export interface SandboxElement {
  /** Unique identifier for this element */
  id: string;

  /** Type of element */
  type: SandboxElementType;

  /** Initial position in canvas coordinates */
  position: Position;

  /** Element dimensions */
  dimensions: Dimensions;

  /** Text content or image source */
  content: string | ImageSource;

  /** Visual styling */
  style: ElementStyle;

  /** Whether this element can be dragged */
  draggable: boolean;

  /** IDs of dropzones this element can snap to */
  snapTargets?: string[];

  /** IDs of elements this connector links to */
  connections?: string[];

  /** Capacity for dropzones (how many elements it can hold) */
  capacity?: number;

  /** Accessibility label for screen readers */
  accessibilityLabel?: string;
}

// ============================================================================
// Correct State Definitions
// ============================================================================

/**
 * Validation rule types for deterministic evaluation
 */
export type ValidationRuleType =
  | 'exact_match'
  | 'sequence_order'
  | 'connection_map'
  | 'zone_contents';

/**
 * Definition of the correct state for evaluation
 */
export interface CorrectStateDefinition {
  /** For drag-and-drop: dropzoneId -> [elementIds] */
  zoneContents?: Record<string, string[]>;

  /** For sequencing: ordered element IDs */
  sequence?: string[];

  /** For branching: decisionId -> chosen option */
  pathTaken?: Record<string, string>;

  /** For connectors: from -> to element IDs */
  connections?: Array<{ from: string; to: string }>;

  /** Tolerance for partial credit (0.0-1.0) */
  minCorrectPercentage: number;
}

/**
 * Validation rule for deterministic checking
 */
export interface ValidationRule {
  type: ValidationRuleType;
  targetState: CorrectStateDefinition;
}

// ============================================================================
// Scaffolding Types
// ============================================================================

/**
 * Animation step for worked examples
 */
export interface SolutionAnimationStep {
  /** Element ID being moved/highlighted */
  elementId: string;

  /** Target position for the move */
  targetPosition: Position;

  /** Duration of this step in ms */
  durationMs: number;

  /** Annotation to display during this step */
  annotation?: string;
}

/**
 * Solution animation for worked examples
 */
export interface SolutionAnimation {
  steps: SolutionAnimationStep[];
  totalDurationMs: number;
}

/**
 * Ghost outline for scaffold mode
 */
export interface GhostOutline {
  /** Zone ID where ghost appears */
  zoneId: string;

  /** Element ID that should go here */
  targetElementId: string;

  /** Visual hint opacity (0.0-1.0) */
  opacity: number;
}

// ============================================================================
// Core Interaction Type
// ============================================================================

/**
 * Canvas configuration
 */
export interface CanvasConfig {
  width: number;
  height: number;
  backgroundColor: string;
}

/**
 * Rubric for AI-assisted evaluation (text inputs only)
 */
export interface SandboxRubric {
  /** Criteria for evaluation */
  criteria: string[];

  /** Weight for each criterion (0.0-1.0) */
  weights: number[];

  /** Example correct responses */
  exemplars: string[];
}

/**
 * Core sandbox interaction schema
 * Implements composition pattern - NOT extending SampleQuestion
 */
export interface SandboxInteraction {
  // Identity
  /** Unique interaction ID */
  interactionId: string;

  /** Concept this interaction tests */
  conceptId: string;

  /** Cognitive type from concept */
  cognitiveType: CognitiveType;

  /** Bloom's level for this interaction */
  bloomLevel: BloomLevel;

  /** Type of interaction */
  interactionType: SandboxInteractionType;

  // Canvas Configuration
  canvasConfig: CanvasConfig;

  // Elements
  elements: SandboxElement[];

  // Evaluation
  /** The correct state to match against */
  correctState: CorrectStateDefinition;

  /** How to evaluate (deterministic first, AI only for text) */
  evaluationMode: EvaluationMode;

  /** Rubric for AI-assisted evaluation (optional) */
  rubric?: SandboxRubric;

  // Scaffolding (Fading Scaffolding Model)
  scaffoldLevel: ScaffoldLevel;

  /** Progressive hints (shown on request) */
  hints: string[];

  /** For worked examples - solution animation */
  workedSolution?: SolutionAnimation;

  /** For scaffold mode - elements pre-placed */
  preplacedElements?: string[];

  /** For scaffold mode - ghost outlines showing where to place */
  ghostOutlines?: GhostOutline[];

  // Metadata
  /** Estimated time to complete in seconds */
  estimatedTimeSeconds: number;

  /** Difficulty modifier (0.5-2.0, multiplies base difficulty) */
  difficultyModifier: number;

  /** Instructions for the learner */
  instructions: string;
}

// ============================================================================
// Branching Interaction Extension
// ============================================================================

/**
 * Node in a branching state machine (flat normalized structure)
 */
export interface BranchingNode {
  id: string;
  text: string;
  position: Position;
  next: string[]; // IDs of connected nodes
  isCorrectPath: boolean;
  feedback?: string;
}

/**
 * Branching interaction with normalized state machine
 */
export interface BranchingInteraction extends SandboxInteraction {
  cognitiveType: 'conditional' | 'procedural';
  interactionType: 'branching';

  /** Normalized state machine (flat, Redux pattern) */
  nodes: Record<string, BranchingNode>;

  /** Starting node ID */
  initialNodeId: string;

  /** Terminal/goal node IDs */
  terminalNodeIds: string[];
}

/**
 * Branching path validation
 */
export interface BranchingValidation {
  type: 'path_traversal';
  correctPath: string[]; // e.g., ["step_1", "step_2", "step_4"]
  allowPartialCredit: boolean;
}

// ============================================================================
// Evaluation Result Types
// ============================================================================

/**
 * Result from evaluating a sandbox interaction
 */
export interface SandboxEvaluationResult {
  /** Interaction that was evaluated */
  interactionId: string;

  /** Concept being tested */
  conceptId: string;

  /** Score achieved (0.0-1.0) */
  score: number;

  /** Whether the interaction was passed */
  passed: boolean;

  /** Number of submission attempts */
  attemptCount: number;

  /** Number of hints used */
  hintsUsed: number;

  /** Time to complete in milliseconds */
  timeToCompleteMs: number;

  /** Feedback message for the learner */
  feedback: string;

  /** Misconception detected (if any) */
  misconceptionDetected?: string;

  /** Detailed element-by-element results */
  elementResults?: Array<{
    elementId: string;
    correct: boolean;
    expectedZone?: string;
    actualZone?: string;
  }>;
}

/**
 * FSRS rating (1-4) derived from sandbox performance
 * Using "Friction Formula" where hints/mistakes are the signal
 *
 * | Condition | Rating |
 * |-----------|--------|
 * | >3 wrong or gives up | Again (1) |
 * | >1 hint OR time >2x baseline | Hard (2) |
 * | 0 hints, time 0.8-1.5x baseline | Good (3) |
 * | 0 hints, time <0.8x baseline | Easy (4) |
 */
export type FSRSRating = 1 | 2 | 3 | 4;

// ============================================================================
// Feed Integration Types
// ============================================================================

/**
 * Sandbox item for the learning feed
 * Follows same pattern as SynthesisPhaseItem
 */
export interface SandboxItem {
  id: string;
  type: 'sandbox';
  conceptId: string;
  conceptName: string;
  interaction: SandboxInteraction;
  scaffoldLevel: ScaffoldLevel;
  estimatedTimeSeconds: number;
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard for SandboxInteraction
 */
export function isSandboxInteraction(
  obj: unknown
): obj is SandboxInteraction {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'interactionId' in obj &&
    'conceptId' in obj &&
    'cognitiveType' in obj &&
    'elements' in obj &&
    'correctState' in obj &&
    'scaffoldLevel' in obj
  );
}

/**
 * Type guard for BranchingInteraction
 */
export function isBranchingInteraction(
  interaction: SandboxInteraction
): interaction is BranchingInteraction {
  return (
    interaction.interactionType === 'branching' &&
    'nodes' in interaction &&
    'initialNodeId' in interaction
  );
}

/**
 * Type guard for draggable elements
 */
export function isDraggableElement(element: SandboxElement): boolean {
  return element.draggable === true;
}

/**
 * Type guard for dropzone elements
 */
export function isDropzoneElement(element: SandboxElement): boolean {
  return element.type === 'dropzone';
}

/**
 * Type guard for SandboxItem in feed
 */
export function isSandboxItem(
  item: { type: string }
): item is SandboxItem {
  return item.type === 'sandbox';
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Baseline time calculation constants
 * baselineTimeMs = (elementCount * ELEMENT_TIME_MS) + (wordCount / WORDS_PER_SECOND * 1000)
 */
export const BASELINE_TIME_CONSTANTS = {
  /** Milliseconds per draggable element */
  ELEMENT_TIME_MS: 3500,

  /** Words per second for reading instructions */
  WORDS_PER_SECOND: 3,
} as const;

/**
 * FSRS rating thresholds (Friction Formula)
 */
export const FSRS_THRESHOLDS = {
  /** Max wrong attempts before "Again" rating */
  MAX_ATTEMPTS_AGAIN: 3,

  /** Max hints before "Hard" rating */
  MAX_HINTS_HARD: 1,

  /** Time ratio above which "Hard" is given */
  TIME_RATIO_HARD: 2.0,

  /** Time ratio range for "Good" rating */
  TIME_RATIO_GOOD_MIN: 0.8,
  TIME_RATIO_GOOD_MAX: 1.5,

  /** Time ratio below which "Easy" is given */
  TIME_RATIO_EASY: 0.8,
} as const;

/**
 * Default canvas configuration
 */
export const DEFAULT_CANVAS_CONFIG: CanvasConfig = {
  width: 350,
  height: 500,
  backgroundColor: '#1a1a2e',
};

/**
 * Minimum touch target size for accessibility (44px per Apple HIG)
 */
export const MIN_TOUCH_TARGET_SIZE = 44;

/**
 * Sandbox insertion interval in feed (like SYNTHESIS_INTERVAL)
 */
export const SANDBOX_INTERVAL = 7;
