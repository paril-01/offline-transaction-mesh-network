// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./GlobePayToken.sol";

/**
 * @title OfflineTransactionProcessor
 * @dev Processes offline transactions that were executed without internet connectivity
 * Validates transaction signatures and propagates them to the blockchain
 */
contract OfflineTransactionProcessor is AccessControl, ReentrancyGuard {
    bytes32 public constant PROCESSOR_ROLE = keccak256("PROCESSOR_ROLE");
    bytes32 public constant VALIDATOR_ROLE = keccak256("VALIDATOR_ROLE");
    
    // Reference to the GlobePay token
    GlobePayToken public globeToken;
    
    // Structure for offline transaction batch
    struct TransactionBatch {
        uint256 batchId;
        uint256 timestamp;
        uint256 transactionCount;
        bool processed;
        address submitter;
    }
    
    // Mapping of batch ID to batch data
    mapping(uint256 => TransactionBatch) public batches;
    
    // Counter for batch IDs
    uint256 public nextBatchId;
    
    // Mapping to track processed transaction hashes (prevents double spending)
    mapping(bytes32 => bool) public processedTransactions;
    
    // Events
    event BatchSubmitted(uint256 indexed batchId, uint256 transactionCount, address submitter);
    event BatchProcessed(uint256 indexed batchId, uint256 transactionCount);
    event TransactionProcessed(bytes32 indexed txHash, address indexed from, address indexed to, uint256 amount);
    event TransactionRejected(bytes32 indexed txHash, string reason);

    /**
     * @dev Constructor
     * @param _globeToken Address of the GlobePay token contract
     */
    constructor(address _globeToken) {
        globeToken = GlobePayToken(_globeToken);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(PROCESSOR_ROLE, msg.sender);
        _grantRole(VALIDATOR_ROLE, msg.sender);
        nextBatchId = 1;
    }

    /**
     * @dev Submit a batch of offline transactions for processing
     * @param txs Array of OfflineTx structs
     * @return batchId Identifier for the submitted batch
     */
    function submitTransactionBatch(
        GlobePayToken.OfflineTx[] memory txs
    ) public onlyRole(PROCESSOR_ROLE) nonReentrant returns (uint256) {
        uint256 transactionCount = txs.length;
        require(transactionCount > 0, "Empty batch");
        uint256 batchId = nextBatchId++;
        batches[batchId] = TransactionBatch({
            batchId: batchId,
            timestamp: block.timestamp,
            transactionCount: transactionCount,
            processed: false,
            submitter: msg.sender
        });
        emit BatchSubmitted(batchId, transactionCount, msg.sender);
        // Process the batch immediately if possible
        if (hasRole(VALIDATOR_ROLE, msg.sender)) {
            processBatch(batchId, txs);
        }
        return batchId;
    }

    /**
     * @dev Process a previously submitted batch of transactions
     * @param batchId Batch identifier
     * @param txs Array of OfflineTx structs
     */
    function processBatch(
        uint256 batchId,
        GlobePayToken.OfflineTx[] memory txs
    ) public onlyRole(VALIDATOR_ROLE) nonReentrant {
        TransactionBatch storage batch = batches[batchId];
        require(batch.batchId == batchId, "Batch does not exist");
        require(!batch.processed, "Batch already processed");
        require(batch.transactionCount == txs.length, "Transaction count mismatch");
        uint256 successCount = 0;
        for (uint256 i = 0; i < txs.length; i++) {
            if (processTransaction(txs[i])) {
                successCount++;
            }
        }
        batch.processed = true;
        emit BatchProcessed(batchId, successCount);
    }

    /**
     * @dev Process a single offline transaction
     * @param txData Struct containing all transaction data
     * @return success Whether the transaction was processed successfully
     */
    function processTransaction(
        GlobePayToken.OfflineTx memory txData
    ) internal returns (bool) {
        // Check if transaction has already been processed
        if (processedTransactions[txData.txHash]) {
            emit TransactionRejected(txData.txHash, "Transaction already processed");
            return false;
        }
        // Verify the transaction hash
        bytes32 calculatedHash = keccak256(abi.encodePacked(
            txData.from, txData.to, txData.amount, txData.nonce, txData.timestamp
        ));
        if (calculatedHash != txData.txHash) {
            emit TransactionRejected(txData.txHash, "Invalid transaction hash");
            return false;
        }
        try globeToken.processOfflineTransaction(txData) {
            // Mark transaction as processed
            processedTransactions[txData.txHash] = true;
            emit TransactionProcessed(txData.txHash, txData.from, txData.to, txData.amount);
            return true;
        } catch Error(string memory reason) {
            emit TransactionRejected(txData.txHash, reason);
            return false;
        } catch {
            emit TransactionRejected(txData.txHash, "Unknown error");
            return false;
        }
    }

    /**
     * @dev Check if a transaction has been processed
     * @param txHash Transaction hash to check
     * @return True if the transaction has been processed
     */
    function isTransactionProcessed(bytes32 txHash) public view returns (bool) {
        return processedTransactions[txHash];
    }

    /**
     * @dev Get details of a batch
     * @param batchId Batch identifier
     * @return Batch details (batchId, timestamp, transactionCount, processed, submitter)
     */
    function getBatchDetails(uint256 batchId) public view returns (
        uint256, uint256, uint256, bool, address
    ) {
        TransactionBatch storage batch = batches[batchId];
        return (
            batch.batchId,
            batch.timestamp,
            batch.transactionCount,
            batch.processed,
            batch.submitter
        );
    }
}
