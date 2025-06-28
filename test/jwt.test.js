const { generateJwt } = require('../src/jwt');
const crypto = require('crypto');

describe('generateJwt', () => {
  test('JWTが正しい形式で生成されること', () => {
    const issuerId = 'test-issuer-id';
    const keyId = 'test-key-id';
    
    // テスト用のECDSA秘密鍵を生成
    const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', {
      namedCurve: 'prime256v1',
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      publicKeyEncoding: { type: 'spki', format: 'pem' }
    });
    
    const token = generateJwt(issuerId, keyId, privateKey);
    
    // JWTの形式を確認 (header.payload.signature)
    const parts = token.split('.');
    expect(parts).toHaveLength(3);
    
    // ヘッダーをデコードして確認
    const header = JSON.parse(Buffer.from(parts[0], 'base64').toString());
    expect(header.alg).toBe('ES256');
    expect(header.kid).toBe(keyId);
    expect(header.typ).toBe('JWT');
    
    // ペイロードをデコードして確認
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    expect(payload.iss).toBe(issuerId);
    expect(payload.aud).toBe('appstoreconnect-v1');
    expect(payload.iat).toBeDefined();
    expect(payload.iat).toBeLessThanOrEqual(Math.floor(Date.now() / 1000));
    expect(payload.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
    expect(payload.exp - payload.iat).toBe(20 * 60); // 20分の差
    
    // 署名が正しいJWT形式（64バイト）であることを確認
    const signatureBase64 = parts[2];
    // Base64URLデコード
    const signatureBase64Standard = signatureBase64.replace(/-/g, '+').replace(/_/g, '/');
    const paddingNeeded = (4 - signatureBase64Standard.length % 4) % 4;
    const signatureWithPadding = signatureBase64Standard + '='.repeat(paddingNeeded);
    const signature = Buffer.from(signatureWithPadding, 'base64');
    
    // ES256の署名は64バイト（R:32バイト + S:32バイト）であるべき
    expect(signature.length).toBe(64);
    
    // 署名検証
    const message = `${parts[0]}.${parts[1]}`;
    const verify = crypto.createVerify('SHA256');
    verify.update(message);
    verify.end();
    
    // JWT形式の署名をDER形式に変換して検証
    const r = signature.slice(0, 32);
    const s = signature.slice(32, 64);
    
    // DER形式に変換
    const derSignature = createDerSignature(r, s);
    
    const isValid = verify.verify(publicKey, derSignature);
    expect(isValid).toBe(true);
  });
});

// JWT形式（R||S）からDER形式への変換ヘルパー関数
function createDerSignature(r, s) {
  // Remove leading zeros
  while (r.length > 1 && r[0] === 0x00 && !(r[1] & 0x80)) {
    r = r.slice(1);
  }
  while (s.length > 1 && s[0] === 0x00 && !(s[1] & 0x80)) {
    s = s.slice(1);
  }
  
  // Add leading zero if high bit is set (to maintain positive sign)
  if (r[0] & 0x80) {
    r = Buffer.concat([Buffer.from([0x00]), r]);
  }
  if (s[0] & 0x80) {
    s = Buffer.concat([Buffer.from([0x00]), s]);
  }
  
  const rLength = r.length;
  const sLength = s.length;
  const totalLength = 2 + rLength + 2 + sLength;
  
  const der = Buffer.concat([
    Buffer.from([0x30, totalLength]),
    Buffer.from([0x02, rLength]),
    r,
    Buffer.from([0x02, sLength]),
    s
  ]);
  
  return der;
}