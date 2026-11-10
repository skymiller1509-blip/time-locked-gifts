// Live on-chain demo test (TESTNET). Two phases:
//   node run-demo-test.mjs create   - create a gift locked for 2 minutes,
//                                     try to open it at once (must FAIL),
//                                     top it up, try a non-owner open (must FAIL)
//   node run-demo-test.mjs open     - after the unlock time, the recipient
//                                     opens it and the pot is paid out
import fs from 'node:fs';
import path from 'node:path';
import { accountFromKeyFile, viewCall, KEYS_DIR, yoctoToNear } from './near.mjs';

const GAS = '100000000000000'; // 100 TGas - JS contracts need headroom
const NEAR = 10n ** 24n;
const LAST = path.join(KEYS_DIR, 'last-gift.json');

const giver = accountFromKeyFile('demo-account.json');
const friend = accountFromKeyFile('friend-account.json');
const CONTRACT = accountFromKeyFile('gifts-account.json').accountId;

async function expectFail(label, promise, needle) {
  try {
    await promise;
    console.log(`FAIL: ${label} unexpectedly succeeded`);
    process.exitCode = 1;
  } catch (e) {
    const msg = String(e.message || e);
    const ok = msg.includes(needle);
    console.log(`${ok ? 'PASS' : 'FAIL'}: ${label} reverted${ok ? ` with "${needle}"` : ` with unexpected error: ${msg.slice(0, 200)}`}`);
    if (!ok) process.exitCode = 1;
  }
}

if (process.argv[2] === 'create') {
  const unlockMs = Date.now() + 120_000;
  const unlockNs = BigInt(unlockMs) * 1_000_000n;
  const out = await giver.functionCall({
    contractId: CONTRACT,
    methodName: 'create_gift',
    args: {
      recipient: friend.accountId,
      unlock_ns: unlockNs.toString(),
      message: 'For your graduation day - we are so proud of you!',
      video_url: 'https://example.org/graduation-video',
    },
    gas: GAS,
    attachedDeposit: (NEAR / 2n).toString(), // 0.5 NEAR
  });
  const gift = out.receipts_outcome
    ? JSON.parse(Buffer.from(out.status.SuccessValue, 'base64').toString() || 'null')
    : null;
  console.log('create_gift tx:', out.transaction.hash);
  console.log('gift created:', JSON.stringify(gift));

  const onChain = await viewCall(CONTRACT, 'get_gift', { token_id: gift.token_id });
  console.log(`on-chain pot: ${yoctoToNear(onChain.amount_yocto)} NEAR, owner ${onChain.owner}, opened ${onChain.opened}`);

  await expectFail(
    'recipient opens too early',
    friend.functionCall({ contractId: CONTRACT, methodName: 'open_gift', args: { token_id: gift.token_id }, gas: GAS }),
    'still locked',
  );

  const top = await giver.functionCall({
    contractId: CONTRACT, methodName: 'top_up_gift',
    args: { token_id: gift.token_id }, gas: GAS, attachedDeposit: (NEAR / 4n).toString(),
  });
  console.log('top_up_gift tx:', top.transaction.hash);
  const afterTop = await viewCall(CONTRACT, 'get_gift', { token_id: gift.token_id });
  console.log(`pot after top-up: ${yoctoToNear(afterTop.amount_yocto)} NEAR`);

  await expectFail(
    'giver (non-owner) tries to open',
    giver.functionCall({ contractId: CONTRACT, methodName: 'open_gift', args: { token_id: gift.token_id }, gas: GAS }),
    'Only the gift owner',
  );

  fs.writeFileSync(LAST, JSON.stringify({ tokenId: gift.token_id, unlockMs }, null, 2));
  console.log(`saved ${LAST}; unlock at ${new Date(unlockMs).toISOString()}`);
} else if (process.argv[2] === 'open') {
  const { tokenId, unlockMs } = JSON.parse(fs.readFileSync(LAST, 'utf8'));
  const waitMs = unlockMs + 2000 - Date.now();
  if (waitMs > 0) {
    console.log(`waiting ${Math.ceil(waitMs / 1000)}s for the unlock time...`);
    await new Promise((r) => setTimeout(r, waitMs));
  }
  const before = await friend.provider.query({
    request_type: 'view_account', finality: 'final', account_id: friend.accountId,
  });
  const out = await friend.functionCall({
    contractId: CONTRACT, methodName: 'open_gift', args: { token_id: tokenId }, gas: GAS,
  });
  console.log('open_gift tx:', out.transaction.hash);
  const gift = await viewCall(CONTRACT, 'get_gift', { token_id: tokenId });
  const after = await friend.provider.query({
    request_type: 'view_account', finality: 'final', account_id: friend.accountId,
  });
  const gained = BigInt(after.amount) - BigInt(before.amount);
  console.log(`gift opened: ${gift.opened}; message now revealed: "${gift.message}"`);
  console.log(`recipient balance gain: ${yoctoToNear(gained.toString())} NEAR (pot minus gas)`);
  console.log(gift.opened && gained > 0n ? 'PASS: open after unlock paid the owner' : 'FAIL: payout did not land');
  if (!gift.opened || gained <= 0n) process.exitCode = 1;
} else {
  console.log('usage: node run-demo-test.mjs create|open');
}
