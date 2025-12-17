# Cooklang Recipe Serverless Backend

## Task: Build serverless backend for Cooklang recipe site

**Goal:**
Create a serverless backend to support a static site that stores Cooklang recipes in S3 and allows authenticated users to view, add, edit, and delete recipes. Use AWS Lambda, API Gateway, and Cognito for authentication.

---

## Requirements

### 1. Authentication
- Use AWS Cognito for user sign-up/sign-in
- Frontend receives JWT tokens after login
- Lambda functions must validate JWT before performing any recipe actions
- Optional: implement user roles (admin, regular user) if needed for permissions

### 2. Storage
- Store each recipe as a `.cook` file in an S3 bucket
- Bucket should support versioning to keep previous versions
- Lambda functions read/write `.cook` files from S3
- Optional: store metadata (e.g., creation date, last modified, recipe name) in S3 object tags or in DynamoDB

### 3. API Endpoints (via API Gateway)
- `GET /recipes` → return a list of recipes (id, title, optional metadata)
- `GET /recipes/{id}` → return full `.cook` content of a single recipe
- `POST /recipes` → create a new recipe (send Cooklang text and title)
- `PUT /recipes/{id}` → update an existing recipe
- `DELETE /recipes/{id}` → delete a recipe
- Optional: `GET /shopping-list` and `POST /shopping-list` per user

### 4. Lambda Implementation
- Node.js runtime
- Use AWS SDK (`@aws-sdk/client-s3`) for S3 operations
- Validate JWT tokens using Cognito public keys
- Return proper HTTP status codes (200, 201, 401, 404, 500)
- Include error handling (missing recipe, permission denied, etc.)

### 5. Integration
- API Gateway routes requests to appropriate Lambda functions
- Frontend can call APIs using fetch + JWT token
- Optional: configure CORS for frontend domain

### 6. Bonus / Nice-to-Have
- Lambda automatically triggers a rebuild or webhook if static HTML needs updating
- Implement search or filtering in `GET /recipes`
- Provide example frontend fetch calls

---

## Deliverables
1. Node.js Lambda functions for all endpoints
2. API Gateway configuration (or Terraform/SAM template)
3. Cognito configuration instructions (user pool, app client)
4. Example S3 bucket setup (with versioning)
5. Minimal example frontend fetch code using JWT token

---

**Optional:**
Draft example prompt for an LLM coding assistant to generate the Lambda functions and setup automatically.