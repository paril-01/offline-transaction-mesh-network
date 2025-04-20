/**
 * Transaction status enum
 */
export enum TransactionStatus {
  PENDING = 'PENDING',     // Transaction created but not confirmed
  PROCESSING = 'PROCESSING', // Transaction is being processed
  COMPLETED = 'COMPLETED', // Transaction completed successfully
  FAILED = 'FAILED',       // Transaction failed
  REJECTED = 'REJECTED'    // Transaction rejected
}

/**
 * Keypair interface
 */
export interface Keypair {
  address: string;    // Public address derived from public key
  publicKey: string;  // Public key in base58 format
  privateKey: string; // Private key in base58 format (sensitive!)
}

/**
 * Interface for offline transactions
 */
export interface OfflineTransaction {
  id: string;               // Unique transaction ID
  from: string;             // Sender address
  to: string;               // Recipient address
  amount: string;           // Amount (as string to preserve precision)
  nonce: number;            // Transaction nonce (to prevent replay)
  timestamp: number;        // Timestamp of transaction creation
  signature: string;        // Cryptographic signature
  hash: string;             // Transaction hash
  status: TransactionStatus; // Current status
  metadata?: Record<string, any>; // Additional transaction metadata
  syncedOnChain: boolean;   // Whether synced to blockchain
  meshPropagated: boolean;  // Whether propagated through mesh
}

/**
 * Interface for blockchain transaction
 */
export interface BlockchainTransaction {
  txHash: string;           // On-chain transaction hash
  blockNumber?: number;     // Block number (if confirmed)
  from: string;             // Sender address
  to: string;               // Recipient address
  amount: string;           // Amount
  timestamp: number;        // Timestamp
  confirmations: number;    // Number of confirmations
  status: 'pending' | 'confirmed' | 'failed'; // Status on chain
}

/**
 * Interface for offline transaction batch
 */
export interface TransactionBatch {
  batchId: string;           // Unique batch ID
  transactions: OfflineTransaction[]; // Transactions in batch
  timestamp: number;         // Batch creation timestamp
  processed: boolean;        // Whether processed on-chain
  submitter: string;         // Address of submitter
}
