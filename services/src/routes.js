// src/routes.js
const express = require('express');
const { decodeEventFromLog, verifyLogWithProof, getBlockReceiptsRoot, getBlock, getBlockHeaderByBlockNumber, getBlockHeaderByTxHash } = require('./proofUtils');

function bindRoutes(bridgeSvc, messageSvc) {
  const router = express.Router();

  // Health
  router.get('/health', (_req, res) => res.json({ ok: true }));

  // === A) 來源端：只產生 proof（不上鏈） ===
  // body: { rpcUrl, srcBridgeAddress, origTxHash, eventAbi?, verifyLocally? }
  router.post('/api/build-proof', async (req, res) => {
    try {
      const { rpcUrl, srcBridgeAddress, origTxHash, eventAbi, verifyLocally } = req.body || {};
      if (!origTxHash) {
        return res.status(400).json({ error: 'origTxHash are required' });
      }
      const out = await messageSvc.buildProof({ rpcUrl, srcBridgeAddress, origTxHash, eventAbi, verifyLocally });
      res.json(out);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // === B) 目的端：消費 proof（使用預設 BRIDGE_ADDRESS） ===
  // body: { srcChainId, blockNumber, receiptsRoot, paths, logIndex, proof, txOpts? }
  router.post('/api/process-proof', async (req, res) => {
    try {
      const { srcChainId, blockNumber, receiptsRoot, paths, logIndex, proof, txOpts } = req.body || {};

      console.log('Processing proof...', { srcChainId, blockNumber, receiptsRoot, paths, logIndex, proof, txOpts });
      if (!Number.isFinite(srcChainId) || blockNumber === undefined) {
        return res.status(400).json({ error: 'srcChainId, blockNumber are required' });
      }
      if (!/^0x[0-9a-fA-F]{64}$/.test(receiptsRoot || '')) {
        return res.status(400).json({ error: 'receiptsRoot(bytes32) required' });
      }
      if (!Array.isArray(paths) || !Array.isArray(proof) || !Number.isFinite(logIndex)) {
        return res.status(400).json({ error: 'paths:number[], proof:bytes[], logIndex:number required' });
      }
      const out = await messageSvc.processProof({ srcChainId, blockNumber, receiptsRoot, paths, logIndex, proof, txOpts });
      res.json(out);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // === C) 目的端：消費 proof（compat，可指定目的橋 / 覆蓋 RPC/私鑰） ===
  // body: { destBridgeAddress, srcChainId, blockNumber, receiptsRoot, paths, logIndex, proof, txOpts?, destRpcUrl?, privateKey? }
  router.post('/api/process-proof-compat', async (req, res) => {
    try {
      const { destBridgeAddress, srcChainId, blockNumber, receiptsRoot, paths, logIndex, proof, txOpts, destRpcUrl, privateKey } = req.body || {};
      if (!destBridgeAddress) return res.status(400).json({ error: 'destBridgeAddress is required' });
      if (!Number.isFinite(srcChainId) || blockNumber === undefined) {
        return res.status(400).json({ error: 'srcChainId, blockNumber are required' });
      }
      if (!/^0x[0-9a-fA-F]{64}$/.test(receiptsRoot || '')) {
        return res.status(400).json({ error: 'receiptsRoot(bytes32) required' });
      }
      if (!Array.isArray(paths) || !Array.isArray(proof) || !Number.isFinite(logIndex)) {
        return res.status(400).json({ error: 'paths:number[], proof:bytes[], logIndex:number required' });
      }
      const out = await messageSvc.processProofCompat({ destBridgeAddress, srcChainId, blockNumber, receiptsRoot, paths, logIndex, proof, txOpts, destRpcUrl, privateKey });
      res.json(out);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // === D) 讀合約中的 receiptsRoot（目的鏈儲存） ===
  router.get('/api/get-receipt-root', async (req, res) => {
    try {
      const srcChainId = Number(req.query.srcChainId);
      const blockNumber = req.query.blockNumber;
      if (!Number.isFinite(srcChainId) || blockNumber === undefined) {
        return res.status(400).json({ error: 'srcChainId and blockNumber are required' });
      }
      console.log('Getting Merkle Root...', { srcChainId, blockNumber });
      const receiptsRoot = await bridgeSvc.getReceiptRoot(srcChainId, blockNumber);
      res.json({ receiptsRoot });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // === G) 直接向 RPC 取得某區塊的 receiptsRoot（非合約） ===
  router.get('/api/block', async (req, res) => {
    try {
      const { rpcUrl, blockNumber } = req.query || {};
      if (!rpcUrl) {
        return res.status(400).json({ error: 'rpcUrl is required' });
      }
      const bn = (blockNumber === undefined || blockNumber === '' || blockNumber === null)
        ? 'latest'
        : (isNaN(Number(blockNumber)) ? blockNumber : Number(blockNumber));
      const blockData = await getBlock(rpcUrl, bn);
      res.json({ blockData: blockData});
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

    // === G) 直接向 RPC 取得某區塊的 receiptsRoot（非合約） ===
    router.get('/api/blockHeaderByBlockNumber', async (req, res) => {
      try {
        const { rpcUrl, blockNumber } = req.query || {};
        if (!rpcUrl) {
          return res.status(400).json({ error: 'rpcUrl is required' });
        }
        const bn = (blockNumber === undefined || blockNumber === '' || blockNumber === null)
          ? 'latest'
          : (isNaN(Number(blockNumber)) ? blockNumber : Number(blockNumber));
        const blockHeader = await getBlockHeaderByBlockNumber(rpcUrl, bn);
        res.json({ blockHeader: blockHeader});
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    // === G) 直接向 RPC 取得某區塊的 receiptsRoot（非合約） ===
    router.get('/api/blockHeaderByTxHash', async (req, res) => {
      try {
        const { rpcUrl, txHash } = req.query || {};
        const blockHeader = await getBlockHeaderByTxHash(rpcUrl, txHash);
        res.json({ blockHeader: blockHeader});
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

  // === E) 更新 receiptsRoot（如果空值才寫） ===
  router.post('/api/update-merkle-root', async (req, res) => {
    try {
      const { srcChainId, blockNumber, receiptsRoot } = req.body || {};
      if (!Number.isFinite(srcChainId) || blockNumber === undefined || !/^0x[0-9a-fA-F]{64}$/.test(receiptsRoot || '')) {
        return res.status(400).json({ error: 'srcChainId, blockNumber, receiptsRoot(bytes32) are required' });
      }
      console.log('Updating Merkle Root...', { srcChainId, blockNumber, receiptsRoot });
      const out = await bridgeSvc.updateMerkleRootIfEmpty(srcChainId, blockNumber, receiptsRoot);
      res.json(out);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // === F) verify proof + decode event（本地驗證 / 除錯） ===
  router.post('/api/verify-log-proof', async (req, res) => {
    try {
      const { receiptsRoot, paths, logIndex, proof, eventAbi } = req.body || {};
      if (!/^0x[0-9a-fA-F]{64}$/.test(receiptsRoot || '')) {
        return res.status(400).json({ error: 'receiptsRoot(bytes32) required' });
      }
      if (!Array.isArray(paths) || !Array.isArray(proof) || !Number.isFinite(logIndex)) {
        return res.status(400).json({ error: 'paths:number[], proof:bytes[], logIndex:number required' });
      }
      const verified = verifyLogWithProof(receiptsRoot, paths, logIndex, proof);
      console.log(verified.data);
      const decoded = decodeEventFromLog(verified.topics, verified.data, eventAbi || 'event MessageSent(uint64 indexed nonce, bytes packet)');
      res.json({ verifiedLog: verified, decodedEvent: decoded });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // === G) 直接向 RPC 取得某區塊的 receiptsRoot（非合約） ===
  router.get('/api/block-receipts-root', async (req, res) => {
    try {
      const { rpcUrl, blockNumber } = req.query || {};
      if (!rpcUrl) {
        return res.status(400).json({ error: 'rpcUrl is required' });
      }
      const bn = (blockNumber === undefined || blockNumber === '' || blockNumber === null)
        ? 'latest'
        : (isNaN(Number(blockNumber)) ? blockNumber : Number(blockNumber));
      const root = await getBlockReceiptsRoot(rpcUrl, bn);
      res.json({ blockNumber: bn, receiptsRoot: root });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}

module.exports = { bindRoutes };
