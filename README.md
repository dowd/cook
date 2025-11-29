# Cooklang Static Site Generator

A Node.js static site generator that processes Cooklang recipe files (`.cook`) and generates a beautiful, searchable website with recipe listings, categories, and responsive design.

## Features

- 📖 Processes Cooklang `.cook` recipe files
- 🔍 Client-side search functionality
- 🏷️ Category and tag filtering
- 📱 Responsive, mobile-friendly design
- 🎨 Modern UI with Tailwind CSS
- 📄 Individual recipe pages with ingredients, instructions, and equipment
- 📑 Recipe index page with grid layout
- 🗂️ Category pages for organized browsing

## Prerequisites

1. **Node.js** (v14 or higher)
2. **CookCLI** - Install from [cooklang.org](https://cooklang.org/)

   To install CookCLI:
   ```bash
   # macOS (using Homebrew)
   brew install cooklang/tap/cook
   
   # Or download from https://github.com/cooklang/CookCLI/releases
   ```

## Installation

1. Clone or download this repository
2. No additional npm packages are required (uses only Node.js built-in modules)

## Usage

### 1. Add Your Recipes

Place your Cooklang recipe files (`.cook` files) in the `recipes/` directory:

```
recipes/
├── chocolate-chip-cookies.cook
├── pasta-carbonara.cook
└── banana-bread.cook
```

### 2. Build the Site

Run the build script:

```bash
npm run build
```

Or directly:

```bash
node src/index.js
```

The generated static site will be output to the `dist/` directory.

### 3. View Your Site

You can view the generated site using any static file server:

```bash
# Using Python
cd dist
python3 -m http.server 8000

# Using Node.js (if you have http-server installed)
npx http-server dist -p 8000

# Using PHP
cd dist
php -S localhost:8000
```

Then open `http://localhost:8000` in your browser.

## Project Structure

```
cook/
├── src/
│   ├── index.js              # Main build script
│   ├── processor.js          # Recipe processing logic
│   ├── generator.js          # HTML generation
│   ├── template-engine.js    # Simple template engine
│   ├── templates/
│   │   ├── base.html         # Base layout template
│   │   ├── recipe.html       # Individual recipe page
│   │   ├── index.html        # Recipe listing page
│   │   └── category.html     # Category/tag page
│   └── assets/
│       ├── styles.css        # Custom styles
│       └── search.js         # Client-side search
├── recipes/                  # Input: .cook recipe files
├── dist/                     # Output: generated static site
├── package.json
└── README.md
```

## Cooklang Recipe Format

Your `.cook` files should follow the [Cooklang specification](https://cooklang.org/docs/spec/). Example:

```cook
>> title: Chocolate Chip Cookies
>> tags: dessert, cookies, sweet
>> categories: baking
>> servings: 24

Preheat the @oven{} to 350°F.

Mix @flour{250%g}, @baking soda{5%g}, and @salt{5%g} in a bowl.

In another bowl, cream @butter{115%g} and @sugar{150%g}.

Add @eggs{2%pieces} and @vanilla extract{5%ml}.

Combine wet and dry ingredients.

Stir in @chocolate chips{200%g}.

Drop onto @baking sheet{} and bake for 10-12 minutes.
```

## Recipe Metadata

You can add metadata to your recipes using front matter or inline comments:

- `title`: Recipe title
- `tags`: Comma-separated tags
- `categories`: Comma-separated categories
- `servings`: Number of servings
- `prep_time` or `prepTime`: Preparation time
- `cook_time` or `cookTime`: Cooking time

## Customization

### Styling

- Edit `src/assets/styles.css` for custom CSS
- Templates use Tailwind CSS via CDN - modify templates in `src/templates/` to change the design

### Templates

Templates are located in `src/templates/`:
- `base.html`: Base layout with navigation
- `recipe.html`: Individual recipe page template
- `index.html`: Recipe listing page template
- `category.html`: Category page template

## Troubleshooting

### CookCLI not found

Make sure CookCLI is installed and available in your PATH:

```bash
cook --version
```

If this fails, install CookCLI following the instructions at [cooklang.org](https://cooklang.org/).

### No recipes found

- Ensure your `.cook` files are in the `recipes/` directory
- Check that files have the `.cook` extension
- Verify file permissions

### Build errors

- Check that all recipe files are valid Cooklang format
- Ensure CookCLI can process your recipes: `cook recipe -f markdown recipes/your-recipe.cook`

## License

MIT

## Contributing

Feel free to submit issues and enhancement requests!

