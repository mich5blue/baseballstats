import React, { useEffect, useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  getTeam, getTeamRoster, getGames, getTeamStats, getPlayers,
  addPlayerToTeam, removePlayerFromTeam, createGame, updateGame, deleteGame,
  createPlayer
} from '../api/client.js';
import SortableTable from '../components/SortableTable.jsx';
import GameForm from '../components/GameForm.jsx';

function getResult(game) {
  if (game.team_score === null || game.opponent_score === null) return '—';
  if (game.team_score > game.opponent_score) return 'W';
  if (game.team_score < game.opponent_score) return 'L';
  return 'T';
}

function formatDate(d) {
  if (!d) return '—';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function AddPlayerModal({ teamId, onClose, onSuccess }) {
  const [allPlayers, setAllPlayers] = useState([]);
  const [tab, setTab] = useState('existing');
  const [selectedId, setSelectedId] = useState('');
  const [jersey, setJersey] = useState('');
  const [position, setPosition] = useState('');
  const [newPlayer, setNewPlayer] = useState({ name: '', position: '', bats: 'R', throws: 'R' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { getPlayers().then(setAllPlayers).catch(() => {}); }, []);

  const handleAddExisting = async (e) => {
    e.preventDefault();
    if (!selectedId) { setError('Select a player'); return; }
    setLoading(true);
    try {
      await addPlayerToTeam(selectedId, { team_id: teamId, jersey_number: jersey, position });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally { setLoading(false); }
  };

  const handleCreateNew = async (e) => {
    e.preventDefault();
    if (!newPlayer.name.trim()) { setError('Name is required'); return; }
    setLoading(true);
    try {
      const created = await createPlayer(newPlayer);
      await addPlayerToTeam(created.id, { team_id: teamId, jersey_number: jersey, position });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="card w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <h2 className="text-xl font-bold mb-4">Add Player to Team</h2>
        <div className="flex gap-2 mb-4 border-b border-border">
          {['existing', 'new'].map(t => (
            <button key={t} onClick={() => { setTab(t); setError(''); }}
              className={`pb-2 px-3 text-sm font-medium capitalize transition-colors ${tab === t ? 'tab-active' : 'tab-inactive'}`}>
              {t === 'existing' ? 'Existing Player' : 'New Player'}
            </button>
          ))}
        </div>
        {error && <div className="bg-red-900/40 border border-red-700 text-red-300 px-3 py-2 rounded text-sm mb-3">{error}</div>}

        {tab === 'existing' ? (
          <form onSubmit={handleAddExisting} className="space-y-3">
            <select value={selectedId} onChange={e => setSelectedId(e.target.value)} className="select-field" required>
              <option value="">Select player...</option>
              {allPlayers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-3">
              <input value={jersey} onChange={e => setJersey(e.target.value)} className="input-field" placeholder="Jersey #" />
              <input value={position} onChange={e => setPosition(e.target.value)} className="input-field" placeholder="Position" />
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={loading} className="btn-primary flex-1">{loading ? 'Adding...' : 'Add Player'}</button>
              <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleCreateNew} className="space-y-3">
            <input value={newPlayer.name} onChange={e => setNewPlayer(p => ({ ...p, name: e.target.value }))} className="input-field" placeholder="Player Name *" required />
            <input value={newPlayer.position} onChange={e => setNewPlayer(p => ({ ...p, position: e.target.value }))} className="input-field" placeholder="Position (SS, OF, P...)" />
            <div className="grid grid-cols-2 gap-3">
              <select value={newPlayer.bats} onChange={e => setNewPlayer(p => ({ ...p, bats: e.target.value }))} className="select-field">
                <option value="R">Bats Right</option>
                <option value="L">Bats Left</option>
                <option value="S">Switch</option>
              </select>
              <select value={newPlayer.throws} onChange={e => setNewPlayer(p => ({ ...p, throws: e.target.value }))} className="select-field">
                <option value="R">Throws Right</option>
                <option value="L">Throws Left</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input value={jersey} onChange={e => setJersey(e.target.value)} className="input-field" placeholder="Jersey #" />
              <input value={position} onChange={e => setPosition(e.target.value)} className="input-field" placeholder="Team Position" />
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={loading} className="btn-primary flex-1">{loading ? 'Creating...' : 'Create & Add'}</button>
              <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default function TeamDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [team, setTeam] = useState(null);
  const [roster, setRoster] = useState([]);
  const [games, setGames] = useState([]);
  const [stats, setStats] = useState({ batting: [], pitching: [] });
  const [tab, setTab] = useState('roster');
  const [gameModal, setGameModal] = useState(null);
  const [playerModal, setPlayerModal] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = () => {
    Promise.all([
      getTeam(id),
      getTeamRoster(id),
      getGames(id),
      getTeamStats(id)
    ]).then(([t, r, g, s]) => {
      setTeam(t); setRoster(r); setGames(g); setStats(s);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, [id]);

  const battingCols = useMemo(() => [
    { header: 'Player', accessorKey: 'player_name', cell: i => <Link to={`/players/${i.row.original.player_id}`} className="text-white hover:text-accent font-medium">{i.getValue()}</Link> },
    { header: 'POS', accessorKey: 'position', cell: i => <span className="text-muted">{i.getValue() || '—'}</span> },
    { header: 'G', accessorKey: 'games' },
    { header: 'AB', accessorKey: 'ab' },
    { header: 'H', accessorKey: 'hits' },
    { header: '2B', accessorKey: 'doubles' },
    { header: '3B', accessorKey: 'triples' },
    { header: 'HR', accessorKey: 'home_runs', cell: i => <span className={i.getValue() > 0 ? 'text-accent font-bold' : ''}>{i.getValue()}</span> },
    { header: 'RBI', accessorKey: 'rbi', cell: i => <span className={i.getValue() > 0 ? 'text-gold' : ''}>{i.getValue()}</span> },
    { header: 'R', accessorKey: 'runs' },
    { header: 'BB', accessorKey: 'walks' },
    { header: 'K', accessorKey: 'strikeouts' },
    { header: 'SB', accessorKey: 'stolen_bases' },
    { header: 'AVG', accessorKey: 'avg', cell: i => <span className="font-mono font-bold text-accent">{i.getValue()}</span> },
    { header: 'OBP', accessorKey: 'obp', cell: i => <span className="font-mono">{i.getValue()}</span> },
    { header: 'SLG', accessorKey: 'slg', cell: i => <span className="font-mono">{i.getValue()}</span> },
    { header: 'OPS', accessorKey: 'ops', cell: i => <span className="font-mono font-bold">{i.getValue()}</span> },
  ], []);

  const pitchingCols = useMemo(() => [
    { header: 'Player', accessorKey: 'player_name', cell: i => <Link to={`/players/${i.row.original.player_id}`} className="text-white hover:text-accent font-medium">{i.getValue()}</Link> },
    { header: 'G', accessorKey: 'games' },
    { header: 'W', accessorKey: 'wins', cell: i => <span className="text-emerald-400 font-bold">{i.getValue()}</span> },
    { header: 'L', accessorKey: 'losses', cell: i => <span className="text-red-400">{i.getValue()}</span> },
    { header: 'SV', accessorKey: 'saves' },
    { header: 'IP', accessorKey: 'innings_pitched', cell: i => <span className="font-mono">{(i.getValue() || 0).toFixed(1)}</span> },
    { header: 'H', accessorKey: 'hits_allowed' },
    { header: 'R', accessorKey: 'runs_allowed' },
    { header: 'ER', accessorKey: 'earned_runs' },
    { header: 'BB', accessorKey: 'walks' },
    { header: 'K', accessorKey: 'strikeouts', cell: i => <span className="text-gold font-bold">{i.getValue()}</span> },
    { header: 'HR', accessorKey: 'home_runs_allowed' },
    { header: 'P', accessorKey: 'pitches', cell: i => <span className="text-muted">{i.getValue() || 0}</span> },
    {
      header: 'B', id: 'balls',
      accessorFn: r => (r.pitches || 0) - (r.strikes || 0),
      cell: i => <span className="text-muted">{i.getValue()}</span>
    },
    { header: 'S', accessorKey: 'strikes', cell: i => <span className="text-white">{i.getValue() || 0}</span> },
    {
      header: 'S%', id: 'strike_pct',
      accessorFn: r => r.pitches > 0 ? Math.round((r.strikes || 0) / r.pitches * 100) : null,
      cell: i => {
        const v = i.getValue();
        return <span className={`font-mono ${v !== null && v >= 60 ? 'text-emerald-400' : v !== null && v < 50 ? 'text-red-400' : 'text-white'}`}>
          {v !== null ? v + '%' : '—'}
        </span>;
      }
    },
    { header: 'ERA', accessorKey: 'era', cell: i => <span className="font-mono font-bold text-accent">{i.getValue()}</span> },
    { header: 'WHIP', accessorKey: 'whip', cell: i => <span className="font-mono">{i.getValue()}</span> },
  ], []);

  const gameCols = useMemo(() => [
    { header: 'Date', accessorKey: 'game_date', cell: i => formatDate(i.getValue()) },
    { header: 'Opponent', accessorKey: 'opponent', cell: i => <span className="font-medium text-white">{i.getValue()}</span> },
    { header: 'Location', accessorKey: 'location', cell: i => <span className="text-muted">{i.getValue() || '—'}</span> },
    { header: 'H/A', accessorKey: 'home_away', cell: i => <span className="capitalize text-muted text-xs">{i.getValue()}</span> },
    { header: 'Score', id: 'score', accessorFn: r => r.team_score !== null ? r.team_score - r.opponent_score : -999,
      cell: i => {
        const g = i.row.original;
        if (g.team_score === null) return <span className="text-muted">—</span>;
        return <span className="font-mono font-bold">{g.team_score} – {g.opponent_score}</span>;
      }
    },
    { header: 'Result', id: 'result', accessorFn: r => getResult(r),
      cell: i => {
        const r = i.getValue();
        return <span className={`font-bold ${r === 'W' ? 'text-emerald-400' : r === 'L' ? 'text-red-400' : 'text-muted'}`}>{r}</span>;
      }
    },
    { header: '', id: 'actions',
      cell: i => (
        <div className="flex gap-1" onClick={e => e.stopPropagation()}>
          <button className="p-1 text-muted hover:text-white" onClick={() => setGameModal(i.row.original)}>✏️</button>
          <button className="p-1 text-muted hover:text-red-400" onClick={async () => {
            if (!confirm('Delete this game?')) return;
            await deleteGame(i.row.original.id);
            loadData();
          }}>🗑️</button>
        </div>
      )
    }
  ], []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!team) return (
    <div className="max-w-7xl mx-auto px-4 py-12 text-center">
      <p className="text-muted text-lg">Team not found.</p>
      <Link to="/teams" className="text-accent hover:underline mt-2 inline-block">← Back to Teams</Link>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <Link to="/teams" className="text-muted text-sm hover:text-white mb-2 inline-block">← Teams</Link>
          <div className="flex items-center gap-3">
            <div className="w-4 h-8 rounded" style={{ backgroundColor: team.color }} />
            <h1 className="text-4xl font-black text-white">{team.name}</h1>
          </div>
          <div className="flex items-center gap-3 mt-2 text-sm text-muted">
            {team.season && <span>{team.season}</span>}
            {team.league && <><span>·</span><span>{team.league}</span></>}
            <span>·</span>
            <span className="text-emerald-400 font-semibold">{team.wins || 0}W</span>
            <span>–</span>
            <span className="text-red-400 font-semibold">{team.losses || 0}L</span>
            {team.ties > 0 && <><span>–</span><span className="text-muted">{team.ties}T</span></>}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border mb-6 gap-6">
        {['roster', 'games', 'stats'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`pb-3 text-sm font-medium capitalize ${tab === t ? 'tab-active' : 'tab-inactive'}`}>
            {t} {t === 'roster' ? `(${roster.length})` : t === 'games' ? `(${games.length})` : ''}
          </button>
        ))}
      </div>

      {/* ROSTER TAB */}
      {tab === 'roster' && (
        <div>
          <div className="flex justify-end mb-4">
            <button className="btn-primary" onClick={() => setPlayerModal(true)}>+ Add Player</button>
          </div>
          {roster.length === 0 ? (
            <div className="card p-10 text-center">
              <p className="text-muted mb-4">No players on this team yet.</p>
              <button className="btn-primary" onClick={() => setPlayerModal(true)}>Add First Player</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {roster.map(player => (
                <div key={player.id} className="card p-4 flex items-center justify-between hover:border-accent/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-surface2 flex items-center justify-center font-bold text-accent">
                      {player.jersey_number || '—'}
                    </div>
                    <div>
                      <Link to={`/players/${player.id}`} className="font-semibold text-white hover:text-accent transition-colors">
                        {player.name}
                      </Link>
                      <div className="text-muted text-xs">{player.team_position || player.position || 'No position'}</div>
                    </div>
                  </div>
                  <button
                    className="text-muted hover:text-red-400 p-1 transition-colors"
                    title="Remove from team"
                    onClick={async () => {
                      if (!confirm(`Remove ${player.name} from this team?`)) return;
                      await removePlayerFromTeam(player.id, id);
                      loadData();
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* GAMES TAB */}
      {tab === 'games' && (
        <div>
          <div className="flex justify-end mb-4">
            <button className="btn-primary" onClick={() => setGameModal('add')}>+ Add Game</button>
          </div>
          <SortableTable
            columns={gameCols}
            data={games}
            onRowClick={(game) => navigate(`/games/${game.id}`)}
            defaultSortField="game_date"
            defaultSortDesc={true}
            emptyMessage="No games logged yet."
          />
        </div>
      )}

      {/* STATS TAB */}
      {tab === 'stats' && (
        <div className="space-y-8">
          <div>
            <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <span className="text-accent">🏏</span> Batting Stats
            </h3>
            <SortableTable
              columns={battingCols}
              data={stats.batting}
              defaultSortField="avg"
              defaultSortDesc={true}
              emptyMessage="No batting stats recorded."
            />
          </div>
          {stats.pitching.length > 0 && (
            <div>
              <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                <span className="text-gold">⚾</span> Pitching Stats
              </h3>
              <SortableTable
                columns={pitchingCols}
                data={stats.pitching}
                defaultSortField="era"
                emptyMessage="No pitching stats recorded."
              />
            </div>
          )}
        </div>
      )}

      {/* Game Modal */}
      {gameModal && (
        <div className="modal-backdrop" onClick={() => setGameModal(null)}>
          <div className="card w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-5">{gameModal === 'add' ? 'Add Game' : 'Edit Game'}</h2>
            <GameForm
              initial={gameModal !== 'add' ? gameModal : undefined}
              teamId={id}
              onSubmit={async (data) => {
                if (gameModal === 'add') await createGame({ ...data, team_id: parseInt(id) });
                else await updateGame(gameModal.id, data);
                loadData();
                setGameModal(null);
              }}
              onCancel={() => setGameModal(null)}
            />
          </div>
        </div>
      )}

      {/* Add Player Modal */}
      {playerModal && (
        <AddPlayerModal
          teamId={id}
          onClose={() => setPlayerModal(false)}
          onSuccess={loadData}
        />
      )}
    </div>
  );
}
