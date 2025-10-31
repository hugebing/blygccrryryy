import { ethers, run, network } from "hardhat";
import * as dotenv from 'dotenv';
dotenv.config();

async function main() {
  const [deployer] = await ethers.getSigners();
  const admin    = process.env.ADMIN || deployer.address;
  const operator = process.env.OPERATOR || deployer.address;

  console.log(`\n== Deploying OmniVaultRootPay ==`);
  console.log(`Network : ${network.name}`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Admin   : ${admin}`);
  console.log(`Operator: ${operator}`);

  const Factory = await ethers.getContractFactory("OmniVaultRootPay");
  const vault = await Factory.deploy(admin, operator);
  await vault.waitForDeployment();
  const addr = await vault.getAddress();

  console.log(`OmniVaultRootPay deployed at: ${addr}`);

  // 自動驗證（有填 API key 才會成功）
  try {
    console.log(`Verifying...`);
    await run("verify:verify", {
      address: addr,
      constructorArguments: [admin, operator],
    });
    console.log(`Verified ✅`);
  } catch (e: any) {
    console.log(`Verify skipped: ${e?.message || e}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


// npx hardhat run --network sepolia scripts/01_deploy_vault.ts
// npx hardhat run --network arbitrumSepolia scripts/01_deploy_vault.ts
// npx hardhat run --network baseSepolia scripts/01_deploy_vault.ts
// npx hardhat run --network optimismSepolia scripts/01_deploy_vault.ts