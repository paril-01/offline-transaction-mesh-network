'use client';

// Base64 encoding and decoding functions

// Encode Uint8Array to base64 string
export function encode(data: Uint8Array): string {
  // Use the browser's btoa function with byte conversion
  const binary = Array.from(data)
    .map(byte => String.fromCharCode(byte))
    .join('');
  
  return btoa(binary);
}

// Decode base64 string to Uint8Array
export function decode(base64: string): Uint8Array {
  // Use the browser's atob function with byte conversion
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  
  return bytes;
}

// Hex encoding utilities

// Convert Uint8Array to hex string
export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Convert hex string to Uint8Array
export function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
} 