'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getCurrentUser } from '@/services/userService';
import { initializeSyncService } from '@/services/syncService';

export default function HomePage() {
  const [user, setUser] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);

  useEffect(() => {
    // Set initial online status
    setIsOnline(navigator.onLine);

    // Add event listeners for online/offline events
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Initialize app services
    async function initializeApp() {
      try {
        setIsInitializing(true);
        
        // Initialize sync service
        initializeSyncService();
        
        // Load current user
        const currentUser = await getCurrentUser();
        setUser(currentUser);
        
        setIsInitializing(false);
      } catch (err) {
        console.error('Failed to initialize:', err);
        setError('Failed to initialize application');
        setIsInitializing(false);
      }
    }
    
    initializeApp();
    
    // Cleanup event listeners
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-600">Initializing application...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-red-50 p-6 rounded-lg max-w-md w-full text-center">
          <div className="text-red-500 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold mb-2">Initialization Error</h2>
          <p className="text-gray-700 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 sm:p-8">
      <div className="w-full max-w-3xl mx-auto">
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-primary">GlobePay</h1>
          <p className="text-gray-600 mt-2">Offline-first transactions with mesh network capabilities</p>
        </header>

        {user && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Your Account</p>
                <p className="text-lg font-medium">{user.address}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Balance</p>
                <p className="text-xl font-bold">{user.balance} tokens</p>
              </div>
            </div>
            <div className="mt-4 flex items-center">
              <div className={`w-3 h-3 rounded-full mr-2 ${isOnline ? 'bg-green-500' : 'bg-amber-500'}`}></div>
              <p className="text-sm text-gray-600">{isOnline ? 'Online' : 'Offline'}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link href="/send" className="card hover:shadow-lg transition-shadow p-6 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold mb-2">Send Money</h2>
            <p className="text-gray-600">Create a transaction and share the QR code with the recipient</p>
          </Link>

          <Link href="/receive" className="card hover:shadow-lg transition-shadow p-6 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold mb-2">Receive Money</h2>
            <p className="text-gray-600">Scan QR codes to receive payments offline</p>
          </Link>

          <Link href="/ussd" className="card hover:shadow-lg transition-shadow p-6 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold mb-2">USSD Interface</h2>
            <p className="text-gray-600">Use feature-phone style commands for transactions</p>
          </Link>

          <Link href="/transactions" className="card hover:shadow-lg transition-shadow p-6 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold mb-2">Transaction History</h2>
            <p className="text-gray-600">View all your transactions and their status</p>
          </Link>
        </div>
      </div>
    </div>
  );
} 