'use client';

import './globals.css';
import { Inter } from 'next/font/google';
import { useEffect } from 'react';
import { initializeUser } from '@/services/userService';

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
        <div className="min-h-screen bg-gray-50">
          {children}
        </div>
      </body>
    </html>
  );
} 