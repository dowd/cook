# Implementation Plan: Serverless Backend for Cooklang Recipe Site

**Branch**: `001-serverless-backend` | **Date**: 2025-01-27 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-serverless-backend/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Build a serverless backend API for managing Cooklang recipes using AWS Lambda, API Gateway, Cognito, and S3. The backend provides RESTful endpoints for CRUD operations on recipes, with public read access and authenticated write operations. Recipes are stored as `.cook` files in S3 with versioning enabled. The system must be deployable via AWS SAM and support both text-based recipe creation and file uploads.

## Technical Context

**Language/Version**: Node.js 18.x or higher (AWS Lambda runtime)  
**Primary Dependencies**: AWS SDK v3 (`@aws-sdk/client-s3`, `@aws-sdk/client-cognito-identity-provider`), JWT verification library (e.g., `jsonwebtoken` or `jose`)  
**Storage**: AWS S3 (recipe files), S3 object tags (metadata)  
**Testing**: Jest or Node.js built-in test runner, AWS SAM CLI for local testing  
**Target Platform**: AWS Lambda (serverless), API Gateway (REST API)  
**Project Type**: Serverless backend API  
**Performance Goals**: 
- List recipes: <2s for up to 1000 recipes
- Get single recipe: <1s
- Create/update/delete: <3s end-to-end
- Support 100 concurrent users without degradation  
**Constraints**: 
- Must deploy via AWS SAM
- Minimal logging (errors only)
- Rate limiting per IP address
- Recipe file size limit: 1MB
- CORS configurable via SAM parameters  
**Scale/Scope**: 
- Up to 1000 recipes initially
- 100 concurrent users
- Single AWS region deployment

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*



**Constitution Alignment**:
- ✅ **Architecture Separation**: Backend is separate AWS deployment, independent of static generator. Monorepo structure maintains logical separation (different directories, different deployments) while enabling shared development workflow.
- ✅ **Zero Dependencies (Generator)**: Static site generator in `src/` remains zero-dependency (unchanged). Backend has its own dependencies in `backend/package.json`.
- ✅ **Simplicity**: Serverless architecture keeps complexity low, no infrastructure management. Monorepo adds minimal complexity (just directory organization).
- ✅ **Cooklang Compliance**: Backend stores and serves Cooklang files without modification.

**Gates**: PASS - Monorepo structure maintains architecture separation (separate directories, separate deployments) while enabling shared development. No violations.

## Project Structure

### Documentation (this feature)

```text
specs/001-serverless-backend/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

**Note**: This is a monorepo structure with backend and frontend (static site generator) in the same repository. Backend and frontend remain separate deployments but share the repository for easier development and maintenance.

```text
repo-root/
├── backend/                # Serverless backend (AWS SAM)
│   ├── src/
│   │   ├── handlers/       # Lambda function handlers
│   │   │   ├── get-recipes.js
│   │   │   ├── get-recipe.js
│   │   │   ├── create-recipe.js
│   │   │   ├── update-recipe.js
│   │   │   └── delete-recipe.js
│   │   ├── lib/           # Shared utilities
│   │   │   ├── auth.js    # JWT validation
│   │   │   ├── s3-client.js
│   │   │   ├── recipe-parser.js
│   │   │   └── id-generator.js
│   │   └── utils/
│   │       ├── errors.js
│   │       └── validation.js
│   ├── template.yaml       # SAM template
│   ├── package.json        # Backend dependencies
│   └── tests/
│       ├── unit/
│       └── integration/
│
├── src/                    # Static site generator (existing)
│   ├── index.js
│   ├── processor.js
│   ├── generator.js
│   ├── templates/
│   └── assets/
│
├── recipes/                # Shared recipe files (used by both)
│   └── *.cook
│
├── dist/                   # Generated static site (frontend output)
│
├── package.json            # Root package.json (optional workspace config)
├── .gitignore
└── README.md
```

**Structure Decision**: Monorepo with separate directories for backend and frontend. Backend in `backend/` directory, frontend (static generator) in `src/` directory. Shared `recipes/` directory can be used by both. Each component has its own `package.json` for independent dependency management. Backend remains a separate AWS deployment despite being in the same repository.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations - backend is separate deployment, aligns with architecture separation principle.

---

## Phase 0: Research Complete ✅

**Output**: `research.md`

All technical decisions resolved:
- AWS SAM template structure
- JWT token validation approach
- S3 operations and versioning
- Short alphanumeric ID generation
- Rate limiting strategy
- CORS configuration
- Multipart file upload handling
- Error logging approach

**Status**: All NEEDS CLARIFICATION items resolved. Ready for Phase 1.

---

## Phase 1: Design Complete ✅

**Outputs**:
- `data-model.md` - Entity definitions, validation rules, storage strategy
- `contracts/openapi.yaml` - Complete OpenAPI 3.0 specification
- `quickstart.md` - Deployment and usage guide

**Design Decisions**:
- S3-only storage (no database)
- Object tags for metadata
- RESTful API with standard HTTP methods
- Public read, authenticated write
- Short alphanumeric IDs (8 chars)

**Constitution Check (Post-Design)**: ✅ PASS
- Architecture separation maintained (monorepo with separate directories and deployments)
- Simplicity preserved (S3-only, no database)
- Cooklang compliance ensured
- Generator zero-dependency principle maintained (separate package.json)

**Monorepo Benefits**:
- Shared recipes directory
- Unified version control
- Easier local development (both components in one repo)
- Independent deployments (backend via SAM, frontend to static hosting)

**Status**: Design complete. Ready for implementation planning (Phase 2).
