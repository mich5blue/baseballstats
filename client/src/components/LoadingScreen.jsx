import React from 'react';
import BaseballSpinner from './BaseballSpinner.jsx';

/**
 * Full-page baseball-themed loading screen.
 * Shown while team data is being fetched.
 */
export default function LoadingScreen({ label }) {
  return (
    <div className="fixed inset-0 bg-field flex flex-col items-center justify-center gap-10 loader-fade-in z-30">

      {/* Baseball diamond + spinning ball */}
      <div className="relative w-44 h-44 flex items-center justify-center">

        {/* Animated diamond basepaths */}
        <svg viewBox="0 0 160 160" className="absolute inset-0 w-full h-full" fill="none">
          <polygon
            points="80,18 142,80 80,142 18,80"
            stroke="rgba(201,165,53,0.18)"
            strokeWidth="1.5"
            fill="none"
          />
          <line x1="80"  y1="18"  x2="142" y2="80"  stroke="rgba(201,165,53,0.12)" strokeWidth="1" strokeDasharray="4 4" />
          <line x1="142" y1="80"  x2="80"  y2="142" stroke="rgba(201,165,53,0.12)" strokeWidth="1" strokeDasharray="4 4" />
          <line x1="80"  y1="142" x2="18"  y2="80"  stroke="rgba(201,165,53,0.12)" strokeWidth="1" strokeDasharray="4 4" />
          <line x1="18"  y1="80"  x2="80"  y2="18"  stroke="rgba(201,165,53,0.12)" strokeWidth="1" strokeDasharray="4 4" />
          {/* Home plate */}
          <g className="base-4">
            <polygon points="80,136 88,142 88,150 72,150 72,142" fill="#c9a535" />
          </g>
          {/* First base */}
          <g className="base-1">
            <rect x="136" y="72" width="12" height="12" rx="2" fill="#c9a535" />
          </g>
          {/* Second base */}
          <g className="base-2">
            <rect x="74" y="12" width="12" height="12" rx="2" fill="#c9a535" transform="rotate(45 80 18)" />
          </g>
          {/* Third base */}
          <g className="base-3">
            <rect x="12" y="72" width="12" height="12" rx="2" fill="#c9a535" />
          </g>
          <circle cx="80" cy="80" r="3" fill="rgba(201,165,53,0.3)" />
        </svg>

        {/* Spinning baseball */}
        <div className="relative z-10">
          <BaseballSpinner size="md" />
        </div>
      </div>

      {/* Label + animated dots */}
      <div className="flex flex-col items-center gap-3">
        {label && (
          <p className="text-white font-semibold text-base tracking-wide opacity-80">{label}</p>
        )}
        <div className="flex items-center gap-1.5">
          <span className="dot-1 w-1.5 h-1.5 rounded-full bg-accent inline-block" />
          <span className="dot-2 w-1.5 h-1.5 rounded-full bg-accent inline-block" />
          <span className="dot-3 w-1.5 h-1.5 rounded-full bg-accent inline-block" />
        </div>
      </div>

    </div>
  );
}
