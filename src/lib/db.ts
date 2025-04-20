'use client';

import Dexie from 'dexie';
import { User, Transaction } from '@/models/types';

// Define the database schema
export class AppDatabase extends Dexie {
  users!: Dexie.Table<User, number>;
  transactions!: Dexie.Table<Transaction, string>;

  constructor() {
    super('offline-transaction-db');
    
    // Define tables and indexes
    this.version(1).stores({
      users: '++id, address, publicKey, balance',
      transactions: 'id, from, to, amount, timestamp, status'
    });
  }
}

// Create and export database instance
export const db = new AppDatabase();

// Initialize database - no longer does heavy work, just ensures the DB exists
export async function initializeDatabase(): Promise<void> {
  try {
    // Just open the database to ensure it exists
    await db.open();
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
}

// Get current user
export async function getCurrentUser(): Promise<User | null> {
  try {
    const users = await db.users.toArray();
    return users.length > 0 ? users[0] : null;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

export async function createUser(user: Omit<User, 'id'>): Promise<User> {
  try {
    const id = await db.users.add(user as User);
    return { ...user, id } as User;
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
}

export async function updateUser(id: number, updates: Partial<User>): Promise<number> {
  try {
    return await db.users.update(id, updates);
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
} 