import React from 'react';

/**
 * Standalone spinning baseball — use wherever a loading indicator is needed.
 * size: 'sm' (32px) | 'md' (48px, default) | 'lg' (64px)
 */
export default function BaseballSpinner({ size = 'md' }) {
  const px = size === 'sm' ? 32 : size === 'lg' ? 64 : 48;
  return (
    <div className="baseball-spin" style={{ width: px, height: px, flexShrink: 0 }}>
      <svg viewBox="0 0 56 56" width={px} height={px} fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="28" cy="28" r="22" fill="#f0ebe0" />
        <circle cx="28" cy="28" r="22" stroke="#d4ccb8" strokeWidth="0.8" />
        {/* Left seam */}
        <path d="M14 15 C17 21 17 35 14 41" stroke="#cc2222" strokeWidth="2" strokeLinecap="round" fill="none" />
        {/* Right seam */}
        <path d="M42 15 C39 21 39 35 42 41" stroke="#cc2222" strokeWidth="2" strokeLinecap="round" fill="none" />
        {/* Left stitches */}
        <line x1="13"   y1="19"   x2="17.5" y2="20.5" stroke="#cc2222" strokeWidth="1.4" strokeLinecap="round" />
        <line x1="12.5" y1="24.5" x2="17.5" y2="24.5" stroke="#cc2222" strokeWidth="1.4" strokeLinecap="round" />
        <line x1="12.5" y1="29.5" x2="17.5" y2="28.5" stroke="#cc2222" strokeWidth="1.4" strokeLinecap="round" />
        <line x1="13"   y1="34.5" x2="17.5" y2="33"   stroke="#cc2222" strokeWidth="1.4" strokeLinecap="round" />
        <line x1="14"   y1="39"   x2="18"   y2="37"   stroke="#cc2222" strokeWidth="1.4" strokeLinecap="round" />
        {/* Right stitches */}
        <line x1="43"   y1="19"   x2="38.5" y2="20.5" stroke="#cc2222" strokeWidth="1.4" strokeLinecap="round" />
        <line x1="43.5" y1="24.5" x2="38.5" y2="24.5" stroke="#cc2222" strokeWidth="1.4" strokeLinecap="round" />
        <line x1="43.5" y1="29.5" x2="38.5" y2="28.5" stroke="#cc2222" strokeWidth="1.4" strokeLinecap="round" />
        <line x1="43"   y1="34.5" x2="38.5" y2="33"   stroke="#cc2222" strokeWidth="1.4" strokeLinecap="round" />
        <line x1="42"   y1="39"   x2="38"   y2="37"   stroke="#cc2222" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    </div>
  );
}
