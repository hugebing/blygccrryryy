// scripts/02_deploy_test_assets.ts
import 'dotenv/config';
import { ethers, network, run } from 'hardhat';

async function verify(address: string, args: any[] = []) {
  try {
    await run('verify:verify', { address, constructorArguments: args });
    console.log(`Verified: ${address}`);
  } catch (e: any) {
    console.log(`Verify skipped: ${e?.message || e}`);
  }
}

// 解析 .env 的 ID 陣列：支援 JSON 或 CSV（"1,2,11" 或 "[1,2,11]"）
function parseIdList(raw?: string): bigint[] {
  if (!raw) return [];
  let arr: any;
  try {
    arr = JSON.parse(raw);
    if (!Array.isArray(arr)) arr = undefined;
  } catch {
    // 不是 JSON，就當 CSV
  }
  if (!arr) {
    arr = raw.split(/[,\s]+/).filter(Boolean);
  }
  return arr.map((x: any) => BigInt(x));
}

// 依網路名稱產生環境變數 key（例：baseSepolia -> ERC721_IDS_Base_Sepolia）
function idsEnvKeyForNetwork(): string {
  // 你的 .env 命名慣例看起來是 Base_Sepolia / OP_Sepolia 等
  // Hardhat 的 network.name 可能是 'baseSepolia'，這裡轉成 'Base_Sepolia'
  const name = network.name
    .replace(/([a-z])([A-Z])/g, '$1_$2') // baseSepolia -> base_Sepolia
    .replace(/^[a-z]/, (m) => m.toUpperCase()) // base_Sepolia -> Base_Sepolia（首字大寫）
    .replace(/_/g, '_'); // 保留底線
  return `ERC721_IDS_${name}`;
}

// 將指定 ids 鑄給 to（自動偵測 mint 或 safeMint）
async function mintErc721(c: any, to: string, ids: bigint[]) {
  const fn: ((to: string, id: bigint) => Promise<any>) | undefined =
    (typeof c.mint === 'function' && c.mint.bind(c)) ||
    (typeof c.safeMint === 'function' && c.safeMint.bind(c));

  if (!fn) {
    throw new Error('MockERC721 必須提供 mint(to, id) 或 safeMint(to, id) 其中之一');
  }

  for (const id of ids) {
    const tx = await fn(to, id);
    await tx.wait();
    console.log(`Minted ERC721 #${id} -> ${to}`);
  }
}

async function main() {
  const [deployer] = await ethers.getSigners();
  if (!deployer) throw new Error('No signer. Check PRIVATE_KEY / network config.');

  console.log(`\n== Deploy test assets on ${network.name} ==`);
  console.log(`Deployer: ${deployer.address}`);

  const deployUSDT = async () => {
    const F = await ethers.getContractFactory('MockUSDT');
    const c = await F.deploy(deployer.address);
    await c.waitForDeployment();
    const addr = await c.getAddress();
    console.log(`MockUSDT: ${addr}`);
    await verify(addr, [deployer.address]);
    return addr;
  };

  const deployERC721 = async () => {
    const F = await ethers.getContractFactory('MockERC721');
    const c = await F.deploy(deployer.address);
    await c.waitForDeployment();
    const addr = await c.getAddress();
    console.log(`MockERC721: ${addr}`);
    await verify(addr, [deployer.address]);
    return { addr, c };
  };

  const deployERC1155 = async () => {
    const F = await ethers.getContractFactory('MockERC1155');
    const c = await F.deploy(deployer.address, 'https://example.com/{id}.json');
    await c.waitForDeployment();
    const addr = await c.getAddress();
    console.log(`MockERC1155: ${addr}`);
    await verify(addr, [deployer.address, 'https://example.com/{id}.json']);
    return addr;
  };

  // 準備 mint 參數
  const idsKey = idsEnvKeyForNetwork();          // 例：ERC721_IDS_Base_Sepolia
  const ids = parseIdList(process.env[idsKey] || process.env.ERC721_IDS); // 先用每網路覆寫，否則用通用
  const mintTo = process.env.MINT_TO || deployer.address;

  // 依網路部署對應資產
  const envLines: string[] = [];

  if (network.name === 'sepolia') {
    const usdt = await deployUSDT();
    const { addr: nft21, c } = await deployERC721();
    if (ids.length) {
      console.log(`Mint ERC721 ids on ${network.name}:`, ids.map(String).join(', '));
      await mintErc721(c, mintTo, ids);
    }
    envLines.push(`USDT_Sepolia=${usdt}`);
    envLines.push(`NFT21_Sepolia=${nft21}`);
  } else if (network.name === 'baseSepolia') {
    const usdt = await deployUSDT();
    const { addr: nft21, c } = await deployERC721();
    if (ids.length) {
      console.log(`Mint ERC721 ids on ${network.name}:`, ids.map(String).join(', '));
      await mintErc721(c, mintTo, ids);
    }
    envLines.push(`USDT_Base_Sepolia=${usdt}`);
    envLines.push(`NFT21_Base_Sepolia=${nft21}`);
  } else if (network.name === 'optimismSepolia') {
    const usdt = await deployUSDT();
    const nft15 = await deployERC1155();
    envLines.push(`USDT_OP_Sepolia=${usdt}`);
    envLines.push(`NFT15_OP_Sepolia=${nft15}`);
  } else {
    // 其他未列名的網路：全發
    const usdt = await deployUSDT();
    const { addr: nft21, c } = await deployERC721();
    const nft15 = await deployERC1155();
    if (ids.length) {
      console.log(`Mint ERC721 ids on ${network.name}:`, ids.map(String).join(', '));
      await mintErc721(c, mintTo, ids);
    }
    envLines.push(`USDT_${network.name}=${usdt}`);
    envLines.push(`NFT21_${network.name}=${nft21}`);
    envLines.push(`NFT15_${network.name}=${nft15}`);
  }

  console.log('\nPaste to your .env:');
  console.log(envLines.join('\n'));

  if (ids.length) {
    console.log(`\nMinted ERC721 IDs -> ${mintTo}: ${ids.map(String).join(', ')}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
