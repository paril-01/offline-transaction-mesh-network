'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import QRCode from 'react-qr-code';
import { Transaction } from '@/models/types';
import { createTransaction } from '@/services/transactionService';
import { getCurrentUser, getUserSecretKey } from '@/services/userService';
import { createQRData, serializeQRData } from '@/utils/crypto';
import Link from 'next/link';

export default function SendPage() {
  const router = useRouter();
  const [amount, setAmount] = useState<string>('');
  const [recipient, setRecipient] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [qrValue, setQrValue] = useState<string>('');
  const [user, setUser] = useState<any>(null);
  const [isOnline, setIsOnline] = useState<boolean>(true);

  useEffect(() => {
    // Set initial online status
    setIsOnline(navigator.onLine);

    // Add event listeners for online/offline events
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    async function loadUser() {
      try {
        const currentUser = await getCurrentUser();
        setUser(currentUser);
      } catch (err) {
        console.error('Failed to load user:', err);
        setError('Failed to load user account');
      }
    }
    
    loadUser();
    
    // Cleanup event listeners
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    
    try {
      if (!amount || !recipient) {
        throw new Error('Please enter amount and recipient address');
      }
      
      const amountValue = parseFloat(amount);
      if (isNaN(amountValue) || amountValue <= 0) {
        throw new Error('Please enter a valid amount');
      }
      
      if (!user) {
        throw new Error('User account not loaded');
      }

      // Clean up recipient address - remove 0x prefix if present
      let cleanRecipient = recipient;
      if (cleanRecipient.startsWith('0x')) {
        cleanRecipient = cleanRecipient.substring(2);
      }
      
      // Base58 only allows these characters: 123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz
      // It excludes: 0, O, I, and l
      const base58Regex = /^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+$/;
      const isValidBase58 = base58Regex.test(cleanRecipient);
      
      if (!isValidBase58) {
        // More helpful error message
        throw new Error('Invalid address format: Address contains invalid characters. Please use only Base58 characters (no 0, O, I, or l).');
      }
      
      const secretKey = await getUserSecretKey();
      if (!secretKey) {
        throw new Error('Could not retrieve your private key');
      }
      
      // Create transaction
      const newTransaction = await createTransaction(
        amountValue,
        user.address,
        cleanRecipient,
        secretKey,
        user.publicKey
      );
      
      setTransaction(newTransaction);
      
      // Generate QR code data
      const qrData = createQRData(newTransaction);
      const serializedQRData = serializeQRData(qrData);
      setQrValue(serializedQRData);
      
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setTransaction(null);
    setQrValue('');
    setAmount('');
    setRecipient('');
  };

  return (
    <div className="min-h-screen p-4 sm:p-8">
      <div className="w-full max-w-xl mx-auto">
        <header className="mb-8">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-primary">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <h1 className="text-2xl font-bold text-center text-primary">Send Money</h1>
            <div className="w-6"></div> {/* Spacer for centering */}
          </div>
        </header>

        {!isOnline && (
          <div className="bg-amber-100 border-l-4 border-amber-500 text-amber-700 p-4 mb-6">
            <p>You're currently offline. The transaction will be saved locally and synced when you're back online.</p>
          </div>
        )}

        {user && (
          <div className="bg-gray-100 p-4 rounded-md mb-6">
            <p className="text-sm text-gray-700 mb-1">Your Account</p>
            <p className="text-lg font-medium">{user.address}</p>
            <p className="text-sm text-gray-700 mt-2 mb-1">Available Balance</p>
            <p className="text-xl font-semibold">{user.balance} tokens</p>
          </div>
        )}

        {!transaction ? (
          <form onSubmit={handleSubmit} className="card p-6">
            <div className="mb-4">
              <label htmlFor="recipient" className="block text-gray-700 mb-2">Recipient Address</label>
              <input
                type="text"
                id="recipient"
                className="input-field"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="Enter valid Base58 address (or with 0x prefix)"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Valid addresses only contain Base58 characters (123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz).
                <br />Remember: characters 0, O, I, and l are not allowed in Base58.
              </p>
            </div>
            
            <div className="mb-6">
              <label htmlFor="amount" className="block text-gray-700 mb-2">Amount</label>
              <input
                type="number"
                id="amount"
                className="input-field"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount to send"
                min="0.01"
                step="0.01"
                required
              />
            </div>
            
            {error && (
              <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6">
                <p>{error}</p>
              </div>
            )}
            
            <button
              type="submit"
              className="btn-primary w-full"
              disabled={isLoading}
            >
              {isLoading ? 'Processing...' : 'Send Transaction'}
            </button>
          </form>
        ) : (
          <div className="card p-6">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center p-2 bg-green-100 rounded-full mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold">Transaction Created!</h2>
              <p className="text-gray-600 mt-1">Share this QR code with the recipient</p>
            </div>
            
            <div className="flex justify-center mb-6 p-4 bg-white rounded-lg shadow-sm">
              {qrValue && (
                <QRCode
                  value={qrValue}
                  size={200}
                  level="H"
                />
              )}
            </div>
            
            <div className="bg-gray-100 p-4 rounded-md mb-6">
              <div className="mb-2">
                <span className="text-sm text-gray-600">Transaction ID:</span>
                <p className="text-sm font-mono break-all">{transaction.id}</p>
              </div>
              <div className="mb-2">
                <span className="text-sm text-gray-600">Amount:</span>
                <p className="font-medium">{transaction.amount} tokens</p>
              </div>
              <div className="mb-2">
                <span className="text-sm text-gray-600">Recipient:</span>
                <p className="text-sm font-mono break-all">{transaction.to}</p>
              </div>
              <div>
                <span className="text-sm text-gray-600">Status:</span>
                <p className="font-medium">
                  {transaction.status === 'PENDING' ? (
                    <span className="text-amber-600">Pending Sync</span>
                  ) : (
                    <span className="text-green-600">Confirmed</span>
                  )}
                </p>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={resetForm}
                className="btn-primary"
              >
                Send Another
              </button>
              <Link href="/transactions" className="btn-secondary text-center">
                View Transactions
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 