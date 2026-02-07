const hre = require("hardhat");

async function main() {
  console.log("🚀 Deploying AgentSubscriptions to", hre.network.name);
  console.log("=====================================\n");

  // Get USDC address for network
  let usdcAddress;
  if (hre.network.name === "arcTestnet") {
    // Arc Testnet USDC address
    usdcAddress = process.env.USDC_ARC_TESTNET || "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d";
  } else if (hre.network.name === "baseSepolia") {
    usdcAddress = process.env.USDC_SEPOLIA || "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
  } else if (hre.network.name === "base") {
    usdcAddress = process.env.USDC_MAINNET || "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
  } else {
    throw new Error("Unsupported network. Use arcTestnet, baseSepolia, or base");
  }

  console.log("Network:", hre.network.name);
  console.log("USDC Address:", usdcAddress);
  console.log("");

  // Get deployer
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer:", deployer.address);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Deployer balance:", hre.ethers.formatEther(balance), "ETH");
  console.log("");

  // Deploy contract
  console.log("Deploying AgentSubscriptions contract...");
  const AgentSubscriptions = await hre.ethers.getContractFactory("AgentSubscriptions");
  const contract = await AgentSubscriptions.deploy(usdcAddress);

  await contract.waitForDeployment();
  const contractAddress = await contract.getAddress();

  console.log("✅ AgentSubscriptions deployed to:", contractAddress);
  console.log("");

  // Wait for block confirmations
  console.log("⏳ Waiting for 5 block confirmations...");
  await contract.deploymentTransaction().wait(5);
  console.log("✅ Confirmed!");
  console.log("");

  // Verification instructions
  console.log("📝 Verify contract with:");
  console.log(`npx hardhat verify --network ${hre.network.name} ${contractAddress} ${usdcAddress}`);
  console.log("");

  // Save deployment info
  const deployment = {
    network: hre.network.name,
    contractAddress: contractAddress,
    usdcAddress: usdcAddress,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    blockNumber: await hre.ethers.provider.getBlockNumber(),
  };

  console.log("📄 Deployment Summary:");
  console.log(JSON.stringify(deployment, null, 2));
  console.log("");
  
  // Network-specific explorer links
  console.log("🔗 View on Explorer:");
  if (hre.network.name === "arcTestnet") {
    console.log(`https://testnet.arcscan.net/address/${contractAddress}`);
  } else if (hre.network.name === "baseSepolia") {
    console.log(`https://sepolia.basescan.org/address/${contractAddress}`);
  } else if (hre.network.name === "base") {
    console.log(`https://basescan.org/address/${contractAddress}`);
  }
  
  console.log("");
  console.log("✅ Deployment complete! 🎉");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  });
