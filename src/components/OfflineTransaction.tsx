'use client';

import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'react-qr-code';
import { FaWifi, FaWifiSlash, FaQrcode, FaExchangeAlt, FaHistory } from 'react-icons/fa';
import offlineTransactionService from '../services/offlineTransactionService';
import { meshService } from '../services/meshService';
import qrCodeService from '../services/qrCodeService';
import blockchainService from '../services/blockchainService';
import { OfflineTransaction, TransactionStatus } from '../types/transaction';

const OfflineTransactionComponent: React.FC = () => {
  // State for form inputs
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [userAddress, setUserAddress] = useState('');
  const [transactions, setTransactions] = useState<OfflineTransaction[]>([]);
  const [balance, setBalance] = useState('0');
  const [isLoading, setIsLoading] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [currentQR, setCurrentQR] = useState('');
  const [peerCount, setPeerCount] = useState(0);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Initialize on component mount
  useEffect(() => {
    const initializeServices = async () => {
      try {
        // Initialize user and get address
        const address = await offlineTransactionService.initializeUser();
        setUserAddress(address);
        
        // Initialize mesh network
        await meshService.initialize();
        
        // Setup callback for received transactions
        meshService.onTransaction(handleReceivedTransaction);
        
        // Load transactions
        await loadTransactions();
        
        // Update peer count periodically
        const peerInterval = setInterval(() => {
          if (meshService.isReady()) {
            setPeerCount(meshService.getConnectedPeersCount());
          }
        }, 5000);
        
        // Initialize blockchain service (if online)
        if (navigator.onLine) {
          await blockchainService.initialize();
          await updateBalance();
        }
        
        return () => {
          clearInterval(peerInterval);
          if (showScanner) {
            qrCodeService.stopScanning();
          }
        };
      } catch (err) {
        console.error('Error initializing services:', err);
        setError('Failed to initialize services. Please reload the app.');
      }
    };
    
    // Handle online/offline status
    const handleOnlineStatus = () => {
      setIsOnline(navigator.onLine);
      if (navigator.onLine) {
        updateBalance();
      }
    };
    
    window.addEventListener('online', handleOnlineStatus);
    window.addEventListener('offline', handleOnlineStatus);
    
    initializeServices();
    
    return () => {
      window.removeEventListener('online', handleOnlineStatus);
      window.removeEventListener('offline', handleOnlineStatus);
    };
  }, []);
  
  // Update UI when scanner is shown/hidden
  useEffect(() => {
    if (showScanner && videoRef.current) {
      startQRScanner();
    } else if (!showScanner) {
      qrCodeService.stopScanning();
    }
  }, [showScanner]);
  
  // Handle transaction received via mesh network
  const handleReceivedTransaction = async (transaction: OfflineTransaction) => {
    setSuccessMessage('New transaction received via mesh network!');
    await loadTransactions();
  };
  
  // Load transactions from storage
  const loadTransactions = async () => {
    try {
      const txList = await offlineTransactionService.getTransactions();
      setTransactions(txList);
    } catch (err) {
      console.error('Error loading transactions:', err);
      setError('Failed to load transactions');
    }
  };
  
  // Update user balance
  const updateBalance = async () => {
    if (!userAddress || !blockchainService.isReady()) return;
    
    try {
      const bal = await blockchainService.getBalance(userAddress);
      setBalance(bal);
    } catch (err) {
      console.error('Error updating balance:', err);
    }
  };
  
  // Start QR code scanner
  const startQRScanner = async () => {
    if (!videoRef.current) return;
    
    try {
      await qrCodeService.startScanning('qr-video', handleScannedTransaction);
    } catch (err) {
      console.error('Failed to start QR scanner:', err);
      setError('Failed to start camera. Please check permissions and try again.');
      setShowScanner(false);
    }
  };
  
  // Handle scanned transaction
  const handleScannedTransaction = async (transaction: OfflineTransaction) => {
    // Stop scanning after successful scan
    qrCodeService.stopScanning();
    setShowScanner(false);
    
    setSuccessMessage('Transaction received via QR code!');
    await loadTransactions();
  };
  
  // Create new transaction
  const createTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!recipient.trim() || !amount.trim() || parseFloat(amount) <= 0) {
      setError('Please enter a valid recipient address and amount');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      // Create the transaction
      const transaction = await offlineTransactionService.createTransaction(
        recipient.trim(),
        amount.trim()
      );
      
      // Clear form
      setRecipient('');
      setAmount('');
      
      // Refresh transactions list
      await loadTransactions();
      
      // Generate QR code for sharing
      const qrData = qrCodeService.generateQRPayload(transaction);
      setCurrentQR(qrData);
      setShowQR(true);
      
      setSuccessMessage('Transaction created successfully!');
    } catch (err) {
      console.error('Error creating transaction:', err);
      setError('Failed to create transaction. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Connect wallet
  const connectWallet = async () => {
    try {
      setIsLoading(true);
      const success = await blockchainService.connectWallet();
      
      if (success) {
        setSuccessMessage('Wallet connected successfully!');
        await updateBalance();
      } else {
        setError('Failed to connect wallet. Please ensure MetaMask is installed and unlocked.');
      }
    } catch (err) {
      console.error('Error connecting wallet:', err);
      setError('Failed to connect wallet');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Format transaction status for display
  const formatStatus = (status: TransactionStatus, syncedOnChain: boolean): string => {
    if (syncedOnChain) return 'Synced to Blockchain';
    
    switch (status) {
      case TransactionStatus.PENDING:
        return 'Pending';
      case TransactionStatus.PROCESSING:
        return 'Processing';
      case TransactionStatus.COMPLETED:
        return 'Completed';
      case TransactionStatus.FAILED:
        return 'Failed';
      case TransactionStatus.REJECTED:
        return 'Rejected';
      default:
        return 'Unknown';
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <header className="bg-white rounded-lg shadow-md p-4 mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">GlobePay Offline Transactions</h1>
          <p className="text-sm text-gray-600">
            Address: {userAddress ? `${userAddress.substring(0, 8)}...${userAddress.substring(userAddress.length - 6)}` : 'Loading...'}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center">
            <span className="mr-2">{isOnline ? <FaWifi className="text-green-500" /> : <FaWifiSlash className="text-red-500" />}</span>
            <span className="text-sm">{isOnline ? 'Online' : 'Offline'}</span>
          </div>
          <div className="text-sm">
            <span className="font-semibold">Balance:</span> {balance} GLOBE
          </div>
          {isOnline && !blockchainService.isWalletConnected() && (
            <button
              onClick={connectWallet}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              Connect Wallet
            </button>
          )}
        </div>
      </header>
      
      {/* Mesh network status */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Mesh Network</h2>
          <div className="text-sm">
            <span className="font-semibold">Connected Peers:</span> {peerCount}
          </div>
        </div>
        <p className="text-sm text-gray-600 mt-2">
          {meshService.isReady() 
            ? 'Mesh network is active. Your transactions can propagate through nearby devices.' 
            : 'Mesh network initializing...'}
        </p>
      </div>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6">
          <span className="block sm:inline">{error}</span>
          <button
            className="absolute top-0 bottom-0 right-0 px-4 py-3"
            onClick={() => setError('')}
          >
            <span className="text-xl">&times;</span>
          </button>
        </div>
      )}
      
      {successMessage && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-6">
          <span className="block sm:inline">{successMessage}</span>
          <button
            className="absolute top-0 bottom-0 right-0 px-4 py-3"
            onClick={() => setSuccessMessage('')}
          >
            <span className="text-xl">&times;</span>
          </button>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Transaction form */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <FaExchangeAlt className="mr-2" /> Create Transaction
          </h2>
          <form onSubmit={createTransaction}>
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="recipient">
                Recipient Address
              </label>
              <input
                id="recipient"
                type="text"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                placeholder="Recipient address"
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="amount">
                Amount (GLOBE)
              </label>
              <input
                id="amount"
                type="number"
                step="0.000001"
                min="0.000001"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                placeholder="Amount"
                required
              />
            </div>
            <div className="flex justify-between">
              <button
                type="submit"
                disabled={isLoading}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:opacity-50"
              >
                {isLoading ? 'Processing...' : 'Send'}
              </button>
              <button
                type="button"
                onClick={() => setShowScanner(true)}
                className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
              >
                <FaQrcode className="inline mr-2" /> Scan QR
              </button>
            </div>
          </form>
        </div>
        
        {/* QR code scanner or generated QR */}
        <div className="bg-white rounded-lg shadow-md p-6">
          {showScanner ? (
            <div>
              <h2 className="text-xl font-semibold mb-4">Scan Transaction QR Code</h2>
              <div className="relative aspect-square w-full max-w-sm mx-auto border-2 border-gray-300 rounded-lg overflow-hidden mb-4">
                <video
                  id="qr-video"
                  ref={videoRef}
                  className="w-full h-full object-cover"
                ></video>
              </div>
              <button
                onClick={() => setShowScanner(false)}
                className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
              >
                Cancel Scanning
              </button>
            </div>
          ) : showQR ? (
            <div>
              <h2 className="text-xl font-semibold mb-4">Share Transaction QR Code</h2>
              <div className="border-2 border-gray-300 rounded-lg p-4 bg-white flex items-center justify-center mb-4">
                <QRCode value={currentQR} size={256} />
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Let the recipient scan this QR code to receive the payment, even without internet connection.
              </p>
              <button
                onClick={() => setShowQR(false)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
              >
                Close
              </button>
            </div>
          ) : (
            <div>
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <FaHistory className="mr-2" /> Recent Transactions
              </h2>
              <div className="max-h-80 overflow-y-auto">
                {transactions.length > 0 ? (
                  <ul className="divide-y divide-gray-200">
                    {transactions.slice(0, 5).map((tx) => (
                      <li key={tx.id} className="py-3">
                        <div className="flex justify-between">
                          <div>
                            <p className="text-sm font-medium">
                              {tx.from === userAddress ? 'Sent to:' : 'Received from:'}
                              <span className="font-normal ml-1">
                                {tx.from === userAddress 
                                  ? `${tx.to.substring(0, 8)}...` 
                                  : `${tx.from.substring(0, 8)}...`}
                              </span>
                            </p>
                            <p className="text-xs text-gray-500">
                              {new Date(tx.timestamp).toLocaleString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className={`text-sm font-medium ${tx.from === userAddress ? 'text-red-600' : 'text-green-600'}`}>
                              {tx.from === userAddress ? '-' : '+'}{tx.amount} GLOBE
                            </p>
                            <p className="text-xs text-gray-500">
                              {formatStatus(tx.status, tx.syncedOnChain)}
                            </p>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-center text-gray-500 py-4">No transactions yet</p>
                )}
              </div>
              <button
                onClick={() => loadTransactions()}
                className="mt-4 w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
              >
                Refresh
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* Transactions list */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <FaHistory className="mr-2" /> Transaction History
        </h2>
        {transactions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    From/To
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {transactions.map((tx) => (
                  <tr key={tx.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        tx.from === userAddress ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {tx.from === userAddress ? 'Sent' : 'Received'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {tx.from === userAddress 
                        ? `To: ${tx.to.substring(0, 8)}...${tx.to.substring(tx.to.length - 6)}`
                        : `From: ${tx.from.substring(0, 8)}...${tx.from.substring(tx.from.length - 6)}`}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {tx.amount} GLOBE
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatStatus(tx.status, tx.syncedOnChain)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(tx.timestamp).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-center text-gray-500 py-4">No transactions yet</p>
        )}
      </div>
    </div>
  );
};

export default OfflineTransactionComponent;
