import React, { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useTeam } from '../context/TeamContext.jsx';

export default function Navbar({ rootMode = false }) {
  const teamCtx = useTeam();
  const slug = teamCtx?.slug;
  const team = teamCtx?.team;
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  const teamColor = team?.color || '#c9a535';

  // Nav links — prefixed with slug when inside a team
  const navLinks = slug ? [
    { to: `/${slug}/dashboard`, label: 'Home' },
    { to: `/${slug}/roster`,    label: 'Roster' },
    { to: `/${slug}/games`,     label: 'Games' },
    { to: `/${slug}/stats`,     label: 'Stats' },
  ] : [];

  return (
    <nav className="bg-[#08122a] border-b border-border sticky top-0 z-40 shadow-lg shadow-black/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo / team name */}
          <div className="flex items-center gap-3">
            {slug && (
              <Link to="/" className="text-muted hover:text-white text-sm mr-1 hidden sm:block transition-colors" title="All Teams">
                ←
              </Link>
            )}
            <Link to={slug ? `/${slug}/dashboard` : '/'} className="flex items-center gap-3 group">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm text-white"
                style={{ backgroundColor: teamColor }}>
                {team ? team.name.charAt(0).toUpperCase() : '⚾'}
              </div>
              <div className="flex flex-col leading-none">
                <span className="font-black text-base tracking-tight text-white">
                  {team ? team.name : 'Baseball Stats'}
                </span>
                {(team?.season || team?.league) && (
                  <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: teamColor }}>
                    {[team.season, team.league].filter(Boolean).join(' · ')}
                  </span>
                )}
              </div>
            </Link>
          </div>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(link => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 relative
                  ${isActive ? 'text-white' : 'text-muted hover:text-white hover:bg-surface'}`
                }
              >
                {({ isActive }) => (
                  <>
                    {link.label}
                    {isActive && (
                      <span className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full"
                        style={{ backgroundColor: teamColor }} />
                    )}
                  </>
                )}
              </NavLink>
            ))}
            {slug && (
              <Link to={`/${slug}/admin`}
                className="ml-2 px-3 py-1.5 rounded-lg text-xs font-medium text-muted hover:text-white hover:bg-surface transition-all">
                Import
              </Link>
            )}
            <Link to="/manage"
              className="ml-1 px-3 py-1.5 rounded-lg text-xs font-medium text-muted hover:text-white hover:bg-surface transition-all">
              ⚙
            </Link>
          </div>

          {/* Mobile menu button */}
          <button className="md:hidden text-muted hover:text-white p-2"
            onClick={() => setMobileOpen(!mobileOpen)}>
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
            {slug && (
              <Link to="/" onClick={() => setMobileOpen(false)}
                className="px-4 py-2.5 rounded-lg text-sm font-medium text-muted hover:text-white hover:bg-surface transition-all">
                ← All Teams
              </Link>
            )}
            {navLinks.map(link => (
              <NavLink key={link.to} to={link.to} onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `px-4 py-2.5 rounded-lg text-sm font-medium transition-all
                  ${isActive ? 'bg-surface text-white border-l-2' : 'text-muted hover:text-white hover:bg-surface'}`
                }
                style={({ isActive }) => isActive ? { borderLeftColor: teamColor } : {}}>
                {link.label}
              </NavLink>
            ))}
            {slug && (
              <Link to={`/${slug}/admin`} onClick={() => setMobileOpen(false)}
                className="px-4 py-2.5 rounded-lg text-sm font-medium text-muted hover:text-white hover:bg-surface transition-all">
                Import
              </Link>
            )}
            <Link to="/manage" onClick={() => setMobileOpen(false)}
              className="px-4 py-2.5 rounded-lg text-sm font-medium text-muted hover:text-white hover:bg-surface transition-all">
              ⚙ Manage Teams
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}
