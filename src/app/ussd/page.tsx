'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from '@/lib/db';
import { createTransaction } from '@/services/transactionService';
import { User, USSDCommand } from '@/models/types';

export default function USSDPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [commandInput, setCommandInput] = useState<string>('');
  const [response, setResponse] = useState<string>('Welcome to USSD Banking.\nEnter *123# to check balance or *123*AMOUNT*RECIPIENT# to send money.');
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<Array<{command: string, response: string}>>([]);
  const [pendingCommand, setPendingCommand] = useState<USSDCommand | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [isOnline, setIsOnline] = useState<boolean>(true);
  
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
        const user = await getCurrentUser();
        if (user) {
          setCurrentUser(user);
        } else {
          setError('No user account found. Please create an account first.');
        }
      } catch (error) {
        console.error('Error loading user:', error);
        setError('Failed to load user account.');
      } finally {
        setLoading(false);
      }
    }
    
    loadUser();
    
    // Cleanup event listeners
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    // Focus the input field when component mounts or when response changes
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [response]);

  const executeCommand = async (command: USSDCommand) => {
    if (!currentUser) return;
    
    switch (command.action) {
      case 'CHECK_BALANCE':
        setResponse(`Your balance is ${currentUser.balance.toFixed(2)} GLOB`);
        break;
        
      case 'SEND':
        if (!command.amount || !command.recipient) {
          setResponse('Invalid command format. Try *123*AMOUNT*RECIPIENT#\nNote: Recipient must use Base58 characters only (no 0, O, I, or l)');
          return;
        }
        
        // Check if amount is valid
        if (command.amount <= 0) {
          setResponse('Amount must be greater than 0');
          return;
        }
        
        // Check if user has enough balance
        if (command.amount > currentUser.balance) {
          setResponse('Insufficient balance');
          return;
        }
        
        // Save pending command for confirmation
        setPendingCommand(command);
        setResponse(`Send ${command.amount} GLOB to ${command.recipient}?\nConfirm with *123*CONFIRM#\nCancel with *123*CANCEL#`);
        break;
        
      case 'CONFIRM':
        if (!pendingCommand || pendingCommand.action !== 'SEND') {
          setResponse('No pending transaction to confirm');
          return;
        }
        
        try {
          setResponse('Processing transaction...');
          
          // Execute the transaction
          await createTransaction(
            pendingCommand.amount!,
            currentUser.address,
            pendingCommand.recipient!,
            currentUser.privateKey,
            currentUser.publicKey
          );
          
          // Update local user balance
          setCurrentUser({
            ...currentUser,
            balance: currentUser.balance - pendingCommand.amount!
          });
          
          setResponse(`Transaction completed!\nSent ${pendingCommand.amount} GLOB to ${pendingCommand.recipient}`);
          setPendingCommand(null);
        } catch (error) {
          console.error('Transaction error:', error);
          setResponse('Transaction failed. Please try again.');
        }
        break;
        
      case 'CANCEL':
        if (!pendingCommand) {
          setResponse('No pending operation to cancel');
          return;
        }
        
        setPendingCommand(null);
        setResponse('Operation cancelled');
        break;
        
      default:
        setResponse('Unknown command. Available commands:\n*123# - Check balance\n*123*AMOUNT*RECIPIENT# - Send money');
    }
  };

  const parseCommand = (input: string): USSDCommand | null => {
    // Basic USSD command format: *123*param1*param2*...#
    if (!input.startsWith('*') || !input.endsWith('#')) {
      return null;
    }
    
    // Strip the * and # characters
    const content = input.slice(1, -1);
    const parts = content.split('*');
    
    // Check if the command starts with the service code
    if (parts[0] !== '123') {
      return null;
    }
    
    // Handle different command formats
    if (parts.length === 1) {
      // *123# - Check balance
      return { code: input, action: 'CHECK_BALANCE' };
    } else if (parts.length === 2) {
      // *123*CONFIRM# or *123*CANCEL#
      const action = parts[1].toUpperCase();
      if (action === 'CONFIRM') {
        return { code: input, action: 'CONFIRM' };
      } else if (action === 'CANCEL') {
        return { code: input, action: 'CANCEL' };
      }
    } else if (parts.length === 3) {
      // *123*AMOUNT*RECIPIENT# - Send money
      const amount = parseFloat(parts[1]);
      let recipient = parts[2];
      
      // Remove 0x prefix if present
      if (recipient.startsWith('0x')) {
        recipient = recipient.substring(2);
      }
      
      // Validate Base58 format
      const base58Regex = /^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+$/;
      const isValidBase58 = base58Regex.test(recipient);
      
      if (!isNaN(amount) && amount > 0 && isValidBase58) {
        return { 
          code: input, 
          action: 'SEND', 
          amount, 
          recipient 
        };
      }
    }
    
    return null;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!commandInput.trim()) {
      return;
    }
    
    const command = parseCommand(commandInput);
    
    if (!command) {
      setResponse('Invalid command format. Try *123# for balance or *123*AMOUNT*RECIPIENT# to send money.');
    } else {
      // Add to history
      setHistory([...history, { command: commandInput, response }]);
      
      // Execute the command
      executeCommand(command);
    }
    
    // Clear input
    setCommandInput('');
  };

  return (
    <div className="min-h-screen p-4 sm:p-8">
      <div className="w-full max-w-xl mx-auto">
        <header className="mb-8">
          <div className="flex items-center justify-between">
            <button 
              onClick={() => router.push('/')}
              className="text-primary"
              title="Back to Home"
              aria-label="Go back to home page"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <h1 className="text-2xl font-bold text-center text-primary">USSD Interface</h1>
            <div className="w-6"></div>
          </div>
        </header>

        {!isOnline && (
          <div className="bg-amber-100 border-l-4 border-amber-500 text-amber-700 p-4 mb-6">
            <p>You're currently offline. Commands will be processed locally and synced when you're back online.</p>
          </div>
        )}

        <div className="card mb-6 p-4 bg-gray-100 border border-gray-200 rounded-md h-60 overflow-y-auto flex flex-col">
          <div className="flex-grow mb-4">
            <p className="whitespace-pre-line">{response}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="card p-6">
          <div className="mb-4">
            <label htmlFor="commandInput" className="block text-gray-700 mb-2">Enter USSD Command</label>
            <input
              ref={inputRef}
              type="text"
              id="commandInput"
              className="input-field"
              value={commandInput}
              onChange={(e) => setCommandInput(e.target.value)}
              placeholder="e.g. *123#"
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
          >
            Send
          </button>
        </form>

        {history.length > 0 && (
          <div className="mt-8">
            <h2 className="text-lg font-semibold mb-4">Command History</h2>
            <div className="card p-4">
              {history.map((item, index) => (
                <div key={index} className="border-b border-gray-200 py-2 last:border-0">
                  <p className="text-sm text-gray-600">{item.command}</p>
                  <p className="text-sm">{item.response}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 