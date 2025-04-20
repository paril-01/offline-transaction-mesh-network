import React, { useEffect, useState } from 'react';
import FuturisticCard from './FuturisticCard';
import { Contract } from 'ethers';
import OfflineTransactionProcessorAbi from '../types/abi/OfflineTransactionProcessor.json';
import { useWallet } from '../hooks/useWallet';

const OFFLINE_PROCESSOR_ADDRESS = process.env.NEXT_PUBLIC_OFFLINE_PROCESSOR_ADDRESS as string;

interface FeedItem {
  type: string;
  txHash: string;
  timestamp?: number;
  details: string;
}

const ActivityFeed: React.FC = () => {
  const { provider } = useWallet();
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchEvents() {
      if (!provider) return;
      setLoading(true);
      const contract = new Contract(OFFLINE_PROCESSOR_ADDRESS, OfflineTransactionProcessorAbi.abi, provider);
      try {
        // Fetch recent BatchProcessed and TransactionValidated events
        const batchEvents = await contract.queryFilter(contract.filters.BatchProcessed());
        const validatedEvents = await contract.queryFilter(contract.filters.TransactionValidated?.() || []);
        const items: FeedItem[] = [];
        for (const evt of batchEvents.slice(-5)) {
          items.push({
            type: 'BatchProcessed',
            txHash: evt.transactionHash,
            timestamp: evt.blockNumber,
            details: `Batch processed by validator.`
          });
        }
        for (const evt of validatedEvents.slice(-5)) {
          items.push({
            type: 'TransactionValidated',
            txHash: evt.transactionHash,
            timestamp: evt.blockNumber,
            details: `Transaction validated.`
          });
        }
        // Sort by block number descending
        items.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        setFeed(items.slice(0, 10));
      } catch (e) {
        setFeed([]);
      }
      setLoading(false);
    }
    fetchEvents();
  }, [provider]);

  return (
    <FuturisticCard className="mt-8">
      <h2 className="text-xl font-bold mb-4">Activity Feed</h2>
      {loading ? (
        <div className="text-gray-400 text-sm">Loading...</div>
      ) : (
        <ul className="space-y-2 text-gray-200 text-sm">
          {feed.length === 0 && <li>No recent activity.</li>}
          {feed.map((item, idx) => (
            <li key={item.txHash + idx} className="flex flex-col">
              <span className="font-semibold text-cyan-400">{item.type}</span>
              <span className="truncate text-xs text-gray-400">Tx: {item.txHash}</span>
              <span className="text-xs text-gray-500">{item.details}</span>
            </li>
          ))}
        </ul>
      )}
    </FuturisticCard>
  );
};

export default ActivityFeed;
