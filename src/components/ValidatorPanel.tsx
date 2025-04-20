import React from 'react';
import FuturisticCard from './FuturisticCard';

const ValidatorPanel: React.FC = () => {
  return (
    <FuturisticCard className="mt-8">
      <h2 className="text-xl font-bold mb-4">Validator Actions</h2>
      {/* TODO: Integrate with validator contract functions */}
      <div className="space-y-2">
        <button className="btn-secondary w-full">Process Batch</button>
        <button className="btn-secondary w-full">Validate Transaction</button>
      </div>
    </FuturisticCard>
  );
};

export default ValidatorPanel;
