'use client';

import { BrowserQRCodeReader, IScannerControls } from '@zxing/browser';
import { OfflineTransaction } from '../types/transaction';
import offlineTransactionService from './offlineTransactionService';

class QRCodeService {
  private reader: BrowserQRCodeReader | null = null;
  private controls: IScannerControls | null = null;
  private isScanning = false;

  constructor() {
    // Initialize QR code reader when in browser
    if (typeof window !== 'undefined') {
      this.reader = new BrowserQRCodeReader();
    }
  }

  /**
   * Start scanning for QR codes
   * @param videoElementId ID of the video element to use for scanning
   * @param callback Function to call when a QR code is detected
   */
  public async startScanning(
    videoElementId: string,
    callback: (transaction: OfflineTransaction) => void
  ): Promise<void> {
    if (!this.reader || this.isScanning) {
      return;
    }

    try {
      this.isScanning = true;
      const videoElement = document.getElementById(videoElementId) as HTMLVideoElement;
      
      if (!videoElement) {
        throw new Error(`Video element with ID ${videoElementId} not found`);
      }
      
      console.log('Starting QR code scanner...');
      
      // Get available devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      
      if (videoDevices.length === 0) {
        throw new Error('No video input devices found');
      }
      
      // Prefer rear camera for mobile devices
      let selectedDeviceId = videoDevices[0].deviceId;
      
      for (const device of videoDevices) {
        // Check if it's likely a rear camera
        if (device.label.toLowerCase().includes('back') || 
            device.label.toLowerCase().includes('rear')) {
          selectedDeviceId = device.deviceId;
          break;
        }
      }
      
      // Start scanning with selected device
      this.controls = await this.reader.decodeFromVideoDevice(
        selectedDeviceId,
        videoElement,
        async (result, error) => {
          if (result) {
            console.log('QR code detected:', result.getText());
            
            try {
              // Process the QR code data
              const transaction = await this.processQRCode(result.getText());
              
              // Call the callback with the transaction
              if (transaction) {
                callback(transaction);
              }
            } catch (err) {
              console.error('Error processing QR code:', err);
            }
          }
          
          if (error) {
            // Ignore format errors (when no QR code is detected)
            if (!error.message.includes('format')) {
              console.error('QR code scanning error:', error);
            }
          }
        }
      );
      
      console.log('QR code scanner started');
    } catch (error) {
      console.error('Failed to start QR code scanner:', error);
      this.isScanning = false;
      throw error;
    }
  }

  /**
   * Stop scanning for QR codes
   */
  public stopScanning(): void {
    if (this.controls) {
      this.controls.stop();
      this.controls = null;
      this.isScanning = false;
      console.log('QR code scanner stopped');
    }
  }

  /**
   * Process a QR code containing transaction data
   */
  private async processQRCode(qrData: string): Promise<OfflineTransaction | null> {
    try {
      // Verify that the QR code contains valid transaction data
      const parsedData = JSON.parse(qrData);
      
      if (parsedData.type !== 'GLOBE_PAY_TX') {
        console.warn('Invalid QR code format, not a GlobePay transaction');
        return null;
      }
      
      // Process the transaction data
      return await offlineTransactionService.processQRTransaction(qrData);
    } catch (error) {
      console.error('Error processing QR code data:', error);
      return null;
    }
  }

  /**
   * Generate QR code payload for a transaction
   */
  public generateQRPayload(transaction: OfflineTransaction): string {
    return offlineTransactionService.generateQRPayload(transaction);
  }

  /**
   * Check if the device has a camera
   */
  public async hasCamera(): Promise<boolean> {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices) {
      return false;
    }
    
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.some(device => device.kind === 'videoinput');
    } catch (error) {
      console.error('Error checking for camera:', error);
      return false;
    }
  }
}

// Create singleton instance
export const qrCodeService = new QRCodeService();

// Export default
export default qrCodeService;
