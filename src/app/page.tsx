'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getCurrentUser } from '@/services/userService';
import { initializeSyncService } from '@/services/syncService';

import Dashboard from '../components/Dashboard';
import TransactionForm from '../components/TransactionForm';
import ValidatorPanel from '../components/ValidatorPanel';
import BatchPanel from '../components/BatchPanel';
import CollateralPanel from '../components/CollateralPanel';
import ActivityFeed from '../components/ActivityFeed';

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
      <h1 className="text-3xl font-bold text-primary text-center mb-4">GlobePay Mesh Dashboard</h1>
      <Dashboard />
      <TransactionForm />
      <ValidatorPanel />
      <BatchPanel />
      <CollateralPanel />
      <ActivityFeed />
      <div className="mt-12 text-center text-gray-400 text-xs">
        Powered by GlobePay Mesh Network
      </div>
    </div>
  );
} 