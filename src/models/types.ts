export interface User {
  id: number;
  name: string;
  address: string;
  publicKey: string;
  privateKey: string;
  balance: number;
}

export interface Transaction {
  id: string;
  from: string;
  to: string;
  amount: number;
  timestamp: number;
  signature: string;
  nonce: number;
  status: TransactionStatus;
  type: TransactionType;
}

export enum TransactionStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  FAILED = 'FAILED'
}

export enum TransactionType {
  SEND = 'SEND',
  RECEIVE = 'RECEIVE'
}

export interface QRData {
  transactionId: string;
  senderAddress: string;
  recipientAddress: string;
  amount: number;
  timestamp: number;
  signature: string;
  nonce: number;
}

export interface Peer {
  id: string;
  connected: boolean;
  lastSeen?: number;
}

export interface NetworkStatus {
  online: boolean;
  meshConnected: boolean;
  peersCount: number;
}

export interface USSDCommand {
  code: string;
  action: 'SEND' | 'CHECK_BALANCE' | 'CONFIRM' | 'CANCEL';
  amount?: number;
  recipient?: string;
} 