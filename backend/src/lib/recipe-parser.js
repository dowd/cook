/**
 * Recipe Parser Utility
 * Extracts metadata from Cooklang recipe files
 */

/**
 * Extracts title from Cooklang frontmatter
 * Looks for >> title: value pattern
 * @param {string} content - Cooklang recipe content
 * @returns {string|null} Title if found, null otherwise
 */
function extractTitleFromFrontmatter(content) {
  if (!content || typeof content !== 'string') {
    return null;
  }

  // Look for >> title: pattern (case-insensitive)
  const titleMatch = content.match(/^>>\s*title\s*:\s*(.+)$/im);
  if (titleMatch && titleMatch[1]) {
    return titleMatch[1].trim();
  }

  return null;
}

/**
 * Extracts title from filename
 * Removes .cook extension and cleans up the filename
 * @param {string} filename - Original filename
 * @returns {string} Title extracted from filename
 */
function extractTitleFromFilename(filename) {
  if (!filename || typeof filename !== 'string') {
    return null;
  }

  // Remove .cook extension
  let title = filename.replace(/\.cook$/i, '');

  // Clean up: replace underscores/hyphens with spaces, trim
  title = title.replace(/[_-]/g, ' ').trim();

  // Capitalize first letter of each word (basic title case)
  title = title.split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');

  return title || null;
}

/**
 * Generates a default title if extraction fails
 * @param {string} recipeId - Recipe ID as fallback
 * @returns {string} Default title
 */
function generateDefaultTitle(recipeId) {
  return `Recipe ${recipeId}`;
}

/**
 * Extracts recipe title from content or filename
 * Priority: frontmatter >> title: > filename > default
 * @param {string} content - Cooklang recipe content (optional)
 * @param {string} filename - Original filename (optional)
 * @param {string} recipeId - Recipe ID for default fallback (optional)
 * @returns {string} Extracted or generated title
 */
export function extractTitle(content = null, filename = null, recipeId = null) {
  // Try frontmatter first
  if (content) {
    const frontmatterTitle = extractTitleFromFrontmatter(content);
    if (frontmatterTitle) {
      return frontmatterTitle;
    }
  }

  // Try filename
  if (filename) {
    const filenameTitle = extractTitleFromFilename(filename);
    if (filenameTitle) {
      return filenameTitle;
    }
  }

  // Generate default
  if (recipeId) {
    return generateDefaultTitle(recipeId);
  }

  // Last resort
  return 'Untitled Recipe';
}

/**
 * Validates Cooklang file extension
 * @param {string} filename - Filename to validate
 * @returns {boolean} True if valid .cook extension
 */
export function isValidCookFile(filename) {
  if (!filename || typeof filename !== 'string') {
    return false;
  }

  return filename.toLowerCase().endsWith('.cook');
}
