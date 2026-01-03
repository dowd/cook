// Jest globals are available without import in test files
import { handler } from '../../../src/handlers/create-recipe.js';
import * as s3Client from '../../../src/lib/s3-client.js';
import * as auth from '../../../src/lib/auth.js';
import * as idGenerator from '../../../src/lib/id-generator.js';

jest.mock('../../../src/lib/s3-client.js', () => ({
  initializeS3: jest.fn(),
  putRecipe: jest.fn(),
}));

jest.mock('../../../src/lib/auth.js', () => ({
  initializeAuth: jest.fn(),
  validateAuthHeader: jest.fn(),
}));

jest.mock('../../../src/lib/id-generator.js', () => ({
  generateUniqueId: jest.fn(),
}));

describe('create-recipe handler', () => {
  const mockEvent = {
    headers: {
      Authorization: 'Bearer valid-token',
    },
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
    idGenerator.generateUniqueId.mockResolvedValue('abc12345');
  });

  it('should create recipe from JSON', async () => {
    const jsonEvent = {
      ...mockEvent,
      headers: {
        ...mockEvent.headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: 'My Recipe',
        content: '>> title: My Recipe\n\nCook @ingredient{1%cup}.',
      }),
    };

    const response = await handler(jsonEvent);

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.body);
    expect(body.id).toBe('abc12345');
    expect(body.message).toBe('Recipe created successfully');
    expect(s3Client.putRecipe).toHaveBeenCalled();
  });

  it('should return 401 for missing auth', async () => {
    auth.validateAuthHeader.mockRejectedValue(new Error('Invalid token'));

    const response = await handler(mockEvent);

    expect(response.statusCode).toBe(401);
    const body = JSON.parse(response.body);
    expect(body.error).toBe('Unauthorized');
  });

  it('should return 400 for missing required fields', async () => {
    const invalidEvent = {
      ...mockEvent,
      headers: {
        ...mockEvent.headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: 'My Recipe',
        // Missing content
      }),
    };

    const response = await handler(invalidEvent);

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.error).toBe('ValidationError');
  });

  it('should return 413 for oversized content', async () => {
    const largeContent = 'a'.repeat(1048577); // > 1MB
    const largeEvent = {
      ...mockEvent,
      headers: {
        ...mockEvent.headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: 'My Recipe',
        content: largeContent,
      }),
    };

    const response = await handler(largeEvent);

    expect(response.statusCode).toBe(413);
    const body = JSON.parse(response.body);
    expect(body.error).toBe('PayloadTooLarge');
  });
});

