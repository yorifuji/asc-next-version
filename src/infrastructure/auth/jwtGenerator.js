'use strict';

const jwt = require('jsonwebtoken');
const { JWT_CONFIG } = require('../../shared/constants');
const { AuthenticationError, ValidationError } = require('../../shared/errors/customErrors');

/**
 * JWT generator for App Store Connect API authentication
 */
class JwtGenerator {
  constructor(issuerId, keyId, privateKey) {
    this._validateInputs(issuerId, keyId, privateKey);
    this.issuerId = issuerId;
    this.keyId = keyId;
    this.privateKey = this._formatPrivateKey(privateKey);
  }

  /**
   * Generate a JWT token
   * @returns {string} JWT token
   */
  generateToken() {
    try {
      const payload = {
        iss: this.issuerId,
        exp: Math.floor(Date.now() / 1000) + JWT_CONFIG.EXPIRATION_TIME,
        aud: JWT_CONFIG.AUDIENCE,
      };

      const options = {
        algorithm: JWT_CONFIG.ALGORITHM,
        header: {
          alg: JWT_CONFIG.ALGORITHM,
          kid: this.keyId,
          typ: 'JWT',
        },
      };

      return jwt.sign(payload, this.privateKey, options);
    } catch (error) {
      throw new AuthenticationError(
        `Failed to generate JWT token: ${error.message}`,
        'JWT_GENERATION_FAILED',
      );
    }
  }

  /**
   * Validate inputs
   */
  _validateInputs(issuerId, keyId, privateKey) {
    if (!issuerId || typeof issuerId !== 'string') {
      throw new ValidationError('Issuer ID must be a non-empty string', 'issuerId', issuerId);
    }

    if (!keyId || typeof keyId !== 'string') {
      throw new ValidationError('Key ID must be a non-empty string', 'keyId', keyId);
    }

    if (!privateKey || typeof privateKey !== 'string') {
      throw new ValidationError(
        'Private key must be a non-empty string',
        'privateKey',
        '[REDACTED]',
      );
    }
  }

  /**
   * Format private key to ensure proper format
   */
  _formatPrivateKey(key) {
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
  isTokenExpiringSoon(token) {
    try {
      const decoded = jwt.decode(token);
      const expirationTime = decoded.exp * 1000;
      const fiveMinutesFromNow = Date.now() + 5 * 60 * 1000;
      return expirationTime <= fiveMinutesFromNow;
    } catch {
      return true; // Consider expired if can't decode
    }
  }
}

module.exports = JwtGenerator;
