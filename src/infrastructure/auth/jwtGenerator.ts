import jwt from 'jsonwebtoken';
import { JWT_CONFIG } from '../../shared/constants/index.js';
import {
  AppStoreConnectError,
  createValidationError,
  ERROR_CODES,
} from '../../shared/errors/customErrors.js';
import type { ErrorWithDetails } from '../../shared/types/api.js';

/**
 * JWT generator for App Store Connect API authentication
 */
export class JwtGenerator {
  private issuerId: string;
  private keyId: string;
  private privateKey: string;

  constructor(issuerId: string, keyId: string, privateKey: string) {
    this._validateInputs(issuerId, keyId, privateKey);
    this.issuerId = issuerId;
    this.keyId = keyId;
    this.privateKey = this._formatPrivateKey(privateKey);
  }

  /**
   * Generate a JWT token
   * @returns {string} JWT token
   */
  generateToken(): string {
    try {
      const payload = {
        iss: this.issuerId,
        exp: Math.floor(Date.now() / 1000) + JWT_CONFIG.EXPIRATION_TIME,
        aud: JWT_CONFIG.AUDIENCE,
      };

      const options: jwt.SignOptions = {
        algorithm: JWT_CONFIG.ALGORITHM,
        header: {
          alg: JWT_CONFIG.ALGORITHM,
          kid: this.keyId,
          typ: 'JWT',
        },
      };

      return jwt.sign(payload, this.privateKey, options);
    } catch (error) {
      const err = error as ErrorWithDetails;
      throw new AppStoreConnectError(
        `Failed to generate JWT token: ${err.message}`,
        ERROR_CODES.AUTHENTICATION_ERROR,
        { reason: 'JWT_GENERATION_FAILED' },
      );
    }
  }

  /**
   * Validate inputs
   */
  private _validateInputs(issuerId: string, keyId: string, privateKey: string): void {
    if (!issuerId || typeof issuerId !== 'string') {
      throw createValidationError('Issuer ID must be a non-empty string', 'issuerId', issuerId);
    }

    if (!keyId || typeof keyId !== 'string') {
      throw createValidationError('Key ID must be a non-empty string', 'keyId', keyId);
    }

    if (!privateKey || typeof privateKey !== 'string') {
      throw createValidationError(
        'Private key must be a non-empty string',
        'privateKey',
        '[REDACTED]',
      );
    }
  }

  /**
   * Format private key to ensure proper format
   */
  private _formatPrivateKey(key: string): string {
    // Remove any whitespace and newlines
    const cleanKey = key.trim();

    // Check if key already has headers
    if (cleanKey.includes('-----BEGIN PRIVATE KEY-----')) {
      return cleanKey;
    }

    // Add headers if missing
    return `-----BEGIN PRIVATE KEY-----\n${cleanKey}\n-----END PRIVATE KEY-----`;
  }

  /**
   * Check if token is about to expire (within 5 minutes)
   */
  isTokenExpiringSoon(token: string): boolean {
    try {
      const decoded = jwt.decode(token) as jwt.JwtPayload;
      const expirationTime = decoded.exp! * 1000;
      const fiveMinutesFromNow = Date.now() + 5 * 60 * 1000;
      return expirationTime <= fiveMinutesFromNow;
    } catch {
      return true; // Consider expired if can't decode
    }
  }
}
