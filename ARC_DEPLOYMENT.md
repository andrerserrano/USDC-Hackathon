# Deploying to Arc Testnet (Circle's L1)

**Network:** Arc Testnet  
**Chain ID:** 52858  
**RPC:** https://testnet.arc.network  
**Explorer:** https://testnet.arcscan.net  
**USDC:** 0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d

---

## Prerequisites

### 1. Get Arc Testnet ETH (for gas)

**Option A: Arc Faucet**
- Visit: https://testnet.arc.network/faucet
- Connect wallet
- Request testnet ETH

**Option B: Discord**
- Join Circle/Arc Discord
- Request testnet ETH in faucet channel

### 2. Get Arc Testnet USDC (for testing)

**USDC Contract:** `0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d`

You can:
- Mint from faucet (if available)
- Request from Circle team
- Use testnet bridge (if available)

---

## Deployment Steps

### 1. Setup Environment

```bash
cd /root/.openclaw/workspace/hackathon/agent-subscriptions

# Create .env file
cp .env.example .env

# Edit .env
nano .env
```

Add:
```
ARC_TESTNET_RPC=https://testnet.arc.network
USDC_ARC_TESTNET=0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d
PRIVATE_KEY=your_private_key_here
```

### 2. Add Arc Testnet to MetaMask

```
Network Name: Arc Testnet
RPC URL: https://testnet.arc.network
Chain ID: 52858
Currency Symbol: ETH
Block Explorer: https://testnet.arcscan.net
```

### 3. Compile Contract

```bash
npx hardhat compile
```

Should output: `Compiled 13 Solidity files successfully`

### 4. Deploy to Arc Testnet

```bash
npx hardhat run scripts/deploy.js --network arcTestnet
```

**Expected output:**
```
🚀 Deploying AgentSubscriptions to arcTestnet
Network: arcTestnet
USDC Address: 0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d
Deployer: 0x...
Deployer balance: 0.xxx ETH

Deploying AgentSubscriptions contract...
✅ AgentSubscriptions deployed to: 0x...
⏳ Waiting for 5 block confirmations...
✅ Confirmed!

🔗 View on Explorer:
https://testnet.arcscan.net/address/0x...
✅ Deployment complete! 🎉
```

**SAVE THE CONTRACT ADDRESS!**

### 5. Verify Contract (if supported)

```bash
npx hardhat verify --network arcTestnet <CONTRACT_ADDRESS> 0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d
```

**Note:** Verification might not be available yet on Arc testnet explorer. That's okay for hackathon!

---

## Post-Deployment Testing

### Create Demo Subscription

```bash
# Open Hardhat console
npx hardhat console --network arcTestnet

# In console:
const AgentSubscriptions = await ethers.getContractFactory("AgentSubscriptions");
const contract = AgentSubscriptions.attach("YOUR_CONTRACT_ADDRESS");

// Create MoltDigest subscription (1 USDC/week)
const tx = await contract.createSubscription(
  "MoltDigest Weekly",
  "YOUR_RECIPIENT_WALLET",
  ethers.parseUnits("1.0", 6),  // 1 USDC
  7 * 24 * 60 * 60  // 1 week in seconds
);
await tx.wait();
console.log("✅ Demo subscription created! ID: 0");
```

### Quick Test (5-minute subscription)

For faster testing:
```javascript
// Create 5-minute test subscription
const tx = await contract.createSubscription(
  "Test Subscription",
  "YOUR_WALLET",
  ethers.parseUnits("0.1", 6),  // 0.1 USDC
  300  // 5 minutes in seconds
);
await tx.wait();
```

---

## Why Arc Testnet?

1. **Circle's Native L1** - Built by the creators of USDC
2. **USDC-Native** - USDC is a first-class citizen
3. **Hackathon Relevance** - Shows deeper Circle integration
4. **Lower Fees** - L1 with optimized USDC operations
5. **Future-Proof** - Circle's long-term platform

---

## Troubleshooting

### Issue: Can't get Arc testnet ETH
**Solution:**
- Check Arc faucet: https://testnet.arc.network/faucet
- Ask in Circle Discord
- Or deploy to Base Sepolia as backup: `--network baseSepolia`

### Issue: Can't get Arc testnet USDC
**Solution:**
- Request from Circle team in Discord
- For demo, you can create subscription but might not be able to test charging without USDC
- Documentation alone is sufficient for hackathon submission

### Issue: Verification fails
**Solution:**
- Arc testnet verification might not be available yet
- Deployment alone is sufficient - you can show:
  - Deployment transaction hash
  - Contract address on Arc explorer
  - Contract works (create subscription proves it)

### Issue: RPC connection problems
**Solution:**
- Try alternative RPC if available
- Fall back to Base Sepolia: `npx hardhat run scripts/deploy.js --network baseSepolia`

---

## Deployment Checklist

Before deployment:
- [ ] Arc testnet ETH in wallet (~0.01 ETH)
- [ ] Private key in .env
- [ ] Compilation successful
- [ ] Arc testnet added to MetaMask

After deployment:
- [ ] Contract address saved
- [ ] Verified on Arc explorer (or attempted)
- [ ] Demo subscription created
- [ ] Transaction hash recorded
- [ ] Screenshots taken

---

## Resources

- **Arc Network:** https://www.arc.network
- **Arc Testnet Explorer:** https://testnet.arcscan.net
- **Circle Docs:** https://developers.circle.com
- **Arc Discord:** (Check Circle Discord for Arc channels)
- **USDC Contract:** 0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d

---

**Ready to deploy!** 🚀

Once deployed, share the contract address and we'll build the OpenClaw skill next!
