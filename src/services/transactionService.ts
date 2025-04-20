'use client';

import { db } from '@/lib/db';
import { Transaction, TransactionStatus, TransactionType, QRData, User } from '@/models/types';
import {
  createTransactionMessage,
  signMessage,
  generateTransactionId,
  verifySignature,
  serializeQRData,
  deserializeQRData,
} from '@/utils/crypto';
import { syncTransactionsWithBlockchain } from './syncService';
import { broadcastTransactionToMesh } from './meshService';
import { meshNetwork } from '@/services/meshService';
import { getUserSecretKey } from './userService';

// Generate a new nonce for transactions
async function generateNonce(fromAddress: string): Promise<number> {
  // Get the highest nonce used by this address
  const latestTx = await db.transactions
    .where('from')
    .equals(fromAddress)
    .reverse()
    .first();
  
  return latestTx ? latestTx.nonce + 1 : 1;
}

// Create a new transaction
export async function createTransaction(
  amount: number,
  from: string,
  to: string,
  privateKey: string,
  publicKey: string
): Promise<Transaction> {
  try {
    // Generate transaction ID and nonce
    const id = generateTransactionId();
    const nonce = await generateNonce(from);
    const timestamp = Date.now();

    // Create transaction message
    const message = createTransactionMessage(amount, from, to, nonce, timestamp);

    // Sign the transaction
    const signature = signMessage(message, privateKey);

    // Create transaction object
    const transaction: Transaction = {
      id,
      from,
      to,
      amount,
      timestamp,
      signature,
      nonce,
      status: TransactionStatus.PENDING,
      type: TransactionType.SEND
    };

    // Save to database
    await db.transactions.add(transaction);

    // Update sender's balance
    const sender = await db.users.where('address').equals(from).first();
    if (sender) {
      await db.users.update(sender.id, {
        balance: sender.balance - amount
      });
    }

    return transaction;
  } catch (error) {
    console.error('Error creating transaction:', error);
    throw error;
  }
}

// Process a transaction received via QR code
export async function processReceivedTransaction(qrData: any): Promise<Transaction | null> {
  try {
    // Check if this transaction has already been processed
    const existingTx = await db.transactions.get(qrData.transactionId);
    if (existingTx) {
      console.log('Transaction already processed:', existingTx);
      return existingTx;
    }

    // Verify the transaction signature
    const message = createTransactionMessage(
      qrData.amount,
      qrData.senderAddress,
      qrData.recipientAddress,
      qrData.nonce,
      qrData.timestamp
    );

    // Get user (needed for public key in a real app)
    const recipient = await db.users.where('address').equals(qrData.recipientAddress).first();
    if (!recipient) {
      throw new Error('Recipient not found');
    }

    // Create the transaction
    const transaction: Transaction = {
      id: qrData.transactionId,
      from: qrData.senderAddress,
      to: qrData.recipientAddress,
      amount: qrData.amount,
      timestamp: qrData.timestamp,
      signature: qrData.signature,
      nonce: qrData.nonce,
      status: TransactionStatus.CONFIRMED,
      type: TransactionType.RECEIVE
    };

    // Save transaction to local DB
    await db.transactions.add(transaction);

    // Update the recipient's balance
    await db.users.update(recipient.id, {
      balance: recipient.balance + qrData.amount
    });

    console.log('Received transaction processed:', transaction);

    return transaction;
  } catch (error) {
    console.error('Failed to process received transaction:', error);
    throw error;
  }
}

// Get user transactions
export async function getUserTransactions(address: string): Promise<Transaction[]> {
  // Get transactions where the user is either sender or receiver
  const transactions = await db.transactions
    .where('from')
    .equals(address)
    .or('to')
    .equals(address)
    .reverse()
    .toArray();
  
  // Set the transaction type based on address
  return transactions.map(tx => ({
    ...tx,
    type: tx.from === address ? TransactionType.SEND : TransactionType.RECEIVE
  }));
}

// Get user by address
async function getUserByAddress(address: string): Promise<User | undefined> {
  return db.users.where('address').equals(address).first();
}

// Update user balance
async function updateUserBalance(address: string, newBalance: number): Promise<void> {
  const user = await getUserByAddress(address);
  if (user) {
    user.balance = newBalance;
    await db.users.update(user.id, { balance: newBalance });
  }
}

// Get the latest transaction for a user (for nonce calculation)
async function getLatestTransaction(address: string): Promise<Transaction | undefined> {
  return db.transactions
    .where('from')
    .equals(address)
    .reverse()
    .sortBy('timestamp')
    .then(transactions => transactions[0]);
}

// Get pending transactions that need to be synced
export async function getPendingTransactions(): Promise<Transaction[]> {
  return db.transactions
    .where('status')
    .equals(TransactionStatus.PENDING)
    .toArray();
}

// Update transaction status
export async function updateTransactionStatus(
  transactionId: string,
  status: TransactionStatus
): Promise<void> {
  await db.transactions.update(transactionId, { status });
} 