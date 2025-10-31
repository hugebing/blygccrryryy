// src/pay_dualchain_demo.ts
import 'dotenv/config';
import {
  Hex,
  encodeFunctionData,
  toHex,
  toBytes,
  Abi,
  hashMessage,
} from 'viem';
import { makeKernel, CHAINS } from './aa';
import * as Merkle from './merkle';

/* -------------------- env 驗證 -------------------- */
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

/* -------------------- 讀 env -------------------- */
const VAULT_SEPOLIA      = addr('VAULT_SEPOLIA');
const VAULT_BASE_SEPOLIA = addr('VAULT_Base_Sepolia');
const NFT21_SEPOLIA      = addr('NFT21_Sepolia');
const USDT_BASE_SEPOLIA  = addr('USDT_Base_Sepolia');
const PAYEE              = addr('PAYEE');
const BILL_ID_HEX: Hex   = toHex(need('BILL_ID'), { size: 32 });

/* -------------------- ABIs（物件型，避開 parseAbi 型別陷阱） -------------------- */
export const ERC20_ABI: Abi = [
  {
    type: 'function',
    name: 'approve',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'value',   type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
];

export const ERC721_ABI: Abi = [
  {
    type: 'function',
    name: 'approve',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to',       type: 'address'  },
      { name: 'tokenId',  type: 'uint256'  },
    ],
    outputs: [],
  },
];

export const VAULT_ABI: Abi = [
  {
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
  },
];

/** ERC-1271 isValidSignature(bytes32,bytes) */
const ERC1271_ABI: Abi = [
  {
    type: 'function',
    name: 'isValidSignature',
    stateMutability: 'view',
    inputs: [
      { name: 'hash',      type: 'bytes32' },
      { name: 'signature', type: 'bytes'   },
    ],
    outputs: [{ name: 'magic', type: 'bytes4' }],
  },
];
const ERC1271_MAGIC = '0x1626ba7e' as Hex;

const MAX = (1n << 256n) - 1n;

/* -------------------- 1271 預檢（可跳過：帳戶尚未部署時） -------------------- */
async function precheck1271(k: Awaited<ReturnType<typeof makeKernel>>, root: Hex, sig: Hex) {
  const kernel = k.account.address;
  const code = await k.publicClient.getBytecode({ address: kernel });
  if (!code || code === '0x') {
    console.log(`[預檢略過] ${k.client.chain.name} Kernel 尚未部署（counterfactual），無法鏈上驗簽預檢。`);
    return;
  }

  // 兩種雜湊都測：raw root & EIP-191
  const hashRaw = root;
  const hash191 = hashMessage({ raw: toBytes(root) });

  const tryOne = async (h: Hex) => {
    try {
      const magic = await k.publicClient.readContract({
        address: kernel,
        abi: ERC1271_ABI,
        functionName: 'isValidSignature',
        args: [h, sig],
      }) as Hex;
      return magic?.toLowerCase() === ERC1271_MAGIC.toLowerCase();
    } catch {
      return false;
    }
  };

  const okRaw  = await tryOne(hashRaw);
  const ok191  = await tryOne(hash191);

  if (okRaw || ok191) {
    console.log(`[預檢通過] ${k.client.chain.name} 1271 簽章有效（raw=${okRaw}, 191=${ok191}）`);
  } else {
    throw new Error(`[預檢失敗] ${k.client.chain.name} 1271 BAD_SIG（raw/191 都不通）。請確認：
    - Vault 合約已更新為「先試 EIP-191，失敗再驗 raw」的雙軌驗簽；
    - 你使用的 bundleSig 確實是對 root 簽的（signMessage(raw=root)）。`);
  }
}

async function main() {
  // 1) 建兩條鏈的 Kernel（會讀 ZD_SEPOLIA / ZD_Base_Sepolia）
  const [A, B] = await Promise.all([
    makeKernel(CHAINS.sepolia),
    makeKernel(CHAINS.baseSepolia),
  ]);

  // 2) 準備各鏈扣款清單（同鏈多資產＝同一個 items[]）
  const itemsSepolia = Merkle.sortItems([
    { ercCode: 21, token: NFT21_SEPOLIA,     id: 1n, amount: 1n },                 // ERC721 id=1
  ]);
  const itemsBase = Merkle.sortItems([
    { ercCode: 20, token: USDT_BASE_SEPOLIA, id: 0n, amount: 100n * 1_000_000n },  // USDT 100（6位）
  ]);

  // 3) 組 Merkle（每鏈 items → itemsHash → leaf；再建 root/proofs）
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

  // 4) 只簽一次 root（EIP-191 signMessage），兩鏈共用同一份簽章
  const bundleSig = await A.client.account.signMessage({ message: { raw: toBytes(root) }}) as Hex;

  // 4.5) 先做 1271 預檢（若 Kernel 已部署）
  await precheck1271(A, root, bundleSig).catch((e) => { throw e; });
  await precheck1271(B, root, bundleSig).catch((e) => { throw e; });

  // 5) 各鏈 calls：先 approve，再 depositByRootProof
  // Sepolia：approve(ERC721, tokenId=1) -> deposit
  const callsSepolia: { to:`0x${string}`, data:Hex, value?:bigint }[] = [
    {
      to: NFT21_SEPOLIA,
      data: encodeFunctionData({
        abi: ERC721_ABI,
        functionName: 'approve',
        args: [VAULT_SEPOLIA, 1n],
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
          bundleSig,
        ],
      }),
    },
  ];

  // Base：approve(USDT, MAX) -> deposit
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
          bundleSig,           // 兩鏈共用
        ],
      }),
    },
  ];

  // 6) 送出兩條鏈的 userOp（每鏈一筆，內含多個 calls）
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

  console.log('✅ 兩鏈支付完成（Sepolia: ERC721#1、Base: USDT 100）');
}

main().catch((e) => { console.error(e); process.exit(1); });
