import { describe, expect, test, vi } from 'vitest';
import jwt from 'jsonwebtoken';
import { JwtGenerator } from '../../../../src/infrastructure/auth/jwtGenerator.js';

vi.mock('jsonwebtoken');

describe('JwtGenerator', () => {
  const validIssuerId = 'test-issuer-id';
  const validKeyId = 'test-key-id';
  const validPrivateKey = '-----BEGIN PRIVATE KEY-----\ntest-key\n-----END PRIVATE KEY-----';

  describe('constructor', () => {
    test('creates instance with valid inputs', () => {
      expect(() => {
        new JwtGenerator(validIssuerId, validKeyId, validPrivateKey);
      }).not.toThrow();
    });

    test('throws error for empty issuer ID', () => {
      expect(() => {
        new JwtGenerator('', validKeyId, validPrivateKey);
      }).toThrow('Issuer ID must be a non-empty string');
    });

    test('throws error for empty key ID', () => {
      expect(() => {
        new JwtGenerator(validIssuerId, '', validPrivateKey);
      }).toThrow('Key ID must be a non-empty string');
    });

    test('throws error for empty private key', () => {
      expect(() => {
        new JwtGenerator(validIssuerId, validKeyId, '');
      }).toThrow('Private key must be a non-empty string');
    });

    test('formats private key without headers', () => {
      const keyWithoutHeaders = 'test-key';
      const generator = new JwtGenerator(validIssuerId, validKeyId, keyWithoutHeaders);

      // Private property access for testing
      expect((generator as any).privateKey).toBe(
        '-----BEGIN PRIVATE KEY-----\ntest-key\n-----END PRIVATE KEY-----',
      );
    });

    test('preserves private key with headers', () => {
      const generator = new JwtGenerator(validIssuerId, validKeyId, validPrivateKey);

      // Private property access for testing
      expect((generator as any).privateKey).toBe(validPrivateKey);
    });
  });

  describe('generateToken', () => {
    test('generates JWT token successfully', () => {
      const mockToken = 'mock.jwt.token';
      vi.mocked(jwt.sign).mockReturnValue(mockToken as any);

      const generator = new JwtGenerator(validIssuerId, validKeyId, validPrivateKey);
      const token = generator.generateToken();

      expect(token).toBe(mockToken);
      expect(jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          iss: validIssuerId,
          aud: 'appstoreconnect-v1',
          exp: expect.any(Number),
        }),
        validPrivateKey,
        expect.objectContaining({
          algorithm: 'ES256',
          header: {
            alg: 'ES256',
            kid: validKeyId,
            typ: 'JWT',
          },
        }),
      );
    });

    test('throws error when JWT generation fails', () => {
      vi.mocked(jwt.sign).mockImplementation(() => {
        throw new Error('JWT signing failed');
      });

      const generator = new JwtGenerator(validIssuerId, validKeyId, validPrivateKey);

      expect(() => generator.generateToken()).toThrow('Failed to generate JWT token');
    });
  });

  describe('isTokenExpiringSoon', () => {
    test('returns false for token with sufficient time', () => {
      const futureExp = Math.floor(Date.now() / 1000) + 600; // 10 minutes from now
      vi.mocked(jwt.decode).mockReturnValue({ exp: futureExp } as any);

      const generator = new JwtGenerator(validIssuerId, validKeyId, validPrivateKey);
      const result = generator.isTokenExpiringSoon('some.token');

      expect(result).toBe(false);
    });

    test('returns true for token expiring within 5 minutes', () => {
      const soonExp = Math.floor(Date.now() / 1000) + 240; // 4 minutes from now
      vi.mocked(jwt.decode).mockReturnValue({ exp: soonExp } as any);

      const generator = new JwtGenerator(validIssuerId, validKeyId, validPrivateKey);
      const result = generator.isTokenExpiringSoon('some.token');

      expect(result).toBe(true);
    });

    test('returns true for expired token', () => {
      const pastExp = Math.floor(Date.now() / 1000) - 60; // 1 minute ago
      vi.mocked(jwt.decode).mockReturnValue({ exp: pastExp } as any);

      const generator = new JwtGenerator(validIssuerId, validKeyId, validPrivateKey);
      const result = generator.isTokenExpiringSoon('some.token');

      expect(result).toBe(true);
    });

    test('returns true when decode fails', () => {
      vi.mocked(jwt.decode).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const generator = new JwtGenerator(validIssuerId, validKeyId, validPrivateKey);
      const result = generator.isTokenExpiringSoon('invalid.token');

      expect(result).toBe(true);
    });
  });
});
