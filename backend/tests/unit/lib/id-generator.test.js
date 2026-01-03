// Jest globals are available without import in test files
import { generateUniqueId, generateIdSync } from '../../../src/lib/id-generator.js';
import * as s3Client from '../../../src/lib/s3-client.js';

// Mock s3-client
jest.mock('../../../src/lib/s3-client.js', () => ({
  idExists: jest.fn(),
}));

describe('id-generator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateIdSync', () => {
    it('should generate 8-character ID', () => {
      const id = generateIdSync();
      expect(id).toHaveLength(8);
      expect(id).toMatch(/^[a-z0-9]{8}$/);
    });

    it('should generate different IDs on each call', () => {
      const id1 = generateIdSync();
      const id2 = generateIdSync();
      expect(id1).not.toBe(id2);
    });
  });

  describe('generateUniqueId', () => {
    it('should return ID if it does not exist', async () => {
      s3Client.idExists.mockResolvedValue(false);
      const id = await generateUniqueId();
      expect(id).toHaveLength(8);
      expect(id).toMatch(/^[a-z0-9]{8}$/);
      expect(s3Client.idExists).toHaveBeenCalled();
    });

    it('should retry if ID exists', async () => {
      s3Client.idExists
        .mockResolvedValueOnce(true)  // First ID exists
        .mockResolvedValueOnce(false); // Second ID is available
      
      const id = await generateUniqueId();
      expect(id).toHaveLength(8);
      expect(s3Client.idExists).toHaveBeenCalledTimes(2);
    });

    it('should throw error after max attempts', async () => {
      s3Client.idExists.mockResolvedValue(true); // All IDs exist
      
      await expect(generateUniqueId(3)).rejects.toThrow('Failed to generate unique ID after 3 attempts');
      expect(s3Client.idExists).toHaveBeenCalledTimes(3);
    });
  });
});

