// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/extensions/AccessControlEnumerable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// Interface for VerifiedStoreRegistry
interface IVerifiedStoreRegistry {
    function isVerified(address storeOwner) external view returns (bool);
}

// Interface for SCRewardEngine
interface ISCRewardEngine {
    function executeReward(
        address buyer,
        address storeOwner,
        uint256 purchaseAmount,
        bytes32 purchaseId
    ) external;
}

/**
 * @title StorePaymentRouter
 * @notice Routes verified store purchases and triggers SC rewards
 * @dev Canonical entry point for store purchases that are eligible for SC rewards
 *
 * This contract:
 * - Verifies store eligibility via VerifiedStoreRegistry
 * - Transfers UC from buyer to store owner
 * - Emits canonical VerifiedStorePurchase event
 * - Triggers SC reward execution via SCRewardEngine
 *
 * Roles:
 * - DEFAULT_ADMIN: Can update contract references and pause/unpause
 * - PAUSER: Can pause/unpause the contract
 */
contract StorePaymentRouter is AccessControlEnumerable, ReentrancyGuard {
    // Role definitions
    bytes32 public constant PAUSER = keccak256("PAUSER");

    // Contract references
    IERC20 public unityCoin;
    IVerifiedStoreRegistry public storeRegistry;
    ISCRewardEngine public rewardEngine;

    // Pause state
    bool public paused;

    // Events
    event VerifiedStorePurchase(
        address indexed buyer,
        address indexed storeOwner,
        uint256 amount,
        bytes32 indexed purchaseId,
        string orderRef,
        uint256 timestamp
    );

    event PurchaseFailed(
        address indexed buyer,
        address indexed storeOwner,
        uint256 amount,
        bytes32 indexed purchaseId,
        string reason
    );

    event ContractPaused(address indexed pausedBy, uint256 timestamp);
    event ContractUnpaused(address indexed unpausedBy, uint256 timestamp);

    event UnityCoinUpdated(address indexed oldAddress, address indexed newAddress, address indexed updatedBy);
    event StoreRegistryUpdated(address indexed oldAddress, address indexed newAddress, address indexed updatedBy);
    event RewardEngineUpdated(address indexed oldAddress, address indexed newAddress, address indexed updatedBy);

    /**
     * @notice Constructor
     * @param admin Address that will have admin role
     * @param _unityCoin Address of UnityCoin contract
     * @param _storeRegistry Address of VerifiedStoreRegistry contract
     * @param _rewardEngine Address of SCRewardEngine contract
     */
    constructor(
        address admin,
        address _unityCoin,
        address _storeRegistry,
        address _rewardEngine
    ) {
        require(admin != address(0), "Admin cannot be zero address");
        require(_unityCoin != address(0), "UnityCoin cannot be zero address");
        require(_storeRegistry != address(0), "Store registry cannot be zero address");
        require(_rewardEngine != address(0), "Reward engine cannot be zero address");

        unityCoin = IERC20(_unityCoin);
        storeRegistry = IVerifiedStoreRegistry(_storeRegistry);
        rewardEngine = ISCRewardEngine(_rewardEngine);

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(PAUSER, admin);

        paused = false;
    }

    /**
     * @notice Pay a verified store and trigger SC rewards
     * @param storeOwner Address of the store owner
     * @param amount Amount of UC to transfer (in wei)
     * @param orderRef External order reference (e.g., database order ID)
     * @dev Buyer must have approved this contract to spend UC tokens
     */
    function payVerifiedStore(
        address storeOwner,
        uint256 amount,
        string calldata orderRef
    ) external nonReentrant {
        require(!paused, "Contract is paused");
        require(storeOwner != address(0), "Store owner cannot be zero address");
        require(amount > 0, "Amount must be greater than 0");
        require(msg.sender != storeOwner, "Cannot pay yourself");

        // Generate unique purchase ID
        bytes32 purchaseId = keccak256(
            abi.encodePacked(
                msg.sender,
                storeOwner,
                amount,
                orderRef,
                block.timestamp,
                block.number
            )
        );

        // Verify store is registered and verified
        bool isVerified = storeRegistry.isVerified(storeOwner);
        if (!isVerified) {
            emit PurchaseFailed(msg.sender, storeOwner, amount, purchaseId, "Store not verified");
            revert("Store not verified");
        }

        // Transfer UC from buyer to store owner
        // Note: Buyer must have approved this contract to spend UC
        bool transferSuccess = unityCoin.transferFrom(msg.sender, storeOwner, amount);
        if (!transferSuccess) {
            emit PurchaseFailed(msg.sender, storeOwner, amount, purchaseId, "UC transfer failed");
            revert("UC transfer failed");
        }

        // Emit canonical purchase event
        emit VerifiedStorePurchase(
            msg.sender,
            storeOwner,
            amount,
            purchaseId,
            orderRef,
            block.timestamp
        );

        // Trigger SC reward execution (non-blocking)
        try rewardEngine.executeReward(msg.sender, storeOwner, amount, purchaseId) {
            // Reward execution succeeded or was skipped gracefully
        } catch {
            // Reward execution failed, but purchase is still valid
            // This prevents reward failures from blocking store payments
        }
    }

    /**
     * @notice Batch pay multiple verified stores
     * @param storeOwners Array of store owner addresses
     * @param amounts Array of UC amounts (must match storeOwners length)
     * @param orderRefs Array of order references (must match storeOwners length)
     * @dev Buyer must have approved this contract to spend total UC amount
     */
    function payVerifiedStoresBatch(
        address[] calldata storeOwners,
        uint256[] calldata amounts,
        string[] calldata orderRefs
    ) external nonReentrant {
        require(!paused, "Contract is paused");
        require(storeOwners.length == amounts.length, "Array length mismatch");
        require(storeOwners.length == orderRefs.length, "Array length mismatch");
        require(storeOwners.length > 0, "Empty arrays");

        for (uint256 i = 0; i < storeOwners.length; i++) {
            address storeOwner = storeOwners[i];
            uint256 amount = amounts[i];
            string calldata orderRef = orderRefs[i];

            if (storeOwner == address(0) || amount == 0 || msg.sender == storeOwner) {
                continue; // Skip invalid entries
            }

            // Generate unique purchase ID
            bytes32 purchaseId = keccak256(
                abi.encodePacked(
                    msg.sender,
                    storeOwner,
                    amount,
                    orderRef,
                    block.timestamp,
                    block.number,
                    i // Include index for uniqueness in batch
                )
            );

            // Verify store
            bool isVerified = storeRegistry.isVerified(storeOwner);
            if (!isVerified) {
                emit PurchaseFailed(msg.sender, storeOwner, amount, purchaseId, "Store not verified");
                continue; // Skip but don't revert entire batch
            }

            // Transfer UC
            bool transferSuccess = unityCoin.transferFrom(msg.sender, storeOwner, amount);
            if (!transferSuccess) {
                emit PurchaseFailed(msg.sender, storeOwner, amount, purchaseId, "UC transfer failed");
                continue; // Skip but don't revert entire batch
            }

            // Emit canonical purchase event
            emit VerifiedStorePurchase(
                msg.sender,
                storeOwner,
                amount,
                purchaseId,
                orderRef,
                block.timestamp
            );

            // Trigger SC reward execution (non-blocking)
            try rewardEngine.executeReward(msg.sender, storeOwner, amount, purchaseId) {
                // Success
            } catch {
                // Failed but don't block
            }
        }
    }

    /**
     * @notice Pause the contract (emergency stop)
     * @dev Only callable by PAUSER role
     */
    function pause() external onlyRole(PAUSER) {
        require(!paused, "Already paused");
        paused = true;
        emit ContractPaused(msg.sender, block.timestamp);
    }

    /**
     * @notice Unpause the contract
     * @dev Only callable by PAUSER role
     */
    function unpause() external onlyRole(PAUSER) {
        require(paused, "Not paused");
        paused = false;
        emit ContractUnpaused(msg.sender, block.timestamp);
    }

    /**
     * @notice Update UnityCoin contract address
     * @param newUnityCoin New UnityCoin contract address
     * @dev Only callable by DEFAULT_ADMIN role
     */
    function setUnityCoin(address newUnityCoin) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newUnityCoin != address(0), "Cannot be zero address");
        address oldAddress = address(unityCoin);
        unityCoin = IERC20(newUnityCoin);
        emit UnityCoinUpdated(oldAddress, newUnityCoin, msg.sender);
    }

    /**
     * @notice Update VerifiedStoreRegistry contract address
     * @param newRegistry New registry contract address
     * @dev Only callable by DEFAULT_ADMIN role
     */
    function setStoreRegistry(address newRegistry) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newRegistry != address(0), "Cannot be zero address");
        address oldAddress = address(storeRegistry);
        storeRegistry = IVerifiedStoreRegistry(newRegistry);
        emit StoreRegistryUpdated(oldAddress, newRegistry, msg.sender);
    }

    /**
     * @notice Update SCRewardEngine contract address
     * @param newEngine New reward engine contract address
     * @dev Only callable by DEFAULT_ADMIN role
     */
    function setRewardEngine(address newEngine) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newEngine != address(0), "Cannot be zero address");
        address oldAddress = address(rewardEngine);
        rewardEngine = ISCRewardEngine(newEngine);
        emit RewardEngineUpdated(oldAddress, newEngine, msg.sender);
    }

    /**
     * @dev Override required by Solidity for AccessControlEnumerable
     */
    function supportsInterface(bytes4 interfaceId) public view override(AccessControlEnumerable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
