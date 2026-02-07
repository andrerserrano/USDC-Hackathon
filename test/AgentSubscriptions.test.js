const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("AgentSubscriptions", function () {
  let agentSubscriptions;
  let mockUSDC;
  let owner, subscriber, recipient;

  beforeEach(async function () {
    [owner, subscriber, recipient] = await ethers.getSigners();

    // Deploy mock USDC token
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    mockUSDC = await MockERC20.deploy("Mock USDC", "USDC", 6);
    await mockUSDC.waitForDeployment();

    // Mint USDC to subscriber
    await mockUSDC.mint(subscriber.address, ethers.parseUnits("1000", 6));

    // Deploy AgentSubscriptions
    const AgentSubscriptions = await ethers.getContractFactory("AgentSubscriptions");
    agentSubscriptions = await AgentSubscriptions.deploy(await mockUSDC.getAddress());
    await agentSubscriptions.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the correct USDC address", async function () {
      expect(await agentSubscriptions.usdc()).to.equal(await mockUSDC.getAddress());
    });

    it("Should start with subscription count of 0", async function () {
      expect(await agentSubscriptions.subscriptionCount()).to.equal(0);
    });
  });

  describe("Create Subscription", function () {
    it("Should create a subscription successfully", async function () {
      const tx = await agentSubscriptions.createSubscription(
        "Test Service",
        recipient.address,
        ethers.parseUnits("10", 6), // 10 USDC
        7 * 24 * 60 * 60 // 1 week in seconds
      );

      await expect(tx)
        .to.emit(agentSubscriptions, "SubscriptionCreated")
        .withArgs(
          0, // subscription ID
          "Test Service",
          owner.address,
          recipient.address,
          ethers.parseUnits("10", 6),
          7 * 24 * 60 * 60
        );

      const sub = await agentSubscriptions.getSubscription(0);
      expect(sub.serviceId).to.equal("Test Service");
      expect(sub.owner).to.equal(owner.address);
      expect(sub.recipient).to.equal(recipient.address);
    });

    it("Should reject empty service ID", async function () {
      await expect(
        agentSubscriptions.createSubscription(
          "",
          recipient.address,
          ethers.parseUnits("10", 6),
          604800
        )
      ).to.be.revertedWith("Service ID required");
    });

    it("Should reject invalid recipient", async function () {
      await expect(
        agentSubscriptions.createSubscription(
          "Test Service",
          ethers.ZeroAddress,
          ethers.parseUnits("10", 6),
          604800
        )
      ).to.be.revertedWith("Invalid recipient");
    });

    it("Should reject zero amount", async function () {
      await expect(
        agentSubscriptions.createSubscription(
          "Test Service",
          recipient.address,
          0,
          604800
        )
      ).to.be.revertedWith("Amount must be > 0");
    });

    it("Should reject period too short", async function () {
      await expect(
        agentSubscriptions.createSubscription(
          "Test Service",
          recipient.address,
          ethers.parseUnits("10", 6),
          30 // 30 seconds (less than 60)
        )
      ).to.be.revertedWith("Period too short");
    });
  });

  describe("Subscribe", function () {
    beforeEach(async function () {
      // Create a subscription
      await agentSubscriptions.createSubscription(
        "Test Service",
        recipient.address,
        ethers.parseUnits("10", 6),
        604800 // 1 week
      );
    });

    it("Should subscribe successfully with sufficient allowance", async function () {
      // Approve USDC
      await mockUSDC.connect(subscriber).approve(
        await agentSubscriptions.getAddress(),
        ethers.parseUnits("10", 6)
      );

      // Subscribe
      const tx = await agentSubscriptions.connect(subscriber).subscribe(0);

      await expect(tx)
        .to.emit(agentSubscriptions, "UserSubscribed")
        .withArgs(0, subscriber.address, await ethers.provider.getBlock("latest").then(b => b.timestamp));

      const sub = await agentSubscriptions.getSubscription(0);
      expect(sub.subscriber).to.equal(subscriber.address);
      expect(sub.active).to.equal(true);
    });

    it("Should reject subscription without allowance", async function () {
      await expect(
        agentSubscriptions.connect(subscriber).subscribe(0)
      ).to.be.revertedWith("Insufficient USDC allowance");
    });

    it("Should reject owner subscribing to own service", async function () {
      await mockUSDC.connect(owner).approve(
        await agentSubscriptions.getAddress(),
        ethers.parseUnits("10", 6)
      );

      await expect(
        agentSubscriptions.connect(owner).subscribe(0)
      ).to.be.revertedWith("Cannot subscribe to own service");
    });
  });

  describe("Charge", function () {
    beforeEach(async function () {
      // Create subscription
      await agentSubscriptions.createSubscription(
        "Test Service",
        recipient.address,
        ethers.parseUnits("10", 6),
        60 // 60 seconds for testing
      );

      // Approve and subscribe
      await mockUSDC.connect(subscriber).approve(
        await agentSubscriptions.getAddress(),
        ethers.parseUnits("100", 6) // Approve enough for multiple charges
      );
      await agentSubscriptions.connect(subscriber).subscribe(0);
    });

    it("Should charge successfully after period elapsed", async function () {
      // Fast forward time
      await ethers.provider.send("evm_increaseTime", [61]);
      await ethers.provider.send("evm_mine");

      const recipientBalanceBefore = await mockUSDC.balanceOf(recipient.address);

      // Charge (can be called by anyone)
      await agentSubscriptions.charge(0);

      const recipientBalanceAfter = await mockUSDC.balanceOf(recipient.address);
      expect(recipientBalanceAfter - recipientBalanceBefore).to.equal(ethers.parseUnits("10", 6));
    });

    it("Should reject charge before period elapsed", async function () {
      await expect(
        agentSubscriptions.charge(0)
      ).to.be.revertedWith("Billing period not elapsed");
    });

    it("Should reject charge on inactive subscription", async function () {
      // Cancel subscription
      await agentSubscriptions.connect(subscriber).cancelSubscription(0);

      // Try to charge
      await expect(
        agentSubscriptions.charge(0)
      ).to.be.revertedWith("Subscription not active");
    });
  });

  describe("Cancel", function () {
    beforeEach(async function () {
      // Create and subscribe
      await agentSubscriptions.createSubscription(
        "Test Service",
        recipient.address,
        ethers.parseUnits("10", 6),
        604800
      );

      await mockUSDC.connect(subscriber).approve(
        await agentSubscriptions.getAddress(),
        ethers.parseUnits("10", 6)
      );
      await agentSubscriptions.connect(subscriber).subscribe(0);
    });

    it("Should cancel subscription successfully", async function () {
      const tx = await agentSubscriptions.connect(subscriber).cancelSubscription(0);

      await expect(tx)
        .to.emit(agentSubscriptions, "SubscriptionCanceled")
        .withArgs(0, subscriber.address, await ethers.provider.getBlock("latest").then(b => b.timestamp));

      const sub = await agentSubscriptions.getSubscription(0);
      expect(sub.active).to.equal(false);
    });

    it("Should reject cancel from non-subscriber", async function () {
      await expect(
        agentSubscriptions.connect(owner).cancelSubscription(0)
      ).to.be.revertedWith("Only subscriber can cancel");
    });
  });

  describe("View Functions", function () {
    beforeEach(async function () {
      await agentSubscriptions.createSubscription(
        "Test Service",
        recipient.address,
        ethers.parseUnits("10", 6),
        604800
      );
    });

    it("Should check if subscription can be charged", async function () {
      expect(await agentSubscriptions.canCharge(0)).to.equal(false); // No subscriber yet

      // Subscribe
      await mockUSDC.connect(subscriber).approve(
        await agentSubscriptions.getAddress(),
        ethers.parseUnits("10", 6)
      );
      await agentSubscriptions.connect(subscriber).subscribe(0);

      expect(await agentSubscriptions.canCharge(0)).to.equal(false); // Too soon

      // Fast forward
      await ethers.provider.send("evm_increaseTime", [604801]);
      await ethers.provider.send("evm_mine");

      expect(await agentSubscriptions.canCharge(0)).to.equal(true); // Now ready
    });

    it("Should return time until next charge", async function () {
      // Subscribe
      await mockUSDC.connect(subscriber).approve(
        await agentSubscriptions.getAddress(),
        ethers.parseUnits("10", 6)
      );
      await agentSubscriptions.connect(subscriber).subscribe(0);

      const timeRemaining = await agentSubscriptions.timeUntilNextCharge(0);
      expect(timeRemaining).to.be.greaterThan(0);
      expect(timeRemaining).to.be.lessThanOrEqual(604800);
    });
  });
});

// Mock ERC20 contract for testing
contract MockERC20 {
  constructor(string memory name, string memory symbol, uint8 decimals_) public;
  function mint(address to, uint256 amount) external;
  function approve(address spender, uint256 amount) external returns (bool);
  function balanceOf(address account) external view returns (uint256);
}
