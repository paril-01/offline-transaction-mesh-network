'use client';

import * as nacl from 'tweetnacl';
import { encode as encodeBase58, decode as decodeBase58 } from 'bs58';
import { v4 as uuidv4 } from 'uuid';
import { Transaction, QRData } from '@/models/types';

// Convert string to Uint8Array
export function stringToUint8Array(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

// Convert Uint8Array to string
export function uint8ArrayToString(array: Uint8Array): string {
  return new TextDecoder().decode(array);
}

// Convert a hex string to Uint8Array
export function hexToUint8Array(hex: string): Uint8Array {
  return new Uint8Array(Buffer.from(hex.startsWith('0x') ? hex.slice(2) : hex, 'hex'));
}

// Convert Uint8Array to hex string
export function uint8ArrayToHex(array: Uint8Array): string {
  return '0x' + Buffer.from(array).toString('hex');
}

// Generate a transaction ID
export function generateTransactionId(): string {
  return uuidv4();
}

// Create a message for signing
export function createTransactionMessage(
  amount: number,
  from: string,
  to: string,
  nonce: number,
  timestamp: number
): string {
  return `${amount}:${from}:${to}:${nonce}:${timestamp}`;
}

// Generate a key pair for a new user
export function generateKeyPair() {
  const pair = nacl.sign.keyPair();
  return {
    publicKey: encodeBase58(pair.publicKey),
    privateKey: encodeBase58(pair.secretKey)
  };
}

// Derive an Ethereum-like address from a public key
export function deriveAddressFromPublicKey(publicKeyStr: string): string {
  // Remove the prefix if it exists
  const keyStr = publicKeyStr.startsWith('ed25519:') 
    ? publicKeyStr.slice(8) 
    : publicKeyStr;
  
  // Convert from base64 to Uint8Array
  const publicKey = decodeBase64(keyStr);
  
  // Take the last 20 bytes of the public key (similar to Ethereum's approach)
  const addressBytes = publicKey.slice(publicKey.length - 20);
  
  // Convert to hex and format as an Ethereum address
  let address = '0x';
  for (let i = 0; i < addressBytes.length; i++) {
    const hex = addressBytes[i].toString(16);
    address += hex.length === 1 ? '0' + hex : hex;
  }
  
  return address;
}

export function signMessage(message: string, privateKey: string): string {
  const secretKey = decodeBase58(privateKey);
  const messageBytes = new TextEncoder().encode(message);
  const signature = nacl.sign.detached(messageBytes, secretKey);
  return encodeBase58(signature);
}

export function verifySignature(message: string, signature: string, publicKey: string): boolean {
  try {
    const publicKeyBytes = decodeBase58(publicKey);
    const signatureBytes = decodeBase58(signature);
    const messageBytes = new TextEncoder().encode(message);
    return nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);
  } catch (error) {
    console.error('Error verifying signature:', error);
    return false;
  }
}

// Create a QR data object from transaction
export function createQRData(transaction: Transaction): QRData {
  return {
    transactionId: transaction.id,
    senderAddress: transaction.from,
    recipientAddress: transaction.to,
    amount: transaction.amount,
    timestamp: transaction.timestamp,
    signature: transaction.signature,
    nonce: transaction.nonce
  };
}

// Serialize transaction data for QR code
export function serializeQRData(data: QRData): string {
  return JSON.stringify(data);
}

// Deserialize QR code data
export function deserializeQRData(qrString: string): QRData {
  try {
    return JSON.parse(qrString) as QRData;
  } catch (error) {
    console.error('Error deserializing QR data:', error);
    throw new Error('Invalid QR code data');
  }
} 