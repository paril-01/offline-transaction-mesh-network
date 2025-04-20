// TypeScript interfaces for smart contract data structures
// Used for type safety in contract interactions

export interface OfflineTx {
  txHash: string;
  from: string;
  to: string;
  amount: string;
  nonce: number;
  timestamp: number;
  signature: string;
}

export interface Batch {
  batchId: string;
  transactions: OfflineTx[];
  transactionCount: number;
  submitter?: string;
}

export interface CollateralAsset {
  symbol: string;
  assetClass: number;
  targetWeight: string;
}

export interface CollateralDeposit {
  symbol: string;
  amount: string;
  depositor: string;
}

export interface CollateralWithdraw {
  symbol: string;
  amount: string;
  recipient: string;
}
