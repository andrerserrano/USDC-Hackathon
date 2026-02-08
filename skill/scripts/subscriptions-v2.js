#!/usr/bin/env node

/**
 * Agent Subscriptions v2 - OpenClaw Skill Helper
 * Interact with AgentSubscriptionsV2 smart contract on Arc Testnet
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

async function createOffering(serviceId, recipient, amount, period) {
  if (!wallet) {
    console.error('❌ PRIVATE_KEY environment variable required');
    process.exit(1);
  }

  console.log(`📋 Creating offering: ${serviceId}`);
  console.log(`   Recipient: ${recipient}`);
  console.log(`   Amount: ${amount} USDC per period`);
  console.log(`   Period: ${formatDuration(period)}`);
  console.log('');

  const amountUsdc = parseUsdc(amount);
  
  const tx = await contract.createOffering(
    serviceId,
    recipient,
    amountUsdc,
    period
  );
  
  console.log('⏳ Transaction sent:', tx.hash);
  const receipt = await tx.wait();
  
  console.log('✅ Offering created!');
  console.log(`   Block: ${receipt.blockNumber}`);
  console.log(`   Explorer: ${config.explorerUrl}/tx/${tx.hash}`);
  console.log('');
  
  // Extract offering ID from events
  const event = receipt.logs.find(log => {
    try {
      const parsed = contract.interface.parseLog(log);
      return parsed.name === 'OfferingCreated';
    } catch {
      return false;
    }
  });
  
  if (event) {
    const parsed = contract.interface.parseLog(event);
    console.log(`📋 Offering ID: ${parsed.args.offeringId}`);
  }
}

async function subscribe(offeringId) {
  if (!wallet) {
    console.error('❌ PRIVATE_KEY environment variable required');
    process.exit(1);
  }

  console.log(`📝 Subscribing to offering ${offeringId}`);
  console.log('');

  // Get offering details
  const offering = await contract.getOffering(offeringId);
  console.log(`   Service: ${offering.serviceId}`);
  console.log(`   Amount: ${formatUsdc(offering.amountPerPeriod)} USDC`);
  console.log(`   Period: ${formatDuration(offering.periodInSeconds)}`);
  console.log('');

  // Check USDC allowance
  const allowance = await usdc.allowance(wallet.address, config.contractAddress);
  console.log(`   Current allowance: ${formatUsdc(allowance)} USDC`);

  if (allowance < offering.amountPerPeriod) {
    console.log('   ⚠️  Insufficient allowance, approving USDC...');
    
    // Approve 10x the amount for buffer
    const approveAmount = offering.amountPerPeriod * 10n;
    const approveTx = await usdc.approve(config.contractAddress, approveAmount);
    console.log(`   ⏳ Approval tx: ${approveTx.hash}`);
    await approveTx.wait();
    console.log('   ✅ USDC approved');
    console.log('');
  }

  // Subscribe
  const tx = await contract.subscribe(offeringId);
  console.log('⏳ Transaction sent:', tx.hash);
  await tx.wait();
  
  console.log('✅ Subscribed successfully!');
  console.log(`   Explorer: ${config.explorerUrl}/tx/${tx.hash}`);
}

async function charge(offeringId, subscriber) {
  if (!wallet) {
    console.error('❌ PRIVATE_KEY environment variable required');
    process.exit(1);
  }

  console.log(`💸 Charging offering ${offeringId} for subscriber ${subscriber}`);
  console.log('');

  // Check if ready to charge
  const canCharge = await contract.canCharge(offeringId, subscriber);
  if (!canCharge) {
    const timeRemaining = await contract.timeUntilNextCharge(offeringId, subscriber);
    console.log(`⏰ Not ready yet. Time remaining: ${formatDuration(timeRemaining)}`);
    process.exit(0);
  }

  const tx = await contract.charge(offeringId, subscriber);
  console.log('⏳ Transaction sent:', tx.hash);
  await tx.wait();
  
  console.log('✅ Subscription charged!');
  console.log(`   Explorer: ${config.explorerUrl}/tx/${tx.hash}`);
}

async function chargeAll(offeringId) {
  if (!wallet) {
    console.error('❌ PRIVATE_KEY environment variable required');
    process.exit(1);
  }

  console.log(`💸 Batch charging all subscribers for offering ${offeringId}`);
  console.log('');

  const tx = await contract.chargeAll(offeringId);
  console.log('⏳ Transaction sent:', tx.hash);
  const receipt = await tx.wait();
  
  // Extract batch results from event
  const event = receipt.logs.find(log => {
    try {
      const parsed = contract.interface.parseLog(log);
      return parsed.name === 'BatchChargeCompleted';
    } catch {
      return false;
    }
  });
  
  if (event) {
    const parsed = contract.interface.parseLog(event);
    console.log('✅ Batch charging complete!');
    console.log(`   Success: ${parsed.args.successCount}`);
    console.log(`   Failed: ${parsed.args.failCount}`);
  }
  
  console.log(`   Explorer: ${config.explorerUrl}/tx/${tx.hash}`);
}

async function cancel(offeringId) {
  if (!wallet) {
    console.error('❌ PRIVATE_KEY environment variable required');
    process.exit(1);
  }

  console.log(`❌ Canceling subscription to offering ${offeringId}`);
  console.log('');

  const tx = await contract.cancelSubscription(offeringId);
  console.log('⏳ Transaction sent:', tx.hash);
  await tx.wait();
  
  console.log('✅ Subscription canceled!');
  console.log(`   Explorer: ${config.explorerUrl}/tx/${tx.hash}`);
}

async function pauseOffering(offeringId) {
  if (!wallet) {
    console.error('❌ PRIVATE_KEY environment variable required');
    process.exit(1);
  }

  console.log(`⏸️  Pausing offering ${offeringId}`);
  console.log('');

  const tx = await contract.pauseOffering(offeringId);
  console.log('⏳ Transaction sent:', tx.hash);
  await tx.wait();
  
  console.log('✅ Offering paused!');
  console.log(`   Explorer: ${config.explorerUrl}/tx/${tx.hash}`);
}

async function unpauseOffering(offeringId) {
  if (!wallet) {
    console.error('❌ PRIVATE_KEY environment variable required');
    process.exit(1);
  }

  console.log(`▶️  Unpausing offering ${offeringId}`);
  console.log('');

  const tx = await contract.unpauseOffering(offeringId);
  console.log('⏳ Transaction sent:', tx.hash);
  await tx.wait();
  
  console.log('✅ Offering unpaused!');
  console.log(`   Explorer: ${config.explorerUrl}/tx/${tx.hash}`);
}

async function status(offeringId, subscriber) {
  console.log(`📊 Offering ${offeringId} Status`);
  console.log('━'.repeat(50));
  console.log('');

  const offering = await contract.getOffering(offeringId);
  
  console.log(`🏷️  Service: ${offering.serviceId}`);
  console.log(`👤 Owner: ${offering.owner}`);
  console.log(`💰 Recipient: ${offering.recipient}`);
  console.log(`💵 Amount: ${formatUsdc(offering.amountPerPeriod)} USDC per period`);
  console.log(`⏰ Period: ${formatDuration(offering.periodInSeconds)}`);
  console.log(`📅 Created: ${new Date(Number(offering.createdAt) * 1000).toISOString()}`);
  console.log(`✅ Active: ${offering.active}`);
  console.log(`👥 Subscribers: ${offering.totalSubscribers}`);
  console.log('');
  
  if (subscriber) {
    console.log(`📋 Subscription for ${subscriber}:`);
    const sub = await contract.getUserSubscription(offeringId, subscriber);
    
    if (sub.subscriber === ethers.ZeroAddress) {
      console.log('   ❌ No subscription found');
    } else {
      console.log(`   ✅ Active: ${sub.active}`);
      console.log(`   🕐 Last charge: ${new Date(Number(sub.lastChargeTime) * 1000).toISOString()}`);
      console.log(`   💰 Total paid: ${formatUsdc(sub.totalPaid)} USDC`);
      console.log(`   📊 Charge count: ${sub.chargeCount}`);
      
      const canCharge = await contract.canCharge(offeringId, subscriber);
      console.log(`   💸 Can charge: ${canCharge ? '✅ YES' : '❌ NO'}`);
      
      if (!canCharge && sub.active) {
        const timeRemaining = await contract.timeUntilNextCharge(offeringId, subscriber);
        console.log(`      Time until next charge: ${formatDuration(timeRemaining)}`);
      }
    }
  }
  
  console.log('');
  console.log(`🔗 View on Explorer: ${config.explorerUrl}/address/${config.contractAddress}`);
}

async function list() {
  console.log('📋 All Offerings');
  console.log('━'.repeat(50));
  console.log('');

  const count = await contract.offeringCount();
  console.log(`Total offerings created: ${count}`);
  console.log('');

  for (let i = 0; i < count; i++) {
    try {
      const offering = await contract.getOffering(i);
      const status = offering.active ? '✅ Active' : '⏸️  Paused';
      
      console.log(`ID ${i}: ${offering.serviceId} - ${formatUsdc(offering.amountPerPeriod)} USDC/${formatDuration(offering.periodInSeconds)} ${status} (${offering.totalSubscribers} subs)`);
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

  const offeringIds = await contract.getUserOfferingIds(userAddress);
  
  if (offeringIds.length === 0) {
    console.log('No subscriptions found');
    return;
  }

  for (const id of offeringIds) {
    const offering = await contract.getOffering(id);
    const sub = await contract.getUserSubscription(id, userAddress);
    const status = sub.active ? '✅ Active' : '❌ Canceled';
    console.log(`ID ${id}: ${offering.serviceId} - ${formatUsdc(offering.amountPerPeriod)} USDC/${formatDuration(offering.periodInSeconds)} ${status}`);
    if (sub.active) {
      console.log(`   💰 Paid: ${formatUsdc(sub.totalPaid)} USDC (${sub.chargeCount} charges)`);
    }
  }
  
  console.log('');
}

async function subscribers(offeringId) {
  console.log(`👥 Subscribers for offering ${offeringId}`);
  console.log('━'.repeat(50));
  console.log('');

  const subs = await contract.getOfferingSubscribers(offeringId);
  
  if (subs.length === 0) {
    console.log('No subscribers yet');
    return;
  }

  console.log(`Total subscribers: ${subs.length}`);
  console.log('');

  for (const addr of subs) {
    const sub = await contract.getUserSubscription(offeringId, addr);
    const status = sub.active ? '✅' : '❌';
    console.log(`${status} ${addr} - ${formatUsdc(sub.totalPaid)} USDC paid`);
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
          console.error('Usage: node subscriptions-v2.js create <serviceId> <recipient> <amount> <periodInSeconds>');
          console.error('Example: node subscriptions-v2.js create "MoltDigest Weekly" 0x... 1.0 604800');
          process.exit(1);
        }
        await createOffering(args[0], args[1], args[2], parseInt(args[3]));
        break;
        
      case 'subscribe':
        if (args.length < 1) {
          console.error('Usage: node subscriptions-v2.js subscribe <offeringId>');
          process.exit(1);
        }
        await subscribe(parseInt(args[0]));
        break;
        
      case 'charge':
        if (args.length < 2) {
          console.error('Usage: node subscriptions-v2.js charge <offeringId> <subscriberAddress>');
          process.exit(1);
        }
        await charge(parseInt(args[0]), args[1]);
        break;

      case 'charge-all':
        if (args.length < 1) {
          console.error('Usage: node subscriptions-v2.js charge-all <offeringId>');
          process.exit(1);
        }
        await chargeAll(parseInt(args[0]));
        break;
        
      case 'cancel':
        if (args.length < 1) {
          console.error('Usage: node subscriptions-v2.js cancel <offeringId>');
          process.exit(1);
        }
        await cancel(parseInt(args[0]));
        break;

      case 'pause':
        if (args.length < 1) {
          console.error('Usage: node subscriptions-v2.js pause <offeringId>');
          process.exit(1);
        }
        await pauseOffering(parseInt(args[0]));
        break;

      case 'unpause':
        if (args.length < 1) {
          console.error('Usage: node subscriptions-v2.js unpause <offeringId>');
          process.exit(1);
        }
        await unpauseOffering(parseInt(args[0]));
        break;
        
      case 'status':
        if (args.length < 1) {
          console.error('Usage: node subscriptions-v2.js status <offeringId> [subscriberAddress]');
          process.exit(1);
        }
        await status(parseInt(args[0]), args[1]);
        break;
        
      case 'list':
        await list();
        break;
        
      case 'my':
        await mySubscriptions(args[0]);
        break;

      case 'subscribers':
        if (args.length < 1) {
          console.error('Usage: node subscriptions-v2.js subscribers <offeringId>');
          process.exit(1);
        }
        await subscribers(parseInt(args[0]));
        break;
        
      default:
        console.log('Agent Subscriptions v2 - OpenClaw Skill');
        console.log('');
        console.log('Commands:');
        console.log('  create <serviceId> <recipient> <amount> <period>  Create offering');
        console.log('  subscribe <id>                                     Subscribe to offering');
        console.log('  charge <id> <subscriber>                           Charge subscription');
        console.log('  charge-all <id>                                    Batch charge all subscribers');
        console.log('  cancel <id>                                        Cancel your subscription');
        console.log('  pause <id>                                         Pause offering (owner only)');
        console.log('  unpause <id>                                       Unpause offering (owner only)');
        console.log('  status <id> [subscriber]                           Get offering/subscription details');
        console.log('  list                                               List all offerings');
        console.log('  my [address]                                       Your subscriptions');
        console.log('  subscribers <id>                                   List offering subscribers');
        console.log('');
        console.log('Environment:');
        console.log('  PRIVATE_KEY    Your wallet private key (required for write operations)');
        console.log('');
        console.log('Examples:');
        console.log('  node subscriptions-v2.js status 0');
        console.log('  node subscriptions-v2.js list');
        console.log('  PRIVATE_KEY=0x... node subscriptions-v2.js subscribe 0');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.reason) {
      console.error('   Reason:', error.reason);
    }
    process.exit(1);
  }
})();
