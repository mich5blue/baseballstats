import React, { useState, useEffect, useRef } from 'react';
import api from '../api/client.js';

/**
 * Polls /api/health and shows a sticky banner when the service is down.
 * Auto-dismisses and reloads when connectivity is restored.
 */
export default function ServiceBanner() {
  const [status, setStatus] = useState('ok'); // 'ok' | 'degraded' | 'down'
  const [since, setSince] = useState(null);
  const failCount = useRef(0);
  const intervalRef = useRef(null);

  const check = async () => {
    try {
      const res = await api.get('/health', { timeout: 6000 });
      if (res.data?.status === 'ok') {
        if (failCount.current > 0) {
          // Was down, now back — reload so stale data refreshes
          window.location.reload();
        }
        failCount.current = 0;
        setStatus('ok');
        setSince(null);
      } else {
        throw new Error('non-ok');
      }
    } catch {
      failCount.current += 1;
      if (failCount.current === 2) {
        setStatus('degraded');
        setSince(new Date());
      } else if (failCount.current >= 4) {
        setStatus('down');
      }
    }
  };

  useEffect(() => {
    // First check after 8s so it doesn't fire on initial load jitter
    const initial = setTimeout(() => {
      check();
      intervalRef.current = setInterval(check, 30_000);
    }, 8000);

    return () => {
      clearTimeout(initial);
      clearInterval(intervalRef.current);
    };
  }, []);

  if (status === 'ok') return null;

  const minutes = since
    ? Math.max(1, Math.round((Date.now() - since.getTime()) / 60_000))
    : null;

  return (
    <div className={`fixed bottom-0 left-0 right-0 z-50 px-4 py-3 flex items-center justify-center gap-3 text-sm font-medium shadow-lg
      ${status === 'degraded'
        ? 'bg-yellow-900/95 border-t border-yellow-700 text-yellow-200'
        : 'bg-red-950/95 border-t border-red-800 text-red-200'
      }`}>

      {/* Pulsing dot */}
      <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75
          ${status === 'degraded' ? 'bg-yellow-400' : 'bg-red-400'}`} />
        <span className={`relative inline-flex rounded-full h-2.5 w-2.5
          ${status === 'degraded' ? 'bg-yellow-400' : 'bg-red-400'}`} />
      </span>

      <span>
        {status === 'degraded'
          ? 'Stats service is responding slowly — data may be delayed.'
          : `Stats service is unavailable${minutes ? ` · down ~${minutes}m` : ''}. Scores and stats cannot load right now.`
        }
      </span>

      <button
        onClick={check}
        className={`ml-2 px-2.5 py-1 rounded text-xs font-semibold border transition-colors
          ${status === 'degraded'
            ? 'border-yellow-600 hover:bg-yellow-800'
            : 'border-red-700 hover:bg-red-900'
          }`}>
        Retry
      </button>
    </div>
  );
}
