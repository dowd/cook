# Feature Specification: Serverless Backend for Cooklang Recipe Site

**Feature Branch**: `001-serverless-backend`  
**Created**: 2025-01-27  
**Last Updated**: 2025-01-27  
**Status**: Draft  
**Input**: User description: "Build serverless backend for Cooklang recipe site"

## Clarifications

### Session 2025-01-27

- Q: How should the title be extracted when a `.cook` file is uploaded? → A: Extract title from frontmatter `>> title:` field, fallback to filename (without extension) if missing
- Q: Should the API implement rate limiting to prevent abuse? → A: Implement rate limiting per IP address for all operations (read and write)
- Q: What level of observability (logging, metrics, monitoring) should the system provide? → A: Minimal logging: errors only
- Q: How should CORS be configured for the API? → A: Configurable allowed origins via SAM parameters (default: allow all for development)
- Q: What format should recipe IDs use? → A: Short alphanumeric ID (e.g., `abc123`, `recipe-xyz`)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Recipes (Priority: P1)

All users (authenticated and non-authenticated) can browse and view Cooklang recipes stored in the system. Users can see a list of all available recipes with basic metadata (title, ID) and retrieve the full content of any individual recipe without requiring authentication.

**Why this priority**: Viewing recipes is the core read operation that enables users to access recipe content. Making recipes publicly viewable maximizes accessibility and enables the static site to display recipes without requiring user authentication. This is the minimum viable functionality.

**Independent Test**: Can be fully tested by calling GET /recipes to retrieve the list and GET /recipes/{id} to retrieve a specific recipe without any authentication. Delivers immediate value by enabling public recipe discovery and viewing.

**Acceptance Scenarios**:

1. **Given** any user (authenticated or not), **When** they request a list of recipes via GET /recipes, **Then** they receive a JSON response containing an array of recipe summaries (ID and title) for all recipes in the system
2. **Given** any user (authenticated or not), **When** they request a specific recipe via GET /recipes/{id}, **Then** they receive the full Cooklang content of that recipe
3. **Given** any user (authenticated or not), **When** they request a recipe that does not exist via GET /recipes/{id}, **Then** they receive a 404 Not Found error response
4. **Given** any user (authenticated or not), **When** they request recipes via GET /recipes or GET /recipes/{id}, **Then** authentication is not required and they receive the requested data

---

### User Story 2 - Create Recipes (Priority: P2)

Authenticated users can create new Cooklang recipes by submitting recipe content and metadata. Users can either submit recipe content as text or upload a `.cook` file directly. The system stores the recipe as a `.cook` file and makes it available for viewing and editing.

**Why this priority**: Creating recipes is the primary write operation that enables content creation. This transforms the system from read-only to a content management platform. Supporting both text submission and file upload provides flexibility for different user workflows.

**Independent Test**: Can be fully tested by authenticating a user, calling POST /recipes with Cooklang content and title (or uploading a .cook file), then verifying the recipe appears in GET /recipes and can be retrieved via GET /recipes/{id}. Delivers value by enabling users to add their own recipes via their preferred method.

**Acceptance Scenarios**:

1. **Given** a user is authenticated with a valid JWT token, **When** they submit a new recipe via POST /recipes with valid Cooklang content and title, **Then** the recipe is stored in S3, assigned a unique ID, and they receive a 201 Created response with the recipe ID
2. **Given** a user is authenticated with a valid JWT token, **When** they upload a `.cook` file via POST /recipes with multipart/form-data, **Then** the system extracts the title from the frontmatter `>> title:` field (or uses filename without extension as fallback), stores the file in S3, assigns a unique ID, and they receive a 201 Created response with the recipe ID
3. **Given** a user is authenticated with a valid JWT token, **When** they submit a recipe via POST /recipes without required fields (title or content/file), **Then** they receive a 400 Bad Request error response
4. **Given** a user is not authenticated or provides an invalid JWT token, **When** they attempt to create a recipe via POST /recipes, **Then** they receive a 401 Unauthorized error response

---

### User Story 3 - Update Recipes (Priority: P3)

Authenticated users can modify existing recipes by updating the Cooklang content. The system preserves previous versions through S3 versioning and updates the current version.

**Why this priority**: Updating recipes enables users to correct mistakes and refine recipes over time. This improves content quality and user satisfaction.

**Independent Test**: Can be fully tested by authenticating a user, creating a recipe via POST /recipes, updating it via PUT /recipes/{id}, then verifying the changes appear in GET /recipes/{id}. Delivers value by enabling recipe refinement.

**Acceptance Scenarios**:

1. **Given** a user is authenticated with a valid JWT token and a recipe exists, **When** they update the recipe via PUT /recipes/{id} with new Cooklang content, **Then** the recipe is updated in S3, previous version is preserved, and they receive a 200 OK response
2. **Given** a user is authenticated with a valid JWT token, **When** they attempt to update a recipe that does not exist via PUT /recipes/{id}, **Then** they receive a 404 Not Found error response
3. **Given** a user is not authenticated or provides an invalid JWT token, **When** they attempt to update a recipe via PUT /recipes/{id}, **Then** they receive a 401 Unauthorized error response

---

### User Story 4 - Delete Recipes (Priority: P4)

Authenticated users can remove recipes from the system. The system permanently deletes the recipe file from S3.

**Why this priority**: Deleting recipes enables users to remove unwanted or incorrect content. This completes the CRUD operations but is less critical than create/update.

**Independent Test**: Can be fully tested by authenticating a user, creating a recipe via POST /recipes, deleting it via DELETE /recipes/{id}, then verifying it no longer appears in GET /recipes. Delivers value by enabling content cleanup.

**Acceptance Scenarios**:

1. **Given** a user is authenticated with a valid JWT token and a recipe exists, **When** they delete the recipe via DELETE /recipes/{id}, **Then** the recipe is removed from S3 and they receive a 200 OK or 204 No Content response
2. **Given** a user is authenticated with a valid JWT token, **When** they attempt to delete a recipe that does not exist via DELETE /recipes/{id}, **Then** they receive a 404 Not Found error response
3. **Given** a user is not authenticated or provides an invalid JWT token, **When** they attempt to delete a recipe via DELETE /recipes/{id}, **Then** they receive a 401 Unauthorized error response

---

### Edge Cases

- What happens when a user requests a recipe list but no recipes exist? System returns an empty array `[]` with 200 OK status
- How does the system handle invalid Cooklang syntax in recipe content? System accepts and stores content as-is (validation is frontend concern)
- What happens when S3 is temporarily unavailable? System returns 503 Service Unavailable error
- How does the system handle concurrent updates to the same recipe? Last write wins (S3 handles concurrency)
- What happens when a recipe ID contains invalid characters? System validates ID format (alphanumeric characters only) and returns 400 Bad Request for invalid IDs
- How does the system handle very large recipe files? System enforces reasonable size limits and returns 413 Payload Too Large for oversized content
- What happens when JWT token expires during a write operation request? System returns 401 Unauthorized with appropriate error message
- What happens when a non-authenticated user attempts a write operation? System returns 401 Unauthorized error response
- What happens when an uploaded .cook file has invalid format or extension? System validates file extension and returns 400 Bad Request for invalid files
- What happens when both text content and file are provided in create request? System accepts either text content OR file upload, returns 400 Bad Request if both are provided
- What happens when an uploaded .cook file has no frontmatter title and filename is empty or invalid? System uses sanitized filename (without extension) as title, or generates a default title if filename cannot be used
- What happens when a user exceeds rate limits? System returns 429 Too Many Requests error with appropriate retry-after header
- How are system errors tracked? System logs errors only (not successful requests) for debugging and operational monitoring

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow non-authenticated users to view recipes (GET /recipes and GET /recipes/{id}) without requiring authentication
- **FR-002**: System MUST authenticate users using AWS Cognito JWT tokens before allowing write operations (create, update, delete)
- **FR-003**: System MUST validate JWT token signature and expiration for write operation requests
- **FR-004**: System MUST store each recipe as a `.cook` file in an S3 bucket with versioning enabled
- **FR-005**: System MUST assign a unique short alphanumeric identifier to each recipe upon creation (e.g., `abc123`, `recipe-xyz`)
- **FR-006**: System MUST support retrieving a list of all recipes with basic metadata (ID and title)
- **FR-007**: System MUST support retrieving the full content of a specific recipe by ID
- **FR-008**: System MUST support creating new recipes with Cooklang content and title submitted as text
- **FR-009**: System MUST support creating new recipes by uploading `.cook` files via multipart/form-data. When a `.cook` file is uploaded, the system MUST extract the title from the frontmatter `>> title:` field, falling back to the filename (without `.cook` extension) if the frontmatter title is missing
- **FR-010**: System MUST support updating existing recipes by ID with new Cooklang content
- **FR-011**: System MUST support deleting recipes by ID
- **FR-012**: System MUST return appropriate HTTP status codes (200, 201, 400, 401, 404, 413, 500, 503)
- **FR-013**: System MUST preserve previous versions of recipes when updated (via S3 versioning)
- **FR-014**: System MUST store recipe metadata (creation date, last modified date, title) using S3 object tags
- **FR-015**: System MUST handle errors gracefully and return user-friendly error messages
- **FR-016**: System MUST support CORS configuration with configurable allowed origins via SAM parameters (default: allow all origins for development)
- **FR-017**: All authenticated users MUST have equal permissions (no role-based access control in MVP)
- **FR-018**: System MUST be deployable using AWS SAM (Serverless Application Model) with a single deployment command
- **FR-019**: System MUST implement rate limiting per IP address for all API operations (read and write) to prevent abuse and DoS attacks
- **FR-020**: System MUST log errors only (minimal logging approach) for operational debugging

### Key Entities *(include if feature involves data)*

- **Recipe**: Represents a Cooklang recipe file stored in the system. Key attributes: unique ID (short alphanumeric identifier assigned by system, e.g., `abc123`), title (user-provided or extracted from frontmatter/filename), Cooklang content (user-provided), creation date (system-generated), last modified date (system-updated), S3 object key (system-generated). Relationships: stored in S3 bucket, associated with S3 object tags for metadata.

- **User**: Represents an authenticated user accessing the system. Key attributes: Cognito user ID (from JWT), JWT token (temporary, for authentication). Relationships: can create/read/update/delete recipes. Note: User management (sign-up, sign-in) is handled by AWS Cognito, not this backend.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users (authenticated or not) can retrieve a list of recipes in under 2 seconds for up to 1000 recipes
- **SC-002**: Users (authenticated or not) can retrieve a single recipe's full content in under 1 second
- **SC-003**: Authenticated users can create a new recipe in under 3 seconds from submission to confirmation
- **SC-004**: Authenticated users can update an existing recipe in under 2 seconds from submission to confirmation
- **SC-005**: Authenticated users can delete a recipe in under 2 seconds from request to confirmation
- **SC-006**: System successfully authenticates and processes 95% of valid JWT token requests without errors
- **SC-007**: System rejects 100% of invalid or expired JWT token requests for write operations with appropriate error responses
- **SC-008**: System maintains 99.9% uptime for API endpoints during normal operations
- **SC-009**: System handles concurrent requests from 100 users (authenticated and non-authenticated) without performance degradation
- **SC-010**: System can be deployed to AWS using SAM with a single command in under 5 minutes

## Assumptions

- All authenticated users have equal permissions (no admin/regular user distinction in MVP)
- Recipe metadata (creation date, last modified, title) is stored in S3 object tags rather than a separate database
- Frontend handles Cooklang syntax validation; backend accepts and stores content as-is
- Recipe IDs are generated by the backend system as short alphanumeric identifiers (e.g., `abc123`, `recipe-xyz`)
- S3 bucket is pre-configured with versioning enabled
- AWS Cognito user pool and app client are pre-configured
- Frontend domain for CORS is known and can be configured
- Shopping list functionality is out of scope for MVP
- Search and filtering capabilities are out of scope for MVP
- Recipe file size limit is reasonable (e.g., 1MB per recipe) to prevent abuse
- Read operations (view recipes) are publicly accessible without authentication
- Write operations (create, update, delete) require authentication
- AWS SAM template includes all necessary resources (Lambda functions, API Gateway, S3 bucket, Cognito configuration)
- CORS allowed origins are configurable via SAM deployment parameters, defaulting to allow all origins for development convenience
