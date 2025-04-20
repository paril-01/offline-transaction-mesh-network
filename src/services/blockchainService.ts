import { ethers } from 'ethers';
import { OfflineTransaction, TransactionStatus, BlockchainTransaction } from '../types/transaction';
import offlineTransactionService from './offlineTransactionService';

// ABI for the GlobePayToken contract
const tokenAbi = [
  // ERC20 Standard Functions
  "function balanceOf(address owner) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) returns (bool)",
  
  // GlobePayToken Specific Functions
  "function processOfflineTransaction(bytes32 txHash, address from, address to, uint256 amount, uint256 nonce, uint256 timestamp, bytes signature) returns (bool)",
  "function getNextNonce(address user) view returns (uint256)",
  
  // Events
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "event OfflineTransactionProcessed(bytes32 indexed transactionHash, address indexed from, address indexed to, uint256 amount)"
];

// ABI for the OfflineTransactionProcessor contract
const processorAbi = [
  "function submitTransactionBatch(bytes32[] txHashes, address[] senders, address[] recipients, uint256[] amounts, uint256[] nonces, uint256[] timestamps, bytes[] signatures) returns (uint256)",
  "function processBatch(uint256 batchId, bytes32[] txHashes, address[] senders, address[] recipients, uint256[] amounts, uint256[] nonces, uint256[] timestamps, bytes[] signatures)",
  "function isTransactionProcessed(bytes32 txHash) view returns (bool)",
  "function getBatchDetails(uint256 batchId) view returns (uint256, uint256, uint256, bool, address)",
  
  // Events
  "event BatchSubmitted(uint256 indexed batchId, uint256 transactionCount, address submitter)",
  "event BatchProcessed(uint256 indexed batchId, uint256 transactionCount)",
  "event TransactionProcessed(bytes32 indexed txHash, address indexed from, address indexed to, uint256 amount)",
  "event TransactionRejected(bytes32 indexed txHash, string reason)"
];

// Configuration
interface BlockchainConfig {
  chainId: number;
  rpcUrl: string;
  tokenAddress: string;
  processorAddress: string;
  explorerUrl: string;
}

// Networks configuration
const networks: Record<string, BlockchainConfig> = {
  mainnet: {
    chainId: 1,
    rpcUrl: 'https://mainnet.infura.io/v3/your-infura-key',
    tokenAddress: '0x1234567890123456789012345678901234567890', // Placeholder
    processorAddress: '0x0987654321098765432109876543210987654321', // Placeholder
    explorerUrl: 'https://etherscan.io'
  },
  goerli: {
    chainId: 5,
    rpcUrl: 'https://goerli.infura.io/v3/your-infura-key',
    tokenAddress: '0x1234567890123456789012345678901234567890', // Placeholder
    processorAddress: '0x0987654321098765432109876543210987654321', // Placeholder
    explorerUrl: 'https://goerli.etherscan.io'
  },
  localhost: {
    chainId: 1337,
    rpcUrl: 'http://localhost:8545',
    tokenAddress: '0x1234567890123456789012345678901234567890', // Placeholder
    processorAddress: '0x0987654321098765432109876543210987654321', // Placeholder
    explorerUrl: 'http://localhost:8545'
  }
};

class BlockchainService {
  private provider: ethers.JsonRpcProvider | null = null;
  private signer: ethers.Signer | null = null;
  private tokenContract: ethers.Contract | null = null;
  private processorContract: ethers.Contract | null = null;
  private currentNetwork: BlockchainConfig | null = null;
  private initialized = false;
  private syncInterval: NodeJS.Timeout | null = null;
  private isOnline = false;
  private syncInProgress = false;

  constructor() {
    // Listen for online/offline events
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline);
      window.addEventListener('offline', this.handleOffline);
      this.isOnline = navigator.onLine;
    }
  }

  /**
   * Initialize the blockchain service
   */
  public async initialize(networkName: string = 'goerli'): Promise<boolean> {
    if (this.initialized || typeof window === 'undefined') return false;

    try {
      const network = networks[networkName];
      if (!network) {
        throw new Error(`Network ${networkName} not configured`);
      }

      this.currentNetwork = network;

      // Set up provider
      const provider = new ethers.JsonRpcProvider(network.rpcUrl);
      this.provider = provider;

      // Set up contracts
      this.tokenContract = new ethers.Contract(
        network.tokenAddress,
        tokenAbi,
        provider
      );

      this.processorContract = new ethers.Contract(
        network.processorAddress,
        processorAbi,
        provider
      );

      this.initialized = true;
      console.log(`Blockchain service initialized on ${networkName}`);

      // Start sync if we're online
      if (this.isOnline) {
        this.startSyncProcess();
      }

      return true;
    } catch (error) {
      console.error('Failed to initialize blockchain service:', error);
      return false;
    }
  }

  /**
   * Connect wallet
   */
  public async connectWallet(): Promise<boolean> {
    if (!this.initialized || !this.provider) return false;

    try {
      // Check if ethereum is available (MetaMask or similar)
      if (typeof window !== 'undefined' && 'ethereum' in window) {
        const ethereum = (window as any).ethereum;
        
        // Request accounts
        await ethereum.request({ method: 'eth_requestAccounts' });
        
        // Create Web3Provider and get signer
        const web3Provider = new ethers.BrowserProvider(ethereum);
        this.signer = await web3Provider.getSigner();
        
        // Update contracts with signer
        if (this.tokenContract && this.processorContract) {
          this.tokenContract = this.tokenContract.connect(this.signer);
          this.processorContract = this.processorContract.connect(this.signer);
        }

        console.log('Wallet connected:', await this.signer.getAddress());
        return true;
      } else {
        console.error('No ethereum provider found');
        return false;
      }
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      return false;
    }
  }

  /**
   * Start the sync process that checks for pending transactions
   */
  private startSyncProcess(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    // Check for pending transactions every 30 seconds
    this.syncInterval = setInterval(() => {
      this.syncPendingTransactions();
    }, 30000);

    // Initial sync
    this.syncPendingTransactions();
  }

  /**
   * Stop the sync process
   */
  private stopSyncProcess(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /**
   * Handle online event
   */
  private handleOnline = (): void => {
    console.log('Device is online, resuming blockchain sync');
    this.isOnline = true;
    
    if (this.initialized) {
      this.startSyncProcess();
    }
  }

  /**
   * Handle offline event
   */
  private handleOffline = (): void => {
    console.log('Device is offline, pausing blockchain sync');
    this.isOnline = false;
    this.stopSyncProcess();
  }

  /**
   * Sync pending offline transactions to the blockchain
   */
  private async syncPendingTransactions(): Promise<void> {
    if (!this.initialized || !this.isOnline || !this.signer || this.syncInProgress) {
      return;
    }

    this.syncInProgress = true;

    try {
      // Get pending transactions from offline service
      const pendingTransactions = await offlineTransactionService.getPendingTransactions();
      
      if (pendingTransactions.length === 0) {
        console.log('No pending transactions to sync');
        this.syncInProgress = false;
        return;
      }

      console.log(`Syncing ${pendingTransactions.length} pending transactions to blockchain`);

      // Group transactions into a batch (max 20 per batch)
      const batchSize = 20;
      for (let i = 0; i < pendingTransactions.length; i += batchSize) {
        const batch = pendingTransactions.slice(i, i + batchSize);
        await this.processBatch(batch);
      }
    } catch (error) {
      console.error('Error syncing pending transactions:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Process a batch of transactions
   */
  private async processBatch(transactions: OfflineTransaction[]): Promise<void> {
    if (!this.processorContract || !this.signer) {
      throw new Error('Processor contract or signer not initialized');
    }

    try {
      // Extract transaction data for batch processing
      const txHashes = transactions.map(tx => '0x' + tx.hash);
      const senders = transactions.map(tx => tx.from);
      const recipients = transactions.map(tx => tx.to);
      const amounts = transactions.map(tx => ethers.parseEther(tx.amount));
      const nonces = transactions.map(tx => tx.nonce);
      const timestamps = transactions.map(tx => tx.timestamp);
      const signatures = transactions.map(tx => '0x' + tx.signature);

      // Update transaction statuses to PROCESSING
      for (const tx of transactions) {
        await offlineTransactionService.updateTransactionStatus(tx.id, TransactionStatus.PROCESSING);
      }

      // Submit transaction batch
      const batchTx = await this.processorContract.submitTransactionBatch(
        txHashes,
        senders,
        recipients,
        amounts,
        nonces,
        timestamps,
        signatures
      );

      // Wait for transaction to be mined
      const receipt = await batchTx.wait();
      console.log(`Batch transaction confirmed in block ${receipt.blockNumber}`);

      // Process events to find which transactions were processed successfully
      if (receipt.events) {
        for (const event of receipt.events) {
          if (event.event === 'TransactionProcessed') {
            const txHash = event.args.txHash;
            const tx = transactions.find(t => '0x' + t.hash === txHash);
            
            if (tx) {
              await offlineTransactionService.markTransactionSynced(tx.id);
            }
          } else if (event.event === 'TransactionRejected') {
            const txHash = event.args.txHash;
            const reason = event.args.reason;
            const tx = transactions.find(t => '0x' + t.hash === txHash);
            
            if (tx) {
              console.warn(`Transaction ${tx.id} rejected: ${reason}`);
              await offlineTransactionService.updateTransactionStatus(tx.id, TransactionStatus.REJECTED);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error processing transaction batch:', error);
      
      // Mark transactions as failed
      for (const tx of transactions) {
        await offlineTransactionService.updateTransactionStatus(tx.id, TransactionStatus.FAILED);
      }
    }
  }

  /**
   * Check if a transaction is processed on the blockchain
   */
  public async isTransactionProcessed(txHash: string): Promise<boolean> {
    if (!this.processorContract) return false;

    try {
      return await this.processorContract.isTransactionProcessed('0x' + txHash);
    } catch (error) {
      console.error('Error checking transaction status:', error);
      return false;
    }
  }

  /**
   * Get the token balance for an address
   */
  public async getBalance(address: string): Promise<string> {
    if (!this.tokenContract) return '0';

    try {
      const balance = await this.tokenContract.balanceOf(address);
      return ethers.formatEther(balance);
    } catch (error) {
      console.error('Error getting balance:', error);
      return '0';
    }
  }

  /**
   * Get blockchain transaction information
   */
  public async getTransaction(txHash: string): Promise<BlockchainTransaction | null> {
    if (!this.provider) return null;

    try {
      const tx = await this.provider.getTransaction(txHash);
      if (!tx) return null;

      const receipt = await this.provider.getTransactionReceipt(txHash);
      
      return {
        txHash,
        blockNumber: receipt?.blockNumber,
        from: tx.from,
        to: tx.to || '',
        amount: ethers.formatEther(tx.value),
        timestamp: Date.now(), // We would ideally get this from the block
        confirmations: receipt ? await this.provider.getBlockNumber() - receipt.blockNumber + 1 : 0,
        status: receipt ? receipt.status ? 'confirmed' : 'failed' : 'pending'
      };
    } catch (error) {
      console.error('Error getting transaction:', error);
      return null;
    }
  }

  /**
   * Create a direct blockchain transaction (not offline)
   */
  public async createDirectTransaction(
    to: string,
    amount: string
  ): Promise<string | null> {
    if (!this.tokenContract || !this.signer) {
      throw new Error('Token contract or signer not initialized');
    }

    try {
      const tx = await this.tokenContract.transfer(
        to,
        ethers.parseEther(amount)
      );

      // Wait for transaction to be mined
      const receipt = await tx.wait();
      return receipt.hash;
    } catch (error) {
      console.error('Error creating direct transaction:', error);
      return null;
    }
  }

  /**
   * Get the URL for a transaction on the block explorer
   */
  public getExplorerUrl(txHash: string): string {
    if (!this.currentNetwork) return '';
    return `${this.currentNetwork.explorerUrl}/tx/${txHash}`;
  }

  /**
   * Check if the service is ready
   */
  public isReady(): boolean {
    return this.initialized && this.isOnline;
  }

  /**
   * Check if a wallet is connected
   */
  public isWalletConnected(): boolean {
    return !!this.signer;
  }
}

// Create singleton instance
export const blockchainService = new BlockchainService();

// Export default
export default blockchainService;
