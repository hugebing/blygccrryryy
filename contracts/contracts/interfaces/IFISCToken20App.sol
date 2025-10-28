// SPDX-License-Identifier: MIT
pragma solidity ^0.7.6;
/**
 * @title IFISCToken20App
 * @notice Interface for cross-chain application entrypoint
 */
interface IFISCToken20App {
    function crossChainAppReceive(
        uint64 nonce,
        uint16 srcChainId,
        uint16 dstChainId,
        address srcAddress,
        address dstAddress,
        bytes calldata payload
    ) external;
}