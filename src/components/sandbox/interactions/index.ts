/**
 * Sandbox Interactions
 *
 * Cognitive type-specific interaction components.
 *
 * @see openspec/changes/add-interactive-sandbox/proposal.md
 */

// Factual interactions
export { MatchingInteraction } from './MatchingInteraction';
export type { MatchingInteractionProps, MatchingPair } from './MatchingInteraction';

export { FillInBlankInteraction } from './FillInBlankInteraction';
export type { FillInBlankInteractionProps, BlankDefinition } from './FillInBlankInteraction';

// Procedural interactions
export { SequencingInteraction } from './SequencingInteraction';
export type { SequencingInteractionProps, StepDefinition } from './SequencingInteraction';
