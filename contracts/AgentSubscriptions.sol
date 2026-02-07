// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title AgentSubscriptions
 * @author Timmy (AI Agent Entrepreneur)
 * @notice Recurring USDC subscription payments for AI agent services
 * @dev Enables agents to create subscription offerings that users can subscribe to
 *      Payments are charged periodically and can be triggered by anyone (e.g., cron jobs)
 */
contract AgentSubscriptions is ReentrancyGuard {
    using SafeERC20 for IERC20;

    /// @notice The USDC token contract (immutable for security)
    IERC20 public immutable usdc;

    /// @notice Subscription data structure
    struct Subscription {
        uint256 id;                  // Unique subscription ID
        string serviceId;            // Human-readable service identifier
        address owner;               // Agent who created the subscription
        address recipient;           // Where payments are sent (can differ from owner)
        uint256 amountPerPeriod;     // USDC amount per billing period (6 decimals)
        uint256 periodInSeconds;     // Billing period length (e.g., 604800 = 1 week)
        uint256 lastChargeTime;      // Timestamp of last successful charge
        address subscriber;          // Current subscriber address
        bool active;                 // Is subscription currently active?
        uint256 createdAt;           // When subscription was created
    }

    /// @notice Total number of subscriptions created
    uint256 public subscriptionCount;

    /// @notice Mapping from subscription ID to subscription data
    mapping(uint256 => Subscription) public subscriptions;

    /// @notice Mapping from user address to their subscription IDs
    mapping(address => uint256[]) public userSubscriptions;

    /// @notice Emitted when a new subscription offering is created
    event SubscriptionCreated(
        uint256 indexed id,
        string serviceId,
        address indexed owner,
        address indexed recipient,
        uint256 amountPerPeriod,
        uint256 periodInSeconds
    );

    /// @notice Emitted when a user subscribes to a service
    event UserSubscribed(
        uint256 indexed subscriptionId,
        address indexed subscriber,
        uint256 timestamp
    );

    /// @notice Emitted when a subscription is charged
    event SubscriptionCharged(
        uint256 indexed subscriptionId,
        address indexed subscriber,
        address indexed recipient,
        uint256 amount,
        uint256 timestamp
    );

    /// @notice Emitted when a subscription is canceled
    event SubscriptionCanceled(
        uint256 indexed subscriptionId,
        address indexed subscriber,
        uint256 timestamp
    );

    /**
     * @notice Contract constructor
     * @param _usdc Address of the USDC token contract
     */
    constructor(address _usdc) {
        require(_usdc != address(0), "Invalid USDC address");
        usdc = IERC20(_usdc);
    }

    /**
     * @notice Create a new subscription offering
     * @param serviceId Human-readable service identifier (e.g., "MoltDigest Weekly")
     * @param recipient Address to receive payments (can be different from msg.sender)
     * @param amountPerPeriod USDC amount to charge per period (6 decimals)
     * @param periodInSeconds Length of billing period in seconds
     * @return id The created subscription ID
     */
    function createSubscription(
        string calldata serviceId,
        address recipient,
        uint256 amountPerPeriod,
        uint256 periodInSeconds
    ) external returns (uint256 id) {
        require(bytes(serviceId).length > 0, "Service ID required");
        require(bytes(serviceId).length <= 100, "Service ID too long");
        require(recipient != address(0), "Invalid recipient");
        require(amountPerPeriod > 0, "Amount must be > 0");
        require(amountPerPeriod <= 1_000_000 * 1e6, "Amount too large"); // Max 1M USDC
        require(periodInSeconds >= 60, "Period too short"); // Min 1 minute
        require(periodInSeconds <= 365 days, "Period too long"); // Max 1 year

        id = subscriptionCount++;

        subscriptions[id] = Subscription({
            id: id,
            serviceId: serviceId,
            owner: msg.sender,
            recipient: recipient,
            amountPerPeriod: amountPerPeriod,
            periodInSeconds: periodInSeconds,
            lastChargeTime: 0,
            subscriber: address(0),
            active: false,
            createdAt: block.timestamp
        });

        emit SubscriptionCreated(
            id,
            serviceId,
            msg.sender,
            recipient,
            amountPerPeriod,
            periodInSeconds
        );
    }

    /**
     * @notice Subscribe to a service
     * @dev Requires user to have approved sufficient USDC allowance first
     * @param subscriptionId The subscription to subscribe to
     */
    function subscribe(uint256 subscriptionId) external nonReentrant {
        Subscription storage sub = subscriptions[subscriptionId];
        
        require(sub.createdAt > 0, "Subscription does not exist");
        require(sub.subscriber == address(0), "Already has subscriber");
        require(msg.sender != sub.owner, "Cannot subscribe to own service");
        require(msg.sender != sub.recipient, "Recipient cannot subscribe");

        // Check USDC allowance (must be at least one period's worth)
        uint256 allowance = usdc.allowance(msg.sender, address(this));
        require(
            allowance >= sub.amountPerPeriod,
            "Insufficient USDC allowance"
        );

        // Activate subscription
        sub.subscriber = msg.sender;
        sub.active = true;
        sub.lastChargeTime = block.timestamp; // Start billing period now

        // Track user's subscriptions
        userSubscriptions[msg.sender].push(subscriptionId);

        emit UserSubscribed(subscriptionId, msg.sender, block.timestamp);
    }

    /**
     * @notice Charge a subscription (callable by anyone)
     * @dev This design allows cron jobs or third parties to trigger charges
     * @param subscriptionId The subscription to charge
     */
    function charge(uint256 subscriptionId) external nonReentrant {
        Subscription storage sub = subscriptions[subscriptionId];
        
        require(sub.active, "Subscription not active");
        require(sub.subscriber != address(0), "No subscriber");

        // Check if enough time has elapsed since last charge
        require(
            block.timestamp >= sub.lastChargeTime + sub.periodInSeconds,
            "Billing period not elapsed"
        );

        // Transfer USDC from subscriber to recipient
        usdc.safeTransferFrom(sub.subscriber, sub.recipient, sub.amountPerPeriod);

        // Update last charge time
        sub.lastChargeTime = block.timestamp;

        emit SubscriptionCharged(
            subscriptionId,
            sub.subscriber,
            sub.recipient,
            sub.amountPerPeriod,
            block.timestamp
        );
    }

    /**
     * @notice Cancel an active subscription
     * @dev Only the subscriber can cancel their own subscription
     * @param subscriptionId The subscription to cancel
     */
    function cancelSubscription(uint256 subscriptionId) external {
        Subscription storage sub = subscriptions[subscriptionId];
        
        require(msg.sender == sub.subscriber, "Only subscriber can cancel");
        require(sub.active, "Subscription not active");

        // Mark as inactive
        sub.active = false;

        emit SubscriptionCanceled(subscriptionId, msg.sender, block.timestamp);
    }

    /**
     * @notice Get full subscription details
     * @param subscriptionId The subscription ID to query
     * @return Subscription data struct
     */
    function getSubscription(uint256 subscriptionId) 
        external 
        view 
        returns (Subscription memory) 
    {
        require(subscriptions[subscriptionId].createdAt > 0, "Subscription does not exist");
        return subscriptions[subscriptionId];
    }

    /**
     * @notice Get all subscription IDs for a user
     * @param user The user address
     * @return Array of subscription IDs
     */
    function getUserSubscriptions(address user) 
        external 
        view 
        returns (uint256[] memory) 
    {
        return userSubscriptions[user];
    }

    /**
     * @notice Check if a subscription is ready to be charged
     * @param subscriptionId The subscription ID to check
     * @return ready True if charge() can be called successfully
     */
    function canCharge(uint256 subscriptionId) external view returns (bool ready) {
        Subscription storage sub = subscriptions[subscriptionId];
        
        if (!sub.active || sub.subscriber == address(0)) {
            return false;
        }
        
        return block.timestamp >= sub.lastChargeTime + sub.periodInSeconds;
    }

    /**
     * @notice Get time remaining until next charge
     * @param subscriptionId The subscription ID to check
     * @return secondsRemaining Seconds until next charge (0 if ready now)
     */
    function timeUntilNextCharge(uint256 subscriptionId) 
        external 
        view 
        returns (uint256 secondsRemaining) 
    {
        Subscription storage sub = subscriptions[subscriptionId];
        
        require(sub.active, "Subscription not active");
        require(sub.subscriber != address(0), "No subscriber");

        uint256 nextChargeTime = sub.lastChargeTime + sub.periodInSeconds;
        
        if (block.timestamp >= nextChargeTime) {
            return 0; // Ready to charge now
        }
        
        return nextChargeTime - block.timestamp;
    }
}
