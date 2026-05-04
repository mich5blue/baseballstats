import React from 'react';

/**
 * Full-page baseball-themed loading screen.
 * Shown while team data is being fetched.
 */
export default function LoadingScreen({ label = 'Loading…' }) {
  return (
    <div className="fixed inset-0 bg-field flex flex-col items-center justify-center gap-10 loader-fade-in z-30">

      {/* Baseball diamond + spinning ball */}
      <div className="relative w-44 h-44 flex items-center justify-center">

        {/* Diamond basepaths */}
        <svg viewBox="0 0 160 160" className="absolute inset-0 w-full h-full" fill="none">
          {/* Base paths */}
          <polygon
            points="80,18 142,80 80,142 18,80"
            stroke="rgba(201,165,53,0.18)"
            strokeWidth="1.5"
            fill="none"
          />
          {/* Baselines — faint dashes */}
          <line x1="80" y1="18"  x2="142" y2="80"  stroke="rgba(201,165,53,0.12)" strokeWidth="1" strokeDasharray="4 4" />
          <line x1="142" y1="80" x2="80"  y2="142" stroke="rgba(201,165,53,0.12)" strokeWidth="1" strokeDasharray="4 4" />
          <line x1="80"  y1="142" x2="18" y2="80"  stroke="rgba(201,165,53,0.12)" strokeWidth="1" strokeDasharray="4 4" />
          <line x1="18"  y1="80"  x2="80" y2="18"  stroke="rgba(201,165,53,0.12)" strokeWidth="1" strokeDasharray="4 4" />

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

          {/* Pitcher's mound dot */}
          <circle cx="80" cy="80" r="3" fill="rgba(201,165,53,0.3)" />
        </svg>

        {/* Spinning baseball in the center */}
        <div className="baseball-spin relative z-10">
          <svg viewBox="0 0 56 56" width="56" height="56" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Shadow */}
            <ellipse cx="28" cy="52" rx="12" ry="3" fill="rgba(0,0,0,0.35)" />
            {/* Ball */}
            <circle cx="28" cy="26" r="22" fill="#f0ebe0" />
            <circle cx="28" cy="26" r="22" stroke="#d4ccb8" strokeWidth="0.8" />
            {/* Left seam */}
            <path d="M14 13 C17 19 17 33 14 39" stroke="#cc2222" strokeWidth="2" strokeLinecap="round" fill="none" />
            {/* Right seam */}
            <path d="M42 13 C39 19 39 33 42 39" stroke="#cc2222" strokeWidth="2" strokeLinecap="round" fill="none" />
            {/* Left stitch marks */}
            <line x1="13" y1="17" x2="17.5" y2="18.5" stroke="#cc2222" strokeWidth="1.4" strokeLinecap="round" />
            <line x1="12.5" y1="22" x2="17.5" y2="22" stroke="#cc2222" strokeWidth="1.4" strokeLinecap="round" />
            <line x1="12.5" y1="27" x2="17.5" y2="26" stroke="#cc2222" strokeWidth="1.4" strokeLinecap="round" />
            <line x1="13" y1="32" x2="17.5" y2="30.5" stroke="#cc2222" strokeWidth="1.4" strokeLinecap="round" />
            <line x1="14" y1="37" x2="18"   y2="35"   stroke="#cc2222" strokeWidth="1.4" strokeLinecap="round" />
            {/* Right stitch marks */}
            <line x1="43" y1="17" x2="38.5" y2="18.5" stroke="#cc2222" strokeWidth="1.4" strokeLinecap="round" />
            <line x1="43.5" y1="22" x2="38.5" y2="22"  stroke="#cc2222" strokeWidth="1.4" strokeLinecap="round" />
            <line x1="43.5" y1="27" x2="38.5" y2="26"  stroke="#cc2222" strokeWidth="1.4" strokeLinecap="round" />
            <line x1="43" y1="32" x2="38.5" y2="30.5" stroke="#cc2222" strokeWidth="1.4" strokeLinecap="round" />
            <line x1="42" y1="37" x2="38"   y2="35"   stroke="#cc2222" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        </div>
      </div>

      {/* Label + animated dots */}
      <div className="flex flex-col items-center gap-3">
        <p className="text-white font-semibold text-base tracking-wide opacity-80">{label}</p>
        <div className="flex items-center gap-1.5">
          <span className="dot-1 w-1.5 h-1.5 rounded-full bg-accent inline-block" />
          <span className="dot-2 w-1.5 h-1.5 rounded-full bg-accent inline-block" />
          <span className="dot-3 w-1.5 h-1.5 rounded-full bg-accent inline-block" />
        </div>
      </div>

    </div>
  );
}
