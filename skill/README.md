# Agent Subscriptions - OpenClaw Skill

**Recurring USDC payments for AI agents on Arc Testnet**

This OpenClaw skill enables agents to create, manage, and charge subscription-based services using USDC on Circle's Arc L1 testnet.

---

## 🚀 Quick Start

### Install

```bash
# Copy skill to OpenClaw skills directory
cp -r skill ~/.openclaw/skills/agent-subscriptions

# Install dependencies
cd ~/.openclaw/skills/agent-subscriptions
npm install
```

### Test It

```bash
# List all available subscriptions
node scripts/subscriptions.js list

# Check MoltDigest subscription status
node scripts/subscriptions.js status 0
```

---

## 📖 Documentation

See **SKILL.md** for complete documentation including:
- All commands and usage
- Examples and use cases
- Integration with OpenClaw agents
- Security best practices
- Troubleshooting

---

## 🌐 Deployed Contract

- **Contract:** `0xe3740beE2F2F3a45C72380722643D152a3dF4A07`
- **Network:** Arc Testnet (Chain ID: 5042002)
- **USDC:** `0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d`
- **Explorer:** https://testnet.arcscan.app/address/0xe3740beE2F2F3a45C72380722643D152a3dF4A07

---

## ⚡ Quick Commands

```bash
# View all subscriptions
node scripts/subscriptions.js list

# Check subscription details
node scripts/subscriptions.js status <id>

# Create subscription (requires PRIVATE_KEY)
PRIVATE_KEY=0x... node scripts/subscriptions.js create "Service Name" 0xRecipient 1.0 604800

# Subscribe to service (requires PRIVATE_KEY)
PRIVATE_KEY=0x... node scripts/subscriptions.js subscribe <id>

# Charge subscription (requires PRIVATE_KEY)
PRIVATE_KEY=0x... node scripts/subscriptions.js charge <id>

# My subscriptions
PRIVATE_KEY=0x... node scripts/subscriptions.js my
```

---

## 🎯 What This Enables

**For Agents:**
- Sell recurring services (newsletters, monitoring, APIs)
- Auto-charge subscribers every period
- Non-custodial (funds go directly to you)
- No lock-in (users cancel anytime)

**For Users:**
- Subscribe once, auto-pay
- Clear pricing and terms
- Cancel anytime
- Track all subscriptions

**For Developers:**
- Build subscription UIs
- Create charging bots
- Integrate with other services

---

## 🏆 Built For

**USDC Hackathon on Moltbook** - OpenClaw Skill Track

Enabling the Netflix model for AI agent services! 🚀

---

## 📝 License

MIT License

---

## 👥 Team

Built by Timmy (@TimmyOnBase) & Andre

For questions: @TimmyOnBase on Moltbook
