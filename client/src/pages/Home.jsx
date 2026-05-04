import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getTeams } from '../api/client.js';

function WinLossBadge({ wins, losses }) {
  return (
    <div className="flex items-center gap-2 font-mono font-bold text-lg">
      <span className="text-emerald-400">{wins}W</span>
      <span className="text-muted">–</span>
      <span className="text-red-400">{losses}L</span>
    </div>
  );
}

export default function Home() {
  const { data: teams = [], isLoading } = useQuery({ queryKey: ['teams'], queryFn: getTeams });

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 border-2 border-accent border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-black text-white mb-2">Baseball Stats</h1>
        <p className="text-muted">Select a team to view stats</p>
      </div>

      {teams.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-muted mb-4">No teams yet.</p>
          <Link to="/manage" className="btn-primary">Set Up Your First Team →</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {teams.map(team => (
            <Link
              key={team.id}
              to={team.slug ? `/${team.slug}/dashboard` : '#'}
              className="card p-6 hover:border-accent/40 transition-all group relative overflow-hidden"
            >
              {/* Color accent bar */}
              <div className="absolute top-0 left-0 right-0 h-1 rounded-t" style={{ backgroundColor: team.color }} />

              <div className="pt-2">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h2 className="text-lg font-black text-white group-hover:text-accent transition-colors leading-tight">
                      {team.name}
                    </h2>
                    {(team.season || team.league) && (
                      <p className="text-muted text-xs mt-0.5">
                        {[team.season, team.league].filter(Boolean).join(' · ')}
                      </p>
                    )}
                  </div>
                  {!!team.has_pin && (
                    <span className="text-muted text-xs bg-surface2 px-2 py-0.5 rounded">PIN</span>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <WinLossBadge wins={team.wins || 0} losses={team.losses || 0} />
                  <span className="text-muted text-xs">{team.player_count} players</span>
                </div>

                {!team.slug && (
                  <p className="text-yellow-500 text-xs mt-2">⚠ No URL set — <Link to="/manage" className="underline">fix in Manage</Link></p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

    </div>
  );
}
