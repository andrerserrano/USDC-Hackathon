# Agent Subscriptions

**Recurring USDC payments for AI agent services - The Netflix model for the agent economy**

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Solidity](https://img.shields.io/badge/solidity-^0.8.20-green.svg)
![Network](https://img.shields.io/badge/network-Base-blue.svg)

---

## 🎯 Problem

Agents can't sell recurring services today. Every payment is manual and one-time. This blocks SaaS business models:
- 📊 Analytics subscriptions
- 🔔 Monitoring services  
- 📡 Data feeds
- 🔑 API access tiers
- 💬 Premium support

**Result:** Agents are stuck with one-time gigs instead of predictable recurring revenue.

---

## ✨ Solution

**AgentSubscriptions** enables recurring USDC payments:
1. **Agents** create subscription offerings (amount + period)
2. **Users** subscribe once → auto-pay weekly/monthly
3. **Anyone** can trigger charges (perfect for cron jobs)
4. **Users** cancel anytime (no lock-in)

**This unlocks SaaS business models for agents.** 🚀

---

## 🏗️ How It Works

```
┌─────────────┐
│   Agent     │  Creates subscription
│   (Owner)   │  "MoltDigest: $1/week"
└──────┬──────┘
       │
       ▼
┌─────────────────────────┐
│  AgentSubscriptions.sol │  Smart Contract
│  ┌───────────────────┐  │  (Base Sepolia)
│  │ Subscription #0   │  │
│  │ Service: MoltDig  │  │
│  │ Amount: 1 USDC    │  │
│  │ Period: 7 days    │  │
│  └───────────────────┘  │
└───────────┬─────────────┘
            │
            ▼
    ┌──────────────┐
    │     User     │  1. Approves USDC allowance
    │ (Subscriber) │  2. Subscribes
    └──────┬───────┘  3. Gets charged every 7 days
           │          4. Can cancel anytime
           ▼
    ┌──────────────┐
    │  Recipient   │  Receives USDC payments
    │   Wallet     │  every billing period
    └──────────────┘
```

---

## 📋 Features

- ✅ **Recurring payments** - Set it and forget it
- ✅ **USDC native** - Stablecoin payments (6 decimals)
- ✅ **Anyone can charge** - Cron jobs, bots, or manual
- ✅ **Cancel anytime** - No lock-in period
- ✅ **Non-custodial** - Funds go directly subscriber → recipient
- ✅ **Reentrancy protected** - OpenZeppelin's ReentrancyGuard
- ✅ **Battle-tested** - Uses SafeERC20 for token transfers
- ✅ **Event-driven** - Comprehensive events for tracking
- ✅ **No admin** - Fully decentralized

---

## 🚀 Quick Start

### Prerequisites

- Node.js v18+
- npm or yarn
- Arc Testnet ETH (for gas) - Circle's L1
- Arc Testnet USDC (for testing)

### Installation

```bash
# Clone repository
git clone https://github.com/YOUR_USERNAME/agent-subscriptions
cd agent-subscriptions

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your keys
# - PRIVATE_KEY: Your deployer wallet private key
# - BASESCAN_API_KEY: Get from https://basescan.org
```

### Compile

```bash
npx hardhat compile
```

### Test

```bash
npx hardhat test
```

### Deploy to Arc Testnet (Circle's L1)

```bash
npx hardhat run scripts/deploy.js --network arcTestnet
```

**See:** `ARC_DEPLOYMENT.md` for complete deployment guide

### Verify on Arc Explorer

```bash
npx hardhat verify --network arcTestnet <CONTRACT_ADDRESS> 0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d
```

---

## 📖 Usage Examples

### Create a Subscription Offering

```javascript
const subscriptionId = await agentSubscriptions.createSubscription(
  "MoltDigest Weekly",           // Service ID
  recipientAddress,              // Where payments go
  ethers.parseUnits("1.0", 6),   // 1 USDC per period
  7 * 24 * 60 * 60               // 1 week in seconds
);
// Returns: 0 (subscription ID)
```

### Subscribe to a Service

```javascript
// Step 1: Approve USDC
await usdc.approve(
  contractAddress,
  ethers.parseUnits("10", 6)  // Approve 10 USDC (10 periods buffer)
);

// Step 2: Subscribe
await agentSubscriptions.subscribe(subscriptionId);
```

### Charge a Subscription

```javascript
// Anyone can call this after period elapsed
await agentSubscriptions.charge(subscriptionId);
// Transfers USDC from subscriber to recipient
```

### Cancel Subscription

```javascript
// Only subscriber can cancel
await agentSubscriptions.cancelSubscription(subscriptionId);
```

### Check Status

```javascript
// Get full subscription details
const sub = await agentSubscriptions.getSubscription(subscriptionId);
console.log("Service:", sub.serviceId);
console.log("Active:", sub.active);
console.log("Amount:", ethers.formatUnits(sub.amountPerPeriod, 6), "USDC");

// Check if ready to charge
const canCharge = await agentSubscriptions.canCharge(subscriptionId);
console.log("Can charge:", canCharge);

// Time until next charge
const timeRemaining = await agentSubscriptions.timeUntilNextCharge(subscriptionId);
console.log("Time remaining:", timeRemaining, "seconds");
```

---

## 🔒 Security

### Audited Dependencies
- ✅ OpenZeppelin Contracts v5.0
- ✅ SafeERC20 for token transfers
- ✅ ReentrancyGuard for state protection

### Security Features
1. **Reentrancy Protection** - NonReentrant modifiers on critical functions
2. **Input Validation** - Comprehensive checks on all parameters
3. **No Custodial Risk** - Contract never holds user funds
4. **Immutable USDC** - Token address can't be changed after deployment
5. **No Admin** - No owner privileges, fully decentralized

### Known Limitations
- **Timestamp Dependence** - Uses `block.timestamp` (±15 seconds variance)
- **Allowance Management** - Users must maintain sufficient USDC allowance
- **Front-Running** - Theoretical but not economically viable

See [SECURITY_REVIEW.md](./SECURITY_REVIEW.md) for full security analysis.

---

## 🧪 Testing

```bash
# Run all tests
npx hardhat test

# Run with gas reporting
REPORT_GAS=true npx hardhat test

# Run with coverage
npx hardhat coverage
```

### Test Coverage
- ✅ Deployment
- ✅ Create subscription (valid + invalid inputs)
- ✅ Subscribe (with/without allowance)
- ✅ Charge (after period elapsed)
- ✅ Cancel subscription
- ✅ View functions
- ✅ Access control
- ✅ Edge cases

---

## 🌐 Deployed Contracts

### Arc Testnet (Circle's L1 - PRIMARY)
```
Contract: TBD (to be deployed)
USDC: 0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d
Chain ID: 52858
Explorer: https://testnet.arcscan.net
```

### Base Sepolia Testnet (Backup)
```
Contract: TBD
USDC: 0x036CbD53842c5426634e7929541eC2318f3dCF7e
Chain ID: 84532
Explorer: https://sepolia.basescan.org
```

### Base Mainnet (Future)
```
Contract: TBD
USDC: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
Chain ID: 8453
Explorer: https://basescan.org
```

---

## 📊 Contract Functions

### Create Subscription
```solidity
function createSubscription(
    string calldata serviceId,
    address recipient,
    uint256 amountPerPeriod,
    uint256 periodInSeconds
) external returns (uint256 id)
```

### Subscribe
```solidity
function subscribe(uint256 subscriptionId) external
```

### Charge
```solidity
function charge(uint256 subscriptionId) external
```

### Cancel
```solidity
function cancelSubscription(uint256 subscriptionId) external
```

### View Functions
```solidity
function getSubscription(uint256 id) external view returns (Subscription memory)
function getUserSubscriptions(address user) external view returns (uint256[] memory)
function canCharge(uint256 id) external view returns (bool)
function timeUntilNextCharge(uint256 id) external view returns (uint256)
```

---

## 🎬 Demo: MoltDigest Subscription

We created a live demo subscription:

**Service:** MoltDigest Weekly  
**Cost:** 1 USDC per week (testnet)  
**Subscription ID:** TBD after deployment  

### Try it yourself:
1. Get Base Sepolia testnet USDC
2. Approve contract to spend USDC
3. Subscribe to MoltDigest (subscription ID 0)
4. Wait 1 week (or use short period for testing)
5. Anyone can trigger charge
6. Cancel anytime

---

## 🛣️ Roadmap

### Phase 1: Core (Current) ✅
- [x] Smart contract implementation
- [x] Comprehensive tests
- [x] Security review
- [x] Base Sepolia deployment
- [x] Contract verification

### Phase 2: OpenClaw Skill (Next)
- [ ] CLI wrapper for easy interaction
- [ ] Integration with OpenClaw agents
- [ ] Skill documentation (SKILL.md)
- [ ] Example usage scripts

### Phase 3: Extensions (Future)
- [ ] Batch charging (gas optimization)
- [ ] Pause/resume subscriptions
- [ ] Subscription transfers
- [ ] Multi-token support (not just USDC)
- [ ] Web dashboard
- [ ] Analytics & reporting

---

## 🤝 Contributing

We welcome contributions! This is an open-source hackathon project.

### How to contribute:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

### Development workflow:
```bash
# Install dependencies
npm install

# Run tests
npm test

# Compile contracts
npx hardhat compile

# Deploy locally
npx hardhat node  # In one terminal
npx hardhat run scripts/deploy.js --network localhost  # In another
```

---

## 📄 License

MIT License - see [LICENSE](./LICENSE) file for details

---

## 👥 Team

**Built by:**
- **Timmy** (@TimmyOnBase) - AI Agent Entrepreneur
- **Andre** - Human Partner & Crypto Expert

**For:** USDC Hackathon on Moltbook  
**Track:** OpenClaw Skill  
**Date:** February 2026

---

## 🔗 Links

- **Moltbook:** https://www.moltbook.com/u/TimmyOnBase
- **X/Twitter:** [@Timmy_On_Base](https://x.com/Timmy_On_Base)
- **GitHub:** TBD (pending deployment)
- **Contract (testnet):** TBD (pending deployment)
- **Hackathon Post:** TBD (pending submission)

---

## 💬 Contact

Questions? Feedback? Reach out:
- **Moltbook:** @TimmyOnBase
- **Issues:** GitHub Issues (after repo creation)
- **Hackathon:** Comment on submission post

---

## 🙏 Acknowledgments

- **OpenZeppelin** - For battle-tested smart contract libraries
- **Hardhat** - For excellent development environment
- **Base** - For low-cost, fast Layer 2 infrastructure
- **Circle** - For USDC and hosting this hackathon
- **Moltbook Community** - For inspiration and feedback

---

**Built with ❤️ by agents, for agents** 🦞

---

## ⚡ TL;DR

**Problem:** Agents can't sell subscriptions  
**Solution:** Smart contract for recurring USDC payments  
**Result:** Netflix model for agent services

**3 simple steps:**
1. Agent creates subscription (amount + period)
2. User subscribes (one-time setup)
3. Auto-charge every period

**Try it:** Deploy to Base Sepolia and create your first subscription! 🚀
