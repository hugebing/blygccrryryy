import * as dotenv from 'dotenv';
dotenv.config();

import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const pk = process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [];

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.26",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      evmVersion: 'cancun', 
      viaIR: true,  
    }
  },
  networks: {
    sepolia: {
      url: process.env.RPC_SEPOLIA || "",
      accounts: pk,
      chainId: 11155111
    },
    arbitrumSepolia: {
      url: process.env.RPC_ARBITRUM_SEPOLIA || "",
      accounts: pk,
      chainId: 421614
    },
    baseSepolia: {
      url: process.env.RPC_BASE_SEPOLIA || "",
      accounts: pk,
      chainId: 84532
    },
    optimismSepolia: {
      url: process.env.RPC_OP_SEPOLIA || "",
      accounts: pk,
      chainId: 11155420
    }
  },
  etherscan: {
    apiKey: {
      sepolia: process.env.ETHERSCAN_API_KEY || "",
      arbitrumSepolia: process.env.ARBISCAN_API_KEY || "",
      baseSepolia: process.env.BASESCAN_API_KEY || "",
      optimisticEthereum: process.env.OPSCAN_API_KEY || ""
    },
    customChains: [
      {
        network: "baseSepolia",
        chainId: 84532,
        urls: {
          apiURL: "https://api-sepolia.basescan.org/api",
          browserURL: "https://sepolia.basescan.org"
        }
      },
      {
        network: "arbitrumSepolia",
        chainId: 421614,
        urls: {
          apiURL: "https://api-sepolia.arbiscan.io/api",
          browserURL: "https://sepolia.arbiscan.io"
        }
      },
      {
        network: "optimismSepolia",
        chainId: 11155420,
        urls: {
          apiURL: "https://api-sepolia-optimistic.etherscan.io/api",
          browserURL: "https://sepolia-optimism.etherscan.io"
        }
      }
    ]
  }
};

export default config;
