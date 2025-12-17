# Quickstart Guide: Serverless Backend for Cooklang Recipe Site

**Date**: 2025-01-27  
**Feature**: Serverless Backend API

## Prerequisites

- AWS CLI configured with appropriate credentials
- AWS SAM CLI installed (`sam --version`)
- Node.js 18.x or higher
- AWS account with permissions to create:
  - Lambda functions
  - API Gateway REST APIs
  - S3 buckets
  - Cognito User Pools (or use existing)

## Deployment

### 1. Clone and Setup

```bash
# Clone repository (if not already cloned)
git clone <repository-url>
cd cook

# Install backend dependencies
cd backend
npm install

# Return to root for frontend (if needed)
cd ..
```

### 2. Configure SAM Template Parameters

Edit `backend/template.yaml` or use `backend/samconfig.toml` to set parameters:

```yaml
Parameters:
  AllowedOrigin:
    Type: String
    Default: "*"  # Use specific domain in production
  CognitoUserPoolId:
    Type: String
    Description: Existing Cognito User Pool ID
  CognitoAppClientId:
    Type: String
    Description: Cognito App Client ID
```

### 3. Build and Deploy

```bash
# Navigate to backend directory
cd backend

# Build SAM application
sam build

# Deploy (first time - guided)
sam deploy --guided

# Subsequent deployments
sam deploy

# Return to root
cd ..
```

The `--guided` flag will prompt for:
- Stack name (e.g., `cooklang-backend`)
- AWS Region (e.g., `us-east-1`)
- Parameter values (Cognito User Pool ID, App Client ID, Allowed Origin)
- Confirmation before creating resources

### 4. Get API Endpoint

After deployment, note the API Gateway endpoint URL from the output:

```bash
# Get stack outputs
aws cloudformation describe-stacks \
  --stack-name cooklang-backend \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' \
  --output text
```

Example output: `https://abc123xyz.execute-api.us-east-1.amazonaws.com/Prod`

## Usage

### API Endpoints

Base URL: `https://{apiId}.execute-api.{region}.amazonaws.com/{stage}`

#### 1. List Recipes (Public)

```bash
curl https://{apiId}.execute-api.{region}.amazonaws.com/{stage}/recipes
```

Response:
```json
[
  {
    "id": "abc12345",
    "title": "Chocolate Chip Cookies",
    "lastModified": "2025-01-27T10:30:00Z"
  },
  {
    "id": "xyz98765",
    "title": "Pasta Carbonara",
    "lastModified": "2025-01-26T15:20:00Z"
  }
]
```

#### 2. Get Recipe (Public)

```bash
curl https://{apiId}.execute-api.{region}.amazonaws.com/{stage}/recipes/abc12345
```

Response:
```
>> title: Chocolate Chip Cookies
>> servings: 24

Preheat the @oven{} to 350°F.

Mix @flour{250%g}, @baking soda{5%g}, and @salt{5%g} in a bowl.
```

#### 3. Create Recipe (Authenticated)

**Option A: Text Content**

```bash
curl -X POST https://{apiId}.execute-api.{region}.amazonaws.com/{stage}/recipes \
  -H "Authorization: Bearer {JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Chocolate Chip Cookies",
    "content": ">> title: Chocolate Chip Cookies\n\nPreheat the @oven{} to 350°F."
  }'
```

**Option B: File Upload**

```bash
curl -X POST https://{apiId}.execute-api.{region}.amazonaws.com/{stage}/recipes \
  -H "Authorization: Bearer {JWT_TOKEN}" \
  -F "file=@recipe.cook"
```

Response:
```json
{
  "id": "abc12345",
  "message": "Recipe created successfully"
}
```

#### 4. Update Recipe (Authenticated)

```bash
curl -X PUT https://{apiId}.execute-api.{region}.amazonaws.com/{stage}/recipes/abc12345 \
  -H "Authorization: Bearer {JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "content": ">> title: Chocolate Chip Cookies (Updated)\n\nPreheat the @oven{} to 350°F."
  }'
```

#### 5. Delete Recipe (Authenticated)

```bash
curl -X DELETE https://{apiId}.execute-api.{region}.amazonaws.com/{stage}/recipes/abc12345 \
  -H "Authorization: Bearer {JWT_TOKEN}"
```

### Authentication

#### Get JWT Token from Cognito

```bash
# Sign in user (example with AWS CLI)
aws cognito-idp initiate-auth \
  --auth-flow USER_PASSWORD_AUTH \
  --client-id {COGNITO_APP_CLIENT_ID} \
  --auth-parameters USERNAME={username},PASSWORD={password} \
  --query 'AuthenticationResult.IdToken' \
  --output text
```

Use the returned token in the `Authorization: Bearer {token}` header.

#### Frontend Integration Example

```javascript
// Get JWT token from Cognito (using AWS Amplify or Cognito SDK)
const token = await getCognitoToken();

// Make authenticated request
const response = await fetch('https://{apiId}.execute-api.{region}.amazonaws.com/{stage}/recipes', {
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
# Navigate to backend directory
cd backend

# Start local API Gateway
sam local start-api

# Test endpoint (in another terminal)
curl http://localhost:3000/recipes
```

### Run Individual Lambda Function

```bash
# From backend directory
sam local invoke GetRecipesFunction \
  --event events/get-recipes-event.json
```

### Monorepo Structure

This repository contains both backend and frontend:

- **Backend**: `backend/` directory - AWS SAM serverless backend
- **Frontend**: `src/` directory - Static site generator (zero dependencies)
- **Shared**: `recipes/` directory - Cooklang recipe files used by both

Each component can be developed and deployed independently:
- Backend: Deploy via `cd backend && sam deploy`
- Frontend: Build via `npm run build` (from root)

### Environment Variables

Set local environment variables in `template.yaml` or `.env`:

```yaml
Environment:
  Variables:
    S3_BUCKET_NAME: local-bucket
    COGNITO_USER_POOL_ID: us-east-1_XXXXXXXXX
```

## Testing

### Unit Tests

```bash
npm test
```

### Integration Tests

```bash
# Deploy to test stack
sam deploy --stack-name cooklang-backend-test

# Run integration tests
npm run test:integration
```

### Manual Testing Checklist

- [ ] List recipes (GET /recipes) - no auth required
- [ ] Get recipe (GET /recipes/{id}) - no auth required
- [ ] Create recipe with text (POST /recipes) - requires auth
- [ ] Create recipe with file upload (POST /recipes) - requires auth
- [ ] Update recipe (PUT /recipes/{id}) - requires auth
- [ ] Delete recipe (DELETE /recipes/{id}) - requires auth
- [ ] Invalid recipe ID returns 400
- [ ] Missing auth returns 401
- [ ] Non-existent recipe returns 404
- [ ] Rate limiting returns 429

## Troubleshooting

### Common Issues

**Issue**: `Unauthorized` error on authenticated endpoints
- **Solution**: Verify JWT token is valid and not expired. Check Cognito User Pool configuration.

**Issue**: `ServiceUnavailable` error
- **Solution**: Check S3 bucket exists and Lambda has proper IAM permissions.

**Issue**: CORS errors in browser
- **Solution**: Verify `AllowedOrigin` parameter matches your frontend domain.

**Issue**: Rate limit errors (429)
- **Solution**: Reduce request frequency or adjust throttling limits in SAM template.

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

## Next Steps

- Configure production CORS origins
- Set up CloudWatch alarms for errors
- Configure custom domain for API Gateway
- Set up CI/CD pipeline for deployments
- Review and adjust rate limiting thresholds



