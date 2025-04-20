'use client';

import { Transaction } from '@/models/types';

class MeshNetwork {
  private isInitialized = false;

  constructor() {
    console.log('Mesh network service created');
  }

  public async initialize(): Promise<void> {
    try {
      // Simplified initialization - no actual networking yet
      console.log('Mesh network initialized');
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize mesh network:', error);
      throw error;
    }
  }

  public isReady(): boolean {
    return this.isInitialized;
  }

  public getPeerId(): string {
    return 'local-peer-id';
  }

  public broadcastTransaction(transaction: Transaction): void {
    console.log('Broadcasting transaction (simulated):', transaction.id);
  }
}

// Create singleton instance
export const meshNetwork = new MeshNetwork();

// Initialize function for use in app startup
export async function initializeMeshNetwork(): Promise<void> {
  await meshNetwork.initialize();
} 