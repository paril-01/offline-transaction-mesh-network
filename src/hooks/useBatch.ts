import { useCallback } from 'react';
import { Contract, ethers } from 'ethers';
import GlobePayTokenAbi from '../types/abi/GlobePayToken.json';
import OfflineTransactionProcessorAbi from '../types/abi/OfflineTransactionProcessor.json';
import { useWallet } from './useWallet';

const OFFLINE_PROCESSOR_ADDRESS = process.env.NEXT_PUBLIC_OFFLINE_PROCESSOR_ADDRESS as string;

export function useSubmitBatch() {
  const { signer } = useWallet();

  return useCallback(async (batchData: any) => {
    if (!signer) throw new Error('Wallet not connected');
    const contract = new Contract(OFFLINE_PROCESSOR_ADDRESS, OfflineTransactionProcessorAbi.abi, signer);
    const tx = await contract.submitBatch(batchData);
    return tx;
  }, [signer]);
}

export function useProcessBatch() {
  const { signer } = useWallet();

  return useCallback(async (batchId: string) => {
    if (!signer) throw new Error('Wallet not connected');
    const contract = new Contract(OFFLINE_PROCESSOR_ADDRESS, OfflineTransactionProcessorAbi.abi, signer);
    const tx = await contract.processBatch(batchId);
    return tx;
  }, [signer]);
}
