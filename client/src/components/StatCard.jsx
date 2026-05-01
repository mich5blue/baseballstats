import React from 'react';

export default function StatCard({ label, value, subvalue, icon, color = 'accent', large = false }) {
  const colorMap = {
    accent: 'text-accent',
    gold: 'text-gold',
    green: 'text-emerald-400',
    blue: 'text-blue-400',
    purple: 'text-purple-400',
    muted: 'text-muted'
  };

  return (
    <div className="card p-4 flex flex-col gap-1 hover:border-accent/30 transition-colors">
      <div className="flex items-center justify-between">
        <span className="text-muted text-xs uppercase tracking-wider font-medium">{label}</span>
        {icon && <span className="text-lg">{icon}</span>}
      </div>
      <div className={`font-mono font-black stat-animate ${large ? 'text-4xl' : 'text-2xl'} ${colorMap[color] || 'text-white'}`}>
        {value !== undefined && value !== null ? value : '---'}
      </div>
      {subvalue && (
        <div className="text-muted text-xs">{subvalue}</div>
      )}
    </div>
  );
}
