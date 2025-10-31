// scripts/04_mint_to_kernel.ts
import 'dotenv/config';
import { ethers, network } from 'hardhat';

/* =============== 小工具：讀 env =============== */
function envStr(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim() ? v.trim() : undefined;
}

function envAddr(name: string): `0x${string}` | undefined {
  const v = envStr(name);
  if (!v) return undefined;
  if (!/^0x[0-9a-fA-F]{40}$/.test(v)) throw new Error(`${name} 不是合法地址: ${v}`);
  return v as `0x${string}`;
}
function envAddrAny(keys: string[]): `0x${string}` | undefined {
  for (const k of keys) {
    const a = envAddr(k);
    if (a) return a;
  }
  return undefined;
}

function envBigInt(name: string, def: bigint): bigint {
  const v = envStr(name);
  if (!v) return def;
  if (!/^\d+$/.test(v)) throw new Error(`${name} 應為整數字串（10 進位）`);
  return BigInt(v);
}
function envBigIntAny(keys: string[], def: bigint): bigint {
  for (const k of keys) {
    const v = envStr(k);
    if (v !== undefined) {
      if (!/^\d+$/.test(v)) throw new Error(`${k} 應為整數字串（10 進位）`);
      return BigInt(v);
    }
  }
  return def;
}

function envIds(name: string, def: bigint[]): bigint[] {
  const v = envStr(name);
  if (!v) return def;
  return v.split(',').map((s) => {
    const t = s.trim();
    if (!/^\d+$/.test(t)) throw new Error(`${name} 含非整數: ${t}`);
    return BigInt(t);
  });
}
function envIdsAny(keys: string[], def: bigint[]): bigint[] {
  for (const k of keys) {
    const v = envStr(k);
    if (v !== undefined) {
      return envIds(k, def);
    }
  }
  return def;
}

/* =============== 依 Hardhat 網路取 env 後綴 =============== */
function netSuffix(n: string): string {
  if (n === 'sepolia') return 'Sepolia';
  if (n === 'arbitrumSepolia') return 'Arbitrum_Sepolia';
  if (n === 'baseSepolia') return 'Base_Sepolia';
  if (n === 'optimismSepolia') return 'OP_Sepolia';
  // 其他網路要加可在此擴充
  return n;
}

/* =============== 依 Hardhat 網路挑 Kernel 與測試資產 =============== */
function pickByNetwork() {
  const n = network.name;

  if (n === 'sepolia') {
    return {
      target: envAddrAny(['KERNEL_Sepolia']),
      usdt: envAddr('USDT_Sepolia'),
      erc721: envAddr('NFT21_Sepolia'),
      erc1155: undefined,
    };
  }

  if (n === 'arbitrumSepolia') {
    return {
      target: envAddrAny(['KERNEL_Arbitrum_Sepolia', 'KERNEL_ARBITRUM_SEPOLIA']),
      usdt: envAddr('USDT_Arbitrum_Sepolia'),
      erc721: undefined,
      erc1155: envAddr('NFT15_Arbitrum_Sepolia'),
    };
  }

  if (n === 'baseSepolia') {
    return {
      target: envAddrAny(['KERNEL_Base_Sepolia', 'KERNEL_BASE_SEPOLIA']),
      usdt: envAddr('USDT_Base_Sepolia'),
      erc721: envAddr('NFT21_Base_Sepolia'),
      erc1155: undefined,
    };
  }

  if (n === 'optimismSepolia') {
    return {
      target: envAddrAny(['KERNEL_OP_Sepolia', 'KERNEL_OP_SEPOLIA']),
      usdt: envAddr('USDT_OP_Sepolia'),
      erc721: undefined,
      erc1155: envAddr('NFT15_OP_Sepolia'),
    };
  }

  throw new Error(`未支援的 network.name: ${n}`);
}

async function main() {
  const [owner] = await ethers.getSigners();
  if (!owner) throw new Error('No signer. 檢查 PRIVATE_KEY / hardhat.config.ts');

  const cfg = pickByNetwork();
  if (!cfg.target) {
    throw new Error(`請在 .env 設定該網路的 KERNEL_* 錢包地址（例如 KERNEL_Sepolia=0x...）`);
  }

  const suffix = netSuffix(network.name);

  console.log(`\n== Mint to Kernel on ${network.name} ==`);
  console.log(`Owner (onlyOwner): ${owner.address}`);
  console.log(`Kernel Target    : ${cfg.target}`);

  // ======== 份量（支援每網路覆寫 + 全域 fallback）========
  // USDT (6 decimals)
  const USDT_WHOLE = envBigIntAny([`USDT_WHOLE_${suffix}`, 'USDT_WHOLE'], 100_000n); // 10 萬顆
  // ERC721 多 ID（以逗號分隔），先找每網路，再找全域，最後預設 [1,2]
  const ERC721_IDS = envIdsAny([`ERC721_IDS_${suffix}`, 'ERC721_IDS'], [1n, 2n]);
  // ERC1155 單一 ID 與數量，支援每網路覆寫
  const ERC1155_ID = envBigIntAny([`ERC1155_ID_${suffix}`, 'ERC1155_ID'], 100n);
  const ERC1155_AMOUNT = envBigIntAny([`ERC1155_AMOUNT_${suffix}`, 'ERC1155_AMOUNT'], 10_000n);

  console.log(`USDT_WHOLE: ${USDT_WHOLE} (實際鑄造 = USDT_WHOLE * 1e6)`);
  console.log(`ERC721_IDS: ${ERC721_IDS.join(', ')}`);
  console.log(`ERC1155_ID: ${ERC1155_ID}, ERC1155_AMOUNT: ${ERC1155_AMOUNT}`);

  // ======== 鑄幣 ========
  // USDT(6 decimals)
  if (cfg.usdt) {
    const c20 = await ethers.getContractAt('MockUSDT', cfg.usdt);
    const amount = USDT_WHOLE * 1_000_000n; // 6 位小數
    const tx = await c20.mint(cfg.target, amount);
    console.log(`USDT mint ${USDT_WHOLE} => tx: ${tx.hash}`);
    await tx.wait();
  } else {
    console.log('USDT 合約未設定，跳過。');
  }

  // ERC721
  if (cfg.erc721) {
    const c721 = await ethers.getContractAt('MockERC721', cfg.erc721);
    for (const id of ERC721_IDS) {
      // show cfg.erc721 and id
      console.log(`Minting ERC721 id=${id} to ${cfg.target} using contract ${cfg.erc721}`);
      const tx = await c721.mintTo(cfg.target, id);
      console.log(`ERC721 mint id=${id} => tx: ${tx.hash}`);
      await tx.wait();
    }
  } else {
    console.log('ERC721 合約未設定，跳過。');
  }

  // ERC1155
  if (cfg.erc1155) {
    const c1155 = await ethers.getContractAt('MockERC1155', cfg.erc1155);
    const tx = await c1155.mint(cfg.target, ERC1155_ID, ERC1155_AMOUNT, '0x');
    console.log(`ERC1155 mint id=${ERC1155_ID}, amt=${ERC1155_AMOUNT} => tx: ${tx.hash}`);
    await tx.wait();
  } else {
    console.log('ERC1155 合約未設定，跳過。');
  }

  console.log('\n完成 ✅');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
