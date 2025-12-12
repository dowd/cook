# Cooklang Format Guide for LLM Recipe Conversion

This document provides comprehensive guidance for converting recipes into the Cooklang format. Use this as a reference when parsing and converting recipes from any source into `.cook` files.

## Overview

Cooklang is a markup language for recipes that combines human-readable instructions with machine-parsable markup. Each recipe is stored in a `.cook` file with plain English text and special syntax for ingredients, cookware, timers, and metadata.

## Core Syntax Elements

### Ingredients (`@`)

Ingredients are marked with the `@` symbol followed by the ingredient name.

**Basic syntax:**
- Single word: `@salt`
- Multiple words: `@ground black pepper{}` (use `{}` to mark the end of multi-word names)
- With quantity: `@potato{2}`
- With quantity and unit: `@flour{500%g}` (use `%` between quantity and unit)
- Fixed quantity (doesn't scale): `@salt{=1%tsp}` (use `=` to prevent scaling)

**Examples:**
```cooklang
Add @salt and @ground black pepper{} to taste.
Poke holes in @potato{2}.
Place @bacon strips{1%kg} on a baking sheet.
Season with @salt{=1%tsp} to taste.
```

**Quantity formats:**
- Whole numbers: `{2}`, `{500}`
- Fractions: `{1/2}`, `{3/4}`
- Decimals: `{1.5}`, `{0.5}`
- With units: `{2%cups}`, `{500%g}`, `{1/2%tbsp}`, `{3%medium}`, `{2%cloves}`

### Cookware (`#`)

Cookware is marked with the `#` symbol.

**Basic syntax:**
- Single word: `#pot`
- Multiple words: `#potato masher{}` (use `{}` to mark the end of multi-word names)

**Examples:**
```cooklang
Place the potatoes into a #pot.
Mash the potatoes with a #potato masher{}.
Heat oil in a #large non-stick frying pan{}.
```

### Timers (`~`)

Timers are marked with the `~` symbol.

**Basic syntax:**
- Unnamed timer: `~{25%minutes}`
- Named timer: `~eggs{3%minutes}`

**Examples:**
```cooklang
Bake for ~{25%minutes}.
Boil @eggs{2} for ~eggs{3%minutes}.
Let rise for ~{1%hour}.
```

### Steps

Each paragraph (separated by blank lines) is a cooking step. Steps can span multiple lines within the same paragraph.

**Example:**
```cooklang
Mix @flour{500%g} with @water{300%ml} until smooth.

Add @yeast{=1%packet} and let rise for ~{1%hour}.

Bake in a #preheated oven{} at 200°C for ~{30%minutes}.
```

### Comments

**Line comments** (end of line): Use `--` followed by the comment
```cooklang
Mash @potato{2%kg} until smooth -- alternatively, boil 'em first
```

**Block comments**: Use `[- comment text -]`
```cooklang
Slowly add @milk{4%cup} [- TODO change units to litres -], keep mixing
```

**Standalone comments**: Use `--` at the start of a line
```cooklang
-- Don't burn the roux!
-- TODO add source
```

## Metadata (YAML Front Matter)

Metadata is defined using YAML front matter at the beginning of the file, enclosed by `---`.

**Basic structure:**
```yaml
---
title: Recipe Name
servings: 4
tags:
  - tag1
  - tag2
---
```

### Common Metadata Fields

| Field | Purpose | Example |
|-------|---------|---------|
| `title` | Recipe title | `Spaghetti Carbonara` |
| `servings`, `serves`, `yield` | Number of servings (for scaling) | `2`, `15 cups worth` |
| `source`, `source.name` | Recipe source (URL or text) | `https://example.org/recipe`, `The Palomar Cookbook` |
| `author`, `source.author` | Recipe author | `John Doe` |
| `source.url` | Recipe URL (if using nested format) | `https://example.org/recipe` |
| `time`, `time required`, `duration` | Total preparation + cook time | `45 minutes`, `1h30m` |
| `prep time`, `time.prep` | Preparation time only | `2 hours 30 min` |
| `cook time`, `time.cook` | Cooking time only | `10 minutes` |
| `difficulty` | Difficulty level | `easy`, `medium`, `hard` |
| `cuisine` | Cuisine type | `French`, `Italian`, `Chinese` |
| `course`, `category` | Meal category | `dinner`, `dessert`, `appetizer` |
| `diet` | Dietary restrictions | `gluten-free`, `vegan`, `keto` (or array) |
| `tags` | Descriptive tags | `[baking, summer, 2022]` |
| `image`, `images`, `picture`, `pictures` | Image URL(s) | `https://example.org/image.jpg` (or array) |
| `introduction`, `description` | Recipe description/notes | `This recipe is a traditional dish...` |
| `locale` | Language/locale (ISO 639 code) | `en_GB`, `es_VE`, `fr` |

**Example:**
```yaml
---
title: Easy Pancakes
servings: 4
source: https://example.com/pancakes
author: Jane Smith
time: 20 minutes
difficulty: easy
tags:
  - breakfast
  - quick
  - vegetarian
---
```

## Advanced Features

### Notes (`>`)

Notes provide background information, tips, or anecdotes that aren't part of the cooking steps. Start a line with `>`.

**Example:**
```cooklang
> Don't burn the roux! Keep stirring constantly.

Mash @potato{2%kg} until smooth.
```

### Sections (`=`)

Use sections to organize complex recipes with separate components. Section names are optional.

**Syntax:**
- `= Section Name`
- `== Section Name ==`
- `=== Section Name ===`

**Example:**
```cooklang
= Dough

Mix @flour{200%g} and @water{100%ml} together until smooth.

== Filling ==

Combine @cheese{100%g} and @spinach{50%g}, then season to taste.
```

### Shorthand Preparations

Define ingredient preparations directly in the ingredient reference using parentheses (no space before parentheses).

**Syntax:** `@ingredient{quantity}(preparation instructions)`

**Example:**
```cooklang
Mix @onion{1}(peeled and finely chopped) and @garlic{2%cloves}(peeled and minced) into paste.
```

This is equivalent to:
```cooklang
Peel and finely chop @onion{1}. Peel and mince @garlic{2%cloves}.

Mix onion and garlic into paste.
```

### Recipe References

Reference other recipes using relative file paths with the `@` ingredient syntax.

**Syntax:** `@./Recipe Name{quantity}` or `@../path/to/Recipe Name{quantity}`

**Example:**
```cooklang
Pour over with @./sauces/Hollandaise{150%g}.
Add @../sauces/Bechamel{200%ml} to the pan.
```

## Conversion Guidelines

### Step-by-Step Conversion Process

1. **Extract Metadata**
   - Title → `title` in front matter
   - Servings/yield → `servings` in front matter
   - Source URL → `source` or `source.url` in front matter
   - Author → `author` in front matter
   - Time information → `time`, `prep time`, `cook time` in front matter
   - Tags/categories → `tags` in front matter
   - Description → `introduction` or `description` in front matter

2. **Identify Ingredients**
   - Mark all ingredients with `@`
   - Extract quantities and units
   - Use `{}` for multi-word ingredient names
   - Use `%` between quantity and unit
   - Use `=` for fixed quantities that shouldn't scale (e.g., salt, baking powder)

3. **Identify Cookware**
   - Mark all cookware/tools with `#`
   - Use `{}` for multi-word cookware names

4. **Identify Timers**
   - Mark all time durations with `~`
   - Extract time values and units
   - Name timers when appropriate (e.g., `~eggs{3%minutes}`)

5. **Structure Steps**
   - Each paragraph becomes a step
   - Separate steps with blank lines
   - Preserve natural language flow
   - Keep instructions clear and concise

6. **Add Preparations**
   - Use shorthand preparations `(preparation)` when ingredients need specific prep
   - Common preparations: chopped, diced, minced, peeled, sliced, grated, etc.

7. **Organize Complex Recipes**
   - Use sections (`=`) for separate components (dough, filling, sauce, etc.)
   - Use notes (`>`) for tips, warnings, or background information

### Common Patterns

**Ingredient with preparation:**
```cooklang
Add @onion{1}(diced) and @garlic{2%cloves}(minced) to the pan.
```

**Multiple ingredients in one step:**
```cooklang
Mix @flour{500%g}, @sugar{100%g}, and @salt{=1%tsp} in a #bowl{}.
```

**Timer with cookware:**
```cooklang
Place in a #preheated oven{} and bake for ~{30%minutes}.
```

**Conditional instructions:**
```cooklang
Melt the butter (or a drizzle of @oil if you want to be healthier) in a #pan{}.
```

**Temperature and time:**
```cooklang
Bake at 200°C for ~{25%minutes}.
```

### Quantity Conversion Tips

- **Common units:**
  - Weight: `g`, `kg`, `oz`, `lb`
  - Volume: `ml`, `L`, `cup`, `tbsp`, `tsp`, `fl oz`
  - Count: `items`, `pieces`, `cloves`, `stalks`
  - Size descriptors: `small`, `medium`, `large`

- **Fraction handling:**
  - Use fractions: `1/2`, `1/4`, `3/4`
  - Or decimals: `0.5`, `0.25`, `0.75`

- **Fixed quantities (use `=`):**
  - Salt, pepper, baking powder, yeast packets
  - Small amounts that don't scale with servings
  - Example: `@salt{=1%tsp}`, `@yeast{=1%packet}`

### Best Practices

1. **Be consistent with units**: Use metric (g, ml) or imperial (oz, cups) consistently, or include both
2. **Preserve natural language**: Keep instructions readable and conversational
3. **Mark all ingredients**: Don't miss any ingredients mentioned in the recipe
4. **Use appropriate precision**: Round quantities to reasonable precision (e.g., `1/2%cup` not `0.500000%cup`)
5. **Name timers when helpful**: Use named timers for multiple concurrent timers
6. **Use sections for complex recipes**: Break down multi-component recipes into sections
7. **Include metadata**: Add as much metadata as available (source, author, time, etc.)
8. **Preserve context**: Keep helpful notes, tips, and warnings from the original recipe

## Example Conversions

### Simple Recipe

**Original:**
```
Easy Pancakes
Serves 4

Ingredients:
- 3 eggs
- 125g flour
- 250ml milk
- 1 pinch sea salt
- Butter or oil for cooking

Instructions:
1. Crack the eggs into a blender, add flour, milk and salt, blend until smooth.
2. Pour into a bowl and let stand for 15 minutes.
3. Melt butter in a large non-stick frying pan over medium heat.
4. Pour in 1 ladle of batter and cook for 1-2 minutes until golden.
5. Flip and cook for 1 more minute.
6. Serve immediately.
```

**Cooklang:**
```cooklang
---
title: Easy Pancakes
servings: 4
---

Crack the @eggs{3} into a blender, then add the @flour{125%g}, @milk{250%ml} and @sea salt{1%pinch}, and blitz until smooth.

Pour into a #bowl and leave to stand for ~{15%minutes}.

Melt the butter (or a drizzle of @oil if you want to be a bit healthier) in a #large non-stick frying pan{} on a medium heat, then tilt the pan so the butter coats the surface.

Pour in 1 ladle of batter and tilt again, so that the batter spreads all over the base, then cook for 1 to 2 minutes, or until it starts to come away from the sides.

Once golden underneath, flip the pancake over and cook for 1 further minute, or until cooked through.

Serve straightaway with your favourite topping.
```

### Complex Recipe with Sections

**Original:**
```
Chocolate Layer Cake

Dough:
- 200g flour
- 100ml water

Filling:
- 100g chocolate
- 50g butter
```

**Cooklang:**
```cooklang
---
title: Chocolate Layer Cake
---

= Dough

Mix @flour{200%g} and @water{100%ml} together until smooth.

== Filling ==

Melt @chocolate{100%g} and @butter{50%g} together in a #double boiler{}.
```

## Common Pitfalls to Avoid

1. **Missing `{}` for multi-word names**: Use `@ground black pepper{}` not `@ground black pepper`
2. **Missing `%` between quantity and unit**: Use `{500%g}` not `{500 g}` or `{500g}`
3. **Forgetting fixed quantities**: Use `{=1%tsp}` for salt, baking powder, etc.
4. **Not separating steps**: Use blank lines between steps
5. **Incorrect timer syntax**: Use `~{25%minutes}` not `~25 minutes` or `~{25 minutes}`
6. **Missing cookware**: Mark all tools and equipment with `#`
7. **Over-marking**: Don't mark non-ingredients (e.g., "add flavor" - flavor is not an ingredient)

## Validation Checklist

Before finalizing a converted recipe, verify:

- [ ] All ingredients are marked with `@`
- [ ] All cookware is marked with `#`
- [ ] All timers are marked with `~`
- [ ] Multi-word ingredients/cookware use `{}`
- [ ] Quantities with units use `%` separator
- [ ] Fixed quantities use `=` prefix
- [ ] Steps are separated by blank lines
- [ ] Metadata is in YAML front matter format
- [ ] Recipe is human-readable and natural
- [ ] All quantities are reasonable and properly formatted

## Additional Resources

- Official spec: See `README.md` in this repository
- EBNF grammar: See `EBNF.md` for formal syntax
- Examples: See `examples/` directory for real-world recipes
- Proposals: See `proposals/` directory for advanced features

