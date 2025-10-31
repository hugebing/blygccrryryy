// src/aa.ts
import 'dotenv/config';
import { createPublicClient, http, type Chain } from 'viem';
import { sepolia, arbitrumSepolia, baseSepolia, optimismSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { createKernelAccount, createKernelAccountClient } from '@zerodev/sdk';
import { getEntryPoint, KERNEL_V3_1 } from '@zerodev/sdk/constants';
import { signerToEcdsaValidator } from '@zerodev/ecdsa-validator';

export type ChainSpec = {
  name: 'sepolia' | 'arbitrumSepolia' | 'baseSepolia' | 'optimismSepolia';
  chain: Chain;
  zdRpc: string;
};

export const ENTRY_POINT = getEntryPoint('0.7');
export const KERNEL_VERSION = KERNEL_V3_1;

function getEnv(keys: string[]): string {
  for (const k of keys) {
    const v = process.env[k]?.trim();
    if (v) return v;
  }
  throw new Error(`缺少環境變數之一：${keys.join(' / ')}`);
}

function getOwnerPk(): `0x${string}` {
  const raw = getEnv(['OWNER_PK','PRIVATE_KEY']).replace(/^['"]|['"]$/g,'');
  if (!/^0x[0-9a-fA-F]{64}$/.test(raw)) throw new Error('OWNER_PK/PRIVATE_KEY 必須是 0x + 64 hex');
  return raw as `0x${string}`;
}

// ✅ 加入 ZD_* 與 ZD_RPC_* 兩種命名
function getRpc(name: 'sepolia'|'arbitrumSepolia'|'baseSepolia'|'optimismSepolia'): string {
  const map: Record<string, string[]> = {
    sepolia:          ['ZD_SEPOLIA',          'ZD_RPC_SEPOLIA'],
    arbitrumSepolia:  ['ZD_Arbitrum_Sepolia', 'ZD_RPC_Arbitrum_Sepolia', 'ZD_RPC_ARBITRUM_SEPOLIA'],
    baseSepolia:      ['ZD_Base_Sepolia',     'ZD_RPC_Base_Sepolia',     'ZD_RPC_BASE_SEPOLIA'],
    optimismSepolia:  ['ZD_OP_Sepolia',       'ZD_RPC_OP_Sepolia',       'ZD_RPC_OP_SEPOLIA'],
  };
  return getEnv(map[name]);
}

export async function makeKernel(spec: ChainSpec) {
  const owner = privateKeyToAccount(getOwnerPk());
  const publicClient = createPublicClient({ chain: spec.chain, transport: http() });

  const ecdsaValidator = await signerToEcdsaValidator(publicClient, {
    signer: owner,
    entryPoint: ENTRY_POINT,
    kernelVersion: KERNEL_VERSION,
  });

  const account = await createKernelAccount(publicClient, {
    plugins: { sudo: ecdsaValidator },
    entryPoint: ENTRY_POINT,
    kernelVersion: KERNEL_VERSION,
  });

  const client = await createKernelAccountClient({
    account,
    chain: spec.chain,
    client: publicClient,
    bundlerTransport: http(spec.zdRpc),
  });

  return { owner, publicClient, account, client };
}

export const CHAINS: Record<string, ChainSpec> = {
  sepolia:          { name:'sepolia',          chain: sepolia,          zdRpc: getRpc('sepolia') },
  arbitrumSepolia:  { name:'arbitrumSepolia',  chain: arbitrumSepolia,  zdRpc: getRpc('arbitrumSepolia') },
  baseSepolia:      { name:'baseSepolia',      chain: baseSepolia,      zdRpc: getRpc('baseSepolia') },
  optimismSepolia:  { name:'optimismSepolia',  chain: optimismSepolia,  zdRpc: getRpc('optimismSepolia') },
};
