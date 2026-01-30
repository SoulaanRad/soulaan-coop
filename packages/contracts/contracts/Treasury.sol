// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/extensions/AccessControlEnumerable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title Treasury
 * @notice Treasury contract for managing UC fees and AI bot payments
 * @dev Receives UC fees from transfers and allows backend to withdraw for AI payments
 *
 * Roles:
 * - BACKEND: Can withdraw UC for AI bot payments
 * - DEFAULT_ADMIN: Can grant/revoke roles and emergency withdraw
 */
contract Treasury is AccessControlEnumerable, ReentrancyGuard {
    // Role definitions
    bytes32 public constant BACKEND = keccak256("BACKEND");

    // UC token reference
    IERC20 public immutable unityCoin;

    // Events
    event Withdrawn(address indexed to, uint256 amount, address indexed withdrawer);
    event EmergencyWithdrawal(address indexed to, uint256 amount, address indexed admin);

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
    }

    /**
     * @notice Withdraw UC from treasury for AI bot payments
     * @param to Address to send UC to
     * @param amount Amount of UC to withdraw
     * @dev Only callable by BACKEND role
     */
    function withdraw(address to, uint256 amount) external onlyRole(BACKEND) nonReentrant {
        require(to != address(0), "Cannot withdraw to zero address");
        require(amount > 0, "Amount must be greater than 0");
        require(unityCoin.balanceOf(address(this)) >= amount, "Insufficient treasury balance");

        require(unityCoin.transfer(to, amount), "UC transfer failed");

        emit Withdrawn(to, amount, msg.sender);
    }

    /**
     * @notice Emergency withdrawal by admin
     * @param to Address to send UC to
     * @param amount Amount of UC to withdraw
     * @dev Only callable by DEFAULT_ADMIN_ROLE
     */
    function emergencyWithdraw(address to, uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) nonReentrant {
        require(to != address(0), "Cannot withdraw to zero address");
        require(amount > 0, "Amount must be greater than 0");
        require(unityCoin.balanceOf(address(this)) >= amount, "Insufficient treasury balance");

        require(unityCoin.transfer(to, amount), "UC transfer failed");

        emit EmergencyWithdrawal(to, amount, msg.sender);
    }

    /**
     * @notice Get treasury's UC balance
     * @return uint256 Current UC balance
     */
    function getBalance() external view returns (uint256) {
        return unityCoin.balanceOf(address(this));
    }

    /**
     * @dev Override required by Solidity for AccessControlEnumerable
     */
    function supportsInterface(bytes4 interfaceId) public view override(AccessControlEnumerable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
