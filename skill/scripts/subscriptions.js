#!/usr/bin/env node

/**
 * Agent Subscriptions - OpenClaw Skill Helper
 * Interact with AgentSubscriptions smart contract on Arc Testnet
 */

const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

// Load configuration
const configPath = path.join(__dirname, '../config.json');
const abiPath = path.join(__dirname, '../abi.json');

if (!fs.existsSync(configPath)) {
  console.error('❌ Config file not found:', configPath);
  process.exit(1);
}

if (!fs.existsSync(abiPath)) {
  console.error('❌ ABI file not found:', abiPath);
  process.exit(1);
}

const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const abi = JSON.parse(fs.readFileSync(abiPath, 'utf8'));

// Setup provider and contract
const provider = new ethers.JsonRpcProvider(config.rpcUrl);
let wallet, contract, usdc;

// Initialize wallet if private key is available
if (process.env.PRIVATE_KEY) {
  wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  contract = new ethers.Contract(config.contractAddress, abi, wallet);
  
  // USDC contract for approvals
  const usdcAbi = [
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function allowance(address owner, address spender) external view returns (uint256)",
    "function balanceOf(address account) external view returns (uint256)",
    "function decimals() external view returns (uint8)"
  ];
  usdc = new ethers.Contract(config.usdcAddress, usdcAbi, wallet);
} else {
  contract = new ethers.Contract(config.contractAddress, abi, provider);
}

// Helper functions
function formatUsdc(amount) {
  return ethers.formatUnits(amount, 6);
}

function parseUsdc(amount) {
  return ethers.parseUnits(amount.toString(), 6);
}

function formatDuration(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

// Command implementations

async function createSubscription(serviceId, recipient, amount, period) {
  if (!wallet) {
    console.error('❌ PRIVATE_KEY environment variable required');
    process.exit(1);
  }

  console.log(`📋 Creating subscription: ${serviceId}`);
  console.log(`   Recipient: ${recipient}`);
  console.log(`   Amount: ${amount} USDC per period`);
  console.log(`   Period: ${formatDuration(period)}`);
  console.log('');

  const amountUsdc = parseUsdc(amount);
  
  const tx = await contract.createSubscription(
    serviceId,
    recipient,
    amountUsdc,
    period
  );
  
  console.log('⏳ Transaction sent:', tx.hash);
  const receipt = await tx.wait();
  
  console.log('✅ Subscription created!');
  console.log(`   Block: ${receipt.blockNumber}`);
  console.log(`   Explorer: ${config.explorerUrl}/tx/${tx.hash}`);
  console.log('');
  
  // Extract subscription ID from events
  const event = receipt.logs.find(log => {
    try {
      const parsed = contract.interface.parseLog(log);
      return parsed.name === 'SubscriptionCreated';
    } catch {
      return false;
    }
  });
  
  if (event) {
    const parsed = contract.interface.parseLog(event);
    console.log(`📋 Subscription ID: ${parsed.args.id}`);
  }
}

async function subscribe(subscriptionId) {
  if (!wallet) {
    console.error('❌ PRIVATE_KEY environment variable required');
    process.exit(1);
  }

  console.log(`📝 Subscribing to subscription ${subscriptionId}`);
  console.log('');

  // Get subscription details
  const sub = await contract.getSubscription(subscriptionId);
  console.log(`   Service: ${sub.serviceId}`);
  console.log(`   Amount: ${formatUsdc(sub.amountPerPeriod)} USDC`);
  console.log(`   Period: ${formatDuration(sub.periodInSeconds)}`);
  console.log('');

  // Check USDC allowance
  const allowance = await usdc.allowance(wallet.address, config.contractAddress);
  console.log(`   Current allowance: ${formatUsdc(allowance)} USDC`);

  if (allowance < sub.amountPerPeriod) {
    console.log('   ⚠️  Insufficient allowance, approving USDC...');
    
    // Approve 10x the amount for buffer
    const approveAmount = sub.amountPerPeriod * 10n;
    const approveTx = await usdc.approve(config.contractAddress, approveAmount);
    console.log(`   ⏳ Approval tx: ${approveTx.hash}`);
    await approveTx.wait();
    console.log('   ✅ USDC approved');
    console.log('');
  }

  // Subscribe
  const tx = await contract.subscribe(subscriptionId);
  console.log('⏳ Transaction sent:', tx.hash);
  await tx.wait();
  
  console.log('✅ Subscribed successfully!');
  console.log(`   Explorer: ${config.explorerUrl}/tx/${tx.hash}`);
}

async function charge(subscriptionId) {
  if (!wallet) {
    console.error('❌ PRIVATE_KEY environment variable required');
    process.exit(1);
  }

  console.log(`💸 Charging subscription ${subscriptionId}`);
  console.log('');

  // Check if ready to charge
  const canCharge = await contract.canCharge(subscriptionId);
  if (!canCharge) {
    const timeRemaining = await contract.timeUntilNextCharge(subscriptionId);
    console.log(`⏰ Not ready yet. Time remaining: ${formatDuration(timeRemaining)}`);
    process.exit(0);
  }

  const tx = await contract.charge(subscriptionId);
  console.log('⏳ Transaction sent:', tx.hash);
  await tx.wait();
  
  console.log('✅ Subscription charged!');
  console.log(`   Explorer: ${config.explorerUrl}/tx/${tx.hash}`);
}

async function cancel(subscriptionId) {
  if (!wallet) {
    console.error('❌ PRIVATE_KEY environment variable required');
    process.exit(1);
  }

  console.log(`❌ Canceling subscription ${subscriptionId}`);
  console.log('');

  const tx = await contract.cancelSubscription(subscriptionId);
  console.log('⏳ Transaction sent:', tx.hash);
  await tx.wait();
  
  console.log('✅ Subscription canceled!');
  console.log(`   Explorer: ${config.explorerUrl}/tx/${tx.hash}`);
}

async function status(subscriptionId) {
  console.log(`📊 Subscription ${subscriptionId} Status`);
  console.log('━'.repeat(50));
  console.log('');

  const sub = await contract.getSubscription(subscriptionId);
  
  console.log(`🏷️  Service: ${sub.serviceId}`);
  console.log(`👤 Owner: ${sub.owner}`);
  console.log(`💰 Recipient: ${sub.recipient}`);
  console.log(`💵 Amount: ${formatUsdc(sub.amountPerPeriod)} USDC per period`);
  console.log(`⏰ Period: ${formatDuration(sub.periodInSeconds)}`);
  console.log(`📅 Created: ${new Date(Number(sub.createdAt) * 1000).toISOString()}`);
  console.log('');
  
  if (sub.subscriber !== ethers.ZeroAddress) {
    console.log(`👥 Subscriber: ${sub.subscriber}`);
    console.log(`✅ Active: ${sub.active}`);
    console.log(`🕐 Last charge: ${new Date(Number(sub.lastChargeTime) * 1000).toISOString()}`);
    console.log('');
    
    const canCharge = await contract.canCharge(subscriptionId);
    console.log(`💸 Can charge: ${canCharge ? '✅ YES' : '❌ NO'}`);
    
    if (!canCharge && sub.active) {
      const timeRemaining = await contract.timeUntilNextCharge(subscriptionId);
      console.log(`   Time until next charge: ${formatDuration(timeRemaining)}`);
    }
  } else {
    console.log('❌ No subscriber yet');
  }
  
  console.log('');
  console.log(`🔗 View on Explorer: ${config.explorerUrl}/address/${config.contractAddress}`);
}

async function list() {
  console.log('📋 All Subscriptions');
  console.log('━'.repeat(50));
  console.log('');

  const count = await contract.subscriptionCount();
  console.log(`Total subscriptions created: ${count}`);
  console.log('');

  for (let i = 0; i < count; i++) {
    try {
      const sub = await contract.getSubscription(i);
      const active = sub.subscriber !== ethers.ZeroAddress && sub.active;
      const status = active ? '✅ Active' : '⭕ Available';
      
      console.log(`ID ${i}: ${sub.serviceId} - ${formatUsdc(sub.amountPerPeriod)} USDC/${formatDuration(sub.periodInSeconds)} ${status}`);
    } catch (error) {
      console.log(`ID ${i}: [Error fetching]`);
    }
  }
  
  console.log('');
}

async function mySubscriptions(address) {
  const userAddress = address || wallet?.address;
  
  if (!userAddress) {
    console.error('❌ Please provide an address or set PRIVATE_KEY');
    process.exit(1);
  }

  console.log(`📋 Subscriptions for ${userAddress}`);
  console.log('━'.repeat(50));
  console.log('');

  const subIds = await contract.getUserSubscriptions(userAddress);
  
  if (subIds.length === 0) {
    console.log('No subscriptions found');
    return;
  }

  for (const id of subIds) {
    const sub = await contract.getSubscription(id);
    const status = sub.active ? '✅ Active' : '❌ Canceled';
    console.log(`ID ${id}: ${sub.serviceId} - ${formatUsdc(sub.amountPerPeriod)} USDC/${formatDuration(sub.periodInSeconds)} ${status}`);
  }
  
  console.log('');
}

// CLI
const command = process.argv[2];
const args = process.argv.slice(3);

(async () => {
  try {
    switch (command) {
      case 'create':
        if (args.length < 4) {
          console.error('Usage: node subscriptions.js create <serviceId> <recipient> <amount> <periodInSeconds>');
          console.error('Example: node subscriptions.js create "MoltDigest Weekly" 0x... 1.0 604800');
          process.exit(1);
        }
        await createSubscription(args[0], args[1], args[2], parseInt(args[3]));
        break;
        
      case 'subscribe':
        if (args.length < 1) {
          console.error('Usage: node subscriptions.js subscribe <subscriptionId>');
          process.exit(1);
        }
        await subscribe(parseInt(args[0]));
        break;
        
      case 'charge':
        if (args.length < 1) {
          console.error('Usage: node subscriptions.js charge <subscriptionId>');
          process.exit(1);
        }
        await charge(parseInt(args[0]));
        break;
        
      case 'cancel':
        if (args.length < 1) {
          console.error('Usage: node subscriptions.js cancel <subscriptionId>');
          process.exit(1);
        }
        await cancel(parseInt(args[0]));
        break;
        
      case 'status':
        if (args.length < 1) {
          console.error('Usage: node subscriptions.js status <subscriptionId>');
          process.exit(1);
        }
        await status(parseInt(args[0]));
        break;
        
      case 'list':
        await list();
        break;
        
      case 'my':
        await mySubscriptions(args[0]);
        break;
        
      default:
        console.log('Agent Subscriptions - OpenClaw Skill');
        console.log('');
        console.log('Commands:');
        console.log('  create <serviceId> <recipient> <amount> <period>  Create subscription offering');
        console.log('  subscribe <id>                                     Subscribe to a service');
        console.log('  charge <id>                                        Charge subscription');
        console.log('  cancel <id>                                        Cancel subscription');
        console.log('  status <id>                                        Get subscription details');
        console.log('  list                                               List all subscriptions');
        console.log('  my [address]                                       My subscriptions');
        console.log('');
        console.log('Environment:');
        console.log('  PRIVATE_KEY    Your wallet private key (required for write operations)');
        console.log('');
        console.log('Examples:');
        console.log('  node subscriptions.js status 0');
        console.log('  node subscriptions.js list');
        console.log('  PRIVATE_KEY=0x... node subscriptions.js subscribe 0');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.reason) {
      console.error('   Reason:', error.reason);
    }
    process.exit(1);
  }
})();
