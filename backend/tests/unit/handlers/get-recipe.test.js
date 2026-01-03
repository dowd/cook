// Jest globals are available without import in test files
import { handler } from '../../../src/handlers/get-recipe.js';
import * as s3Client from '../../../src/lib/s3-client.js';

jest.mock('../../../src/lib/s3-client.js', () => ({
  initializeS3: jest.fn(),
  getRecipe: jest.fn(),
}));

describe('get-recipe handler', () => {
  const mockEvent = {
    pathParameters: {
      recipeId: 'abc12345',
    },
    requestContext: {
      requestId: 'test-request-id',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.S3_BUCKET_NAME = 'test-bucket';
    process.env.AWS_REGION = 'us-east-1';
  });

  it('should return recipe content', async () => {
    const mockContent = '>> title: My Recipe\n\nCook @ingredient{1%cup}.';
    s3Client.getRecipe.mockResolvedValue(mockContent);

    const response = await handler(mockEvent);

    expect(response.statusCode).toBe(200);
    expect(response.headers['Content-Type']).toBe('text/plain');
    expect(response.body).toBe(mockContent);
    expect(s3Client.getRecipe).toHaveBeenCalledWith('abc12345');
  });

  it('should return 404 for non-existent recipe', async () => {
    s3Client.getRecipe.mockResolvedValue(null);

    const response = await handler(mockEvent);

    expect(response.statusCode).toBe(404);
    const body = JSON.parse(response.body);
    expect(body.error).toBe('NotFound');
  });

  it('should return 400 for invalid recipe ID', async () => {
    const invalidEvent = {
      ...mockEvent,
      pathParameters: { recipeId: 'invalid' },
    };

    const response = await handler(invalidEvent);

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.error).toBe('ValidationError');
  });

  it('should handle S3 errors', async () => {
    const error = new Error('S3 error');
    error.name = 'NoSuchBucket';
    s3Client.getRecipe.mockRejectedValue(error);

    const response = await handler(mockEvent);

    expect(response.statusCode).toBe(503);
  });
});

