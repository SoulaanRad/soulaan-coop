// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/extensions/AccessControlEnumerable.sol";

/**
 * @title PegManager
 * @notice Manages UC peg price for backend-controlled updates
 * @dev Backend can update peg price, admin can grant roles
 *
 * Roles:
 * - BACKEND: Can update peg price
 * - DEFAULT_ADMIN: Can grant/revoke roles
 */
contract PegManager is AccessControlEnumerable {
    // Role definitions
    bytes32 public constant BACKEND = keccak256("BACKEND");

    // Peg state
    uint256 public currentPegPrice = 1e18; // 1 UC = 1 USD initially (18 decimals)
    uint256 public lastUpdate;

    // Events
    event PegUpdated(uint256 oldPrice, uint256 newPrice, uint256 timestamp, address indexed updater);

    /**
     * @notice Constructor
     * @param admin Address that will have admin role
     */
    constructor(address admin) {
        require(admin != address(0), "Admin cannot be zero address");

        // Grant admin role
        _grantRole(DEFAULT_ADMIN_ROLE, admin);

        // Set initial update time
        lastUpdate = block.timestamp;
    }

    /**
     * @notice Update peg price
     * @param newPrice New peg price (18 decimals)
     * @dev Only callable by BACKEND role
     */
    function updatePeg(uint256 newPrice) external onlyRole(BACKEND) {
        require(newPrice > 0, "Peg price cannot be zero");

        uint256 oldPrice = currentPegPrice;
        currentPegPrice = newPrice;
        lastUpdate = block.timestamp;

        emit PegUpdated(oldPrice, newPrice, block.timestamp, msg.sender);
    }

    /**
     * @notice Get current peg price
     * @return uint256 Current peg price (18 decimals)
     */
    function getCurrentPegPrice() external view returns (uint256) {
        return currentPegPrice;
    }

    /**
     * @dev Override required by Solidity for AccessControlEnumerable
     */
    function supportsInterface(bytes4 interfaceId) public view override(AccessControlEnumerable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
