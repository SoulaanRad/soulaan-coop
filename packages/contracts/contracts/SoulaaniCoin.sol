// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import "@openzeppelin/contracts/access/extensions/AccessControlEnumerable.sol";

// Interface for future cross-coop clearing functionality
interface ICoopClearing {
    function recordCrossCoopActivity(uint256 fromCoopId, uint256 toCoopId, address member, bytes32 activityType) external;
}

/**
 * @title SoulaaniCoin (SC)
 * @notice Non-transferable, soulbound governance and yield token for Soulaan Co-op
 * @dev ERC-20-based but with all transfers blocked (soulbound)
 *
 * SC is earned through sanctioned co-op activities:
 * - Paying rent in UC to verified landlords
 * - Spending UC at verified businesses
 * - Community service (e.g., neighborhood cleanup)
 * - Working on Co-op-funded projects
 * - Other approved co-op activities
 *
 * SC is used for:
 * - Voting on proposals and treasury allocation (with 2% voting power cap)
 * - Staking for yield from the Soulaan Wealth Fund
 * - Access to Co-op benefits
 *
 * Membership System (Hybrid On-Chain/Off-Chain):
 * - On-chain status: NotMember, Active, Suspended, Banned
 * - Only Active members can receive SC
 * - Membership status stored on blockchain (source of truth)
 * - Off-chain databases can query and cache this data
 * - All systems stay in sync by reading from blockchain
 *
 * Activity Tracking:
 * - Tracks total activities and activity types per member
 * - Awards can vary based on activity type and frequency
 * - Activity history is transparent and queryable
 *
 * Rules:
 * - Non-transferable (soulbound to wallet)
 * - Max 2% of total voting power per member (enforced in getVotingPower)
 * - Activity-based: more activities = more earning opportunities
 * - Must be active member to receive SC
 *
 * Roles:
 * - GOVERNANCE_AWARD: Can award SC to members (governance bot/backend)
 * - GOVERNANCE_SLASH: Can slash/reduce SC (for violations)
 * - MEMBER_MANAGER: Can manage member status (add, suspend, ban members)
 * - DEFAULT_ADMIN: Can grant/revoke roles
 */
contract SoulaaniCoin is ERC20, ERC20Pausable, AccessControlEnumerable {
    // Role definitions
    bytes32 public constant GOVERNANCE_AWARD = keccak256("GOVERNANCE_AWARD");
    bytes32 public constant GOVERNANCE_SLASH = keccak256("GOVERNANCE_SLASH");
    bytes32 public constant MEMBER_MANAGER = keccak256("MEMBER_MANAGER");

    // Membership status enum
    enum MemberStatus {
        NotMember, // 0: Never registered or removed
        Active, // 1: Active member, can receive SC
        Suspended, // 2: Temporarily suspended, cannot receive SC
        Banned // 3: Permanently banned, cannot receive SC
    }

    // Member tracking (blockchain source of truth)
    mapping(address => MemberStatus) public memberStatus;
    mapping(address => uint256) public memberSince; // Timestamp when became a member

    // Track activity metrics
    mapping(address => uint256) public lastActivity;
    mapping(address => uint256) public totalActivities; // Count of all activities
    mapping(address => mapping(bytes32 => uint256)) public activityTypeCount; // Count per activity type

    // Voting power cap (adjustable, default 2% of total supply)
    uint256 public maxVotingPowerPercent = 2;

    // Award and slash limits (per transaction, 0 = unlimited)
    uint256 public maxAwardPerTransaction = 0; // 0 = unlimited by default
    uint256 public maxSlashPerTransaction = 0; // 0 = unlimited by default

    // Multi-coop foundation (minimal)
    uint256 public coopId = 1; // Default to Soulaan Co-op
    address public clearingContract = address(0); // Future cross-coop clearing

    // Events
    event Awarded(address indexed recipient, uint256 amount, bytes32 indexed reason, address indexed awarder);

    event Slashed(address indexed account, uint256 amount, bytes32 indexed reason, address indexed slasher);

    event ActivityRecorded(address indexed account, bytes32 indexed activityType, uint256 timestamp);

    event MemberStatusChanged(
        address indexed member,
        MemberStatus oldStatus,
        MemberStatus newStatus,
        address indexed changedBy
    );

    event MemberAdded(address indexed member, uint256 timestamp, address indexed addedBy);

    event VotingPowerCapChanged(uint256 oldPercent, uint256 newPercent, address indexed changedBy);

    event AwardLimitChanged(uint256 oldLimit, uint256 newLimit, address indexed changedBy);

    event SlashLimitChanged(uint256 oldLimit, uint256 newLimit, address indexed changedBy);

    event OwnershipTransferInitiated(address indexed from, address indexed to, uint256 timestamp);

    event OwnershipTransferCompleted(address indexed from, uint256 timestamp);

    // Multi-coop events
    event ClearingContractChanged(address indexed oldClearingContract, address indexed newClearingContract, address indexed changedBy);
    event CoopIdChanged(uint256 indexed oldCoopId, uint256 indexed newCoopId, address indexed changedBy);
    event CrossCoopActivity(uint256 indexed fromCoopId, uint256 indexed toCoopId, address indexed member, bytes32 activityType);

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
        _grantRole(MEMBER_MANAGER, admin);
    }

    /**
     * @notice Award SC tokens to a member for completing an activity
     * @param recipient Address to receive SC
     * @param amount Amount of SC to award
     * @param reason Reason code for the award (e.g., keccak256("RENT_PAYMENT"), keccak256("BUSINESS_PURCHASE"), keccak256("COMMUNITY_SERVICE"))
     * @dev Only callable by GOVERNANCE_AWARD role (governance bot/backend)
     * @dev Tracks activity counts to enable activity-based features
     * @dev Recipient must be an active member to receive SC
     */
    function award(
        address recipient,
        uint256 amount,
        bytes32 reason
    ) external onlyRole(GOVERNANCE_AWARD) whenNotPaused {
        require(recipient != address(0), "Cannot award to zero address");
        require(amount > 0, "Amount must be greater than 0");
        require(isActiveMember(recipient), "Recipient must be an active member");

        // Check award limit if set (0 = unlimited)
        if (maxAwardPerTransaction > 0) {
            require(amount <= maxAwardPerTransaction, "Amount exceeds max award limit");
        }

        _mint(recipient, amount);

        // Track activity metrics
        lastActivity[recipient] = block.timestamp;
        totalActivities[recipient] += 1;
        activityTypeCount[recipient][reason] += 1;

        // Optional: Notify clearing contract for cross-coop activity tracking
        if (clearingContract != address(0)) {
            try ICoopClearing(clearingContract).recordCrossCoopActivity(coopId, coopId, recipient, reason) {
                // Success - clearing contract handled the activity
            } catch {
                // Ignore clearing contract errors - don't fail the award
            }
        }

        emit Awarded(recipient, amount, reason, msg.sender);
        emit ActivityRecorded(recipient, reason, block.timestamp);
    }

    /**
     * @notice Slash (reduce) SC tokens from a member
     * @param account Address to slash from
     * @param amount Amount of SC to slash
     * @param reason Reason code for the slash (e.g., keccak256("INACTIVITY_DECAY"))
     * @dev Only callable by GOVERNANCE_SLASH role (governance bot/backend)
     */
    function slash(address account, uint256 amount, bytes32 reason) external onlyRole(GOVERNANCE_SLASH) whenNotPaused {
        require(account != address(0), "Cannot slash zero address");
        require(amount > 0, "Amount must be greater than 0");
        require(balanceOf(account) >= amount, "Insufficient balance to slash");

        // Check slash limit if set (0 = unlimited)
        if (maxSlashPerTransaction > 0) {
            require(amount <= maxSlashPerTransaction, "Amount exceeds max slash limit");
        }

        _burn(account, amount);

        // Optional: Notify clearing contract for cross-coop activity tracking
        if (clearingContract != address(0)) {
            try ICoopClearing(clearingContract).recordCrossCoopActivity(coopId, coopId, account, reason) {
                // Success - clearing contract handled the activity
            } catch {
                // Ignore clearing contract errors - don't fail the slash
            }
        }

        emit Slashed(account, amount, reason, msg.sender);
    }

    /**
     * @notice Slash multiple members in a batch
     * @param accounts Array of addresses to slash from
     * @param amounts Array of amounts to slash (must match accounts length)
     * @param reason Reason code for the slash
     * @dev Only callable by GOVERNANCE_SLASH role
     */
    function slashBatch(
        address[] calldata accounts,
        uint256[] calldata amounts,
        bytes32 reason
    ) external onlyRole(GOVERNANCE_SLASH) whenNotPaused {
        require(accounts.length == amounts.length, "Array length mismatch");
        require(accounts.length > 0, "Empty arrays");

        for (uint256 i = 0; i < accounts.length; i++) {
            address account = accounts[i];
            uint256 amount = amounts[i];

            require(account != address(0), "Cannot slash zero address");
            require(amount > 0, "Amount must be greater than 0");
            require(balanceOf(account) >= amount, "Insufficient balance to slash");

            // Check slash limit if set (0 = unlimited)
            if (maxSlashPerTransaction > 0) {
                require(amount <= maxSlashPerTransaction, "Amount exceeds max slash limit");
            }

            _burn(account, amount);
            emit Slashed(account, amount, reason, msg.sender);
        }
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

    // ========== MEMBERSHIP MANAGEMENT ==========

    /**
     * @notice Add a new member to the co-op
     * @param member Address to add as a member
     * @dev Only callable by MEMBER_MANAGER role
     */
    function addMember(address member) external onlyRole(MEMBER_MANAGER) {
        require(member != address(0), "Cannot add zero address");
        require(memberStatus[member] == MemberStatus.NotMember, "Already a member or has status");

        memberStatus[member] = MemberStatus.Active;
        memberSince[member] = block.timestamp;

        emit MemberAdded(member, block.timestamp, msg.sender);
        emit MemberStatusChanged(member, MemberStatus.NotMember, MemberStatus.Active, msg.sender);
    }

    /**
     * @notice Add multiple members in a batch
     * @param members Array of addresses to add as members
     * @dev Only callable by MEMBER_MANAGER role
     */
    function addMembersBatch(address[] calldata members) external onlyRole(MEMBER_MANAGER) {
        for (uint256 i = 0; i < members.length; i++) {
            address member = members[i];
            if (member != address(0) && memberStatus[member] == MemberStatus.NotMember) {
                memberStatus[member] = MemberStatus.Active;
                memberSince[member] = block.timestamp;

                emit MemberAdded(member, block.timestamp, msg.sender);
                emit MemberStatusChanged(member, MemberStatus.NotMember, MemberStatus.Active, msg.sender);
            }
        }
    }

    /**
     * @notice Update a member's status
     * @param member Address of the member
     * @param newStatus New status to set
     * @dev Only callable by MEMBER_MANAGER role
     */
    function setMemberStatus(address member, MemberStatus newStatus) external onlyRole(MEMBER_MANAGER) {
        require(member != address(0), "Cannot update zero address");
        MemberStatus oldStatus = memberStatus[member];
        require(oldStatus != newStatus, "Status is already set to this value");

        memberStatus[member] = newStatus;

        emit MemberStatusChanged(member, oldStatus, newStatus, msg.sender);
    }

    /**
     * @notice Suspend a member (temporarily prevents receiving SC)
     * @param member Address of the member to suspend
     * @dev Only callable by MEMBER_MANAGER role
     */
    function suspendMember(address member) external onlyRole(MEMBER_MANAGER) {
        require(member != address(0), "Cannot suspend zero address");
        require(memberStatus[member] == MemberStatus.Active, "Member is not active");

        memberStatus[member] = MemberStatus.Suspended;

        emit MemberStatusChanged(member, MemberStatus.Active, MemberStatus.Suspended, msg.sender);
    }

    /**
     * @notice Reactivate a suspended member
     * @param member Address of the member to reactivate
     * @dev Only callable by MEMBER_MANAGER role
     */
    function reactivateMember(address member) external onlyRole(MEMBER_MANAGER) {
        require(member != address(0), "Cannot reactivate zero address");
        require(memberStatus[member] == MemberStatus.Suspended, "Member is not suspended");

        memberStatus[member] = MemberStatus.Active;

        emit MemberStatusChanged(member, MemberStatus.Suspended, MemberStatus.Active, msg.sender);
    }

    /**
     * @notice Ban a member permanently
     * @param member Address of the member to ban
     * @dev Only callable by MEMBER_MANAGER role
     */
    function banMember(address member) external onlyRole(MEMBER_MANAGER) {
        require(member != address(0), "Cannot ban zero address");
        require(memberStatus[member] != MemberStatus.Banned, "Member is already banned");

        MemberStatus oldStatus = memberStatus[member];
        memberStatus[member] = MemberStatus.Banned;

        emit MemberStatusChanged(member, oldStatus, MemberStatus.Banned, msg.sender);
    }

    /**
     * @notice Check if an address is an active member
     * @param account Address to check
     * @return bool True if member is active
     */
    function isActiveMember(address account) public view returns (bool) {
        return memberStatus[account] == MemberStatus.Active;
    }

    /**
     * @notice Check if an address is a registered member (any status except NotMember)
     * @param account Address to check
     * @return bool True if member is registered (Active, Suspended, or Banned)
     */
    function isMember(address account) public view returns (bool) {
        return memberStatus[account] != MemberStatus.NotMember;
    }

    /**
     * @notice Check if an address can receive SC (is active member)
     * @param account Address to check
     * @return bool True if can receive SC
     */
    function canReceiveSC(address account) public view returns (bool) {
        return memberStatus[account] == MemberStatus.Active;
    }

    // ========== ACTIVITY TRACKING ==========

    /**
     * @notice Get time since last activity for an address
     * @param account Address to check
     * @return uint256 Seconds since last activity (0 if never active)
     */
    function getTimeSinceLastActivity(address account) external view returns (uint256) {
        if (lastActivity[account] == 0) return 0;
        return block.timestamp - lastActivity[account];
    }

    /**
     * @notice Get activity statistics for an address
     * @param account Address to check
     * @return total Total number of activities
     * @return lastActive Timestamp of last activity
     */
    function getActivityStats(address account) external view returns (uint256 total, uint256 lastActive) {
        return (totalActivities[account], lastActivity[account]);
    }

    /**
     * @notice Get count of specific activity type for an address
     * @param account Address to check
     * @param activityType The activity type (e.g., keccak256("RENT_PAYMENT"))
     * @return uint256 Count of that activity type
     */
    function getActivityTypeCount(address account, bytes32 activityType) external view returns (uint256) {
        return activityTypeCount[account][activityType];
    }

    // ========== VOTING POWER ==========

    /**
     * @notice Calculate voting power for an address
     * @param account Address to calculate voting power for
     * @return uint256 Voting power (capped at 2% of total supply)
     * @dev Voting power equals SC balance, but cannot exceed 2% of total supply
     */
    function getVotingPower(address account) public view returns (uint256) {
        uint256 balance = balanceOf(account);
        uint256 maxVotingPower = getMaxVotingPower();

        // Cap at 2% of total supply
        return balance > maxVotingPower ? maxVotingPower : balance;
    }

    /**
     * @notice Get maximum voting power (default 2% of total supply, adjustable)
     * @return uint256 Maximum voting power any single address can have
     */
    function getMaxVotingPower() public view returns (uint256) {
        uint256 supply = totalSupply();
        if (supply == 0) return 0;
        return (supply * maxVotingPowerPercent) / 100;
    }

    /**
     * @notice Check if an address has reached the voting power cap
     * @param account Address to check
     * @return bool True if at or above the cap
     */
    function isAtVotingPowerCap(address account) external view returns (bool) {
        return balanceOf(account) >= getMaxVotingPower();
    }

    // ========== ADMIN FUNCTIONS ==========

    /**
     * @notice Set the maximum voting power percentage
     * @param newPercent New maximum voting power percentage (1-10)
     * @dev Only callable by DEFAULT_ADMIN_ROLE (Treasury Safe)
     */
    function setMaxVotingPowerPercent(uint256 newPercent) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newPercent > 0 && newPercent <= 10, "Percent must be between 1 and 10");
        uint256 oldPercent = maxVotingPowerPercent;
        maxVotingPowerPercent = newPercent;
        emit VotingPowerCapChanged(oldPercent, newPercent, msg.sender);
    }

    /**
     * @notice Set the maximum award amount per transaction
     * @param newLimit New maximum award limit (0 = unlimited)
     * @dev Only callable by DEFAULT_ADMIN_ROLE (Treasury Safe)
     */
    function setMaxAwardPerTransaction(uint256 newLimit) external onlyRole(DEFAULT_ADMIN_ROLE) {
        uint256 oldLimit = maxAwardPerTransaction;
        maxAwardPerTransaction = newLimit;
        emit AwardLimitChanged(oldLimit, newLimit, msg.sender);
    }

    /**
     * @notice Set the maximum slash amount per transaction
     * @param newLimit New maximum slash limit (0 = unlimited)
     * @dev Only callable by DEFAULT_ADMIN_ROLE (Treasury Safe)
     */
    function setMaxSlashPerTransaction(uint256 newLimit) external onlyRole(DEFAULT_ADMIN_ROLE) {
        uint256 oldLimit = maxSlashPerTransaction;
        maxSlashPerTransaction = newLimit;
        emit SlashLimitChanged(oldLimit, newLimit, msg.sender);
    }

    /**
     * @notice Pause all SC awards and slashing
     * @dev Only callable by DEFAULT_ADMIN_ROLE (Treasury Safe) - Emergency use only
     */
    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    /**
     * @notice Unpause SC awards and slashing
     * @dev Only callable by DEFAULT_ADMIN_ROLE (Treasury Safe)
     */
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    /**
     * @notice Initiate transfer of admin role to new address
     * @param newAdmin Address of new admin (typically a new multisig)
     * @dev New admin is granted role, old admin should call completeOwnershipTransfer after verification
     */
    function initiateOwnershipTransfer(address newAdmin) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newAdmin != address(0), "Cannot transfer to zero address");
        require(!hasRole(DEFAULT_ADMIN_ROLE, newAdmin), "Address already has admin role");

        grantRole(DEFAULT_ADMIN_ROLE, newAdmin);
        emit OwnershipTransferInitiated(msg.sender, newAdmin, block.timestamp);
    }

    /**
     * @notice Complete ownership transfer by renouncing old admin role
     * @dev Can only be called if there's another admin (prevents locking contract)
     */
    function completeOwnershipTransfer() external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(getRoleMemberCount(DEFAULT_ADMIN_ROLE) > 1, "Would leave contract without admin");
        renounceRole(DEFAULT_ADMIN_ROLE, msg.sender);
        emit OwnershipTransferCompleted(msg.sender, block.timestamp);
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

    /**
     * @dev Override required by Solidity for multiple inheritance
     */
    function _update(address from, address to, uint256 value) internal override(ERC20, ERC20Pausable) {
        super._update(from, to, value);
    }

    /**
     * @dev Override required by Solidity for AccessControlEnumerable
     */
    function supportsInterface(bytes4 interfaceId) public view override(AccessControlEnumerable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    // ========== MULTI-COOP ADMIN FUNCTIONS ==========

    /**
     * @notice Set the clearing contract address for cross-coop functionality
     * @param newClearingContract Address of the clearing contract
     * @dev Only callable by DEFAULT_ADMIN_ROLE
     * @dev Used for future multi-coop cross-settlement
     */
    function setClearingContract(address newClearingContract) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newClearingContract != address(0), "Clearing contract cannot be zero address");
        address oldClearingContract = clearingContract;
        clearingContract = newClearingContract;
        emit ClearingContractChanged(oldClearingContract, newClearingContract, msg.sender);
    }

    /**
     * @notice Set the coop ID for this contract
     * @param newCoopId New coop ID to assign
     * @dev Only callable by DEFAULT_ADMIN_ROLE
     * @dev Used for future multi-coop identification
     */
    function setCoopId(uint256 newCoopId) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newCoopId > 0, "Coop ID must be greater than 0");
        uint256 oldCoopId = coopId;
        coopId = newCoopId;
        emit CoopIdChanged(oldCoopId, newCoopId, msg.sender);
    }
}
