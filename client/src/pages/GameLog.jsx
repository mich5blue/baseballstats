import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTeam, useTeamPath } from '../context/TeamContext.jsx';
import { getGames, createGame } from '../api/client.js';
import SortableTable from '../components/SortableTable.jsx';
import GameForm from '../components/GameForm.jsx';

function formatDate(d) {
  if (!d) return '—';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getResult(game) {
  if (game.team_score === null || game.opponent_score === null) return '—';
  if (game.team_score > game.opponent_score) return 'W';
  if (game.team_score < game.opponent_score) return 'L';
  return 'T';
}

export default function GameLog() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { teamId, team } = useTeam();
  const tp = useTeamPath();
  const [showModal, setShowModal] = useState(false);

  const { data: games = [], isLoading: loading } = useQuery({
    queryKey: ['games', teamId],
    queryFn: () => getGames(teamId),
    enabled: !!teamId,
  });

  const handleCreate = async (data) => {
    await createGame({ ...data, team_id: teamId });
    queryClient.invalidateQueries({ queryKey: ['games', teamId] });
    setShowModal(false);
  };

  const columns = useMemo(() => [
    {
      header: 'Date', accessorKey: 'game_date',
      cell: i => <span className="text-muted text-sm">{formatDate(i.getValue())}</span>
    },
    {
      header: 'Team', accessorKey: 'team_name',
      cell: i => {
        const game = i.row.original;
        return (
          <span className="font-medium" style={{ color: game.team_color || '#e63946' }}>
            {i.getValue()}
          </span>
        );
      }
    },
    {
      header: 'Opponent', accessorKey: 'opponent',
      cell: i => <span className="font-medium text-white">{i.getValue()}</span>
    },
    {
      header: 'Location', accessorKey: 'location',
      cell: i => <span className="text-muted text-sm">{i.getValue() || '—'}</span>
    },
    {
      header: 'H/A', accessorKey: 'home_away',
      cell: i => <span className="capitalize text-muted text-xs">{i.getValue()}</span>
    },
    {
      header: 'Score',
      id: 'score',
      accessorFn: r => r.team_score !== null ? r.team_score : -999,
      cell: i => {
        const g = i.row.original;
        if (g.team_score === null) return <span className="text-muted">—</span>;
        return <span className="font-mono font-bold text-white">{g.team_score} – {g.opponent_score}</span>;
      }
    },
    {
      header: 'Result',
      id: 'result',
      accessorFn: r => getResult(r),
      cell: i => {
        const r = i.getValue();
        return (
          <span className={`font-bold text-sm ${r === 'W' ? 'text-emerald-400' : r === 'L' ? 'text-red-400' : r === 'T' ? 'text-yellow-400' : 'text-muted'}`}>
            {r}
          </span>
        );
      }
    }
  ], []);

  // Summary stats
  const wins = games.filter(g => getResult(g) === 'W').length;
  const losses = games.filter(g => getResult(g) === 'L').length;
  const ties = games.filter(g => getResult(g) === 'T').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-black text-white">Game Log</h1>
          <p className="text-muted text-sm mt-1">
            {games.length} game{games.length !== 1 ? 's' : ''}
            {wins > 0 || losses > 0 ? ` · ` : ''}
            {(wins > 0 || losses > 0) && (
              <>
                <span className="text-emerald-400">{wins}W</span>
                {' – '}
                <span className="text-red-400">{losses}L</span>
                {ties > 0 && <span className="text-yellow-400"> – {ties}T</span>}
              </>
            )}
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)}>+ Add Game</button>
      </div>


      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <SortableTable
          columns={columns}
          data={games}
          onRowClick={(game) => navigate(tp(`/games/${game.id}`))}
          defaultSortField="game_date"
          defaultSortDesc={true}
          emptyMessage="No games logged yet. Add your first game!"
        />
      )}

      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="card w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-5">Add Game</h2>
            <GameForm
              onSubmit={handleCreate}
              onCancel={() => setShowModal(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
