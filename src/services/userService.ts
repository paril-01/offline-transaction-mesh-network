'use client';

import { db } from '@/lib/db';
import { User } from '@/models/types';
import { generateKeyPair } from '@/utils/crypto';
import { v4 as uuidv4 } from 'uuid';

// Get current user (for demonstration, we'll always return the first user or create one)
export async function getCurrentUser(): Promise<User> {
  const users = await db.users.toArray();
  
  if (users.length > 0) {
    return users[0];
  }
  
  // If no user exists, create a new one
  return createNewUser();
}

// Create a new user
export async function createNewUser(initialBalance: number = 1000): Promise<User> {
  const { publicKey, privateKey } = generateKeyPair();
  const id = uuidv4();
  const address = 'addr_' + id.substring(0, 8);
  
  const user: User = {
    id: 1, // This will be auto-incremented by Dexie
    name: 'New User',
    address,
    publicKey,
    privateKey,
    balance: initialBalance,
  };
  
  // Save to database
  await db.users.add(user);
  
  return user;
}

// Get user by ID
export async function getUserById(id: number): Promise<User | undefined> {
  return db.users.get(id);
}

// Update user
export async function updateUser(user: User): Promise<void> {
  await db.users.update(user.id, user);
}

// Get user secret key from local storage (in a real app, we would use a more secure storage method)
export async function getUserSecretKey(): Promise<string | null> {
  // In a real app, this would be stored securely
  // For demo purposes, we'll get it from the database
  const users = await db.users.toArray();
  return users[0]?.privateKey || null;
}

// Check if user has sufficient balance
export async function hasSufficientBalance(userId: number, amount: number): Promise<boolean> {
  const user = await getUserById(userId);
  return user ? user.balance >= amount : false;
}

export async function initializeUser(): Promise<User> {
  try {
    // Check if user already exists
    const existingUser = await db.users.toArray();
    if (existingUser.length > 0) {
      return existingUser[0];
    }

    // Generate new key pair
    const { publicKey, privateKey } = generateKeyPair();
    
    // Create new user
    const user = {
      name: 'Demo User',
      address: publicKey.slice(0, 8), // Use first 8 chars of public key as address
      publicKey,
      privateKey,
      balance: 1000, // Starting balance for demo
    };

    const id = await db.users.add(user as User);
    return { ...user, id: id as number };
  } catch (error) {
    console.error('Error initializing user:', error);
    throw error;
  }
}

export async function updateUserBalance(userId: number, newBalance: number): Promise<void> {
  await db.users.update(userId, { balance: newBalance });
} 