// scripts/04_mint_to_kernel.ts   ← 建議也把檔名改一下，避免混淆
import 'dotenv/config';
import { ethers, network } from 'hardhat';

// ---- env 讀取工具 ----
function envAddr(name: string): `0x${string}` | undefined {
  const v = process.env[name]?.trim();
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
  const v = process.env[name]?.trim();
  if (!v) return def;
  if (!/^\d+$/.test(v)) throw new Error(`${name} 應為整數字串`);
  return BigInt(v);
}
function envIds(name: string, def: bigint[]): bigint[] {
  const v = process.env[name]?.trim();
  if (!v) return def;
  return v.split(',').map((s) => {
    const t = s.trim();
    if (!/^\d+$/.test(t)) throw new Error(`${name} 含非整數: ${t}`);
    return BigInt(t);
  });
}

// ---- 依 Hardhat 網路挑對應 Kernel 目標與測試資產 ----
function pickByNetwork() {
  const n = network.name;

  if (n === 'sepolia') {
    return {
      // 讀 KERNEL_SEPOLIA
      target: envAddrAny(['KERNEL_SEPOLIA']),
      usdt: envAddr('USDT_SEPOLIA'),
      erc721: envAddr('NFT21_Sepolia'),
      erc1155: undefined,
    };
  }

  if (n === 'arbitrumSepolia') {
    return {
      // 相容兩種命名
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
    throw new Error(`請在 .env 設定該網路的 KERNEL_* 錢包地址（例如 KERNEL_SEPOLIA=0x...）`);
  }

  console.log(`\n== Mint to Kernel on ${network.name} ==`);
  console.log(`Owner (onlyOwner): ${owner.address}`);
  console.log(`Kernel Target    : ${cfg.target}`);

  // 份量（可在 .env 覆寫）
  const USDT_WHOLE = envBigInt('USDT_WHOLE', 100_000n); // 10 萬顆（6 位小數）
  const ERC721_IDS = envIds('ERC721_IDS', [1n, 2n]);
  const ERC1155_ID = envBigInt('ERC1155_ID', 100n);
  const ERC1155_AMOUNT = envBigInt('ERC1155_AMOUNT', 10n);

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
