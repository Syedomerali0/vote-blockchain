const { ethers } = require("hardhat");

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);

    const VotingV2 = await ethers.getContractFactory("VotingV2");
    const voting = await VotingV2.deploy();

    console.log("VotingV2 deployed to:", voting.address);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });