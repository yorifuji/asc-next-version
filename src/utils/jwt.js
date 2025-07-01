const crypto = require('crypto');

function base64urlEscape(str) {
  return str.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * Convert ECDSA signature from DER format to JWT format (R||S concatenated)
 * @param {Buffer} derSignature - DER encoded signature
 * @returns {Buffer} JWT format signature (64 bytes for ES256)
 */
function derToJwtSignature(derSignature) {
  // DER format: 0x30 [total-length] 0x02 [R-length] [R] 0x02 [S-length] [S]
  let offset = 0;

  // Skip SEQUENCE tag (0x30)
  if (derSignature[offset++] !== 0x30) {
    throw new Error('Invalid DER signature format');
  }

  // Skip total length
  const derTotalLength = derSignature[offset++];
  if (derTotalLength & 0x80) {
    // Long form length - not typically seen in ECDSA signatures
    offset += derTotalLength & 0x7f;
  }

  // Read R
  if (derSignature[offset++] !== 0x02) {
    throw new Error('Invalid DER signature format (R)');
  }

  const rLength = derSignature[offset++];
  const rValue = derSignature.slice(offset, offset + rLength);
  offset += rLength;

  // Read S
  if (derSignature[offset++] !== 0x02) {
    throw new Error('Invalid DER signature format (S)');
  }

  const sLength = derSignature[offset++];
  const sValue = derSignature.slice(offset, offset + sLength);

  // For ES256 (P-256), R and S should be 32 bytes each
  const targetLength = 32;

  // Convert R and S to fixed-length buffers
  // Remove leading zeros (0x00) if present due to DER encoding of positive integers
  let rBuffer = rValue;
  let sBuffer = sValue;

  // Remove leading 0x00 if present
  if (rBuffer[0] === 0x00) {
    rBuffer = rBuffer.slice(1);
  }
  if (sBuffer[0] === 0x00) {
    sBuffer = sBuffer.slice(1);
  }

  // Pad with zeros if necessary
  if (rBuffer.length < targetLength) {
    const padding = Buffer.alloc(targetLength - rBuffer.length);
    rBuffer = Buffer.concat([padding, rBuffer]);
  }
  if (sBuffer.length < targetLength) {
    const padding = Buffer.alloc(targetLength - sBuffer.length);
    sBuffer = Buffer.concat([padding, sBuffer]);
  }

  // Ensure we have exactly 32 bytes for each component
  if (rBuffer.length > targetLength) {
    rBuffer = rBuffer.slice(rBuffer.length - targetLength);
  }
  if (sBuffer.length > targetLength) {
    sBuffer = sBuffer.slice(sBuffer.length - targetLength);
  }

  // Concatenate R and S
  return Buffer.concat([rBuffer, sBuffer]);
}

function generateJwt(issuerId, keyId, key) {
  // Create header
  const header = {
    alg: 'ES256',
    kid: keyId,
    typ: 'JWT',
  };

  // Create payload
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: issuerId,
    iat: now, // issued at time
    exp: now + 20 * 60, // 20 minutes
    aud: 'appstoreconnect-v1',
  };

  // Encode header and payload
  const encodedHeader = base64urlEscape(Buffer.from(JSON.stringify(header)).toString('base64'));
  const encodedPayload = base64urlEscape(Buffer.from(JSON.stringify(payload)).toString('base64'));

  // Create the message to sign
  const message = `${encodedHeader}.${encodedPayload}`;

  // Sign with ES256 (ECDSA with SHA256)
  const sign = crypto.createSign('SHA256');
  sign.update(message);
  sign.end();

  // Generate signature in DER format
  const derSignature = sign.sign(key);

  // Convert DER to JWT format (R||S concatenated)
  const jwtSignature = derToJwtSignature(derSignature);

  // Base64url encode the JWT format signature
  const encodedSignature = base64urlEscape(jwtSignature.toString('base64'));

  // Return the complete JWT
  return `${message}.${encodedSignature}`;
}

module.exports = {
  generateJwt,
};
