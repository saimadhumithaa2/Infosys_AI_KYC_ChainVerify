const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  const initialIssuer = process.env.INITIAL_ISSUER || deployer.address;
  const KYCPlatform = await hre.ethers.getContractFactory("KYCPlatform");
  const kyc = await KYCPlatform.deploy(initialIssuer);
  await kyc.waitForDeployment();

  const address = await kyc.getAddress();
  console.log("KYCPlatform deployed to:", address);
  console.log("\nAdd to .env:");
  console.log(`VITE_CONTRACT_ADDRESS=${address}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
