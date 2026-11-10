# Time-Locked Gifts - Build Log

Project: **Time-Locked Gifts** - Track: NFTs That Do Something (`nfts`)
Idea: Eddie's own (given 2026-11-10). Second project alongside Scam Guardian
(security track) - rule Q-015: two independent projects are allowed when each
README names the other. DONE in both READMEs (reciprocal line added to
Scam Guardian's README on 2026-11-10).
Rules copies in this folder: `HACKATHON_RULES.md`, `NFTS_TRACK_PROMPT.md`
(tracks/10-nfts.md). Deadline: Fri 2026-11-14 23:59 UTC. Testnet-only is
eligible (Q-010); testnet NEAR is free (Q-008).

## Stage 1 - DONE (2026-11-10)

### Stack chosen
- **near-sdk-js** (the VM has Node 24 but no Rust toolchain). Contract =
  pure ledger core (`contract/src/ledger.js`) + thin SDK adapter
  (`contract/src/contract.js`), so all rules are unit-tested in plain Node.
- Build quirk worth knowing: near-sdk-js's post-install downloads its
  toolchain (binaryen/QuickJS/wasi-sdk) with its own downloader, which
  fails on this VM at the `tar` step (ownership preservation). Workaround
  used: `npm install --ignore-scripts`, then fetch the three release
  tarballs with curl and extract into
  `contract/node_modules/near-sdk-js/lib/cli/deps/` by hand. Build then
  succeeds: `contract/build/contract.wasm` (516 KB).

### Proven - unit tests (plain Node, no chain)
`npm test` - **8/8 pass**: create with deposit mints to recipient; zero
deposit and past unlock refused; **open too early FAILS**; top-up increases
the pot; open after time pays the full pot once (never twice); non-owner
(giver and stranger) cannot open; transfer moves box + pot (old owner
locked out); opened gift refuses top-up and transfer.

### Proven - live on NEAR testnet
Demo accounts created by Mabel (TESTNET ONLY, labelled DEMO, keys only in
`keys/`, git-ignored; not Eddie's accounts):
- giver/deployer: `tlgifts-hecef3.testnet` (via the testnet account helper)
- contract: `gifts.tlgifts-hecef3.testnet`
- recipient: `friend.tlgifts-hecef3.testnet`

Contract deployed: tx `4G5De1aqEdh6NfHEXnCtQR4ZaY9W6oS4t4YL5rpyJe4Y`,
code hash `HAF1Nq2LWP7rKz7t4H7JUvewGQui4Bqjf4gofmhukjo9`.
(Note: a JS-SDK contract account needs ~6 testnet NEAR before deploying -
516 KB of code storage at ~1 NEAR per 100 KB. First deploy attempt failed
on exactly that; topped up and redeployed fine.)

Full live cycle via `scripts/run-demo-test.mjs` (gift-2):
- create_gift 0.5 NEAR, 2-minute lock: tx `H9h1sPGxuLjdYiVaKwAShoefRbGTV73WVZurBuSgrC5y`
- recipient opens at once → **contract panicked "This gift is still locked"** (call reverted, no money moved)
- top_up_gift +0.25 NEAR: tx `BEL9mHem88XBN9vt2jK3mUvMzo8GV7fSAGDvA9ybT6KY` → pot 0.75 NEAR
- giver (non-owner) opens → **contract panicked "Only the gift owner can open it"**
- after the timer: open_gift tx `7a6xyUe2Y1bj8NzR3WMPb284Wk7K63QaUatnJGfB8ovP` → recipient
  balance **+0.7492 NEAR** (0.75 pot minus gas), gift marked opened, message revealed.
(An earlier gift-1 exists from the first partial run - created fine, never
used in the test sequence; harmless.)

Full demo through the web app (gift-3):
- created via the app UI: tx `H7zNHDzeiuT8T5gg8ie1SNQ35EnyF52VGHvcu3E94Spi` (0.1 NEAR)
- "Try to open it" at once → app shows the contract's refusal in plain words
- after the 2-minute countdown: opened via the app, tx
  `GmxtVCjmYhBs8zTUttCcW1TPpg7EHeGdcY7oyayj7EtC`, message + video link revealed.

App: `npm start` → http://localhost:8077 (occasion presets incl. wedding,
graduation, "turns 25", custom date; live countdown; sealed message until
opening). It was left running on this VM at the end of stage 1.

### The demo script (5 lines, for the X video)
1. "Some gifts should wait for their day." Create a gift: 0.1 NEAR, opens in 2 minutes.
2. The box appears: pot, countdown, message sealed. Friend tops it up - the pot grows.
3. Press "Try to open it" - the contract refuses: still locked. Nobody can cheat the date.
4. The countdown ends. Press open - the pot pays out to the owner on testnet.
5. The message and video appear. "The box is an NFT. The lock is the contract. NEAR holds both."

### Honest limits (also stated in the README)
- Message/video are stored in plain form in the contract on this testnet
  demo; the app seals them in the UI only. The CONTRACT enforces the money
  lock. Hash-commitment + off-chain encrypted message is the noted fix,
  deliberately not built in stage 1.
- Occasion "events" are dates; no oracle verifies a wedding happened.
- Demo accounts/keys are throwaway testnet accounts created by Mabel; in a
  real product users sign with their own wallets.

## Remaining plan to Nov 14
SUPERSEDED by the finish section below: on 2026-11-10 Eddie instructed
"do it all today", so the Nov 11-14 stages were all completed on
2026-11-10 instead of being spread out.

## Finish - DONE (2026-11-10, Mabel's side complete)

- **Presentable pass:** done. One form label rewritten in plain words
  (opening day/time); everything visible in the app works; no
  half-working elements.
- **Fresh live re-test (2026-11-10, gift-4, `scripts/run-demo-test.mjs`):**
  - create_gift 0.5 NEAR, 2-minute lock: tx
    `9DqNW581Ayi6JWai2cH8SEeDQrB4qgaTA7KuvbHRm171`
  - recipient opens at once → reverted "This gift is still locked"
  - top_up_gift +0.25 NEAR: tx `8nRXLD1ZqoyhS13yC4uWmciviJniwsjKTAowN5PxtLZv`
    → pot 0.75 NEAR
  - giver (non-owner) opens → reverted "Only the gift owner can open it"
  - after the unlock time: open_gift tx
    `H4Ci8ZjBpvDDaUknJWzhaivCiWScaJ4Qvh69UAecFpPd` → recipient balance
    **+0.7491 NEAR**, gift opened, message revealed. PASS.
  - Unit tests re-run the same day: **8/8 pass**.
- **Demo video:** `demo.mp4` is IN this repo (85.7 seconds, recorded
  2026-11-10 by screen-capturing the real demo app in a headless
  browser): a gift is created through the app with a 45-second demo
  lock, an early open is refused by the contract in plain words, a
  top-up grows the pot 0.1 → 0.15 NEAR, the countdown ends, the gift
  opens and the message appears.
- **X post draft:** `X_POST.md` in this repo - exact text, ready to
  copy-paste with demo.mp4 attached.
- **Submission payload draft:** `SUBMISSION_PAYLOAD.md` in this repo -
  the exact JSON (requestId generated and kept), with placeholders only
  for Eddie's own details. NO `website` field. NOT sent.
- **Q-015 disclosure:** this README names Scam Guardian, and Scam
  Guardian's README now names this project back (done 2026-11-10).

## Eddie's remaining steps (the ONLY things left - everything else is done)
1. **Repo account:** create a GitLab (or Bitbucket) account, publish
   both repos public, and give Mabel the two repo URLs.
2. **NEAR wallet:** create a mainnet NEAR account (the prize payout
   address) and give Mabel the account id.
3. **X demo posts:** post the two drafted texts from @EmeraldPop15035,
   each with its demo.mp4 attached, and give Mabel the two post URLs.
4. **Confirm and submit:** Mabel fills the two payloads with those URLs
   and the wallet address, reads each payload back word for word, Eddie
   says yes to each - then the two single submissions are sent.
   Deadline for all of it: Fri 2026-11-14 23:59 UTC.
