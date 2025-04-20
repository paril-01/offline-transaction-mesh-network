import React, { useState } from 'react';
import FuturisticCard from './FuturisticCard';
import { useSubmitBatch, useProcessBatch } from '../hooks/useBatch';

const BatchPanel: React.FC = () => {
  const [batchId, setBatchId] = useState('');
  const [batchData, setBatchData] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const submitBatch = useSubmitBatch();
  const processBatch = useProcessBatch();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('Submitting batch...');
    try {
      const tx = await submitBatch(JSON.parse(batchData));
      setStatus(`Batch submitted! Tx: ${tx.hash}`);
    } catch (err: any) {
      setStatus(`Error: ${err.message}`);
    }
  };

  const handleProcess = async () => {
    setStatus('Processing batch...');
    try {
      const tx = await processBatch(batchId);
      setStatus(`Batch processed! Tx: ${tx.hash}`);
    } catch (err: any) {
      setStatus(`Error: ${err.message}`);
    }
  };

  return (
    <FuturisticCard className="mt-8">
      <h2 className="text-xl font-bold mb-4">Batch Processing</h2>
      <form onSubmit={handleSubmit} className="space-y-2">
        <textarea
          className="input-field"
          placeholder='Paste batch JSON array here'
          value={batchData}
          onChange={e => setBatchData(e.target.value)}
          rows={3}
        />
        <button className="btn-primary w-full" type="submit">Submit Batch</button>
      </form>
      <div className="flex space-x-2 mt-4">
        <input
          className="input-field flex-1"
          placeholder="Batch ID"
          value={batchId}
          onChange={e => setBatchId(e.target.value)}
        />
        <button className="btn-secondary" onClick={handleProcess}>Process Batch</button>
      </div>
      <div className="text-sm text-gray-400 mt-2 min-h-[32px]">{status}</div>
    </FuturisticCard>
  );
};

export default BatchPanel;
