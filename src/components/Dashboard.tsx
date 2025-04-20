import React from 'react';
import FuturisticCard from './FuturisticCard';
import { useStats } from '../hooks/useStats';

const Dashboard: React.FC = () => {
  const { balance, offlineTxCount, nodeCount } = useStats();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
      <FuturisticCard>
        <h2 className="text-xl font-bold mb-2">Your Balance</h2>
        <div className="text-4xl font-mono text-cyan-300">{balance} GPT</div>
        <div className="text-sm text-gray-400 mt-2">Live on-chain balance</div>
      </FuturisticCard>
      <FuturisticCard>
        <h2 className="text-xl font-bold mb-2">Mesh Network Stats</h2>
        <ul className="text-gray-200 text-sm space-y-1">
          <li>Offline Transactions: <span className="font-mono">{offlineTxCount}</span></li>
          <li>Network Nodes: <span className="font-mono">{nodeCount}</span></li>
        </ul>
      </FuturisticCard>
    </div>
  );
};

export default Dashboard;
