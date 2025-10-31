import type { Abi } from 'viem';

export const VAULT_ABI = [
  {
    "type": "function",
    "name": "depositByRootProof",
    "stateMutability": "nonpayable",
    "inputs": [
      { "name": "billId", "type": "bytes32" },
      { "name": "payer",  "type": "address" },
      { "name": "payee",  "type": "address" },
      { "name": "root",   "type": "bytes32" },
      { "name": "proof",  "type": "bytes32[]" },
      {
        "name": "items",
        "type": "tuple[]",
        "components": [
          { "name": "ercCode", "type": "uint8"    },
          { "name": "token",   "type": "address"  },
          { "name": "id",      "type": "uint256"  },
          { "name": "amount",  "type": "uint256"  }
        ]
      },
      { "name": "sig", "type": "bytes" }
    ],
    "outputs": []
  },
  {
    "type": "function",
    "name": "unlockAndRelease",
    "stateMutability": "nonpayable",
    "inputs": [ { "name": "billId", "type": "bytes32" } ],
    "outputs": []
  },
  {
    "type": "function",
    "name": "refundAllToPayers",
    "stateMutability": "nonpayable",
    "inputs": [ { "name": "billId", "type": "bytes32" } ],
    "outputs": []
  },
  {
    "type": "function",
    "name": "grantRole",
    "stateMutability": "nonpayable",
    "inputs": [
      { "name": "", "type": "bytes32" },
      { "name": "", "type": "address" }
    ],
    "outputs": []
  }
] as const satisfies Abi;
