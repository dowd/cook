<!--
  Sync Impact Report:
  Version change: 1.0.0 → 1.1.0 (MINOR: added backend architecture clarification)
  Modified principles: III. Static Output Generation (clarified API consumption pattern)
  Added sections: Architecture Separation
  Removed sections: N/A
  Templates requiring updates:
    ✅ plan-template.md - Constitution Check section aligns with principles
    ✅ spec-template.md - No changes needed (generic template)
    ✅ tasks-template.md - No changes needed (generic template)
    ✅ checklist-template.md - No changes needed (generic template)
  Follow-up TODOs: None
-->

# Cooklang Static Site Generator Constitution

## Core Principles

### I. Zero Dependencies
The project MUST use only Node.js built-in modules. No external npm packages are permitted. This ensures minimal setup, fast builds, and eliminates dependency management overhead. Rationale: The project's value proposition includes "zero dependencies" as a key feature, enabling users to run the generator without npm install steps.

### II. Cooklang Compliance
The parser MUST correctly handle standard Cooklang syntax: `@ingredient{amount%unit}` for ingredients, `#equipment{}` for equipment, `~{time%unit}` for timers, and `>> metadata: value` for frontmatter. Deviations from the Cooklang specification are not permitted. Rationale: Interoperability with the Cooklang ecosystem requires strict adherence to the specification.

### III. Static Output Generation
The generator MUST produce static HTML files with no runtime server dependencies. All processing occurs at build time. Generated sites MUST be deployable to any static hosting service (GitHub Pages, Netlify, etc.) without server-side requirements. The generated static site MAY consume external APIs (e.g., AWS backend services for auth and data) via client-side JavaScript, but the generator itself MUST NOT include backend code. Rationale: Static sites are simpler, faster, more secure, and cheaper to host. Separation of static generator from backend services enables independent scaling and deployment.

### IV. Template-Driven Architecture
HTML generation MUST use the custom template engine with Handlebars-like syntax (`{{variable}}`, `{{#each}}`, `{{#if}}`). Templates MUST be stored in `src/templates/` and be easily customizable. The template engine MUST support HTML escaping for security. Rationale: Separation of concerns enables non-developers to modify site appearance without touching parser logic.

### V. Simplicity
Code MUST prioritize clarity and maintainability over premature optimization. Complex features MUST be justified with clear use cases. YAGNI (You Aren't Gonna Need It) principles apply. Rationale: A static site generator should remain simple to understand, modify, and debug.

## Architecture Separation

**Static Site Generator** (this repository): Build-time tool that processes Cooklang files and generates static HTML. Zero runtime dependencies.

**Generated Static Site**: Output HTML/CSS/JS files deployable to CDN or static hosting. May include client-side JavaScript for API consumption.

**Backend Services** (separate AWS deployment): Authentication and API backend services deployed independently. Not part of this generator repository.

**Separation Principle**: The generator MUST remain independent of backend implementation. Backend API endpoints and authentication flows are configured in the generated site's client-side code, not in the generator itself.

## Technology Constraints

**Runtime**: Node.js v14 or higher (ES modules support required)

**Dependencies**: None (built-in modules only: `fs/promises`, `path`)

**Output Format**: Static HTML files with embedded CSS/JS (no bundling required). Generated site may include client-side API calls to external backends.

**Input Format**: Cooklang `.cook` files following the Cooklang specification

**Template Syntax**: Custom Handlebars-like engine (no external template libraries)

**Backend Integration**: Backend API endpoints and auth configuration are external concerns, configured in generated site templates or client-side JavaScript, not in generator code.

## Development Workflow

**Build Process**: Single command `npm run build` or `node src/index.js` generates complete static site in `dist/` directory

**Testing**: Manual verification of generated HTML output. Test with sample `.cook` files covering all Cooklang syntax features

**Code Review**: All changes MUST verify Cooklang syntax parsing correctness and static output generation

**Documentation**: README MUST document Cooklang format requirements and template customization process

## Governance

This constitution supersedes all other development practices. Amendments require:

1. Documentation of the change rationale
2. Update to this file with version increment (semantic versioning)
3. Verification that dependent templates remain consistent
4. Update to README if user-facing behavior changes

All PRs and reviews MUST verify compliance with these principles. Complexity additions MUST be justified in the Complexity Tracking section of implementation plans.

**Version**: 1.1.0 | **Ratified**: 2025-01-27 | **Last Amended**: 2025-01-27
