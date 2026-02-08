const hre = require("hardhat");

async function main() {
  console.log("Deploying AgentSubscriptionsV2 to", hre.network.name);

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
  
  // Check deployer balance
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Deployer balance:", hre.ethers.formatEther(balance), "ETH");

  const AgentSubscriptionsV2 = await hre.ethers.getContractFactory("AgentSubscriptionsV2");
  console.log("Deploying contract...");
  
  const contract = await AgentSubscriptionsV2.deploy(usdcAddress);
  await contract.waitForDeployment();

  const addr = await contract.getAddress();
  console.log("✅ Deployed to:", addr);

  console.log("Waiting for confirmations...");
  await contract.deploymentTransaction().wait(3);
  console.log("✅ Confirmed!");

  // Verify contract is correct
  const ownerAddress = await contract.owner();
  console.log("Contract owner:", ownerAddress);
  console.log("USDC address:", await contract.usdc());
  console.log("Offering count:", (await contract.offeringCount()).toString());

  console.log("\n📋 Deployment Summary:");
  console.log("Network:", hre.network.name);
  console.log("Contract:", addr);
  console.log("USDC:", usdcAddress);
  console.log("Owner:", ownerAddress);
  console.log("\n🔗 Explorer:", `https://testnet.arcscan.app/address/${addr}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => { 
    console.error("❌ Deployment failed:", e); 
    process.exit(1); 
  });
