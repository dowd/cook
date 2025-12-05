# Research: Serverless Backend for Cooklang Recipe Site

**Date**: 2025-01-27  
**Feature**: Serverless Backend API

## Research Decisions

### 1. AWS SAM Template Structure

**Decision**: Use SAM template with separate Lambda functions per endpoint, API Gateway REST API, and S3 bucket resource.

**Rationale**: 
- SAM provides Infrastructure as Code for serverless applications
- Separate Lambda functions enable independent scaling and easier debugging
- API Gateway REST API provides standard HTTP interface
- S3 bucket defined in SAM ensures versioning and proper IAM permissions

**Alternatives Considered**:
- Single Lambda with API Gateway routing: Rejected - less modular, harder to scale individual endpoints
- Terraform/CloudFormation: Rejected - SAM is simpler for serverless, aligns with FR-018 requirement
- Serverless Framework: Rejected - SAM is AWS-native and required by spec

**References**:
- AWS SAM documentation: https://docs.aws.amazon.com/serverless-application-model/
- SAM best practices: Separate functions for different routes

---

### 2. JWT Token Validation

**Decision**: Use `jsonwebtoken` library with Cognito public keys fetched from JWKS endpoint.

**Rationale**:
- Cognito provides JWKS endpoint for public key retrieval
- `jsonwebtoken` is standard library for JWT verification
- Need to validate signature, expiration, and issuer
- Cache public keys to reduce JWKS endpoint calls

**Alternatives Considered**:
- AWS SDK Cognito Identity Provider: Rejected - more complex, unnecessary for token validation
- Manual JWT parsing: Rejected - error-prone, security risk
- `jose` library: Considered but `jsonwebtoken` is more widely used and stable

**Implementation Notes**:
- Fetch JWKS from `https://cognito-idp.{region}.amazonaws.com/{userPoolId}/.well-known/jwks.json`
- Cache keys with TTL (e.g., 1 hour)
- Validate: signature, expiration (`exp`), issuer (`iss`), audience (`aud`)

**References**:
- AWS Cognito JWT verification: https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-using-tokens-verifying-a-jwt.html
- jsonwebtoken library: https://github.com/auth0/node-jsonwebtoken

---

### 3. S3 Operations and Versioning

**Decision**: Use AWS SDK v3 S3 client with versioning enabled. Store recipes as `{recipeId}.cook` files. Use S3 object tags for metadata (title, creation date, last modified).

**Rationale**:
- S3 versioning preserves history automatically (FR-013)
- Object tags provide metadata without separate database (FR-014)
- SDK v3 is modern, modular, and tree-shakeable
- Simple file naming: `{recipeId}.cook` maps directly to API resource

**Alternatives Considered**:
- DynamoDB for metadata: Rejected - adds complexity, S3 tags sufficient for MVP
- Prefix-based organization: Rejected - unnecessary for MVP scale (1000 recipes)
- S3 metadata headers: Rejected - tags are more flexible and queryable

**Implementation Notes**:
- Enable versioning in SAM template: `VersioningConfiguration: Status: Enabled`
- Use `PutObjectTagging` for metadata updates
- Use `GetObjectTagging` to retrieve metadata for list endpoint
- Handle version IDs for version history (future enhancement)

**References**:
- AWS SDK v3 S3: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-s3/
- S3 object tagging: https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-tagging.html

---

### 4. Short Alphanumeric ID Generation

**Decision**: Use `nanoid` library with custom alphabet (alphanumeric, lowercase) for 8-character IDs.

**Rationale**:
- `nanoid` provides URL-safe, collision-resistant IDs
- 8 characters provides 218 trillion combinations (36^8)
- Custom alphabet ensures only alphanumeric characters (per spec clarification)
- Collision probability negligible for MVP scale (1000 recipes)

**Alternatives Considered**:
- UUID v4: Rejected - too long (36 chars), not alphanumeric-only
- Sequential IDs: Rejected - exposes recipe count, not URL-safe
- Base64 encoding: Rejected - includes special characters
- Manual random generation: Rejected - `nanoid` is battle-tested and secure

**Implementation Notes**:
- Custom alphabet: `0123456789abcdefghijklmnopqrstuvwxyz` (36 chars)
- Length: 8 characters
- Example IDs: `abc12345`, `xyz98765`
- Check for collisions (extremely rare but handle gracefully)

**References**:
- nanoid library: https://github.com/ai/nanoid
- Collision calculator: 8 chars with 36 alphabet = 2.8 trillion combinations

---

### 5. Rate Limiting with API Gateway

**Decision**: Use API Gateway throttling (per-account and per-key) combined with usage plans and API keys for IP-based rate limiting.

**Rationale**:
- API Gateway provides built-in throttling capabilities
- Usage plans allow per-IP configuration
- Simpler than custom Lambda authorizer for rate limiting
- Aligns with FR-019 requirement

**Alternatives Considered**:
- Custom Lambda authorizer: Rejected - more complex, API Gateway throttling sufficient
- DynamoDB-based rate limiting: Rejected - adds latency and cost
- CloudFront rate limiting: Rejected - not applicable for API Gateway

**Implementation Notes**:
- Configure throttling in SAM template: `ThrottleBurstLimit` and `ThrottleRateLimit`
- Default: 100 requests/second burst, 50 requests/second sustained per IP
- Return 429 status code with `Retry-After` header
- Can be adjusted via SAM parameters

**References**:
- API Gateway throttling: https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-request-throttling.html
- Usage plans: https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-api-usage-plans.html

---

### 6. CORS Configuration in SAM

**Decision**: Configure CORS in API Gateway via SAM template with configurable `AllowOrigin` parameter.

**Rationale**:
- API Gateway CORS configuration is standard and simple
- SAM parameters allow environment-specific configuration
- Default to `*` for development, restrict in production
- Aligns with FR-016 requirement

**Implementation Notes**:
- Add `Cors` configuration to API Gateway resource in SAM template
- Use SAM parameter: `AllowedOrigin` (default: `*`)
- Configure `AllowMethods`, `AllowHeaders`, `AllowCredentials` appropriately
- For authenticated requests, may need `AllowCredentials: true`

**References**:
- API Gateway CORS: https://docs.aws.amazon.com/apigateway/latest/developerguide/how-to-cors.html
- SAM CORS configuration: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-property-api-cors.html

---

### 7. Multipart File Upload Handling in Lambda

**Decision**: Use `busboy` or `multiparty` library to parse multipart/form-data in Lambda, or use API Gateway binary media types with base64 encoding.

**Rationale**:
- Lambda can handle multipart/form-data with appropriate parsing library
- `busboy` is lightweight and efficient for streaming parsing
- Alternative: API Gateway binary media types (simpler but less flexible)
- Need to handle file size limits (1MB per spec)

**Alternatives Considered**:
- Direct S3 presigned URLs: Rejected - adds complexity, client-side upload not required
- API Gateway binary media: Considered but requires base64 encoding overhead
- Lambda function URL: Rejected - API Gateway provides better integration

**Implementation Notes**:
- Parse multipart/form-data in Lambda handler
- Extract `.cook` file from form data
- Validate file extension and size (max 1MB)
- Stream to S3 or buffer in memory (1MB is safe for Lambda)

**References**:
- busboy library: https://github.com/mscdex/busboy
- Lambda multipart handling: https://docs.aws.amazon.com/lambda/latest/dg/services-apigateway.html

---

### 8. Error Logging and CloudWatch

**Decision**: Use `console.error()` for error logging, which automatically goes to CloudWatch Logs. Structure errors as JSON for easier querying.

**Rationale**:
- Minimal logging requirement (errors only per FR-020)
- CloudWatch Logs automatically captures Lambda console output
- JSON structure enables CloudWatch Insights queries
- No additional logging library needed

**Implementation Notes**:
- Log errors with context: `{ error: 'Error message', recipeId, userId, timestamp }`
- Include stack traces for debugging
- Use CloudWatch Logs Insights for error analysis
- Set appropriate log retention (e.g., 7 days)

**References**:
- CloudWatch Logs: https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/WhatIsCloudWatchLogs.html
- Lambda logging: https://docs.aws.amazon.com/lambda/latest/dg/monitoring-cloudwatchlogs.html

---

## Summary

All technical decisions align with:
- AWS SAM deployment requirement (FR-018)
- Minimal dependencies and simplicity
- Serverless best practices
- Cost optimization (S3 tags vs DynamoDB)
- Security (JWT validation, rate limiting)

No blocking unknowns remain. Ready to proceed to Phase 1 design.

---

### 9. Monorepo Structure for Backend + Frontend

**Decision**: Use a monorepo structure with separate directories for backend and frontend, sharing common configuration files at the root.

**Rationale**:
- Single repository simplifies development workflow and version control
- Shared tooling (ESLint, Prettier, Git hooks) can be configured once
- Easier to maintain consistency between frontend and backend
- Backend remains a separate deployment (aligns with architecture separation principle)
- Frontend (static site generator) remains independent with zero dependencies

**Structure**:
```
repo-root/
├── backend/          # Serverless backend (AWS SAM)
├── src/             # Static site generator (existing)
├── recipes/         # Shared recipe files
├── package.json     # Root package.json (workspace config if using workspaces)
├── .gitignore
└── README.md
```

**Alternatives Considered**:
- Separate repositories: Rejected - user wants single repo for easier management
- NPM workspaces: Considered but adds complexity; simple directory structure sufficient
- Lerna/Nx: Rejected - overkill for this project size, adds dependencies

**Implementation Notes**:
- Backend directory contains SAM template and Lambda functions
- Frontend (static generator) remains in `src/` directory
- Shared recipes directory can be used by both
- Separate `package.json` files per component (backend/package.json, root package.json)
- Root-level scripts can orchestrate builds/deployments
- CI/CD can deploy backend and frontend independently

**Constitution Alignment**:
- ✅ Generator remains zero-dependency (unchanged)
- ✅ Backend is separate deployment (even if in same repo)
- ✅ Architecture separation maintained (different directories, different deployments)

**References**:
- Monorepo best practices: https://monorepo.tools/
- AWS SAM in monorepo: Common pattern, SAM template can reference local paths
