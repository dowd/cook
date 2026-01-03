# Cooklang Serverless Backend

Serverless backend API for managing Cooklang recipes using AWS Lambda, API Gateway, Cognito, and S3.

## Features

- **RESTful API** with 5 endpoints for CRUD operations on recipes
- **Public read access** - anyone can view recipes without authentication
- **Authenticated write operations** - create, update, and delete require JWT tokens
- **S3 storage** with versioning enabled for recipe files
- **CORS support** with configurable allowed origins
- **Rate limiting** to prevent abuse
- **Minimal logging** - errors only

## Prerequisites

- AWS CLI configured with appropriate credentials
- AWS SAM CLI installed (`sam --version`)
- Node.js 18.x or higher
- AWS account with permissions to create:
  - Lambda functions
  - API Gateway REST APIs
  - S3 buckets
  - Cognito User Pools (or use existing)

## Quick Start

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Build and Deploy

```bash
# Build SAM application
sam build

# Deploy (first time - guided)
sam deploy --guided
```

The `--guided` flag will prompt for:
- Stack name (e.g., `cooklang-backend`)
- AWS Region (e.g., `us-east-1`)
- Parameter values:
  - `CognitoUserPoolId`: Your existing Cognito User Pool ID
  - `CognitoAppClientId`: Your Cognito App Client ID
  - `AllowedOrigin`: CORS allowed origin (default: `*` for development)
  - `S3BucketName`: Optional custom bucket name (leave empty for auto-generated)

### 3. Get API Endpoint

After deployment, get the API Gateway endpoint URL:

```bash
aws cloudformation describe-stacks \
  --stack-name cooklang-backend \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' \
  --output text
```

Example output: `https://abc123xyz.execute-api.us-east-1.amazonaws.com/Prod`

## API Endpoints

Base URL: `https://{apiId}.execute-api.{region}.amazonaws.com/Prod`

### 1. List Recipes (Public)

```bash
GET /recipes
```

Returns a list of all recipes with basic metadata.

**Response:**
```json
[
  {
    "id": "abc12345",
    "title": "Chocolate Chip Cookies",
    "lastModified": "2025-01-27T10:30:00Z"
  }
]
```

### 2. Get Recipe (Public)

```bash
GET /recipes/{id}
```

Returns the full Cooklang content of a specific recipe.

**Response:** `text/plain` content of the `.cook` file

### 3. Create Recipe (Authenticated)

```bash
POST /recipes
```

Creates a new recipe. Accepts either JSON content or file upload.

**Option A: JSON**
```bash
curl -X POST https://{apiId}.execute-api.{region}.amazonaws.com/Prod/recipes \
  -H "Authorization: Bearer {JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Chocolate Chip Cookies",
    "content": ">> title: Chocolate Chip Cookies\n\nPreheat the @oven{} to 350°F."
  }'
```

**Option B: File Upload**
```bash
curl -X POST https://{apiId}.execute-api.{region}.amazonaws.com/Prod/recipes \
  -H "Authorization: Bearer {JWT_TOKEN}" \
  -F "file=@recipe.cook"
```

**Response:**
```json
{
  "id": "abc12345",
  "message": "Recipe created successfully"
}
```

### 4. Update Recipe (Authenticated)

```bash
PUT /recipes/{id}
```

Updates an existing recipe with new Cooklang content.

```bash
curl -X PUT https://{apiId}.execute-api.{region}.amazonaws.com/Prod/recipes/abc12345 \
  -H "Authorization: Bearer {JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "content": ">> title: Updated Recipe\n\nCook @ingredient{2%cups}."
  }'
```

### 5. Delete Recipe (Authenticated)

```bash
DELETE /recipes/{id}
```

Deletes a recipe from the system.

```bash
curl -X DELETE https://{apiId}.execute-api.{region}.amazonaws.com/Prod/recipes/abc12345 \
  -H "Authorization: Bearer {JWT_TOKEN}"
```

## Authentication

### Get JWT Token from Cognito

```bash
aws cognito-idp initiate-auth \
  --auth-flow USER_PASSWORD_AUTH \
  --client-id {COGNITO_APP_CLIENT_ID} \
  --auth-parameters USERNAME={username},PASSWORD={password} \
  --query 'AuthenticationResult.IdToken' \
  --output text
```

Use the returned token in the `Authorization: Bearer {token}` header.

### Frontend Integration Example

```javascript
// Get JWT token from Cognito (using AWS Amplify or Cognito SDK)
const token = await getCognitoToken();

// Make authenticated request
const response = await fetch('https://{apiId}.execute-api.{region}.amazonaws.com/Prod/recipes', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    title: 'My Recipe',
    content: '>> title: My Recipe\n\nCook @ingredient{1%cup}.'
  })
});
```

## Local Development

### Run Lambda Functions Locally

```bash
# Start local API Gateway
sam local start-api

# Test endpoint (in another terminal)
curl http://localhost:3000/recipes
```

### Run Individual Lambda Function

```bash
sam local invoke GetRecipesFunction \
  --event events/get-recipes-event.json
```

## Testing

### Unit Tests

```bash
npm test
```

### Test Coverage

Unit tests cover:
- Handler functions (with mocked dependencies)
- Library functions (auth, parser, ID generator, validation)
- Error handling and edge cases

## Project Structure

```
backend/
├── src/
│   ├── handlers/          # Lambda function handlers
│   │   ├── get-recipes.js
│   │   ├── get-recipe.js
│   │   ├── create-recipe.js
│   │   ├── update-recipe.js
│   │   └── delete-recipe.js
│   ├── lib/              # Shared libraries
│   │   ├── auth.js       # JWT validation
│   │   ├── s3-client.js  # S3 operations
│   │   ├── recipe-parser.js
│   │   └── id-generator.js
│   └── utils/            # Utility functions
│       ├── errors.js
│       └── validation.js
├── tests/
│   └── unit/             # Unit tests
├── template.yaml          # AWS SAM template
└── package.json
```

## Configuration

### SAM Template Parameters

- `AllowedOrigin`: CORS allowed origin (default: `*`)
- `CognitoUserPoolId`: Existing Cognito User Pool ID (required)
- `CognitoAppClientId`: Cognito App Client ID (required)
- `S3BucketName`: Optional custom bucket name (default: auto-generated)

### Environment Variables (Lambda)

Set automatically by SAM template:
- `S3_BUCKET_NAME`: S3 bucket name
- `COGNITO_USER_POOL_ID`: Cognito User Pool ID
- `COGNITO_REGION`: AWS region for Cognito
- `AWS_REGION`: AWS region

## Error Responses

All errors follow a standardized format:

```json
{
  "error": "ErrorCode",
  "message": "Human-readable error message"
}
```

**HTTP Status Codes:**
- `200` - Success (GET, PUT, DELETE)
- `201` - Created (POST)
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (missing/invalid JWT)
- `404` - Not Found (recipe doesn't exist)
- `413` - Payload Too Large (content > 1MB)
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal Server Error
- `503` - Service Unavailable (S3 errors)

## Troubleshooting

### Unauthorized Error

- Verify JWT token is valid and not expired
- Check Cognito User Pool configuration
- Ensure token is in `Authorization: Bearer {token}` format

### Service Unavailable Error

- Check S3 bucket exists
- Verify Lambda has proper IAM permissions
- Check CloudWatch logs for details

### CORS Errors

- Verify `AllowedOrigin` parameter matches your frontend domain
- For development, use `*` (not recommended for production)

### Rate Limit Errors (429)

- Reduce request frequency
- Adjust throttling limits in `template.yaml` if needed

### View Logs

```bash
# View Lambda logs
sam logs -n GetRecipesFunction --stack-name cooklang-backend --tail

# View CloudWatch logs
aws logs tail /aws/lambda/cooklang-backend-GetRecipesFunction --follow
```

## Cleanup

```bash
# Delete stack and all resources
sam delete --stack-name cooklang-backend
```

**Warning**: This will delete the S3 bucket and all recipes. Ensure you have backups if needed.

## Architecture

- **API Gateway**: REST API with CORS, rate limiting, and request routing
- **Lambda Functions**: Node.js 18.x handlers for each endpoint
- **S3**: Recipe storage with versioning enabled
- **Cognito**: JWT token validation for authenticated endpoints
- **IAM**: Least-privilege permissions for Lambda functions

## License

MIT

