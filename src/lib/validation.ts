/**
 * Form Validation Utilities
 *
 * Provides client-side validation functions for authentication forms.
 * All validators return an error message string if invalid, or null if valid.
 */

/**
 * Email validation regex based on RFC 5322 (simplified)
 * Matches most common email formats while rejecting clearly invalid inputs.
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Password validation constants
 */
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_LETTER_REGEX = /[a-zA-Z]/;
const PASSWORD_NUMBER_REGEX = /[0-9]/;

/**
 * Validates an email address
 *
 * @param email - The email address to validate
 * @returns Error message if invalid, null if valid
 *
 * @example
 * ```ts
 * validateEmail('user@example.com'); // null (valid)
 * validateEmail('invalid-email'); // 'Please enter a valid email address'
 * validateEmail(''); // 'Email is required'
 * ```
 */
export function validateEmail(email: string): string | null {
  // Check for empty or whitespace-only input
  const trimmedEmail = email.trim();

  if (trimmedEmail.length === 0) {
    return 'Email is required';
  }

  if (!EMAIL_REGEX.test(trimmedEmail)) {
    return 'Please enter a valid email address';
  }

  return null;
}

/**
 * Validates a password against security requirements
 *
 * Requirements:
 * - Minimum 8 characters
 * - At least one letter (a-z, A-Z)
 * - At least one number (0-9)
 *
 * @param password - The password to validate
 * @returns Error message if invalid, null if valid
 *
 * @example
 * ```ts
 * validatePassword('secure123'); // null (valid)
 * validatePassword('short1'); // 'Password must be at least 8 characters'
 * validatePassword('noletter1'); // null (valid - has letters)
 * validatePassword('noNumbers'); // 'Password must contain at least one number'
 * validatePassword(''); // 'Password is required'
 * ```
 */
export function validatePassword(password: string): string | null {
  // Check for empty input (don't trim - spaces can be part of password)
  if (password.length === 0) {
    return 'Password is required';
  }

  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters`;
  }

  if (!PASSWORD_LETTER_REGEX.test(password)) {
    return 'Password must contain at least one letter';
  }

  if (!PASSWORD_NUMBER_REGEX.test(password)) {
    return 'Password must contain at least one number';
  }

  return null;
}
