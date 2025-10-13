// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title UnityCoin (UC)
 * @notice Stable digital currency for the Soulaan Co-op economy
 * @dev ERC-20 token with role-based minting, burning, and pausing
 * 
 * UC is pegged 70% to USD, 30% to essential community goods/services.
 * Used for rent, retail, labor, and routing Co-op fees/capital flows.
 * 
 * Roles:
 * - TREASURER_MINT: Can mint unlimited UC tokens (held by Treasury Safe multisig)
 * - ONRAMP_MINTER: Can mint UC up to daily limit (backend for instant onramps)
 * - PAUSER: Can pause/unpause all transfers (held by Treasury Safe multisig)
 * - DEFAULT_ADMIN: Can grant/revoke roles (deployer initially, then Treasury Safe)
 */
contract UnityCoin is ERC20, ERC20Burnable, ERC20Pausable, AccessControl {
    // Role definitions
    bytes32 public constant TREASURER_MINT = keccak256("TREASURER_MINT");
    bytes32 public constant ONRAMP_MINTER = keccak256("ONRAMP_MINTER");
    bytes32 public constant PAUSER = keccak256("PAUSER");

    // Daily minting limits for ONRAMP_MINTER role
    mapping(address => uint256) public dailyMintLimit;
    mapping(address => uint256) public dailyMinted;
    mapping(address => uint256) public lastMintDay;

    // Events
    event Minted(address indexed to, uint256 amount, address indexed minter);
    event Burned(address indexed from, uint256 amount);
    // Note: Paused and Unpaused events are inherited from OpenZeppelin's Pausable
    event DailyLimitSet(address indexed minter, uint256 limit);
    event DailyLimitReset(address indexed minter, uint256 newDay);

    /**
     * @notice Constructor - initializes UC token
     * @param admin Address that will have admin role (can grant other roles)
     */
    constructor(address admin) ERC20("UnityCoin", "UC") {
        require(admin != address(0), "Admin cannot be zero address");
        
        // Grant admin role to specified address
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        
        // Admin starts with all roles, can transfer them later
        _grantRole(TREASURER_MINT, admin);
        _grantRole(PAUSER, admin);
    }

    /**
     * @notice Mint new UC tokens (unlimited, for Treasury Safe)
     * @param to Address to receive the tokens
     * @param amount Amount of tokens to mint (in wei, 18 decimals)
     * @dev Only callable by TREASURER_MINT role (Treasury Safe)
     */
    function mint(address to, uint256 amount) external onlyRole(TREASURER_MINT) {
        require(to != address(0), "Cannot mint to zero address");
        require(amount > 0, "Amount must be greater than 0");
        
        _mint(to, amount);
        emit Minted(to, amount, msg.sender);
    }

    /**
     * @notice Mint UC tokens with daily limit (for instant onramps)
     * @param to Address to receive the tokens
     * @param amount Amount of tokens to mint (in wei, 18 decimals)
     * @dev Only callable by ONRAMP_MINTER role (backend)
     * @dev Subject to daily minting limit set by admin
     */
    function mintOnramp(address to, uint256 amount) external onlyRole(ONRAMP_MINTER) {
        require(to != address(0), "Cannot mint to zero address");
        require(amount > 0, "Amount must be greater than 0");
        require(dailyMintLimit[msg.sender] > 0, "Daily limit not set");

        // Reset daily counter if it's a new day
        uint256 currentDay = block.timestamp / 1 days;
        if (currentDay > lastMintDay[msg.sender]) {
            dailyMinted[msg.sender] = 0;
            lastMintDay[msg.sender] = currentDay;
            emit DailyLimitReset(msg.sender, currentDay);
        }

        // Check daily limit
        require(
            dailyMinted[msg.sender] + amount <= dailyMintLimit[msg.sender],
            "Daily minting limit exceeded"
        );

        dailyMinted[msg.sender] += amount;
        _mint(to, amount);
        emit Minted(to, amount, msg.sender);
    }

    /**
     * @notice Set daily minting limit for an ONRAMP_MINTER
     * @param minter Address of the minter
     * @param limit Daily minting limit in wei (18 decimals)
     * @dev Only callable by DEFAULT_ADMIN (Treasury Safe)
     */
    function setDailyMintLimit(address minter, uint256 limit) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        require(hasRole(ONRAMP_MINTER, minter), "Address is not an onramp minter");
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
        emit Burned(msg.sender, amount);
    }

    /**
     * @notice Burn UC tokens from another address (requires approval)
     * @param account Address to burn from
     * @param amount Amount to burn
     */
    function burnFrom(address account, uint256 amount) public override {
        super.burnFrom(account, amount);
        emit Burned(account, amount);
    }

    /**
     * @notice Pause all token transfers
     * @dev Only callable by PAUSER role (Treasury Safe)
     */
    function pause() external onlyRole(PAUSER) {
        _pause();
        emit Paused(msg.sender);
    }

    /**
     * @notice Unpause token transfers
     * @dev Only callable by PAUSER role (Treasury Safe)
     */
    function unpause() external onlyRole(PAUSER) {
        _unpause();
        emit Unpaused(msg.sender);
    }

    /**
     * @notice Check if token transfers are paused
     * @return bool True if paused, false otherwise
     */
    function isPaused() external view returns (bool) {
        return paused();
    }

    // Required overrides for multiple inheritance
    function _update(
        address from,
        address to,
        uint256 amount
    ) internal override(ERC20, ERC20Pausable) {
        super._update(from, to, amount);
    }
}

