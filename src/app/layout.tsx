'use client';

import './globals.css';
import { Inter } from 'next/font/google';
import { useEffect } from 'react';
import { initializeUser } from '@/services/userService';
import AnimatedMeshBackground from '../components/AnimatedMeshBackground';
import WalletConnectButton from '../components/WalletConnectButton';

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  
  useEffect(() => {
    // Initialize user when component mounts
    initializeUser().catch(error => {
      console.error('Failed to initialize user:', error);
    });
  }, []);

  return (
    <html lang="en">
      <head>
        <title>GlobePay Offline Transactions</title>
        <meta name="description" content="Offline transaction system with mesh networking capabilities" />
      </head>
      <body className={inter.className}>
        {/* Animated mesh background for the entire app */}
        <div className="fixed inset-0 -z-10">
          <AnimatedMeshBackground />
        </div>
        <div className="min-h-screen relative">
          {/* Topbar with wallet connect */}
          <div className="w-full flex justify-end px-8 py-4">
            <WalletConnectButton />
          </div>
          <main className="max-w-5xl mx-auto px-4">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}