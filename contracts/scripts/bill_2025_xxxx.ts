// src/run_demo.ts
import { runPayDualChain, type PayConfig } from '../src/pay_dualchain_demo';
import { toHex } from 'viem';

// 你原本給的配置（示意）；注意 amount 先換算為 raw（例如 toRaw(100,6)）
const cfg: PayConfig = {
  billId: 'bill-2025-2012',
  payee: process.env.PAYEE as `0x${string}`,
  perChain: [
    {
      chain: 'sepolia',
      vault: process.env.VAULT_Sepolia as `0x${string}`,
      items: [
        { ercCode: 20, token: process.env.USDT_Sepolia as `0x${string}`, id: 0n, amount: 100n * 10n ** 6n },
      ],
    },
    {
      chain: 'arbitrumSepolia',
      vault: process.env.VAULT_Arbitrum_Sepolia as `0x${string}`,
      items: [
        { ercCode: 20, token: process.env.USDT_Arbitrum_Sepolia as `0x${string}`, id: 0n, amount: 200n * 10n ** 6n },
      ],
    },
    {
      chain: 'optimismSepolia',
      vault: process.env.VAULT_OP_Sepolia as `0x${string}`,
      items: [
        { ercCode: 20, token: process.env.USDT_Base_Sepolia as `0x${string}`, id: 0n, amount: 300n * 10n ** 6n },
        { ercCode: 23, token: process.env.NFT15_OP_Sepolia as `0x${string}`, id: 12n, amount: 100n },
      ],
    },
    {
      chain: 'baseSepolia',
      vault: process.env.VAULT_Base_Sepolia as `0x${string}`,
      items: [
        { ercCode: 20, token: process.env.USDT_Base_Sepolia as `0x${string}`, id: 0n, amount: 300n * 10n ** 6n },
        { ercCode: 21, token: process.env.NFT21_Base_Sepolia as `0x${string}`, id: 12n, amount: 1n },
      ],
    },
  ],
};


runPayDualChain(cfg)
  .then((res) => {
    console.log('Result:', res);
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
