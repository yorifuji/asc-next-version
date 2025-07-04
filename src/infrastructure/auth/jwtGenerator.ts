import jwt from 'jsonwebtoken';
import { JWT_AUTHENTICATION } from '../../shared/constants/index.js';
import {
  APPLICATION_ERROR_CODES,
  ApplicationError,
  createValidationError,
} from '../../shared/errors/customErrors.js';

// ===== JWT Authentication Service =====

const TOKEN_EXPIRY_WARNING_MINUTES = 5;

export class AppStoreConnectJwtService {
  private readonly _issuerId: string;
  private readonly _keyId: string;
  private readonly _privateKey: string;

  constructor(config: { issuerId: string; keyId: string; privateKey: string }) {
    this._validateConfiguration(config);
    this._issuerId = config.issuerId;
    this._keyId = config.keyId;
    this._privateKey = this._normalizePrivateKey(config.privateKey);
  }

  /**
   * Generate a new authentication token
   */
  generateAuthToken(): string {
    try {
      const now = Math.floor(Date.now() / 1000);
      const expiration = now + JWT_AUTHENTICATION.EXPIRATION_SECONDS;

      const payload = {
        iss: this._issuerId,
        exp: expiration,
        aud: JWT_AUTHENTICATION.AUDIENCE,
      };

      const signingOptions: jwt.SignOptions = {
        algorithm: JWT_AUTHENTICATION.ALGORITHM,
        header: {
          alg: JWT_AUTHENTICATION.ALGORITHM,
          kid: this._keyId,
          typ: 'JWT',
        },
      };

      return jwt.sign(payload, this._privateKey, signingOptions);
    } catch (error) {
      throw this._createAuthenticationError(error);
    }
  }

  /**
   * Check if token is expiring soon
   */
  isTokenExpiringSoon(token: string): boolean {
    try {
      const decoded = jwt.decode(token) as jwt.JwtPayload | null;
      if (!decoded || typeof decoded.exp !== 'number') {
        return true;
      }

      const expirationTimeMs = decoded.exp * 1000;
      const warningThresholdMs = Date.now() + TOKEN_EXPIRY_WARNING_MINUTES * 60 * 1000;

      return expirationTimeMs <= warningThresholdMs;
    } catch {
      // Treat decode failures as expiring
      return true;
    }
  }

  /**
   * Validate configuration parameters
   */
  private _validateConfiguration(config: {
    issuerId: string;
    keyId: string;
    privateKey: string;
  }): void {
    if (!config.issuerId || typeof config.issuerId !== 'string') {
      throw createValidationError(
        'Issuer ID must be a non-empty string',
        'issuerId',
        config.issuerId,
      );
    }

    if (!config.keyId || typeof config.keyId !== 'string') {
      throw createValidationError('Key ID must be a non-empty string', 'keyId', config.keyId);
    }

    if (!config.privateKey || typeof config.privateKey !== 'string') {
      throw createValidationError(
        'Private key must be a non-empty string',
        'privateKey',
        '[REDACTED]',
      );
    }
  }

  /**
   * Normalize private key format
   */
  private _normalizePrivateKey(key: string): string {
    const trimmedKey = key.trim();
    const pemHeader = '-----BEGIN PRIVATE KEY-----';
    const pemFooter = '-----END PRIVATE KEY-----';

    // Already in PEM format
    if (trimmedKey.includes(pemHeader)) {
      return trimmedKey;
    }

    // Add PEM wrapper
    return `${pemHeader}\n${trimmedKey}\n${pemFooter}`;
  }

  /**
   * Create authentication error with details
   */
  private _createAuthenticationError(error: unknown): ApplicationError {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return new ApplicationError(
      `Failed to generate JWT token: ${errorMessage}`,
      APPLICATION_ERROR_CODES.AUTHENTICATION_FAILED,
      { reason: 'JWT_GENERATION_FAILED' },
    );
  }
}

// Backward compatibility alias
export { AppStoreConnectJwtService as JwtGenerator };
