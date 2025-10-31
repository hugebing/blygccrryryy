// src/operator.ts
import 'dotenv/config';
import {
  createWalletClient,
  createPublicClient,
  http,
  parseAbi,
  keccak256,
  stringToHex,
  isHex,
  toHex,
  type Hex,
  type Chain,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia, polygonAmoy } from 'viem/chains';

const VAULT_ABI = parseAbi([
  'function unlockAndRelease(bytes32 billId) external',
  'function refundAllToPayers(bytes32 billId) external',
  'function grantRole(bytes32 role,address account) external'
]);

// ---- 參數與環境 ----
const OPERATOR_PK = process.env.OWNER_PK as `0x${string}`;
if (!OPERATOR_PK) throw new Error('ENV OWNER_PK missing');

type NetName = 'sepolia' | 'amoy';

function getChainAndVault(net: NetName): { chain: Chain; vault: `0x${string}` } {
  if (net === 'amoy') {
    const v = process.env.VAULT_AMOY as `0x${string}`;
    if (!v) throw new Error('ENV VAULT_AMOY missing');
    return { chain: polygonAmoy, vault: v };
  }
  // default: sepolia
  const v = process.env.VAULT_SEPOLIA as `0x${string}`;
  if (!v) throw new Error('ENV VAULT_SEPOLIA missing');
  return { chain: sepolia, vault: v };
}

// OPERATOR_ROLE = keccak256("OPERATOR_ROLE")
const OPERATOR_ROLE = keccak256(stringToHex('OPERATOR_ROLE')) as Hex;

// 文字 billId → bytes32（若已是 0x… 直接回傳）
function toBillId(input: string): Hex {
  if (isHex(input)) {
    const hex = input as Hex;
    if (hex.length !== 66) throw new Error('billId hex must be 32 bytes (0x + 64 hex chars)');
    return hex;
  }
  // 將文字轉 bytes32（不足補 0）
  return toHex(input, { size: 32 });
}

function makeClients(net: NetName) {
  const { chain, vault } = getChainAndVault(net);
  const operator = privateKeyToAccount(OPERATOR_PK);
  const wallet = createWalletClient({ account: operator, chain, transport: http() });
  const publicClient = createPublicClient({ chain, transport: http() });
  return { wallet, publicClient, operator, vault, chain };
}

// ---- actions ----
export async function grantOperator(addr: `0x${string}`, net: NetName = 'sepolia') {
  const { wallet, publicClient, vault, chain } = makeClients(net);
  const hash = await wallet.writeContract({
    address: vault,
    abi: VAULT_ABI,
    functionName: 'grantRole',
    args: [OPERATOR_ROLE, addr],
  });
  console.log(`[${chain.name}] grantRole txHash:`, hash);
  const rcpt = await publicClient.waitForTransactionReceipt({ hash });
  console.log('  status:', rcpt.status, 'block:', rcpt.blockNumber);
}

export async function unlock(billId: string, net: NetName = 'sepolia') {
  const { wallet, publicClient, vault, chain } = makeClients(net);
  const id = toBillId(billId);
  const hash = await wallet.writeContract({
    address: vault,
    abi: VAULT_ABI,
    functionName: 'unlockAndRelease',
    args: [id],
  });
  console.log(`[${chain.name}] unlockAndRelease txHash:`, hash);
  const rcpt = await publicClient.waitForTransactionReceipt({ hash });
  console.log('  status:', rcpt.status, 'block:', rcpt.blockNumber);
}

export async function refundAll(billId: string, net: NetName = 'sepolia') {
  const { wallet, publicClient, vault, chain } = makeClients(net);
  const id = toBillId(billId);
  const hash = await wallet.writeContract({
    address: vault,
    abi: VAULT_ABI,
    functionName: 'refundAllToPayers',
    args: [id],
  });
  console.log(`[${chain.name}] refundAllToPayers txHash:`, hash);
  const rcpt = await publicClient.waitForTransactionReceipt({ hash });
  console.log('  status:', rcpt.status, 'block:', rcpt.blockNumber);
}

// ---- CLI 用法 ----
// npx ts-node src/operator.ts grant 0xOperatorAddress --net=sepolia
// npx ts-node src/operator.ts unlock bill-2025-0001 --net=amoy
// npx ts-node src/operator.ts refund 0x<billIdBytes32> --net=sepolia
async function main() {
  const args = process.argv.slice(2);
  const cmd = (args[0] || '').toLowerCase();
  const netFlag = args.find(a => a.startsWith('--net=')) || '--net=sepolia';
  const net = (netFlag.split('=')[1] as NetName) ?? 'sepolia';

  if (cmd === 'grant') {
    const addr = args[1] as `0x${string}`;
    if (!addr) throw new Error('usage: grant <operatorAddress> --net=sepolia|amoy');
    await grantOperator(addr, net);
    return;
  }

  if (cmd === 'unlock') {
    const bill = args[1];
    if (!bill) throw new Error('usage: unlock <billId|0x...> --net=sepolia|amoy');
    await unlock(bill, net);
    return;
  }

  if (cmd === 'refund') {
    const bill = args[1];
    if (!bill) throw new Error('usage: refund <billId|0x...> --net=sepolia|amoy');
    await refundAll(bill, net);
    return;
  }

  console.log(`Usage:
  grant  <operatorAddress>        --net=sepolia|amoy
  unlock <billId|0x...bytes32>    --net=sepolia|amoy
  refund <billId|0x...bytes32>    --net=sepolia|amoy
  `);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
