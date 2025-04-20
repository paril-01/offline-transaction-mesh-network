'use client';

import Peer, { DataConnection } from 'peerjs';
import { OfflineTransaction } from '../types/transaction';

// Constants for mesh network configuration
const MESH_RECONNECT_DELAY = 5000; // 5 seconds
const PEER_DISCOVERY_INTERVAL = 30000; // 30 seconds
const TRANSACTION_BROADCAST_TTL = 5; // Number of hops for transaction propagation

interface PeerInfo {
  peerId: string;
  lastSeen: number;
  connection?: DataConnection;
}

interface MeshMessage {
  type: 'TRANSACTION' | 'PEER_ANNOUNCEMENT' | 'PEER_LIST' | 'PING';
  data?: any;
  ttl?: number; // Time-to-live for message propagation
  sender: string;
  timestamp: number;
  messageId: string;
}

interface ProcessedTransaction {
  hash: string;
  timestamp: number;
}

class MeshService {
  private peer: Peer | null = null;
  private peerId: string = '';
  private connections: Map<string, DataConnection> = new Map();
  private knownPeers: Map<string, PeerInfo> = new Map();
  private processedMessages: Set<string> = new Set();
  private processedTransactions: ProcessedTransaction[] = [];
  private isInitialized = false;
  private isOnline = false;
  private discoveryInterval: NodeJS.Timeout | null = null;
  private onTransactionReceived: ((transaction: OfflineTransaction) => void) | null = null;

  constructor() {
    console.log('Mesh network service created');
    // Listen for online/offline events
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline);
      window.addEventListener('offline', this.handleOffline);
      this.isOnline = navigator.onLine;
    }
  }

  /**
   * Initialize the mesh network
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized || typeof window === 'undefined') return;

    try {
      // Generate a stable peer ID based on device fingerprint or saved ID
      this.peerId = this.getOrCreatePeerId();
      
      // Create a new PeerJS instance
      this.peer = new Peer(this.peerId);
      
      // Set up event handlers
      this.peer.on('open', this.handlePeerOpen);
      this.peer.on('connection', this.handleIncomingConnection);
      this.peer.on('error', this.handlePeerError);
      this.peer.on('disconnected', this.handlePeerDisconnected);
      
      this.isInitialized = true;
      console.log('Mesh network initialized with peer ID:', this.peerId);
      
      // Start peer discovery if online
      if (this.isOnline) {
        this.startPeerDiscovery();
      }
    } catch (error) {
      console.error('Failed to initialize mesh network:', error);
      throw error;
    }
  }

  /**
   * Check if the mesh network is ready
   */
  public isReady(): boolean {
    return this.isInitialized && this.isOnline;
  }

  /**
   * Get the current peer ID
   */
  public getPeerId(): string {
    return this.peerId;
  }

  /**
   * Register a callback for received transactions
   */
  public onTransaction(callback: (transaction: OfflineTransaction) => void): void {
    this.onTransactionReceived = callback;
  }

  /**
   * Propagate a transaction to connected peers
   */
  public async propagateTransaction(transaction: OfflineTransaction): Promise<boolean> {
    if (!this.isReady()) {
      console.log('Mesh network not ready, storing transaction for later propagation');
      return false;
    }
    
    // Check if we've already processed this transaction
    if (this.hasProcessedTransaction(transaction.hash)) {
      return false;
    }
    
    // Add to processed transactions
    this.addProcessedTransaction(transaction.hash);
    
    const message: MeshMessage = {
      type: 'TRANSACTION',
      data: transaction,
      ttl: TRANSACTION_BROADCAST_TTL,
      sender: this.peerId,
      timestamp: Date.now(),
      messageId: `tx-${transaction.hash}-${Date.now()}`
    };
    
    // Broadcast to all connected peers
    return this.broadcastMessage(message);
  }

  /**
   * Connect to a specific peer by ID
   */
  public connectToPeer(peerId: string): void {
    if (!this.isReady() || peerId === this.peerId) return;
    
    if (this.connections.has(peerId)) {
      console.log(`Already connected to peer ${peerId}`);
      return;
    }
    
    console.log(`Connecting to peer ${peerId}`);
    const connection = this.peer!.connect(peerId, {
      reliable: true
    });
    
    connection.on('open', () => {
      this.handleConnectionOpen(connection);
    });
  }

  /**
   * Get the count of connected peers
   */
  public getConnectedPeersCount(): number {
    return this.connections.size;
  }

  /**
   * Get the list of connected peer IDs
   */
  public getConnectedPeerIds(): string[] {
    return Array.from(this.connections.keys());
  }

  // Private methods

  /**
   * Create or retrieve a persistent peer ID
   */
  private getOrCreatePeerId(): string {
    const savedPeerId = localStorage.getItem('globepay-peer-id');
    if (savedPeerId) return savedPeerId;
    
    // Generate a new peer ID using a random string
    const newPeerId = 'globepay-' + Math.random().toString(36).substring(2, 15);
    localStorage.setItem('globepay-peer-id', newPeerId);
    return newPeerId;
  }

  /**
   * Handle peer open event
   */
  private handlePeerOpen = (id: string): void => {
    console.log(`Peer opened with ID: ${id}`);
    this.peerId = id;
  }

  /**
   * Handle peer error event
   */
  private handlePeerError = (error: any): void => {
    console.error('Peer error:', error);
    // Attempt to reconnect after delay
    setTimeout(() => {
      if (this.peer && this.peer.disconnected) {
        this.peer.reconnect();
      }
    }, MESH_RECONNECT_DELAY);
  }

  /**
   * Handle peer disconnected event
   */
  private handlePeerDisconnected = (): void => {
    console.log('Peer disconnected');
    // Attempt to reconnect after delay
    setTimeout(() => {
      if (this.peer && this.peer.disconnected) {
        this.peer.reconnect();
      }
    }, MESH_RECONNECT_DELAY);
  }

  /**
   * Handle incoming connection
   */
  private handleIncomingConnection = (connection: DataConnection): void => {
    console.log(`Incoming connection from peer ${connection.peer}`);
    connection.on('open', () => {
      this.handleConnectionOpen(connection);
    });
  }

  /**
   * Handle connection open event
   */
  private handleConnectionOpen = (connection: DataConnection): void => {
    const peerId = connection.peer;
    console.log(`Connection opened with peer ${peerId}`);
    
    // Store the connection
    this.connections.set(peerId, connection);
    
    // Update known peers
    this.knownPeers.set(peerId, {
      peerId,
      lastSeen: Date.now(),
      connection
    });
    
    // Set up event handlers
    connection.on('data', (data) => this.handleConnectionData(peerId, data));
    connection.on('close', () => this.handleConnectionClose(peerId));
    connection.on('error', (err) => this.handleConnectionError(peerId, err));
    
    // Exchange peer lists
    this.sendPeerList(connection);
  }

  /**
   * Handle connection data event
   */
  private handleConnectionData = (peerId: string, data: any): void => {
    // Update last seen time
    const peerInfo = this.knownPeers.get(peerId);
    if (peerInfo) {
      peerInfo.lastSeen = Date.now();
      this.knownPeers.set(peerId, peerInfo);
    }
    
    // Process the message
    if (this.isValidMessage(data)) {
      this.processMessage(data as MeshMessage);
    }
  }

  /**
   * Handle connection close event
   */
  private handleConnectionClose = (peerId: string): void => {
    console.log(`Connection closed with peer ${peerId}`);
    this.connections.delete(peerId);
    
    // Keep peer in known peers list, but remove connection
    const peerInfo = this.knownPeers.get(peerId);
    if (peerInfo) {
      peerInfo.connection = undefined;
      this.knownPeers.set(peerId, peerInfo);
    }
  }

  /**
   * Handle connection error event
   */
  private handleConnectionError = (peerId: string, error: any): void => {
    console.error(`Connection error with peer ${peerId}:`, error);
    this.connections.delete(peerId);
  }

  /**
   * Handle online event
   */
  private handleOnline = (): void => {
    console.log('Device is online');
    this.isOnline = true;
    
    // Reconnect to the peer server
    if (this.peer && this.peer.disconnected) {
      this.peer.reconnect();
    }
    
    // Start peer discovery
    this.startPeerDiscovery();
  }

  /**
   * Handle offline event
   */
  private handleOffline = (): void => {
    console.log('Device is offline');
    this.isOnline = false;
    
    // Stop peer discovery
    this.stopPeerDiscovery();
  }

  /**
   * Start peer discovery process
   */
  private startPeerDiscovery(): void {
    if (this.discoveryInterval) {
      clearInterval(this.discoveryInterval);
    }
    
    // Regularly look for new peers
    this.discoveryInterval = setInterval(() => {
      this.discoverPeers();
    }, PEER_DISCOVERY_INTERVAL);
    
    // Initial discovery
    this.discoverPeers();
  }

  /**
   * Stop peer discovery process
   */
  private stopPeerDiscovery(): void {
    if (this.discoveryInterval) {
      clearInterval(this.discoveryInterval);
      this.discoveryInterval = null;
    }
  }

  /**
   * Discover new peers
   * In a real implementation, this would use a discovery server or local network scanning
   */
  private discoverPeers(): void {
    // For demo purposes, we're not implementing actual discovery
    // In a real app, this could use a signaling server, Bluetooth, or local WiFi scanning
    console.log('Looking for nearby peers...');
    
    // Broadcast to connected peers that we're looking for more peers
    this.broadcastMessage({
      type: 'PEER_ANNOUNCEMENT',
      sender: this.peerId,
      timestamp: Date.now(),
      messageId: `announce-${this.peerId}-${Date.now()}`
    });
  }

  /**
   * Send peer list to a connection
   */
  private sendPeerList(connection: DataConnection): void {
    const peerList = Array.from(this.knownPeers.keys());
    
    connection.send({
      type: 'PEER_LIST',
      data: peerList,
      sender: this.peerId,
      timestamp: Date.now(),
      messageId: `peerlist-${this.peerId}-${Date.now()}`
    });
  }

  /**
   * Check if a message is valid
   */
  private isValidMessage(data: any): boolean {
    return (
      data &&
      typeof data === 'object' &&
      typeof data.type === 'string' &&
      typeof data.sender === 'string' &&
      typeof data.timestamp === 'number' &&
      typeof data.messageId === 'string'
    );
  }

  /**
   * Process a received message
   */
  private processMessage(message: MeshMessage): void {
    // Check if we've already processed this message
    if (this.processedMessages.has(message.messageId)) {
      return;
    }
    
    // Add to processed messages
    this.processedMessages.add(message.messageId);
    
    // Process based on message type
    switch (message.type) {
      case 'TRANSACTION':
        this.handleTransactionMessage(message);
        break;
      case 'PEER_ANNOUNCEMENT':
        this.handlePeerAnnouncementMessage(message);
        break;
      case 'PEER_LIST':
        this.handlePeerListMessage(message);
        break;
      case 'PING':
        // Simple ping message, no action needed
        break;
      default:
        console.warn('Unknown message type:', message.type);
    }
    
    // Propagate the message if TTL allows
    this.propagateMessage(message);
  }

  /**
   * Handle a transaction message
   */
  private handleTransactionMessage(message: MeshMessage): void {
    if (!message.data) return;
    
    const transaction = message.data as OfflineTransaction;
    
    // Check if we've already processed this transaction
    if (this.hasProcessedTransaction(transaction.hash)) {
      return;
    }
    
    // Add to processed transactions
    this.addProcessedTransaction(transaction.hash);
    
    console.log('Received transaction via mesh network:', transaction.id);
    
    // Notify callback if registered
    if (this.onTransactionReceived) {
      this.onTransactionReceived(transaction);
    }
  }

  /**
   * Handle a peer announcement message
   */
  private handlePeerAnnouncementMessage(message: MeshMessage): void {
    const peerId = message.sender;
    
    // Check if this is a new peer and we're not already connected
    if (peerId !== this.peerId && !this.connections.has(peerId)) {
      // Store in known peers
      this.knownPeers.set(peerId, {
        peerId,
        lastSeen: Date.now()
      });
      
      // Try to connect
      this.connectToPeer(peerId);
    }
  }

  /**
   * Handle a peer list message
   */
  private handlePeerListMessage(message: MeshMessage): void {
    if (!message.data || !Array.isArray(message.data)) return;
    
    const peerList = message.data as string[];
    
    // Process each peer in the list
    peerList.forEach(peerId => {
      // Only process if it's not us and we're not already connected
      if (peerId !== this.peerId && !this.connections.has(peerId)) {
        // Store in known peers
        if (!this.knownPeers.has(peerId)) {
          this.knownPeers.set(peerId, {
            peerId,
            lastSeen: Date.now()
          });
        }
        
        // Try to connect to a subset of peers
        // (Don't connect to ALL peers to avoid network congestion)
        if (Math.random() < 0.3) { // 30% chance to connect
          this.connectToPeer(peerId);
        }
      }
    });
  }

  /**
   * Propagate a message to connected peers
   */
  private propagateMessage(message: MeshMessage): void {
    // Check TTL
    if (message.ttl !== undefined) {
      if (message.ttl <= 0) {
        return; // Don't propagate
      }
      
      // Decrement TTL
      message.ttl--;
    }
    
    // Don't send back to the sender
    this.broadcastMessage(message, new Set([message.sender]));
  }

  /**
   * Broadcast a message to all connected peers
   */
  private broadcastMessage(message: MeshMessage, excludePeers: Set<string> = new Set()): boolean {
    let sentToAtLeastOne = false;
    
    this.connections.forEach((connection, peerId) => {
      if (!excludePeers.has(peerId)) {
        try {
          connection.send(message);
          sentToAtLeastOne = true;
        } catch (error) {
          console.error(`Failed to send message to peer ${peerId}:`, error);
        }
      }
    });
    
    return sentToAtLeastOne;
  }

  /**
   * Check if a transaction has been processed
   */
  private hasProcessedTransaction(hash: string): boolean {
    return this.processedTransactions.some(tx => tx.hash === hash);
  }

  /**
   * Add a transaction to the processed list
   */
  private addProcessedTransaction(hash: string): void {
    this.processedTransactions.push({
      hash,
      timestamp: Date.now()
    });
    
    // Clean up old transactions (older than 1 hour)
    const oneHourAgo = Date.now() - 3600000;
    this.processedTransactions = this.processedTransactions.filter(
      tx => tx.timestamp > oneHourAgo
    );
  }
}

// Create singleton instance
export const meshService = new MeshService();

// Initialize function for use in app startup
export async function initializeMeshNetwork(): Promise<void> {
  await meshService.initialize();
}