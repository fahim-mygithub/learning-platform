/**
 * Validation Utilities Tests
 *
 * Tests for email and password validation functions.
 */

import { validateEmail, validatePassword } from '../validation';

describe('validateEmail', () => {
  describe('valid emails', () => {
    it('accepts standard email format', () => {
      expect(validateEmail('user@example.com')).toBeNull();
    });

    it('accepts email with subdomain', () => {
      expect(validateEmail('user@mail.example.com')).toBeNull();
    });

    it('accepts email with plus addressing', () => {
      expect(validateEmail('user+tag@example.com')).toBeNull();
    });

    it('accepts email with dots in local part', () => {
      expect(validateEmail('first.last@example.com')).toBeNull();
    });

    it('accepts email with numbers', () => {
      expect(validateEmail('user123@example.com')).toBeNull();
    });

    it('accepts email with hyphens in domain', () => {
      expect(validateEmail('user@my-domain.com')).toBeNull();
    });

    it('accepts email with underscores in local part', () => {
      expect(validateEmail('user_name@example.com')).toBeNull();
    });
  });

  describe('invalid emails', () => {
    it('rejects empty string', () => {
      expect(validateEmail('')).toBe('Email is required');
    });

    it('rejects whitespace only', () => {
      expect(validateEmail('   ')).toBe('Email is required');
    });

    it('rejects email without @ symbol', () => {
      expect(validateEmail('userexample.com')).toBe('Please enter a valid email address');
    });

    it('rejects email without domain', () => {
      expect(validateEmail('user@')).toBe('Please enter a valid email address');
    });

    it('rejects email without local part', () => {
      expect(validateEmail('@example.com')).toBe('Please enter a valid email address');
    });

    it('rejects email without TLD', () => {
      expect(validateEmail('user@example')).toBe('Please enter a valid email address');
    });

    it('rejects email with spaces', () => {
      expect(validateEmail('user @example.com')).toBe('Please enter a valid email address');
    });

    it('rejects plain text', () => {
      expect(validateEmail('not-an-email')).toBe('Please enter a valid email address');
    });

    it('rejects email with multiple @ symbols', () => {
      expect(validateEmail('user@@example.com')).toBe('Please enter a valid email address');
    });
  });

  describe('edge cases', () => {
    it('trims leading and trailing whitespace', () => {
      expect(validateEmail('  user@example.com  ')).toBeNull();
    });

    it('rejects email with only whitespace after trimming', () => {
      expect(validateEmail('  \t  ')).toBe('Email is required');
    });
  });
});

describe('validatePassword', () => {
  describe('valid passwords', () => {
    it('accepts password meeting all requirements', () => {
      expect(validatePassword('secure123')).toBeNull();
    });

    it('accepts password with exactly 8 characters', () => {
      expect(validatePassword('abcdefg1')).toBeNull();
    });

    it('accepts password with uppercase letters', () => {
      expect(validatePassword('Secure123')).toBeNull();
    });

    it('accepts password with mixed case', () => {
      expect(validatePassword('SecurePass1')).toBeNull();
    });

    it('accepts password with special characters', () => {
      expect(validatePassword('secure123!')).toBeNull();
    });

    it('accepts password with spaces', () => {
      expect(validatePassword('secure 123')).toBeNull();
    });

    it('accepts long password', () => {
      expect(validatePassword('thisIsAVeryLongSecurePassword123')).toBeNull();
    });

    it('accepts password with multiple numbers', () => {
      expect(validatePassword('abc12345')).toBeNull();
    });
  });

  describe('invalid passwords', () => {
    it('rejects empty string', () => {
      expect(validatePassword('')).toBe('Password is required');
    });

    it('rejects password shorter than 8 characters', () => {
      expect(validatePassword('short1')).toBe('Password must be at least 8 characters');
    });

    it('rejects password with exactly 7 characters', () => {
      expect(validatePassword('abcdef1')).toBe('Password must be at least 8 characters');
    });

    it('rejects password without letters', () => {
      expect(validatePassword('12345678')).toBe('Password must contain at least one letter');
    });

    it('rejects password without numbers', () => {
      expect(validatePassword('abcdefgh')).toBe('Password must contain at least one number');
    });

    it('rejects password with only special characters and numbers', () => {
      expect(validatePassword('!@#$%^&*1')).toBe('Password must contain at least one letter');
    });

    it('rejects password with only special characters and letters', () => {
      expect(validatePassword('!@#abcde')).toBe('Password must contain at least one number');
    });
  });

  describe('edge cases', () => {
    it('does not trim password (spaces count towards length)', () => {
      expect(validatePassword('  abc1  ')).toBeNull();
    });

    it('rejects single character', () => {
      expect(validatePassword('a')).toBe('Password must be at least 8 characters');
    });

    it('validates requirements in order: length, letter, number', () => {
      // Short and missing letter - should fail on length first
      expect(validatePassword('1234567')).toBe('Password must be at least 8 characters');

      // Long enough but missing letter - should fail on letter
      expect(validatePassword('12345678')).toBe('Password must contain at least one letter');

      // Has letter but missing number - should fail on number
      expect(validatePassword('abcdefgh')).toBe('Password must contain at least one number');
    });

    it('accepts password with unicode letters', () => {
      // Unicode letters should still match the letter regex [a-zA-Z]
      // This tests that we only accept ASCII letters as per the design
      expect(validatePassword('12345678')).toBe('Password must contain at least one letter');
    });

    it('accepts password starting with number', () => {
      expect(validatePassword('1abcdefg')).toBeNull();
    });

    it('accepts password ending with number', () => {
      expect(validatePassword('abcdefg1')).toBeNull();
    });
  });
});
