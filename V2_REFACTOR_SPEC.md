# AgentSubscriptions v2.0 - 1-to-Many Architecture Refactor

**Status:** Design Review  
**Author:** Timmy  
**Date:** 2026-02-08  
**Reviewer:** Andre  

---

## Executive Summary

**Problem:** Current v1 has 1-to-1 subscription model (one subscriber per offering). This blocks real SaaS use cases.

**Solution:** Refactor to 1-to-many model (one offering, multiple subscribers).

**Impact:** Breaking changes to contract, tests, and skill. Full redeployment required.

**Effort:** ~5.5 hours total (expanded scope with all features)

---

## Current Architecture (v1)

```solidity
struct Subscription {
    uint256 id;
    string serviceId;
    address owner;
    address recipient;
    uint256 amountPerPeriod;
    uint256 periodInSeconds;
    uint256 lastChargeTime;
    address subscriber;        // ← Single subscriber
    bool active;
    uint256 createdAt;
}

mapping(uint256 => Subscription) public subscriptions;
```

**Problem:** `subscriber` field is a single address, not an array/mapping.

---

## Proposed Architecture (v2)

### **1. Split into Two Concepts**

**SubscriptionOffering** (what agents sell):
```solidity
struct SubscriptionOffering {
    uint256 id;
    string serviceId;
    address owner;              // Agent who created it
    address recipient;          // Where payments go
    uint256 amountPerPeriod;    // Cost per period (USDC)
    uint256 periodInSeconds;    // Billing cycle length
    uint256 createdAt;
    bool active;                // Owner can pause/unpause offering
    uint256 totalSubscribers;   // Count of active subscribers
}
```

**UserSubscription** (individual subscription instance):
```solidity
struct UserSubscription {
    uint256 offeringId;         // Which offering they subscribed to
    address subscriber;         // Who subscribed
    uint256 startTime;          // When they subscribed
    uint256 lastChargeTime;     // Last successful charge
    bool active;                // Is this subscription active?
    uint256 totalPaid;          // Lifetime amount paid (new!)
    uint256 chargeCount;        // Number of successful charges (new!)
}
```

### **2. New State Variables**

```solidity
// Offerings
uint256 public offeringCount;
mapping(uint256 => SubscriptionOffering) public offerings;

// User subscriptions (offeringId => subscriber => subscription data)
mapping(uint256 => mapping(address => UserSubscription)) public subscriptions;

// Track what a user is subscribed to
mapping(address => uint256[]) public userOfferingIds;
```

---

## Function Changes

### **Create Offering** (renamed from createSubscription)

**Before:**
```solidity
function createSubscription(
    string calldata serviceId,
    address recipient,
    uint256 amountPerPeriod,
    uint256 periodInSeconds
) external returns (uint256 id)
```

**After:**
```solidity
function createOffering(
    string calldata serviceId,
    address recipient,
    uint256 amountPerPeriod,
    uint256 periodInSeconds
) external returns (uint256 id)
```

**Changes:**
- Renamed for clarity
- Returns offering ID (not subscription ID)
- No change to parameters

---

### **Subscribe**

**Before:**
```solidity
function subscribe(uint256 subscriptionId) external nonReentrant
// Checks: sub.subscriber == address(0) (only one subscriber allowed)
```

**After:**
```solidity
function subscribe(uint256 offeringId) external nonReentrant
// Checks: subscriptions[offeringId][msg.sender].active == false (user not already subscribed)
```

**Changes:**
- Parameter renamed: `subscriptionId` → `offeringId`
- Check changes: No longer checking if offering has A subscriber, check if THIS user already subscribed
- Creates new `UserSubscription` in nested mapping

---

### **Charge**

**Before:**
```solidity
function charge(uint256 subscriptionId) external nonReentrant
// Operates on single subscription
```

**After:**
```solidity
function charge(uint256 offeringId, address subscriber) external nonReentrant
// Operates on specific user's subscription to an offering
```

**Changes:**
- Now requires TWO parameters: which offering, which subscriber
- Looks up `subscriptions[offeringId][subscriber]`
- Updates `totalPaid` and `chargeCount` metrics

**Alternative (batch charging):**
```solidity
function chargeAll(uint256 offeringId) external nonReentrant returns (uint256 charged)
// Charge all subscribers who are ready (gas-intensive, optional)
```

---

### **Cancel**

**Before:**
```solidity
function cancelSubscription(uint256 subscriptionId) external
// Only subscriber can cancel
```

**After:**
```solidity
function cancelSubscription(uint256 offeringId) external
// msg.sender cancels their own subscription
```

**Changes:**
- Now implicitly uses `msg.sender` as the subscriber
- Looks up `subscriptions[offeringId][msg.sender]`

**New function (owner control):**
```solidity
function pauseOffering(uint256 offeringId) external
function unpauseOffering(uint256 offeringId) external
// Owner can pause/unpause entire offering (stops new subscriptions, existing continue)
```

---

### **View Functions**

**Before:**
```solidity
function getSubscription(uint256 subscriptionId) external view returns (Subscription memory)
function getUserSubscriptions(address user) external view returns (uint256[] memory)
function canCharge(uint256 subscriptionId) external view returns (bool)
function timeUntilNextCharge(uint256 subscriptionId) external view returns (uint256)
```

**After:**
```solidity
// Get offering details
function getOffering(uint256 offeringId) external view returns (SubscriptionOffering memory)

// Get user's subscription to an offering
function getUserSubscription(uint256 offeringId, address user) external view returns (UserSubscription memory)

// Get all offerings a user is subscribed to
function getUserOfferingIds(address user) external view returns (uint256[] memory)

// Get all subscribers for an offering (Decision 1 - gas intensive for large arrays)
function getOfferingSubscribers(uint256 offeringId) external view returns (address[] memory)

// Get count of active subscribers (cheaper than full array)
function getOfferingSubscriberCount(uint256 offeringId) external view returns (uint256)

// Check if user can be charged
function canCharge(uint256 offeringId, address subscriber) external view returns (bool)

// Time until user's next charge
function timeUntilNextCharge(uint256 offeringId, address subscriber) external view returns (uint256)

// Batch check: get all subscribers ready to charge (Decision 3 helper)
function getChargableSubscribers(uint256 offeringId) external view returns (address[] memory)
```

---

## Event Changes

**Before:**
```solidity
event SubscriptionCreated(uint256 indexed id, string serviceId, address indexed owner, address indexed recipient, uint256 amountPerPeriod, uint256 periodInSeconds);
event UserSubscribed(uint256 indexed subscriptionId, address indexed subscriber, uint256 timestamp);
event SubscriptionCharged(uint256 indexed subscriptionId, address indexed subscriber, address indexed recipient, uint256 amount, uint256 timestamp);
event SubscriptionCanceled(uint256 indexed subscriptionId, address indexed subscriber, uint256 timestamp);
```

**After:**
```solidity
event OfferingCreated(uint256 indexed offeringId, string serviceId, address indexed owner, address indexed recipient, uint256 amountPerPeriod, uint256 periodInSeconds);
event UserSubscribed(uint256 indexed offeringId, address indexed subscriber, uint256 timestamp);
event SubscriptionCharged(uint256 indexed offeringId, address indexed subscriber, address indexed recipient, uint256 amount, uint256 timestamp);
event SubscriptionCanceled(uint256 indexed offeringId, address indexed subscriber, uint256 timestamp);
event OfferingPaused(uint256 indexed offeringId, uint256 timestamp);
event OfferingUnpaused(uint256 indexed offeringId, uint256 timestamp);
event OfferingCanceled(uint256 indexed offeringId, address indexed owner, uint256 subscriberCount, uint256 timestamp);
event BatchChargeCompleted(uint256 indexed offeringId, uint256 successCount, uint256 failCount, uint256 timestamp);
```

**Changes:**
- Renamed: `SubscriptionCreated` → `OfferingCreated`
- All events now use `offeringId` parameter name
- New events for pause/unpause

---

## Edge Cases to Handle

### **1. Double Subscription Prevention**
```solidity
require(subscriptions[offeringId][msg.sender].active == false, "Already subscribed");
```

### **2. Subscriber Array Tracking (IMPLEMENTED per Decision 1)**
We'll store `mapping(uint256 => address[]) private offeringSubscribers;`
- Subscribe: Push to array (~20k gas)
- Cancel: Swap with last element, pop (~15k gas)
- Trade-off: Higher gas per operation, but enables getOfferingSubscribers()

### **3. Pause/Unpause Logic (IMPLEMENTED per Decision 2)**
- Paused offering (`active = false`):
  - No new subscriptions allowed
  - No charges allowed (existing subscribers protected)
  - Ethical: users don't pay for service they're not receiving
- Unpause: Resume all functionality
- Cancel offering: Permanently shut down + cancel all subscriptions (Decision 5)

### **4. Allowance Management**
No change - users still need sufficient USDC allowance.

### **5. Charge Failure Scenarios**
- User's allowance runs out: `charge()` reverts (as before)
- User cancels between check and charge: Handled by `require(active)`
- No changes needed from v1

---

## Gas Analysis

**Current (v1):**
- Create: ~150k gas
- Subscribe: ~120k gas
- Charge: ~80k gas
- Cancel: ~50k gas

**Expected (v2 with all features):**
- Create offering: ~160k gas (+10k for extra struct field)
- Subscribe: ~160k gas (+40k for nested mapping + subscriber array push)
- Charge: ~90k gas (+10k for metric updates)
- Cancel: ~70k gas (+20k for subscriber array removal + nested mapping)
- ChargeAll: ~80-90k per subscriber (linear scaling)
- CancelOffering: ~50k per subscriber + overhead

**Tradeoff:** Slightly higher gas per operation, but enables unlimited subscribers (amortizes quickly).

---

## Migration Path

### **Option A: Fresh Deployment**
- Deploy new v2 contract
- Users migrate manually
- Old v1 contract remains (no cancellation needed)
- **Recommended for testnet**

### **Option B: Upgrade Pattern**
- Use proxy pattern (TransparentUpgradeableProxy)
- More complex, requires careful state migration
- **Overkill for hackathon project**

**Recommendation:** Option A. Fresh deployment. This is a breaking change anyway.

---

## Breaking Changes Summary

### **Smart Contract**
- [x] Function signatures changed (`subscriptionId` → `offeringId`)
- [x] `charge()` now requires subscriber parameter
- [x] Event names changed
- [x] Storage layout completely different

### **Tests (test/AgentSubscriptions.test.js)**
- [x] Update all function calls
- [x] Update event assertions
- [x] Add multi-subscriber test cases
- [x] Test pause/unpause functionality
- [x] Test edge cases (double subscribe, etc.)

### **Deployment Script (scripts/deploy.js)**
- [ ] No changes needed (constructor unchanged)

### **Skill CLI (skill/scripts/subscriptions.js)**
- [x] Update all contract calls
- [x] Update parameter names in CLI
- [x] Handle new multi-subscriber model in display
- [x] Add `pause`/`unpause` commands

### **Documentation**
- [x] README.md examples
- [x] SKILL.md instructions
- [x] Update architecture diagrams

---

## Implementation Checklist

### **Phase 1: Contract Refactor** (120 minutes - expanded scope)
- [ ] Update Subscription struct → SubscriptionOffering + UserSubscription
- [ ] Add metrics fields (totalPaid, chargeCount) to UserSubscription
- [ ] Update mappings (add subscriber array storage)
- [ ] Refactor createSubscription → createOffering
- [ ] Refactor subscribe() for multi-subscriber + array tracking
- [ ] Refactor charge() with subscriber parameter + pause check + metrics update
- [ ] Add chargeAll() function for batch charging
- [ ] Refactor cancel() for nested mapping + array removal
- [ ] Add pause/unpause functions (halt charging behavior)
- [ ] Add cancelOffering() function
- [ ] Update all view functions
- [ ] Add getOfferingSubscribers(), getChargableSubscribers(), etc.
- [ ] Update events (add BatchChargeCompleted, OfferingCanceled)
- [ ] Add comprehensive NatSpec comments

### **Phase 2: Tests** (90 minutes - expanded scope)
- [ ] Update existing tests for new function signatures
- [ ] Add multi-subscriber scenarios:
  - [ ] 2+ users subscribe to same offering
  - [ ] Charge one user, not the other
  - [ ] Cancel doesn't affect other subscribers
  - [ ] Verify subscriber array tracking
- [ ] Test pause/unpause:
  - [ ] Paused offering blocks new subscriptions
  - [ ] Paused offering blocks charging (Decision 2)
  - [ ] Unpause resumes functionality
- [ ] Test batch charging (chargeAll):
  - [ ] Multiple subscribers charged successfully
  - [ ] Partial failures handled correctly
  - [ ] Event emissions for each charge
- [ ] Test metrics tracking:
  - [ ] totalPaid increments correctly
  - [ ] chargeCount increments correctly
- [ ] Test cancelOffering:
  - [ ] Only owner can cancel
  - [ ] All subscriptions deactivated
  - [ ] Events emitted correctly
- [ ] Test edge cases:
  - [ ] Double subscribe attempt
  - [ ] Charge non-subscribed user
  - [ ] Charge paused offering
  - [ ] Cancel offering with 0 subscribers
  - [ ] getOfferingSubscribers() with many subscribers
- [ ] Verify gas usage for new operations

### **Phase 3: Skill Update** (60 minutes)
- [ ] Update subscriptions.js CLI
- [ ] Rename commands: create → createOffering
- [ ] Update command parsing (subscriptionId → offeringId)
- [ ] Update display formatting for multi-subscriber model
- [ ] Add new commands:
  - [ ] pause <offeringId>
  - [ ] unpause <offeringId>
  - [ ] chargeAll <offeringId>
  - [ ] cancelOffering <offeringId>
  - [ ] subscribers <offeringId> (list all subscribers)
  - [ ] metrics <offeringId> <subscriber> (show totalPaid, chargeCount)
- [ ] Test manually against testnet

### **Phase 4: Documentation** (45 minutes)
- [ ] Update README.md
- [ ] Update SKILL.md
- [ ] Update architecture diagram
- [ ] Write migration guide (v1 → v2)
- [ ] Update example code

### **Phase 5: Testing & Validation** (30 minutes)
- [ ] Run full test suite
- [ ] Deploy to local hardhat network
- [ ] Test CLI against local deployment
- [ ] Deploy to testnet
- [ ] Smoke test on testnet

---

## Risks & Mitigations

### **Risk 1: Gas costs increase significantly**
- **Likelihood:** Medium (subscriber array adds 20-40k per operation)
- **Impact:** Medium
- **Mitigation:** Gas analysis shows 20-40k increase per operation. Acceptable for multi-subscriber model. Alternative: implement without subscriber array tracking (Decision 1 drives this cost)

### **Risk 2: Bugs in nested mapping logic**
- **Likelihood:** Medium
- **Impact:** High
- **Mitigation:** Comprehensive tests, especially edge cases

### **Risk 3: Breaking changes confuse users**
- **Likelihood:** High
- **Impact:** Low (testnet only so far)
- **Mitigation:** Clear migration guide, maintain v1 contract

### **Risk 4: Timeline slip (5.5 hours → 7+ hours)**
- **Likelihood:** Medium (expanded scope)
- **Impact:** Low (no deadline pressure post-hackathon)
- **Mitigation:** Prioritize contract + tests, defer docs if needed

### **Risk 5: cancelOffering() gas limit with many subscribers**
- **Likelihood:** Low (testnet unlikely to hit limits)
- **Impact:** High (function would be unusable for popular offerings)
- **Mitigation:** 
  - Document gas limits in function comments
  - Alternative: Batch cancellation (cancel N subscribers per tx)
  - Or: Only mark offering as canceled, let subscribers cancel individually

---

## Success Criteria

- [x] Contract compiles without errors
- [x] All tests pass
- [x] Gas usage within acceptable range (+20% max)
- [x] Multi-subscriber scenarios work
- [x] CLI functions correctly
- [x] Documentation updated
- [x] Deployed to testnet successfully

---

## Decisions (Andre - 2026-02-08)

1. **getOfferingSubscribers() function** - ✅ YES - Implement it. Useful for dashboards despite gas cost.

2. **Pause behavior** - ✅ HALT ALL - When offering is paused, stop charging all subscribers. Users shouldn't pay if they're not getting the service. Fair and ethical.

3. **Batch charge** - ✅ YES - Add `chargeAll(offeringId)` for efficient cron job charging.

4. **Metrics** - ✅ YES - Track `totalPaid` and `chargeCount` per user. Analytics are valuable.

5. **Offering cancellation** - ✅ YES - Add `cancelOffering(offeringId)` to shut down offering and cancel all active subscriptions.

---

## Implementation Implications

### **Decision 1: getOfferingSubscribers()**
**Requires:** Array storage to track subscribers per offering
```solidity
mapping(uint256 => address[]) private offeringSubscribers;
```
- Add subscriber to array on subscribe()
- Remove from array on cancel() (swap & pop for gas efficiency)
- Warning in docs: Gas-intensive for offerings with many subscribers

### **Decision 2: Pause Halts Charging**
**Requires:** Check offering.active in charge() and chargeAll()
```solidity
require(offerings[offeringId].active, "Offering is paused");
```
- More user-friendly than v1 behavior
- Ethical: no payment without service

### **Decision 3: Batch Charging**
**New function:**
```solidity
function chargeAll(uint256 offeringId) external nonReentrant returns (uint256 successCount, uint256 failCount)
```
- Loop through all subscribers
- Try to charge each (continue on failure)
- Return success/fail counts
- Emit events for each charge
- Gas cost: ~80k per subscriber + overhead

### **Decision 4: Metrics Tracking**
**Adds to UserSubscription struct:**
```solidity
uint256 totalPaid;    // Cumulative USDC paid
uint256 chargeCount;  // Number of successful charges
```
- Update both on every successful charge
- Useful for: LTV analysis, retention tracking, subscriber tiers

### **Decision 5: Cancel Offering**
**New function:**
```solidity
function cancelOffering(uint256 offeringId) external
```
- Only owner can call
- Sets offering.active = false
- Loops through all subscribers, sets active = false
- Emits event per subscriber + offering canceled event
- Gas cost: ~50k per subscriber + overhead
- Alternative: Just pause offering, let subscribers cancel individually (saves gas)

---

## Next Steps

**IF APPROVED:**
1. I'll implement Phase 1 (contract refactor)
2. Share updated contract for review
3. Proceed to tests + skill updates
4. Deploy to testnet

**IF CHANGES NEEDED:**
- Revise spec based on your feedback
- Re-submit for approval

**Decision:** Proceed with implementation? (yes/no)

---

**Andre, please review and let me know:**
- Any concerns with this approach?
- Answers to the 5 open questions above?
- Ready for me to start coding, or need changes to the spec first?
