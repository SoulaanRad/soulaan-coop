// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title SoulaaniCoin (SC)
 * @notice Non-transferable, soulbound governance and yield token for Soulaan Co-op
 * @dev ERC-20-based but with all transfers blocked (soulbound)
 * 
 * SC is earned by:
 * - Paying rent in UC to verified landlords
 * - Spending UC at verified businesses
 * - Working on Co-op-funded projects
 * 
 * SC is used for:
 * - Voting on proposals and treasury allocation
 * - Staking for yield from the Soulaan Wealth Fund
 * - Access to Co-op benefits
 * 
 * Rules:
 * - Non-transferable (soulbound to wallet)
 * - Max 2% of total voting power per member
 * - Decays after 12 months of inactivity
 * 
 * Roles:
 * - GOVERNANCE_AWARD: Can award SC to members (governance bot/backend)
 * - GOVERNANCE_SLASH: Can slash/reduce SC (for violations or decay)
 * - DEFAULT_ADMIN: Can grant/revoke roles
 */
contract SoulaaniCoin is ERC20, AccessControl {
    // Role definitions
    bytes32 public constant GOVERNANCE_AWARD = keccak256("GOVERNANCE_AWARD");
    bytes32 public constant GOVERNANCE_SLASH = keccak256("GOVERNANCE_SLASH");

    // Track last activity for decay monitoring
    mapping(address => uint256) public lastActivity;

    // Events
    event Awarded(
        address indexed recipient, 
        uint256 amount, 
        bytes32 indexed reason,
        address indexed awarder
    );
    
    event Slashed(
        address indexed account, 
        uint256 amount, 
        bytes32 indexed reason,
        address indexed slasher
    );

    /**
     * @notice Constructor - initializes SC token
     * @param admin Address that will have admin role (can grant other roles)
     */
    constructor(address admin) ERC20("SoulaaniCoin", "SC") {
        require(admin != address(0), "Admin cannot be zero address");
        
        // Grant admin role to specified address
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        
        // Admin starts with governance roles, can transfer them later
        _grantRole(GOVERNANCE_AWARD, admin);
        _grantRole(GOVERNANCE_SLASH, admin);
    }

    /**
     * @notice Award SC tokens to a member
     * @param recipient Address to receive SC
     * @param amount Amount of SC to award
     * @param reason Reason code for the award (e.g., keccak256("RENT_PAYMENT"))
     * @dev Only callable by GOVERNANCE_AWARD role (governance bot/backend)
     */
    function award(
        address recipient, 
        uint256 amount, 
        bytes32 reason
    ) external onlyRole(GOVERNANCE_AWARD) {
        require(recipient != address(0), "Cannot award to zero address");
        require(amount > 0, "Amount must be greater than 0");
        
        _mint(recipient, amount);
        lastActivity[recipient] = block.timestamp;
        
        emit Awarded(recipient, amount, reason, msg.sender);
    }

    /**
     * @notice Slash (reduce) SC tokens from a member
     * @param account Address to slash from
     * @param amount Amount of SC to slash
     * @param reason Reason code for the slash (e.g., keccak256("INACTIVITY_DECAY"))
     * @dev Only callable by GOVERNANCE_SLASH role (governance bot/backend)
     */
    function slash(
        address account, 
        uint256 amount, 
        bytes32 reason
    ) external onlyRole(GOVERNANCE_SLASH) {
        require(account != address(0), "Cannot slash zero address");
        require(amount > 0, "Amount must be greater than 0");
        require(balanceOf(account) >= amount, "Insufficient balance to slash");
        
        _burn(account, amount);
        
        emit Slashed(account, amount, reason, msg.sender);
    }

    /**
     * @notice Update last activity timestamp for an address
     * @param account Address to update
     * @dev Can be called by governance to reset decay timer
     */
    function updateActivity(address account) external onlyRole(GOVERNANCE_AWARD) {
        require(account != address(0), "Cannot update zero address");
        lastActivity[account] = block.timestamp;
    }

    /**
     * @notice Get time since last activity for an address
     * @param account Address to check
     * @return uint256 Seconds since last activity (0 if never active)
     */
    function getTimeSinceLastActivity(address account) external view returns (uint256) {
        if (lastActivity[account] == 0) return 0;
        return block.timestamp - lastActivity[account];
    }

    // ========== SOULBOUND ENFORCEMENT ==========
    // Block all transfers, approvals, and allowances

    /**
     * @notice Transfers are blocked - SC is soulbound
     */
    function transfer(address, uint256) public pure override returns (bool) {
        revert("SC is non-transferable (soulbound)");
    }

    /**
     * @notice Transfers are blocked - SC is soulbound
     */
    function transferFrom(address, address, uint256) public pure override returns (bool) {
        revert("SC is non-transferable (soulbound)");
    }

    /**
     * @notice Approvals are blocked - SC is soulbound
     */
    function approve(address, uint256) public pure override returns (bool) {
        revert("SC is non-transferable (soulbound)");
    }

    /**
     * @notice Allowances are blocked - SC is soulbound
     */
    function allowance(address, address) public pure override returns (uint256) {
        return 0;
    }

    /**
     * @notice IncreaseAllowance is blocked - SC is soulbound
     */
    function increaseAllowance(address, uint256) public pure returns (bool) {
        revert("SC is non-transferable (soulbound)");
    }

    /**
     * @notice DecreaseAllowance is blocked - SC is soulbound
     */
    function decreaseAllowance(address, uint256) public pure returns (bool) {
        revert("SC is non-transferable (soulbound)");
    }
}

