# Time-Locked Gifts

**A gift that cannot be opened until its day comes.**

Buy a gift for a wedding day, a graduation, or "when you turn 25". The gift
is an NFT on NEAR. Inside it: real money and a message with a video link.
The money sits in a locked pot, held by a smart contract. The contract -
not the app, not the giver, not anyone's promise - refuses every opening
before the day. While the gift waits, family and friends can top the pot
up, so it grows by people adding to it. When the day comes, the owner
opens the box and gets the whole pot and the message.

There is no yield and no investment promise anywhere in this product. The
pot holds exactly what people put in, minus NEAR network fees.

Track: **NFTs That Do Something** (`nfts`) - an NFT that owns money and
carries behaviour: it can be held, topped up and transferred, but its
money cannot move before its date.

Built for NEAR HACKATHON (development window 2026-11-01 to 2026-11-14).
This is one of two independent projects by the same solo builder; the
other is **Scam Guardian** (AI Security & Defense track), a separate
repository. Each is disclosed in the other's README, per rule Q-015.

## How NEAR fits

- The locked pot, the time lock and the ownership rules are a **NEAR smart
  contract** (near-sdk-js), deployed on NEAR **testnet** at
  `gifts.tlgifts-hecef3.testnet`. Anyone can read it with public RPC.
- The gift box is a minimal **NEP-171 NFT** inside the same contract:
  `nft_token`, `nft_total_supply`, `nft_tokens_for_owner` for wallets and
  indexers, `nft_transfer` to pass the gift on, and standard `EVENT_JSON`
  mint/transfer logs.
- The unlock check uses the chain's own clock (`block_timestamp`), so no
  server can be argued with, bribed or hacked into opening a gift early.

## The contract in one screen

All rules live in `contract/src/ledger.js` - pure JavaScript, no chain
calls - so the exact code the contract runs is unit-tested in plain Node.
`contract/src/contract.js` is a thin adapter that reads the NEAR
environment (caller, attached deposit, block time) and calls the ledger.

- `create_gift(recipient, unlock_ns, message, video_url)` - payable. The
  deposit is the starting pot. Mints the gift NFT straight to the
  recipient.
- `top_up_gift(token_id)` - payable, anyone. Adds to an unopened gift.
  There is **no** way to take money out of an unopened gift.
- `open_gift(token_id)` - only the current NFT owner, only when the block
  timestamp is at or past the unlock time; otherwise the call reverts.
  The gift is marked opened **before** the payout is arranged, so the pot
  can never be paid twice.
- `nft_transfer(receiver_id, token_id)` - the box and the claim on the pot
  move together.

### Threat model for transfers (who could try to keep the money?)

- **The old owner, after selling/giving the NFT away:** opening checks the
  *current* owner recorded in the contract, so the old owner's `open_gift`
  reverts. They keep no key, no approval and no back door.
- **The giver, changing their mind:** there is no giver-withdraw or
  giver-open path in the contract at all. Once created, only the owner
  can ever receive the pot.
- **A stranger:** same check - not the owner, no opening.
- **The owner, early:** the timestamp check reverts. The lock does not
  care who asks.
- **Anyone, draining by topping up negatively or re-opening:** top-ups
  only add (deposit must be > 0), and an opened gift refuses all further
  top-ups, transfers and openings.

## Try it - do X, see Y

You need Node 18+. Nothing else to install for the tests.

1. **Run the rule tests:** `npm test`
   → 8 tests pass, including "open too early FAILS", "a non-owner cannot
   open" and "open after the unlock time pays the full pot".
2. **Read the live contract (no keys, no install):** the contract is
   deployed at `gifts.tlgifts-hecef3.testnet` on NEAR testnet. Query it
   with any public RPC, e.g. `scripts/` contains the exact calls the demo
   test used (`run-demo-test.mjs`), and the demo app below shows the same
   data in a page.
3. **Run the demo app:** `cd scripts && npm install` (one time, for the
   standard NEAR client library), then `npm start` at the repo root and
   open http://localhost:8077
   → Make a gift with the "opens in 2 minutes" preset, try to open it at
   once and watch the contract refuse, top it up, wait for the countdown,
   open it and see the money land and the message appear.

The demo app signs with throwaway testnet accounts created for this demo
(keys in `keys/`, never committed - see below). In a real product every
user signs with their own wallet; every rule would still be the
contract's, unchanged.

## Demo

`demo.mp4` in this repository shows the whole story in about a minute and a half, live against the testnet contract:

1. A gift is created with a short demo lock and 0.1 testnet NEAR inside.
2. The box appears: the pot, a live countdown, the message sealed.
3. "Try to open it" is pressed at once - the contract refuses: still locked.
4. A top-up makes the pot grow.
5. The countdown ends, the gift opens, the pot pays out to the owner, and the message and video link appear.

The public demo post on X uses the text drafted in `X_POST.md` in this repository, with this video attached.

## Honest limits - read this

- **Testnet demo.** All accounts and funds here are NEAR testnet. No real
  money moves.
- **The message is sealed by the app, not by cryptography.** The gift
  record stores the message and video link in the contract in plain form,
  so a technical person could read them early through RPC. The app hides
  them until opening day; the **money** lock is the part the contract
  truly enforces. The clean fix, noted not built: store only a hash
  commitment of the message on-chain at creation, keep the message
  encrypted off-chain, and release the decryption key through the app at
  opening. The money path would not change.
- **"Events" are dates.** A wedding or graduation unlock is the date of
  that event, chosen with the occasion presets. This demo does not verify
  that an event happened - no oracle is involved.
- **Transferable, carefully:** the NFT can be transferred and the pot
  follows it (see the threat model). An opened gift can no longer be
  transferred or topped up.

## Layout

- `contract/src/ledger.js` - every rule, pure and unit-tested
- `contract/src/contract.js` - near-sdk-js adapter; `contract/build/contract.wasm` - the deployed build
- `test/ledger.test.js` - the rule tests (`npm test`)
- `app/` - the demo web app (plain Node, no framework)
- `scripts/` - account setup, deployment, and the live on-chain demo test
- `keys/` - DEMO testnet keys, created for this project only. **Git-ignored
  and never committed.** Create your own testnet account to redeploy.

## Baseline and disclosure

Code written for this hackathon in the 2026-11-01 to 2026-11-14 window,
with AI assistance (disclosed per rule Q-005); libraries used:
near-sdk-js for the contract and @near-js/* (near-api-js) for the demo
tooling. The idea is the builder's own. No pre-existing code was used.

License: MIT.
