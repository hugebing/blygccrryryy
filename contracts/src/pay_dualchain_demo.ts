// src/pay_dualchain_demo.ts
// 多鏈支付執行器（可 import，也可 CLI 執行）
// - 一次 owner 簽章（EIP-191 root）
// - 先部署 Kernel（避免 6492）→ 各鏈 ERC1271 封套 / 失敗回退自簽
// - 自動針對 ERC20/721/1155 產生 approve（721/1155 改 setApprovalForAll），再呼叫 Vault.depositByRootProof
// - 允許外部 items 帶入其他 ercCode（例如 43）；預設 strict=true 會丟錯，strict=false 會忽略

import 'dotenv/config';
import {
  Abi,
  Hex,
  Address,
  encodeFunctionData,
  toBytes,
  toHex,
  concatHex,
  hashMessage,
} from 'viem';
import { makeKernel, CHAINS } from './aa';
import * as Merkle from './merkle';
import { pathToFileURL } from 'node:url';

/* ========================================
 * Public types / exports
 * ====================================== */
export type BaseItem = {
  ercCode: number;   // 放寬，便於對接你的 Item（可能含 43）
  token: Address;
  id: bigint;
  amount: bigint;
};
export type KnownErcCode = 20 | 21 | 23;         // 目前支援
export type PayItem = BaseItem & { ercCode: KnownErcCode };

export type PerChainConfig<T extends BaseItem = PayItem> = {
  chain: keyof typeof CHAINS;                     // 'sepolia' | 'arbitrumSepolia' | ...
  vault: Address;
  items: T[];
};

export type PayConfig<T extends BaseItem = PayItem> = {
  billId: string | Hex;                           // 字串→bytes32；或 0x + 64
  payee: Address;
  perChain: PerChainConfig<T>[];
  strict?: boolean;                               // 預設 true：遇到非 20/21/23 直接丟錯；false：忽略
};

export type RunResult = {
  root: Hex;
  billId: Hex;
  perChain: Array<{
    chain: string;
    chainId: bigint;
    userOpHash: Hex;
    txHash: Hex;
  }>;
};

/* ========================================
 * ABIs
 * ====================================== */
export const ERC20_ABI: Abi = [
  { type: 'function', name: 'approve', stateMutability: 'nonpayable',
    inputs: [{ name: 'spender', type: 'address' }, { name: 'value', type: 'uint256' }],
    outputs: [{ name: '', type: 'bool' }],
  },
];
const ERC20_VIEW_ABI: Abi = [
  { type: 'function', name: 'balanceOf', stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
];

export const ERC721_ABI: Abi = [
  { type: 'function', name: 'setApprovalForAll', stateMutability: 'nonpayable',
    inputs: [{ name: 'operator', type: 'address' }, { name: 'approved', type: 'bool' }],
    outputs: [] },
];
const ERC721_VIEW_ABI: Abi = [
  { type: 'function', name: 'ownerOf', stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }], outputs: [{ name: 'owner', type: 'address' }] },
];

export const ERC1155_ABI: Abi = [
  { type: 'function', name: 'setApprovalForAll', stateMutability: 'nonpayable',
    inputs: [{ name: 'operator', type: 'address' }, { name: 'approved', type: 'bool' }],
    outputs: [] },
];
const ERC1155_VIEW_ABI: Abi = [
  { type: 'function', name: 'balanceOf', stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }, { name: 'id', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }] },
];

export const VAULT_ABI: Abi = [
  {
    type: 'function',
    name: 'depositByRootProof',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'billId', type: 'bytes32' },
      { name: 'payer', type: 'address' },
      { name: 'payee', type: 'address' },
      { name: 'root', type: 'bytes32' },
      { name: 'proof', type: 'bytes32[]' },
      {
        name: 'items',
        type: 'tuple[]',
        components: [
          { name: 'ercCode', type: 'uint8' },
          { name: 'token', type: 'address' },
          { name: 'id', type: 'uint256' },
          { name: 'amount', type: 'uint256' },
        ],
      },
      { name: 'sig', type: 'bytes' },
    ],
    outputs: [],
  },
];

/** ERC-1271 isValidSignature(bytes32,bytes) */
const ERC1271_ABI: Abi = [
  { type: 'function', name: 'isValidSignature', stateMutability: 'view',
    inputs: [{ name: 'hash', type: 'bytes32' }, { name: 'signature', type: 'bytes' }],
    outputs: [{ name: 'magic', type: 'bytes4' }] },
];
const ERC1271_MAGIC = '0x1626ba7e' as Hex;

const MAX = (1n << 256n) - 1n;
const ZERO: Address = '0x0000000000000000000000000000000000000000';

/* ========================================
 * Helpers
 * ====================================== */

// --- 保型包裝，避免被全域 Item 型別（含 43）污染 ---
function sortPayItems(items: PayItem[]): PayItem[] {
  return Merkle.sortItems(items) as PayItem[];
}
function hashPayItems(items: PayItem[]): Hex {
  return Merkle.hashItemsStrict(items) as Hex;
}

/** 轉 bytes32（字串會做 32-byte padding；0x64 hex 直接回傳） */
function toBytes32(input: string | Hex): Hex {
  if (typeof input === 'string') {
    if (/^0x[0-9a-fA-F]{64}$/.test(input)) return input as Hex;
    return toHex(input, { size: 32 });
  }
  return toHex(input, { size: 32 });
}

/** 先確保 Kernel 已部署（避免 6492 包裝簽章） */
async function ensureDeployed(
  k: Awaited<ReturnType<typeof makeKernel>>,
  pingTo: Address = ZERO
) {
  const code = await k.publicClient.getBytecode({ address: k.account.address });
  if (code && code !== '0x') return; // 已部署
  console.log(`[部署] ${k.client.chain.name} Kernel 未部署，送出空呼叫以觸發部署`);
  const uo = await k.client.sendUserOperation({
    calls: [{ to: pingTo, data: '0x' as Hex, value: 0n }],
  });
  await k.client.waitForUserOperationReceipt({ hash: uo });
  console.log(`[部署] ${k.client.chain.name} Kernel 已部署完成`);
}

/** 從 sampleSig（用當鏈 Kernel 簽的）推導封套格式 */
function deriveWrappersFromSample(sampleSig: Hex, ownerSig: Hex): Hex[] {
  const bytes = toBytes(sampleSig);
  const mode = bytes[0];
  if (mode === 0x00) {
    if (bytes.length === 1 + 65) return [concatHex(['0x00', ownerSig])];
    if (bytes.length === 1 + 65 + 20) {
      const validator = (`0x${Buffer.from(bytes.slice(1 + 65)).toString('hex')}`) as Hex;
      return [concatHex(['0x00', ownerSig, validator])];
    }
  }
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
  const digest191 = hashMessage({ raw: toBytes(root) });
  const candidates: Hex[] = [ownerSig, concatHex(['0x00', ownerSig])];

  if (!code || code === '0x') {
    // 理論上已先 ensureDeployed，但仍保底
    for (const c of candidates) {
      try {
        const magic = (await k.publicClient.readContract({
          address: kernel, abi: ERC1271_ABI, functionName: 'isValidSignature',
          args: [digest191, c],
        })) as Hex;
        if (magic?.toLowerCase() === ERC1271_MAGIC.toLowerCase()) return c;
      } catch {}
    }
    const chainSig = (await k.client.account.signMessage({ message: { raw: toBytes(root) } })) as Hex;
    return chainSig;
  }

  try {
    const sample = (await k.client.account.signMessage({ message: { raw: toBytes(root) } })) as Hex;
    for (const c of deriveWrappersFromSample(sample, ownerSig)) {
      try {
        const magic = (await k.publicClient.readContract({
          address: kernel, abi: ERC1271_ABI, functionName: 'isValidSignature',
          args: [digest191, c],
        })) as Hex;
        if (magic?.toLowerCase() === ERC1271_MAGIC.toLowerCase()) return c;
      } catch {}
    }
    for (const c of candidates) {
      try {
        const magic = (await k.publicClient.readContract({
          address: kernel, abi: ERC1271_ABI, functionName: 'isValidSignature',
          args: [digest191, c],
        })) as Hex;
        if (magic?.toLowerCase() === ERC1271_MAGIC.toLowerCase()) return c;
      } catch {}
    }
    const chainSig = (await k.client.account.signMessage({ message: { raw: toBytes(root) } })) as Hex;
    return chainSig;
  } catch {
    const chainSig = (await k.client.account.signMessage({ message: { raw: toBytes(root) } })) as Hex;
    return chainSig;
  }
}

/** 上鏈前資產預檢（避免 721/1155 在 approve/轉移時 Revert） */
async function precheckHoldings(
  k: Awaited<ReturnType<typeof makeKernel>>,
  items: PayItem[]
) {
  const who = k.account.address.toLowerCase();

  // 721：檢查 ownerOf(id)
  const checks721 = items
    .filter(x => x.ercCode === 21)
    .map(async x => {
      try {
        const owner = (await k.publicClient.readContract({
          address: x.token,
          abi: ERC721_VIEW_ABI,
          functionName: 'ownerOf',
          args: [x.id],
        })) as Address;
        if (owner.toLowerCase() !== who) {
          throw new Error(`ERC721 不在錢包：token=${x.token} id=${x.id} owner=${owner}`);
        }
      } catch (e) {
        throw new Error(`ERC721 owner 檢查失敗/不符：token=${x.token} id=${x.id} (${(e as Error).message})`);
      }
    });

  // 1155：檢查 balanceOf(account,id) >= amount
  const checks1155 = items
    .filter(x => x.ercCode === 23)
    .map(async x => {
      try {
        const bal = (await k.publicClient.readContract({
          address: x.token,
          abi: ERC1155_VIEW_ABI,
          functionName: 'balanceOf',
          args: [k.account.address, x.id],
        })) as bigint;
        if (bal < x.amount) {
          throw new Error(`ERC1155 餘額不足：token=${x.token} id=${x.id} 需=${x.amount} 有=${bal}`);
        }
      } catch (e) {
        throw new Error(`ERC1155 balance 檢查失敗：token=${x.token} id=${x.id} (${(e as Error).message})`);
      }
    });

  // 20（可選）：只提示
  const checks20 = items
    .filter(x => x.ercCode === 20)
    .map(async x => {
      try {
        const bal = (await k.publicClient.readContract({
          address: x.token,
          abi: ERC20_VIEW_ABI,
          functionName: 'balanceOf',
          args: [k.account.address],
        })) as bigint;
        if (bal < x.amount) {
          console.warn(`[提醒] ERC20 餘額可能不足：token=${x.token} 需=${x.amount} 有=${bal}`);
        }
      } catch {}
    });

  await Promise.all([...checks721, ...checks1155, ...checks20]);
}

/** 依 ercCode 產生 approvals（去重）；721/1155 一律 setApprovalForAll */
function buildApprovals(vault: Address, items: PayItem[]) {
  const calls: { to: Address; data: Hex }[] = [];
  const seen20 = new Set<string>();
  const seen721 = new Set<string>();
  const seen1155 = new Set<string>();

  for (const it of items) {
    if (it.ercCode === 20) {
      const k = `20:${it.token}`;
      if (!seen20.has(k)) {
        seen20.add(k);
        calls.push({
          to: it.token,
          data: encodeFunctionData({
            abi: ERC20_ABI,
            functionName: 'approve',
            args: [vault, MAX],
          }),
        });
      }
    } else if (it.ercCode === 21) {
      const k = `21:${it.token}`;
      if (!seen721.has(k)) {
        seen721.add(k);
        calls.push({
          to: it.token,
          data: encodeFunctionData({
            abi: ERC721_ABI,
            functionName: 'setApprovalForAll',
            args: [vault, true],
          }),
        });
      }
    } else if (it.ercCode === 23) {
      const k = `23:${it.token}`;
      if (!seen1155.has(k)) {
        seen1155.add(k);
        calls.push({
          to: it.token,
          data: encodeFunctionData({
            abi: ERC1155_ABI,
            functionName: 'setApprovalForAll',
            args: [vault, true],
          }),
        });
      }
    } else {
      throw new Error(`不支援的 ercCode: ${it.ercCode}`);
    }
  }
  return calls;
}

/** 將外部 items（可能含 43 等）窄化為目前支援的 20/21/23；strict=true 會丟錯，不然忽略 */
function narrowSupportedItems(items: BaseItem[], strict: boolean): PayItem[] {
  const supported = items.filter(
    (it) => it.ercCode === 20 || it.ercCode === 21 || it.ercCode === 23
  ) as PayItem[];

  if (strict) {
    const unsupported = items.filter(
      (it) => it.ercCode !== 20 && it.ercCode !== 21 && it.ercCode !== 23
    );
    if (unsupported.length) {
      const codes = [...new Set(unsupported.map((x) => x.ercCode))].join(', ');
      throw new Error(`含不支援的 ercCode: ${codes}（目前僅支援 20/21/23）`);
    }
  }
  return supported;
}

/* ========================================
 * Main export（for import）
 * ====================================== */
export async function runPayDualChain<T extends BaseItem>(
  cfg: PayConfig<T>
): Promise<RunResult> {
  if (!cfg?.perChain?.length) throw new Error('perChain 不可為空');

  const strict = cfg.strict ?? true;
  const billIdHex = toBytes32(cfg.billId);

  // 1) 準備 kernels
  const kernels = await Promise.all(
    cfg.perChain.map(async (pc) => {
      const chainMeta = CHAINS[pc.chain];
      if (!chainMeta) throw new Error(`未知 chain: ${String(pc.chain)}`);
      const k = await makeKernel(chainMeta);
      return { ...pc, k };
    })
  );

  // 2) 窄化 items → 僅 20/21/23；strict 決定是否丟錯
  const supportedPerChain: PayItem[][] = kernels.map(({ items }) =>
    narrowSupportedItems(items as BaseItem[], strict)
  );

  // 3) canonical sort（與 Merkle 算法一致）
  const canonical: PayItem[][] = supportedPerChain.map((it) => sortPayItems(it));

  // 4) Merkle leaves/root/proofs
  const leaves = await Promise.all(
    kernels.map(async ({ k, vault }, idx) => {
      const chainId = BigInt(k.client.chain.id);
      const itemsHash = hashPayItems(canonical[idx]);
      return Merkle.chainLeafHash(chainId, vault, billIdHex, itemsHash);
    })
  );
  const { root } = Merkle.buildRoot(leaves);
  const proofs = leaves.map((_, i) => Merkle.getProof(leaves, i));

  console.log('Root =', root);

  // 5) 先把所有鏈的 Kernel 部署起來（避免 6492 → BAD_SIG）
  await Promise.all(kernels.map(({ k }) => ensureDeployed(k)));

  // 6) 只簽一次 owner 簽章（用第一個 kernel 的 owner）
  const ownerSig = (await kernels[0].k.owner.signMessage({
    message: { raw: toBytes(root) },
  })) as Hex;

  // 7) 為每鏈得到可過 1271 的簽章（封套 / 回退自簽）
  const perChainSig = await Promise.all(
    kernels.map(({ k }) => getSigForChain(k, root, ownerSig))
  );

  // 8) 每鏈上鏈前資產預檢（特別是 721/1155）
  await Promise.all(
    kernels.map(({ k }, i) => precheckHoldings(k, canonical[i]))
  );

  // 9) 為每鏈組 calls（approvals + depositByRootProof）
  const perChainCalls = kernels.map(({ vault, k }, i) => {
    const approvals = buildApprovals(vault, canonical[i]);
    const depositCall = {
      to: vault,
      data: encodeFunctionData({
        abi: VAULT_ABI,
        functionName: 'depositByRootProof',
        args: [
          billIdHex,
          k.account.address, // payer = 本鏈 Kernel
          cfg.payee,
          root,
          proofs[i],
          canonical[i],
          perChainSig[i],
        ],
      }),
    };
    return [...approvals, depositCall] as { to: Address; data: Hex; value?: bigint }[];
  });

  // 10) 送出各鏈 userOp，並等待完成
  const userOps = await Promise.all(
    kernels.map(({ k }, i) => k.client.sendUserOperation({ calls: perChainCalls[i] }))
  );
  userOps.forEach((h, i) => {
    console.log(`userOp ${kernels[i].k.client.chain.name} =`, h);
  });

  const receipts = await Promise.all(
    kernels.map(({ k }, i) => k.client.waitForUserOperationReceipt({ hash: userOps[i] }))
  );
  receipts.forEach((rcpt, i) => {
    console.log(`tx ${kernels[i].k.client.chain.name} =`, rcpt.receipt.transactionHash);
  });

  console.log('✅ 多鏈支付完成');

  return {
    root,
    billId: billIdHex,
    perChain: kernels.map(({ k }, i) => ({
      chain: k.client.chain.name,
      chainId: BigInt(k.client.chain.id),
      userOpHash: userOps[i] as Hex,
      txHash: receipts[i].receipt.transactionHash as Hex,
    })),
  };
}

export default runPayDualChain;

/* ========================================
 * CLI 入口：ts-node src/pay_dualchain_demo.ts --cfg ./cfg.json
 * ====================================== */
if (isMain()) {
  runFromCli().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

function isMain(): boolean {
  // CJS
  // @ts-ignore
  if (typeof require !== 'undefined' && typeof module !== 'undefined') {
    // @ts-ignore
    return require.main === module;
  }
  // ESM
  const mainPath = process.argv[1];
  if (!mainPath) return false;
  const mainUrl = pathToFileURL(mainPath).href;
  // @ts-ignore
  return typeof import.meta !== 'undefined' && typeof import.meta.url === 'string'
    // @ts-ignore
    && import.meta.url === mainUrl;
}

async function runFromCli() {
  const cfgPath = getCliArg('cfg');
  if (!cfgPath) {
    throw new Error('請提供 --cfg <path-to-json> 指向 PayConfig 檔案');
  }
  // 允許 JSON 的 id/amount 以字串提供，這裡幫你轉 bigint
  const raw = await readJsonFile<any>(cfgPath);
  const cfg = normalizeCfgFromJson(raw);
  const res = await runPayDualChain(cfg);
  console.log(JSON.stringify(res, null, 2));
}

/* ---------- 小工具：讀 JSON ＆ CLI 參數 ---------- */
function getCliArg(key: string): string | undefined {
  const flag = `--${key}`;
  for (let i = 2; i < process.argv.length; i++) {
    const a = process.argv[i];
    if (a === flag) return process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : 'true';
    if (a.startsWith(`${flag}=`)) return a.slice(flag.length + 1);
  }
  return undefined;
}

async function readJsonFile<T = unknown>(p: string): Promise<T> {
  const { readFile } = await import('node:fs/promises');
  const txt = await readFile(p, 'utf8');
  return JSON.parse(txt) as T;
}

/** 將 CLI JSON 轉成正規 PayConfig（把 id/amount 轉 bigint，保留可能含 43 的 ercCode） */
function normalizeCfgFromJson(raw: any): PayConfig<BaseItem> {
  const perChain = (raw.perChain || []).map((pc: any) => ({
    chain: pc.chain,
    vault: pc.vault as Address,
    items: (pc.items || []).map((it: any) => ({
      ercCode: Number(it.ercCode),
      token: it.token as Address,
      id: typeof it.id === 'bigint' ? it.id : BigInt(it.id),
      amount: typeof it.amount === 'bigint' ? it.amount : BigInt(it.amount),
    })),
  }));
  const cfg: PayConfig<BaseItem> = {
    billId: raw.billId,
    payee: raw.payee as Address,
    perChain,
    strict: raw.strict ?? true,
  };
  return cfg;
}
