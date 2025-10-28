// src/bridgeService.js
const { ethers } = require('ethers');

const bridgeAbi = [
  'function getReceiptRoot(uint16 srcChainId, uint256 blockNumber) view returns (bytes32)',
  'function updateMerkleRoot(uint16 srcChainId, uint256 blockNumber, bytes32 receiptsRoot) external'
];

class BridgeService {
  /**
   * @param {string} rpcUrl         - 目的鏈 RPC（寫入 receiptsRoot 的鏈）
   * @param {string} bridgeAddress  - UniversalCrossChainBridge 地址
   * @param {string} [privateKey]   - 用於送交易的私鑰（僅 update 需要）
   */
  constructor(rpcUrl, bridgeAddress, privateKey) {
    if (!rpcUrl) throw new Error('DEST_RPC_URL missing');
    if (!bridgeAddress) throw new Error('BRIDGE_ADDRESS missing');

    this.provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    this.signer = privateKey ? new ethers.Wallet(privateKey, this.provider) : null;
    this.read = new ethers.Contract(bridgeAddress, bridgeAbi, this.provider);
    this.write = this.signer ? new ethers.Contract(bridgeAddress, bridgeAbi, this.signer) : null;
  }

  /**
   * 讀取 on-chain 的 receiptsRoot
   * @param {number} srcChainId
   * @param {string|number} blockNumber - 整數或字串
   * @returns {Promise<string>} bytes32 hex 字串（0x...）
   */
  async getReceiptRoot(srcChainId, blockNumber) {
    const bn = ethers.BigNumber.from(blockNumber);
    const result = await this.read.getReceiptRoot(srcChainId, bn.toHexString());
    return result; // bytes32
  }

  /**
   * 如果 on-chain 還沒寫入，則寫入 receiptsRoot
   * @param {number} srcChainId
   * @param {string|number} blockNumber
   * @param {string} receiptsRoot - 0x 開頭的 bytes32
   * @returns {Promise<{txHash: string, alreadySet: boolean}>}
   */
  async updateMerkleRootIfEmpty(srcChainId, blockNumber, receiptsRoot) {
    if (!this.write) throw new Error('No signer available. PRIVATE_KEY missing?');

    const bn = ethers.BigNumber.from(blockNumber);
    const onchain = await this.read.getReceiptRoot(srcChainId, bn.toHexString());

    if (onchain && onchain !== ethers.constants.HashZero) {
      return { txHash: '', alreadySet: true };
    }

    const tx = await this.write.updateMerkleRoot(srcChainId, bn.toHexString(), receiptsRoot, {
      // 視你的鏈而定可調整 gas 設定或省略
      // gasLimit: ethers.BigNumber.from('150000'),
    });
    const receipt = await tx.wait();
    return { txHash: receipt.transactionHash, alreadySet: false };
  }
}

module.exports = { BridgeService };
