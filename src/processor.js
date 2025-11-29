import { readdir, readFile } from 'fs/promises';
import { join, extname, basename } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Scans the recipes directory for .cook files
 */
export async function scanRecipes(recipesDir) {
  try {
    const files = await readdir(recipesDir);
    return files
      .filter(file => extname(file) === '.cook')
      .map(file => join(recipesDir, file));
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.warn(`Recipes directory not found: ${recipesDir}`);
      return [];
    }
    throw error;
  }
}

/**
 * Reads the original .cook file to extract frontmatter
 */
async function readCookFile(cookFilePath) {
  try {
    return await readFile(cookFilePath, 'utf-8');
  } catch (error) {
    return null;
  }
}

/**
 * Extracts frontmatter from a .cook file
 */
function extractFrontmatter(cookContent) {
  const frontmatter = {};
  
  // Check for YAML frontmatter (--- markers)
  const frontMatterMatch = cookContent.match(/^---\n([\s\S]*?)\n---/);
  if (frontMatterMatch) {
    const frontMatterText = frontMatterMatch[1];
    frontMatterText.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (!trimmed) return;
      
      // Match key: value (key can have spaces)
      const match = trimmed.match(/^([^:]+):\s*(.+)$/);
      if (match) {
        const [, key, value] = match;
        const cleanKey = key.trim().toLowerCase();
        const cleanValue = value.trim().replace(/^["']|["']$/g, '');
        // Store both with and without spaces for flexibility
        frontmatter[cleanKey] = cleanValue;
        frontmatter[cleanKey.replace(/\s+/g, '_')] = cleanValue;
      }
    });
  }
  
  return frontmatter;
}

/**
 * Converts a .cook file to Markdown using CookCLI
 */
export async function convertToMarkdown(cookFilePath) {
  try {
    const { stdout, stderr } = await execAsync(
      `cook recipe read "${cookFilePath}" --output-format markdown`
    );
    
    if (stderr && !stderr.includes('warning')) {
      console.warn(`CookCLI warning for ${cookFilePath}: ${stderr}`);
    }
    
    return stdout;
  } catch (error) {
    throw new Error(`Failed to convert ${cookFilePath} using CookCLI: ${error.message}`);
  }
}

/**
 * Parses recipe metadata and content from Markdown
 */
export function parseRecipe(markdown, filePath, frontmatter = {}) {
  const recipe = {
    filename: basename(filePath, '.cook'),
    slug: basename(filePath, '.cook').toLowerCase().replace(/\s+/g, '-'),
    title: '',
    tags: [],
    categories: [],
    servings: null,
    prepTime: null,
    cookTime: null,
    ingredients: [],
    instructions: [],
    equipment: [],
    rawMarkdown: markdown
  };
  
  // Apply frontmatter metadata first
  if (frontmatter.title) recipe.title = frontmatter.title;
  if (frontmatter.tags) {
    const tags = typeof frontmatter.tags === 'string' 
      ? frontmatter.tags.split(',').map(t => t.trim()).filter(Boolean)
      : frontmatter.tags;
    // Normalize tags: use a Map to deduplicate by lowercase, then capitalize for display
    const tagMap = new Map();
    tags.forEach(tag => {
      const normalized = tag.toLowerCase().trim();
      if (normalized && !tagMap.has(normalized)) {
        // Capitalize for display (title case)
        const capitalized = tag
          .toLowerCase()
          .split(/\s+/)
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
        tagMap.set(normalized, capitalized);
      }
    });
    recipe.tags = Array.from(tagMap.values());
  }
  if (frontmatter.categories || frontmatter.category) {
    const cats = frontmatter.categories || frontmatter.category;
    recipe.categories = typeof cats === 'string'
      ? cats.split(',').map(c => c.trim()).filter(Boolean)
      : cats;
  }
  if (frontmatter.servings) recipe.servings = parseInt(frontmatter.servings) || null;
  if (frontmatter.prep_time || frontmatter['prep time']) {
    recipe.prepTime = frontmatter.prep_time || frontmatter['prep time'];
  }
  if (frontmatter.cook_time || frontmatter['cook time']) {
    recipe.cookTime = frontmatter.cook_time || frontmatter['cook time'];
  }

  // Extract front matter (YAML)
  const frontMatterMatch = markdown.match(/^---\n([\s\S]*?)\n---/);
  if (frontMatterMatch) {
    const frontMatter = frontMatterMatch[1];
    const content = markdown.slice(frontMatterMatch[0].length).trim();
    
    // Parse YAML-like front matter
    frontMatter.split('\n').forEach(line => {
      const match = line.match(/^(\w+):\s*(.+)$/);
      if (match) {
        const [, key, value] = match;
        const cleanValue = value.replace(/^["']|["']$/g, '');
        
        switch (key.toLowerCase()) {
          case 'title':
            recipe.title = cleanValue;
            break;
          case 'tags':
            recipe.tags = cleanValue.split(',').map(t => t.trim()).filter(Boolean);
            break;
          case 'categories':
          case 'category':
            recipe.categories = cleanValue.split(',').map(c => c.trim()).filter(Boolean);
            break;
          case 'servings':
            recipe.servings = parseInt(cleanValue) || null;
            break;
          case 'prep_time':
          case 'preptime':
            recipe.prepTime = cleanValue;
            break;
          case 'cook_time':
          case 'cooktime':
            recipe.cookTime = cleanValue;
            break;
        }
      }
    });
    
    // Parse content sections
    parseContent(content, recipe);
  } else {
    // No front matter, try to parse directly
    parseContent(markdown, recipe);
    // Use filename as title if no title found
    if (!recipe.title) {
      recipe.title = recipe.filename.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  }

  return recipe;
}

/**
 * Parses recipe content sections (ingredients, instructions, equipment)
 */
function parseContent(content, recipe) {
  const lines = content.split('\n');
  let currentSection = null;
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Detect section headers (## Ingredients, ## Steps, etc.)
    const headerMatch = trimmed.match(/^#+\s*(ingredients?|instructions?|steps?|equipment|directions?)/i);
    if (headerMatch) {
      const sectionName = headerMatch[1].toLowerCase();
      if (sectionName.includes('ingredient')) {
        currentSection = 'ingredients';
      } else if (sectionName.includes('equipment')) {
        currentSection = 'equipment';
      } else if (sectionName.includes('step') || sectionName.includes('instruction') || sectionName.includes('direction')) {
        currentSection = 'instructions';
      }
      continue;
    }
    
    // Skip empty lines and headers
    if (!trimmed || trimmed.startsWith('#')) continue;
    
    // Parse based on current section
    if (currentSection === 'ingredients') {
      if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
        const ingredient = trimmed.slice(1).trim();
        if (ingredient) {
          recipe.ingredients.push(ingredient);
        }
      } else if (trimmed && !trimmed.match(/^\[/)) {
        // Skip lines that look like metadata [ingredient: amount]
        recipe.ingredients.push(trimmed);
      }
    } else if (currentSection === 'equipment') {
      if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
        const equipment = trimmed.slice(1).trim();
        if (equipment) {
          recipe.equipment.push(equipment);
        }
      } else if (trimmed) {
        recipe.equipment.push(trimmed);
      }
    } else if (currentSection === 'instructions') {
      // This will be handled separately to support multi-line steps
      // Skip for now, we'll process instructions after the loop
    }
  }
  
  // Process instructions separately to handle multi-line steps
  // Find the instructions/steps section and process it
  let inInstructionsSection = false;
  let currentStepLines = [];
  let currentStepNumber = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    // Detect start of instructions section
    const headerMatch = trimmed.match(/^#+\s*(instructions?|steps?|directions?)/i);
    if (headerMatch) {
      inInstructionsSection = true;
      // Save any previous step
      if (currentStepLines.length > 0) {
        const stepText = currentStepLines.join(' ').trim();
        if (stepText) {
          recipe.instructions.push(stepText);
        }
      }
      currentStepLines = [];
      currentStepNumber = null;
      continue;
    }
    
    // Detect end of instructions section (new section starts)
    if (inInstructionsSection && trimmed.match(/^#+\s*(ingredients?|equipment)/i)) {
      // Save last step
      if (currentStepLines.length > 0) {
        const stepText = currentStepLines.join(' ').trim();
        if (stepText) {
          recipe.instructions.push(stepText);
        }
      }
      inInstructionsSection = false;
      currentStepLines = [];
      currentStepNumber = null;
      continue;
    }
    
    if (!inInstructionsSection) continue;
    
    // Skip empty lines
    if (!trimmed) continue;
    
    // Skip metadata lines (lines starting with [)
    if (trimmed.match(/^\[/)) {
      // End current step if we hit metadata
      if (currentStepLines.length > 0) {
        const stepText = currentStepLines.join(' ').trim();
        if (stepText) {
          recipe.instructions.push(stepText);
        }
      }
      currentStepLines = [];
      currentStepNumber = null;
      continue;
    }
    
    // Check if this is a new numbered step
    const stepMatch = trimmed.match(/^\d+[.)]\s*(.+)$/);
    if (stepMatch) {
      // Save previous step if exists
      if (currentStepLines.length > 0) {
        const stepText = currentStepLines.join(' ').trim();
        if (stepText) {
          recipe.instructions.push(stepText);
        }
      }
      // Start new step
      const stepText = stepMatch[1].trim();
      
      // Skip frontmatter metadata lines (key: value format)
      // These are typically single-line metadata that CookCLI converts to steps
      if (stepText.match(/^(author|cook time|prep time|servings|course|cuisine|diet|source|tags|time required|title):\s*/i)) {
        currentStepNumber = null;
        currentStepLines = [];
        continue;
      }
      
      if (stepText) {
        currentStepNumber = parseInt(stepMatch[0].match(/^\d+/)[0]);
        currentStepLines = [stepText];
      }
    } else if (currentStepNumber !== null) {
      // Continue current step
      currentStepLines.push(trimmed);
    } else if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
      // Bullet point instruction (not numbered)
      const instruction = trimmed.slice(1).trim();
      if (instruction) {
        recipe.instructions.push(instruction);
      }
    }
  }
  
  // Don't forget the last step
  if (inInstructionsSection && currentStepLines.length > 0) {
    const stepText = currentStepLines.join(' ').trim();
    if (stepText) {
      recipe.instructions.push(stepText);
    }
  }
  
  // If no sections found, try to infer from content
  if (recipe.ingredients.length === 0 && recipe.instructions.length === 0) {
    const listItems = lines
      .map(l => l.trim())
      .filter(l => l && (l.startsWith('-') || l.startsWith('*') || l.match(/^\d+[.)]/)));
    
    // Simple heuristic: if items contain measurement words, they're ingredients
    const measurementWords = ['cup', 'tbsp', 'tsp', 'oz', 'lb', 'g', 'kg', 'ml', 'l'];
    listItems.forEach(item => {
      const cleanItem = item.replace(/^[-*\d.)]\s*/, '');
      const hasMeasurement = measurementWords.some(word => 
        cleanItem.toLowerCase().includes(word)
      );
      
      if (hasMeasurement) {
        recipe.ingredients.push(cleanItem);
      } else {
        recipe.instructions.push(cleanItem);
      }
    });
  }
}

/**
 * Processes all recipes from the recipes directory
 */
export async function processRecipes(recipesDir) {
  const cookFiles = await scanRecipes(recipesDir);
  const recipes = [];
  
  for (const cookFile of cookFiles) {
    try {
      console.log(`Processing: ${cookFile}`);
      
      // Read original .cook file to extract frontmatter
      const cookContent = await readCookFile(cookFile);
      const frontmatter = cookContent ? extractFrontmatter(cookContent) : {};
      
      // Convert to markdown
      const markdown = await convertToMarkdown(cookFile);
      
      // Parse recipe with frontmatter
      const recipe = parseRecipe(markdown, cookFile, frontmatter);
      recipes.push(recipe);
    } catch (error) {
      console.error(`Error processing ${cookFile}:`, error.message);
    }
  }
  
  return recipes;
}

