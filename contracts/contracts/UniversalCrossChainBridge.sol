// SPDX-License-Identifier: BUSL-1.1
// Copyright 2025 FISC
//
// This file incorporates code and design patterns inspired by LayerZero v1:
// https://github.com/LayerZero-Labs/LayerZero-v1 (BUSL-1.1)
//
// Modified by FISC on 2025-07-11:
//  - Refactored layout to follow open-source conventions
//  - Added NatSpec comments, reorganized state and functions
//  - Preserved BUSL-1.1 license and attribution

pragma solidity ^0.7.6;
pragma abicoder v2;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

// RLPDecode: parsing RLP and manual Merkle proofs
import "./RLPDecode.sol";
// PacketLib: packet encoding/decoding utilities 
import "./PacketLib.sol";

import "./interfaces/IFISCToken20App.sol";
import "./interfaces/IUniversalCrossChainBridge.sol";

/**
 * @title UniversalCrossChainBridge
 * @notice Generic cross-chain bridge with manual receipt-proof verification (LayerZero v1 style)
 * @dev Uses RLPDecode library to verify Ethereum receipts trie proofs
 */
contract UniversalCrossChainBridge is Ownable, ReentrancyGuard, IUniversalCrossChainBridge, AccessControl {
    using RLPDecode for RLPDecode.RLPItem;
    using RLPDecode for bytes;
    using RLPDecode for RLPDecode.Iterator;

    // --- Structs ---
    struct ULNLog {
        address contractAddress;
        bytes32 topicZeroSig;
        bytes data;
    }

    struct StoredPayload {
        uint64 payloadLength;
        address dstAddress;
        bytes32 payloadHash;
    }

    // --- Constants / Immutables ---
    uint16 public immutable override chainId;

    // --- State Variables ---
    // Merkle roots by source chain ID and block number
    mapping(uint16 => mapping(uint256 => bytes32)) public override merkleRoots;
    // Nonces for inbound (per srcChainId, srcAddress)
    mapping(uint16 => mapping(address => uint64)) public override inboundNonce;
    // Nonces for outbound (per dstChainId, srcAddress)
    mapping(uint16 => mapping(address => uint64)) public override outboundNonce;

    // --- Events ---
    event MessageSent(uint64 indexed nonce, bytes packet);
    event MerkleRootUpdated(
        uint16 indexed srcChainId,
        uint256 indexed blockNumber,
        bytes32 indexed oldRoot,
        bytes32 newRoot
    );
    event MessageReceived(
        uint64 indexed nonce,
        uint16 indexed srcChainId,
        uint16 indexed dstChainId,
        address srcAddress,
        address dstAddress,
        bytes payload
    );

    bytes32 public constant OWNER_ROLE  = keccak256("OWNER_ROLE");
    bytes32 public constant ORACLE_ROLE  = keccak256("ORACLE_ROLE");
    bytes32 public constant RELAER_ROLE = keccak256("RELAER_ROLE");
    bytes32 public constant APP_ROLE = keccak256("APP_ROLE"); // 用於 App 進行操作

    /**
     * @param _chainId ID of the current chain
     */
    constructor(uint16 _chainId) {
        chainId = _chainId;

        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
        _setupRole(OWNER_ROLE, _msgSender());
        _setupRole(ORACLE_ROLE, _msgSender());
        _setupRole(RELAER_ROLE, _msgSender());
        _setupRole(APP_ROLE, _msgSender());
        _setRoleAdmin(RELAER_ROLE, OWNER_ROLE);
        _setRoleAdmin(ORACLE_ROLE, OWNER_ROLE);
        _setRoleAdmin(APP_ROLE, OWNER_ROLE);
    }

    /**
     * @notice Update the stored Merkle root for a given source chain and block
     * @param srcChainId Source chain identifier
     * @param blockNumber Block number on source chain
     * @param newRoot New Merkle root to set
     */
    function updateMerkleRoot(
        uint16 srcChainId,
        uint256 blockNumber,
        bytes32 newRoot
    ) external override{
        require(hasRole(ORACLE_ROLE, msg.sender), "Not authorized oracle");
        require(newRoot != bytes32(0), "Invalid root");

        bytes32 oldRoot = merkleRoots[srcChainId][blockNumber];
        merkleRoots[srcChainId][blockNumber] = newRoot;
        emit MerkleRootUpdated(srcChainId, blockNumber, oldRoot, newRoot);
    }

    // --- Sending messages ---

    /**
     * @notice Send a cross-chain message
     * @param dstChainId Destination chain identifier
     * @param dstAddress Encoded destination contract address (20 bytes)
     * @param payload Application-specific payload
     * @return nonce Assigned outbound nonce
     */
    function send(
        uint16 dstChainId,
        bytes calldata dstAddress,
        bytes calldata payload
    ) external override returns (uint64 nonce) {
        require(hasRole(APP_ROLE, msg.sender), "Caller not trusted app");
        // require(dstChainId != chainId, "Cannot send to same chain");
        
        nonce = ++outboundNonce[dstChainId][msg.sender];
        bytes memory packet = abi.encodePacked(
            nonce,
            chainId,
            abi.encodePacked(msg.sender),
            dstChainId,
            dstAddress,
            payload
        );

        emit MessageSent(nonce, packet);

        return nonce;
    }

    // --- Receiving and proving messages ---

    /**
     * @notice Receive and execute a cross-chain message
     * @param srcChainId Source chain identifier
     * @param blockNumber Block number containing the MessageSent event
     * @param paths Merkle-trie nibble indices per proof layer
     * @param logIndex Index of the log within the receipt
     * @param proof Array of RLP-encoded proof nodes
     */
    function receiveMessage(
        uint16 srcChainId,
        uint256 blockNumber,
        uint[] calldata paths,
        uint logIndex,
        bytes[] calldata proof
    ) external nonReentrant override{
        require(hasRole(RELAER_ROLE, msg.sender), "Caller not trusted relayer");

        bytes32 root = merkleRoots[srcChainId][blockNumber];
        require(root != bytes32(0), "Merkle root not set");

        ULNLog memory ul = _getVerifiedLog(root, paths, logIndex, proof);
        PacketLib.MiniPacket memory pkt = PacketLib.decodePacket(ul.data, 20);

        require(pkt.dstChain == chainId, "Wrong dstChain ID");

        require(hasRole(APP_ROLE, pkt.dstAddress), "Destination address is not a trusted app");
        require(pkt.nonce == ++inboundNonce[pkt.srcChain][pkt.srcAddress], "Invalid nonce");

        pkt.dstAddress.call{ gas: 500_000 }(
            abi.encodeWithSelector(
                IFISCToken20App.crossChainAppReceive.selector,
                pkt.nonce,
                pkt.srcChain,
                pkt.dstChain,
                pkt.srcAddress,
                pkt.dstAddress,
                pkt.payload
            )
        );

        emit MessageReceived(
            pkt.nonce,
            pkt.srcChain,
            pkt.dstChain,
            pkt.srcAddress,
            pkt.dstAddress,
            pkt.payload
        );
    }

    // update inboundNonce
    function updateInboundNonce(uint16 srcChainId, address srcAddress, uint64 newNonce) external override{
        require(hasRole(OWNER_ROLE, msg.sender), "Caller not owner");
        inboundNonce[srcChainId][srcAddress] = newNonce;
    }

    // update outboundNonce
    function updateOutboundNonce(uint16 dstChainId, address srcAddress, uint64 newNonce) external override{
        require(hasRole(OWNER_ROLE, msg.sender), "Caller not owner");
        outboundNonce[dstChainId][srcAddress] = newNonce;
    }

    /**
     * @dev Internal proof verification logic (LayerZero v1 style)
     */
    function _getVerifiedLog(
        bytes32 hashRoot,
        uint[] memory paths,
        uint logIndex,
        bytes[] memory proof
    ) internal pure returns (ULNLog memory log) {
        require(paths.length == proof.length, "Proof size mismatch");
        require(proof.length > 0, "Empty proof");

        RLPDecode.RLPItem memory item;
        for (uint i = 0; i < proof.length; i++) {
            bytes memory node = proof[i];
            require(hashRoot == keccak256(node), "Invalid proof hash");

            item = RLPDecode.toRlpItem(node).safeGetItemByIndex(paths[i]);
            if (i < proof.length - 1) {
                hashRoot = bytes32(item.toUint());
            }
        }

        RLPDecode.RLPItem memory logItem = item.typeOffset().safeGetItemByIndex(3);
        RLPDecode.Iterator memory it = logItem.safeGetItemByIndex(logIndex).iterator();

        uint256 raw = it.next().toUint();
        log.contractAddress = address(uint160(raw));
        log.topicZeroSig = bytes32(it.next().safeGetItemByIndex(0).toUint());
        log.data = it.next().toBytes();
    }

    /**
     * @dev Get receipt root from a block number and source chain ID
     */
    function getReceiptRoot(uint16 srcChainId, uint256 blockNumber) external view returns (bytes32) {
        return merkleRoots[srcChainId][blockNumber];
    }
}
