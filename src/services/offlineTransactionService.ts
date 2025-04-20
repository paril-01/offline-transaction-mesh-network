import Dexie from 'dexie';
import { v4 as uuidv4 } from 'uuid';
import * as nacl from 'tweetnacl';
import bs58 from 'bs58';
import { meshService } from './meshService';
import { Keypair, OfflineTransaction, TransactionStatus } from '../types/transaction';

// IndexedDB database for storing offline transactions
class TransactionDatabase extends Dexie {
  offlineTransactions: Dexie.Table<OfflineTransaction, string>;
  keypairs: Dexie.Table<Keypair, string>;

  constructor() {
    super('GlobePayOfflineDB');
    
    this.version(1).stores({
      offlineTransactions: 'id, from, to, amount, status, timestamp, nonce, hash',
      keypairs: 'address, publicKey, privateKey'
    });
    
    this.offlineTransactions = this.table('offlineTransactions');
    this.keypairs = this.table('keypairs');
  }
}

const db = new TransactionDatabase();

// Helper functions for cryptography
const generateKeypair = (): Keypair => {
  const keypair = nacl.sign.keyPair();
  const publicKey = bs58.encode(Buffer.from(keypair.publicKey));
  const privateKey = bs58.encode(Buffer.from(keypair.secretKey));
  const address = publicKey.substring(0, 42); // Create an "address" from the public key
  
  return { address, publicKey, privateKey };
};

const signTransaction = (
  tx: { from: string; to: string; amount: string; nonce: number; timestamp: number },
  privateKey: string
): string => {
  const message = JSON.stringify(tx);
  const messageUint8 = new TextEncoder().encode(message);
  const privateKeyUint8 = bs58.decode(privateKey);
  
  const signature = nacl.sign.detached(messageUint8, privateKeyUint8);
  return bs58.encode(Buffer.from(signature));
};

const verifySignature = (
  tx: { from: string; to: string; amount: string; nonce: number; timestamp: number },
  signature: string,
  publicKey: string
): boolean => {
  const message = JSON.stringify(tx);
  const messageUint8 = new TextEncoder().encode(message);
  const signatureUint8 = bs58.decode(signature);
  const publicKeyUint8 = bs58.decode(publicKey);
  
  return nacl.sign.detached.verify(messageUint8, signatureUint8, publicKeyUint8);
};

// Service functions
export const offlineTransactionService = {
  /**
   * Initialize user keypair if it doesn't exist
   */
  async initializeUser(): Promise<string> {
    const keypairs = await db.keypairs.toArray();
    
    if (keypairs.length === 0) {
      const newKeypair = generateKeypair();
      await db.keypairs.add(newKeypair);
      return newKeypair.address;
    }
    
    return keypairs[0].address;
  },
  
  /**
   * Get the user's current address
   */
  async getUserAddress(): Promise<string> {
    const keypairs = await db.keypairs.toArray();
    if (keypairs.length === 0) {
      return this.initializeUser();
    }
    return keypairs[0].address;
  },
  
  /**
   * Create and sign a new offline transaction
   */
  async createTransaction(
    to: string,
    amount: string,
    metadata: Record<string, any> = {}
  ): Promise<OfflineTransaction> {
    const keypairs = await db.keypairs.toArray();
    if (keypairs.length === 0) {
      throw new Error('No keypair found. Initialize user first.');
    }
    
    const keypair = keypairs[0];
    const { address: from, privateKey } = keypair;
    
    // Get the next nonce for the sender
    const lastTx = await db.offlineTransactions
      .where('from')
      .equals(from)
      .reverse()
      .first();
    
    const nonce = lastTx ? lastTx.nonce + 1 : 1;
    const timestamp = Date.now();
    
    // Create transaction object
    const txData = { from, to, amount, nonce, timestamp };
    
    // Sign the transaction
    const signature = signTransaction(txData, privateKey);
    
    // Create transaction hash
    const hash = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(JSON.stringify(txData))
    ).then(hashBuffer => {
      return Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    });
    
    // Create the full transaction object
    const transaction: OfflineTransaction = {
      id: uuidv4(),
      from,
      to,
      amount,
      nonce,
      timestamp,
      signature,
      hash,
      status: TransactionStatus.PENDING,
      metadata,
      syncedOnChain: false,
      meshPropagated: false
    };
    
    // Save to local database
    await db.offlineTransactions.add(transaction);
    
    // Try to propagate via mesh network
    try {
      await meshService.propagateTransaction(transaction);
      
      // Update mesh propagation status
      await db.offlineTransactions.update(transaction.id, {
        meshPropagated: true
      });
    } catch (error) {
      console.error('Failed to propagate transaction via mesh network', error);
    }
    
    return transaction;
  },
  
  /**
   * Receive a transaction from another device via mesh network
   */
  async receiveTransaction(transaction: OfflineTransaction): Promise<boolean> {
    // Check if we already have this transaction
    const existingTx = await db.offlineTransactions
      .where('hash')
      .equals(transaction.hash)
      .first();
    
    if (existingTx) {
      return false; // Already have this transaction
    }
    
    // Verify the transaction signature
    const { from, to, amount, nonce, timestamp, signature } = transaction;
    
    // We need to get the sender's public key
    // In a real implementation, this would come from a contacts list or lookup service
    // For this example, we'll assume we already have it or it's included in the transaction metadata
    const senderPublicKey = transaction.metadata?.senderPublicKey;
    
    if (!senderPublicKey) {
      throw new Error('Sender public key not provided');
    }
    
    const txData = { from, to, amount, nonce, timestamp };
    const isValid = verifySignature(txData, signature, senderPublicKey);
    
    if (!isValid) {
      throw new Error('Invalid transaction signature');
    }
    
    // Store the verified transaction
    await db.offlineTransactions.add(transaction);
    
    // Further propagate through the mesh network
    await meshService.propagateTransaction(transaction);
    
    return true;
  },
  
  /**
   * Get all transactions for the current user
   */
  async getTransactions(): Promise<OfflineTransaction[]> {
    const address = await this.getUserAddress();
    
    return db.offlineTransactions
      .where('from')
      .equals(address)
      .or('to')
      .equals(address)
      .reverse()
      .sortBy('timestamp');
  },
  
  /**
   * Get transactions that need to be synced to the blockchain
   */
  async getPendingTransactions(): Promise<OfflineTransaction[]> {
    return db.offlineTransactions
      .where('status')
      .equals(TransactionStatus.PENDING)
      .and(tx => !tx.syncedOnChain)
      .toArray();
  },
  
  /**
   * Update transaction status
   */
  async updateTransactionStatus(id: string, status: TransactionStatus): Promise<void> {
    await db.offlineTransactions.update(id, { status });
  },
  
  /**
   * Mark transaction as synced to blockchain
   */
  async markTransactionSynced(id: string): Promise<void> {
    await db.offlineTransactions.update(id, {
      syncedOnChain: true,
      status: TransactionStatus.COMPLETED
    });
  },
  
  /**
   * Generate a QR code payload for a transaction
   */
  generateQRPayload(transaction: OfflineTransaction): string {
    return JSON.stringify({
      type: 'GLOBE_PAY_TX',
      version: '1.0',
      ...transaction
    });
  },
  
  /**
   * Process a transaction from a QR code
   */
  async processQRTransaction(qrData: string): Promise<OfflineTransaction> {
    const parsedData = JSON.parse(qrData);
    
    if (parsedData.type !== 'GLOBE_PAY_TX') {
      throw new Error('Invalid QR code format');
    }
    
    const transaction: OfflineTransaction = {
      id: parsedData.id,
      from: parsedData.from,
      to: parsedData.to,
      amount: parsedData.amount,
      nonce: parsedData.nonce,
      timestamp: parsedData.timestamp,
      signature: parsedData.signature,
      hash: parsedData.hash,
      status: TransactionStatus.PENDING,
      metadata: parsedData.metadata || {},
      syncedOnChain: false,
      meshPropagated: false
    };
    
    // Receive and process the transaction
    await this.receiveTransaction(transaction);
    
    return transaction;
  },
  
  /**
   * Clear all transaction data (for testing)
   */
  async clearAllData(): Promise<void> {
    await db.offlineTransactions.clear();
  }
};

export default offlineTransactionService;
