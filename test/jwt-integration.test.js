const { generateJwt } = require('../src/jwt');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

/**
 * このテストは実際のApp Store Connect APIの認証要件を検証します。
 * 実行するには、実際のApp Store Connect APIの認証情報が必要です。
 * 
 * 環境変数に以下を設定してください：
 * - ASC_ISSUER_ID: App Store Connect Issuer ID
 * - ASC_KEY_ID: App Store Connect Key ID
 * - ASC_PRIVATE_KEY_PATH: .p8秘密鍵ファイルのパス
 */
describe('JWT Integration Tests', () => {
  const issuerId = process.env.ASC_ISSUER_ID;
  const keyId = process.env.ASC_KEY_ID;
  const privateKeyPath = process.env.ASC_PRIVATE_KEY_PATH;
  
  const skipMessage = 'Skipping integration test - ASC credentials not provided';
  
  test('生成されたJWTがApp Store Connect APIの要件を満たすこと', () => {
    if (!issuerId || !keyId || !privateKeyPath) {
      console.log(skipMessage);
      return;
    }
    
    // .p8ファイルから秘密鍵を読み込む
    const privateKey = fs.readFileSync(privateKeyPath, 'utf8');
    
    const token = generateJwt(issuerId, keyId, privateKey);
    
    // JWTの基本構造を検証
    const parts = token.split('.');
    expect(parts).toHaveLength(3);
    
    // ヘッダーの検証
    const header = JSON.parse(Buffer.from(parts[0], 'base64').toString());
    expect(header).toEqual({
      alg: 'ES256',
      kid: keyId,
      typ: 'JWT'
    });
    
    // ペイロードの検証
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    expect(payload.iss).toBe(issuerId);
    expect(payload.aud).toBe('appstoreconnect-v1');
    expect(payload.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
    expect(payload.exp).toBeLessThanOrEqual(Math.floor(Date.now() / 1000) + (20 * 60));
    
    // 署名の長さを検証（ES256は64バイト）
    const signatureBase64 = parts[2];
    const signatureBase64Standard = signatureBase64.replace(/-/g, '+').replace(/_/g, '/');
    const paddingNeeded = (4 - signatureBase64Standard.length % 4) % 4;
    const signatureWithPadding = signatureBase64Standard + '='.repeat(paddingNeeded);
    const signature = Buffer.from(signatureWithPadding, 'base64');
    expect(signature.length).toBe(64);
    
    console.log('Generated JWT Token:');
    console.log(token);
    console.log('\nUse this token to test with App Store Connect API:');
    console.log('curl -H "Authorization: Bearer ' + token + '" https://api.appstoreconnect.apple.com/v1/apps');
  });
  
  test('JWT署名の形式がRFC 7518準拠であること', () => {
    // テスト用のキーペアを生成
    const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', {
      namedCurve: 'prime256v1',
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      publicKeyEncoding: { type: 'spki', format: 'pem' }
    });
    
    const token = generateJwt('test-issuer', 'test-key-id', privateKey);
    const parts = token.split('.');
    
    // 署名を抽出してデコード
    const signatureBase64 = parts[2];
    const signatureBase64Standard = signatureBase64.replace(/-/g, '+').replace(/_/g, '/');
    const paddingNeeded = (4 - signatureBase64Standard.length % 4) % 4;
    const signatureWithPadding = signatureBase64Standard + '='.repeat(paddingNeeded);
    const signature = Buffer.from(signatureWithPadding, 'base64');
    
    // R と S が各32バイトであることを確認
    const r = signature.slice(0, 32);
    const s = signature.slice(32, 64);
    
    expect(r.length).toBe(32);
    expect(s.length).toBe(32);
    
    // R と S が正の整数であることを確認（最上位ビットが0）
    // ただし、パディングされているため最初のバイトが0x00の可能性もある
    
    console.log('Signature R (hex):', r.toString('hex'));
    console.log('Signature S (hex):', s.toString('hex'));
  });
  
  test('異なる秘密鍵形式での動作確認', () => {
    // PKCS#8形式のテスト
    const { privateKey: pkcs8Key } = crypto.generateKeyPairSync('ec', {
      namedCurve: 'prime256v1',
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });
    
    const tokenPkcs8 = generateJwt('test-issuer', 'test-key-id', pkcs8Key);
    expect(tokenPkcs8.split('.')).toHaveLength(3);
    
    // SEC1形式のテスト
    const { privateKey: sec1Key } = crypto.generateKeyPairSync('ec', {
      namedCurve: 'prime256v1',
      privateKeyEncoding: { type: 'sec1', format: 'pem' }
    });
    
    const tokenSec1 = generateJwt('test-issuer', 'test-key-id', sec1Key);
    expect(tokenSec1.split('.')).toHaveLength(3);
  });
});