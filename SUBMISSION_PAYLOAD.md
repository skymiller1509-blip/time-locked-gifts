# Submission payload - Time-Locked Gifts (DRAFT - do not send yet)

This is the exact JSON that will be sent to `POST https://nearhackathon.com/api/applications`,
**only after Eddie has read it back and confirmed it**, and only after the repo is public and the
X demo post is live. One submission per project: there is no second attempt (a repeat is rejected
with 409; mistakes are fixed via https://nearhackathon.com/request-changes).

Rules for this payload:
- Send exactly these fields. **Never add a `website` field** - it is a spam trap and any non-empty
  value rejects the submission automatically.
- Keep the `requestId` below. If sending fails with a network error or a 503, retry with the
  SAME `requestId` - the server treats it as the same submission.
- Values in `<ANGLE BRACKETS>` are Eddie's own details. They must come from Eddie, never guessed.

```json
{
  "requestId": "8592d599-028d-48c8-8f73-8eb2ee96b183",
  "projectName": "Time-Locked Gifts",
  "leadName": "<EDDIE'S FULL NAME>",
  "email": "<EDDIE'S EMAIL>",
  "size": "1",
  "tracks": ["nfts"],
  "nearAddress": "<EDDIE'S MAINNET NEAR ACCOUNT, e.g. hisname.near>",
  "projectUrl": "<PUBLIC REPO URL, after Eddie publishes this repo>",
  "demoUrl": "<URL OF EDDIE'S X DEMO POST>",
  "idea": "Some gifts should wait for their day: a wedding, a graduation, turning 25. Time-Locked Gifts lets anyone buy such a gift on NEAR. The gift is an NFT (a minimal NEP-171 inside the contract) that holds real NEAR in a locked pot, together with a message and a video link. The smart contract itself refuses every opening before the chosen date - not the giver, not the recipient early, not anyone - because the unlock check uses the chain's own clock. While the gift waits, family and friends can top the pot up, so it grows by people adding to it; there is no yield and no way to take money out early. On the day, the owner opens the gift and receives the whole pot and the message. If the NFT is transferred, the pot and the right to open it move with it. Built with near-sdk-js, deployed on NEAR testnet at gifts.tlgifts-hecef3.testnet; every rule lives in a pure, unit-tested ledger core.",
  "consent": true
}
```

Before sending, Eddie must:
1. Fill in the five `<...>` values above from his own details.
2. Read this consent sentence and agree to it (that is what `"consent": true` means):
   "I agree that the organizers may use these details to review our submission and contact us about this hackathon."
3. Read the whole payload once more and say yes. Only then is it sent.
