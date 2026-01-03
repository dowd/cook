// Jest globals are available without import in test files
import {
  isValidRecipeId,
  isValidContentSize,
  isValidTitle,
  isValidFileExtension,
  validateRecipeId,
  validateContent,
  validateTitle,
  validateFilename,
  getContentSize,
} from '../../../src/utils/validation.js';

describe('validation', () => {
  describe('isValidRecipeId', () => {
    it('should validate 8-character alphanumeric IDs', () => {
      expect(isValidRecipeId('abc12345')).toBe(true);
      expect(isValidRecipeId('xyz98765')).toBe(true);
      expect(isValidRecipeId('a1b2c3d4')).toBe(true);
    });

    it('should reject invalid IDs', () => {
      expect(isValidRecipeId('abc1234')).toBe(false); // Too short
      expect(isValidRecipeId('abc123456')).toBe(false); // Too long
      expect(isValidRecipeId('ABC12345')).toBe(false); // Uppercase
      expect(isValidRecipeId('abc-1234')).toBe(false); // Special chars
      expect(isValidRecipeId('')).toBe(false);
      expect(isValidRecipeId(null)).toBe(false);
    });
  });

  describe('isValidContentSize', () => {
    it('should validate content within size limit', () => {
      const smallContent = 'a'.repeat(1000);
      expect(isValidContentSize(smallContent)).toBe(true);
    });

    it('should reject content exceeding 1MB', () => {
      const largeContent = 'a'.repeat(1048577); // 1MB + 1 byte
      expect(isValidContentSize(largeContent)).toBe(false);
    });

    it('should reject empty content', () => {
      expect(isValidContentSize('')).toBe(false);
      expect(isValidContentSize(null)).toBe(false);
    });
  });

  describe('isValidTitle', () => {
    it('should validate valid titles', () => {
      expect(isValidTitle('My Recipe')).toBe(true);
      expect(isValidTitle('a'.repeat(200))).toBe(true);
    });

    it('should reject titles exceeding 200 characters', () => {
      expect(isValidTitle('a'.repeat(201))).toBe(false);
    });

    it('should reject empty titles', () => {
      expect(isValidTitle('')).toBe(false);
      expect(isValidTitle('   ')).toBe(false);
      expect(isValidTitle(null)).toBe(false);
    });
  });

  describe('isValidFileExtension', () => {
    it('should validate .cook extension', () => {
      expect(isValidFileExtension('recipe.cook')).toBe(true);
      expect(isValidFileExtension('RECIPE.COOK')).toBe(true);
      expect(isValidFileExtension('My Recipe.cook')).toBe(true);
    });

    it('should reject invalid extensions', () => {
      expect(isValidFileExtension('recipe.txt')).toBe(false);
      expect(isValidFileExtension('recipe')).toBe(false);
      expect(isValidFileExtension('')).toBe(false);
      expect(isValidFileExtension(null)).toBe(false);
    });
  });

  describe('getContentSize', () => {
    it('should calculate string size correctly', () => {
      expect(getContentSize('hello')).toBe(5);
      expect(getContentSize('')).toBe(0);
    });

    it('should handle Buffer', () => {
      const buffer = Buffer.from('hello');
      expect(getContentSize(buffer)).toBe(5);
    });
  });

  describe('validateRecipeId', () => {
    it('should return null for valid IDs', () => {
      expect(validateRecipeId('abc12345')).toBeNull();
    });

    it('should return error message for invalid IDs', () => {
      expect(validateRecipeId('abc1234')).toContain('8');
      expect(validateRecipeId(null)).toContain('required');
    });
  });

  describe('validateContent', () => {
    it('should return null for valid content', () => {
      expect(validateContent('Valid content')).toBeNull();
    });

    it('should return error for empty content', () => {
      expect(validateContent('')).toContain('required');
    });

    it('should return error for oversized content', () => {
      const large = 'a'.repeat(1048577);
      expect(validateContent(large)).toContain('exceeds');
    });
  });

  describe('validateTitle', () => {
    it('should return null for valid titles', () => {
      expect(validateTitle('My Recipe')).toBeNull();
    });

    it('should return error for invalid titles', () => {
      expect(validateTitle('')).toContain('required');
      expect(validateTitle('a'.repeat(201))).toContain('exceeds');
    });
  });

  describe('validateFilename', () => {
    it('should return null for valid filenames', () => {
      expect(validateFilename('recipe.cook')).toBeNull();
    });

    it('should return error for invalid filenames', () => {
      expect(validateFilename('recipe.txt')).toContain('.cook');
      expect(validateFilename(null)).toContain('required');
    });
  });
});

