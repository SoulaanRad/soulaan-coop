// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/extensions/AccessControlEnumerable.sol";

/**
 * @title VerifiedStoreRegistry
 * @notice On-chain registry of verified stores eligible for SC rewards
 * @dev Source of truth for store verification status and category/override keys
 *
 * Roles:
 * - REGISTRY_MANAGER: Can verify/unverify stores and update categories
 * - DEFAULT_ADMIN: Can grant/revoke roles and update registry settings
 */
contract VerifiedStoreRegistry is AccessControlEnumerable {
    // Role definitions
    bytes32 public constant REGISTRY_MANAGER = keccak256("REGISTRY_MANAGER");

    // Store verification data
    struct StoreInfo {
        bool isVerified;
        bytes32 categoryKey;      // e.g., keccak256("FOOD_BEVERAGE"), keccak256("FOUNDER_BADGES")
        bytes32 storeKey;         // Unique identifier for override rules
        uint256 verifiedAt;       // Timestamp when verified
        uint256 updatedAt;        // Last update timestamp
    }

    // Mapping: store owner wallet -> store info
    mapping(address => StoreInfo) public stores;

    // Track all verified store addresses
    address[] private verifiedStoresList;
    mapping(address => uint256) private verifiedStoresIndex; // 1-based index (0 = not in list)

    // Events
    event StoreVerified(
        address indexed storeOwner,
        bytes32 indexed categoryKey,
        bytes32 indexed storeKey,
        address verifiedBy,
        uint256 timestamp
    );

    event StoreUnverified(
        address indexed storeOwner,
        address unverifiedBy,
        uint256 timestamp
    );

    event StoreCategoryUpdated(
        address indexed storeOwner,
        bytes32 oldCategoryKey,
        bytes32 newCategoryKey,
        address updatedBy,
        uint256 timestamp
    );

    event StoreKeyUpdated(
        address indexed storeOwner,
        bytes32 oldStoreKey,
        bytes32 newStoreKey,
        address updatedBy,
        uint256 timestamp
    );

    /**
     * @notice Constructor
     * @param admin Address that will have admin role
     */
    constructor(address admin) {
        require(admin != address(0), "Admin cannot be zero address");
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(REGISTRY_MANAGER, admin);
    }

    /**
     * @notice Verify a store and add to registry
     * @param storeOwner Wallet address of the store owner
     * @param categoryKey Category identifier (e.g., keccak256("FOOD_BEVERAGE"))
     * @param storeKey Unique store identifier for override rules
     * @dev Only callable by REGISTRY_MANAGER role
     */
    function verifyStore(
        address storeOwner,
        bytes32 categoryKey,
        bytes32 storeKey
    ) external onlyRole(REGISTRY_MANAGER) {
        require(storeOwner != address(0), "Store owner cannot be zero address");
        require(categoryKey != bytes32(0), "Category key cannot be empty");
        require(storeKey != bytes32(0), "Store key cannot be empty");
        require(!stores[storeOwner].isVerified, "Store already verified");

        stores[storeOwner] = StoreInfo({
            isVerified: true,
            categoryKey: categoryKey,
            storeKey: storeKey,
            verifiedAt: block.timestamp,
            updatedAt: block.timestamp
        });

        // Add to verified stores list
        verifiedStoresList.push(storeOwner);
        verifiedStoresIndex[storeOwner] = verifiedStoresList.length; // 1-based

        emit StoreVerified(storeOwner, categoryKey, storeKey, msg.sender, block.timestamp);
    }

    /**
     * @notice Verify multiple stores in a batch
     * @param storeOwners Array of store owner addresses
     * @param categoryKeys Array of category keys (must match storeOwners length)
     * @param storeKeys Array of store keys (must match storeOwners length)
     * @dev Only callable by REGISTRY_MANAGER role
     */
    function verifyStoresBatch(
        address[] calldata storeOwners,
        bytes32[] calldata categoryKeys,
        bytes32[] calldata storeKeys
    ) external onlyRole(REGISTRY_MANAGER) {
        require(storeOwners.length == categoryKeys.length, "Array length mismatch");
        require(storeOwners.length == storeKeys.length, "Array length mismatch");
        require(storeOwners.length > 0, "Empty arrays");

        for (uint256 i = 0; i < storeOwners.length; i++) {
            address storeOwner = storeOwners[i];
            bytes32 categoryKey = categoryKeys[i];
            bytes32 storeKey = storeKeys[i];

            if (storeOwner == address(0) || categoryKey == bytes32(0) || storeKey == bytes32(0)) {
                continue; // Skip invalid entries
            }

            if (stores[storeOwner].isVerified) {
                continue; // Skip already verified
            }

            stores[storeOwner] = StoreInfo({
                isVerified: true,
                categoryKey: categoryKey,
                storeKey: storeKey,
                verifiedAt: block.timestamp,
                updatedAt: block.timestamp
            });

            // Add to verified stores list
            verifiedStoresList.push(storeOwner);
            verifiedStoresIndex[storeOwner] = verifiedStoresList.length; // 1-based

            emit StoreVerified(storeOwner, categoryKey, storeKey, msg.sender, block.timestamp);
        }
    }

    /**
     * @notice Unverify a store and remove from registry
     * @param storeOwner Wallet address of the store owner
     * @dev Only callable by REGISTRY_MANAGER role
     */
    function unverifyStore(address storeOwner) external onlyRole(REGISTRY_MANAGER) {
        require(stores[storeOwner].isVerified, "Store not verified");

        stores[storeOwner].isVerified = false;
        stores[storeOwner].updatedAt = block.timestamp;

        // Remove from verified stores list
        uint256 index = verifiedStoresIndex[storeOwner];
        if (index > 0) {
            uint256 lastIndex = verifiedStoresList.length - 1;
            address lastStore = verifiedStoresList[lastIndex];

            // Move last element to deleted spot
            verifiedStoresList[index - 1] = lastStore;
            verifiedStoresIndex[lastStore] = index;

            // Remove last element
            verifiedStoresList.pop();
            delete verifiedStoresIndex[storeOwner];
        }

        emit StoreUnverified(storeOwner, msg.sender, block.timestamp);
    }

    /**
     * @notice Update a store's category key
     * @param storeOwner Wallet address of the store owner
     * @param newCategoryKey New category identifier
     * @dev Only callable by REGISTRY_MANAGER role
     */
    function updateStoreCategory(
        address storeOwner,
        bytes32 newCategoryKey
    ) external onlyRole(REGISTRY_MANAGER) {
        require(stores[storeOwner].isVerified, "Store not verified");
        require(newCategoryKey != bytes32(0), "Category key cannot be empty");

        bytes32 oldCategoryKey = stores[storeOwner].categoryKey;
        stores[storeOwner].categoryKey = newCategoryKey;
        stores[storeOwner].updatedAt = block.timestamp;

        emit StoreCategoryUpdated(storeOwner, oldCategoryKey, newCategoryKey, msg.sender, block.timestamp);
    }

    /**
     * @notice Update a store's unique key (for override rules)
     * @param storeOwner Wallet address of the store owner
     * @param newStoreKey New store identifier
     * @dev Only callable by REGISTRY_MANAGER role
     */
    function updateStoreKey(
        address storeOwner,
        bytes32 newStoreKey
    ) external onlyRole(REGISTRY_MANAGER) {
        require(stores[storeOwner].isVerified, "Store not verified");
        require(newStoreKey != bytes32(0), "Store key cannot be empty");

        bytes32 oldStoreKey = stores[storeOwner].storeKey;
        stores[storeOwner].storeKey = newStoreKey;
        stores[storeOwner].updatedAt = block.timestamp;

        emit StoreKeyUpdated(storeOwner, oldStoreKey, newStoreKey, msg.sender, block.timestamp);
    }

    /**
     * @notice Check if a store is verified
     * @param storeOwner Wallet address of the store owner
     * @return bool True if store is verified
     */
    function isVerified(address storeOwner) external view returns (bool) {
        return stores[storeOwner].isVerified;
    }

    /**
     * @notice Get store information
     * @param storeOwner Wallet address of the store owner
     * @return info Store information struct
     */
    function getStoreInfo(address storeOwner) external view returns (StoreInfo memory) {
        return stores[storeOwner];
    }

    /**
     * @notice Get all verified store addresses
     * @return address[] Array of verified store owner addresses
     */
    function getVerifiedStores() external view returns (address[] memory) {
        return verifiedStoresList;
    }

    /**
     * @notice Get count of verified stores
     * @return uint256 Number of verified stores
     */
    function getVerifiedStoreCount() external view returns (uint256) {
        return verifiedStoresList.length;
    }

    /**
     * @dev Override required by Solidity for AccessControlEnumerable
     */
    function supportsInterface(bytes4 interfaceId) public view override(AccessControlEnumerable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
