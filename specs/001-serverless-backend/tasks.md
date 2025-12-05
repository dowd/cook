# Tasks: Serverless Backend for Cooklang Recipe Site

**Input**: Design documents from `/specs/001-serverless-backend/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Tests are OPTIONAL and not requested in the feature specification. No test tasks included.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Monorepo structure**: Backend in `backend/` directory, frontend in `src/` directory
- Backend paths: `backend/src/`, `backend/template.yaml`, `backend/package.json`
- Paths shown below use monorepo structure from plan.md

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [ ] T001 Create backend directory structure per implementation plan (backend/src/handlers/, backend/src/lib/, backend/src/utils/, backend/tests/unit/, backend/tests/integration/)
- [ ] T002 Initialize backend Node.js project with package.json in backend/package.json
- [ ] T003 [P] Install backend dependencies (@aws-sdk/client-s3, jsonwebtoken, nanoid, busboy) in backend/package.json
- [ ] T004 [P] Create SAM template skeleton in backend/template.yaml with basic structure (AWSTemplateFormatVersion, Transform, Parameters, Resources, Outputs)
- [ ] T005 [P] Create .gitignore entries for backend/ (.aws-sam/, node_modules/, .env)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T006 [P] Implement JWT validation utility in backend/src/lib/auth.js (validate Cognito JWT tokens, fetch JWKS, cache keys)
- [ ] T007 [P] Implement S3 client utility in backend/src/lib/s3-client.js (S3 operations wrapper, get/put/list/delete with versioning support)
- [ ] T008 [P] Implement ID generator utility in backend/src/lib/id-generator.js (nanoid with custom alphabet, 8-character alphanumeric IDs)
- [ ] T009 [P] Implement recipe parser utility in backend/src/lib/recipe-parser.js (extract title from frontmatter >> title: field, fallback to filename)
- [ ] T010 [P] Implement error handling utilities in backend/src/utils/errors.js (error response formatting, HTTP status code mapping)
- [ ] T011 [P] Implement input validation utilities in backend/src/utils/validation.js (recipe ID format validation, content size validation, file extension validation)
- [ ] T012 Configure SAM template parameters in backend/template.yaml (AllowedOrigin, CognitoUserPoolId, CognitoAppClientId, S3BucketName)
- [ ] T013 Define S3 bucket resource in backend/template.yaml with versioning enabled
- [ ] T014 Define API Gateway REST API resource in backend/template.yaml with CORS configuration
- [ ] T015 Configure API Gateway throttling in backend/template.yaml (rate limiting per IP address)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - View Recipes (Priority: P1) 🎯 MVP

**Goal**: Enable all users (authenticated and non-authenticated) to browse and view Cooklang recipes. Users can see a list of all recipes with metadata and retrieve full recipe content without authentication.

**Independent Test**: Can be fully tested by calling GET /recipes to retrieve the list and GET /recipes/{id} to retrieve a specific recipe without any authentication. Delivers immediate value by enabling public recipe discovery and viewing.

### Implementation for User Story 1

- [ ] T016 [P] [US1] Implement GET /recipes handler in backend/src/handlers/get-recipes.js (list all recipes from S3, retrieve tags for metadata, return JSON array)
- [ ] T017 [P] [US1] Implement GET /recipes/{id} handler in backend/src/handlers/get-recipe.js (retrieve single recipe from S3 by ID, return Cooklang content)
- [ ] T018 [US1] Add error handling for 404 Not Found in backend/src/handlers/get-recipe.js (recipe not found)
- [ ] T019 [US1] Add error handling for 400 Bad Request in backend/src/handlers/get-recipe.js (invalid recipe ID format)
- [ ] T020 [US1] Add error handling for 503 Service Unavailable in backend/src/handlers/get-recipes.js and backend/src/handlers/get-recipe.js (S3 unavailable)
- [ ] T021 [US1] Configure GET /recipes route in backend/template.yaml (API Gateway integration, no authentication required)
- [ ] T022 [US1] Configure GET /recipes/{id} route in backend/template.yaml (API Gateway integration, no authentication required)
- [ ] T023 [US1] Create Lambda function resources in backend/template.yaml (GetRecipesFunction, GetRecipeFunction with S3 read permissions)

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently. Users can list and view recipes without authentication.

---

## Phase 4: User Story 2 - Create Recipes (Priority: P2)

**Goal**: Enable authenticated users to create new Cooklang recipes by submitting recipe content as text or uploading a .cook file. System stores recipes in S3 and assigns unique IDs.

**Independent Test**: Can be fully tested by authenticating a user, calling POST /recipes with Cooklang content and title (or uploading a .cook file), then verifying the recipe appears in GET /recipes and can be retrieved via GET /recipes/{id}. Delivers value by enabling users to add their own recipes via their preferred method.

### Implementation for User Story 2

- [ ] T024 [US2] Implement JWT authentication middleware in backend/src/lib/auth.js (extract token from Authorization header, validate token for write operations)
- [ ] T025 [P] [US2] Implement POST /recipes handler for text content in backend/src/handlers/create-recipe.js (accept JSON with title and content, validate input, generate ID, store in S3)
- [ ] T026 [US2] Implement multipart file upload parsing in backend/src/handlers/create-recipe.js (use busboy to parse multipart/form-data, extract .cook file)
- [ ] T027 [US2] Implement title extraction logic in backend/src/handlers/create-recipe.js (use recipe-parser.js to extract title from frontmatter or filename)
- [ ] T028 [US2] Implement S3 object tagging in backend/src/handlers/create-recipe.js (store title, createdAt, lastModified, recipeId as S3 tags)
- [ ] T029 [US2] Add input validation in backend/src/handlers/create-recipe.js (validate required fields, file extension, content size limit 1MB)
- [ ] T030 [US2] Add error handling for 400 Bad Request in backend/src/handlers/create-recipe.js (missing fields, invalid file format, oversized content)
- [ ] T031 [US2] Add error handling for 401 Unauthorized in backend/src/handlers/create-recipe.js (missing or invalid JWT token)
- [ ] T032 [US2] Configure POST /recipes route in backend/template.yaml (API Gateway integration, Lambda authorizer for authentication)
- [ ] T033 [US2] Create Lambda function resource in backend/template.yaml (CreateRecipeFunction with S3 write permissions and Cognito access)
- [ ] T034 [US2] Configure Lambda authorizer in backend/template.yaml (Cognito JWT authorizer for write operations)

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently. Authenticated users can create recipes via text or file upload.

---

## Phase 5: User Story 3 - Update Recipes (Priority: P3)

**Goal**: Enable authenticated users to modify existing recipes by updating Cooklang content. System preserves previous versions through S3 versioning.

**Independent Test**: Can be fully tested by authenticating a user, creating a recipe via POST /recipes, updating it via PUT /recipes/{id}, then verifying the changes appear in GET /recipes/{id}. Delivers value by enabling recipe refinement.

### Implementation for User Story 3

- [ ] T035 [P] [US3] Implement PUT /recipes/{id} handler in backend/src/handlers/update-recipe.js (validate recipe ID, authenticate user, update S3 object, preserve version)
- [ ] T036 [US3] Implement S3 versioning preservation in backend/src/handlers/update-recipe.js (use PutObject which automatically creates new version)
- [ ] T037 [US3] Update S3 object tags in backend/src/handlers/update-recipe.js (update lastModified timestamp, preserve other tags)
- [ ] T038 [US3] Add input validation in backend/src/handlers/update-recipe.js (validate recipe ID format, content size limit 1MB)
- [ ] T039 [US3] Add error handling for 404 Not Found in backend/src/handlers/update-recipe.js (recipe does not exist)
- [ ] T040 [US3] Add error handling for 401 Unauthorized in backend/src/handlers/update-recipe.js (missing or invalid JWT token)
- [ ] T041 [US3] Configure PUT /recipes/{id} route in backend/template.yaml (API Gateway integration, Lambda authorizer for authentication)
- [ ] T042 [US3] Create Lambda function resource in backend/template.yaml (UpdateRecipeFunction with S3 write permissions and Cognito access)

**Checkpoint**: At this point, User Stories 1, 2, AND 3 should all work independently. Users can view, create, and update recipes.

---

## Phase 6: User Story 4 - Delete Recipes (Priority: P4)

**Goal**: Enable authenticated users to remove recipes from the system. System permanently deletes the recipe file from S3.

**Independent Test**: Can be fully tested by authenticating a user, creating a recipe via POST /recipes, deleting it via DELETE /recipes/{id}, then verifying it no longer appears in GET /recipes. Delivers value by enabling content cleanup.

### Implementation for User Story 4

- [ ] T043 [P] [US4] Implement DELETE /recipes/{id} handler in backend/src/handlers/delete-recipe.js (validate recipe ID, authenticate user, delete S3 object)
- [ ] T044 [US4] Add input validation in backend/src/handlers/delete-recipe.js (validate recipe ID format)
- [ ] T045 [US4] Add error handling for 404 Not Found in backend/src/handlers/delete-recipe.js (recipe does not exist)
- [ ] T046 [US4] Add error handling for 401 Unauthorized in backend/src/handlers/delete-recipe.js (missing or invalid JWT token)
- [ ] T047 [US4] Configure DELETE /recipes/{id} route in backend/template.yaml (API Gateway integration, Lambda authorizer for authentication)
- [ ] T048 [US4] Create Lambda function resource in backend/template.yaml (DeleteRecipeFunction with S3 delete permissions and Cognito access)

**Checkpoint**: All user stories should now be independently functional. Complete CRUD operations available.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T049 [P] Add error logging to all handlers in backend/src/handlers/ (use console.error with structured JSON format for CloudWatch)
- [ ] T050 [P] Add rate limiting error handling (429 Too Many Requests) to all handlers in backend/src/handlers/
- [ ] T051 Complete SAM template outputs in backend/template.yaml (API Gateway URL, S3 bucket name, Cognito User Pool ID)
- [ ] T052 Add environment variables to Lambda functions in backend/template.yaml (S3_BUCKET_NAME, COGNITO_USER_POOL_ID, COGNITO_APP_CLIENT_ID)
- [ ] T053 Configure IAM roles and policies in backend/template.yaml (S3 read/write/delete permissions, CloudWatch Logs permissions)
- [ ] T054 Add SAM template metadata and descriptions in backend/template.yaml
- [ ] T055 Create samconfig.toml in backend/ with deployment configuration
- [ ] T056 Create README.md in backend/ with setup and deployment instructions
- [ ] T057 Validate quickstart.md deployment steps work correctly
- [ ] T058 [P] Code cleanup and refactoring (extract common patterns, improve error messages)
- [ ] T059 [P] Add input sanitization for recipe IDs and content in backend/src/utils/validation.js
- [ ] T060 Verify all endpoints return correct HTTP status codes per OpenAPI specification

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3 → P4)
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Depends on US1 for testing (can create recipe then verify it appears in list)
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - Depends on US2 for testing (needs existing recipe to update)
- **User Story 4 (P4)**: Can start after Foundational (Phase 2) - Depends on US2 for testing (needs existing recipe to delete)

### Within Each User Story

- Shared utilities (lib/) before handlers
- Handlers before API Gateway configuration
- Core implementation before error handling
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel (T003, T004, T005)
- All Foundational tasks marked [P] can run in parallel (T006-T011)
- Once Foundational phase completes, user stories can start sequentially (P1 → P2 → P3 → P4)
- Handlers within a story marked [P] can be developed in parallel (T016-T017 for US1)
- Polish tasks marked [P] can run in parallel (T049, T050, T058, T059)

---

## Parallel Example: User Story 1

```bash
# Launch both GET handlers in parallel (different files, no dependencies):
Task: "Implement GET /recipes handler in backend/src/handlers/get-recipes.js"
Task: "Implement GET /recipes/{id} handler in backend/src/handlers/get-recipe.js"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently (GET /recipes, GET /recipes/{id})
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo
4. Add User Story 3 → Test independently → Deploy/Demo
5. Add User Story 4 → Test independently → Deploy/Demo
6. Each story adds value without breaking previous stories

### Sequential Development (Recommended)

With single developer:
1. Complete Setup + Foundational together
2. Implement User Story 1 → Test → Deploy
3. Implement User Story 2 → Test → Deploy
4. Implement User Story 3 → Test → Deploy
5. Implement User Story 4 → Test → Deploy
6. Complete Polish phase

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
- All handlers should use shared utilities from lib/ and utils/
- SAM template should be updated incrementally as each endpoint is added
- Error logging should use structured JSON format for CloudWatch Insights queries
