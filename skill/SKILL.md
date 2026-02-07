# Agent Subscriptions - OpenClaw Skill

**Recurring USDC payments for AI agent services**

Enable agents to create, manage, and charge subscription-based services using USDC on Arc Testnet.

---

## 🎯 What This Skill Does

This skill lets agents interact with the AgentSubscriptions smart contract to:
- **Create subscription offerings** - Set up recurring payment services
- **Subscribe to services** - Sign up for agent-provided subscriptions  
- **Charge subscriptions** - Trigger periodic payments when due
- **Manage subscriptions** - Check status, cancel, and list offerings
- **Handle USDC approvals** - Automatic approval management

Perfect for agents selling:
- 📊 Analytics subscriptions
- 🔔 Monitoring & alerting services
- 📡 Data feeds & APIs
- 💬 Premium support tiers
- 📰 Newsletter subscriptions (like MoltDigest!)

---

## 🚀 Quick Start

### Installation

```bash
# Clone or copy the skill to your OpenClaw skills directory
mkdir -p ~/.openclaw/skills/agent-subscriptions
cp -r skill/* ~/.openclaw/skills/agent-subscriptions/

# Install dependencies
cd ~/.openclaw/skills/agent-subscriptions
npm install ethers
```

### Configuration

The skill is pre-configured for Arc Testnet:
- **Contract:** `0xe3740beE2F2F3a45C72380722643D152a3dF4A07`
- **Network:** Arc Testnet (Chain ID: 5042002)
- **USDC:** `0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d`
- **Explorer:** https://testnet.arcscan.app

### Set Your Private Key

For write operations (create, subscribe, charge, cancel):

```bash
export PRIVATE_KEY=your_private_key_here
```

Or use in-line:
```bash
PRIVATE_KEY=0x... node scripts/subscriptions.js create ...
```

---

## 📖 Commands

### List All Subscriptions

View all available subscription offerings:

```bash
node scripts/subscriptions.js list
```

**Output:**
```
📋 All Subscriptions
ID 0: MoltDigest Weekly - 1.0 USDC/7d ✅ Active
ID 1: Analytics Pro - 5.0 USDC/30d ⭕ Available
```

---

### Get Subscription Status

Check detailed information about a specific subscription:

```bash
node scripts/subscriptions.js status <id>
```

**Example:**
```bash
node scripts/subscriptions.js status 0
```

**Output:**
```
📊 Subscription 0 Status
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🏷️  Service: MoltDigest Weekly
👤 Owner: 0x1234...
💰 Recipient: 0x5678...
💵 Amount: 1.0 USDC per period
⏰ Period: 7d 0h
📅 Created: 2026-02-07T...

👥 Subscriber: 0xabcd...
✅ Active: true
🕐 Last charge: 2026-02-07T...

💸 Can charge: ❌ NO
   Time until next charge: 6d 23h

🔗 View on Explorer: https://testnet.arcscan.app/address/0xe3740bee...
```

---

### Create Subscription Offering

Agents can create new subscription offerings:

```bash
PRIVATE_KEY=0x... node scripts/subscriptions.js create \
  "<serviceId>" \
  "<recipientAddress>" \
  <amountInUSDC> \
  <periodInSeconds>
```

**Example: Weekly Newsletter**
```bash
PRIVATE_KEY=0x... node scripts/subscriptions.js create \
  "AI News Weekly" \
  "0x1234567890123456789012345678901234567890" \
  2.5 \
  604800
```

**Example: Monthly Analytics**
```bash
PRIVATE_KEY=0x... node scripts/subscriptions.js create \
  "Premium Analytics" \
  "0x1234567890123456789012345678901234567890" \
  10.0 \
  2592000
```

**Common periods:**
- 1 minute: `60`
- 5 minutes: `300`
- 1 hour: `3600`
- 1 day: `86400`
- 1 week: `604800`
- 1 month (30 days): `2592000`
- 1 year: `31536000`

**Output:**
```
📋 Creating subscription: AI News Weekly
   Recipient: 0x1234...
   Amount: 2.5 USDC per period
   Period: 7d 0h

⏳ Transaction sent: 0xabcd...
✅ Subscription created!
   Block: 12345
   Explorer: https://testnet.arcscan.app/tx/0xabcd...

📋 Subscription ID: 1
```

---

### Subscribe to a Service

Subscribe to an existing offering:

```bash
PRIVATE_KEY=0x... node scripts/subscriptions.js subscribe <id>
```

**Example:**
```bash
PRIVATE_KEY=0x... node scripts/subscriptions.js subscribe 0
```

**What happens:**
1. Fetches subscription details
2. Checks your USDC allowance
3. Approves USDC if needed (10x amount for buffer)
4. Subscribes to the service

**Output:**
```
📝 Subscribing to subscription 0

   Service: MoltDigest Weekly
   Amount: 1.0 USDC
   Period: 7d 0h

   Current allowance: 0.0 USDC
   ⚠️  Insufficient allowance, approving USDC...
   ⏳ Approval tx: 0x1234...
   ✅ USDC approved

⏳ Transaction sent: 0x5678...
✅ Subscribed successfully!
   Explorer: https://testnet.arcscan.app/tx/0x5678...
```

**Note:** You'll need Arc testnet USDC in your wallet!

---

### Charge a Subscription

Trigger payment for a subscription when the period has elapsed:

```bash
PRIVATE_KEY=0x... node scripts/subscriptions.js charge <id>
```

**Example:**
```bash
PRIVATE_KEY=0x... node scripts/subscriptions.js charge 0
```

**Output (if ready):**
```
💸 Charging subscription 0

⏳ Transaction sent: 0xabcd...
✅ Subscription charged!
   Explorer: https://testnet.arcscan.app/tx/0xabcd...
```

**Output (if not ready):**
```
💸 Charging subscription 0

⏰ Not ready yet. Time remaining: 6d 23h
```

**Important:** Anyone can call `charge` - this enables cron jobs and third-party charging services!

---

### Cancel Subscription

Cancel an active subscription:

```bash
PRIVATE_KEY=0x... node scripts/subscriptions.js cancel <id>
```

**Example:**
```bash
PRIVATE_KEY=0x... node scripts/subscriptions.js cancel 0
```

**Output:**
```
❌ Canceling subscription 0

⏳ Transaction sent: 0x1234...
✅ Subscription canceled!
   Explorer: https://testnet.arcscan.app/tx/0x1234...
```

**Note:** Only the subscriber can cancel their own subscription.

---

### My Subscriptions

List all subscriptions for your address:

```bash
# Using PRIVATE_KEY env var
PRIVATE_KEY=0x... node scripts/subscriptions.js my

# Or specify an address
node scripts/subscriptions.js my 0x1234567890123456789012345678901234567890
```

**Output:**
```
📋 Subscriptions for 0x1234...

ID 0: MoltDigest Weekly - 1.0 USDC/7d ✅ Active
ID 2: Analytics Pro - 5.0 USDC/30d ❌ Canceled
```

---

## 🤖 Using in OpenClaw Agents

### Example: Check if MoltDigest charge is due

```javascript
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

async function checkMoltDigestCharge() {
  // Check if subscription 0 can be charged
  const { stdout } = await execPromise(
    'cd ~/.openclaw/skills/agent-subscriptions && node scripts/subscriptions.js status 0'
  );
  
  if (stdout.includes('Can charge: ✅ YES')) {
    console.log('MoltDigest subscription ready to charge!');
    
    // Charge it
    await execPromise(
      'cd ~/.openclaw/skills/agent-subscriptions && ' +
      'PRIVATE_KEY=$PRIVATE_KEY node scripts/subscriptions.js charge 0'
    );
    
    console.log('✅ MoltDigest subscription charged!');
  } else {
    console.log('Not time to charge yet');
  }
}

// Run this in a cron job or heartbeat
checkMoltDigestCharge();
```

### Example: Create subscription for your service

```javascript
async function createMySubscription() {
  const { exec } = require('child_process');
  
  // Create weekly analytics subscription
  const result = await exec(
    'cd ~/.openclaw/skills/agent-subscriptions && ' +
    `PRIVATE_KEY=${process.env.PRIVATE_KEY} node scripts/subscriptions.js create ` +
    '"Weekly Analytics Report" ' +
    '0x1234567890123456789012345678901234567890 ' +
    '2.0 ' +
    '604800'
  );
  
  console.log('Subscription created!', result.stdout);
}
```

---

## 🔐 Security Best Practices

### Private Key Storage

**Never hardcode private keys!** Use environment variables:

```bash
# Add to ~/.bashrc or ~/.zshrc
export PRIVATE_KEY=0x...

# Or use a .env file (never commit!)
echo "PRIVATE_KEY=0x..." > .env
```

### USDC Allowances

- The skill approves 10x the subscription amount for convenience
- You can manually approve exact amounts if preferred
- Revoke allowances when done: `usdc.approve(contractAddress, 0)`

### Only Charge When Ready

The contract enforces:
- Subscription must be active
- Period must have elapsed
- Subscriber must have sufficient USDC balance and allowance

Failed charges simply revert - no damage done!

---

## 🌐 Network Information

### Arc Testnet

- **Chain ID:** 5042002
- **RPC:** https://testnet.arc.network
- **Explorer:** https://testnet.arcscan.app
- **Faucet:** https://testnet.arc.network/faucet (check if available)

### Deployed Contract

- **AgentSubscriptions:** `0xe3740beE2F2F3a45C72380722643D152a3dF4A07`
- **USDC Token:** `0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d`
- **Deployer:** [Your address]
- **Verified Source:** https://testnet.arcscan.app/address/0xe3740beE2F2F3a45C72380722643D152a3dF4A07

### Add Arc Testnet to MetaMask

```
Network Name: Arc Testnet
RPC URL: https://testnet.arc.network
Chain ID: 5042002
Currency Symbol: ETH
Block Explorer: https://testnet.arcscan.app
```

---

## 💡 Use Cases

### For Service-Providing Agents

1. **Newsletter Subscriptions**
   - Create: "Weekly AI Digest" @ 1 USDC/week
   - Agents charge subscribers automatically
   - Deliver content when payment confirmed

2. **Monitoring Services**
   - Create: "24/7 Server Monitoring" @ 5 USDC/month
   - Charge monthly
   - Pause monitoring if subscription canceled

3. **API Access Tiers**
   - Create: "Premium API Access" @ 10 USDC/month
   - Check subscription status before serving requests
   - Rate-limit non-subscribers

4. **Data Feeds**
   - Create: "Real-time Market Data" @ 2 USDC/week
   - Stream data only to active subscribers
   - Auto-cutoff when subscription expires

### For Subscriber Agents

1. **Subscribe to premium services**
2. **Manage recurring expenses**
3. **Cancel anytime (no lock-in)**
4. **Track subscription spending**

### For Cron Job Operators

1. **Run automated charging service**
2. **Charge all due subscriptions on schedule**
3. **Earn gas cost reimbursement** (future feature)
4. **Help keep the subscription economy flowing**

---

## 🛠️ Troubleshooting

### "Insufficient USDC allowance"

**Solution:** The script auto-approves USDC. If it fails:
1. Check you have Arc testnet USDC
2. Verify USDC address is correct
3. Manually approve: `usdc.approve(contractAddress, amount)`

### "Billing period not elapsed"

**Solution:** Wait until the period has passed. Check with:
```bash
node scripts/subscriptions.js status <id>
```

### "Only subscriber can cancel"

**Solution:** You can only cancel subscriptions you're subscribed to. Use the same wallet that subscribed.

### "PRIVATE_KEY environment variable required"

**Solution:** Set it before running:
```bash
export PRIVATE_KEY=0x...
# or
PRIVATE_KEY=0x... node scripts/subscriptions.js ...
```

### Can't connect to Arc Testnet

**Solution:**
- Check RPC URL is correct
- Verify Arc testnet is online
- Try alternative RPC if available

---

## 📦 Package Information

### Dependencies

```json
{
  "dependencies": {
    "ethers": "^6.9.0"
  }
}
```

Install:
```bash
npm install ethers
```

### File Structure

```
agent-subscriptions/
├── SKILL.md          # This file
├── config.json       # Network configuration
├── abi.json          # Contract ABI
└── scripts/
    └── subscriptions.js  # Main helper script
```

---

## 🎓 Examples

### Complete Workflow: Create → Subscribe → Charge

```bash
# 1. Create a subscription offering
PRIVATE_KEY=0x... node scripts/subscriptions.js create \
  "Test Service" \
  "0x1234567890123456789012345678901234567890" \
  0.1 \
  300  # 5 minutes for testing

# Output: Subscription ID: 1

# 2. Subscribe (from different wallet)
PRIVATE_KEY=0x... node scripts/subscriptions.js subscribe 1

# 3. Wait 5 minutes...

# 4. Charge the subscription (anyone can do this)
PRIVATE_KEY=0x... node scripts/subscriptions.js charge 1

# 5. Check status
node scripts/subscriptions.js status 1
```

### Demo: MoltDigest Subscription

The contract already has a demo subscription:

```bash
# Check status
node scripts/subscriptions.js status 0

# Subscribe to MoltDigest
PRIVATE_KEY=0x... node scripts/subscriptions.js subscribe 0

# After 1 week, charge it
PRIVATE_KEY=0x... node scripts/subscriptions.js charge 0
```

---

## 🏆 Why This Matters

**Before:** Agents can only do one-time payments  
**After:** Agents can sell recurring services like real SaaS businesses

**Before:** Manual invoicing every period  
**After:** Automated charging when period elapses

**Before:** Trust-based payment promises  
**After:** Cryptographically enforced payment logic

**This unlocks the SaaS business model for AI agents.** 🚀

---

## 📝 License

MIT License - see contract repository for details

---

## 🔗 Links

- **Contract:** https://testnet.arcscan.app/address/0xe3740beE2F2F3a45C72380722643D152a3dF4A07
- **GitHub:** [Your repo URL]
- **Hackathon:** USDC Hackathon on Moltbook
- **Built by:** Timmy (@TimmyOnBase) & Andre

---

## 💬 Support

Questions? Issues?
- Check the smart contract SECURITY_REVIEW.md
- Review the main README.md
- Open an issue on GitHub
- Ask on Moltbook: @TimmyOnBase

---

**Built for the USDC Hackathon on Moltbook** 🦞

**Making AI agent subscriptions real** 🚀
