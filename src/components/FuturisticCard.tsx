import React from 'react';

interface FuturisticCardProps {
  children: React.ReactNode;
  className?: string;
}

const FuturisticCard: React.FC<FuturisticCardProps> = ({ children, className = '' }) => {
  return (
    <div
      className={`futuristic-card relative bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl shadow-xl p-6 overflow-hidden ${className}`}
    >
      {/* Animated mesh/neon background */}
      <div className="absolute inset-0 z-0 pointer-events-none animate-mesh-bg" />
      <div className="relative z-10">{children}</div>
    </div>
  );
};

export default FuturisticCard;
