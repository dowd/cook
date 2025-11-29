import { processRecipes } from './processor.js';
import { 
  generateRecipePage, 
  generateIndexPage, 
  generateCategoryPages,
  generateSearchIndex 
} from './generator.js';
import { copyFile, mkdir, readdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

const RECIPES_DIR = join(process.cwd(), 'recipes');
const DIST_DIR = join(process.cwd(), 'dist');
const ASSETS_DIR = join(process.cwd(), 'src', 'assets');

/**
 * Copies static assets to dist directory
 */
async function copyAssets() {
  try {
    const assets = await readdir(ASSETS_DIR);
    const assetsDistDir = join(DIST_DIR, 'assets');
    await mkdir(assetsDistDir, { recursive: true });
    
    for (const asset of assets) {
      const srcPath = join(ASSETS_DIR, asset);
      const destPath = join(assetsDistDir, asset);
      await copyFile(srcPath, destPath);
    }
    
    // Also copy assets to root for easier access
    for (const asset of assets) {
      const srcPath = join(ASSETS_DIR, asset);
      const destPath = join(DIST_DIR, asset);
      await copyFile(srcPath, destPath);
    }
    
    console.log('✓ Copied static assets');
  } catch (error) {
    console.warn('Warning: Could not copy assets:', error.message);
  }
}

/**
 * Main build function
 */
async function build() {
  console.log('🍳 Starting Cooklang Static Site Generator...\n');
  
  // Check if recipes directory exists
  if (!existsSync(RECIPES_DIR)) {
    console.error(`Error: Recipes directory not found: ${RECIPES_DIR}`);
    console.log('Please create a "recipes" directory and add your .cook files there.');
    process.exit(1);
  }
  
  try {
    // Process recipes
    console.log('📖 Processing recipes...');
    const recipes = await processRecipes(RECIPES_DIR);
    
    if (recipes.length === 0) {
      console.warn('Warning: No recipes found in recipes directory.');
      console.log('Please add .cook files to the recipes directory.');
      return;
    }
    
    console.log(`✓ Found ${recipes.length} recipe(s)\n`);
    
    // Create dist directory
    await mkdir(DIST_DIR, { recursive: true });
    
    // Generate individual recipe pages
    console.log('📄 Generating recipe pages...');
    for (const recipe of recipes) {
      await generateRecipePage(recipe, DIST_DIR);
    }
    console.log(`✓ Generated ${recipes.length} recipe page(s)\n`);
    
    // Generate index page
    console.log('📑 Generating index page...');
    await generateIndexPage(recipes, DIST_DIR);
    console.log('✓ Generated index page\n');
    
    // Generate category pages
    console.log('🏷️  Generating category pages...');
    await generateCategoryPages(recipes, DIST_DIR);
    console.log('✓ Generated category pages\n');
    
    // Generate search index
    console.log('🔍 Generating search index...');
    await generateSearchIndex(recipes, DIST_DIR);
    console.log('✓ Generated search index\n');
    
    // Copy static assets
    console.log('📦 Copying static assets...');
    await copyAssets();
    
    console.log('\n✨ Build complete!');
    console.log(`📁 Output directory: ${DIST_DIR}`);
    console.log(`\nTo view your site, you can use a simple HTTP server:`);
    console.log(`  cd dist && python3 -m http.server 8000`);
    console.log(`  Then open http://localhost:8000 in your browser`);
    
  } catch (error) {
    console.error('Error during build:', error);
    process.exit(1);
  }
}

// Run build
build();

