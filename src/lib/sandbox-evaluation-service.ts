/**
 * Sandbox Evaluation Service
 *
 * Provides deterministic evaluation for sandbox interactions.
 * Uses the "Friction Formula" for FSRS rating derivation where
 * hints and mistakes are the signal, not just time.
 *
 * Evaluation Strategy (Gemini Round 2):
 * - Layer 1: Deterministic (zone contents, sequence order) - 0ms, $0
 * - Layer 2: AI-assisted (text inputs only) - ~$0.002-0.01
 *
 * FSRS Rating Table (Friction Formula):
 * | Condition | Rating |
 * |-----------|--------|
 * | >3 wrong or gives up | Again (1) |
 * | >1 hint OR time >2x baseline | Hard (2) |
 * | 0 hints, time 0.8-1.5x baseline | Good (3) |
 * | 0 hints, time <0.8x baseline | Easy (4) |
 *
 * @see openspec/changes/add-interactive-sandbox/proposal.md
 */

import type {
  SandboxInteraction,
  SandboxEvaluationResult,
  CorrectStateDefinition,
  FSRSRating,
} from '../types/sandbox';
import {
  BASELINE_TIME_CONSTANTS,
  FSRS_THRESHOLDS,
} from '../types/sandbox';

// ============================================================================
// Baseline Time Calculation
// ============================================================================

/**
 * Calculate baseline time for an interaction based on complexity
 * baselineTimeMs = (elementCount * 3500) + (wordCount / 3 * 1000)
 */
export function calculateBaselineTime(interaction: SandboxInteraction): number {
  const elementCount = interaction.elements.filter((e) => e.draggable).length;

  // Count words in instructions and hints
  const instructionWords = interaction.instructions.split(/\s+/).length;
  const hintWords = interaction.hints.reduce(
    (sum, hint) => sum + hint.split(/\s+/).length,
    0
  );
  const totalWords = instructionWords + hintWords;

  const elementTime = elementCount * BASELINE_TIME_CONSTANTS.ELEMENT_TIME_MS;
  const readingTime =
    (totalWords / BASELINE_TIME_CONSTANTS.WORDS_PER_SECOND) * 1000;

  const baselineMs = elementTime + readingTime;

  console.log('[SandboxEval] Baseline time calculated:', {
    elementCount,
    totalWords,
    baselineMs,
  });

  return baselineMs;
}

// ============================================================================
// Deterministic Evaluation (Layer 1)
// ============================================================================

/**
 * Evaluate drag-and-drop interaction by comparing zone contents
 * Returns score 0.0-1.0
 */
export function evaluateDragDrop(
  userState: Record<string, string[]>,
  correctState: CorrectStateDefinition
): { score: number; elementResults: SandboxEvaluationResult['elementResults'] } {
  if (!correctState.zoneContents) {
    return { score: 1, elementResults: [] };
  }

  const results: SandboxEvaluationResult['elementResults'] = [];
  let correctCount = 0;
  let totalCount = 0;

  for (const [zoneId, expectedElements] of Object.entries(
    correctState.zoneContents
  )) {
    const actualElements = userState[zoneId] || [];

    for (const expectedElement of expectedElements) {
      totalCount++;
      const isCorrect = actualElements.includes(expectedElement);

      results.push({
        elementId: expectedElement,
        correct: isCorrect,
        expectedZone: zoneId,
        actualZone: Object.entries(userState).find(([, elements]) =>
          elements.includes(expectedElement)
        )?.[0],
      });

      if (isCorrect) {
        correctCount++;
      }
    }
  }

  const score = totalCount > 0 ? correctCount / totalCount : 0;

  console.log('[SandboxEval] Drag-drop evaluation:', {
    correctCount,
    totalCount,
    score,
  });

  return { score, elementResults: results };
}

/**
 * Evaluate sequence interaction using Levenshtein distance
 * Returns score 0.0-1.0
 */
export function evaluateSequence(
  userSequence: string[],
  correctState: CorrectStateDefinition
): { score: number; elementResults: SandboxEvaluationResult['elementResults'] } {
  if (!correctState.sequence) {
    return { score: 1, elementResults: [] };
  }

  const correctSequence = correctState.sequence;
  const distance = calculateLevenshteinDistance(userSequence, correctSequence);
  const maxDistance = Math.max(userSequence.length, correctSequence.length);
  const score = maxDistance > 0 ? 1 - distance / maxDistance : 1;

  // Build element results
  const results: SandboxEvaluationResult['elementResults'] = userSequence.map(
    (elementId, index) => ({
      elementId,
      correct: correctSequence[index] === elementId,
      expectedZone: `position_${correctSequence.indexOf(elementId)}`,
      actualZone: `position_${index}`,
    })
  );

  console.log('[SandboxEval] Sequence evaluation:', {
    userSequence,
    correctSequence,
    distance,
    score,
  });

  return { score, elementResults: results };
}

/**
 * Calculate Levenshtein distance between two sequences
 */
function calculateLevenshteinDistance(a: string[], b: string[]): number {
  const m = a.length;
  const n = b.length;

  // Create distance matrix
  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));

  // Initialize first column
  for (let i = 0; i <= m; i++) {
    dp[i][0] = i;
  }

  // Initialize first row
  for (let j = 0; j <= n; j++) {
    dp[0][j] = j;
  }

  // Fill in the rest
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }

  return dp[m][n];
}

/**
 * Evaluate connection/branching interaction
 * Returns score 0.0-1.0
 */
export function evaluateConnections(
  userConnections: Array<{ from: string; to: string }>,
  correctState: CorrectStateDefinition
): { score: number; elementResults: SandboxEvaluationResult['elementResults'] } {
  if (!correctState.connections) {
    return { score: 1, elementResults: [] };
  }

  const correctConnections = correctState.connections;
  let correctCount = 0;

  const results: SandboxEvaluationResult['elementResults'] = [];

  for (const correctConn of correctConnections) {
    const found = userConnections.some(
      (userConn) =>
        userConn.from === correctConn.from && userConn.to === correctConn.to
    );

    results.push({
      elementId: `${correctConn.from}->${correctConn.to}`,
      correct: found,
    });

    if (found) {
      correctCount++;
    }
  }

  const score =
    correctConnections.length > 0
      ? correctCount / correctConnections.length
      : 1;

  console.log('[SandboxEval] Connection evaluation:', {
    correctCount,
    total: correctConnections.length,
    score,
  });

  return { score, elementResults: results };
}

// ============================================================================
// Main Evaluation Function
// ============================================================================

/**
 * Evaluate a sandbox interaction and return result
 */
export function evaluateSandboxInteraction(
  interaction: SandboxInteraction,
  userState: {
    zoneContents?: Record<string, string[]>;
    sequence?: string[];
    connections?: Array<{ from: string; to: string }>;
    pathTaken?: Record<string, string>;
  },
  attemptCount: number,
  hintsUsed: number,
  timeToCompleteMs: number
): SandboxEvaluationResult {
  console.log('[SandboxEval] Evaluating:', interaction.interactionId);

  let score = 0;
  let elementResults: SandboxEvaluationResult['elementResults'] = [];

  // Evaluate based on interaction type
  switch (interaction.interactionType) {
    case 'matching':
    case 'fill_in_blank':
    case 'diagram_build': {
      const result = evaluateDragDrop(
        userState.zoneContents || {},
        interaction.correctState
      );
      score = result.score;
      elementResults = result.elementResults;
      break;
    }

    case 'sequencing': {
      const result = evaluateSequence(
        userState.sequence || [],
        interaction.correctState
      );
      score = result.score;
      elementResults = result.elementResults;
      break;
    }

    case 'branching': {
      const result = evaluateConnections(
        userState.connections || [],
        interaction.correctState
      );
      score = result.score;
      elementResults = result.elementResults;
      break;
    }
  }

  // Apply minimum correct percentage threshold
  const passed = score >= interaction.correctState.minCorrectPercentage;

  // Generate feedback based on result
  const feedback = generateFeedback(score, passed, attemptCount, hintsUsed);

  const result: SandboxEvaluationResult = {
    interactionId: interaction.interactionId,
    conceptId: interaction.conceptId,
    score,
    passed,
    attemptCount,
    hintsUsed,
    timeToCompleteMs,
    feedback,
    elementResults,
  };

  console.log('[SandboxEval] Result:', {
    score: result.score,
    passed: result.passed,
    attemptCount: result.attemptCount,
  });

  return result;
}

/**
 * Generate feedback message based on evaluation result
 */
function generateFeedback(
  score: number,
  passed: boolean,
  attemptCount: number,
  hintsUsed: number
): string {
  if (passed) {
    if (score === 1 && hintsUsed === 0 && attemptCount === 1) {
      return 'Perfect! You got it right on the first try without any hints.';
    } else if (score === 1) {
      return 'Excellent! All elements are correctly placed.';
    } else if (score >= 0.8) {
      return `Great job! You scored ${Math.round(score * 100)}%. Just a few adjustments needed.`;
    } else {
      return `Good effort! You scored ${Math.round(score * 100)}% which meets the threshold.`;
    }
  } else {
    if (attemptCount >= FSRS_THRESHOLDS.MAX_ATTEMPTS_AGAIN) {
      return `You've made ${attemptCount} attempts. Try reviewing the concept first.`;
    } else if (score >= 0.5) {
      return `You're getting close with ${Math.round(score * 100)}%. Try again!`;
    } else {
      return `Score: ${Math.round(score * 100)}%. Consider using a hint to help you.`;
    }
  }
}

// ============================================================================
// FSRS Rating Derivation (Friction Formula)
// ============================================================================

/**
 * Derive FSRS rating from sandbox evaluation result
 *
 * Friction Formula (Gemini Round 2):
 * - Time is noisy; hints and mistakes are the signal
 *
 * | Condition | Rating | Reasoning |
 * |-----------|--------|-----------|
 * | User gives up, or >3 wrong submissions | Again (1) | Total retrieval failure |
 * | Correct, but >1 hint OR time >2x baseline | Hard (2) | High cognitive cost |
 * | Correct, 0 hints, time 0.8-1.5x baseline | Good (3) | Ideal desirable difficulty |
 * | Correct, 0 hints, time <0.8x baseline | Easy (4) | Too trivial, increase interval |
 */
export function deriveRating(
  result: SandboxEvaluationResult,
  baselineTimeMs: number
): FSRSRating {
  const { passed, attemptCount, hintsUsed, timeToCompleteMs } = result;
  const timeRatio = timeToCompleteMs / baselineTimeMs;

  let rating: FSRSRating;

  // Rule 1: Complete failure
  if (!passed || attemptCount > FSRS_THRESHOLDS.MAX_ATTEMPTS_AGAIN) {
    rating = 1; // Again
  }
  // Rule 2: High friction (hints or slow)
  else if (
    hintsUsed > FSRS_THRESHOLDS.MAX_HINTS_HARD ||
    timeRatio > FSRS_THRESHOLDS.TIME_RATIO_HARD
  ) {
    rating = 2; // Hard
  }
  // Rule 3: Flow state (very fast)
  else if (hintsUsed === 0 && timeRatio < FSRS_THRESHOLDS.TIME_RATIO_EASY) {
    rating = 4; // Easy
  }
  // Rule 4: Standard performance
  else if (
    hintsUsed === 0 &&
    timeRatio >= FSRS_THRESHOLDS.TIME_RATIO_GOOD_MIN &&
    timeRatio <= FSRS_THRESHOLDS.TIME_RATIO_GOOD_MAX
  ) {
    rating = 3; // Good
  }
  // Default to Good
  else {
    rating = 3; // Good
  }

  console.log('[FSRS] Rating derived:', rating, {
    passed,
    attemptCount,
    hintsUsed,
    timeRatio: timeRatio.toFixed(2),
  });

  return rating;
}

/**
 * Get human-readable label for FSRS rating
 */
export function getRatingLabel(rating: FSRSRating): string {
  switch (rating) {
    case 1:
      return 'Again';
    case 2:
      return 'Hard';
    case 3:
      return 'Good';
    case 4:
      return 'Easy';
  }
}

// ============================================================================
// Partial Credit Calculation
// ============================================================================

/**
 * Calculate partial credit score from edit distance
 * Used for sequence and connection evaluations
 */
export function calculatePartialCredit(
  distance: number,
  maxLength: number
): number {
  if (maxLength === 0) return 1;
  return Math.max(0, 1 - distance / maxLength);
}

// ============================================================================
// Exports
// ============================================================================

export default {
  calculateBaselineTime,
  evaluateDragDrop,
  evaluateSequence,
  evaluateConnections,
  evaluateSandboxInteraction,
  deriveRating,
  getRatingLabel,
  calculatePartialCredit,
};
