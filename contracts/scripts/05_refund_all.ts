// scripts/06_refund_all.ts
import 'dotenv/config';
import { ethers, network } from 'hardhat';

const VAULTS: Record<string, string | undefined> = {
  sepolia:         process.env.VAULT_SEPOLIA,
  arbitrumSepolia: process.env.VAULT_Arbitrum_Sepolia,
  baseSepolia:     process.env.VAULT_Base_Sepolia,
  optimismSepolia: process.env.VAULT_OP_Sepolia,
};

const VAULT_ABI = [
  'function refundAllToPayers(bytes32 billId) external',
  'function grantRole(bytes32 role,address account) external',
  'function hasRole(bytes32 role,address account) view returns (bool)',
];

function billHex() {
  const arg = process.argv.find(a => a.startsWith('--bill='))?.split('=')[1] || process.env.BILL_ID;
  if (!arg) throw new Error('請用 --bill 或 .env 設定 BILL_ID');
  const clean = arg.startsWith('0x') ? arg : '0x' + Buffer.from(arg, 'utf8').toString('hex');
  return '0x' + clean.slice(2).padEnd(64, '0');
}

async function main() {
  const billId = billHex();
  const net = network.name;
  const vaultAddr = VAULTS[net];
  if (!vaultAddr) throw new Error(`該網路 ${net} 沒有在 .env 設定 Vault 位址`);

  const [op] = await ethers.getSigners();
  const vault = new ethers.Contract(vaultAddr, VAULT_ABI, op);

  const OPERATOR_ROLE = ethers.id('OPERATOR_ROLE');
  if (!(await vault.hasRole(OPERATOR_ROLE, op.address))) {
    const tx = await vault.grantRole(OPERATOR_ROLE, op.address);
    await tx.wait();
  }

  const tx = await vault.refundAllToPayers(billId);
  console.log(`refundAllToPayers tx: ${tx.hash}`);
  await tx.wait();
  console.log('✅ 整單退款完成');
}

main().catch((e)=>{ console.error(e); process.exit(1); });
