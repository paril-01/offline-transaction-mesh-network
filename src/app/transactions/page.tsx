'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Transaction, TransactionStatus, TransactionType } from '@/models/types';
import { getCurrentUser } from '@/services/userService';
import { getUserTransactions } from '@/services/transactionService';
import { syncTransactionsWithBlockchain } from '@/services/syncService';
import useNetworkStatus from '@/hooks/useNetworkStatus';

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const isOnline = useNetworkStatus();

  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);
        
        // Load user and transactions
        const currentUser = await getCurrentUser();
        setUser(currentUser);
        
        const userTransactions = await getUserTransactions(currentUser.address);
        setTransactions(userTransactions);
      } catch (err) {
        console.error('Failed to load transactions:', err);
        setError('Failed to load transaction history');
      } finally {
        setIsLoading(false);
      }
    }
    
    loadData();
  }, []);

  const handleSyncClick = async () => {
    if (!isOnline) {
      setError('Cannot sync while offline');
      return;
    }
    
    try {
      setIsSyncing(true);
      setError(null);
      
      await syncTransactionsWithBlockchain();
      
      // Reload transactions after sync
      if (user) {
        const updatedTransactions = await getUserTransactions(user.address);
        setTransactions(updatedTransactions);
      }
    } catch (err) {
      console.error('Sync failed:', err);
      setError('Failed to sync transactions');
    } finally {
      setIsSyncing(false);
    }
  };

  // Filter transactions by status
  const pendingTransactions = transactions.filter(tx => 
    tx.status === TransactionStatus.PENDING || tx.status === TransactionStatus.SYNCING
  );

  // Format date from timestamp
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="min-h-screen p-4 sm:p-8">
      <div className="w-full max-w-4xl mx-auto">
        <header className="mb-8">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-primary">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <h1 className="text-2xl font-bold text-center text-primary">Transaction History</h1>
            <div className="w-6"></div> {/* Spacer for centering */}
          </div>
        </header>

        <div className="mb-6 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold">Your Transactions</h2>
            <p className="text-gray-600">
              {pendingTransactions.length > 0 
                ? `${pendingTransactions.length} transaction(s) pending sync`
                : 'All transactions synced'}
            </p>
          </div>
          <button
            className="btn-primary flex items-center"
            onClick={handleSyncClick}
            disabled={isSyncing || !isOnline}
          >
            {isSyncing ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Syncing...
              </>
            ) : (
              <>
                <svg className="mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Sync Now
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6">
            <p>{error}</p>
          </div>
        )}

        {!isOnline && (
          <div className="bg-amber-100 border-l-4 border-amber-500 text-amber-700 p-4 mb-6">
            <p>You're currently offline. Transactions will be synced when you're back online.</p>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <svg className="animate-spin h-8 w-8 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        ) : transactions.length === 0 ? (
          <div className="card p-12 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900">No transactions yet</h3>
            <p className="mt-2 text-gray-600">Start sending or receiving payments to see your transaction history.</p>
            <div className="mt-6 flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/send" className="btn-primary">
                Send Money
              </Link>
              <Link href="/receive" className="btn-secondary">
                Receive Money
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      From/To
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {transactions.map((transaction) => (
                    <tr key={transaction.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {transaction.type === TransactionType.SEND ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            Sent
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Received
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={transaction.type === TransactionType.SEND ? 'text-red-600' : 'text-green-600'}>
                          {transaction.type === TransactionType.SEND ? '-' : '+'}{transaction.amount}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {transaction.type === TransactionType.SEND ? 'To: ' : 'From: '}
                        </div>
                        <div className="text-sm text-gray-500 font-mono">
                          {transaction.type === TransactionType.SEND ? transaction.to : transaction.from}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(transaction.timestamp)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {transaction.status === TransactionStatus.CONFIRMED ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Confirmed
                          </span>
                        ) : transaction.status === TransactionStatus.SYNCING ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            Syncing
                          </span>
                        ) : transaction.status === TransactionStatus.FAILED ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            Failed
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                            Pending
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 