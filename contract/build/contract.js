function _applyDecoratedDescriptor(i, e, r, n, l) {
  var a = {};
  return Object.keys(n).forEach(function (i) {
    a[i] = n[i];
  }), a.enumerable = !!a.enumerable, a.configurable = !!a.configurable, ("value" in a || a.initializer) && (a.writable = !0), a = r.slice().reverse().reduce(function (r, n) {
    return n(i, e, r) || r;
  }, a), l && void 0 !== a.initializer && (a.value = a.initializer ? a.initializer.call(l) : void 0, a.initializer = void 0), void 0 === a.initializer ? (Object.defineProperty(i, e, a), null) : a;
}

// make PromiseIndex a nominal typing
var PromiseIndexBrand;
(function (PromiseIndexBrand) {
  PromiseIndexBrand[PromiseIndexBrand["_"] = -1] = "_";
})(PromiseIndexBrand || (PromiseIndexBrand = {}));
const TYPE_KEY = "typeInfo";
var TypeBrand;
(function (TypeBrand) {
  TypeBrand["BIGINT"] = "bigint";
  TypeBrand["DATE"] = "date";
})(TypeBrand || (TypeBrand = {}));
function serialize(valueToSerialize) {
  return encode(JSON.stringify(valueToSerialize, function (key, value) {
    if (typeof value === "bigint") {
      return {
        value: value.toString(),
        [TYPE_KEY]: TypeBrand.BIGINT
      };
    }
    if (typeof this[key] === "object" && this[key] !== null && this[key] instanceof Date) {
      return {
        value: this[key].toISOString(),
        [TYPE_KEY]: TypeBrand.DATE
      };
    }
    return value;
  }));
}
function deserialize(valueToDeserialize) {
  return JSON.parse(decode(valueToDeserialize), (_, value) => {
    if (value !== null && typeof value === "object" && Object.keys(value).length === 2 && Object.keys(value).every(key => ["value", TYPE_KEY].includes(key))) {
      switch (value[TYPE_KEY]) {
        case TypeBrand.BIGINT:
          return BigInt(value["value"]);
        case TypeBrand.DATE:
          return new Date(value["value"]);
      }
    }
    return value;
  });
}
/**
 * Convert a string to Uint8Array, each character must have a char code between 0-255.
 * @param s - string that with only Latin1 character to convert
 * @returns result Uint8Array
 */
function bytes(s) {
  return env.latin1_string_to_uint8array(s);
}
/**
 * Convert a Uint8Array to string, each uint8 to the single character of that char code
 * @param a - Uint8Array to convert
 * @returns result string
 */
function str(a) {
  return env.uint8array_to_latin1_string(a);
}
/**
 * Encode the string to Uint8Array with UTF-8 encoding
 * @param s - String to encode
 * @returns result Uint8Array
 */
function encode(s) {
  return env.utf8_string_to_uint8array(s);
}
/**
 * Decode the Uint8Array to string in UTF-8 encoding
 * @param a - array to decode
 * @returns result string
 */
function decode(a) {
  return env.uint8array_to_utf8_string(a);
}

var CurveType;
(function (CurveType) {
  CurveType[CurveType["ED25519"] = 0] = "ED25519";
  CurveType[CurveType["SECP256K1"] = 1] = "SECP256K1";
})(CurveType || (CurveType = {}));
var DataLength;
(function (DataLength) {
  DataLength[DataLength["ED25519"] = 32] = "ED25519";
  DataLength[DataLength["SECP256K1"] = 64] = "SECP256K1";
})(DataLength || (DataLength = {}));

/**
 * A Promise result in near can be one of:
 * - NotReady = 0 - the promise you are specifying is still not ready, not yet failed nor successful.
 * - Successful = 1 - the promise has been successfully executed and you can retrieve the resulting value.
 * - Failed = 2 - the promise execution has failed.
 */
var PromiseResult;
(function (PromiseResult) {
  PromiseResult[PromiseResult["NotReady"] = 0] = "NotReady";
  PromiseResult[PromiseResult["Successful"] = 1] = "Successful";
  PromiseResult[PromiseResult["Failed"] = 2] = "Failed";
})(PromiseResult || (PromiseResult = {}));
/**
 * A promise error can either be due to the promise failing or not yet being ready.
 */
var PromiseError;
(function (PromiseError) {
  PromiseError[PromiseError["Failed"] = 0] = "Failed";
  PromiseError[PromiseError["NotReady"] = 1] = "NotReady";
})(PromiseError || (PromiseError = {}));

const U64_MAX = 2n ** 64n - 1n;
const EVICTED_REGISTER = U64_MAX - 1n;
/**
 * Logs parameters in the NEAR WASM virtual machine.
 *
 * @param params - Parameters to log.
 */
function log(...params) {
  env.log(params.reduce((accumulated, parameter, index) => {
    // Stringify undefined
    const param = parameter === undefined ? "undefined" : parameter;
    // Convert Objects to strings and convert to string
    const stringified = typeof param === "object" ? JSON.stringify(param) : `${param}`;
    if (index === 0) {
      return stringified;
    }
    return `${accumulated} ${stringified}`;
  }, ""));
}
/**
 * Returns the account ID of the account that called the function.
 * Can only be called in a call or initialize function.
 */
function predecessorAccountId() {
  env.predecessor_account_id(0);
  return str(env.read_register(0));
}
/**
 * Returns the account ID of the current contract - the contract that is being executed.
 */
function currentAccountId() {
  env.current_account_id(0);
  return str(env.read_register(0));
}
/**
 * Returns the current block timestamp.
 */
function blockTimestamp() {
  return env.block_timestamp();
}
/**
 * Returns the amount of NEAR attached to this function call.
 * Can only be called in payable functions.
 */
function attachedDeposit() {
  return env.attached_deposit();
}
/**
 * Reads the value from NEAR storage that is stored under the provided key.
 *
 * @param key - The key to read from storage.
 */
function storageReadRaw(key) {
  const returnValue = env.storage_read(key, 0);
  if (returnValue !== 1n) {
    return null;
  }
  return env.read_register(0);
}
/**
 * Writes the provided bytes to NEAR storage under the provided key.
 *
 * @param key - The key under which to store the value.
 * @param value - The value to store.
 */
function storageWriteRaw(key, value) {
  return env.storage_write(key, value, EVICTED_REGISTER) === 1n;
}
/**
 * Returns the arguments passed to the current smart contract call.
 */
function inputRaw() {
  env.input(0);
  return env.read_register(0);
}
/**
 * Returns the arguments passed to the current smart contract call as utf-8 string.
 */
function input() {
  return decode(inputRaw());
}
/**
 * Create a NEAR promise which will have multiple promise actions inside.
 *
 * @param accountId - The account ID of the target contract.
 */
function promiseBatchCreate(accountId) {
  return env.promise_batch_create(accountId);
}
/**
 * Attach a transfer promise action to the NEAR promise index with the provided promise index.
 *
 * @param promiseIndex - The index of the promise to attach a transfer action to.
 * @param amount - The amount of NEAR to transfer.
 */
function promiseBatchActionTransfer(promiseIndex, amount) {
  env.promise_batch_action_transfer(promiseIndex, amount);
}
/**
 * Executes the promise in the NEAR WASM virtual machine.
 *
 * @param promiseIndex - The index of the promise to execute.
 */
function promiseReturn(promiseIndex) {
  env.promise_return(promiseIndex);
}

/**
 * Tells the SDK to expose this function as a view function.
 *
 * @param _empty - An empty object.
 */
function view(_empty) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function (_target, _key, _descriptor
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  ) {};
}
function call({
  privateFunction = false,
  payableFunction = false
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function (_target, _key, descriptor) {
    const originalMethod = descriptor.value;
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    descriptor.value = function (...args) {
      if (privateFunction && predecessorAccountId() !== currentAccountId()) {
        throw new Error("Function is private");
      }
      if (!payableFunction && attachedDeposit() > 0n) {
        throw new Error("Function is not payable");
      }
      return originalMethod.apply(this, args);
    };
  };
}
function NearBindgen({
  requireInit = false,
  serializer = serialize,
  deserializer = deserialize
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return target => {
    return class extends target {
      static _create() {
        return new target();
      }
      static _getState() {
        const rawState = storageReadRaw(bytes("STATE"));
        return rawState ? this._deserialize(rawState) : null;
      }
      static _saveToStorage(objectToSave) {
        storageWriteRaw(bytes("STATE"), this._serialize(objectToSave));
      }
      static _getArgs() {
        return JSON.parse(input() || "{}");
      }
      static _serialize(value, forReturn = false) {
        if (forReturn) {
          return encode(JSON.stringify(value, (_, value) => typeof value === "bigint" ? `${value}` : value));
        }
        return serializer(value);
      }
      static _deserialize(value) {
        return deserializer(value);
      }
      static _reconstruct(classObject, plainObject) {
        for (const item in classObject) {
          const reconstructor = classObject[item].constructor?.reconstruct;
          classObject[item] = reconstructor ? reconstructor(plainObject[item]) : plainObject[item];
        }
        return classObject;
      }
      static _requireInit() {
        return requireInit;
      }
    };
  };
}

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

function emptyState() {
  return {
    nextId: 1,
    gifts: {}
  }; // gifts: tokenId -> gift record
}
function getGiftOrThrow(state, tokenId) {
  const gift = state.gifts[tokenId];
  if (!gift) throw new Error(`No gift with id ${tokenId}`);
  return gift;
}

// The giver deposits NEAR and names the recipient, the unlock time, a
// written message and a video link. The gift NFT is minted straight to the
// recipient: the NFT is the gift box. The money never leaves the pot here.
function createGift(state, {
  giver,
  recipient,
  deposit,
  nowNs,
  unlockNs,
  message,
  videoUrl
}) {
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
    recipient,
    // who the gift was made for; never changes
    owner: recipient,
    // current NFT owner; changes on transfer
    amount_yocto: deposit.toString(),
    unlock_ns: unlockNs.toString(),
    message: message || '',
    video_url: videoUrl || '',
    opened: false,
    created_ns: nowNs.toString()
  };
  state.gifts[tokenId] = gift;
  return gift;
}

// Anyone can add to an unopened gift, so family and friends can watch the
// pot grow until the day. Top-ups only ever add; there is no way to take
// money out of an unopened gift.
function topUpGift(state, {
  tokenId,
  deposit
}) {
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
function openGift(state, {
  tokenId,
  caller,
  nowNs
}) {
  const gift = getGiftOrThrow(state, tokenId);
  if (gift.opened) throw new Error('This gift is already opened');
  if (caller !== gift.owner) {
    throw new Error('Only the gift owner can open it');
  }
  if (nowNs < BigInt(gift.unlock_ns)) {
    throw new Error('This gift is still locked - it cannot be opened yet');
  }
  gift.opened = true;
  return {
    gift,
    payoutYocto: BigInt(gift.amount_yocto),
    payTo: gift.owner
  };
}

// Transferring the NFT moves the whole gift: the new owner is the only one
// who can open it, and the pot follows the box. The old owner keeps no
// rights at all (there is no giver clawback and no owner-withdraw path).
function transferGift(state, {
  tokenId,
  caller,
  receiver
}) {
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
function getGift(state, tokenId) {
  return state.gifts[tokenId] || null;
}
function giftsForOwner(state, accountId) {
  return Object.values(state.gifts).filter(g => g.owner === accountId);
}
function totalSupply(state) {
  return Object.keys(state.gifts).length.toString();
}

var _dec, _dec2, _dec3, _dec4, _dec5, _dec6, _dec7, _dec8, _dec9, _dec0, _class, _class2;
function nftEventLog(event, data) {
  log(`EVENT_JSON:${JSON.stringify({
    standard: 'nep171',
    version: '1.0.0',
    event,
    data
  })}`);
}
let TimeLockedGifts = (_dec = NearBindgen({}), _dec2 = call({
  payableFunction: true
}), _dec3 = call({
  payableFunction: true
}), _dec4 = call({}), _dec5 = call({
  payableFunction: true
}), _dec6 = view(), _dec7 = view(), _dec8 = view(), _dec9 = view(), _dec0 = view(), _dec(_class = (_class2 = class TimeLockedGifts {
  constructor() {
    this.state = emptyState();
  }

  // ---- state-changing methods ----

  // Payable. Deposit = the starting pot. Mints the gift NFT to the
  // recipient. unlock_ns is a unix timestamp in NANOSECONDS (string).
  create_gift({
    recipient,
    unlock_ns,
    message,
    video_url
  }) {
    const gift = createGift(this.state, {
      giver: predecessorAccountId(),
      recipient,
      deposit: attachedDeposit(),
      nowNs: blockTimestamp(),
      unlockNs: BigInt(unlock_ns),
      message,
      videoUrl: video_url
    });
    nftEventLog('nft_mint', [{
      owner_id: gift.owner,
      token_ids: [gift.token_id]
    }]);
    return gift;
  }

  // Payable. Anyone may add to an unopened gift.
  top_up_gift({
    token_id
  }) {
    return topUpGift(this.state, {
      tokenId: token_id,
      deposit: attachedDeposit()
    });
  }

  // Only the NFT owner, only at/after the unlock time - the ledger throws
  // otherwise, and a throw here reverts the whole call, so no money moves.
  // The ledger marks the gift opened BEFORE this transfer is arranged.
  open_gift({
    token_id
  }) {
    const {
      payoutYocto,
      payTo
    } = openGift(this.state, {
      tokenId: token_id,
      caller: predecessorAccountId(),
      nowNs: blockTimestamp()
    });
    const promise = promiseBatchCreate(payTo);
    promiseBatchActionTransfer(promise, payoutYocto);
    promiseReturn(promise);
    return {
      token_id,
      paid_yocto: payoutYocto.toString(),
      paid_to: payTo
    };
  }

  // NEP-171 transfer (no approvals in this minimal implementation, so
  // approval_id is accepted and ignored). Moving the NFT moves the claim
  // on the pot with it - the old owner keeps no way back in.
  nft_transfer({
    receiver_id,
    token_id,
    memo
  }) {
    if (attachedDeposit() !== 1n) {
      throw new Error('Requires attached deposit of exactly 1 yoctoNEAR');
    }
    transferGift(this.state, {
      tokenId: token_id,
      caller: predecessorAccountId(),
      receiver: receiver_id
    });
    nftEventLog('nft_transfer', [{
      old_owner_id: predecessorAccountId(),
      new_owner_id: receiver_id,
      token_ids: [token_id],
      memo: memo || undefined
    }]);
    return null;
  }

  // ---- views ----

  get_gift({
    token_id
  }) {
    return getGift(this.state, token_id);
  }
  nft_token({
    token_id
  }) {
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
          opened: gift.opened
        })
      }
    };
  }
  nft_total_supply() {
    return totalSupply(this.state);
  }
  nft_tokens_for_owner({
    account_id,
    from_index,
    limit
  }) {
    const all = giftsForOwner(this.state, account_id);
    const start = from_index ? Number(from_index) : 0;
    const slice = limit ? all.slice(start, start + Number(limit)) : all.slice(start);
    return slice.map(g => this.nft_token({
      token_id: g.token_id
    }));
  }
  gifts_for_owner({
    account_id
  }) {
    return giftsForOwner(this.state, account_id);
  }
}, _applyDecoratedDescriptor(_class2.prototype, "create_gift", [_dec2], Object.getOwnPropertyDescriptor(_class2.prototype, "create_gift"), _class2.prototype), _applyDecoratedDescriptor(_class2.prototype, "top_up_gift", [_dec3], Object.getOwnPropertyDescriptor(_class2.prototype, "top_up_gift"), _class2.prototype), _applyDecoratedDescriptor(_class2.prototype, "open_gift", [_dec4], Object.getOwnPropertyDescriptor(_class2.prototype, "open_gift"), _class2.prototype), _applyDecoratedDescriptor(_class2.prototype, "nft_transfer", [_dec5], Object.getOwnPropertyDescriptor(_class2.prototype, "nft_transfer"), _class2.prototype), _applyDecoratedDescriptor(_class2.prototype, "get_gift", [_dec6], Object.getOwnPropertyDescriptor(_class2.prototype, "get_gift"), _class2.prototype), _applyDecoratedDescriptor(_class2.prototype, "nft_token", [_dec7], Object.getOwnPropertyDescriptor(_class2.prototype, "nft_token"), _class2.prototype), _applyDecoratedDescriptor(_class2.prototype, "nft_total_supply", [_dec8], Object.getOwnPropertyDescriptor(_class2.prototype, "nft_total_supply"), _class2.prototype), _applyDecoratedDescriptor(_class2.prototype, "nft_tokens_for_owner", [_dec9], Object.getOwnPropertyDescriptor(_class2.prototype, "nft_tokens_for_owner"), _class2.prototype), _applyDecoratedDescriptor(_class2.prototype, "gifts_for_owner", [_dec0], Object.getOwnPropertyDescriptor(_class2.prototype, "gifts_for_owner"), _class2.prototype), _class2)) || _class);
function gifts_for_owner() {
  const _state = TimeLockedGifts._getState();
  if (!_state && TimeLockedGifts._requireInit()) {
    throw new Error("Contract must be initialized");
  }
  const _contract = TimeLockedGifts._create();
  if (_state) {
    TimeLockedGifts._reconstruct(_contract, _state);
  }
  const _args = TimeLockedGifts._getArgs();
  const _result = _contract.gifts_for_owner(_args);
  if (_result !== undefined) if (_result && _result.constructor && _result.constructor.name === "NearPromise") _result.onReturn();else env.value_return(TimeLockedGifts._serialize(_result, true));
}
function nft_tokens_for_owner() {
  const _state = TimeLockedGifts._getState();
  if (!_state && TimeLockedGifts._requireInit()) {
    throw new Error("Contract must be initialized");
  }
  const _contract = TimeLockedGifts._create();
  if (_state) {
    TimeLockedGifts._reconstruct(_contract, _state);
  }
  const _args = TimeLockedGifts._getArgs();
  const _result = _contract.nft_tokens_for_owner(_args);
  if (_result !== undefined) if (_result && _result.constructor && _result.constructor.name === "NearPromise") _result.onReturn();else env.value_return(TimeLockedGifts._serialize(_result, true));
}
function nft_total_supply() {
  const _state = TimeLockedGifts._getState();
  if (!_state && TimeLockedGifts._requireInit()) {
    throw new Error("Contract must be initialized");
  }
  const _contract = TimeLockedGifts._create();
  if (_state) {
    TimeLockedGifts._reconstruct(_contract, _state);
  }
  const _args = TimeLockedGifts._getArgs();
  const _result = _contract.nft_total_supply(_args);
  if (_result !== undefined) if (_result && _result.constructor && _result.constructor.name === "NearPromise") _result.onReturn();else env.value_return(TimeLockedGifts._serialize(_result, true));
}
function nft_token() {
  const _state = TimeLockedGifts._getState();
  if (!_state && TimeLockedGifts._requireInit()) {
    throw new Error("Contract must be initialized");
  }
  const _contract = TimeLockedGifts._create();
  if (_state) {
    TimeLockedGifts._reconstruct(_contract, _state);
  }
  const _args = TimeLockedGifts._getArgs();
  const _result = _contract.nft_token(_args);
  if (_result !== undefined) if (_result && _result.constructor && _result.constructor.name === "NearPromise") _result.onReturn();else env.value_return(TimeLockedGifts._serialize(_result, true));
}
function get_gift() {
  const _state = TimeLockedGifts._getState();
  if (!_state && TimeLockedGifts._requireInit()) {
    throw new Error("Contract must be initialized");
  }
  const _contract = TimeLockedGifts._create();
  if (_state) {
    TimeLockedGifts._reconstruct(_contract, _state);
  }
  const _args = TimeLockedGifts._getArgs();
  const _result = _contract.get_gift(_args);
  if (_result !== undefined) if (_result && _result.constructor && _result.constructor.name === "NearPromise") _result.onReturn();else env.value_return(TimeLockedGifts._serialize(_result, true));
}
function nft_transfer() {
  const _state = TimeLockedGifts._getState();
  if (!_state && TimeLockedGifts._requireInit()) {
    throw new Error("Contract must be initialized");
  }
  const _contract = TimeLockedGifts._create();
  if (_state) {
    TimeLockedGifts._reconstruct(_contract, _state);
  }
  const _args = TimeLockedGifts._getArgs();
  const _result = _contract.nft_transfer(_args);
  TimeLockedGifts._saveToStorage(_contract);
  if (_result !== undefined) if (_result && _result.constructor && _result.constructor.name === "NearPromise") _result.onReturn();else env.value_return(TimeLockedGifts._serialize(_result, true));
}
function open_gift() {
  const _state = TimeLockedGifts._getState();
  if (!_state && TimeLockedGifts._requireInit()) {
    throw new Error("Contract must be initialized");
  }
  const _contract = TimeLockedGifts._create();
  if (_state) {
    TimeLockedGifts._reconstruct(_contract, _state);
  }
  const _args = TimeLockedGifts._getArgs();
  const _result = _contract.open_gift(_args);
  TimeLockedGifts._saveToStorage(_contract);
  if (_result !== undefined) if (_result && _result.constructor && _result.constructor.name === "NearPromise") _result.onReturn();else env.value_return(TimeLockedGifts._serialize(_result, true));
}
function top_up_gift() {
  const _state = TimeLockedGifts._getState();
  if (!_state && TimeLockedGifts._requireInit()) {
    throw new Error("Contract must be initialized");
  }
  const _contract = TimeLockedGifts._create();
  if (_state) {
    TimeLockedGifts._reconstruct(_contract, _state);
  }
  const _args = TimeLockedGifts._getArgs();
  const _result = _contract.top_up_gift(_args);
  TimeLockedGifts._saveToStorage(_contract);
  if (_result !== undefined) if (_result && _result.constructor && _result.constructor.name === "NearPromise") _result.onReturn();else env.value_return(TimeLockedGifts._serialize(_result, true));
}
function create_gift() {
  const _state = TimeLockedGifts._getState();
  if (!_state && TimeLockedGifts._requireInit()) {
    throw new Error("Contract must be initialized");
  }
  const _contract = TimeLockedGifts._create();
  if (_state) {
    TimeLockedGifts._reconstruct(_contract, _state);
  }
  const _args = TimeLockedGifts._getArgs();
  const _result = _contract.create_gift(_args);
  TimeLockedGifts._saveToStorage(_contract);
  if (_result !== undefined) if (_result && _result.constructor && _result.constructor.name === "NearPromise") _result.onReturn();else env.value_return(TimeLockedGifts._serialize(_result, true));
}

export { create_gift, get_gift, gifts_for_owner, nft_token, nft_tokens_for_owner, nft_total_supply, nft_transfer, open_gift, top_up_gift };
//# sourceMappingURL=contract.js.map
