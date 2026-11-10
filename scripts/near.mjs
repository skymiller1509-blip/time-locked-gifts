// Shared testnet client for the DEMO tooling. All accounts here were
// created by Mabel for this demo on TESTNET only - they are not Eddie's
// accounts and hold no real funds. Keys live in ../keys/ (never commit).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Account } from '@near-js/accounts';
import { JsonRpcProvider } from '@near-js/providers';
import { KeyPairSigner } from '@near-js/signers';

const here = path.dirname(fileURLToPath(import.meta.url));
export const KEYS_DIR = path.join(here, '..', 'keys');
export const RPC_URL = process.env.NEAR_RPC_URL || 'https://rpc.testnet.near.org';

export const provider = new JsonRpcProvider({ url: RPC_URL });

export function loadKeyFile(name) {
  return JSON.parse(fs.readFileSync(path.join(KEYS_DIR, name), 'utf8'));
}

export function accountFromKeyFile(name) {
  const k = loadKeyFile(name);
  const signer = KeyPairSigner.fromSecretKey(k.secretKey);
  return new Account(k.accountId, provider, signer);
}

export async function viewCall(contractId, methodName, args = {}) {
  const res = await provider.query({
    request_type: 'call_function',
    finality: 'final',
    account_id: contractId,
    method_name: methodName,
    args_base64: Buffer.from(JSON.stringify(args)).toString('base64'),
  });
  if (!res.result || res.result.length === 0) return null;
  return JSON.parse(Buffer.from(res.result).toString());
}

export function yoctoToNear(yocto) {
  const y = BigInt(yocto);
  const whole = y / 10n ** 24n;
  const frac = (y % 10n ** 24n).toString().padStart(24, '0').slice(0, 4).replace(/0+$/, '');
  return frac ? `${whole}.${frac}` : `${whole}`;
}
