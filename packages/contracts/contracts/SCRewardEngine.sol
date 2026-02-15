// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/extensions/AccessControlEnumerable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

// Interface for SoulaaniCoin minting
interface ISoulaaniCoin {
    function mintReward(address recipient, uint256 amount, bytes32 reason) external;
}

// Interface for VerifiedStoreRegistry
interface IVerifiedStoreRegistry {
    function isVerified(address storeOwner) external view returns (bool);
    function getStoreInfo(address storeOwner) external view returns (
        bool isVerified,
        bytes32 categoryKey,
        bytes32 storeKey,
        uint256 verifiedAt,
        uint256 updatedAt
    );
}

/**
 * @title SCRewardEngine
 * @notice Deterministic SC reward calculation and minting engine
 * @dev Computes SC rewards based on global defaults + per-category/store overrides
 *
 * Reward Formula:
 * - reward = (amount * percentageBps / 10000) + fixedAmount
 * - Clamped by minPurchase, maxRewardPerTx
 * - Applied to both buyer and verified store owner
 *
 * Roles:
 * - REWARD_EXECUTOR: Can execute reward minting (router contract or relayer)
 * - POLICY_MANAGER: Can update reward policies
 * - DEFAULT_ADMIN: Can grant/revoke roles
 */
contract SCRewardEngine is AccessControlEnumerable, ReentrancyGuard {
    // Role definitions
    bytes32 public constant REWARD_EXECUTOR = keccak256("REWARD_EXECUTOR");
    bytes32 public constant POLICY_MANAGER = keccak256("POLICY_MANAGER");

    // Contract references
    ISoulaaniCoin public immutable soulaaniCoin;
    IVerifiedStoreRegistry public immutable storeRegistry;

    // Global default reward policy
    struct RewardPolicy {
        uint256 percentageBps;    // Percentage in basis points (100 = 1%)
        uint256 fixedAmount;      // Fixed SC amount (in wei, 18 decimals)
        uint256 minPurchase;      // Minimum purchase amount to earn rewards (in wei)
        uint256 maxRewardPerTx;   // Maximum reward per transaction (in wei, 0 = unlimited)
        bool isActive;            // Whether this policy is active
    }

    // Global default policy
    RewardPolicy public globalPolicy;

    // Override policies by category key
    mapping(bytes32 => RewardPolicy) public categoryPolicies;
    mapping(bytes32 => bool) public hasCategoryOverride;

    // Override policies by specific store key
    mapping(bytes32 => RewardPolicy) public storePolicies;
    mapping(bytes32 => bool) public hasStoreOverride;

    // Replay protection: track processed purchases by unique identifier
    mapping(bytes32 => bool) public processedPurchases;

    // Events
    event GlobalPolicyUpdated(
        uint256 percentageBps,
        uint256 fixedAmount,
        uint256 minPurchase,
        uint256 maxRewardPerTx,
        address indexed updatedBy
    );

    event CategoryPolicySet(
        bytes32 indexed categoryKey,
        uint256 percentageBps,
        uint256 fixedAmount,
        uint256 minPurchase,
        uint256 maxRewardPerTx,
        address indexed updatedBy
    );

    event StorePolicySet(
        bytes32 indexed storeKey,
        uint256 percentageBps,
        uint256 fixedAmount,
        uint256 minPurchase,
        uint256 maxRewardPerTx,
        address indexed updatedBy
    );

    event CategoryPolicyRemoved(bytes32 indexed categoryKey, address indexed removedBy);
    event StorePolicyRemoved(bytes32 indexed storeKey, address indexed removedBy);

    event RewardExecuted(
        address indexed buyer,
        address indexed storeOwner,
        uint256 purchaseAmount,
        uint256 buyerReward,
        uint256 storeReward,
        bytes32 indexed policyKey,
        bytes32 purchaseId
    );

    event RewardSkipped(
        address indexed buyer,
        address indexed storeOwner,
        uint256 purchaseAmount,
        string reason,
        bytes32 purchaseId
    );

    /**
     * @notice Constructor
     * @param admin Address that will have admin role
     * @param _soulaaniCoin Address of SoulaaniCoin contract
     * @param _storeRegistry Address of VerifiedStoreRegistry contract
     */
    constructor(
        address admin,
        address _soulaaniCoin,
        address _storeRegistry
    ) {
        require(admin != address(0), "Admin cannot be zero address");
        require(_soulaaniCoin != address(0), "SoulaaniCoin cannot be zero address");
        require(_storeRegistry != address(0), "Store registry cannot be zero address");

        soulaaniCoin = ISoulaaniCoin(_soulaaniCoin);
        storeRegistry = IVerifiedStoreRegistry(_storeRegistry);

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(POLICY_MANAGER, admin);
        _grantRole(REWARD_EXECUTOR, admin);

        // Set default global policy: 1% percentage + 0 fixed
        globalPolicy = RewardPolicy({
            percentageBps: 100,        // 1%
            fixedAmount: 0,
            minPurchase: 0.01 ether,   // 0.01 UC minimum
            maxRewardPerTx: 0,         // Unlimited (contract-level cap applies)
            isActive: true
        });
    }

    /**
     * @notice Execute reward for a verified store purchase
     * @param buyer Address of the buyer
     * @param storeOwner Address of the store owner
     * @param purchaseAmount Amount of UC spent (in wei)
     * @param purchaseId Unique purchase identifier (prevents replay)
     * @dev Only callable by REWARD_EXECUTOR role
     */
    function executeReward(
        address buyer,
        address storeOwner,
        uint256 purchaseAmount,
        bytes32 purchaseId
    ) external onlyRole(REWARD_EXECUTOR) nonReentrant {
        require(buyer != address(0), "Buyer cannot be zero address");
        require(storeOwner != address(0), "Store owner cannot be zero address");
        require(purchaseAmount > 0, "Purchase amount must be greater than 0");
        require(purchaseId != bytes32(0), "Purchase ID cannot be empty");

        // Replay protection
        require(!processedPurchases[purchaseId], "Purchase already processed");
        processedPurchases[purchaseId] = true;

        // Verify store is registered
        (bool isVerified, bytes32 categoryKey, bytes32 storeKey,,) = storeRegistry.getStoreInfo(storeOwner);
        
        if (!isVerified) {
            emit RewardSkipped(buyer, storeOwner, purchaseAmount, "Store not verified", purchaseId);
            return;
        }

        // Determine applicable policy (priority: store > category > global)
        RewardPolicy memory policy;
        bytes32 policyKey;

        if (hasStoreOverride[storeKey] && storePolicies[storeKey].isActive) {
            policy = storePolicies[storeKey];
            policyKey = storeKey;
        } else if (hasCategoryOverride[categoryKey] && categoryPolicies[categoryKey].isActive) {
            policy = categoryPolicies[categoryKey];
            policyKey = categoryKey;
        } else if (globalPolicy.isActive) {
            policy = globalPolicy;
            policyKey = bytes32(0); // Global
        } else {
            emit RewardSkipped(buyer, storeOwner, purchaseAmount, "No active policy", purchaseId);
            return;
        }

        // Check minimum purchase requirement
        if (purchaseAmount < policy.minPurchase) {
            emit RewardSkipped(buyer, storeOwner, purchaseAmount, "Below minimum purchase", purchaseId);
            return;
        }

        // Calculate reward: percentage + fixed
        uint256 percentagePart = (purchaseAmount * policy.percentageBps) / 10000;
        uint256 reward = percentagePart + policy.fixedAmount;

        // Apply max reward cap if set
        if (policy.maxRewardPerTx > 0 && reward > policy.maxRewardPerTx) {
            reward = policy.maxRewardPerTx;
        }

        // Skip if reward is dust
        if (reward < 0.01 ether) {
            emit RewardSkipped(buyer, storeOwner, purchaseAmount, "Reward too small", purchaseId);
            return;
        }

        // Mint SC to buyer
        bytes32 buyerReason = keccak256("STORE_PURCHASE_REWARD");
        try soulaaniCoin.mintReward(buyer, reward, buyerReason) {
            // Success
        } catch {
            // Buyer mint failed (e.g., not active member, at cap)
            // Continue to try store owner mint
        }

        // Mint SC to store owner
        bytes32 storeReason = keccak256("STORE_SALE_REWARD");
        try soulaaniCoin.mintReward(storeOwner, reward, storeReason) {
            // Success
        } catch {
            // Store owner mint failed
        }

        emit RewardExecuted(buyer, storeOwner, purchaseAmount, reward, reward, policyKey, purchaseId);
    }

    /**
     * @notice Update global reward policy
     * @param percentageBps Percentage in basis points (100 = 1%)
     * @param fixedAmount Fixed SC amount in wei
     * @param minPurchase Minimum purchase amount in wei
     * @param maxRewardPerTx Maximum reward per transaction in wei (0 = unlimited)
     * @param isActive Whether policy is active
     * @dev Only callable by POLICY_MANAGER role
     */
    function setGlobalPolicy(
        uint256 percentageBps,
        uint256 fixedAmount,
        uint256 minPurchase,
        uint256 maxRewardPerTx,
        bool isActive
    ) external onlyRole(POLICY_MANAGER) {
        require(percentageBps <= 10000, "Percentage cannot exceed 100%");

        globalPolicy = RewardPolicy({
            percentageBps: percentageBps,
            fixedAmount: fixedAmount,
            minPurchase: minPurchase,
            maxRewardPerTx: maxRewardPerTx,
            isActive: isActive
        });

        emit GlobalPolicyUpdated(percentageBps, fixedAmount, minPurchase, maxRewardPerTx, msg.sender);
    }

    /**
     * @notice Set reward policy override for a category
     * @param categoryKey Category identifier (e.g., keccak256("FOUNDER_BADGES"))
     * @param percentageBps Percentage in basis points
     * @param fixedAmount Fixed SC amount in wei
     * @param minPurchase Minimum purchase amount in wei
     * @param maxRewardPerTx Maximum reward per transaction in wei (0 = unlimited)
     * @param isActive Whether policy is active
     * @dev Only callable by POLICY_MANAGER role
     */
    function setCategoryPolicy(
        bytes32 categoryKey,
        uint256 percentageBps,
        uint256 fixedAmount,
        uint256 minPurchase,
        uint256 maxRewardPerTx,
        bool isActive
    ) external onlyRole(POLICY_MANAGER) {
        require(categoryKey != bytes32(0), "Category key cannot be empty");
        require(percentageBps <= 10000, "Percentage cannot exceed 100%");

        categoryPolicies[categoryKey] = RewardPolicy({
            percentageBps: percentageBps,
            fixedAmount: fixedAmount,
            minPurchase: minPurchase,
            maxRewardPerTx: maxRewardPerTx,
            isActive: isActive
        });

        hasCategoryOverride[categoryKey] = true;

        emit CategoryPolicySet(categoryKey, percentageBps, fixedAmount, minPurchase, maxRewardPerTx, msg.sender);
    }

    /**
     * @notice Set reward policy override for a specific store
     * @param storeKey Store identifier
     * @param percentageBps Percentage in basis points
     * @param fixedAmount Fixed SC amount in wei
     * @param minPurchase Minimum purchase amount in wei
     * @param maxRewardPerTx Maximum reward per transaction in wei (0 = unlimited)
     * @param isActive Whether policy is active
     * @dev Only callable by POLICY_MANAGER role
     */
    function setStorePolicy(
        bytes32 storeKey,
        uint256 percentageBps,
        uint256 fixedAmount,
        uint256 minPurchase,
        uint256 maxRewardPerTx,
        bool isActive
    ) external onlyRole(POLICY_MANAGER) {
        require(storeKey != bytes32(0), "Store key cannot be empty");
        require(percentageBps <= 10000, "Percentage cannot exceed 100%");

        storePolicies[storeKey] = RewardPolicy({
            percentageBps: percentageBps,
            fixedAmount: fixedAmount,
            minPurchase: minPurchase,
            maxRewardPerTx: maxRewardPerTx,
            isActive: isActive
        });

        hasStoreOverride[storeKey] = true;

        emit StorePolicySet(storeKey, percentageBps, fixedAmount, minPurchase, maxRewardPerTx, msg.sender);
    }

    /**
     * @notice Remove category policy override (falls back to global)
     * @param categoryKey Category identifier
     * @dev Only callable by POLICY_MANAGER role
     */
    function removeCategoryPolicy(bytes32 categoryKey) external onlyRole(POLICY_MANAGER) {
        require(hasCategoryOverride[categoryKey], "No override exists");
        
        delete categoryPolicies[categoryKey];
        hasCategoryOverride[categoryKey] = false;

        emit CategoryPolicyRemoved(categoryKey, msg.sender);
    }

    /**
     * @notice Remove store policy override (falls back to category or global)
     * @param storeKey Store identifier
     * @dev Only callable by POLICY_MANAGER role
     */
    function removeStorePolicy(bytes32 storeKey) external onlyRole(POLICY_MANAGER) {
        require(hasStoreOverride[storeKey], "No override exists");
        
        delete storePolicies[storeKey];
        hasStoreOverride[storeKey] = false;

        emit StorePolicyRemoved(storeKey, msg.sender);
    }

    /**
     * @notice Calculate reward for a purchase (view function for preview)
     * @param storeOwner Address of the store owner
     * @param purchaseAmount Amount of UC spent (in wei)
     * @return reward Calculated reward amount (in wei)
     * @return policyKey Which policy was used (store key, category key, or 0 for global)
     */
    function calculateReward(
        address storeOwner,
        uint256 purchaseAmount
    ) external view returns (uint256 reward, bytes32 policyKey) {
        // Verify store is registered
        (bool isVerified, bytes32 categoryKey, bytes32 storeKey,,) = storeRegistry.getStoreInfo(storeOwner);
        
        if (!isVerified) {
            return (0, bytes32(0));
        }

        // Determine applicable policy
        RewardPolicy memory policy;

        if (hasStoreOverride[storeKey] && storePolicies[storeKey].isActive) {
            policy = storePolicies[storeKey];
            policyKey = storeKey;
        } else if (hasCategoryOverride[categoryKey] && categoryPolicies[categoryKey].isActive) {
            policy = categoryPolicies[categoryKey];
            policyKey = categoryKey;
        } else if (globalPolicy.isActive) {
            policy = globalPolicy;
            policyKey = bytes32(0);
        } else {
            return (0, bytes32(0));
        }

        // Check minimum purchase
        if (purchaseAmount < policy.minPurchase) {
            return (0, policyKey);
        }

        // Calculate: percentage + fixed
        uint256 percentagePart = (purchaseAmount * policy.percentageBps) / 10000;
        reward = percentagePart + policy.fixedAmount;

        // Apply max cap
        if (policy.maxRewardPerTx > 0 && reward > policy.maxRewardPerTx) {
            reward = policy.maxRewardPerTx;
        }

        // Return 0 if dust
        if (reward < 0.01 ether) {
            return (0, policyKey);
        }

        return (reward, policyKey);
    }

    /**
     * @notice Check if a purchase has been processed (replay protection)
     * @param purchaseId Unique purchase identifier
     * @return bool True if already processed
     */
    function isPurchaseProcessed(bytes32 purchaseId) external view returns (bool) {
        return processedPurchases[purchaseId];
    }

    /**
     * @dev Override required by Solidity for AccessControlEnumerable
     */
    function supportsInterface(bytes4 interfaceId) public view override(AccessControlEnumerable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
