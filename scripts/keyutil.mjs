// Tiny ed25519 + base58 helpers (no dependencies) for the demo tooling.
import crypto from 'node:crypto';

const B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

export function base58Encode(bytes) {
  let zeros = 0;
  while (zeros < bytes.length && bytes[zeros] === 0) zeros++;
  let n = 0n;
  for (const b of bytes) n = n * 256n + BigInt(b);
  let out = '';
  while (n > 0n) { out = B58[Number(n % 58n)] + out; n /= 58n; }
  return '1'.repeat(zeros) + out;
}

export function base58Decode(str) {
  let n = 0n;
  for (const ch of str) {
    const v = B58.indexOf(ch);
    if (v < 0) throw new Error(`Bad base58 char ${ch}`);
    n = n * 58n + BigInt(v);
  }
  let hex = n.toString(16);
  if (hex.length % 2) hex = '0' + hex;
  const body = n === 0n ? Buffer.alloc(0) : Buffer.from(hex, 'hex');
  let zeros = 0;
  while (zeros < str.length && str[zeros] === '1') zeros++;
  return Buffer.concat([Buffer.alloc(zeros), body]);
}

// Returns { publicKey: 'ed25519:...', secretKey: 'ed25519:...' (seed+pub,
// the NEAR format), implicitAccountId: '<hex of pubkey>' }
export function generateKeyPair() {
  const { privateKey } = crypto.generateKeyPairSync('ed25519');
  const jwk = privateKey.export({ format: 'jwk' });
  const seed = Buffer.from(jwk.d, 'base64url');
  const pub = Buffer.from(jwk.x, 'base64url');
  return {
    publicKey: 'ed25519:' + base58Encode(pub),
    secretKey: 'ed25519:' + base58Encode(Buffer.concat([seed, pub])),
    implicitAccountId: pub.toString('hex'),
  };
}
