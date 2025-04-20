import { useEffect, useState } from 'react';
import { Contract } from 'ethers';
import GlobePayTokenAbi from '../types/abi/GlobePayToken.json';
import OfflineTransactionProcessorAbi from '../types/abi/OfflineTransactionProcessor.json';
import CollateralManagerAbi from '../types/abi/CollateralManager.json';
import { useWallet } from './useWallet';

const GLOBE_PAY_TOKEN_ADDRESS = process.env.NEXT_PUBLIC_GLOBE_PAY_TOKEN_ADDRESS as string;
const OFFLINE_PROCESSOR_ADDRESS = process.env.NEXT_PUBLIC_OFFLINE_PROCESSOR_ADDRESS as string;
const COLLATERAL_MANAGER_ADDRESS = process.env.NEXT_PUBLIC_COLLATERAL_MANAGER_ADDRESS as string;

export function useStats() {
  const { signer, address } = useWallet();
  const [balance, setBalance] = useState('0');
  const [collateral, setCollateral] = useState('0');
  const [offlineTxCount, setOfflineTxCount] = useState(0);
  const [nodeCount, setNodeCount] = useState(0);

  useEffect(() => {
    async function fetchStats() {
      if (!signer || !address) return;
      const token = new Contract(GLOBE_PAY_TOKEN_ADDRESS, GlobePayTokenAbi.abi, signer);
      const collateralManager = new Contract(COLLATERAL_MANAGER_ADDRESS, CollateralManagerAbi.abi, signer);
      const processor = new Contract(OFFLINE_PROCESSOR_ADDRESS, OfflineTransactionProcessorAbi.abi, signer);
      try {
        const bal = await token.balanceOf(address);
        setBalance(bal.toString());
        const col = await collateralManager.collateralOf(address);
        setCollateral(col.toString());
        const txCount = await processor.offlineTxCount();
        setOfflineTxCount(Number(txCount));
        const nodes = await processor.nodeCount();
        setNodeCount(Number(nodes));
      } catch (e) {
        // Optionally handle error
      }
    }
    fetchStats();
  }, [signer, address]);

  return { balance, collateral, offlineTxCount, nodeCount };
}
