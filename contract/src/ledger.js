// Time-Locked Gifts - pure ledger core.
//
// Every rule of the gift box lives here, with no NEAR host calls, so the
// exact code the contract runs can be unit-tested in plain Node.
// The near-sdk-js contract (contract.js) is a thin adapter: it reads the
// environment (caller, attached deposit, block timestamp) and calls these
// functions; state is a plain serialisable object the adapter persists.
//
// Money amounts are yoctoNEAR as BigInt. Times are nanoseconds since the
// unix epoch as BigInt (NEAR's block_timestamp unit).

export function emptyState() {
  return { nextId: 1, gifts: {} }; // gifts: tokenId -> gift record
}

function getGiftOrThrow(state, tokenId) {
  const gift = state.gifts[tokenId];
  if (!gift) throw new Error(`No gift with id ${tokenId}`);
  return gift;
}

// The giver deposits NEAR and names the recipient, the unlock time, a
// written message and a video link. The gift NFT is minted straight to the
// recipient: the NFT is the gift box. The money never leaves the pot here.
export function createGift(state, { giver, recipient, deposit, nowNs, unlockNs, message, videoUrl }) {
  if (typeof recipient !== 'string' || recipient.length === 0) {
    throw new Error('A recipient account is required');
  }
  if (recipient === giver) {
    throw new Error('You cannot send a locked gift to yourself');
  }
  if (deposit <= 0n) {
    throw new Error('A gift must hold some NEAR (attached deposit was 0)');
  }
  if (unlockNs <= nowNs) {
    throw new Error('Unlock time must be in the future');
  }
  const tokenId = `gift-${state.nextId}`;
  state.nextId += 1;
  const gift = {
    token_id: tokenId,
    giver,
    recipient, // who the gift was made for; never changes
    owner: recipient, // current NFT owner; changes on transfer
    amount_yocto: deposit.toString(),
    unlock_ns: unlockNs.toString(),
    message: message || '',
    video_url: videoUrl || '',
    opened: false,
    created_ns: nowNs.toString(),
  };
  state.gifts[tokenId] = gift;
  return gift;
}

// Anyone can add to an unopened gift, so family and friends can watch the
// pot grow until the day. Top-ups only ever add; there is no way to take
// money out of an unopened gift.
export function topUpGift(state, { tokenId, deposit }) {
  const gift = getGiftOrThrow(state, tokenId);
  if (gift.opened) throw new Error('This gift is already opened');
  if (deposit <= 0n) throw new Error('Top-up must be more than 0');
  gift.amount_yocto = (BigInt(gift.amount_yocto) + deposit).toString();
  return gift;
}

// The heart of the product: opening before the unlock time MUST fail.
// Only the current NFT owner may open, only at or after the unlock time.
// The gift is marked opened before any payout is arranged, so the pot can
// never be paid twice.
export function openGift(state, { tokenId, caller, nowNs }) {
  const gift = getGiftOrThrow(state, tokenId);
  if (gift.opened) throw new Error('This gift is already opened');
  if (caller !== gift.owner) {
    throw new Error('Only the gift owner can open it');
  }
  if (nowNs < BigInt(gift.unlock_ns)) {
    throw new Error('This gift is still locked - it cannot be opened yet');
  }
  gift.opened = true;
  return { gift, payoutYocto: BigInt(gift.amount_yocto), payTo: gift.owner };
}

// Transferring the NFT moves the whole gift: the new owner is the only one
// who can open it, and the pot follows the box. The old owner keeps no
// rights at all (there is no giver clawback and no owner-withdraw path).
export function transferGift(state, { tokenId, caller, receiver }) {
  const gift = getGiftOrThrow(state, tokenId);
  if (gift.opened) throw new Error('An opened gift cannot be transferred');
  if (caller !== gift.owner) throw new Error('Only the gift owner can transfer it');
  if (typeof receiver !== 'string' || receiver.length === 0) {
    throw new Error('A receiver account is required');
  }
  if (receiver === gift.owner) throw new Error('That account already owns this gift');
  gift.owner = receiver;
  return gift;
}

export function getGift(state, tokenId) {
  return state.gifts[tokenId] || null;
}

export function giftsForOwner(state, accountId) {
  return Object.values(state.gifts).filter((g) => g.owner === accountId);
}

export function totalSupply(state) {
  return Object.keys(state.gifts).length.toString();
}
