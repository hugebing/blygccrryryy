// SPDX-License-Identifier: BUSL-1.1

pragma solidity ^0.7.6;

import "./Buffer.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

library PacketLib {
    using Buffer for Buffer.buffer;
    using SafeMath for uint;

    
    struct MiniPacket {
        uint16 srcChain;
        uint16 dstChain;
        uint64 nonce;
        address dstAddress;
        address  srcAddress;
        bytes  payload;
    }

    function bytesToAddress(bytes memory b) internal pure returns (address addr) {
        require(b.length == 20, "Invalid address length");
        assembly {
            // The actual data of `b` starts at memory offset b + 32.
            // mload reads 32 bytes, so we load the full word.
            // Casting this 32-byte word to an address takes the lower 160 bits (rightmost 20 bytes).
            addr := mload(add(b, 32))
        }
    }

    function decodePacket(bytes memory data, uint sizeOfSrcAddress)
        internal
        pure
        returns (MiniPacket memory p)
    {

       // decode the packet
        uint256 realSize;
        uint64 nonce;
        uint16 srcChain;
        uint16 dstChain;
        address dstAddress;
        assembly {
            realSize := mload(add(data, 64))
            nonce := mload(add(data, 72)) // 104 - 32
            srcChain := mload(add(data, 74)) // 106 - 32
            dstChain := mload(add(data, add(76, sizeOfSrcAddress))) // P + 3 - 32 = 105 + size + 3 - 32 = 76 + size
            dstAddress := mload(add(data, add(96, sizeOfSrcAddress))) // P + 23 - 32 = 105 + size + 23 - 32 = 96 + size
        }

        // require(srcChain != 0, "LayerZeroPacket: invalid packet");

        Buffer.buffer memory srcAddressBuffer;
        srcAddressBuffer.init(sizeOfSrcAddress);
        srcAddressBuffer.writeRawBytes(0, data, 106, sizeOfSrcAddress);

        address srcAddress = abi.decode(
            abi.encodePacked(bytes12(0), srcAddressBuffer.buf), // 12B 0 + 20B addr = 32B
            (address)
        );

        uint nonPayloadSize = sizeOfSrcAddress.add(32);// 2 + 2 + 8 + 20, 32 + 20 = 52 if sizeOfSrcAddress == 20
        uint payloadSize = realSize.sub(nonPayloadSize);
        Buffer.buffer memory payloadBuffer;
        payloadBuffer.init(payloadSize);
        payloadBuffer.writeRawBytes(0, data, nonPayloadSize.add(96), payloadSize);


        return MiniPacket({
            srcChain:   srcChain,
            dstChain:   dstChain,
            nonce:      nonce,
            dstAddress: dstAddress,
            srcAddress: srcAddress,
            payload:    payloadBuffer.buf
        });
    }
}