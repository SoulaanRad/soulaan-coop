// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
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
 * 5. Backend can mark redemption as fulfilled or cancel it
 * 
 * Roles:
 * - REDEMPTION_PROCESSOR: Backend that processes redemptions (fulfills or cancels)
 * - TREASURER: Can withdraw UC from vault (Treasury Safe)
 * - DEFAULT_ADMIN: Can grant/revoke roles
 */
contract RedemptionVault is AccessControl, ReentrancyGuard {
    // Role definitions
    bytes32 public constant REDEMPTION_PROCESSOR = keccak256("REDEMPTION_PROCESSOR");
    bytes32 public constant TREASURER = keccak256("TREASURER");

    // UC token reference
    IERC20 public immutable unityCoin;

    // Redemption status enum
    enum RedemptionStatus {
        Pending,    // Waiting for processing
        Fulfilled,  // Completed successfully
        Cancelled   // Cancelled (UC returned to user)
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

    event TreasuryWithdrawal(
        address indexed treasurer,
        uint256 amount,
        address indexed destination
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

        // Return UC to user
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
}

