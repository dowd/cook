// Jest globals are available without import in test files
import {
  parseTitleFromContent,
  extractTitleFromFilename,
  sanitizeTitle,
  extractTitle,
} from '../../../src/lib/recipe-parser.js';

describe('recipe-parser', () => {
  describe('parseTitleFromContent', () => {
    it('should extract title from frontmatter', () => {
      const content = '>> title: Chocolate Chip Cookies\n\nPreheat the @oven{}.';
      expect(parseTitleFromContent(content)).toBe('Chocolate Chip Cookies');
    });

    it('should handle title with extra whitespace', () => {
      const content = '>> title:   My Recipe  \n\nContent here.';
      expect(parseTitleFromContent(content)).toBe('My Recipe');
    });

    it('should return null if no title found', () => {
      const content = 'No frontmatter here.';
      expect(parseTitleFromContent(content)).toBeNull();
    });

    it('should return null for empty content', () => {
      expect(parseTitleFromContent('')).toBeNull();
      expect(parseTitleFromContent(null)).toBeNull();
    });
  });

  describe('extractTitleFromFilename', () => {
    it('should remove .cook extension', () => {
      expect(extractTitleFromFilename('recipe.cook')).toBe('recipe');
    });

    it('should handle case-insensitive extension', () => {
      expect(extractTitleFromFilename('recipe.COOK')).toBe('recipe');
      expect(extractTitleFromFilename('recipe.Cook')).toBe('recipe');
    });

    it('should handle filenames with spaces', () => {
      expect(extractTitleFromFilename('My Recipe.cook')).toBe('My Recipe');
    });

    it('should return default for empty filename', () => {
      expect(extractTitleFromFilename('')).toBe('Untitled Recipe');
      expect(extractTitleFromFilename(null)).toBe('Untitled Recipe');
    });

    it('should return default if filename is just extension', () => {
      expect(extractTitleFromFilename('.cook')).toBe('Untitled Recipe');
    });
  });

  describe('sanitizeTitle', () => {
    it('should trim whitespace', () => {
      expect(sanitizeTitle('  My Recipe  ')).toBe('My Recipe');
    });

    it('should truncate to 200 characters', () => {
      const longTitle = 'a'.repeat(250);
      const result = sanitizeTitle(longTitle);
      expect(result.length).toBe(200);
    });

    it('should return default for empty string', () => {
      expect(sanitizeTitle('')).toBe('Untitled Recipe');
      expect(sanitizeTitle('   ')).toBe('Untitled Recipe');
      expect(sanitizeTitle(null)).toBe('Untitled Recipe');
    });
  });

  describe('extractTitle', () => {
    it('should prioritize frontmatter title', () => {
      const content = '>> title: From Frontmatter\n\nContent.';
      const filename = 'FromFilename.cook';
      expect(extractTitle(content, filename)).toBe('From Frontmatter');
    });

    it('should fallback to filename if no frontmatter', () => {
      const content = 'No frontmatter here.';
      const filename = 'FromFilename.cook';
      expect(extractTitle(content, filename)).toBe('FromFilename');
    });

    it('should use default if neither available', () => {
      expect(extractTitle(null, null)).toBe('Untitled Recipe');
      expect(extractTitle('', '')).toBe('Untitled Recipe');
    });
  });
});

