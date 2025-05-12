const hre = require("hardhat");

async function main() {
  const { ethers } = hre;

  console.log("Ethers object:", ethers);
  const signers = await ethers.getSigners();
  console.log("Signers:", signers.map((s) => s.address));
}

main().catch(console.error);
