// src/deposit-multichain.ts
import 'dotenv/config';
import { Hex, encodeFunctionData, parseAbi, toBytes, toHex } from 'viem';
import { CHAINS, makeKernel } from './aa';
import { Item, hashItemsStrict, chainLeafHash, buildRoot, getProof, sortItems } from './merkle';
import { VAULT_ABI } from '../abi/OmniVaultRootPay'; // ← 不再用 JSON

// === 使用者填 ===
const BILL_ID: Hex = toHex('bill-2025-0001', { size: 32 });
const PAYEE = process.env.PAYEE as `0x${string}`; // 建議放到 .env

// Sepolia 測試資產
const ITEMS_SEPOLIA: Item[] = sortItems([
  { ercCode: 20, token: process.env.USDT_SEPOLIA as `0x${string}`, id: 0n,  amount: 500n },
  // { ercCode: 21, token: process.env.NFT_SEPOLIA  as `0x${string}`, id: 77n, amount: 1n },
]);

// Amoy 測試資產
const ITEMS_AMOY: Item[] = sortItems([
  { ercCode: 20, token: process.env.USDT_AMOY as `0x${string}`, id: 0n, amount: 1500n },
]);

const VAULTS = {
  sepolia: process.env.VAULT_SEPOLIA as `0x${string}`,
  amoy:    process.env.VAULT_AMOY as `0x${string}`,
};

async function main() {
  // 1) 建兩條鏈的 Kernel
  const [A, B] = await Promise.all([ makeKernel(CHAINS.sepolia), makeKernel(CHAINS.amoy) ]);
  const payerOnA = A.account.address;
  const payerOnB = B.account.address;

  // 2) 構建每鏈 leaf
  const leafA = chainLeafHash(BigInt(A.client.chain.id), VAULTS.sepolia, BILL_ID, hashItemsStrict(ITEMS_SEPOLIA));
  const leafB = chainLeafHash(BigInt(B.client.chain.id), VAULTS.amoy,    BILL_ID, hashItemsStrict(ITEMS_AMOY));

  // 3) Merkle root
  const leaves = [leafA, leafB];
  const { root } = buildRoot(leaves);
  console.log('root =', root);

  // 4) 簽 root（各鏈各簽；要「一簽多鏈」可換 multi-chain validator）
  const sigA = await A.client.account.signMessage({ message: { raw: toBytes(root) }});
  const sigB = await B.client.account.signMessage({ message: { raw: toBytes(root) }});

  // 5) 取各鏈 proof
  const proofA = getProof(leaves, 0);
  const proofB = getProof(leaves, 1);

  // 6) approve calls
  const MAX = (1n << 256n) - 1n;
  const approveAbi = parseAbi([ 'function approve(address spender,uint256 value) external returns (bool)' ]);
  const setAllAbi   = parseAbi([ 'function setApprovalForAll(address operator,bool approved) external' ]);

  const callsA: { to:`0x${string}`, data:Hex, value?:bigint }[] = [];
  for (const it of ITEMS_SEPOLIA) {
    if (it.ercCode === 20 || it.ercCode === 43) {
      callsA.push({ to: it.token, data: encodeFunctionData({ abi: approveAbi, functionName: 'approve', args: [VAULTS.sepolia, MAX] }) });
    } else if (it.ercCode === 21 || it.ercCode === 23) {
      callsA.push({ to: it.token, data: encodeFunctionData({ abi: setAllAbi, functionName: 'setApprovalForAll', args: [VAULTS.sepolia, true] }) });
    }
  }

  const callsB: { to:`0x${string}`, data:Hex, value?:bigint }[] = [];
  for (const it of ITEMS_AMOY) {
    if (it.ercCode === 20 || it.ercCode === 43) {
      callsB.push({ to: it.token, data: encodeFunctionData({ abi: approveAbi, functionName: 'approve', args: [VAULTS.amoy, MAX] }) });
    } else if (it.ercCode === 21 || it.ercCode === 23) {
      callsB.push({ to: it.token, data: encodeFunctionData({ abi: setAllAbi, functionName: 'setApprovalForAll', args: [VAULTS.amoy, true] }) });
    }
  }

  // 7) depositByRootProof
  const dataDepositA = encodeFunctionData({
    abi: VAULT_ABI,
    functionName: 'depositByRootProof',
    args: [BILL_ID, payerOnA, PAYEE, root, proofA, ITEMS_SEPOLIA, sigA as Hex]
  });
  callsA.push({ to: VAULTS.sepolia, data: dataDepositA });

  const dataDepositB = encodeFunctionData({
    abi: VAULT_ABI,
    functionName: 'depositByRootProof',
    args: [BILL_ID, payerOnB, PAYEE, root, proofB, ITEMS_AMOY, sigB as Hex]
  });
  callsB.push({ to: VAULTS.amoy, data: dataDepositB });

  // 8) 送 userOp（新版：等 receipt 用 waitForUserOperationReceipt）
  const [uoHashA, uoHashB] = await Promise.all([
    A.client.sendUserOperation({ calls: callsA }),
    B.client.sendUserOperation({ calls: callsB }),
  ]);

  console.log('uoHash A =', uoHashA, 'uoHash B =', uoHashB);

  const [rcptA, rcptB] = await Promise.all([
    A.client.waitForUserOperationReceipt({ hash: uoHashA }),
    B.client.waitForUserOperationReceipt({ hash: uoHashB }),
  ]);

  // 兼容不同 SDK 回傳形狀（有的在 rcpt.receipt.transactionHash，有的直接 rcpt.transactionHash）
  const txHashA = (rcptA as any)?.receipt?.transactionHash ?? (rcptA as any)?.transactionHash;
  const txHashB = (rcptB as any)?.receipt?.transactionHash ?? (rcptB as any)?.transactionHash;

  console.log('tx A =', txHashA);
  console.log('tx B =', txHashB);
}

main().catch(console.error);
