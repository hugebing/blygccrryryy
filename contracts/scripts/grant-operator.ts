import { ethers, network } from "hardhat";
import { keccak256, toUtf8Bytes } from "ethers";

async function main() {
  const targetVault = process.env.TARGET_VAULT as `0x${string}`;
  const operator = process.env.NEW_OPERATOR as `0x${string}`;
  if (!targetVault || !operator) throw new Error("TARGET_VAULT / NEW_OPERATOR missing");

  const ROLE = keccak256(toUtf8Bytes("OPERATOR_ROLE"));
  const vault = await ethers.getContractAt("OmniVaultRootPay", targetVault);
  const tx = await vault.grantRole(ROLE, operator);
  console.log(`[${network.name}] grantRole tx:`, tx.hash);
  await tx.wait();
  console.log("Done.");
}
main().catch(e => { console.error(e); process.exit(1); });
