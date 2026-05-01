import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getPlayers, createPlayer, deletePlayer, getTeams, addPlayerToTeam } from '../api/client.js';

const POSITIONS = ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'OF', 'EH', 'DH'];

function AddPlayerModal({ onClose, onSuccess, teamId }) {
  const [form, setForm] = useState({ name: '', nickname: '', position: '', jersey_number: '', bats: 'R', throws: 'R', notes: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = e => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Name is required'); return; }
    setLoading(true);
    try {
      const player = await createPlayer(form);
      if (teamId) {
        await addPlayerToTeam(player.id, { team_id: teamId, jersey_number: form.jersey_number, position: form.position });
      }
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="card w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <h2 className="text-xl font-bold mb-5">Add Player to Roster</h2>
        {error && <div className="bg-red-900/40 border border-red-700 text-red-300 px-3 py-2 rounded text-sm mb-3">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs text-muted uppercase tracking-wider mb-1">Name *</label>
              <input name="name" value={form.name} onChange={handleChange} className="input-field" placeholder="Full name" required />
            </div>
            <div>
              <label className="block text-xs text-muted uppercase tracking-wider mb-1">Jersey #</label>
              <input name="jersey_number" value={form.jersey_number} onChange={handleChange} className="input-field text-center" placeholder="#" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-muted uppercase tracking-wider mb-1">Position</label>
              <select name="position" value={form.position} onChange={handleChange} className="select-field">
                <option value="">Select...</option>
                {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-muted uppercase tracking-wider mb-1">Nickname</label>
              <input name="nickname" value={form.nickname} onChange={handleChange} className="input-field" placeholder="e.g. The Kid" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-muted uppercase tracking-wider mb-1">Bats</label>
              <select name="bats" value={form.bats} onChange={handleChange} className="select-field">
                <option value="R">Right</option><option value="L">Left</option><option value="S">Switch</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-muted uppercase tracking-wider mb-1">Throws</label>
              <select name="throws" value={form.throws} onChange={handleChange} className="select-field">
                <option value="R">Right</option><option value="L">Left</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? 'Adding...' : 'Add to Roster'}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Roster() {
  const [players, setPlayers] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [teamId, setTeamId] = useState(null);

  const load = () => {
    setLoading(true);
    Promise.all([getPlayers(), getTeams()]).then(([pls, teams]) => {
      setPlayers(pls);
      setFiltered(pls);
      if (teams.length > 0) setTeamId(teams[0].id);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(players.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.nickname || '').toLowerCase().includes(q) ||
      (p.position || '').toLowerCase().includes(q)
    ));
  }, [search, players]);

  const handleDelete = async (player, e) => {
    e.preventDefault();
    if (!confirm(`Remove ${player.name} from roster? This deletes all their stats.`)) return;
    await deletePlayer(player.id);
    load();
  };

  const positionColor = (pos) => {
    if (!pos) return '#94a3b8';
    if (['P'].includes(pos)) return '#e63946';
    if (['C'].includes(pos)) return '#f4a261';
    if (['1B', '2B', '3B', 'SS'].includes(pos)) return '#60a5fa';
    return '#4ade80';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-black text-white">Roster</h1>
          <p className="text-muted text-sm mt-0.5">Sluggers - Hamly 9U · {players.length} players</p>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)}>+ Add Player</button>
      </div>

      <div className="mb-5 relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm">🔍</span>
        <input value={search} onChange={e => setSearch(e.target.value)}
          className="input-field pl-9" placeholder="Search by name or position..." />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          {search ? (
            <p className="text-muted">No players match "{search}"</p>
          ) : (
            <>
              <div className="text-5xl mb-4">👕</div>
              <p className="text-white font-semibold text-lg mb-2">Roster is empty</p>
              <p className="text-muted mb-5">Add players manually or import a box score.</p>
              <button className="btn-primary" onClick={() => setShowModal(true)}>Add First Player</button>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map(player => {
            const pColor = positionColor(player.position);
            const jersey = player.jersey_number ||
              player.teams?.find(t => t.jersey_number)?.jersey_number;
            return (
              <Link key={player.id} to={`/players/${player.id}`}
                className="card p-5 hover:border-accent/30 transition-all group flex flex-col">
                <div className="flex items-start gap-3 mb-3">
                  {/* Jersey badge */}
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 font-black text-lg border-2"
                    style={{ backgroundColor: pColor + '20', borderColor: pColor + '50', color: pColor }}>
                    {jersey || '#'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-white group-hover:text-accent transition-colors truncate">
                        {player.name}
                      </span>
                      {player.is_featured === 1 && <span className="text-gold text-sm flex-shrink-0">⭐</span>}
                    </div>
                    {player.nickname && <p className="text-muted text-xs truncate">"{player.nickname}"</p>}
                    <div className="flex items-center gap-2 mt-1">
                      {player.position && (
                        <span className="text-xs font-bold px-1.5 py-0.5 rounded"
                          style={{ backgroundColor: pColor + '25', color: pColor }}>
                          {player.position}
                        </span>
                      )}
                      <span className="text-muted text-xs">
                        B:{player.bats} T:{player.throws}
                      </span>
                    </div>
                  </div>
                  <button className="p-1 text-muted hover:text-red-400 transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100"
                    onClick={e => handleDelete(player, e)} title="Remove player">
                    🗑️
                  </button>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {showModal && (
        <AddPlayerModal
          teamId={teamId}
          onClose={() => setShowModal(false)}
          onSuccess={load}
        />
      )}
    </div>
  );
}
