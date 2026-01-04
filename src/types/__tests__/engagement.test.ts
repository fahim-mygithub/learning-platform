/**
 * Tests for engagement types - pretest feed items
 */
import {
  isPretestItem,
  isMiniLessonItem,
  isPretestResultsItem,
  type PretestItem,
  type MiniLessonItem,
  type PretestResultsItem,
  type FeedItem,
} from '../engagement';

describe('Pretest Feed Item Types', () => {
  describe('PretestItem', () => {
    const validPretestItem: PretestItem = {
      id: 'pretest-1',
      type: 'pretest',
      prerequisiteId: 'prereq-123',
      prerequisiteName: 'Basic Algebra',
      questionText: 'What is 2 + 2?',
      options: ['3', '4', '5', '6'],
      correctIndex: 1,
      explanation: 'Two plus two equals four.',
      questionNumber: 1,
      totalQuestions: 5,
    };

    it('should have all required properties', () => {
      expect(validPretestItem.id).toBeDefined();
      expect(validPretestItem.type).toBe('pretest');
      expect(validPretestItem.prerequisiteId).toBeDefined();
      expect(validPretestItem.prerequisiteName).toBeDefined();
      expect(validPretestItem.questionText).toBeDefined();
      expect(validPretestItem.options).toBeInstanceOf(Array);
      expect(validPretestItem.correctIndex).toBeGreaterThanOrEqual(0);
      expect(validPretestItem.questionNumber).toBeGreaterThanOrEqual(1);
      expect(validPretestItem.totalQuestions).toBeGreaterThanOrEqual(1);
    });

    it('should allow null explanation', () => {
      const itemWithNullExplanation: PretestItem = {
        ...validPretestItem,
        explanation: null,
      };
      expect(itemWithNullExplanation.explanation).toBeNull();
    });
  });

  describe('MiniLessonItem', () => {
    const validMiniLessonItem: MiniLessonItem = {
      id: 'mini-lesson-1',
      type: 'mini_lesson',
      prerequisiteId: 'prereq-123',
      title: 'Introduction to Algebra',
      contentMarkdown: '## What is Algebra?\n\nAlgebra is a branch of mathematics...',
      keyPoints: ['Variables represent unknown values', 'Equations balance both sides'],
      estimatedMinutes: 5,
    };

    it('should have all required properties', () => {
      expect(validMiniLessonItem.id).toBeDefined();
      expect(validMiniLessonItem.type).toBe('mini_lesson');
      expect(validMiniLessonItem.prerequisiteId).toBeDefined();
      expect(validMiniLessonItem.title).toBeDefined();
      expect(validMiniLessonItem.contentMarkdown).toBeDefined();
      expect(validMiniLessonItem.keyPoints).toBeInstanceOf(Array);
      expect(validMiniLessonItem.estimatedMinutes).toBeGreaterThan(0);
    });

    it('should allow empty keyPoints array', () => {
      const itemWithEmptyKeyPoints: MiniLessonItem = {
        ...validMiniLessonItem,
        keyPoints: [],
      };
      expect(itemWithEmptyKeyPoints.keyPoints).toHaveLength(0);
    });
  });

  describe('PretestResultsItem', () => {
    const validPretestResultsItem: PretestResultsItem = {
      id: 'pretest-results-1',
      type: 'pretest_results',
      totalPrerequisites: 5,
      correctCount: 3,
      percentage: 60,
      recommendation: 'review_suggested',
      gapPrerequisiteIds: ['prereq-1', 'prereq-2'],
    };

    it('should have all required properties', () => {
      expect(validPretestResultsItem.id).toBeDefined();
      expect(validPretestResultsItem.type).toBe('pretest_results');
      expect(validPretestResultsItem.totalPrerequisites).toBeGreaterThanOrEqual(0);
      expect(validPretestResultsItem.correctCount).toBeGreaterThanOrEqual(0);
      expect(validPretestResultsItem.percentage).toBeGreaterThanOrEqual(0);
      expect(validPretestResultsItem.percentage).toBeLessThanOrEqual(100);
      expect(validPretestResultsItem.gapPrerequisiteIds).toBeInstanceOf(Array);
    });

    it('should accept all recommendation values', () => {
      const proceedItem: PretestResultsItem = {
        ...validPretestResultsItem,
        recommendation: 'proceed',
        percentage: 100,
        correctCount: 5,
        gapPrerequisiteIds: [],
      };
      expect(proceedItem.recommendation).toBe('proceed');

      const reviewSuggestedItem: PretestResultsItem = {
        ...validPretestResultsItem,
        recommendation: 'review_suggested',
      };
      expect(reviewSuggestedItem.recommendation).toBe('review_suggested');

      const reviewRequiredItem: PretestResultsItem = {
        ...validPretestResultsItem,
        recommendation: 'review_required',
        percentage: 20,
        correctCount: 1,
      };
      expect(reviewRequiredItem.recommendation).toBe('review_required');
    });
  });

  describe('Type Guards', () => {
    const pretestItem: FeedItem = {
      id: 'pretest-1',
      type: 'pretest',
      prerequisiteId: 'prereq-123',
      prerequisiteName: 'Basic Algebra',
      questionText: 'What is 2 + 2?',
      options: ['3', '4', '5', '6'],
      correctIndex: 1,
      explanation: null,
      questionNumber: 1,
      totalQuestions: 5,
    };

    const miniLessonItem: FeedItem = {
      id: 'mini-lesson-1',
      type: 'mini_lesson',
      prerequisiteId: 'prereq-123',
      title: 'Introduction to Algebra',
      contentMarkdown: '## What is Algebra?',
      keyPoints: ['Key point 1'],
      estimatedMinutes: 5,
    };

    const pretestResultsItem: FeedItem = {
      id: 'pretest-results-1',
      type: 'pretest_results',
      totalPrerequisites: 5,
      correctCount: 3,
      percentage: 60,
      recommendation: 'review_suggested',
      gapPrerequisiteIds: ['prereq-1'],
    };

    const quizItem: FeedItem = {
      id: 'quiz-1',
      type: 'quiz',
      conceptId: 'concept-1',
      question: {
        id: 'q1',
        type: 'multiple_choice',
        questionText: 'Test?',
        options: ['A', 'B'],
        correctAnswer: 'A',
        explanation: 'Because A',
        bloomLevel: 'remember',
      },
    };

    describe('isPretestItem', () => {
      it('should return true for pretest items', () => {
        expect(isPretestItem(pretestItem)).toBe(true);
      });

      it('should return false for non-pretest items', () => {
        expect(isPretestItem(miniLessonItem)).toBe(false);
        expect(isPretestItem(pretestResultsItem)).toBe(false);
        expect(isPretestItem(quizItem)).toBe(false);
      });

      it('should narrow the type correctly', () => {
        if (isPretestItem(pretestItem)) {
          // TypeScript should allow accessing PretestItem-specific properties
          expect(pretestItem.prerequisiteId).toBe('prereq-123');
          expect(pretestItem.questionNumber).toBe(1);
        }
      });
    });

    describe('isMiniLessonItem', () => {
      it('should return true for mini lesson items', () => {
        expect(isMiniLessonItem(miniLessonItem)).toBe(true);
      });

      it('should return false for non-mini-lesson items', () => {
        expect(isMiniLessonItem(pretestItem)).toBe(false);
        expect(isMiniLessonItem(pretestResultsItem)).toBe(false);
        expect(isMiniLessonItem(quizItem)).toBe(false);
      });

      it('should narrow the type correctly', () => {
        if (isMiniLessonItem(miniLessonItem)) {
          // TypeScript should allow accessing MiniLessonItem-specific properties
          expect(miniLessonItem.contentMarkdown).toBe('## What is Algebra?');
          expect(miniLessonItem.estimatedMinutes).toBe(5);
        }
      });
    });

    describe('isPretestResultsItem', () => {
      it('should return true for pretest results items', () => {
        expect(isPretestResultsItem(pretestResultsItem)).toBe(true);
      });

      it('should return false for non-pretest-results items', () => {
        expect(isPretestResultsItem(pretestItem)).toBe(false);
        expect(isPretestResultsItem(miniLessonItem)).toBe(false);
        expect(isPretestResultsItem(quizItem)).toBe(false);
      });

      it('should narrow the type correctly', () => {
        if (isPretestResultsItem(pretestResultsItem)) {
          // TypeScript should allow accessing PretestResultsItem-specific properties
          expect(pretestResultsItem.percentage).toBe(60);
          expect(pretestResultsItem.recommendation).toBe('review_suggested');
        }
      });
    });
  });
});
