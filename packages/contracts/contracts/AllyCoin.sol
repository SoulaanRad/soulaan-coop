// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import "@openzeppelin/contracts/access/extensions/AccessControlEnumerable.sol";

interface ISoulaaniCoinForAlly {
    function isMember(address account) external view returns (bool);
    function isActiveMember(address account) external view returns (bool);
    function maxAwardPerTransaction() external view returns (uint256);
    function maxSlashPerTransaction() external view returns (uint256);
}

/**
 * @title AllyCoin
 * @notice Non-transferable, soulbound token for approved non-voting allies
 * @dev Managed by the same governance actors as SC, while keeping ally balances
 *      separate from voting-member SC balances and rights.
 */
contract AllyCoin is ERC20, ERC20Pausable, AccessControlEnumerable {
    bytes32 public constant GOVERNANCE_MANAGER = keccak256("GOVERNANCE_MANAGER");
    bytes32 public constant GOVERNANCE_AWARD = keccak256("GOVERNANCE_AWARD");
    bytes32 public constant GOVERNANCE_SLASH = keccak256("GOVERNANCE_SLASH");
    bytes32 public constant MEMBER_MANAGER = keccak256("MEMBER_MANAGER");

    enum MemberStatus {
        NotMember,
        Active,
        Suspended,
        Banned
    }

    ISoulaaniCoinForAlly public soulaaniCoin;
    mapping(address => MemberStatus) public memberStatus;
    mapping(address => uint256) public memberSince;

    event Awarded(address indexed recipient, uint256 amount, bytes32 indexed reason, address indexed awarder);
    event Slashed(address indexed account, uint256 amount, bytes32 indexed reason, address indexed slasher);
    event MemberStatusChanged(
        address indexed member,
        MemberStatus oldStatus,
        MemberStatus newStatus,
        address indexed changedBy
    );
    event MemberAdded(address indexed member, uint256 timestamp, address indexed addedBy);
    event SoulaaniCoinAddressChanged(address indexed oldAddress, address indexed newAddress, address indexed changedBy);

    constructor(address admin, address _soulaaniCoin) ERC20("AllyCoin", "ALLY") {
        require(admin != address(0), "Admin cannot be zero address");
        require(_soulaaniCoin != address(0), "SoulaaniCoin cannot be zero address");

        soulaaniCoin = ISoulaaniCoinForAlly(_soulaaniCoin);

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(GOVERNANCE_MANAGER, admin);
        _grantRole(GOVERNANCE_AWARD, admin);
        _grantRole(GOVERNANCE_SLASH, admin);
        _grantRole(MEMBER_MANAGER, admin);
    }

    function mintReward(
        address recipient,
        uint256 amount,
        bytes32 reason
    ) external onlyRole(GOVERNANCE_AWARD) whenNotPaused {
        require(recipient != address(0), "Cannot mint to zero address");
        require(amount > 0, "Amount must be greater than 0");
        require(isActiveMember(recipient), "Recipient must be an active ally");

        uint256 scMintLimit = soulaaniCoin.maxAwardPerTransaction();
        if (scMintLimit > 0) {
            require(amount <= scMintLimit, "Amount exceeds SC-linked mint limit");
        }

        _mint(recipient, amount);
        emit Awarded(recipient, amount, reason, msg.sender);
    }

    function slash(
        address account,
        uint256 amount,
        bytes32 reason
    ) external onlyRole(GOVERNANCE_SLASH) whenNotPaused {
        require(account != address(0), "Cannot slash zero address");
        require(amount > 0, "Amount must be greater than 0");
        require(balanceOf(account) >= amount, "Insufficient balance to slash");

        uint256 scSlashLimit = soulaaniCoin.maxSlashPerTransaction();
        if (scSlashLimit > 0) {
            require(amount <= scSlashLimit, "Amount exceeds SC-linked slash limit");
        }

        _burn(account, amount);
        emit Slashed(account, amount, reason, msg.sender);
    }

    function addMember(address member) external onlyRole(MEMBER_MANAGER) {
        require(member != address(0), "Cannot add zero address");
        require(memberStatus[member] == MemberStatus.NotMember, "Already a member or has status");

        memberStatus[member] = MemberStatus.Active;
        memberSince[member] = block.timestamp;

        emit MemberAdded(member, block.timestamp, msg.sender);
        emit MemberStatusChanged(member, MemberStatus.NotMember, MemberStatus.Active, msg.sender);
    }

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

    function setMemberStatus(address member, MemberStatus newStatus) external onlyRole(MEMBER_MANAGER) {
        require(member != address(0), "Cannot update zero address");
        MemberStatus oldStatus = memberStatus[member];
        require(oldStatus != newStatus, "Status is already set to this value");

        memberStatus[member] = newStatus;
        emit MemberStatusChanged(member, oldStatus, newStatus, msg.sender);
    }

    function suspendMember(address member) external onlyRole(MEMBER_MANAGER) {
        require(member != address(0), "Cannot suspend zero address");
        require(memberStatus[member] == MemberStatus.Active, "Member is not active");

        memberStatus[member] = MemberStatus.Suspended;
        emit MemberStatusChanged(member, MemberStatus.Active, MemberStatus.Suspended, msg.sender);
    }

    function reactivateMember(address member) external onlyRole(MEMBER_MANAGER) {
        require(member != address(0), "Cannot reactivate zero address");
        require(memberStatus[member] == MemberStatus.Suspended, "Member is not suspended");

        memberStatus[member] = MemberStatus.Active;
        emit MemberStatusChanged(member, MemberStatus.Suspended, MemberStatus.Active, msg.sender);
    }

    function banMember(address member) external onlyRole(MEMBER_MANAGER) {
        require(member != address(0), "Cannot ban zero address");
        require(memberStatus[member] != MemberStatus.Banned, "Member is already banned");

        MemberStatus oldStatus = memberStatus[member];
        memberStatus[member] = MemberStatus.Banned;
        emit MemberStatusChanged(member, oldStatus, MemberStatus.Banned, msg.sender);
    }

    function isActiveMember(address account) public view returns (bool) {
        return memberStatus[account] == MemberStatus.Active;
    }

    function isMember(address account) public view returns (bool) {
        return memberStatus[account] != MemberStatus.NotMember;
    }

    function canReceiveAlly(address account) external view returns (bool) {
        return isActiveMember(account);
    }

    function isScMember(address account) external view returns (bool) {
        return soulaaniCoin.isMember(account);
    }

    function isActiveScMember(address account) external view returns (bool) {
        return soulaaniCoin.isActiveMember(account);
    }

    function getScMintLimit() external view returns (uint256) {
        return soulaaniCoin.maxAwardPerTransaction();
    }

    function getScSlashLimit() external view returns (uint256) {
        return soulaaniCoin.maxSlashPerTransaction();
    }

    function setSoulaaniCoinAddress(address newSoulaaniCoin, string calldata reason) external onlyRole(GOVERNANCE_MANAGER) {
        require(newSoulaaniCoin != address(0), "SoulaaniCoin cannot be zero address");
        address oldAddress = address(soulaaniCoin);
        soulaaniCoin = ISoulaaniCoinForAlly(newSoulaaniCoin);
        emit SoulaaniCoinAddressChanged(oldAddress, newSoulaaniCoin, msg.sender);
        reason;
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    function transfer(address, uint256) public pure override returns (bool) {
        revert("ALLY is non-transferable (soulbound)");
    }

    function transferFrom(address, address, uint256) public pure override returns (bool) {
        revert("ALLY is non-transferable (soulbound)");
    }

    function approve(address, uint256) public pure override returns (bool) {
        revert("ALLY is non-transferable (soulbound)");
    }

    function allowance(address, address) public pure override returns (uint256) {
        return 0;
    }

    function increaseAllowance(address, uint256) public pure returns (bool) {
        revert("ALLY is non-transferable (soulbound)");
    }

    function decreaseAllowance(address, uint256) public pure returns (bool) {
        revert("ALLY is non-transferable (soulbound)");
    }

    function _update(address from, address to, uint256 value) internal override(ERC20, ERC20Pausable) {
        super._update(from, to, value);
    }

    function supportsInterface(bytes4 interfaceId) public view override(AccessControlEnumerable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
