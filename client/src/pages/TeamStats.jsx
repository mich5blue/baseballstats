import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { getTeams, getTeamStats } from '../api/client.js';
import SortableTable from '../components/SortableTable.jsx';

export default function TeamStats() {
  const [stats, setStats] = useState({ batting: [], pitching: [] });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('batting');

  useEffect(() => {
    getTeams().then(teams => {
      if (teams.length > 0) {
        return getTeamStats(teams[0].id);
      }
      return { batting: [], pitching: [] };
    }).then(s => {
      setStats(s);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const battingCols = useMemo(() => [
    { header: 'Player', accessorKey: 'player_name',
      cell: i => <Link to={`/players/${i.row.original.player_id}`} className="text-white hover:text-accent font-semibold">{i.getValue()}</Link> },
    { header: 'G', accessorKey: 'games' },
    { header: 'AB', accessorKey: 'ab' },
    { header: 'H', accessorKey: 'hits' },
    { header: '1B', accessorKey: 'singles' },
    { header: '2B', accessorKey: 'doubles' },
    { header: '3B', accessorKey: 'triples' },
    { header: 'HR', accessorKey: 'home_runs', cell: i => <span className={i.getValue() > 0 ? 'text-accent font-bold' : ''}>{i.getValue()}</span> },
    { header: 'RBI', accessorKey: 'rbi', cell: i => <span className={i.getValue() > 0 ? 'text-gold' : ''}>{i.getValue()}</span> },
    { header: 'R', accessorKey: 'runs' },
    { header: 'BB', accessorKey: 'walks' },
    { header: 'K', accessorKey: 'strikeouts' },
    { header: 'SB', accessorKey: 'stolen_bases' },
    { header: 'HBP', accessorKey: 'hit_by_pitch' },
    { header: 'AVG', accessorKey: 'avg', cell: i => <span className="font-mono font-bold text-accent">{i.getValue()}</span> },
    { header: 'OBP', accessorKey: 'obp', cell: i => <span className="font-mono">{i.getValue()}</span> },
    { header: 'SLG', accessorKey: 'slg', cell: i => <span className="font-mono">{i.getValue()}</span> },
    { header: 'OPS', accessorKey: 'ops', cell: i => <span className="font-mono font-bold text-gold">{i.getValue()}</span> },
  ], []);

  const pitchingCols = useMemo(() => [
    { header: 'Player', accessorKey: 'player_name',
      cell: i => <Link to={`/players/${i.row.original.player_id}`} className="text-white hover:text-accent font-semibold">{i.getValue()}</Link> },
    { header: 'G', accessorKey: 'games' },
    { header: 'W', accessorKey: 'wins', cell: i => <span className="text-emerald-400 font-bold">{i.getValue()}</span> },
    { header: 'L', accessorKey: 'losses', cell: i => <span className="text-red-400">{i.getValue()}</span> },
    { header: 'SV', accessorKey: 'saves' },
    { header: 'IP', accessorKey: 'innings_pitched', cell: i => <span className="font-mono">{(i.getValue() || 0).toFixed(1)}</span> },
    { header: 'H', accessorKey: 'hits_allowed' },
    { header: 'ER', accessorKey: 'earned_runs' },
    { header: 'BB', accessorKey: 'walks' },
    { header: 'K', accessorKey: 'strikeouts', cell: i => <span className="text-gold font-bold">{i.getValue()}</span> },
    { header: 'P', accessorKey: 'pitches', cell: i => <span className="text-muted">{i.getValue() || 0}</span> },
    { header: 'B', id: 'balls', accessorFn: r => (r.pitches || 0) - (r.strikes || 0), cell: i => <span className="text-muted">{i.getValue()}</span> },
    { header: 'S', accessorKey: 'strikes', cell: i => <span className="text-white">{i.getValue() || 0}</span> },
    { header: 'S%', id: 'spct', accessorFn: r => r.pitches > 0 ? Math.round((r.strikes || 0) / r.pitches * 100) : null,
      cell: i => { const v = i.getValue(); return <span className={`font-mono ${v >= 60 ? 'text-emerald-400' : v < 50 ? 'text-red-400' : 'text-white'}`}>{v !== null ? v + '%' : '—'}</span>; }
    },
    { header: 'ERA', accessorKey: 'era', cell: i => <span className="font-mono font-bold text-accent">{i.getValue()}</span> },
    { header: 'WHIP', accessorKey: 'whip', cell: i => <span className="font-mono">{i.getValue()}</span> },
  ], []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-black text-white">Team Stats</h1>
        <p className="text-muted text-sm mt-0.5">Sluggers Hamly 9U · 2026 Travel Ball</p>
      </div>

      <div className="flex border-b border-border mb-6 gap-6">
        {['batting', 'pitching'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`pb-3 text-sm font-medium capitalize ${tab === t ? 'tab-active' : 'tab-inactive'}`}>
            {t === 'batting' ? '⚾ Batting' : '💪 Pitching'}
          </button>
        ))}
      </div>

      {tab === 'batting' && (
        <SortableTable
          columns={battingCols}
          data={stats.batting}
          defaultSortField="avg"
          defaultSortDesc={true}
          emptyMessage="No batting stats recorded yet."
        />
      )}

      {tab === 'pitching' && (
        <SortableTable
          columns={pitchingCols}
          data={stats.pitching}
          defaultSortField="era"
          emptyMessage="No pitching stats recorded yet."
        />
      )}
    </div>
  );
}
