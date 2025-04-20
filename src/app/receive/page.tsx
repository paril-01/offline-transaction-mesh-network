'use client';

import { useState, useEffect, useRef } from 'react';
import { BrowserQRCodeReader } from '@zxing/browser';
import Link from 'next/link';
import { getCurrentUser } from '@/services/userService';
import { processReceivedTransaction } from '@/services/transactionService';
import { deserializeQRData } from '@/utils/crypto';

export default function ReceivePage() {
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [processedTransaction, setProcessedTransaction] = useState<any>(null);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // Set initial online status
    setIsOnline(navigator.onLine);

    // Add event listeners for online/offline events
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Load current user
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
      stopScanner();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const startScanner = async () => {
    setError(null);
    setIsScanning(true);
    
    try {
      const codeReader = new BrowserQRCodeReader();
      
      if (!videoRef.current) {
        throw new Error('Video element not found');
      }
      
      // Get video input devices
      const videoInputDevices = await BrowserQRCodeReader.listVideoInputDevices();
      if (videoInputDevices.length === 0) {
        throw new Error('No camera found');
      }
      
      // Use first available camera
      const firstDeviceId = videoInputDevices[0].deviceId;
      
      // Start scanning
      const controls = await codeReader.decodeFromVideoDevice(
        firstDeviceId,
        videoRef.current,
        (result, error) => {
          if (result) {
            setScanResult(result.getText());
            processQRCode(result.getText());
            controls.stop(); // Stop scanning after successful scan
            setIsScanning(false);
          }
          
          if (error && !(error instanceof TypeError)) {
            console.error('QR scan error:', error);
          }
        }
      );
    } catch (err) {
      console.error('Failed to start scanner:', err);
      setError(err instanceof Error ? err.message : 'Failed to start scanner');
      setIsScanning(false);
    }
  };

  const stopScanner = () => {
    setIsScanning(false);
  };

  const processQRCode = async (qrData: string) => {
    try {
      // Deserialize QR data
      const transactionData = deserializeQRData(qrData);
      
      // Check if the recipient is the current user
      if (transactionData.recipientAddress !== user.address) {
        setError('This transaction is not intended for your account');
        return;
      }
      
      // Process the transaction
      const transaction = await processReceivedTransaction(transactionData);
      setProcessedTransaction(transaction);
      
    } catch (err) {
      console.error('Failed to process QR code:', err);
      setError(err instanceof Error ? err.message : 'Failed to process QR code');
    }
  };

  const handleReset = () => {
    setScanResult(null);
    setProcessedTransaction(null);
    setError(null);
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
            <h1 className="text-2xl font-bold text-center text-primary">Receive Money</h1>
            <div className="w-6"></div>
          </div>
        </header>

        {!isOnline && (
          <div className="bg-amber-100 border-l-4 border-amber-500 text-amber-700 p-4 mb-6">
            <p>You're currently offline. Received transactions will be stored locally and synced when you're back online.</p>
          </div>
        )}

        {user && (
          <div className="bg-gray-100 p-4 rounded-md mb-6">
            <p className="text-sm text-gray-700 mb-1">Your Account</p>
            <p className="text-lg font-medium">{user.address}</p>
            <p className="text-sm text-gray-700 mt-2 mb-1">Current Balance</p>
            <p className="text-xl font-semibold">{user.balance} tokens</p>
          </div>
        )}

        {!processedTransaction ? (
          <div className="card p-6">
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-2">Scan QR Code</h2>
              <p className="text-gray-600">Scan a QR code from the sender to receive a payment.</p>
            </div>
            
            <div className="bg-gray-100 p-2 rounded-lg mb-6">
              {isScanning ? (
                <div className="relative">
                  <video 
                    ref={videoRef} 
                    className="w-full h-64 object-cover rounded-lg"
                  />
                  <div className="absolute inset-0 border-2 border-blue-500 rounded-lg pointer-events-none"></div>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center bg-gray-200 rounded-lg">
                  <p className="text-gray-500">Camera preview will appear here</p>
                </div>
              )}
            </div>
            
            {error && (
              <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6">
                <p>{error}</p>
              </div>
            )}
            
            <div className="flex flex-col sm:flex-row gap-4">
              {isScanning ? (
                <button 
                  onClick={stopScanner} 
                  className="btn-secondary"
                >
                  Stop Scanner
                </button>
              ) : (
                <button 
                  onClick={startScanner} 
                  className="btn-primary"
                >
                  Start Scanner
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="card p-6">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center p-2 bg-green-100 rounded-full mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold">Payment Received!</h2>
              <p className="text-gray-600 mt-1">The transaction has been processed successfully</p>
            </div>
            
            <div className="bg-gray-100 p-4 rounded-md mb-6">
              <div className="mb-2">
                <span className="text-sm text-gray-600">Transaction ID:</span>
                <p className="text-sm font-mono break-all">{processedTransaction.id}</p>
              </div>
              <div className="mb-2">
                <span className="text-sm text-gray-600">Amount:</span>
                <p className="font-medium">{processedTransaction.amount} tokens</p>
              </div>
              <div className="mb-2">
                <span className="text-sm text-gray-600">Sender:</span>
                <p className="text-sm font-mono break-all">{processedTransaction.from}</p>
              </div>
              <div>
                <span className="text-sm text-gray-600">Status:</span>
                <p className="font-medium text-green-600">Confirmed</p>
              </div>
            </div>
            
            <div className="text-center mt-2">
              <div className="font-medium">New Balance</div>
              <div className="text-2xl font-bold">{user?.balance} tokens</div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 mt-6">
              <button
                onClick={handleReset}
                className="btn-primary"
              >
                Scan Another
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