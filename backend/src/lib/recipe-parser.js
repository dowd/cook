/**
 * Recipe parser utilities
 * Parses Cooklang frontmatter and extracts metadata
 */

/**
 * Parse title from Cooklang frontmatter
 * Looks for `>> title:` pattern in the frontmatter
 * @param {string} content - Recipe content
 * @returns {string|null} Extracted title or null if not found
 */
export function parseTitleFromContent(content) {
  if (!content || typeof content !== 'string') {
    return null;
  }

  // Look for frontmatter title: >> title: Recipe Name
  // The frontmatter can be at the start of the file
  const titleMatch = content.match(/^>>\s*title:\s*(.+)$/m);
  if (titleMatch && titleMatch[1]) {
    return titleMatch[1].trim();
  }

  return null;
}

/**
 * Extract title from filename
 * Removes .cook extension and returns the filename as title
 * @param {string} filename - Filename (e.g., "recipe.cook" or "My Recipe.cook")
 * @returns {string} Title extracted from filename
 */
export function extractTitleFromFilename(filename) {
  if (!filename || typeof filename !== 'string') {
    return 'Untitled Recipe';
  }

  // Remove .cook extension (case-insensitive)
  let title = filename.replace(/\.cook$/i, '');
  
  // If filename is empty after removing extension, use default
  if (!title || title.trim().length === 0) {
    return 'Untitled Recipe';
  }

  return title.trim();
}

/**
 * Sanitize title
 * Ensures title meets validation requirements (max 200 chars)
 * @param {string} title - Title to sanitize
 * @returns {string} Sanitized title
 */
export function sanitizeTitle(title) {
  if (!title || typeof title !== 'string') {
    return 'Untitled Recipe';
  }

  const sanitized = title.trim();
  
  if (sanitized.length === 0) {
    return 'Untitled Recipe';
  }

  // Truncate to max length if needed
  const MAX_LENGTH = 200;
  if (sanitized.length > MAX_LENGTH) {
    return sanitized.substring(0, MAX_LENGTH);
  }

  return sanitized;
}

/**
 * Extract title from recipe content or filename
 * Priority: frontmatter title > filename > default
 * @param {string} content - Recipe content (optional)
 * @param {string} filename - Filename (optional)
 * @returns {string} Extracted and sanitized title
 */
export function extractTitle(content = null, filename = null) {
  // Try to extract from frontmatter first
  if (content) {
    const frontmatterTitle = parseTitleFromContent(content);
    if (frontmatterTitle) {
      return sanitizeTitle(frontmatterTitle);
    }
  }

  // Fallback to filename
  if (filename) {
    const filenameTitle = extractTitleFromFilename(filename);
    if (filenameTitle && filenameTitle !== 'Untitled Recipe') {
      return sanitizeTitle(filenameTitle);
    }
  }

  // Default fallback
  return 'Untitled Recipe';
}

