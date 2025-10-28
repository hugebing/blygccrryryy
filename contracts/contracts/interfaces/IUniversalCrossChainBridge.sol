// SPDX-License-Identifier: MIT
pragma solidity ^0.7.6;
pragma abicoder v2;

/**
 * @title IUniversalCrossChainBridge
 * @notice Interface for cross-chain bridge
 */
interface IUniversalCrossChainBridge {
    function chainId() external view returns (uint16);

    function merkleRoots(uint16 srcChainId, uint256 blockNumber) external view returns (bytes32);

    function inboundNonce(uint16 srcChainId, address srcAddress) external view returns (uint64);

    function outboundNonce(uint16 dstChainId, address srcAddress) external view returns (uint64);

    function updateMerkleRoot(uint16 srcChainId, uint256 blockNumber, bytes32 newRoot) external;

    function send(
        uint16 dstChainId,
        bytes calldata dstAddress,
        bytes calldata payload
    ) external returns (uint64 nonce);

    function receiveMessage(
        uint16 srcChainId,
        uint256 blockNumber,
        uint[] calldata paths,
        uint logIndex,
        bytes[] calldata proof
    ) external;

    function updateOutboundNonce(uint16 dstChainId, address srcAddress, uint64 newNonce) external;

    function updateInboundNonce(uint16 srcChainId, address srcAddress, uint64 newNonce) external;
}