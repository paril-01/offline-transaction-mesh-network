import { useMemo } from 'react';
import { Contract, type Signer } from 'ethers';
import type { Provider } from 'ethers';
import GlobePayTokenABI from '../types/abi/GlobePayToken.json';
import OfflineTransactionProcessorABI from '../types/abi/OfflineTransactionProcessor.json';
import CollateralManagerABI from '../types/abi/CollateralManager.json';

const CONTRACT_ADDRESSES = {
  GlobePayToken: process.env.NEXT_PUBLIC_GLOBE_PAY_TOKEN_ADDRESS as string,
  OfflineTransactionProcessor: process.env.NEXT_PUBLIC_OFFLINE_TX_PROCESSOR_ADDRESS as string,
  CollateralManager: process.env.NEXT_PUBLIC_COLLATERAL_MANAGER_ADDRESS as string,
};

export function useGlobePayToken(signerOrProvider: Signer | Provider) {
  return useMemo(() => new Contract(CONTRACT_ADDRESSES.GlobePayToken, GlobePayTokenABI.abi, signerOrProvider), [signerOrProvider]);
}

export function useOfflineTransactionProcessor(signerOrProvider: Signer | Provider) {
  return useMemo(() => new Contract(CONTRACT_ADDRESSES.OfflineTransactionProcessor, OfflineTransactionProcessorABI.abi, signerOrProvider), [signerOrProvider]);
}

export function useCollateralManager(signerOrProvider: Signer | Provider) {
  return useMemo(() => new Contract(CONTRACT_ADDRESSES.CollateralManager, CollateralManagerABI.abi, signerOrProvider), [signerOrProvider]);
}
