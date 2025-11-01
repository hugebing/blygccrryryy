/**
 * 支援的鏈配置
 */

import { ChainConfig } from '../types';

export const SUPPORTED_CHAINS: Record<number, ChainConfig> = {
  11155111: {
    id: 11155111,
    name: 'Sepolia',
    symbol: 'ETH',
    explorer: 'https://sepolia.etherscan.io',
    rpcUrl: 'https://rpc.sepolia.org',
  },
  84532: {
    id: 84532,
    name: 'Base Sepolia',
    symbol: 'ETH',
    explorer: 'https://sepolia.basescan.org',
    rpcUrl: 'https://sepolia.base.org',
  },
  11155420: {
    id: 11155420,
    name: 'OP Sepolia',
    symbol: 'ETH',
    explorer: 'https://sepolia-optimism.etherscan.io',
    rpcUrl: 'https://sepolia.optimism.io',
  },
};

export const getChainConfig = (chainId: number): ChainConfig | undefined => {
  return SUPPORTED_CHAINS[chainId];
};

export const getExplorerUrl = (chainId: number, txHash: string): string => {
  const chain = SUPPORTED_CHAINS[chainId];
  if (!chain) return '#';
  return `${chain.explorer}/tx/${txHash}`;
};

