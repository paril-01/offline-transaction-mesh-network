'use client';

import { useState, useEffect, useRef } from 'react';
import { BrowserQRCodeReader, IScannerControls } from '@zxing/browser';
import { Result } from '@zxing/library';
import { QRData } from '@/models/types';
import { deserializeQRData } from '@/utils/crypto';

interface UseQRScannerOptions {
  onResult?: (result: Result) => void;
  onError?: (error: Error) => void;
  onQRData?: (data: QRData) => void;
  onNotFound?: () => void;
}

export default function useQRScanner({
  onResult,
  onError,
  onQRData,
  onNotFound,
}: UseQRScannerOptions = {}) {
  const [isScanning, setIsScanning] = useState(false);
  const [lastResult, setLastResult] = useState<Result | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  
  // Start scanning
  const startScanner = async (videoElementId: string) => {
    try {
      setIsScanning(true);
      
      // Request camera permission
      await navigator.mediaDevices.getUserMedia({ video: true });
      setHasPermission(true);
      
      const videoElement = document.getElementById(videoElementId) as HTMLVideoElement;
      if (!videoElement) {
        throw new Error(`Video element with id ${videoElementId} not found`);
      }
      
      const codeReader = new BrowserQRCodeReader();
      
      controlsRef.current = await codeReader.decodeFromVideoDevice(
        undefined,
        videoElement,
        (result, error, controls) => {
          if (error) {
            if (onError) onError(error);
            return;
          }
          
          if (result) {
            setLastResult(result);
            if (onResult) onResult(result);
            
            // Try to parse QR data
            try {
              const qrData = deserializeQRData(result.getText());
              if (qrData && onQRData) {
                onQRData(qrData);
              }
            } catch (parseError) {
              console.error('Failed to parse QR data:', parseError);
            }
          } else if (onNotFound) {
            onNotFound();
          }
        }
      );
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          setHasPermission(false);
        }
        if (onError) onError(error);
      }
      setIsScanning(false);
    }
  };
  
  // Stop scanning
  const stopScanner = () => {
    if (controlsRef.current) {
      controlsRef.current.stop();
      controlsRef.current = null;
      setIsScanning(false);
    }
  };
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);
  
  return {
    startScanner,
    stopScanner,
    isScanning,
    lastResult,
    hasPermission,
  };
} 