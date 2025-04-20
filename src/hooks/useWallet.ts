import { useEffect, useState } from 'react';
import type { Signer } from 'ethers';
// v5: import { Web3Provider } from '@ethersproject/providers'; v6: import { BrowserProvider } from 'ethers';
let Web3Provider: any;
try {
  // Try v5 import
  Web3Provider = require('@ethersproject/providers').Web3Provider;
} catch {
  // Fallback to v6
  Web3Provider = require('ethers').BrowserProvider;
}


export function useWallet() {
  const [provider, setProvider] = useState<any>(null);
  const [signer, setSigner] = useState<Signer | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      const web3Provider = new Web3Provider((window as any).ethereum);
      setProvider(web3Provider);
      web3Provider.send('eth_accounts', []).then((accounts: string[]) => {
        if (accounts.length > 0) {
          setIsConnected(true);
          setAddress(accounts[0]);
          setSigner(web3Provider.getSigner());
        }
      });
    }
  }, []);

  const connect = async () => {
    if (provider) {
      const accounts = await provider.send('eth_requestAccounts', []);
      setIsConnected(accounts.length > 0);
      setAddress(accounts[0]);
      setSigner(provider.getSigner());
    }
  };

  return { provider, signer, address, isConnected, connect };
}

