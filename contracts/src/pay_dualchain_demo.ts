// src/pay_dualchain_demo.ts
import 'dotenv/config';
import {
  Hex,
  Abi,
  encodeFunctionData,
  toHex,
  toBytes,
  hashMessage,
  concatHex,
} from 'viem';
import { makeKernel, CHAINS } from './aa';
import * as Merkle from './merkle';

/* ---------- CLI / ENV 參數 ---------- */
function getCliArg(key: string): string | undefined {
  const flag = `--${key}`;
  for (let i = 2; i < process.argv.length; i++) {
    const a = process.argv[i];
    if (a === flag) return process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : 'true';
    if (a.startsWith(`${flag}=`)) return a.slice(flag.length + 1);
  }
  return undefined;
}
function getBigIntParam(envName: string, cliName: string, def: bigint): bigint {
  const raw = (getCliArg(cliName) ?? process.env[envName])?.toString().trim();
  if (!raw) return def;
  if (!/^\d+$/.test(raw)) throw new Error(`${envName}/--${cliName} 應為十進位整數（例：100）`);
  return BigInt(raw);
}
function getIntParam(envName: string, cliName: string, def: number): number {
  const raw = (getCliArg(cliName) ?? process.env[envName])?.toString().trim();
  if (!raw) return def;
  if (!/^\d+$/.test(raw)) throw new Error(`${envName}/--${cliName} 應為整數`);
  return Number(raw);
}
function addr(name: string): `0x${string}` {
  const v = (process.env[name] || '').trim();
  if (!/^0x[0-9a-fA-F]{40}$/.test(v)) throw new Error(`${name} 缺失或不是合法地址`);
  return v as `0x${string}`;
}
function need(name: string): string {
  const v = (process.env[name] || '').trim();
  if (!v) throw new Error(`${name} 必填`);
  return v;
}

/* ---------- 固定參數（ENV） ---------- */
const VAULT_SEPOLIA      = addr('VAULT_SEPOLIA');
const VAULT_BASE_SEPOLIA = addr('VAULT_Base_Sepolia');
const NFT21_SEPOLIA      = addr('NFT21_Sepolia');
const USDT_BASE_SEPOLIA  = addr('USDT_Base_Sepolia');
const PAYEE              = addr('PAYEE');
const BILL_ID_HEX: Hex   = toHex(need('BILL_ID'), { size: 32 });

/* ---------- 動態參數（ENV / CLI） ---------- */
const NFT21_ID      = getBigIntParam('NFT21_ID', 'nftId', 1n);
const USDT_WHOLE    = getBigIntParam('USDT_WHOLE', 'usdt', 100n);
const USDT_DECIMALS = getIntParam('USDT_DECIMALS', 'decimals', 6);
const USDT_AMOUNT   = USDT_WHOLE * (10n ** BigInt(USDT_DECIMALS));
console.log(`參數 => NFT21_ID=${NFT21_ID}，USDT=${USDT_WHOLE}（decimals=${USDT_DECIMALS}，raw=${USDT_AMOUNT}）`);

/* ---------- ABIs（物件型） ---------- */
export const ERC20_ABI: Abi = [{
  type: 'function',
  name: 'approve',
  stateMutability: 'nonpayable',
  inputs: [{ name: 'spender', type: 'address' }, { name: 'value', type: 'uint256' }],
  outputs: [{ name: '', type: 'bool' }],
}];
export const ERC721_ABI: Abi = [{
  type: 'function',
  name: 'approve',
  stateMutability: 'nonpayable',
  inputs: [{ name: 'to', type: 'address' }, { name: 'tokenId', type: 'uint256' }],
  outputs: [],
}];
export const VAULT_ABI: Abi = [{
  type: 'function',
  name: 'depositByRootProof',
  stateMutability: 'nonpayable',
  inputs: [
    { name: 'billId', type: 'bytes32'  },
    { name: 'payer',  type: 'address'  },
    { name: 'payee',  type: 'address'  },
    { name: 'root',   type: 'bytes32'  },
    { name: 'proof',  type: 'bytes32[]'},
    {
      name: 'items', type: 'tuple[]',
      components: [
        { name: 'ercCode', type: 'uint8'   },
        { name: 'token',   type: 'address' },
        { name: 'id',      type: 'uint256' },
        { name: 'amount',  type: 'uint256' },
      ],
    },
    { name: 'sig',    type: 'bytes'   },
  ],
  outputs: [],
}];
/** ERC-1271 isValidSignature(bytes32,bytes) */
const ERC1271_ABI: Abi = [{
  type: 'function',
  name: 'isValidSignature',
  stateMutability: 'view',
  inputs: [
    { name: 'hash',      type: 'bytes32' },
    { name: 'signature', type: 'bytes'   },
  ],
  outputs: [{ name: 'magic', type: 'bytes4' }],
}];
const ERC1271_MAGIC = '0x1626ba7e' as Hex;

const MAX = (1n << 256n) - 1n;

/* ---------- 簽章封套：偵測＋包裝 ---------- */
/** 從 sampleSig（用當鏈 Kernel 簽的）推導封套格式，回傳一組「如何用 ownerSig 包裝」的候選 */
function deriveWrappersFromSample(sampleSig: Hex, ownerSig: Hex): Hex[] {
  const bytes = toBytes(sampleSig);
  const mode = bytes[0]; // 第一個 byte 是 mode 的常見情況
  // 常見 ECDSA 模式：0x00 | 65-byte sig | [20-byte validator?]
  if (mode === 0x00) {
    if (bytes.length === 1 + 65) {
      return [concatHex(['0x00', ownerSig])];
    }
    if (bytes.length === 1 + 65 + 20) {
      const validator = ('0x' + Buffer.from(bytes.slice(1 + 65)).toString('hex')) as Hex;
      return [concatHex(['0x00', ownerSig, validator])];
    }
  }
  // 其他模式（0x01/0x02/…）這裡先不硬猜，回空陣列讓外層 fallback
  return [];
}

/** 嘗試用「只簽一次的 ownerSig」在指定鏈得到可過 1271 的封套；不成就回退該鏈自簽 */
async function getSigForChain(
  k: Awaited<ReturnType<typeof makeKernel>>,
  root: Hex,
  ownerSig: Hex
): Promise<Hex> {
  const kernel = k.account.address;
  const code = await k.publicClient.getBytecode({ address: kernel });

  // 建立通用的 191 digest（多數 1271/Validator 會用到）
  const digest191 = hashMessage({ raw: toBytes(root) });

  // 若帳戶尚未部署，直接嘗試「常見封套」；不過失敗機率高，故仍準備 fallback
  const commonCandidates: Hex[] = [ownerSig, concatHex(['0x00', ownerSig])];

  if (!code || code === '0x') {
    // counterfactual：無法讀取 sample 格式；先直接嘗試常見封套，失敗再 fallback
    for (const c of commonCandidates) {
      try {
        const magic = await k.publicClient.readContract({
          address: kernel,
          abi: ERC1271_ABI,
          functionName: 'isValidSignature',
          args: [digest191, c],
        }) as Hex;
        if (magic?.toLowerCase() === ERC1271_MAGIC.toLowerCase()) {
          console.log(`[封套] ${k.client.chain.name} 未部署但提前驗過一個常見封套可用`);
          return c;
        }
      } catch {}
    }
    // fallback：直接用該鏈 account 自簽（一定過）
    const chainSig = await k.client.account.signMessage({ message: { raw: toBytes(root) }}) as Hex;
    console.log(`[封套] ${k.client.chain.name} counterfactual，fallback 使用該鏈自簽`);
    return chainSig;
  }

  // 有部署：先用該鏈的 Kernel 來「取樣一份」簽章，推導封套，再用 ownerSig 代入
  try {
    const sample = await k.client.account.signMessage({ message: { raw: toBytes(root) }}) as Hex;
    const wrappedCandidates = deriveWrappersFromSample(sample, ownerSig);

    // 先試「推導封套」
    for (const c of wrappedCandidates) {
      try {
        const magic = await k.publicClient.readContract({
          address: kernel,
          abi: ERC1271_ABI,
          functionName: 'isValidSignature',
          args: [digest191, c],
        }) as Hex;
        if (magic?.toLowerCase() === ERC1271_MAGIC.toLowerCase()) {
          console.log(`[封套] ${k.client.chain.name} 使用推導封套成功`);
          return c;
        }
      } catch {}
    }

    // 再試「常見封套」
    for (const c of commonCandidates) {
      try {
        const magic = await k.publicClient.readContract({
          address: kernel,
          abi: ERC1271_ABI,
          functionName: 'isValidSignature',
          args: [digest191, c],
        }) as Hex;
        if (magic?.toLowerCase() === ERC1271_MAGIC.toLowerCase()) {
          console.log(`[封套] ${k.client.chain.name} 使用通用封套成功`);
          return c;
        }
      } catch {}
    }

    // 全部不行 → 最後保底：直接用該鏈自簽
    const chainSig = await k.client.account.signMessage({ message: { raw: toBytes(root) }}) as Hex;
    console.log(`[封套] ${k.client.chain.name} 推導失敗，fallback 使用該鏈自簽`);
    return chainSig;
  } catch {
    // 取樣失敗（理論上不會）→ 保底
    const chainSig = await k.client.account.signMessage({ message: { raw: toBytes(root) }}) as Hex;
    console.log(`[封套] ${k.client.chain.name} 取樣失敗，fallback 使用該鏈自簽`);
    return chainSig;
  }
}

/* ---------- 主流程 ---------- */
async function main() {
  // 1) 兩條鏈 Kernel
  const [A, B] = await Promise.all([
    makeKernel(CHAINS.sepolia),
    makeKernel(CHAINS.baseSepolia),
  ]);

  // 2) 各鏈扣款明細
  const itemsSepolia = Merkle.sortItems([
    { ercCode: 21, token: NFT21_SEPOLIA,     id: NFT21_ID, amount: 1n },
  ]);
  const itemsBase = Merkle.sortItems([
    { ercCode: 20, token: USDT_BASE_SEPOLIA, id: 0n,       amount: USDT_AMOUNT },
  ]);

  // 3) Merkle root + proofs
  const leafSepolia = Merkle.chainLeafHash(
    BigInt(A.client.chain.id), VAULT_SEPOLIA,      BILL_ID_HEX, Merkle.hashItemsStrict(itemsSepolia)
  );
  const leafBase    = Merkle.chainLeafHash(
    BigInt(B.client.chain.id), VAULT_BASE_SEPOLIA, BILL_ID_HEX, Merkle.hashItemsStrict(itemsBase)
  );
  const leaves = [leafSepolia, leafBase];
  const { root } = Merkle.buildRoot(leaves);
  const proofSepolia = Merkle.getProof(leaves, 0);
  const proofBase    = Merkle.getProof(leaves, 1);
  console.log('Root =', root);

  // 4) ✅ 只簽一次：用 OWNER_PK 對 root 做 EIP-191 簽章
  const ownerSig = await A.owner.signMessage({ message: { raw: toBytes(root) }}) as Hex;

  // 5) 針對每鏈，找出能通過 1271 的簽章（先試「單簽封套」，失敗才 fallback 該鏈自簽）
  const [sigSepolia, sigBase] = await Promise.all([
    getSigForChain(A, root, ownerSig),
    getSigForChain(B, root, ownerSig),
  ]);

  // 6) calls：先 approve，再 depositByRootProof
  const callsSepolia: { to:`0x${string}`, data:Hex, value?:bigint }[] = [
    {
      to: NFT21_SEPOLIA,
      data: encodeFunctionData({
        abi: ERC721_ABI,
        functionName: 'approve',
        args: [VAULT_SEPOLIA, NFT21_ID],
      }),
    },
    {
      to: VAULT_SEPOLIA,
      data: encodeFunctionData({
        abi: VAULT_ABI,
        functionName: 'depositByRootProof',
        args: [
          BILL_ID_HEX,
          A.account.address,   // payer = 本鏈 Kernel
          PAYEE,
          root,
          proofSepolia,
          itemsSepolia,
          sigSepolia,          // ← 已針對 Sepolia 相容的簽章
        ],
      }),
    },
  ];
  const callsBase: { to:`0x${string}`, data:Hex, value?:bigint }[] = [
    {
      to: USDT_BASE_SEPOLIA,
      data: encodeFunctionData({
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [VAULT_BASE_SEPOLIA, MAX],
      }),
    },
    {
      to: VAULT_BASE_SEPOLIA,
      data: encodeFunctionData({
        abi: VAULT_ABI,
        functionName: 'depositByRootProof',
        args: [
          BILL_ID_HEX,
          B.account.address,   // payer = 本鏈 Kernel
          PAYEE,
          root,
          proofBase,
          itemsBase,
          sigBase,             // ← 已針對 Base 相容的簽章
        ],
      }),
    },
  ];

  // 7) 送出兩鏈 userOp
  const [uopA, uopB] = await Promise.all([
    A.client.sendUserOperation({ calls: callsSepolia }),
    B.client.sendUserOperation({ calls: callsBase }),
  ]);
  console.log('userOp sepolia =', uopA);
  console.log('userOp base    =', uopB);

  const [rcptA, rcptB] = await Promise.all([
    A.client.waitForUserOperationReceipt({ hash: uopA }),
    B.client.waitForUserOperationReceipt({ hash: uopB }),
  ]);
  console.log('tx sepolia =', rcptA.receipt.transactionHash);
  console.log('tx base    =', rcptB.receipt.transactionHash);

  console.log(`✅ 兩鏈支付完成（Sepolia: ERC721#${NFT21_ID}、Base: USDT ${USDT_WHOLE}）`);
}

main().catch((e) => { console.error(e); process.exit(1); });
