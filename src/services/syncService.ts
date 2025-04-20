'use client';

import { db } from '@/lib/db';
import { Transaction, TransactionStatus } from '@/models/types';

// Simulated blockchain sync service
export async function syncTransactionsWithBlockchain() {
  try {
    // Get all pending transactions
    const pendingTransactions = await db.transactions
      .where('status')
      .equals(TransactionStatus.PENDING)
      .toArray();

    // In a real app, we would sync with an actual blockchain
    // For this demo, we'll just mark them as confirmed
    for (const tx of pendingTransactions) {
      await db.transactions.update(tx.id, {
        status: TransactionStatus.CONFIRMED
      });
    }

    console.log(`Synced ${pendingTransactions.length} transactions with blockchain`);
  } catch (error) {
    console.error('Error syncing with blockchain:', error);
  }
}

// Check if we're online and sync if needed
export async function checkAndSync() {
  if (navigator.onLine) {
    await syncTransactionsWithBlockchain();
  }
}

// Initialize sync service
export function initializeSyncService() {
  // Listen for online/offline events
  window.addEventListener('online', () => {
    console.log('Back online, syncing transactions...');
    syncTransactionsWithBlockchain();
  });

  // Initial sync if online
  if (navigator.onLine) {
    syncTransactionsWithBlockchain();
  }
} 