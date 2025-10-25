// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/extensions/AccessControlEnumerable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title RedemptionVault
 * @notice Vault for members to request redemption of UC for fiat currency
 * @dev Members deposit UC, backend processes redemption off-chain
 * 
 * Flow:
 * 1. Member calls redeem(amount) with UC approval
 * 2. Vault transfers UC from member to vault
 * 3. Vault emits RedeemRequested event with unique redemptionId
 * 4. Backend monitors events and processes redemption off-chain
 * 5. Backend can:
 *    - fulfillRedemption(): Mark as completed (fiat sent)
 *    - cancelRedemption(): Cancel and refund UC (user must still be active member)
 *    - forfeitRedemption(): Cancel without refund (for fraud/violations)
 * 
 * Redemption Outcomes:
 * - Fulfilled: Fiat sent to user, UC stays in vault
 * - Cancelled: UC returned to user (user must be active member)
 * - Forfeited: No refund, UC kept by vault for treasury (used for fraud/violations)
 * 
 * Roles:
 * - REDEMPTION_PROCESSOR: Backend that processes redemptions (fulfills, cancels, or forfeits)
 * - TREASURER: Can withdraw UC from vault (Treasury Safe)
 * - DEFAULT_ADMIN: Can grant/revoke roles
 */
contract RedemptionVault is AccessControlEnumerable, ReentrancyGuard {
    // Role definitions
    bytes32 public constant REDEMPTION_PROCESSOR = keccak256("REDEMPTION_PROCESSOR");
    bytes32 public constant TREASURER = keccak256("TREASURER");

    // UC token reference
    IERC20 public immutable unityCoin;

    // Redemption status enum
    enum RedemptionStatus {
        Pending,    // Waiting for processing
        Fulfilled,  // Completed successfully
        Cancelled,  // Cancelled (UC returned to user)
        Forfeited   // Cancelled and forfeited (UC kept by vault/treasury)
    }

    // Redemption request struct
    struct RedemptionRequest {
        address user;
        uint256 amount;
        uint256 timestamp;
        RedemptionStatus status;
    }

    // Mapping from redemptionId to request
    mapping(bytes32 => RedemptionRequest) public redemptions;

    // Redemption limits (0 = unlimited)
    uint256 public maxRedemptionPerUser = 0; // Maximum redemption per user per request (0 = unlimited)
    uint256 public maxDailyRedemptions = 0; // Maximum total redemptions per day (0 = unlimited)
    
    // Track daily redemption totals
    mapping(uint256 => uint256) public dailyRedemptionTotal; // day => total amount redeemed

    // Events
    event RedeemRequested(
        address indexed user,
        uint256 amount,
        bytes32 indexed redemptionId,
        uint256 timestamp
    );

    event RedemptionFulfilled(
        bytes32 indexed redemptionId,
        address indexed user,
        uint256 amount,
        address indexed processor
    );

    event RedemptionCancelled(
        bytes32 indexed redemptionId,
        address indexed user,
        uint256 amount,
        address indexed processor
    );

    event RedemptionForfeited(
        bytes32 indexed redemptionId,
        address indexed user,
        uint256 amount,
        address indexed processor,
        string reason
    );

    event TreasuryWithdrawal(
        address indexed treasurer,
        uint256 amount,
        address indexed destination
    );

    event MaxRedemptionPerUserChanged(
        uint256 oldLimit,
        uint256 newLimit,
        address indexed changedBy
    );

    event MaxDailyRedemptionsChanged(
        uint256 oldLimit,
        uint256 newLimit,
        address indexed changedBy
    );

    event OwnershipTransferInitiated(
        address indexed from,
        address indexed to,
        uint256 timestamp
    );

    event OwnershipTransferCompleted(
        address indexed from,
        uint256 timestamp
    );

    /**
     * @notice Constructor
     * @param _unityCoin Address of the UnityCoin (UC) contract
     * @param admin Address that will have admin role
     */
    constructor(address _unityCoin, address admin) {
        require(_unityCoin != address(0), "UC cannot be zero address");
        require(admin != address(0), "Admin cannot be zero address");

        unityCoin = IERC20(_unityCoin);

        // Grant admin role
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        
        // Admin starts with processing roles
        _grantRole(REDEMPTION_PROCESSOR, admin);
        _grantRole(TREASURER, admin);
    }

    /**
     * @notice Request redemption of UC for fiat
     * @param amount Amount of UC to redeem
     * @dev User must approve vault to spend UC first
     */
    function redeem(uint256 amount) external nonReentrant returns (bytes32) {
        require(amount > 0, "Amount must be greater than 0");
        
        // Check per-user redemption limit if set (0 = unlimited)
        if (maxRedemptionPerUser > 0) {
            require(amount <= maxRedemptionPerUser, "Amount exceeds max redemption per user");
        }
        
        // Check daily redemption limit if set (0 = unlimited)
        if (maxDailyRedemptions > 0) {
            uint256 today = block.timestamp / 1 days;
            require(
                dailyRedemptionTotal[today] + amount <= maxDailyRedemptions,
                "Daily redemption limit exceeded"
            );
            dailyRedemptionTotal[today] += amount;
        }
        
        // Generate unique redemption ID
        bytes32 redemptionId = keccak256(
            abi.encodePacked(
                msg.sender,
                amount,
                block.timestamp,
                block.number
            )
        );

        // Ensure redemption ID is unique
        require(
            redemptions[redemptionId].user == address(0),
            "Redemption ID collision"
        );

        // Transfer UC from user to vault
        require(
            unityCoin.transferFrom(msg.sender, address(this), amount),
            "UC transfer failed"
        );

        // Store redemption request
        redemptions[redemptionId] = RedemptionRequest({
            user: msg.sender,
            amount: amount,
            timestamp: block.timestamp,
            status: RedemptionStatus.Pending
        });

        emit RedeemRequested(msg.sender, amount, redemptionId, block.timestamp);

        return redemptionId;
    }

    /**
     * @notice Mark redemption as fulfilled (completed off-chain)
     * @param redemptionId ID of the redemption request
     * @dev Only callable by REDEMPTION_PROCESSOR role (backend)
     */
    function fulfillRedemption(bytes32 redemptionId) 
        external 
        onlyRole(REDEMPTION_PROCESSOR) 
    {
        RedemptionRequest storage request = redemptions[redemptionId];
        require(request.user != address(0), "Redemption not found");
        require(
            request.status == RedemptionStatus.Pending,
            "Redemption not pending"
        );

        request.status = RedemptionStatus.Fulfilled;

        emit RedemptionFulfilled(
            redemptionId,
            request.user,
            request.amount,
            msg.sender
        );
    }

    /**
     * @notice Cancel redemption and return UC to user
     * @param redemptionId ID of the redemption request
     * @dev Only callable by REDEMPTION_PROCESSOR role (backend)
     * @dev Use this for legitimate cancellations (technical issues, user still in good standing)
     * @dev User must still be an active member to receive refund
     */
    function cancelRedemption(bytes32 redemptionId) 
        external 
        onlyRole(REDEMPTION_PROCESSOR)
        nonReentrant
    {
        RedemptionRequest storage request = redemptions[redemptionId];
        require(request.user != address(0), "Redemption not found");
        require(
            request.status == RedemptionStatus.Pending,
            "Redemption not pending"
        );

        request.status = RedemptionStatus.Cancelled;

        // Return UC to user (will fail if user is suspended/banned)
        require(
            unityCoin.transfer(request.user, request.amount),
            "UC return failed"
        );

        emit RedemptionCancelled(
            redemptionId,
            request.user,
            request.amount,
            msg.sender
        );
    }

    /**
     * @notice Forfeit redemption (no refund, UC kept by vault)
     * @param redemptionId ID of the redemption request
     * @param reason Reason for forfeiture (e.g., "Fraud detected", "Terms violation")
     * @dev Only callable by REDEMPTION_PROCESSOR role (backend)
     * @dev Use this when user is suspended/banned or violated terms
     * @dev UC remains in vault and can be withdrawn to treasury
     */
    function forfeitRedemption(bytes32 redemptionId, string calldata reason) 
        external 
        onlyRole(REDEMPTION_PROCESSOR)
    {
        RedemptionRequest storage request = redemptions[redemptionId];
        require(request.user != address(0), "Redemption not found");
        require(
            request.status == RedemptionStatus.Pending,
            "Redemption not pending"
        );

        request.status = RedemptionStatus.Forfeited;

        // UC stays in vault, no refund
        emit RedemptionForfeited(
            redemptionId,
            request.user,
            request.amount,
            msg.sender,
            reason
        );
    }

    /**
     * @notice Mark redemption as resolved after emergency transfer
     * @param redemptionId ID of the redemption request
     * @param reason Reason for emergency resolution
     * @dev Only callable by TREASURER role (requires elevated privileges)
     * @dev Use this after admin manually handles redemption via UnityCoin.emergencyTransfer()
     * @dev Does NOT move UC - just updates status (UC already moved via emergencyTransfer)
     */
    function markEmergencyResolved(
        bytes32 redemptionId,
        string calldata reason
    )
        external
        onlyRole(TREASURER)
    {
        RedemptionRequest storage request = redemptions[redemptionId];
        require(request.user != address(0), "Redemption not found");
        require(
            request.status == RedemptionStatus.Pending || 
            request.status == RedemptionStatus.Forfeited,
            "Cannot resolve this redemption"
        );

        request.status = RedemptionStatus.Cancelled;

        emit RedemptionCancelled(
            redemptionId,
            request.user,
            request.amount,
            msg.sender
        );

        // Track emergency resolution
        emit RedemptionForfeited(
            redemptionId,
            request.user,
            request.amount,
            msg.sender,
            string(abi.encodePacked("EMERGENCY_RESOLVED: ", reason))
        );
    }

    /**
     * @notice Withdraw UC from vault to treasury
     * @param amount Amount of UC to withdraw
     * @param destination Address to send UC to (typically Treasury Safe)
     * @dev Only callable by TREASURER role
     */
    function withdrawToTreasury(uint256 amount, address destination)
        external
        onlyRole(TREASURER)
        nonReentrant
    {
        require(destination != address(0), "Destination cannot be zero address");
        require(amount > 0, "Amount must be greater than 0");
        require(
            unityCoin.balanceOf(address(this)) >= amount,
            "Insufficient vault balance"
        );

        require(
            unityCoin.transfer(destination, amount),
            "UC transfer failed"
        );

        emit TreasuryWithdrawal(msg.sender, amount, destination);
    }

    /**
     * @notice Get vault's UC balance
     * @return uint256 Current UC balance
     */
    function getVaultBalance() external view returns (uint256) {
        return unityCoin.balanceOf(address(this));
    }

    /**
     * @notice Get redemption request details
     * @param redemptionId ID of the redemption
     * @return RedemptionRequest struct with request details
     */
    function getRedemption(bytes32 redemptionId) 
        external 
        view 
        returns (RedemptionRequest memory) 
    {
        return redemptions[redemptionId];
    }

    // ========== ADMIN FUNCTIONS ==========

    /**
     * @notice Set the maximum redemption amount per user per request
     * @param newLimit New maximum redemption limit (0 = unlimited)
     * @dev Only callable by DEFAULT_ADMIN_ROLE (Treasury Safe)
     */
    function setMaxRedemptionPerUser(uint256 newLimit) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        uint256 oldLimit = maxRedemptionPerUser;
        maxRedemptionPerUser = newLimit;
        emit MaxRedemptionPerUserChanged(oldLimit, newLimit, msg.sender);
    }

    /**
     * @notice Set the maximum total redemptions per day
     * @param newLimit New maximum daily redemption limit (0 = unlimited)
     * @dev Only callable by DEFAULT_ADMIN_ROLE (Treasury Safe)
     */
    function setMaxDailyRedemptions(uint256 newLimit) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        uint256 oldLimit = maxDailyRedemptions;
        maxDailyRedemptions = newLimit;
        emit MaxDailyRedemptionsChanged(oldLimit, newLimit, msg.sender);
    }

    /**
     * @notice Initiate transfer of admin role to new address
     * @param newAdmin Address of new admin (typically a new multisig)
     * @dev New admin is granted role, old admin should call completeOwnershipTransfer after verification
     */
    function initiateOwnershipTransfer(address newAdmin) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        require(newAdmin != address(0), "Cannot transfer to zero address");
        require(!hasRole(DEFAULT_ADMIN_ROLE, newAdmin), "Address already has admin role");
        
        grantRole(DEFAULT_ADMIN_ROLE, newAdmin);
        emit OwnershipTransferInitiated(msg.sender, newAdmin, block.timestamp);
    }

    /**
     * @notice Complete ownership transfer by renouncing old admin role
     * @dev Can only be called if there's another admin (prevents locking contract)
     */
    function completeOwnershipTransfer() 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        require(getRoleMemberCount(DEFAULT_ADMIN_ROLE) > 1, "Would leave contract without admin");
        renounceRole(DEFAULT_ADMIN_ROLE, msg.sender);
        emit OwnershipTransferCompleted(msg.sender, block.timestamp);
    }
}

