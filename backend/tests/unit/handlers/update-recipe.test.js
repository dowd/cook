// Jest globals are available without import in test files
import { handler } from '../../../src/handlers/update-recipe.js';
import * as s3Client from '../../../src/lib/s3-client.js';
import * as auth from '../../../src/lib/auth.js';

jest.mock('../../../src/lib/s3-client.js', () => ({
  initializeS3: jest.fn(),
  putRecipe: jest.fn(),
  recipeExists: jest.fn(),
}));

jest.mock('../../../src/lib/auth.js', () => ({
  initializeAuth: jest.fn(),
  validateAuthHeader: jest.fn(),
}));

describe('update-recipe handler', () => {
  const mockEvent = {
    pathParameters: {
      recipeId: 'abc12345',
    },
    headers: {
      Authorization: 'Bearer valid-token',
    },
    body: JSON.stringify({
      content: '>> title: Updated Recipe\n\nCook @ingredient{2%cups}.',
    }),
    requestContext: {
      requestId: 'test-request-id',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.S3_BUCKET_NAME = 'test-bucket';
    process.env.AWS_REGION = 'us-east-1';
    process.env.COGNITO_USER_POOL_ID = 'us-east-1_XXXXXXXXX';
    process.env.COGNITO_REGION = 'us-east-1';

    auth.validateAuthHeader.mockResolvedValue({ userId: 'user-123' });
    s3Client.recipeExists.mockResolvedValue(true);
    s3Client.putRecipe.mockResolvedValue();
  });

  it('should update existing recipe', async () => {
    const response = await handler(mockEvent);

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.id).toBe('abc12345');
    expect(body.message).toBe('Recipe updated successfully');
    expect(s3Client.putRecipe).toHaveBeenCalled();
  });

  it('should return 404 for non-existent recipe', async () => {
    s3Client.recipeExists.mockResolvedValue(false);

    const response = await handler(mockEvent);

    expect(response.statusCode).toBe(404);
    const body = JSON.parse(response.body);
    expect(body.error).toBe('NotFound');
  });

  it('should return 401 for missing auth', async () => {
    auth.validateAuthHeader.mockRejectedValue(new Error('Invalid token'));

    const response = await handler(mockEvent);

    expect(response.statusCode).toBe(401);
  });

  it('should return 400 for invalid recipe ID', async () => {
    const invalidEvent = {
      ...mockEvent,
      pathParameters: { recipeId: 'invalid' },
    };

    const response = await handler(invalidEvent);

    expect(response.statusCode).toBe(400);
  });

  it('should return 400 for missing content', async () => {
    const invalidEvent = {
      ...mockEvent,
      body: JSON.stringify({}),
    };

    const response = await handler(invalidEvent);

    expect(response.statusCode).toBe(400);
  });
});

