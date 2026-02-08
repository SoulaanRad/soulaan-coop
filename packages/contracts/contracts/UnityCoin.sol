// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import "@openzeppelin/contracts/access/extensions/AccessControlEnumerable.sol";

// Interface to check membership status from SoulaaniCoin
interface ISoulaaniCoin {
    function isActiveMember(address account) external view returns (bool);
    function isMember(address account) external view returns (bool);
}

// Interface for future cross-coop clearing functionality
interface ICoopClearing {
    function recordCrossCoopTransfer(uint256 fromCoopId, uint256 toCoopId, address from, address to, uint256 amount) external;
}

/**
 * @title UnityCoin (UC)
 * @notice Stable digital currency for the Soulaan Co-op economy
 * @dev ERC-20 token with role-based minting, burning, and pausing
 *
 * UC is pegged 70% to USD, 30% to essential community goods/services.
 * Used for rent, retail, labor, and routing Co-op fees/capital flows.
 *
 * Membership Requirements:
 * - Regular transfers: Only ACTIVE SC members can send or receive UC
 * - Emergency transfers: Any REGISTERED SC member (Active, Suspended, or Banned)
 * - Verified against SoulaaniCoin contract (source of truth)
 * - System contracts (whitelisted) can bypass membership checks
 * - Minting and burning still allowed by authorized roles
 *
 * System Contracts:
 * - Whitelisted contracts (e.g., RedemptionVault, DEX) can send/receive UC
 * - Users interacting with system contracts must still be active members
 * - Enables vaults, exchanges, and other co-op infrastructure
 *
 * Emergency Transfers:
 * - Admin can transfer UC to/from any registered member (not just Active)
 * - Used for exceptional cases: wrongful suspensions, special exceptions
 * - Still requires recipient to be a registered SC member (not NotMember)
 * - Protects against sending funds to non-co-op addresses
 *
 * Roles:
 * - TREASURER_MINT: Can mint unlimited UC tokens (held by Treasury Safe multisig)
 * - ONRAMP_MINTER: Can mint UC up to daily limit (backend for instant onramps)
 * - PAUSER: Can pause/unpause all transfers (held by Treasury Safe multisig)
 * - SYSTEM_CONTRACT_MANAGER: Can whitelist/remove system contracts
 * - DEFAULT_ADMIN: Can grant/revoke roles (deployer initially, then Treasury Safe)
 */
contract UnityCoin is ERC20, ERC20Burnable, ERC20Pausable, AccessControlEnumerable {
    // Role definitions
    bytes32 public constant TREASURER_MINT = keccak256("TREASURER_MINT");
    bytes32 public constant BACKEND = keccak256("BACKEND");
    bytes32 public constant PAUSER = keccak256("PAUSER");
    bytes32 public constant SYSTEM_CONTRACT_MANAGER = keccak256("SYSTEM_CONTRACT_MANAGER");

    // Reference to SoulaaniCoin for membership verification
    ISoulaaniCoin public soulaaniCoin;

    // Whitelisted system contracts (can send/receive UC without membership check)
    mapping(address => bool) public isSystemContract;

    // Emergency transfer flag (bypasses membership checks)
    bool private _inEmergencyTransfer;

    // Daily minting limits for BACKEND role
    mapping(address => uint256) public dailyMintLimit;
    mapping(address => uint256) public dailyMinted;
    mapping(address => uint256) public lastMintDay;

    // Fee collection
    uint256 public transferFeePercent = 10; // 0.1% = 10 basis points
    address public feeRecipient;

    // Multi-coop foundation (minimal)
    uint256 public coopId = 1; // Default to Soulaan Co-op
    address public clearingContract = address(0); // Future cross-coop clearing

    // Events
    event Minted(address indexed to, uint256 amount, address indexed minter);
    event Burned(address indexed from, uint256 amount);
    // Note: Paused and Unpaused events are inherited from OpenZeppelin's Pausable
    event DailyLimitSet(address indexed minter, uint256 limit);
    event DailyLimitReset(address indexed minter, uint256 newDay);
    event SystemContractAdded(address indexed contractAddress, address indexed addedBy);
    event SystemContractRemoved(address indexed contractAddress, address indexed removedBy);
    event OwnershipTransferInitiated(address indexed from, address indexed to, uint256 timestamp);
    event OwnershipTransferCompleted(address indexed from, uint256 timestamp);
    
    // Fee events
    event FeeCollected(address indexed from, uint256 amount, address indexed recipient);
    event TransferFeeChanged(uint256 oldPercent, uint256 newPercent, address indexed changedBy);
    event FeeRecipientChanged(address indexed oldRecipient, address indexed newRecipient, address indexed changedBy);

    // Multi-coop events
    event ClearingContractChanged(address indexed oldClearingContract, address indexed newClearingContract, address indexed changedBy);
    event CoopIdChanged(uint256 indexed oldCoopId, uint256 indexed newCoopId, address indexed changedBy);
    event CrossCoopTransfer(uint256 indexed fromCoopId, uint256 indexed toCoopId, address indexed from, address to, uint256 amount);
    
    // SoulaaniCoin reference update event
    event SoulaaniCoinAddressChanged(address indexed oldAddress, address indexed newAddress, address indexed changedBy);

    /**
     * @notice Constructor - initializes UC token
     * @param admin Address that will have admin role (can grant other roles)
     * @param _soulaaniCoin Address of the SoulaaniCoin contract (for membership verification)
     * @param redemptionVault Address of the RedemptionVault contract (for USDC onboarding)
     */
    constructor(address admin, address _soulaaniCoin, address redemptionVault) ERC20("UnityCoin", "UC") {
        require(admin != address(0), "Admin cannot be zero address");
        require(_soulaaniCoin != address(0), "SoulaaniCoin address cannot be zero");
        require(redemptionVault != address(0), "RedemptionVault address cannot be zero");

        soulaaniCoin = ISoulaaniCoin(_soulaaniCoin);

        // Grant admin role to specified address
        _grantRole(DEFAULT_ADMIN_ROLE, admin);

        // Admin starts with all roles, can transfer them later
        _grantRole(TREASURER_MINT, admin);
        _grantRole(BACKEND, admin);
        _grantRole(PAUSER, admin);
        _grantRole(SYSTEM_CONTRACT_MANAGER, admin);

        // Grant RedemptionVault permission to mint UC for USDC onboarding
        _grantRole(TREASURER_MINT, redemptionVault);
    }

    /**
     * @notice Mint new UC tokens (unlimited, for Treasury Safe)
     * @param to Address to receive the tokens
     * @param amount Amount of tokens to mint (in wei, 18 decimals)
     * @dev Only callable by TREASURER_MINT role (Treasury Safe)
     * @dev Recipient must be an active SC member
     */
    function mint(address to, uint256 amount) external onlyRole(TREASURER_MINT) {
        require(to != address(0), "Cannot mint to zero address");
        require(amount > 0, "Amount must be greater than 0");
        require(soulaaniCoin.isActiveMember(to), "Recipient must be an active SC member");

        _mint(to, amount);

        // Optional: Notify clearing contract for cross-coop transfer tracking
        if (clearingContract != address(0)) {
            try ICoopClearing(clearingContract).recordCrossCoopTransfer(coopId, coopId, address(0), to, amount) {
                // Success - clearing contract handled the transfer
            } catch {
                // Ignore clearing contract errors - don't fail the mint
            }
        }

        emit Minted(to, amount, msg.sender);
    }

    /**
     * @notice Mint UC tokens with daily limit (for instant onramps)
     * @param to Address to receive the tokens
     * @param amount Amount of tokens to mint (in wei, 18 decimals)
     * @dev Only callable by BACKEND role (backend)
     * @dev Subject to daily minting limit set by admin
     * @dev Recipient must be an active SC member
     */
    function mintOnramp(address to, uint256 amount) external onlyRole(BACKEND) {
        require(to != address(0), "Cannot mint to zero address");
        require(amount > 0, "Amount must be greater than 0");
        require(dailyMintLimit[msg.sender] > 0, "Daily limit not set");
        require(soulaaniCoin.isActiveMember(to), "Recipient must be an active SC member");

        // Reset daily counter if it's a new day
        uint256 currentDay = block.timestamp / 1 days;
        if (currentDay > lastMintDay[msg.sender]) {
            dailyMinted[msg.sender] = 0;
            lastMintDay[msg.sender] = currentDay;
            emit DailyLimitReset(msg.sender, currentDay);
        }

        // Check daily limit
        require(dailyMinted[msg.sender] + amount <= dailyMintLimit[msg.sender], "Daily minting limit exceeded");

        dailyMinted[msg.sender] += amount;
        _mint(to, amount);

        // Optional: Notify clearing contract for cross-coop transfer tracking
        if (clearingContract != address(0)) {
            try ICoopClearing(clearingContract).recordCrossCoopTransfer(coopId, coopId, address(0), to, amount) {
                // Success - clearing contract handled the transfer
            } catch {
                // Ignore clearing contract errors - don't fail the mint
            }
        }

        emit Minted(to, amount, msg.sender);
    }

    /**
     * @notice Set daily minting limit for a BACKEND
     * @param minter Address of the minter
     * @param limit Daily minting limit in wei (18 decimals)
     * @dev Only callable by DEFAULT_ADMIN (Treasury Safe)
     */
    function setDailyMintLimit(address minter, uint256 limit) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(hasRole(BACKEND, minter), "Address is not a backend minter");
        dailyMintLimit[minter] = limit;
        emit DailyLimitSet(minter, limit);
    }

    /**
     * @notice Get remaining daily mint capacity for a minter
     * @param minter Address to check
     * @return remaining Amount that can still be minted today
     */
    function getRemainingDailyMint(address minter) external view returns (uint256) {
        if (dailyMintLimit[minter] == 0) return 0;

        // Check if it's a new day
        uint256 currentDay = block.timestamp / 1 days;
        if (currentDay > lastMintDay[minter]) {
            return dailyMintLimit[minter]; // Full limit available
        }

        if (dailyMinted[minter] >= dailyMintLimit[minter]) {
            return 0; // Limit exhausted
        }

        return dailyMintLimit[minter] - dailyMinted[minter];
    }

    /**
     * @notice Burn UC tokens from caller's balance
     * @param amount Amount of tokens to burn
     * @dev Anyone can burn their own tokens
     */
    function burn(uint256 amount) public override {
        super.burn(amount);

        // Optional: Notify clearing contract for cross-coop transfer tracking
        if (clearingContract != address(0)) {
            try ICoopClearing(clearingContract).recordCrossCoopTransfer(coopId, coopId, msg.sender, address(0), amount) {
                // Success - clearing contract handled the transfer
            } catch {
                // Ignore clearing contract errors - don't fail the burn
            }
        }

        emit Burned(msg.sender, amount);
    }

    /**
     * @notice Burn UC tokens from another address (requires approval)
     * @param account Address to burn from
     * @param amount Amount to burn
     */
    function burnFrom(address account, uint256 amount) public override {
        super.burnFrom(account, amount);

        // Optional: Notify clearing contract for cross-coop transfer tracking
        if (clearingContract != address(0)) {
            try ICoopClearing(clearingContract).recordCrossCoopTransfer(coopId, coopId, account, address(0), amount) {
                // Success - clearing contract handled the transfer
            } catch {
                // Ignore clearing contract errors - don't fail the burn
            }
        }

        emit Burned(account, amount);
    }

    /**
     * @notice Pause all token transfers
     * @dev Only callable by PAUSER role
     */
    function pause() external onlyRole(PAUSER) {
        _pause();
    }

    /**
     * @notice Unpause token transfers
     * @dev Only callable by PAUSER role
     */
    function unpause() external onlyRole(PAUSER) {
        _unpause();
    }

    /**
     * @notice Check if an address can use UC (is active SC member)
     * @param account Address to check
     * @return bool True if account can use UC
     */
    function canUseUC(address account) external view returns (bool) {
        return soulaaniCoin.isActiveMember(account);
    }

    // ========== SYSTEM CONTRACT MANAGEMENT ==========

    /**
     * @notice Add a system contract to whitelist (bypasses membership checks)
     * @param contractAddress Address of the system contract
     * @dev Only callable by SYSTEM_CONTRACT_MANAGER role
     * @dev System contracts can send/receive UC without being SC members
     */
    function addSystemContract(address contractAddress) external onlyRole(SYSTEM_CONTRACT_MANAGER) {
        require(contractAddress != address(0), "Cannot whitelist zero address");
        require(!isSystemContract[contractAddress], "Already a system contract");

        isSystemContract[contractAddress] = true;
        emit SystemContractAdded(contractAddress, msg.sender);
    }

    /**
     * @notice Remove a system contract from whitelist
     * @param contractAddress Address of the system contract
     * @dev Only callable by SYSTEM_CONTRACT_MANAGER role
     */
    function removeSystemContract(address contractAddress) external onlyRole(SYSTEM_CONTRACT_MANAGER) {
        require(isSystemContract[contractAddress], "Not a system contract");

        isSystemContract[contractAddress] = false;
        emit SystemContractRemoved(contractAddress, msg.sender);
    }

    /**
     * @notice Emergency transfer that bypasses active status checks
     * @param from Address to transfer from
     * @param to Address to transfer to
     * @param amount Amount to transfer
     * @dev Only callable by DEFAULT_ADMIN role (Treasury Safe)
     * @dev Use ONLY for exceptional cases (e.g., refunding suspended users, emergency situations)
     * @dev Bypasses Active status requirement but still requires parties to be registered SC members
     * @dev Can transfer to/from: Active, Suspended, or Banned members (not NotMember)
     */
    function emergencyTransfer(
        address from,
        address to,
        uint256 amount
    ) external onlyRole(DEFAULT_ADMIN_ROLE) returns (bool) {
        require(from != address(0), "Cannot transfer from zero address");
        require(to != address(0), "Cannot transfer to zero address");
        require(amount > 0, "Amount must be greater than 0");

        // Require both parties to be registered members (but not necessarily Active)
        // System contracts bypass this check
        if (!isSystemContract[from]) {
            require(soulaaniCoin.isMember(from), "Sender must be a registered SC member");
        }
        if (!isSystemContract[to]) {
            require(soulaaniCoin.isMember(to), "Recipient must be a registered SC member");
        }

        // Set emergency flag to bypass Active status checks
        _inEmergencyTransfer = true;

        // Perform transfer
        _transfer(from, to, amount);

        // Reset emergency flag
        _inEmergencyTransfer = false;

        emit Minted(to, amount, msg.sender); // Reuse event for tracking admin actions

        return true;
    }

    // ========== ADMIN FUNCTIONS ==========

    /**
     * @notice Set the transfer fee percentage
     * @param newPercent New fee percentage in basis points (100 = 1%)
     * @dev Only callable by DEFAULT_ADMIN_ROLE
     * @dev Maximum fee is 100 basis points (1%)
     */
    function setTransferFee(uint256 newPercent) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newPercent <= 100, "Fee cannot exceed 1%");
        uint256 oldPercent = transferFeePercent;
        transferFeePercent = newPercent;
        emit TransferFeeChanged(oldPercent, newPercent, msg.sender);
    }

    /**
     * @notice Set the fee recipient address
     * @param newRecipient Address to receive transfer fees
     * @dev Only callable by DEFAULT_ADMIN_ROLE
     */
    function setFeeRecipient(address newRecipient) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newRecipient != address(0), "Fee recipient cannot be zero address");
        address oldRecipient = feeRecipient;
        feeRecipient = newRecipient;
        emit FeeRecipientChanged(oldRecipient, newRecipient, msg.sender);
    }

    /**
     * @notice Update SoulaaniCoin contract reference
     * @param newSoulaaniCoin New SoulaaniCoin contract address
     * @dev Only callable by DEFAULT_ADMIN_ROLE. Allows upgrading SC contract independently.
     */
    function setSoulaaniCoinAddress(address newSoulaaniCoin) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newSoulaaniCoin != address(0), "SoulaaniCoin cannot be zero address");
        address oldAddress = address(soulaaniCoin);
        soulaaniCoin = ISoulaaniCoin(newSoulaaniCoin);
        emit SoulaaniCoinAddressChanged(oldAddress, newSoulaaniCoin, msg.sender);
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

    // Required overrides for multiple inheritance
    function _update(address from, address to, uint256 amount) internal override(ERC20, ERC20Pausable) {
        // Allow minting (from == 0) and burning (to == 0)
        // Skip membership checks if in emergency transfer mode
        if (from != address(0) && to != address(0) && !_inEmergencyTransfer) {
            // Check sender membership (unless sender is a whitelisted system contract)
            if (!isSystemContract[from]) {
                require(soulaaniCoin.isActiveMember(from), "Sender must be an active SC member");
            }

            // Check recipient membership (unless recipient is a whitelisted system contract)
            if (!isSystemContract[to]) {
                require(soulaaniCoin.isActiveMember(to), "Recipient must be an active SC member");
            }

            // Collect transfer fee (only on transfers between users, not mints/burns)
            if (transferFeePercent > 0 && feeRecipient != address(0)) {
                uint256 fee = (amount * transferFeePercent) / 10000; // Basis points
                if (fee > 0) {
                    _mint(feeRecipient, fee);
                    emit FeeCollected(from, fee, feeRecipient);
                }
            }
        }

        super._update(from, to, amount);
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
