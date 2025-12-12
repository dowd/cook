# Cooklang Format Quick Reference

## Core Syntax

### Ingredients (`@`)
- Single word: `@salt`
- Multi-word: `@ground black pepper{}` (use `{}` to end multi-word names)
- With quantity: `@potato{2}`
- With unit: `@flour{500%g}` (use `%` between quantity and unit)
- Fixed quantity (doesn't scale): `@salt{=1%tsp}` (use `=` prefix)

**Quantity formats:** `{2}`, `{1/2}`, `{1.5}`, `{2%cups}`, `{500%g}`

### Cookware (`#`)
- Single word: `#pot`
- Multi-word: `#potato masher{}` (use `{}` to end multi-word names)

### Timers (`~`)
- Unnamed: `~{25%minutes}`
- Named: `~eggs{3%minutes}`

### Steps
Each paragraph (separated by blank lines) is a step.

### Comments
- Line comment: `-- comment text`
- Block comment: `[- comment text -]`
- Standalone: `-- comment` at start of line

## Metadata (YAML Front Matter)

```yaml
---
title: Recipe Name
servings: 4
source: https://example.com/recipe
author: Author Name
time: 45 minutes
tags:
  - tag1
  - tag2
---
```

Common fields: `title`, `servings`, `source`, `author`, `time`, `prep time`, `cook time`, `difficulty`, `tags`, `diet`, `cuisine`, `course`

## Advanced Features

- **Notes**: `> Note text` (background info, tips)
- **Sections**: `= Section Name` or `== Section Name ==` (organize complex recipes)
- **Shorthand preparations**: `@onion{1}(diced)` (prep instructions in parentheses)
- **Recipe references**: `@./Recipe Name{quantity}` (reference other recipes)

## Key Rules

1. **Multi-word names**: Always use `{}` to mark end: `@ground black pepper{}`
2. **Quantity + unit**: Always use `%` separator: `{500%g}` not `{500g}`
3. **Fixed quantities**: Use `=` for non-scaling items: `@salt{=1%tsp}`
4. **Steps**: Separate with blank lines
5. **Timer syntax**: `~{25%minutes}` not `~25 minutes`

## Common Pitfalls

- Missing `{}` for multi-word names
- Missing `%` between quantity and unit
- Forgetting `=` for fixed quantities (salt, baking powder, etc.)
- Not separating steps with blank lines
- Incorrect timer syntax

