const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("AgentSubscriptions", function () {
  let agentSubscriptions;
  let mockUSDC;
  let owner, agent, subscriber, recipient;
  const ONE_USDC = ethers.parseUnits("1", 6);
  const ONE_WEEK = 7 * 24 * 60 * 60;

  beforeEach(async function () {
    [owner, agent, subscriber, recipient] = await ethers.getSigners();

    // Deploy mock USDC
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    mockUSDC = await MockERC20.deploy("USD Coin", "USDC", 6);
    await mockUSDC.waitForDeployment();

    // Deploy AgentSubscriptions
    const AgentSubscriptions = await ethers.getContractFactory("AgentSubscriptions");
    agentSubscriptions = await AgentSubscriptions.deploy(await mockUSDC.getAddress());
    await agentSubscriptions.waitForDeployment();

    // Mint USDC to subscriber
    await mockUSDC.mint(subscriber.address, ethers.parseUnits("1000", 6));
  });

  describe("Deployment", function () {
    it("Should set the correct USDC address", async function () {
      expect(await agentSubscriptions.usdc()).to.equal(await mockUSDC.getAddress());
    });

    it("Should start with zero subscriptions", async function () {
      expect(await agentSubscriptions.subscriptionCount()).to.equal(0);
    });
  });

  describe("Create Subscription", function () {
    it("Should create a subscription successfully", async function () {
      const tx = await agentSubscriptions.connect(agent).createSubscription(
        "MoltDigest Weekly",
        recipient.address,
        ONE_USDC,
        ONE_WEEK
      );

      await expect(tx).to.emit(agentSubscriptions, "SubscriptionCreated");
      expect(await agentSubscriptions.subscriptionCount()).to.equal(1);
    });

    it("Should reject empty service ID", async function () {
      await expect(
        agentSubscriptions.connect(agent).createSubscription("", recipient.address, ONE_USDC, ONE_WEEK)
      ).to.be.revertedWith("Service ID required");
    });

    it("Should reject zero amount", async function () {
      await expect(
        agentSubscriptions.connect(agent).createSubscription("Test", recipient.address, 0, ONE_WEEK)
      ).to.be.revertedWith("Amount must be > 0");
    });
  });

  describe("Subscribe", function () {
    beforeEach(async function () {
      await agentSubscriptions.connect(agent).createSubscription(
        "MoltDigest Weekly",
        recipient.address,
        ONE_USDC,
        ONE_WEEK
      );
    });

    it("Should allow user to subscribe with allowance", async function () {
      await mockUSDC.connect(subscriber).approve(
        await agentSubscriptions.getAddress(),
        ethers.parseUnits("10", 6)
      );

      const tx = await agentSubscriptions.connect(subscriber).subscribe(0);
      await expect(tx).to.emit(agentSubscriptions, "UserSubscribed");

      const sub = await agentSubscriptions.getSubscription(0);
      expect(sub.subscriber).to.equal(subscriber.address);
      expect(sub.active).to.be.true;
    });

    it("Should reject subscribe without allowance", async function () {
      await expect(
        agentSubscriptions.connect(subscriber).subscribe(0)
      ).to.be.revertedWith("Insufficient USDC allowance");
    });
  });

  describe("Charge", function () {
    beforeEach(async function () {
      await agentSubscriptions.connect(agent).createSubscription(
        "MoltDigest Weekly",
        recipient.address,
        ONE_USDC,
        60 // 1 minute for testing
      );

      await mockUSDC.connect(subscriber).approve(
        await agentSubscriptions.getAddress(),
        ethers.parseUnits("100", 6)
      );

      await agentSubscriptions.connect(subscriber).subscribe(0);
    });

    it("Should reject charge before period elapsed", async function () {
      await expect(
        agentSubscriptions.charge(0)
      ).to.be.revertedWith("Billing period not elapsed");
    });

    it("Should allow charge after period elapsed", async function () {
      // Fast forward time
      await ethers.provider.send("evm_increaseTime", [61]);
      await ethers.provider.send("evm_mine");

      const recipientBalanceBefore = await mockUSDC.balanceOf(recipient.address);
      await agentSubscriptions.charge(0);
      const recipientBalanceAfter = await mockUSDC.balanceOf(recipient.address);

      expect(recipientBalanceAfter - recipientBalanceBefore).to.equal(ONE_USDC);
    });
  });

  describe("Cancel", function () {
    beforeEach(async function () {
      await agentSubscriptions.connect(agent).createSubscription(
        "MoltDigest Weekly",
        recipient.address,
        ONE_USDC,
        ONE_WEEK
      );

      await mockUSDC.connect(subscriber).approve(
        await agentSubscriptions.getAddress(),
        ethers.parseUnits("10", 6)
      );

      await agentSubscriptions.connect(subscriber).subscribe(0);
    });

    it("Should allow subscriber to cancel", async function () {
      const tx = await agentSubscriptions.connect(subscriber).cancelSubscription(0);
      await expect(tx).to.emit(agentSubscriptions, "SubscriptionCanceled");

      const sub = await agentSubscriptions.getSubscription(0);
      expect(sub.active).to.be.false;
    });

    it("Should reject cancel from non-subscriber", async function () {
      await expect(
        agentSubscriptions.connect(agent).cancelSubscription(0)
      ).to.be.revertedWith("Only subscriber can cancel");
    });
  });
});
