// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {ERC20}   from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * 測試版 USDT：6 decimals，可由 owner 鑄幣
 */
contract MockUSDT is ERC20, Ownable {
    constructor(address initialOwner)
        ERC20("Test USDT", "tUSDT")
        Ownable(initialOwner)
    {}

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount); // amount 以 6 位小數
    }
}
