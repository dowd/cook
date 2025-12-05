# Cooklang Recipe Backend API

Serverless backend API for managing Cooklang recipes using AWS Lambda, API Gateway, Cognito, and S3.

## Features

- **Public Read Access**: View recipes without authentication
- **Authenticated Write Operations**: Create, update, and delete recipes with JWT authentication
- **File Upload Support**: Upload `.cook` files directly or submit text content
- **S3 Versioning**: Automatic version history for recipe updates
- **Rate Limiting**: Per-IP rate limiting via API Gateway
- **CORS Support**: Configurable CORS origins via SAM parameters

## Prerequisites

- AWS CLI configured with appropriate credentials
- AWS SAM CLI installed (`sam --version`)
- Node.js 18.x or higher
- AWS account with permissions to create:
  - Lambda functions
  - API Gateway REST APIs
  - S3 buckets
  - Cognito User Pools (or use existing)

## Installation

```bash
# Install dependencies
npm install
```

## Deployment

### First Time Deployment

```bash
# Build SAM application
sam build

# Deploy with guided setup
sam deploy --guided
```

The `--guided` flag will prompt for:
- Stack name (e.g., `cooklang-backend`)
- AWS Region (e.g., `us-east-1`)
- Parameter values:
  - `AllowedOrigin`: CORS allowed origin (default: `*` for development)
  - `CognitoUserPoolId`: Existing Cognito User Pool ID
  - `CognitoAppClientId`: Cognito App Client ID
  - `S3BucketName`: S3 bucket name for storing recipes

### Subsequent Deployments

```bash
sam build
sam deploy
```

## API Endpoints

Base URL: `https://{apiId}.execute-api.{region}.amazonaws.com/{stage}`

### GET /recipes
List all recipes (public, no authentication required)

**Response**: `200 OK`
```json
[
  {
    "id": "abc12345",
    "title": "Chocolate Chip Cookies",
    "lastModified": "2025-01-27T10:30:00Z"
  }
]
```

### GET /recipes/{id}
Get a single recipe by ID (public, no authentication required)

**Response**: `200 OK` (text/plain)
```
>> title: Chocolate Chip Cookies
>> servings: 24

Preheat the @oven{} to 350°F.
```

### POST /recipes
Create a new recipe (requires authentication)

**Request Body** (JSON):
```json
{
  "title": "Chocolate Chip Cookies",
  "content": ">> title: Chocolate Chip Cookies\n\nPreheat the @oven{} to 350°F."
}
```

**Request Body** (multipart/form-data):
- `file`: `.cook` file to upload

**Response**: `201 Created`
```json
{
  "id": "abc12345",
  "message": "Recipe created successfully"
}
```

### PUT /recipes/{id}
Update an existing recipe (requires authentication)

**Request Body**:
```json
{
  "content": ">> title: Updated Recipe\n\nNew content here."
}
```

**Response**: `200 OK`
```json
{
  "id": "abc12345",
  "message": "Recipe updated successfully"
}
```

### DELETE /recipes/{id}
Delete a recipe (requires authentication)

**Response**: `204 No Content` or `200 OK`

## Authentication

All write operations (POST, PUT, DELETE) require a valid JWT token from AWS Cognito.

Include the token in the `Authorization` header:
```
Authorization: Bearer {JWT_TOKEN}
```

## Local Development

```bash
# Start local API Gateway
sam local start-api

# Test endpoint
curl http://localhost:3000/recipes
```

## Project Structure

```
backend/
├── src/
│   ├── handlers/       # Lambda function handlers
│   ├── lib/           # Shared utilities (auth, S3, ID generation, parsing)
│   └── utils/         # Error handling and validation
├── template.yaml       # SAM template
├── package.json
└── README.md
```

## Environment Variables

Set via SAM template Globals:
- `S3_BUCKET_NAME`: S3 bucket name
- `COGNITO_USER_POOL_ID`: Cognito User Pool ID
- `COGNITO_APP_CLIENT_ID`: Cognito App Client ID
- `ALLOWED_ORIGIN`: CORS allowed origin
- `AWS_REGION`: AWS region

## Error Responses

All errors follow this format:
```json
{
  "error": "ErrorType",
  "message": "Human-readable error message"
}
```

**Status Codes**:
- `200`: Success
- `201`: Created
- `204`: No Content
- `400`: Bad Request (validation error)
- `401`: Unauthorized (missing/invalid token)
- `404`: Not Found (recipe doesn't exist)
- `413`: Payload Too Large (content exceeds 1MB)
- `429`: Too Many Requests (rate limit exceeded)
- `500`: Internal Server Error
- `503`: Service Unavailable (S3 unavailable)

## Rate Limiting

API Gateway throttling configured:
- Burst limit: 100 requests/second
- Rate limit: 50 requests/second sustained

Rate limit exceeded returns `429 Too Many Requests` with `Retry-After` header.

## Logging

Errors are logged to CloudWatch Logs in structured JSON format (errors only, per FR-020).

## License

MIT
