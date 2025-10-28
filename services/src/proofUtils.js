// src/proofUtils.js
const { ethers } = require('ethers');
const { Trie } = require('@ethereumjs/trie');
const RLP = require('rlp');
const { toBuffer } = require('ethereumjs-util');
const assert = require('assert');

const bufferToNibbles = (buffer) => {
  const nibbles = [];
  for (const byte of buffer) nibbles.push(byte >> 4, byte & 0x0f);
  return nibbles;
};

const decodeCompactKey = (encodedKey) => {
  const header = encodedKey[0];
  const oddLength = Boolean(header & 0x10);
  const nibbles = [];
  let offset = 1;
  if (oddLength) nibbles.push(header & 0x0f);
  else offset = 2;
  for (let i = offset; i < encodedKey.length; i++) {
    nibbles.push(encodedKey[i] >> 4, encodedKey[i] & 0x0f);
  }
  return nibbles;
};

/** 產生單一交易收據的 Merkle proof（以 receiptsTrie） */
async function generateReceiptProof(rpcUrl = process.env.DEST_RPC_URL, blockNumber, txIndex) {
  const provider = new ethers.providers.JsonRpcProvider(rpcUrl);

  const block = await provider.send('eth_getBlockByNumber', [
    ethers.utils.hexValue(blockNumber),
    false
  ]);
  assert(block, `Block ${blockNumber} not found`);

  const receiptsRoot = block.receiptsRoot;
  const txHashes = block.transactions;

  const receipts = await Promise.all(txHashes.map((h) => provider.getTransactionReceipt(h)));
  const trie = new Trie();

  for (let i = 0; i < receipts.length; i++) {
    const r = receipts[i];
    const key = RLP.encode(i);

    const status = r.status ? Buffer.from([1]) : Buffer.alloc(0);
    const gas = toBuffer(r.cumulativeGasUsed.toHexString());
    const bloom = Buffer.from(r.logsBloom.slice(2).padStart(512, '0'), 'hex');
    const logs = r.logs.map((log) => [
      Buffer.from(log.address.slice(2).padStart(40, '0'), 'hex'),
      log.topics.map((t) => Buffer.from(t.slice(2).padStart(64, '0'), 'hex')),
      Buffer.from(log.data.slice(2), 'hex')
    ]);
    const payload = RLP.encode([status, gas, bloom, logs]);

    const encoded =
      r.type && Number(r.type) !== 0
        ? Buffer.concat([Buffer.from([Number(r.type)]), payload]) // typed receipt
        : payload;

    await trie.put(key, encoded);
  }

  const localRoot = '0x' + Buffer.from(trie.root()).toString('hex');
  assert(localRoot.toLowerCase() === receiptsRoot.toLowerCase(), `Root mismatch: local=${localRoot} vs header=${receiptsRoot}`);

  const key = RLP.encode(txIndex);
  const proofBuffers = await trie.createProof(key);

  const fullNibbles = bufferToNibbles(toBuffer(key));
  let offset = 0;
  const paths = proofBuffers.map((rawNode, idx) => {
    const node = RLP.decode(rawNode);
    if (idx < proofBuffers.length - 1) {
      if (node.length === 17) {
        return fullNibbles[offset++]; // branch
      } else if (node.length === 2) {
        const decoded = decodeCompactKey(node[0]);
        offset += decoded.length;
        return 1; // extension
      }
      throw new Error(`Unexpected node type, len=${node.length}`);
    }
    return 1; // leaf
  });

  return {
    blockNumber,
    receiptsRoot,
    paths,
    proof: proofBuffers.map((b) => ethers.utils.hexlify(b))
  };
}

/** 找出 MessageSent 的 logIndex（可傳自訂 eventAbi） */
async function getLogIndexByEvent(rpcUrl = process.env.DEST_RPC_URL, contractAddress, txHash, eventAbi = 'event MessageSent(uint64 indexed nonce, bytes packet)') {
  const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
  const receipt = await provider.getTransactionReceipt(txHash);
  const iface = new ethers.utils.Interface([eventAbi]);
  const topic0 = iface.getEventTopic('MessageSent');

  const idx = receipt.logs.findIndex(
    (l) => l.topics[0] === topic0 && l.address.toLowerCase() === contractAddress.toLowerCase()
  );
  if (idx < 0) throw new Error('MessageSent not found in receipt logs');

  return { receipt, logIndex: idx };
}

/** 使用 proof 驗證 receipt，並回傳該 log 的 topics / data */
function verifyLogWithProof(rootHex, paths, logIndex, proofHexArr) {
  if (paths.length !== proofHexArr.length) throw new Error('Invalid proof size');
  if (proofHexArr.length === 0) throw new Error('Empty proof');

  let hashRoot = toBuffer(rootHex);
  let itemBuf;

  for (let i = 0; i < proofHexArr.length; i++) {
    const nodeBuf = toBuffer(proofHexArr[i]);
    const expectedHash = toBuffer(ethers.utils.keccak256(nodeBuf));
    assert(expectedHash.equals(hashRoot), `Hash mismatch at layer ${i}`);

    const node = RLP.decode(nodeBuf);
    const idx = paths[i];
    assert(idx < node.length, `Invalid path index ${idx}`);

    const child = node[idx];
    if (i < proofHexArr.length - 1) hashRoot = child;
    itemBuf = child;
  }

  let receiptBuf = itemBuf;
  if (receiptBuf.length && [1, 2, 3].includes(receiptBuf[0])) {
    receiptBuf = receiptBuf.slice(1); // 去掉 type 前綴
  }
  const receipt = RLP.decode(receiptBuf);
  const logs = receipt[3];
  assert(Array.isArray(logs) && logIndex < logs.length, 'Log index out of bounds');

  const [addrBuf, topicsArr, dataBuf] = logs[logIndex];
  const contractAddress = `0x${addrBuf.slice(-20).toString('hex')}`;
  const topics = topicsArr.map((t) => `0x${Buffer.from(t).toString('hex')}`);
  const data = `0x${Buffer.from(dataBuf).toString('hex')}`;

  return { contractAddress, topics, data };
}

/** 依 ABI 解事件（預設 MessageSent） */
function decodeEventFromLog(topics, data, eventAbi = 'event MessageSent(uint64 indexed nonce, bytes packet)') {
  const iface = new ethers.utils.Interface([eventAbi]);
  const parsed = iface.parseLog({ topics, data });
  const out = { name: parsed.name, signature: parsed.eventFragment.format(), args: {} };
  parsed.eventFragment.inputs.forEach((input, i) => {
    const v = parsed.args[i];
    out.args[input.name || `${i}`] = ethers.BigNumber.isBigNumber(v) ? v.toString() : v;
  });
  return out;
}

/** 取得指定區塊的 receiptsRoot（直接問 RPC，不經合約） */
async function getBlockReceiptsRoot(rpcUrl = process.env.DEST_RPC_URL, blockNumber = 'latest') {
  const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
  const bnParam = (typeof blockNumber === 'number') ? ethers.utils.hexValue(blockNumber) : blockNumber;
  const block = await provider.send('eth_getBlockByNumber', [bnParam, false]);
  if (!block || !block.receiptsRoot) throw new Error(`Block ${blockNumber} not found or missing receiptsRoot`);
  return block.receiptsRoot;
}

/** 取得指定區塊（直接問 RPC，不經合約） */
async function getBlock(rpcUrl = process.env.DEST_RPC_URL, blockNumber = 'latest') {
  const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
  const bnParam = (typeof blockNumber === 'number') ? ethers.utils.hexValue(blockNumber) : blockNumber;
  const block = await provider.send('eth_getBlockByNumber', [bnParam, false]);
  if (!block) throw new Error(`Block ${blockNumber} not found`);
  return block;
}

/** 取得指定區塊標頭（直接問 RPC，不經合約） */
async function getBlockHeaderByBlockNumber(rpcUrl = process.env.DEST_RPC_URL, blockNumber = 'latest') {
  const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
  const bnParam = (typeof blockNumber === 'number') ? ethers.utils.hexValue(blockNumber) : blockNumber;
  const block = await provider.send('eth_getBlockByNumber', [bnParam, false]);
  if (!block) throw new Error(`Block ${blockNumber} not found`);
  // 回傳區塊標頭相關欄位
  return {
    number: block.number,
    hash: block.hash,
    parentHash: block.parentHash,
    nonce: block.nonce,
    sha3Uncles: block.sha3Uncles,
    logsBloom: block.logsBloom,
    transactionsRoot: block.transactionsRoot,
    stateRoot: block.stateRoot,
    receiptsRoot: block.receiptsRoot,
    miner: block.miner,
    difficulty: block.difficulty,
    totalDifficulty: block.totalDifficulty,
    extraData: block.extraData,
    size: block.size,
    gasLimit: block.gasLimit,
    gasUsed: block.gasUsed,
    timestamp: block.timestamp
  };
}

async function getBlockHeaderByTxHash(rpcUrl = process.env.DEST_RPC_URL, txHash) {
  const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
  const receipt = await provider.getTransactionReceipt(txHash);
  if (!receipt) throw new Error(`Transaction receipt for ${txHash} not found`);
  const blockNumber = receipt.blockNumber;
  return getBlockHeaderByBlockNumber(rpcUrl, blockNumber);
}

module.exports = {
  generateReceiptProof,
  getLogIndexByEvent,
  verifyLogWithProof,
  decodeEventFromLog,
  getBlockReceiptsRoot,
  getBlock,
  getBlockHeaderByBlockNumber,
  getBlockHeaderByTxHash
};
