// One-time demo setup (TESTNET ONLY):
//  1. create subaccount gifts.<demo>  - will hold the contract
//  2. create subaccount friend.<demo> - the demo gift recipient
//  3. deploy build/contract.wasm to the gifts account
// Safe to re-run: existing accounts/keys are reused.
import fs from 'node:fs';
import path from 'node:path';
import { accountFromKeyFile, loadKeyFile, KEYS_DIR } from './near.mjs';
import { generateKeyPair } from './keyutil.mjs';

const NEAR = 10n ** 24n;
const demo = accountFromKeyFile('demo-account.json');
const demoId = demo.accountId;

async function ensureSubaccount(shortName, fundNear) {
  const keyFile = `${shortName}-account.json`;
  const filePath = path.join(KEYS_DIR, keyFile);
  const accountId = `${shortName}.${demoId}`;
  if (fs.existsSync(filePath)) {
    console.log(`${accountId}: key file exists, reusing`);
    return accountFromKeyFile(keyFile);
  }
  const kp = generateKeyPair();
  const outcome = await demo.createAccount(accountId, kp.publicKey, BigInt(fundNear) * NEAR);
  fs.writeFileSync(filePath, JSON.stringify({ accountId, ...kp }, null, 2));
  console.log(`${accountId}: created, tx ${outcome.transaction.hash}`);
  return accountFromKeyFile(keyFile);
}

const gifts = await ensureSubaccount('gifts', 2);
await ensureSubaccount('friend', 1);

// A JS-SDK contract is ~516 KB of code; NEAR charges ~1 NEAR per 100 KB
// of storage, so the contract account needs ~6 NEAR before deploying.
{
  const st = await gifts.provider.query({
    request_type: 'view_account', finality: 'final', account_id: gifts.accountId,
  });
  const balance = BigInt(st.amount);
  const target = 6n * NEAR;
  if (balance < target) {
    const top = target - balance;
    await demo.sendMoney(gifts.accountId, top);
    console.log(`topped up ${gifts.accountId} with ${top} yocto from ${demoId}`);
  }
}

// Deploy (or redeploy) the contract code on the gifts account.
const wasm = fs.readFileSync(new URL('../contract/build/contract.wasm', import.meta.url));
const deployOutcome = await gifts.deployContract(new Uint8Array(wasm));
console.log(`contract deployed on ${gifts.accountId}, tx ${deployOutcome.transaction.hash}`);

const state = await gifts.provider.query({
  request_type: 'view_account', finality: 'final', account_id: gifts.accountId,
});
console.log(`contract account balance: ${state.amount} yocto, code_hash ${state.code_hash}`);
console.log('DEMO accounts:');
console.log('  giver/deployer:', demoId);
console.log('  contract:      ', gifts.accountId);
console.log('  recipient:      friend.' + demoId);
