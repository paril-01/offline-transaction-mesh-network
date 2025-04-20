import React, { useState } from 'react';
import FuturisticCard from './FuturisticCard';
import { useSubmitBatch } from '../hooks/useBatch';

const TransactionForm: React.FC = () => {
  const [batchData, setBatchData] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const submitBatch = useSubmitBatch();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('Submitting batch...');
    try {
      const batchArray = JSON.parse(batchData);
      const tx = await submitBatch(batchArray);
      setStatus(`Batch submitted! Tx: ${tx.hash}`);
    } catch (err: any) {
      setStatus(`Error: ${err.message}`);
    }
  };

  return (
    <FuturisticCard className="mt-8">
      <h2 className="text-xl font-bold mb-4">Send Multiple Payments (Batch)</h2>
      <div className="text-sm text-gray-300 mb-2">
        <strong>How to use:</strong><br/>
        1. Enter a list of payments you want to send, in the box below.<br/>
        2. Each payment must have a recipient address and an amount.<br/>
        3. Click <b>Submit Batch</b> to send all at once.<br/>
      </div>
      <div className="bg-[#181c24] rounded p-2 mb-2 text-xs text-cyan-200">
        <strong>Example:</strong><br/>
        <pre className="whitespace-pre-wrap">[
  { "to": "0x123...abc", "amount": "10" },
  { "to": "0x456...def", "amount": "5" }
]</pre>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <textarea
          className="input-field"
          placeholder="Paste or type your list of payments here (see example above)"
          value={batchData}
          onChange={e => setBatchData(e.target.value)}
          rows={5}
          required
        />
        <button className="btn-primary w-full" type="submit">
          Submit Batch
        </button>
      </form>
      <div className="text-xs text-gray-400 mt-2">Tip: Make sure each address is correct. You can send as many payments as you want in one go!</div>
      <div className="text-sm text-gray-400 mt-2 min-h-[32px]">{status}</div>
    </FuturisticCard>
  );
};

export default TransactionForm;
