import { useCallback } from 'react';
import { Contract } from 'ethers';
import CollateralManagerAbi from '../types/abi/CollateralManager.json';
import { useWallet } from './useWallet';

const COLLATERAL_MANAGER_ADDRESS = process.env.NEXT_PUBLIC_COLLATERAL_MANAGER_ADDRESS as string;

export function useDepositCollateral() {
  const { signer } = useWallet();
  return useCallback(async (amount: string) => {
    if (!signer) throw new Error('Wallet not connected');
    const contract = new Contract(COLLATERAL_MANAGER_ADDRESS, CollateralManagerAbi.abi, signer);
    const tx = await contract.depositCollateral({ value: amount });
    return tx;
  }, [signer]);
}

export function useWithdrawCollateral() {
  const { signer } = useWallet();
  return useCallback(async (amount: string) => {
    if (!signer) throw new Error('Wallet not connected');
    const contract = new Contract(COLLATERAL_MANAGER_ADDRESS, CollateralManagerAbi.abi, signer);
    const tx = await contract.withdrawCollateral(amount);
    return tx;
  }, [signer]);
}
