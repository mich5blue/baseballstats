import React, { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';

const REMOTE_LOGO_URL = 'https://sluggerssportsacademy.com/uploads/3/4/8/5/34856527/sluggers-logo_orig.png';

function SluggerLogo({ className = 'w-10 h-10' }) {
  // Try remote logo; if that fails, fall back to local SVG, then inline fallback
  const [src, setSrc] = useState(REMOTE_LOGO_URL);
  const [useSvg, setUseSvg] = useState(false);

  const handleError = () => {
    if (src === REMOTE_LOGO_URL) {
      setSrc('/sluggers-s.svg');
    } else {
      setUseSvg(true);
    }
  };

  if (!useSvg) {
    return (
      <img
        src={src}
        alt="Sluggers"
        className={`${className} object-contain`}
        onError={handleError}
      />
    );
  }
  // Fallback SVG if image fails to load
  return (
    <svg viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" rx="12" fill="#08122a"/>
      <rect x="3" y="3" width="94" height="94" rx="10" fill="none" stroke="#c9a535" strokeWidth="2"/>
      <rect x="7" y="7" width="86" height="86" rx="7" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1"/>
      <text x="51" y="77" fontFamily="'Arial Black',Arial,sans-serif" fontSize="76" fontWeight="900"
        fontStyle="italic" textAnchor="middle" fill="white" letterSpacing="-2">S</text>
    </svg>
  );
}

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinks = [
    { to: '/', label: 'Home', exact: true },
    { to: '/roster', label: 'Roster' },
    { to: '/games', label: 'Games' },
    { to: '/stats', label: 'Stats' },
  ];

  return (
    <nav className="bg-[#08122a] border-b border-border sticky top-0 z-40 shadow-lg shadow-black/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <SluggerLogo className="w-10 h-10 rounded-lg" />
            <div className="flex flex-col leading-none">
              <span className="font-black text-lg tracking-tight text-white">Sluggers Hamly</span>
              <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: '#c9a535' }}>9U · Travel Ball</span>
            </div>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(link => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.exact}
                className={({ isActive }) =>
                  `px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 relative
                  ${isActive ? 'text-white' : 'text-muted hover:text-white hover:bg-surface'}`
                }
              >
                {({ isActive }) => (
                  <>
                    {link.label}
                    {isActive && (
                      <span className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full" style={{ backgroundColor: '#c9a535' }} />
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden text-muted hover:text-white p-2"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile nav */}
        {mobileOpen && (
          <div className="md:hidden pb-4 flex flex-col gap-1">
            {navLinks.map(link => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.exact}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `px-4 py-2.5 rounded-lg text-sm font-medium transition-all
                  ${isActive ? 'bg-surface text-white border-l-2' : 'text-muted hover:text-white hover:bg-surface'}`
                }
                style={({ isActive }) => isActive ? { borderLeftColor: '#c9a535' } : {}}
              >
                {link.label}
              </NavLink>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
}
