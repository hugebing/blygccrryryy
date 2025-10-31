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
    return addr;
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

  // 依網路部署對應資產
  const envLines: string[] = [];
  if (network.name === 'sepolia') {
    const usdt = await deployUSDT();
    const nft21 = await deployERC721();
    envLines.push(`USDT_Sepolia=${usdt}`);
    envLines.push(`NFT21_Sepolia=${nft21}`);
  } else if (network.name === 'arbitrumSepolia') {
    const usdt = await deployUSDT();
    const nft15 = await deployERC1155();
    envLines.push(`USDT_Arbitrum_Sepolia=${usdt}`);
    envLines.push(`NFT15_Arbitrum_Sepolia=${nft15}`);
  } else if (network.name === 'baseSepolia') {
    const usdt = await deployUSDT();
    const nft21 = await deployERC721();
    envLines.push(`USDT_Base_Sepolia=${usdt}`);
    envLines.push(`NFT21_Base_Sepolia=${nft21}`);
  } else if (network.name === 'optimismSepolia') {
    const usdt = await deployUSDT();
    const nft15 = await deployERC1155();
    envLines.push(`USDT_OP_Sepolia=${usdt}`);
    envLines.push(`NFT15_OP_Sepolia=${nft15}`);
  } else {
    // 未列名的網路就全發（你也可自行調整）
    const usdt = await deployUSDT();
    const nft21 = await deployERC721();
    const nft15 = await deployERC1155();
    envLines.push(`USDT_${network.name}=${usdt}`);
    envLines.push(`NFT21_${network.name}=${nft21}`);
    envLines.push(`NFT15_${network.name}=${nft15}`);
  }

  console.log('\nPaste to your .env:');
  console.log(envLines.join('\n'));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
