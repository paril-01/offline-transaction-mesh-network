import React from 'react';
import { useWallet } from '../hooks/useWallet';

const WalletConnectButton: React.FC = () => {
  const { isConnected, address, connect } = useWallet();

  return (
    <button
      onClick={connect}
      className="px-6 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-700 text-white font-semibold shadow-lg hover:from-purple-500 hover:to-blue-700 transition duration-300 backdrop-blur-md border border-white/20"
    >
      {isConnected ? (
        <span className="flex items-center gap-2">
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          {address?.slice(0, 6)}...{address?.slice(-4)}
        </span>
      ) : (
        <span>Connect Wallet</span>
      )}
    </button>
  );
};

export default WalletConnectButton;
