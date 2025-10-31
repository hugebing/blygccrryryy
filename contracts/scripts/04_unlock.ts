// scripts/04_unlock.ts
import 'dotenv/config';
import { ethers, network } from 'hardhat';
import { toHex } from 'viem';

function billToBytes32(raw: string): `0x${string}` {
  const v = raw.trim();
  if (!v) throw new Error('請以環境變數 BILL_ID 指定 billId，例如：BILL_ID=bill-2025-0001 ...');
  if (/^0x[0-9a-fA-F]{64}$/.test(v)) return v as `0x${string}`;
  return toHex(v, { size: 32 }) as `0x${string}`;  // 與 pay_dualchain_demo.ts 一致
}

function pickVault(): `0x${string}` {
  const map: Record<string, string | undefined> = {
    sepolia:         process.env.VAULT_Sepolia,
    baseSepolia:     process.env.VAULT_Base_Sepolia,
    arbitrumSepolia: process.env.VAULT_Arbitrum_Sepolia,
    optimismSepolia: process.env.VAULT_OP_Sepolia,
  };
  const addr = map[network.name];
  if (!addr || !/^0x[0-9a-fA-F]{40}$/.test(addr)) {
    throw new Error(`.env 沒有為網路 ${network.name} 設定對應 VAULT_* 地址`);
  }
  return addr as `0x${string}`;
}

async function main() {
  const [operator] = await ethers.getSigners();
  const billRaw = process.env.BILL_ID || '';
  const billId  = billToBytes32(billRaw);
  const vault   = pickVault();

  console.log(`Network : ${network.name}`);
  console.log(`Operator: ${operator.address}`);
  console.log(`Vault   : ${vault}`);
  console.log(`billId  : raw="${billRaw}", bytes32=${billId}`);

  // 最小 ABI
  const vaultAbi = [
    'function unlockAndRelease(bytes32 billId) external',
    'function OPERATOR_ROLE() view returns (bytes32)',
    'function hasRole(bytes32 role,address account) view returns (bool)',
  ];

  const c = new ethers.Contract(vault, vaultAbi, operator);

  // 檢查角色（若沒有就先用你的 grant 腳本賦權）
  const role = await c.OPERATOR_ROLE();
  const has  = await c.hasRole(role, operator.address);
  if (!has) {
    throw new Error(`Signer 尚未擁有 OPERATOR_ROLE。請先授權再重試。`);
  }

  const tx = await c.unlockAndRelease(billId);
  console.log('tx sent :', tx.hash);
  await tx.wait();
  console.log('✅ Released 完成');
}

main().catch((e) => { console.error(e); process.exit(1); });
