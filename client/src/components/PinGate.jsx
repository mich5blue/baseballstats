import React, { useState } from 'react';
import { useTeam } from '../context/TeamContext.jsx';
import { verifyTeamPin } from '../api/client.js';

const STORAGE_KEY = (slug) => `pin_verified_${slug}`;

function isVerified(slug) {
  try { return localStorage.getItem(STORAGE_KEY(slug)) === 'true'; } catch { return false; }
}

function setVerified(slug) {
  try { localStorage.setItem(STORAGE_KEY(slug), 'true'); } catch { /* ignore */ }
}

export default function PinGate({ children }) {
  const { team, slug, isLoading } = useTeam();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);
  const [verified, setVerifiedState] = useState(() => isVerified(slug));

  // No PIN set on team → open access
  if (isLoading || !team?.has_pin || verified) return children;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setChecking(true);
    try {
      const { valid } = await verifyTeamPin(slug, pin);
      if (valid) {
        setVerified(slug);
        setVerifiedState(true);
      } else {
        setError('Incorrect PIN. Try again.');
        setPin('');
      }
    } catch {
      setError('Something went wrong. Try again.');
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="min-h-screen bg-field flex items-center justify-center px-4">
      <div className="card w-full max-w-sm p-8 text-center">
        <div className="text-4xl mb-4">🔒</div>
        <h2 className="text-xl font-black text-white mb-1">{team.name}</h2>
        <p className="text-muted text-sm mb-6">Enter the team PIN to continue</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            inputMode="numeric"
            value={pin}
            onChange={e => setPin(e.target.value)}
            className="input-field text-center text-xl tracking-widest"
            placeholder="••••"
            autoFocus
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button type="submit" disabled={!pin || checking} className="btn-primary w-full">
            {checking ? 'Checking…' : 'Enter'}
          </button>
        </form>
      </div>
    </div>
  );
}
