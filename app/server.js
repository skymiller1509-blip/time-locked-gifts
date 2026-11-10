// Time-Locked Gifts - demo web app (TESTNET ONLY).
//
// Plain Node http server, no framework. Read calls go straight to the
// public testnet RPC. Write calls (create / top up / open) are signed by
// the server with the DEMO accounts in ../keys/ - accounts Mabel created
// for this demo, holding testnet funds only. In a real product each user
// would sign with their own wallet; the contract rules would be exactly
// the same, because every rule lives in the contract, not in this app.
//
// The app seals the message and video link in its own UI until a gift is
// opened. Be clear-eyed: on this testnet demo the message is stored in
// the contract in plain form, so the seal is a courtesy, not encryption.
// The money lock is the part the contract truly enforces.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { accountFromKeyFile, viewCall, yoctoToNear } from '../scripts/near.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 8077;
const GAS = '100000000000000';

const giver = accountFromKeyFile('demo-account.json'); // demo giver
const friend = accountFromKeyFile('friend-account.json'); // demo recipient
const CONTRACT = accountFromKeyFile('gifts-account.json').accountId;
const DEMO_OWNER = friend.accountId;

function nearToYocto(amount) {
  const [whole, frac = ''] = String(amount).split('.');
  const fracPadded = (frac + '0'.repeat(24)).slice(0, 24);
  return BigInt(whole) * 10n ** 24n + BigInt(fracPadded || '0');
}

function publicGift(g) {
  // Seal the message and video until the gift is opened.
  const sealed = !g.opened;
  return {
    token_id: g.token_id,
    giver: g.giver,
    recipient: g.recipient,
    owner: g.owner,
    pot_near: yoctoToNear(g.amount_yocto),
    unlock_iso: new Date(Number(BigInt(g.unlock_ns) / 1_000_000n)).toISOString(),
    unlock_ns: g.unlock_ns,
    opened: g.opened,
    sealed,
    message: sealed ? null : g.message,
    video_url: sealed ? null : g.video_url,
  };
}

async function handleApi(req, res, url) {
  const send = (code, obj) => {
    res.writeHead(code, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(obj));
  };
  const body = await new Promise((resolve) => {
    let d = '';
    req.on('data', (c) => (d += c));
    req.on('end', () => resolve(d ? JSON.parse(d) : {}));
  }).catch(() => ({}));

  try {
    if (req.method === 'GET' && url.pathname === '/api/config') {
      return send(200, {
        contract: CONTRACT, giver: giver.accountId, demo_recipient: DEMO_OWNER,
        explorer: 'https://testnet.nearblocks.io',
      });
    }
    if (req.method === 'GET' && url.pathname === '/api/gifts') {
      const owner = url.searchParams.get('owner') || DEMO_OWNER;
      const gifts = await viewCall(CONTRACT, 'gifts_for_owner', { account_id: owner });
      return send(200, { gifts: (gifts || []).map(publicGift) });
    }
    if (req.method === 'POST' && url.pathname === '/api/gifts') {
      const { recipient, amount_near, unlock_iso, message, video_url } = body;
      const unlockNs = BigInt(new Date(unlock_iso).getTime()) * 1_000_000n;
      const out = await giver.functionCall({
        contractId: CONTRACT, methodName: 'create_gift',
        args: {
          recipient: recipient || DEMO_OWNER,
          unlock_ns: unlockNs.toString(),
          message: message || '', video_url: video_url || '',
        },
        gas: GAS, attachedDeposit: nearToYocto(amount_near || '0.1').toString(),
      });
      const gift = JSON.parse(Buffer.from(out.status.SuccessValue, 'base64').toString());
      return send(200, { gift: publicGift(gift), tx: out.transaction.hash });
    }
    const topUp = url.pathname.match(/^\/api\/gifts\/([\w-]+)\/top-up$/);
    if (req.method === 'POST' && topUp) {
      const out = await giver.functionCall({
        contractId: CONTRACT, methodName: 'top_up_gift',
        args: { token_id: topUp[1] }, gas: GAS,
        attachedDeposit: nearToYocto(body.amount_near || '0.05').toString(),
      });
      const gift = await viewCall(CONTRACT, 'get_gift', { token_id: topUp[1] });
      return send(200, { gift: publicGift(gift), tx: out.transaction.hash });
    }
    const open = url.pathname.match(/^\/api\/gifts\/([\w-]+)\/open$/);
    if (req.method === 'POST' && open) {
      const gift = await viewCall(CONTRACT, 'get_gift', { token_id: open[1] });
      if (!gift) return send(404, { error: 'No such gift' });
      if (gift.owner !== DEMO_OWNER) {
        return send(400, {
          error: `This demo can only open gifts owned by the demo recipient (${DEMO_OWNER}). This one belongs to ${gift.owner}.`,
        });
      }
      try {
        const out = await friend.functionCall({
          contractId: CONTRACT, methodName: 'open_gift',
          args: { token_id: open[1] }, gas: GAS,
        });
        const after = await viewCall(CONTRACT, 'get_gift', { token_id: open[1] });
        return send(200, { gift: publicGift(after), tx: out.transaction.hash });
      } catch (e) {
        // The contract refused - that refusal IS the product working.
        const m = String(e.message || e);
        const reason = m.includes('still locked')
          ? 'The contract refused: this gift is still locked. The money cannot move yet.'
          : m.includes('Only the gift owner')
            ? 'The contract refused: only the gift owner can open it.'
            : m.includes('already opened')
              ? 'This gift is already opened.'
              : `The contract refused the opening. (${m.slice(0, 160)})`;
        return send(200, { refused: true, reason });
      }
    }
    return send(404, { error: 'Not found' });
  } catch (e) {
    return send(500, { error: String(e.message || e).slice(0, 300) });
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  if (url.pathname.startsWith('/api/')) return handleApi(req, res, url);
  const file = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
  const filePath = path.join(here, 'public', file);
  if (!filePath.startsWith(path.join(here, 'public')) || !fs.existsSync(filePath)) {
    res.writeHead(404); return res.end('Not found');
  }
  const type = file.endsWith('.html') ? 'text/html' : file.endsWith('.js') ? 'text/javascript' : 'text/css';
  res.writeHead(200, { 'Content-Type': type });
  res.end(fs.readFileSync(filePath));
});

server.listen(PORT, () => {
  console.log(`Time-Locked Gifts demo at http://localhost:${PORT}`);
  console.log(`Contract: ${CONTRACT} (NEAR testnet)`);
});
