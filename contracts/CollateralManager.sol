// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./GlobePayToken.sol";

/**
 * @title CollateralManager
 * @dev Manages the collateral basket for the GlobePay stablecoin
 * Handles the multi-asset collateral system according to target weights
 */
contract CollateralManager is AccessControl, ReentrancyGuard {
    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");
    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE");
    bytes32 public constant REBALANCER_ROLE = keccak256("REBALANCER_ROLE");

    // Reference to the GlobePay token
    GlobePayToken public globeToken;
    
    // Asset types in the collateral basket
    enum AssetClass { CURRENCY, PRECIOUS_METAL, GOVT_BOND, IMF_SDR, CASH_EQUIVALENT }
    
    struct CollateralAssetInfo {
        string symbol;          // Asset symbol (e.g., "USD", "GOLD")
        AssetClass assetClass;  // Asset class category
        address tokenAddress;   // Token contract address (for ERC20 tokens)
        uint256 targetWeight;   // Target weight in basis points (e.g., 2000 = 20%)
        uint256 currentValue;   // Current USD value of holdings
        uint256 price;          // Current price in USD (with 8 decimals)
        uint256 lastUpdated;    // Timestamp of last price update
        bool isActive;          // Whether this asset is active in the basket
    }
    
    // Asset registry
    mapping(string => CollateralAssetInfo) public collateralAssets;
    string[] public assetSymbols;
    
    // Thresholds for rebalancing
    uint256 public rebalanceThreshold = 500; // 5% deviation triggers rebalance (in basis points)
    uint256 public constant WEIGHT_PRECISION = 10000; // 100% = 10000 basis points
    
    // Events
    event AssetAdded(string symbol, AssetClass assetClass, uint256 targetWeight);
    event AssetRemoved(string symbol);
    event AssetPriceUpdated(string symbol, uint256 newPrice);
    event CollateralDeposited(string symbol, uint256 amount, address depositor);
    event CollateralWithdrawn(string symbol, uint256 amount, address recipient);
    event RebalanceNeeded(string symbol, uint256 currentWeight, uint256 targetWeight);
    event RebalanceExecuted(uint256 timestamp);

    /**
     * @dev Constructor
     * @param _globeToken Address of the GlobePay token contract
     */
    constructor(address _globeToken) {
        globeToken = GlobePayToken(_globeToken);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MANAGER_ROLE, msg.sender);
        _grantRole(ORACLE_ROLE, msg.sender);
        _grantRole(REBALANCER_ROLE, msg.sender);
    }

    /**
     * @dev Add a new asset to the collateral basket
     * @param symbol Asset symbol
     * @param assetClass Asset class category
     * @param tokenAddress Token contract address
     * @param targetWeight Target weight in basis points
     * @param initialPrice Initial price in USD (with 8 decimals)
     */
    function addAsset(
        string memory symbol,
        AssetClass assetClass,
        address tokenAddress,
        uint256 targetWeight,
        uint256 initialPrice
    ) external onlyRole(MANAGER_ROLE) {
        require(!collateralAssets[symbol].isActive, "Asset already exists");
        require(getTotalTargetWeight() + targetWeight <= WEIGHT_PRECISION, "Total weight exceeds 100%");
        
        collateralAssets[symbol] = CollateralAssetInfo({
            symbol: symbol,
            assetClass: assetClass,
            tokenAddress: tokenAddress,
            targetWeight: targetWeight,
            currentValue: 0,
            price: initialPrice,
            lastUpdated: block.timestamp,
            isActive: true
        });
        
        assetSymbols.push(symbol);
        
        emit AssetAdded(symbol, assetClass, targetWeight);
    }

    /**
     * @dev Update the price of an asset
     * @param symbol Asset symbol
     * @param newPrice New price in USD (with 8 decimals)
     */
    function updateAssetPrice(
        string memory symbol,
        uint256 newPrice
    ) external onlyRole(ORACLE_ROLE) {
        require(collateralAssets[symbol].isActive, "Asset not found");
        
        collateralAssets[symbol].price = newPrice;
        collateralAssets[symbol].lastUpdated = block.timestamp;
        
        emit AssetPriceUpdated(symbol, newPrice);
        
        // Check if rebalancing is needed
        if (isRebalancingNeeded()) {
            emit RebalanceNeeded(
                symbol,
                getAssetCurrentWeight(symbol),
                collateralAssets[symbol].targetWeight
            );
        }
    }

    /**
     * @dev Deposit collateral assets
     * @param symbol Asset symbol
     * @param amount Amount to deposit
     */
    function depositCollateral(
        string memory symbol,
        uint256 amount
    ) external payable nonReentrant {
        require(collateralAssets[symbol].isActive, "Asset not found");
        require(amount > 0, "Amount must be positive");
        
        address tokenAddress = collateralAssets[symbol].tokenAddress;
        
        // Handle ERC20 token deposits
        if (tokenAddress != address(0)) {
            IERC20 token = IERC20(tokenAddress);
            
            // Transfer tokens from sender to this contract
            uint256 balanceBefore = token.balanceOf(address(this));
            token.transferFrom(msg.sender, address(this), amount);
            uint256 balanceAfter = token.balanceOf(address(this));
            
            // Ensure correct amount was transferred
            uint256 actualAmount = balanceAfter - balanceBefore;
            
            // Update the asset's current value
            uint256 valueInUsd = (actualAmount * collateralAssets[symbol].price) / 10**8;
            collateralAssets[symbol].currentValue += valueInUsd;
            
            emit CollateralDeposited(symbol, actualAmount, msg.sender);
        } else {
            // Handle native currency (ETH) deposits
            require(msg.value == amount, "Incorrect ETH amount");
            
            // Update the asset's current value
            uint256 valueInUsd = (amount * collateralAssets[symbol].price) / 10**8;
            collateralAssets[symbol].currentValue += valueInUsd;
            
            emit CollateralDeposited(symbol, amount, msg.sender);
        }
    }

    /**
     * @dev Withdraw collateral assets
     * @param symbol Asset symbol
     * @param amount Amount to withdraw
     * @param recipient Recipient address
     */
    function withdrawCollateral(
        string memory symbol,
        uint256 amount,
        address recipient
    ) external onlyRole(MANAGER_ROLE) nonReentrant {
        require(collateralAssets[symbol].isActive, "Asset not found");
        require(amount > 0, "Amount must be positive");
        require(recipient != address(0), "Invalid recipient");
        
        address tokenAddress = collateralAssets[symbol].tokenAddress;
        
        // Update the asset's current value
        uint256 valueInUsd = (amount * collateralAssets[symbol].price) / 10**8;
        require(collateralAssets[symbol].currentValue >= valueInUsd, "Insufficient collateral");
        collateralAssets[symbol].currentValue -= valueInUsd;
        
        // Handle ERC20 token withdrawals
        if (tokenAddress != address(0)) {
            IERC20 token = IERC20(tokenAddress);
            token.transfer(recipient, amount);
        } else {
            // Handle native currency (ETH) withdrawals
            (bool success, ) = recipient.call{value: amount}("");
            require(success, "ETH transfer failed");
        }
        
        emit CollateralWithdrawn(symbol, amount, recipient);
    }

    /**
     * @dev Execute rebalancing of the collateral basket
     * Adjusts asset allocations to match target weights
     */
    function executeRebalance() external onlyRole(REBALANCER_ROLE) {
        require(isRebalancingNeeded(), "Rebalancing not needed");
        
        // Rebalancing logic would be implemented here
        // In practice, this would involve complex asset swaps
        // which is beyond the scope of this example
        
        emit RebalanceExecuted(block.timestamp);
    }

    /**
     * @dev Check if rebalancing is needed
     * @return True if any asset's weight deviates from target by more than threshold
     */
    function isRebalancingNeeded() public view returns (bool) {
        uint256 totalValue = getTotalCollateralValue();
        if (totalValue == 0) return false;
        
        for (uint i = 0; i < assetSymbols.length; i++) {
            string memory symbol = assetSymbols[i];
            if (!collateralAssets[symbol].isActive) continue;
            
            uint256 targetWeight = collateralAssets[symbol].targetWeight;
            uint256 currentWeight = (collateralAssets[symbol].currentValue * WEIGHT_PRECISION) / totalValue;
            
            if (currentWeight > targetWeight && currentWeight - targetWeight > rebalanceThreshold) {
                return true;
            }
            if (targetWeight > currentWeight && targetWeight - currentWeight > rebalanceThreshold) {
                return true;
            }
        }
        
        return false;
    }

    /**
     * @dev Get current weight of an asset
     * @param symbol Asset symbol
     * @return Current weight in basis points
     */
    function getAssetCurrentWeight(string memory symbol) public view returns (uint256) {
        uint256 totalValue = getTotalCollateralValue();
        if (totalValue == 0) return 0;
        
        return (collateralAssets[symbol].currentValue * WEIGHT_PRECISION) / totalValue;
    }

    /**
     * @dev Get total value of all collateral assets in USD
     * @return Total value in USD
     */
    function getTotalCollateralValue() public view returns (uint256) {
        uint256 totalValue = 0;
        
        for (uint i = 0; i < assetSymbols.length; i++) {
            string memory symbol = assetSymbols[i];
            if (collateralAssets[symbol].isActive) {
                totalValue += collateralAssets[symbol].currentValue;
            }
        }
        
        return totalValue;
    }

    /**
     * @dev Get total target weight of all active assets
     * @return Total target weight in basis points
     */
    function getTotalTargetWeight() public view returns (uint256) {
        uint256 totalWeight = 0;
        
        for (uint i = 0; i < assetSymbols.length; i++) {
            string memory symbol = assetSymbols[i];
            if (collateralAssets[symbol].isActive) {
                totalWeight += collateralAssets[symbol].targetWeight;
            }
        }
        
        return totalWeight;
    }

    /**
     * @dev Get count of assets in the collateral basket
     * @return Count of assets
     */
    function getAssetCount() public view returns (uint256) {
        return assetSymbols.length;
    }

    /**
     * @dev Receive function to accept ETH deposits
     */
    receive() external payable {
        // ETH received will be handled by depositCollateral function
    }
}
