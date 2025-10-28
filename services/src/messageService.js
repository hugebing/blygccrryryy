// src/messageService.js
const {
    generateReceiptProof,
    getLogIndexByEvent,
    verifyLogWithProof,
    decodeEventFromLog
  } = require('./proofUtils');
  
  class MessageService {
    /**
     * @param {BridgeService} bridgeSvc - 目的鏈服務（含 signer）
     */
    constructor(bridgeSvc) {
      this.bridgeSvc = bridgeSvc;
    }
  
    /** ① 來源端：產生 proof（不上鏈） */
    async buildProof({ rpcUrl = process.env.DEST_RPC_URL, srcBridgeAddress = process.env.BRIDGE_ADDRESS, origTxHash, eventAbi = 'event MessageSent(uint64 indexed nonce, bytes packet)', verifyLocally = true }) {
      const { receipt, logIndex } = await getLogIndexByEvent(rpcUrl, srcBridgeAddress, origTxHash, eventAbi);
  
      const { blockNumber, receiptsRoot, paths, proof } = await generateReceiptProof(
        rpcUrl,
        receipt.blockNumber,
        receipt.transactionIndex
      );
  
      let verifiedLog = null;
      let decodedMessageSent = null;
      if (verifyLocally) {
        verifiedLog = verifyLogWithProof(receiptsRoot, paths, logIndex, proof);
        decodedMessageSent = decodeEventFromLog(verifiedLog.topics, verifiedLog.data, eventAbi);
      }
  
      return {
        src: {
          rpcUrl,
          bridgeAddress: srcBridgeAddress,
          txHash: origTxHash,
          blockNumber,
          txIndex: receipt.transactionIndex,
          logIndex,
          receiptsRoot
        },
        proof: { paths, proof },
        verifiedLog,
        decodedMessageSent
      };
    }
  
    /** ② 目的端：消費 proof（使用預設 BRIDGE_ADDRESS） */
    async processProof({ srcChainId, blockNumber, receiptsRoot, paths, logIndex, proof, txOpts = {} }) {
      const upd = await this.bridgeSvc.updateMerkleRootIfEmpty(srcChainId, blockNumber, receiptsRoot);
      const rx  = await this.bridgeSvc.receiveMessage(srcChainId, blockNumber, paths, logIndex, proof, txOpts);
      return { updateMerkleRoot: upd, receiveMessage: rx };
    }
  
    /** ②-compat：目的端（指定目的橋地址 / 覆蓋 RPC/私鑰） */
    async processProofCompat({ destBridgeAddress, srcChainId, blockNumber, receiptsRoot, paths, logIndex, proof, txOpts = {}, destRpcUrl, privateKey }) {
      const svc = (destRpcUrl || privateKey)
        ? this.bridgeSvc.withOverrides({ rpcUrl: destRpcUrl, privateKey })
        : this.bridgeSvc;
  
      const upd = await svc.updateMerkleRootIfEmptyAt(destBridgeAddress, srcChainId, blockNumber, receiptsRoot);
      const rx  = await svc.receiveMessageAt(destBridgeAddress, srcChainId, blockNumber, paths, logIndex, proof, txOpts);
      return { updateMerkleRoot: upd, receiveMessage: rx };
    }
  }
  
  module.exports = { MessageService };
  