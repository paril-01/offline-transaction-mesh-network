// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title GlobePayToken
 * @dev Implementation of the GlobePay stablecoin with collateral basket and offline transaction support
 */
contract GlobePayToken is ERC20, ERC20Burnable, AccessControl, Pausable {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant COLLATERAL_MANAGER_ROLE = keccak256("COLLATERAL_MANAGER_ROLE");
    bytes32 public constant OFFLINE_VALIDATOR_ROLE = keccak256("OFFLINE_VALIDATOR_ROLE");

    struct CollateralAsset {
        address tokenAddress;  // Address of the token contract (address(0) for native assets like ETH)
        uint256 weight;        // Weight in the basket (in basis points, e.g., 2000 = 20%)
        uint256 totalAmount;   // Total amount of this asset in the collateral pool
        bool isActive;         // Whether this asset is actively used in the basket
    }

    struct OfflineTransaction {
        bytes32 transactionHash;   // Hash of the offline transaction
        address from;              // Sender address
        address to;                // Recipient address
        uint256 amount;            // Amount of tokens transferred
        uint256 nonce;             // Unique nonce to prevent replay attacks
        uint256 timestamp;         // Timestamp when the transaction was created
        bool processed;            // Whether this transaction has been processed on-chain
        bytes signature;           // EdDSA signature from the sender
    }

    // Mapping of assets in the collateral basket
    mapping(string => CollateralAsset) public collateralBasket;
    
    // Array to track all asset keys in the basket
    string[] public assetKeys;
    
    // Total weight of all assets (should sum to 10000 basis points = 100%)
    uint256 public totalWeight;
    
    // Mapping of executed offline transaction hashes
    mapping(bytes32 => bool) public executedOfflineTransactions;
    
    // Mapping of user nonces for offline transactions
    mapping(address => uint256) public userNonces;

    // Events
    event CollateralAdded(string indexed assetKey, uint256 amount);
    event CollateralRemoved(string indexed assetKey, uint256 amount);
    event CollateralWeightUpdated(string indexed assetKey, uint256 newWeight);
    event OfflineTransactionProcessed(bytes32 indexed transactionHash, address indexed from, address indexed to, uint256 amount);
    event OfflineTransactionRejected(bytes32 indexed transactionHash, string reason);

    /**
     * @dev Constructor to initialize the GlobePay token
     */
    constructor() ERC20("GlobePay Stablecoin", "GLOBE") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
        _grantRole(COLLATERAL_MANAGER_ROLE, msg.sender);
        _grantRole(OFFLINE_VALIDATOR_ROLE, msg.sender);
    }

    /**
     * @dev Pause token transfers
     * Requirements:
     * - The caller must have the PAUSER_ROLE
     */
    function pause() public onlyRole(PAUSER_ROLE) {
        _pause();
    }

    /**
     * @dev Unpause token transfers
     * Requirements:
     * - The caller must have the PAUSER_ROLE
     */
    function unpause() public onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    /**
     * @dev Mint new tokens
     * @param to The address that will receive the minted tokens
     * @param amount The amount of tokens to mint
     * Requirements:
     * - The caller must have the MINTER_ROLE
     */
    function mint(address to, uint256 amount) public onlyRole(MINTER_ROLE) {
        _mint(to, amount);
    }

    /**
     * @dev Add a new asset to the collateral basket
     * @param assetKey Unique identifier for the asset (e.g., "USD", "GOLD")
     * @param tokenAddress Address of the token contract (address(0) for native assets)
     * @param weight Weight in the basket (in basis points, e.g., 2000 = 20%)
     * Requirements:
     * - The caller must have the COLLATERAL_MANAGER_ROLE
     * - The asset must not already exist
     * - The total weight must not exceed 10000 (100%)
     */
    function addCollateralAsset(
        string memory assetKey,
        address tokenAddress,
        uint256 weight
    ) public onlyRole(COLLATERAL_MANAGER_ROLE) {
        require(!collateralBasket[assetKey].isActive, "Asset already exists");
        require(totalWeight + weight <= 10000, "Total weight exceeds 100%");
        
        collateralBasket[assetKey] = CollateralAsset({
            tokenAddress: tokenAddress,
            weight: weight,
            totalAmount: 0,
            isActive: true
        });
        
        assetKeys.push(assetKey);
        totalWeight += weight;
        
        emit CollateralWeightUpdated(assetKey, weight);
    }

    /**
     * @dev Update the weight of an asset in the collateral basket
     * @param assetKey Unique identifier for the asset
     * @param newWeight New weight in the basket (in basis points)
     * Requirements:
     * - The caller must have the COLLATERAL_MANAGER_ROLE
     * - The asset must exist
     * - The total weight must not exceed 10000 (100%)
     */
    function updateCollateralWeight(
        string memory assetKey,
        uint256 newWeight
    ) public onlyRole(COLLATERAL_MANAGER_ROLE) {
        require(collateralBasket[assetKey].isActive, "Asset does not exist");
        
        uint256 oldWeight = collateralBasket[assetKey].weight;
        uint256 newTotalWeight = totalWeight - oldWeight + newWeight;
        
        require(newTotalWeight <= 10000, "Total weight exceeds 100%");
        
        collateralBasket[assetKey].weight = newWeight;
        totalWeight = newTotalWeight;
        
        emit CollateralWeightUpdated(assetKey, newWeight);
    }

    struct OfflineTx {
        bytes32 txHash;
        address from;
        address to;
        uint256 amount;
        uint256 nonce;
        uint256 timestamp;
        bytes signature;
    }

    /**
     * @dev Process an offline transaction that was executed without internet
     * @param txData Struct containing all transaction data
     * Requirements:
     * - The caller must have the OFFLINE_VALIDATOR_ROLE
     * - The transaction must not have been processed already
     * - The signature must be valid
     * - The nonce must be correct
     */
    function processOfflineTransaction(
        OfflineTx memory txData
    ) public onlyRole(OFFLINE_VALIDATOR_ROLE) {
        // Check if transaction has already been processed
        require(!executedOfflineTransactions[txData.txHash], "Transaction already processed");
        
        // Verify the transaction hash
        bytes32 calculatedHash = keccak256(abi.encodePacked(
            txData.from, txData.to, txData.amount, txData.nonce, txData.timestamp
        ));
        require(calculatedHash == txData.txHash, "Invalid transaction hash");
        
        // Verify the nonce
        require(txData.nonce == userNonces[txData.from], "Invalid nonce");
        
        // Verify the signature (simplified for this example - would need actual EdDSA verification)
        // In a real implementation, we would verify the EdDSA signature here
        
        // Execute the transaction
        _transfer(txData.from, txData.to, txData.amount);
        
        // Mark transaction as processed and update nonce
        executedOfflineTransactions[txData.txHash] = true;
        userNonces[txData.from]++;
        
        emit OfflineTransactionProcessed(txData.txHash, txData.from, txData.to, txData.amount);
    }

    /**
     * @dev Hook that is called before any transfer of tokens
     * @param from Address sending tokens
     * @param to Address receiving tokens
     * @param value Amount of tokens being transferred
     */
    function _update(address from, address to, uint256 value) internal override {
        require(!paused(), "ERC20Pausable: token transfer while paused");
        super._update(from, to, value);
    }

    /**
     * @dev Get the count of assets in the collateral basket
     * @return Count of assets
     */
    function getCollateralAssetsCount() public view returns (uint256) {
        return assetKeys.length;
    }

    /**
     * @dev Get the next nonce for a user's offline transactions
     * @param user Address of the user
     * @return Next nonce to use
     */
    function getNextNonce(address user) public view returns (uint256) {
        return userNonces[user];
    }
}
