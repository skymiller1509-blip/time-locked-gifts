// Unit tests for the gift ledger core - the same code the on-chain
// contract runs. Run with: npm test   (plain Node, no chain needed)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  emptyState, createGift, topUpGift, openGift, transferGift, giftsForOwner,
} from '../contract/src/ledger.js';

const NEAR = 10n ** 24n; // 1 NEAR in yocto
const NOW = 1_700_000_000_000_000_000n; // fixed "now", nanoseconds
const UNLOCK = NOW + 120_000_000_000n; // unlocks 2 minutes later

function makeGift(state, overrides = {}) {
  return createGift(state, {
    giver: 'grandma.testnet',
    recipient: 'kid.testnet',
    deposit: 5n * NEAR,
    nowNs: NOW,
    unlockNs: UNLOCK,
    message: 'Happy graduation!',
    videoUrl: 'https://example.org/video',
    ...overrides,
  });
}

test('create with deposit mints the gift NFT to the recipient and locks the pot', () => {
  const state = emptyState();
  const gift = makeGift(state);
  assert.equal(gift.owner, 'kid.testnet');
  assert.equal(gift.recipient, 'kid.testnet');
  assert.equal(gift.giver, 'grandma.testnet');
  assert.equal(gift.amount_yocto, (5n * NEAR).toString());
  assert.equal(gift.opened, false);
  assert.equal(giftsForOwner(state, 'kid.testnet').length, 1);
});

test('create refuses a zero deposit and a past unlock time', () => {
  const state = emptyState();
  assert.throws(() => makeGift(state, { deposit: 0n }), /must hold some NEAR/);
  assert.throws(() => makeGift(state, { unlockNs: NOW - 1n }), /in the future/);
});

test('open too early FAILS - the lock holds', () => {
  const state = emptyState();
  const gift = makeGift(state);
  assert.throws(
    () => openGift(state, { tokenId: gift.token_id, caller: 'kid.testnet', nowNs: UNLOCK - 1n }),
    /still locked/,
  );
  assert.equal(gift.opened, false);
});

test('top-up increases the pot, from anyone, while unopened', () => {
  const state = emptyState();
  const gift = makeGift(state);
  topUpGift(state, { tokenId: gift.token_id, deposit: 2n * NEAR });
  topUpGift(state, { tokenId: gift.token_id, deposit: 1n * NEAR });
  assert.equal(gift.amount_yocto, (8n * NEAR).toString());
});

test('open after the unlock time pays the full pot to the owner, once', () => {
  const state = emptyState();
  const gift = makeGift(state);
  topUpGift(state, { tokenId: gift.token_id, deposit: 3n * NEAR });
  const { payoutYocto, payTo } = openGift(state, {
    tokenId: gift.token_id, caller: 'kid.testnet', nowNs: UNLOCK, // at the time counts
  });
  assert.equal(payTo, 'kid.testnet');
  assert.equal(payoutYocto, 8n * NEAR);
  assert.equal(gift.opened, true);
  // and never twice
  assert.throws(
    () => openGift(state, { tokenId: gift.token_id, caller: 'kid.testnet', nowNs: UNLOCK + 1n }),
    /already opened/,
  );
});

test('a non-owner cannot open - not the giver, not a stranger', () => {
  const state = emptyState();
  const gift = makeGift(state);
  for (const caller of ['grandma.testnet', 'stranger.testnet']) {
    assert.throws(
      () => openGift(state, { tokenId: gift.token_id, caller, nowNs: UNLOCK + 1n }),
      /Only the gift owner/,
    );
  }
  assert.equal(gift.opened, false);
});

test('transfer moves the box and the pot: new owner opens, old owner cannot', () => {
  const state = emptyState();
  const gift = makeGift(state);
  transferGift(state, { tokenId: gift.token_id, caller: 'kid.testnet', receiver: 'sister.testnet' });
  assert.throws(
    () => openGift(state, { tokenId: gift.token_id, caller: 'kid.testnet', nowNs: UNLOCK + 1n }),
    /Only the gift owner/,
  );
  const { payTo, payoutYocto } = openGift(state, {
    tokenId: gift.token_id, caller: 'sister.testnet', nowNs: UNLOCK + 1n,
  });
  assert.equal(payTo, 'sister.testnet');
  assert.equal(payoutYocto, 5n * NEAR);
});

test('an opened gift cannot be topped up or transferred', () => {
  const state = emptyState();
  const gift = makeGift(state);
  openGift(state, { tokenId: gift.token_id, caller: 'kid.testnet', nowNs: UNLOCK });
  assert.throws(() => topUpGift(state, { tokenId: gift.token_id, deposit: 1n }), /already opened/);
  assert.throws(
    () => transferGift(state, { tokenId: gift.token_id, caller: 'kid.testnet', receiver: 'x.testnet' }),
    /cannot be transferred/,
  );
});
