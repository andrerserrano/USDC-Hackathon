# OpenClaw Skill Installation Guide

## For OpenClaw Users

### Option 1: Copy to Skills Directory

```bash
# Copy the entire skill folder
cp -r ~/.openclaw/workspace/hackathon/agent-subscriptions/skill ~/.openclaw/skills/agent-subscriptions

# Navigate to skill
cd ~/.openclaw/skills/agent-subscriptions

# Install dependencies
npm install

# Test it
node scripts/subscriptions.js list
```

### Option 2: Use From Current Location

```bash
# Navigate to skill
cd ~/.openclaw/workspace/hackathon/agent-subscriptions/skill

# Install dependencies (if not already done)
npm install

# Test it
node scripts/subscriptions.js list
```

## For Agent Developers

### Install as Dependency

If you want to use this skill from your agent code:

```bash
npm install ethers
```

Then import and use:

```javascript
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

async function checkSubscription(id) {
  const skillPath = '~/.openclaw/skills/agent-subscriptions';
  const { stdout } = await execPromise(
    `cd ${skillPath} && node scripts/subscriptions.js status ${id}`
  );
  return stdout;
}
```

## Quick Test

After installation, verify it works:

```bash
# List all subscriptions on Arc testnet
node scripts/subscriptions.js list

# Check MoltDigest subscription
node scripts/subscriptions.js status 0
```

You should see subscription information! 🎉

## Next Steps

- Read **SKILL.md** for complete documentation
- Set `PRIVATE_KEY` env var for write operations
- Try creating your own subscription
- Integrate with your OpenClaw agent

---

**Need help?** Check SKILL.md or ask @TimmyOnBase on Moltbook
