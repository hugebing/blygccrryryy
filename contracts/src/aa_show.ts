import 'dotenv/config';
import { createPublicClient, http } from 'viem';
import { sepolia, arbitrumSepolia, baseSepolia, optimismSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

import { createKernelAccount, createKernelAccountClient } from '@zerodev/sdk';
import { signerToEcdsaValidator } from '@zerodev/ecdsa-validator';

// ❶ 關鍵：指定 EntryPoint 與 Kernel 版本（建議 EP 0.7 + Kernel v3）
import { getEntryPoint, KERNEL_V3_1 } from '@zerodev/sdk/constants';
// 若你想試新版本可用：KERNEL_V3_3_BETA

async function show(chain: any, zdRpc: string) {
  const owner = privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`);
  const publicClient = createPublicClient({ chain, transport: http() });

  // ❷ 取得 EP 0.7 與 Kernel v3
  const entryPoint = getEntryPoint('0.7');
  const kernelVersion = KERNEL_V3_1;

  // ❸ 建立 ECDSA validator（新版 API 需要 entryPoint / kernelVersion）
  const ecdsaValidator = await signerToEcdsaValidator(publicClient, {
    signer: owner,
    entryPoint,
    kernelVersion,
  });

  // ❹ 建立 Kernel Account（plugins 要放在 sudo）
  const account = await createKernelAccount(publicClient, {
    plugins: { sudo: ecdsaValidator },
    entryPoint,
    kernelVersion,
  });

  // ❺ 建立 Account Client（新版常見參數）
  const client = await createKernelAccountClient({
    account,
    chain,
    bundlerTransport: http(zdRpc),
    client: publicClient,              // 建議顯式帶入
    // paymaster: 可選，如果你有 ZeroDev Paymaster
  });

  console.log(`${chain.name} Kernel:`, client.account.address);
}

// ZD_Sepolia=
// ZD_Arbitrum_Sepolia=
// ZD_Base_Sepolia=
// ZD_OP_Sepolia=

async function main() {
  await show(sepolia, process.env.ZD_RPC_SEPOLIA!);
  await show(arbitrumSepolia, process.env.ZD_Arbitrum_Sepolia!);
  await show(baseSepolia, process.env.ZD_Base_Sepolia!);
  await show(optimismSepolia, process.env.ZD_OP_Sepolia!);
}
main().catch(console.error);
