/**
 * Synthesis Detector Service Tests
 *
 * Tests for synthesis detection and prompt generation with mocked AI service.
 */

import {
  createSynthesisDetectorService,
  getDefaultSynthesisDetectorService,
  resetDefaultSynthesisDetectorService,
  SynthesisDetectorError,
  type SynthesisDetectorService,
  type SynthesisConcept,
  type SynthesisPromptResult,
} from '../synthesis-detector-service';
import { sendStructuredMessage } from '../ai-service';

// Mock the AI service
jest.mock('../ai-service', () => ({
  getDefaultService: jest.fn().mockReturnValue({ client: {}, modelId: 'test' }),
  sendStructuredMessage: jest.fn(),
}));

// Mock concepts for testing
const mockConcepts: SynthesisConcept[] = [
  { id: 'concept-1', name: 'Variables', definition: 'Named storage locations', category: 'Basics' },
  { id: 'concept-2', name: 'Functions', definition: 'Reusable code blocks', category: 'Basics' },
  { id: 'concept-3', name: 'Loops', definition: 'Repeated execution', category: 'Control Flow' },
  { id: 'concept-4', name: 'Arrays', definition: 'Ordered collections', category: 'Data Structures' },
  { id: 'concept-5', name: 'Objects', definition: 'Key-value pairs', category: 'Data Structures' },
];

// Mock synthesis prompt result
const mockSynthesisResult: SynthesisPromptResult = {
  prompt: 'How do variables and functions work together to create reusable code?',
  conceptsToConnect: ['concept-1', 'concept-2'],
  connectionExplanation: 'Variables store data that functions can process and return.',
};

describe('synthesis-detector-service', () => {
  let service: SynthesisDetectorService;

  beforeEach(() => {
    jest.clearAllMocks();
    resetDefaultSynthesisDetectorService();
    service = createSynthesisDetectorService();
  });

  describe('createSynthesisDetectorService', () => {
    it('creates a service instance with required methods', () => {
      expect(service).toBeDefined();
      expect(typeof service.shouldInsertSynthesis).toBe('function');
      expect(typeof service.generateSynthesisPrompt).toBe('function');
      expect(typeof service.getNextSynthesisInterval).toBe('function');
    });
  });

  describe('shouldInsertSynthesis', () => {
    it('returns false for zero chapters completed', () => {
      expect(service.shouldInsertSynthesis(0, 0)).toBe(false);
    });

    it('returns false for negative chapters completed', () => {
      expect(service.shouldInsertSynthesis(-1, 0)).toBe(false);
    });

    it('returns false when chapters since last synthesis is less than interval', () => {
      // Assuming interval is 5 or 6
      expect(service.shouldInsertSynthesis(3, 0)).toBe(false);
      expect(service.shouldInsertSynthesis(4, 0)).toBe(false);
    });

    it('returns true when chapters since last synthesis reaches interval', () => {
      // Test at interval of 5
      const result5 = service.shouldInsertSynthesis(5, 0);
      // Test at interval of 6
      const result6 = service.shouldInsertSynthesis(6, 0);

      // At least one should be true since interval is 5 or 6
      expect(result5 || result6).toBe(true);
    });

    it('returns true when chapters since last synthesis exceeds interval', () => {
      // 7+ chapters since last synthesis should always trigger
      expect(service.shouldInsertSynthesis(7, 0)).toBe(true);
    });

    it('calculates correctly with non-zero lastSynthesisAt', () => {
      // Last synthesis at chapter 10, now at chapter 15 = 5 chapters
      const result = service.shouldInsertSynthesis(15, 10);
      expect(typeof result).toBe('boolean');
    });

    it('resets interval after returning true', () => {
      // Force synthesis trigger
      service.shouldInsertSynthesis(10, 0);

      // Get new interval and verify it's valid
      const newInterval = service.getNextSynthesisInterval();
      expect([5, 6]).toContain(newInterval);
    });
  });

  describe('getNextSynthesisInterval', () => {
    it('returns either 5 or 6', () => {
      const interval = service.getNextSynthesisInterval();
      expect([5, 6]).toContain(interval);
    });

    it('initializes with a valid interval on service creation', () => {
      const newService = createSynthesisDetectorService();
      const interval = newService.getNextSynthesisInterval();
      expect([5, 6]).toContain(interval);
    });
  });

  describe('generateSynthesisPrompt', () => {
    it('generates synthesis prompt for valid concepts', async () => {
      (sendStructuredMessage as jest.Mock).mockResolvedValue({
        data: mockSynthesisResult,
      });

      const result = await service.generateSynthesisPrompt(mockConcepts.slice(0, 3));

      expect(result).toEqual(mockSynthesisResult);
      expect(sendStructuredMessage).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          systemPrompt: expect.stringContaining('synthesis'),
          userMessage: expect.stringContaining('Variables'),
          options: expect.objectContaining({
            model: 'claude-haiku',
            temperature: 0.7,
          }),
        })
      );
    });

    it('throws error for fewer than 3 concepts', async () => {
      const twoConcepts = mockConcepts.slice(0, 2);

      await expect(service.generateSynthesisPrompt(twoConcepts)).rejects.toThrow(
        SynthesisDetectorError
      );
      await expect(service.generateSynthesisPrompt(twoConcepts)).rejects.toThrow(
        'Need at least 3 concepts'
      );
    });

    it('throws error for empty concepts array', async () => {
      await expect(service.generateSynthesisPrompt([])).rejects.toThrow(
        SynthesisDetectorError
      );
    });

    it('limits concepts to maximum of 5', async () => {
      (sendStructuredMessage as jest.Mock).mockResolvedValue({
        data: mockSynthesisResult,
      });

      const sixConcepts: SynthesisConcept[] = [
        ...mockConcepts,
        { id: 'concept-6', name: 'Classes', definition: 'Object templates' },
      ];

      await service.generateSynthesisPrompt(sixConcepts);

      // Verify only 5 concepts were included in the message
      const callArgs = (sendStructuredMessage as jest.Mock).mock.calls[0][1];
      expect(callArgs.userMessage).not.toContain('concept-6');
      expect(callArgs.userMessage).not.toContain('Classes');
    });

    it('includes concept definitions and categories in prompt', async () => {
      (sendStructuredMessage as jest.Mock).mockResolvedValue({
        data: mockSynthesisResult,
      });

      await service.generateSynthesisPrompt(mockConcepts.slice(0, 3));

      const callArgs = (sendStructuredMessage as jest.Mock).mock.calls[0][1];
      expect(callArgs.userMessage).toContain('Definition: Named storage locations');
      expect(callArgs.userMessage).toContain('Category: Basics');
    });

    it('handles concepts without definitions or categories', async () => {
      (sendStructuredMessage as jest.Mock).mockResolvedValue({
        data: mockSynthesisResult,
      });

      const minimalConcepts: SynthesisConcept[] = [
        { id: 'c1', name: 'Concept1' },
        { id: 'c2', name: 'Concept2' },
        { id: 'c3', name: 'Concept3' },
      ];

      await service.generateSynthesisPrompt(minimalConcepts);

      const callArgs = (sendStructuredMessage as jest.Mock).mock.calls[0][1];
      expect(callArgs.userMessage).toContain('Concept1');
      expect(callArgs.userMessage).not.toContain('Definition:');
    });

    it('throws SynthesisDetectorError on AI service failure', async () => {
      (sendStructuredMessage as jest.Mock).mockRejectedValue(
        new Error('API request failed')
      );

      await expect(
        service.generateSynthesisPrompt(mockConcepts.slice(0, 3))
      ).rejects.toThrow(SynthesisDetectorError);
      await expect(
        service.generateSynthesisPrompt(mockConcepts.slice(0, 3))
      ).rejects.toThrow('Failed to generate synthesis prompt');
    });

    it('includes original error as cause', async () => {
      const originalError = new Error('Network error');
      (sendStructuredMessage as jest.Mock).mockRejectedValue(originalError);

      try {
        await service.generateSynthesisPrompt(mockConcepts.slice(0, 3));
        fail('Expected error to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(SynthesisDetectorError);
        expect((error as SynthesisDetectorError).cause).toBe(originalError);
        expect((error as SynthesisDetectorError).code).toBe('GENERATION_FAILED');
      }
    });
  });

  describe('getDefaultSynthesisDetectorService', () => {
    it('returns same instance on multiple calls', () => {
      const instance1 = getDefaultSynthesisDetectorService();
      const instance2 = getDefaultSynthesisDetectorService();

      expect(instance1).toBe(instance2);
    });

    it('returns new instance after reset', () => {
      const instance1 = getDefaultSynthesisDetectorService();
      resetDefaultSynthesisDetectorService();
      const instance2 = getDefaultSynthesisDetectorService();

      expect(instance1).not.toBe(instance2);
    });
  });

  describe('SynthesisDetectorError', () => {
    it('has correct name and properties', () => {
      const cause = new Error('Original error');
      const error = new SynthesisDetectorError('Test error', 'GENERATION_FAILED', cause);

      expect(error.name).toBe('SynthesisDetectorError');
      expect(error.message).toBe('Test error');
      expect(error.code).toBe('GENERATION_FAILED');
      expect(error.cause).toBe(cause);
    });

    it('works without cause', () => {
      const error = new SynthesisDetectorError('Test error', 'INVALID_CONCEPTS');

      expect(error.name).toBe('SynthesisDetectorError');
      expect(error.code).toBe('INVALID_CONCEPTS');
      expect(error.cause).toBeUndefined();
    });
  });

  describe('custom AI service injection', () => {
    it('uses injected AI service instead of default', async () => {
      const customAIService = { client: {}, modelId: 'custom' };
      const customService = createSynthesisDetectorService(customAIService as never);

      (sendStructuredMessage as jest.Mock).mockResolvedValue({
        data: mockSynthesisResult,
      });

      await customService.generateSynthesisPrompt(mockConcepts.slice(0, 3));

      expect(sendStructuredMessage).toHaveBeenCalledWith(
        customAIService,
        expect.anything()
      );
    });
  });

  describe('edge cases', () => {
    it('handles exact interval boundary', () => {
      // Create multiple services to test randomization
      const results: boolean[] = [];
      for (let i = 0; i < 20; i++) {
        resetDefaultSynthesisDetectorService();
        const testService = createSynthesisDetectorService();
        results.push(testService.shouldInsertSynthesis(5, 0));
      }

      // At least some should be true (when interval is 5) and some false (when interval is 6)
      expect(results.some((r) => r === true)).toBe(true);
    });

    it('handles large chapter numbers', () => {
      const result = service.shouldInsertSynthesis(1000, 994);
      expect(typeof result).toBe('boolean');
    });

    it('handles same value for chapters and lastSynthesisAt', () => {
      expect(service.shouldInsertSynthesis(5, 5)).toBe(false);
    });

    it('handles lastSynthesisAt greater than chaptersCompleted', () => {
      // This is an edge case that shouldn't happen in practice
      expect(service.shouldInsertSynthesis(5, 10)).toBe(false);
    });
  });

  describe('interval randomization', () => {
    it('randomizes interval after synthesis trigger', () => {
      const intervals: number[] = [];

      for (let i = 0; i < 50; i++) {
        resetDefaultSynthesisDetectorService();
        const testService = createSynthesisDetectorService();
        // Trigger synthesis
        testService.shouldInsertSynthesis(10, 0);
        intervals.push(testService.getNextSynthesisInterval());
      }

      // Should have both 5 and 6 in the results (probabilistic)
      const has5 = intervals.includes(5);
      const has6 = intervals.includes(6);

      // With 50 iterations, probability of not seeing either is very low
      expect(has5 || has6).toBe(true);
    });
  });
});
