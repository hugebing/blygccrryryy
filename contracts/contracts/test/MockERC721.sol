// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {ERC721}  from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract MockERC721 is ERC721, Ownable {
    constructor(address initialOwner)
        ERC721("Test ERC721", "TNFT")
        Ownable(initialOwner)
    {}

    function mintTo(address to, uint256 tokenId) external onlyOwner {
        _mint(to, tokenId);
    }
}
