/**
 * Analysis Queries Service Tests
 *
 * Tests for analysis query operations with mocked Supabase client.
 */

import { supabase } from '../supabase';
import {
  getConceptsByProject,
  getRoadmapByProject,
  getTranscriptionBySource,
} from '../analysis-queries';
import type { Concept, Roadmap, Transcription } from '../../types';

// Mock the supabase client
jest.mock('../supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

// Helper to create mock chain for database operations
function createMockChain(finalResult: { data: unknown; error: Error | null }) {
  const chain = {
    select: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue(finalResult),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockResolvedValue(finalResult),
  };
  return chain;
}

const mockConcept: Concept = {
  id: 'concept-123',
  project_id: 'project-456',
  source_id: 'source-789',
  name: 'Machine Learning',
  definition: 'A subset of artificial intelligence',
  key_points: ['Supervised learning', 'Unsupervised learning'],
  cognitive_type: 'conceptual',
  difficulty: 3,
  source_timestamps: [],
  metadata: {},
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
};

const mockRoadmap: Roadmap = {
  id: 'roadmap-123',
  project_id: 'project-456',
  title: 'Machine Learning Roadmap',
  description: 'A roadmap for learning ML',
  levels: [
    {
      level: 1,
      title: 'Fundamentals',
      concept_ids: ['concept-123'],
      estimated_minutes: 60,
    },
  ],
  total_estimated_minutes: 60,
  mastery_gates: [],
  status: 'active',
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
};

const mockTranscription: Transcription = {
  id: 'transcription-123',
  source_id: 'source-789',
  full_text: 'This is a transcription of the video.',
  segments: [
    { start: 0, end: 5, text: 'This is a transcription' },
    { start: 5, end: 10, text: 'of the video.' },
  ],
  language: 'en',
  confidence: 0.95,
  provider: 'whisper',
  status: 'completed',
  error_message: null,
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
};

describe('analysis-queries service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getConceptsByProject', () => {
    it('returns all concepts for a project', async () => {
      const mockConcepts = [mockConcept, { ...mockConcept, id: 'concept-456', name: 'Deep Learning' }];
      const mockChain = createMockChain({ data: mockConcepts, error: null });
      (supabase.from as jest.Mock).mockReturnValue(mockChain);

      const result = await getConceptsByProject('project-456');

      expect(supabase.from).toHaveBeenCalledWith('concepts');
      expect(mockChain.select).toHaveBeenCalledWith('*');
      expect(mockChain.eq).toHaveBeenCalledWith('project_id', 'project-456');
      expect(mockChain.order).toHaveBeenCalledWith('created_at', { ascending: true });
      expect(result.data).toEqual(mockConcepts);
      expect(result.error).toBeNull();
    });

    it('returns empty array when no concepts exist', async () => {
      const mockChain = createMockChain({ data: [], error: null });
      (supabase.from as jest.Mock).mockReturnValue(mockChain);

      const result = await getConceptsByProject('project-456');

      expect(result.data).toEqual([]);
      expect(result.error).toBeNull();
    });

    it('returns error when query fails', async () => {
      const mockError = new Error('Query failed');
      const mockChain = createMockChain({ data: null, error: mockError });
      (supabase.from as jest.Mock).mockReturnValue(mockChain);

      const result = await getConceptsByProject('project-456');

      expect(result.data).toBeNull();
      expect(result.error).toBe(mockError);
    });
  });

  describe('getRoadmapByProject', () => {
    it('returns the roadmap for a project', async () => {
      const mockChain = createMockChain({ data: mockRoadmap, error: null });
      (supabase.from as jest.Mock).mockReturnValue(mockChain);

      const result = await getRoadmapByProject('project-456');

      expect(supabase.from).toHaveBeenCalledWith('roadmaps');
      expect(mockChain.select).toHaveBeenCalledWith('*');
      expect(mockChain.eq).toHaveBeenCalledWith('project_id', 'project-456');
      expect(mockChain.single).toHaveBeenCalled();
      expect(result.data).toEqual(mockRoadmap);
      expect(result.error).toBeNull();
    });

    it('returns error when roadmap not found', async () => {
      const mockError = new Error('Roadmap not found');
      const mockChain = createMockChain({ data: null, error: mockError });
      (supabase.from as jest.Mock).mockReturnValue(mockChain);

      const result = await getRoadmapByProject('non-existent-project');

      expect(result.data).toBeNull();
      expect(result.error).toBe(mockError);
    });

    it('returns error when query fails', async () => {
      const mockError = new Error('Database connection failed');
      const mockChain = createMockChain({ data: null, error: mockError });
      (supabase.from as jest.Mock).mockReturnValue(mockChain);

      const result = await getRoadmapByProject('project-456');

      expect(result.data).toBeNull();
      expect(result.error).toBe(mockError);
    });
  });

  describe('getTranscriptionBySource', () => {
    it('returns the transcription for a source', async () => {
      const mockChain = createMockChain({ data: mockTranscription, error: null });
      (supabase.from as jest.Mock).mockReturnValue(mockChain);

      const result = await getTranscriptionBySource('source-789');

      expect(supabase.from).toHaveBeenCalledWith('transcriptions');
      expect(mockChain.select).toHaveBeenCalledWith('*');
      expect(mockChain.eq).toHaveBeenCalledWith('source_id', 'source-789');
      expect(mockChain.single).toHaveBeenCalled();
      expect(result.data).toEqual(mockTranscription);
      expect(result.error).toBeNull();
    });

    it('returns error when transcription not found', async () => {
      const mockError = new Error('Transcription not found');
      const mockChain = createMockChain({ data: null, error: mockError });
      (supabase.from as jest.Mock).mockReturnValue(mockChain);

      const result = await getTranscriptionBySource('non-existent-source');

      expect(result.data).toBeNull();
      expect(result.error).toBe(mockError);
    });

    it('returns error when query fails', async () => {
      const mockError = new Error('Database connection failed');
      const mockChain = createMockChain({ data: null, error: mockError });
      (supabase.from as jest.Mock).mockReturnValue(mockChain);

      const result = await getTranscriptionBySource('source-789');

      expect(result.data).toBeNull();
      expect(result.error).toBe(mockError);
    });
  });
});
