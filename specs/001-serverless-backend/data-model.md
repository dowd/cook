# Data Model: Serverless Backend for Cooklang Recipe Site

**Date**: 2025-01-27  
**Feature**: Serverless Backend API

## Entities

### Recipe

**Description**: Represents a Cooklang recipe file stored in the system.

**Storage**: AWS S3 object (file: `{recipeId}.cook`)

**Attributes**:

| Attribute | Type | Source | Validation | Notes |
|-----------|------|--------|------------|-------|
| `id` | String (alphanumeric, 8 chars) | System-generated | Pattern: `^[a-z0-9]{8}$` | Unique identifier, e.g., `abc12345` |
| `title` | String | User-provided or extracted | Max 200 chars, required | Extracted from frontmatter `>> title:` or filename |
| `content` | String (Cooklang format) | User-provided | Max 1MB, required | Raw `.cook` file content |
| `createdAt` | ISO 8601 DateTime | System-generated | - | Creation timestamp |
| `lastModified` | ISO 8601 DateTime | System-updated | - | Last update timestamp |
| `s3Key` | String | System-generated | Pattern: `^{id}\.cook$` | S3 object key |
| `s3VersionId` | String | S3-generated | - | Current version ID (for versioning) |

**Relationships**:
- Stored in S3 bucket (one-to-one with S3 object)
- Associated with S3 object tags (metadata storage)
- No direct relationships to other entities

**State Transitions**:
1. **Created**: Recipe created via POST /recipes → stored in S3 with initial version
2. **Updated**: Recipe modified via PUT /recipes/{id} → new S3 version created, previous preserved
3. **Deleted**: Recipe removed via DELETE /recipes/{id} → S3 object deleted (versions may remain)

**Validation Rules**:
- `id`: Must be unique, alphanumeric lowercase, exactly 8 characters
- `title`: Required, extracted from frontmatter or filename, max 200 characters
- `content`: Required, valid Cooklang syntax (validation deferred to frontend), max 1MB
- File extension: Must be `.cook` for uploaded files

**S3 Object Tags** (Metadata):
- `title`: Recipe title
- `createdAt`: ISO 8601 timestamp
- `lastModified`: ISO 8601 timestamp
- `recipeId`: Recipe ID (for quick lookup)

---

### User (Authenticated)

**Description**: Represents an authenticated user accessing the system. User management is handled by AWS Cognito.

**Storage**: AWS Cognito User Pool (not stored in backend)

**Attributes** (from JWT token):

| Attribute | Type | Source | Notes |
|-----------|------|--------|-------|
| `sub` | String (UUID) | Cognito | User ID (subject claim) |
| `email` | String | Cognito | User email (if available) |
| `token_use` | String | Cognito | Must be `id` or `access` |
| `exp` | Number | Cognito | Token expiration timestamp |
| `iss` | String | Cognito | Issuer (Cognito user pool URL) |

**Relationships**:
- Can create recipes (one-to-many)
- Can update recipes (one-to-many)
- Can delete recipes (one-to-many)
- No ownership tracking in MVP (all authenticated users have equal permissions)

**Authentication Flow**:
1. User signs in via Cognito → receives JWT token
2. Frontend includes token in `Authorization: Bearer {token}` header
3. Lambda validates token signature and expiration
4. If valid, extract user ID from `sub` claim
5. Proceed with request

**Note**: User entity is not persisted in backend. JWT token provides temporary authentication context.

---

## Data Storage Strategy

### S3 Bucket Structure

```
s3://{bucket-name}/
├── {recipeId1}.cook          # Recipe file (current version)
├── {recipeId2}.cook
└── ...
```

**Versioning**: Enabled. Each update creates a new version. Previous versions preserved.

**Object Tags**: Used for metadata to avoid separate database:
- `title`: Recipe title
- `createdAt`: Creation timestamp
- `lastModified`: Last modification timestamp
- `recipeId`: Recipe ID (redundant but useful for queries)

### Metadata Retrieval

**For List Endpoint** (`GET /recipes`):
- List all objects with `.cook` extension
- For each object, retrieve tags to get `title` and `lastModified`
- Return array of `{ id, title, lastModified }`

**For Get Endpoint** (`GET /recipes/{id}`):
- Retrieve object content directly
- Optionally retrieve tags for metadata

**Performance Considerations**:
- List operation: S3 `ListObjectsV2` + `GetObjectTagging` for each object
- For 1000 recipes: ~1000 API calls (can be optimized with batch operations if needed)
- Consider pagination if list grows beyond 1000 recipes

---

## Validation Rules

### Recipe ID Format

- **Pattern**: `^[a-z0-9]{8}$`
- **Length**: Exactly 8 characters
- **Characters**: Lowercase letters (a-z) and digits (0-9)
- **Uniqueness**: Must be unique across all recipes
- **Generation**: Use `nanoid` with custom alphabet

### Recipe Title

- **Required**: Yes
- **Max Length**: 200 characters
- **Source Priority**:
  1. Frontmatter `>> title:` field (if present)
  2. Filename without `.cook` extension (fallback)
  3. Generated default title (if filename invalid)

### Recipe Content

- **Required**: Yes
- **Max Size**: 1MB (1,048,576 bytes)
- **Format**: Valid Cooklang syntax (validation deferred to frontend)
- **Encoding**: UTF-8

### File Upload

- **Allowed Extension**: `.cook` only
- **Content-Type**: `text/plain` or `application/octet-stream`
- **Max Size**: 1MB
- **Validation**: Check extension, size, and basic format

---

## Constraints and Assumptions

1. **No Database**: All data stored in S3 (files + tags)
2. **No Ownership**: All authenticated users can modify any recipe (MVP)
3. **No Soft Delete**: DELETE removes S3 object (versions may remain)
4. **No Search**: List returns all recipes (no filtering/search in MVP)
5. **No Pagination**: List endpoint returns all recipes (assumes <1000)

---

## Future Enhancements (Out of Scope)

- Recipe ownership/author tracking
- Recipe categories/tags (beyond title)
- Full-text search
- Pagination for large recipe lists
- Recipe sharing/permissions
- Recipe import/export
- Recipe version history API



