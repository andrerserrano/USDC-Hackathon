const hre = require("hardhat");

async function main() {
  console.log("Deploying AgentSubscriptions to", hre.network.name);

  let usdcAddress;
  if (hre.network.name === "arcTestnet") {
    usdcAddress = "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d";
  } else if (hre.network.name === "baseSepolia") {
    usdcAddress = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
  } else {
    throw new Error("Unsupported network");
  }

  console.log("USDC Address:", usdcAddress);

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const AgentSubscriptions = await hre.ethers.getContractFactory("AgentSubscriptions");
  const contract = await AgentSubscriptions.deploy(usdcAddress);
  await contract.waitForDeployment();

  const addr = await contract.getAddress();
  console.log("Deployed to:", addr);

  await contract.deploymentTransaction().wait(3);
  console.log("Confirmed!");
}

main()
  .then(() => process.exit(0))
  .catch((e) => { console.error(e); process.exit(1); });
