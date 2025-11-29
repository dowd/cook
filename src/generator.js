import { readFile, writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { renderTemplate } from './template-engine.js';

/**
 * Capitalizes a tag for display (title case)
 */
function capitalizeTag(tag) {
  if (!tag) return tag;
  return tag
    .toLowerCase()
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Normalizes a tag to lowercase for comparison
 */
function normalizeTag(tag) {
  return tag.toLowerCase().trim();
}

/**
 * Loads a template file
 */
async function loadTemplate(templateName) {
    const templatePath = join(process.cwd(), 'src', 'templates', `${templateName}.html`);
    return await readFile(templatePath, 'utf-8');
}

/**
 * Ensures a directory exists
 */
async function ensureDir(dirPath) {
    try {
        await mkdir(dirPath, { recursive: true });
    } catch (error) {
        if (error.code !== 'EEXIST') throw error;
    }
}

/**
 * Generates an individual recipe page
 */
export async function generateRecipePage(recipe, distDir) {
  const template = await loadTemplate('recipe');
  const baseTemplate = await loadTemplate('base');
  
  // Prepare recipe data with normalized tag/category slugs for links
  const recipeData = {
    ...recipe,
    tags: recipe.tags?.map(tag => ({
      name: tag,
      slug: slugify(normalizeTag(tag))
    })),
    categories: recipe.categories?.map(cat => ({
      name: cat,
      slug: slugify(normalizeTag(cat))
    }))
  };
  
  const recipeHtml = renderTemplate(template, recipeData);
  const fullHtml = renderTemplate(baseTemplate, {
    title: recipe.title,
    content: recipeHtml
  });

    const outputPath = join(distDir, 'recipe', `${recipe.slug}.html`);
    await ensureDir(dirname(outputPath));
    await writeFile(outputPath, fullHtml, 'utf-8');

    return `/recipe/${recipe.slug}.html`;
}

/**
 * Generates recipe card HTML for listing pages
 */
function generateRecipeCard(recipe, url) {
    return `
    <div class="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
      <div class="p-6">
        <h3 class="text-xl font-semibold text-gray-900 mb-2">
          <a href="${url}" class="hover:text-blue-600">${escapeHtml(recipe.title)}</a>
        </h3>
        ${recipe.tags && recipe.tags.length > 0 ? `
          <div class="flex flex-wrap gap-2 mb-3">
            ${recipe.tags.slice(0, 3).map(tag => `
              <span class="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">${escapeHtml(tag)}</span>
            `).join('')}
          </div>
        ` : ''}
        ${recipe.servings ? `
          <p class="text-sm text-gray-600 mb-2">👥 ${recipe.servings} servings</p>
        ` : ''}
        <a href="${url}" class="text-blue-600 hover:text-blue-800 font-medium text-sm">
          View recipe →
        </a>
      </div>
    </div>
  `;
}

/**
 * Generates the index page with all recipes
 */
export async function generateIndexPage(recipes, distDir) {
    const template = await loadTemplate('index');
    const baseTemplate = await loadTemplate('base');

    // Generate recipe cards
    const recipeCards = recipes.map(recipe => {
        const url = `/recipe/${recipe.slug}.html`;
        return generateRecipeCard(recipe, url);
    }).join('\n');

    // Collect all unique categories and tags (normalized for deduplication)
    const categoryMap = new Map();
    const tagMap = new Map();
    recipes.forEach(recipe => {
        recipe.categories?.forEach(cat => {
            const normalized = normalizeTag(cat);
            if (!categoryMap.has(normalized)) {
                categoryMap.set(normalized, capitalizeTag(cat));
            }
        });
        recipe.tags?.forEach(tag => {
            const normalized = normalizeTag(tag);
            if (!tagMap.has(normalized)) {
                tagMap.set(normalized, capitalizeTag(tag));
            }
        });
    });
    
    const categories = Array.from(categoryMap.values()).sort();
    const tags = Array.from(tagMap.values()).sort();
    
    // Generate category filter HTML (use normalized slugs for URLs)
    const categoryFilterHtml = `
      ${categories.map(cat => `
        <a href="/category/${slugify(normalizeTag(cat))}.html" class="px-4 py-2 bg-green-100 text-green-800 rounded-lg text-sm font-medium hover:bg-green-200">
          ${escapeHtml(cat)}
        </a>
      `).join('')}
      ${tags.map(tag => `
        <a href="/category/${slugify(normalizeTag(tag))}.html" class="px-4 py-2 bg-blue-100 text-blue-800 rounded-lg text-sm font-medium hover:bg-blue-200">
          ${escapeHtml(tag)}
        </a>
      `).join('')}
    `;

    const indexHtml = renderTemplate(template, {
        recipes: recipeCards,
        recipeData: JSON.stringify(recipes.map(r => ({
            title: r.title,
            slug: r.slug,
            tags: r.tags || [],
            categories: r.categories || [],
            url: `/recipe/${r.slug}.html`
        })))
    });

    // Inject category filter
    const indexHtmlWithFilter = indexHtml.replace(
        '<!-- Categories will be populated by JavaScript -->',
        categoryFilterHtml
    );

    const fullHtml = renderTemplate(baseTemplate, {
        title: 'Recipe Collection',
        content: indexHtmlWithFilter
    });

    const outputPath = join(distDir, 'index.html');
    await writeFile(outputPath, fullHtml, 'utf-8');
}

/**
 * Generates category pages
 */
export async function generateCategoryPages(recipes, distDir) {
    const categoryMap = new Map();

    // Group recipes by category and tag (using normalized keys)
    recipes.forEach(recipe => {
        recipe.categories?.forEach(cat => {
            const normalized = normalizeTag(cat);
            const displayName = capitalizeTag(cat);
            if (!categoryMap.has(normalized)) {
                categoryMap.set(normalized, { name: displayName, recipes: [] });
            }
            categoryMap.get(normalized).recipes.push(recipe);
        });

        recipe.tags?.forEach(tag => {
            const normalized = normalizeTag(tag);
            const displayName = capitalizeTag(tag);
            if (!categoryMap.has(normalized)) {
                categoryMap.set(normalized, { name: displayName, recipes: [] });
            }
            categoryMap.get(normalized).recipes.push(recipe);
        });
    });

    const template = await loadTemplate('category');
    const baseTemplate = await loadTemplate('base');

    for (const [normalizedKey, categoryData] of categoryMap.entries()) {
        const recipeCards = categoryData.recipes.map(recipe => {
            const url = `/recipe/${recipe.slug}.html`;
            return generateRecipeCard(recipe, url);
        }).join('\n');
        
        const categoryHtml = renderTemplate(template, {
            categoryName: categoryData.name,
            recipeCount: categoryData.recipes.length,
            multiple: categoryData.recipes.length !== 1,
            recipes: recipeCards
        });
        
        const fullHtml = renderTemplate(baseTemplate, {
            title: `${categoryData.name} - Recipe Collection`,
            content: categoryHtml
        });
        
        // Use normalized key for slug to ensure consistent URLs
        const outputPath = join(distDir, 'category', `${slugify(normalizedKey)}.html`);
        await ensureDir(dirname(outputPath));
        await writeFile(outputPath, fullHtml, 'utf-8');
    }
}

/**
 * Generates search index JSON
 */
export async function generateSearchIndex(recipes, distDir) {
    const searchIndex = recipes.map(recipe => ({
        title: recipe.title,
        slug: recipe.slug,
        url: `/recipe/${recipe.slug}.html`,
        tags: recipe.tags || [],
        categories: recipe.categories || [],
        ingredients: recipe.ingredients || [],
        searchText: [
            recipe.title,
            ...(recipe.tags || []),
            ...(recipe.categories || []),
            ...(recipe.ingredients || [])
        ].join(' ').toLowerCase()
    }));

    const outputPath = join(distDir, 'search-index.json');
    await writeFile(outputPath, JSON.stringify(searchIndex, null, 2), 'utf-8');
}

/**
 * Utility functions
 */
function escapeHtml(text) {
    if (!text) return '';
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function slugify(text) {
    return String(text)
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
}

