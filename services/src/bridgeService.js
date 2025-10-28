// src/bridgeService.js
const { ethers } = require('ethers');

const bridgeAbi = [
  'function getReceiptRoot(uint16 srcChainId, uint256 blockNumber) view returns (bytes32)',
  'function updateMerkleRoot(uint16 srcChainId, uint256 blockNumber, bytes32 receiptsRoot) external',
  'function receiveMessage(uint16 srcChainId, uint256 blockNumber, uint[] calldata paths, uint256 logIndex, bytes[] calldata proof) external',
  'event MessageReceived(uint64 indexed nonce,uint16 indexed srcChainId,uint16 indexed dstChainId,address srcAddress,address dstAddress,bytes payload)'
];

class BridgeService {
  constructor(rpcUrl, bridgeAddress, privateKey) {
    if (!rpcUrl) throw new Error('DEST_RPC_URL missing');
    if (!bridgeAddress) throw new Error('BRIDGE_ADDRESS missing');

    this.bridgeAddress = bridgeAddress;
    this.provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    this.signer = privateKey ? new ethers.Wallet(privateKey, this.provider) : null;

    this.read = new ethers.Contract(bridgeAddress, bridgeAbi, this.provider);
    this.write = this.signer ? new ethers.Contract(bridgeAddress, bridgeAbi, this.signer) : null;
  }

  _contractAt(address, mode) {
    const addr = address || this.bridgeAddress;
    if (mode === 'read') return new ethers.Contract(addr, bridgeAbi, this.provider);
    if (mode === 'write') {
      if (!this.signer) throw new Error('No signer available. PRIVATE_KEY missing?');
      return new ethers.Contract(addr, bridgeAbi, this.signer);
    }
    throw new Error('mode must be read|write');
  }

  withOverrides({ rpcUrl, privateKey, bridgeAddress } = {}) {
    const url = rpcUrl || (this.provider.connection && this.provider.connection.url);
    if (!url) throw new Error('Cannot determine provider URL for withOverrides');
    const addr = bridgeAddress || this.bridgeAddress;
    const pk = (privateKey || (this.signer && this.signer.privateKey)) || '';
    return new BridgeService(url, addr, pk);
  }

  // ===== 預設地址 =====
  async getReceiptRoot(srcChainId, blockNumber) {
    const bn = ethers.BigNumber.from(blockNumber);
    return this.read.getReceiptRoot(srcChainId, bn.toHexString());
  }

  async updateMerkleRootIfEmpty(srcChainId, blockNumber, receiptsRoot) {
    const bn = ethers.BigNumber.from(blockNumber);
    const onchain = await this.read.getReceiptRoot(srcChainId, bn.toHexString());
    if (onchain && onchain !== ethers.constants.HashZero) {
      return { alreadySet: true, txHash: '', onchainRoot: onchain };
    }
    if (!this.write) throw new Error('No signer available. PRIVATE_KEY missing?');
    const tx = await this.write.updateMerkleRoot(srcChainId, bn.toHexString(), receiptsRoot);
    const receipt = await tx.wait();
    return { alreadySet: false, txHash: receipt.transactionHash, onchainRoot: receiptsRoot };
  }

  async receiveMessage(srcChainId, blockNumber, paths, logIndex, proof, txOpts = {}) {
    if (!this.write) throw new Error('No signer available. PRIVATE_KEY missing?');
    const bn = ethers.BigNumber.from(blockNumber);
    const tx = await this.write.receiveMessage(srcChainId, bn.toHexString(), paths, logIndex, proof, txOpts);
    const mined = await tx.wait();

    let parsed = null;
    for (const e of mined.events || []) {
      if (e.event === 'MessageReceived') {
        const [nonce, _src, dst, srcAddress, dstAddress, payload] = e.args;
        parsed = {
          nonce: nonce.toString(),
          srcChainId: _src,
          dstChainId: dst,
          srcAddress,
          dstAddress,
          payload
        };
        break;
      }
    }
    return { txHash: mined.transactionHash, event: parsed };
  }

  // ===== 指定地址（compat 用） =====
  async getReceiptRootAt(bridgeAddress, srcChainId, blockNumber) {
    const bn = ethers.BigNumber.from(blockNumber);
    const c = this._contractAt(bridgeAddress, 'read');
    return c.getReceiptRoot(srcChainId, bn.toHexString());
  }

  async updateMerkleRootIfEmptyAt(bridgeAddress, srcChainId, blockNumber, receiptsRoot) {
    const bn = ethers.BigNumber.from(blockNumber);
    const r = this._contractAt(bridgeAddress, 'read');
    const w = this._contractAt(bridgeAddress, 'write');

    const onchain = await r.getReceiptRoot(srcChainId, bn.toHexString());
    if (onchain && onchain !== ethers.constants.HashZero) {
      return { alreadySet: true, txHash: '', onchainRoot: onchain };
    }
    const tx = await w.updateMerkleRoot(srcChainId, bn.toHexString(), receiptsRoot);
    const mined = await tx.wait();
    return { alreadySet: false, txHash: mined.transactionHash, onchainRoot: receiptsRoot };
  }

  async receiveMessageAt(bridgeAddress, srcChainId, blockNumber, paths, logIndex, proof, txOpts = {}) {
    const bn = ethers.BigNumber.from(blockNumber);
    const w = this._contractAt(bridgeAddress, 'write');
    const tx = await w.receiveMessage(srcChainId, bn.toHexString(), paths, logIndex, proof, txOpts);
    const mined = await tx.wait();

    let parsed = null;
    for (const e of mined.events || []) {
      if (e.event === 'MessageReceived') {
        const [nonce, _src, dst, srcAddress, dstAddress, payload] = e.args;
        parsed = {
          nonce: nonce.toString(),
          srcChainId: _src,
          dstChainId: dst,
          srcAddress,
          dstAddress,
          payload
        };
        break;
      }
    }
    return { txHash: mined.transactionHash, event: parsed };
  }
}

module.exports = { BridgeService };
