import React, { useState } from 'react';
import FuturisticCard from './FuturisticCard';
import { useDepositCollateral, useWithdrawCollateral } from '../hooks/useCollateral';
import { useStats } from '../hooks/useStats';

const CollateralPanel: React.FC = () => {
  const [amount, setAmount] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const depositCollateral = useDepositCollateral();
  const withdrawCollateral = useWithdrawCollateral();
  const { collateral } = useStats();

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('Depositing...');
    try {
      const tx = await depositCollateral(amount);
      setStatus(`Deposited! Tx: ${tx.hash}`);
    } catch (err: any) {
      setStatus(`Error: ${err.message}`);
    }
  };

  const handleWithdraw = async () => {
    setStatus('Withdrawing...');
    try {
      const tx = await withdrawCollateral(amount);
      setStatus(`Withdrawn! Tx: ${tx.hash}`);
    } catch (err: any) {
      setStatus(`Error: ${err.message}`);
    }
  };

  return (
    <FuturisticCard className="mt-8">
      <h2 className="text-xl font-bold mb-4">Collateral Management</h2>
      <form className="space-y-2" onSubmit={handleDeposit}>
        <input
          className="input-field"
          type="number"
          placeholder="Amount"
          min="0"
          value={amount}
          onChange={e => setAmount(e.target.value)}
        />
        <button className="btn-primary w-full" type="submit">Deposit</button>
        <button className="btn-secondary w-full" type="button" onClick={handleWithdraw}>Withdraw</button>
      </form>
      <div className="text-sm text-gray-400 mt-2">Your collateral balance: <span className="font-mono">{collateral}</span></div>
      <div className="text-sm text-gray-400 mt-2 min-h-[32px]">{status}</div>
    </FuturisticCard>
  );
};

export default CollateralPanel;
