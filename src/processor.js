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
export function parseRecipe(markdown, filePath) {
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
      // Handle numbered steps: "1. Step text" or "1) Step text"
      const stepMatch = trimmed.match(/^\d+[.)]\s*(.+)$/);
      if (stepMatch) {
        const stepText = stepMatch[1].trim();
        // Remove metadata lines like [ingredient: amount] that might be on the same line
        const cleanStep = stepText.split('\n')[0].trim();
        if (cleanStep && !cleanStep.match(/^\[/)) {
          recipe.instructions.push(cleanStep);
        }
      } else if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
        const instruction = trimmed.slice(1).trim();
        if (instruction && !instruction.match(/^\[/)) {
          recipe.instructions.push(instruction);
        }
      } else if (trimmed && !trimmed.match(/^\[/)) {
        // Skip metadata lines that start with [
        recipe.instructions.push(trimmed);
      }
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
      const markdown = await convertToMarkdown(cookFile);
      const recipe = parseRecipe(markdown, cookFile);
      recipes.push(recipe);
    } catch (error) {
      console.error(`Error processing ${cookFile}:`, error.message);
    }
  }
  
  return recipes;
}

