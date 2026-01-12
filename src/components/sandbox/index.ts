/**
 * Sandbox Components
 *
 * Interactive canvas components for Phase 6: Interactive Sandbox.
 * Provides drag-and-drop learning interactions based on cognitive types.
 *
 * @see openspec/changes/add-interactive-sandbox/proposal.md
 */

// Core modal
export { SandboxModal } from './SandboxModal';
export type { SandboxModalProps } from './SandboxModal';

// Canvas and primitives
export { SandboxCanvas } from './SandboxCanvas';
export type { SandboxCanvasProps } from './SandboxCanvas';

export { SandboxDraggable } from './SandboxDraggable';
export type { SandboxDraggableProps, DragData } from './SandboxDraggable';

export { SandboxDroppable } from './SandboxDroppable';
export type { SandboxDroppableProps } from './SandboxDroppable';

// Interactions
export {
  MatchingInteraction,
  FillInBlankInteraction,
  SequencingInteraction,
} from './interactions';
export type {
  MatchingInteractionProps,
  MatchingPair,
  FillInBlankInteractionProps,
  BlankDefinition,
  SequencingInteractionProps,
  StepDefinition,
} from './interactions';
