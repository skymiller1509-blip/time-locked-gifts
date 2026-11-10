// Time-Locked Gifts - NEAR testnet contract (near-sdk-js).
//
// This file is only an adapter. ALL the rules - the time lock, who can
// open, top-ups, transfers - live in ./ledger.js, which is pure JS and is
// unit-tested in plain Node (see ../../test/). This adapter reads the
// environment (caller, attached deposit, block timestamp), calls the
// ledger, persists the result, and moves money only where the ledger
// has already said yes.
//
// The gift NFT is a minimal NEP-171 implementation inside this same
// contract: nft_token / nft_total_supply / nft_tokens_for_owner let
// wallets and indexers see the box, and nft_transfer moves it.

import { NearBindgen, near, call, view } from 'near-sdk-js';
import {
  emptyState, createGift, topUpGift, openGift, transferGift,
  getGift, giftsForOwner, totalSupply,
} from './ledger.js';

function nftEventLog(event, data) {
  near.log(`EVENT_JSON:${JSON.stringify({ standard: 'nep171', version: '1.0.0', event, data })}`);
}

@NearBindgen({})
class TimeLockedGifts {
  constructor() {
    this.state = emptyState();
  }

  // ---- state-changing methods ----

  // Payable. Deposit = the starting pot. Mints the gift NFT to the
  // recipient. unlock_ns is a unix timestamp in NANOSECONDS (string).
  @call({ payableFunction: true })
  create_gift({ recipient, unlock_ns, message, video_url }) {
    const gift = createGift(this.state, {
      giver: near.predecessorAccountId(),
      recipient,
      deposit: near.attachedDeposit(),
      nowNs: near.blockTimestamp(),
      unlockNs: BigInt(unlock_ns),
      message,
      videoUrl: video_url,
    });
    nftEventLog('nft_mint', [{ owner_id: gift.owner, token_ids: [gift.token_id] }]);
    return gift;
  }

  // Payable. Anyone may add to an unopened gift.
  @call({ payableFunction: true })
  top_up_gift({ token_id }) {
    return topUpGift(this.state, {
      tokenId: token_id,
      deposit: near.attachedDeposit(),
    });
  }

  // Only the NFT owner, only at/after the unlock time - the ledger throws
  // otherwise, and a throw here reverts the whole call, so no money moves.
  // The ledger marks the gift opened BEFORE this transfer is arranged.
  @call({})
  open_gift({ token_id }) {
    const { payoutYocto, payTo } = openGift(this.state, {
      tokenId: token_id,
      caller: near.predecessorAccountId(),
      nowNs: near.blockTimestamp(),
    });
    const promise = near.promiseBatchCreate(payTo);
    near.promiseBatchActionTransfer(promise, payoutYocto);
    near.promiseReturn(promise);
    return { token_id, paid_yocto: payoutYocto.toString(), paid_to: payTo };
  }

  // NEP-171 transfer (no approvals in this minimal implementation, so
  // approval_id is accepted and ignored). Moving the NFT moves the claim
  // on the pot with it - the old owner keeps no way back in.
  @call({ payableFunction: true })
  nft_transfer({ receiver_id, token_id, memo }) {
    if (near.attachedDeposit() !== 1n) {
      throw new Error('Requires attached deposit of exactly 1 yoctoNEAR');
    }
    const gift = transferGift(this.state, {
      tokenId: token_id,
      caller: near.predecessorAccountId(),
      receiver: receiver_id,
    });
    nftEventLog('nft_transfer', [{
      old_owner_id: near.predecessorAccountId(),
      new_owner_id: receiver_id,
      token_ids: [token_id],
      memo: memo || undefined,
    }]);
    return null;
  }

  // ---- views ----

  @view({})
  get_gift({ token_id }) {
    return getGift(this.state, token_id);
  }

  @view({})
  nft_token({ token_id }) {
    const gift = getGift(this.state, token_id);
    if (!gift) return null;
    return {
      token_id: gift.token_id,
      owner_id: gift.owner,
      metadata: {
        title: gift.opened ? 'Time-Locked Gift (opened)' : 'Time-Locked Gift',
        description: 'A gift that cannot be opened until its day comes.',
        extra: JSON.stringify({
          unlock_ns: gift.unlock_ns,
          amount_yocto: gift.amount_yocto,
          opened: gift.opened,
        }),
      },
    };
  }

  @view({})
  nft_total_supply() {
    return totalSupply(this.state);
  }

  @view({})
  nft_tokens_for_owner({ account_id, from_index, limit }) {
    const all = giftsForOwner(this.state, account_id);
    const start = from_index ? Number(from_index) : 0;
    const slice = limit ? all.slice(start, start + Number(limit)) : all.slice(start);
    return slice.map((g) => this.nft_token({ token_id: g.token_id }));
  }

  @view({})
  gifts_for_owner({ account_id }) {
    return giftsForOwner(this.state, account_id);
  }
}
