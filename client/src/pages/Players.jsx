import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getPlayers, createPlayer, deletePlayer } from '../api/client.js';
import { IcoSearch, IcoUser, IcoTrash, IcoStar } from '../components/Icons.jsx';

function PlayerModal({ onSubmit, onClose }) {
  const [form, setForm] = useState({ name: '', nickname: '', position: '', bats: 'R', throws: 'R', is_featured: false, notes: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Player name is required'); return; }
    setLoading(true);
    setError('');
    try {
      await onSubmit(form);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to create player');
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="card w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <h2 className="text-xl font-bold mb-5">Add Player</h2>
        {error && <div className="bg-red-900/40 border border-red-700 text-red-300 px-4 py-2 rounded-lg text-sm mb-4">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-muted uppercase tracking-wider mb-1">Name *</label>
            <input name="name" value={form.name} onChange={handleChange} className="input-field" placeholder="Player full name" required />
          </div>
          <div>
            <label className="block text-xs text-muted uppercase tracking-wider mb-1">Nickname</label>
            <input name="nickname" value={form.nickname} onChange={handleChange} className="input-field" placeholder="e.g. The Kid" />
          </div>
          <div>
            <label className="block text-xs text-muted uppercase tracking-wider mb-1">Position</label>
            <input name="position" value={form.position} onChange={handleChange} className="input-field" placeholder="e.g. SS, P, OF, C" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-muted uppercase tracking-wider mb-1">Bats</label>
              <select name="bats" value={form.bats} onChange={handleChange} className="select-field">
                <option value="R">Right</option>
                <option value="L">Left</option>
                <option value="S">Switch</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-muted uppercase tracking-wider mb-1">Throws</label>
              <select name="throws" value={form.throws} onChange={handleChange} className="select-field">
                <option value="R">Right</option>
                <option value="L">Left</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs text-muted uppercase tracking-wider mb-1">Notes</label>
            <textarea name="notes" value={form.notes} onChange={handleChange} className="input-field" rows={2} placeholder="Any notes..." />
          </div>
          <label className="flex items-center gap-3 cursor-pointer bg-surface2 rounded-lg px-4 py-3">
            <input type="checkbox" name="is_featured" checked={form.is_featured} onChange={handleChange} className="w-4 h-4 accent-accent" />
            <div>
              <div className="text-white text-sm font-medium flex items-center gap-1.5"><IcoStar filled className="w-4 h-4 text-gold" /> Featured Player</div>
              <div className="text-muted text-xs">Show this player's stats on the dashboard</div>
            </div>
          </label>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? 'Creating...' : 'Create Player'}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Players() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);

  const { data: players = [], isLoading: loading } = useQuery({ queryKey: ['players'], queryFn: getPlayers });

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return players.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.nickname || '').toLowerCase().includes(q) ||
      (p.position || '').toLowerCase().includes(q) ||
      p.teams.some(t => t.name.toLowerCase().includes(q))
    );
  }, [search, players]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['players'] });

  const handleCreate = async (data) => {
    await createPlayer(data);
    invalidate();
  };

  const handleDelete = async (player, e) => {
    e.preventDefault();
    if (!confirm(`Delete "${player.name}"? This will also delete all their stats.`)) return;
    await deletePlayer(player.id);
    invalidate();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-black text-white">Players</h1>
          <p className="text-muted text-sm mt-1">{players.length} player{players.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)}>+ Add Player</button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"><IcoSearch className="w-4 h-4" /></span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-field pl-10"
            placeholder="Search players by name, position, or team..."
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="flex justify-center mb-4 text-muted"><IcoUser className="w-16 h-16" /></div>
          {search ? (
            <p className="text-muted">No players match "{search}"</p>
          ) : (
            <>
              <p className="text-white font-semibold text-lg mb-2">No players yet</p>
              <p className="text-muted mb-6">Add your first player to start tracking stats.</p>
              <button className="btn-primary" onClick={() => setShowModal(true)}>Add First Player</button>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(player => (
            <Link
              key={player.id}
              to={`/players/${player.id}`}
              className="card p-5 hover:border-accent/30 transition-all group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-white group-hover:text-accent transition-colors truncate">
                      {player.name}
                    </h3>
                    {player.is_featured === 1 && <IcoStar filled className="w-3.5 h-3.5 text-gold flex-shrink-0" />}
                  </div>
                  {player.nickname && (
                    <p className="text-muted text-xs">"{player.nickname}"</p>
                  )}
                </div>
                <button
                  className="p-1 text-muted hover:text-red-400 transition-colors ml-2 flex-shrink-0"
                  onClick={e => handleDelete(player, e)}
                  title="Delete player"
                >
                  <IcoTrash className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-2 mb-3">
                <span className="text-muted text-xs">B:{player.bats} T:{player.throws}</span>
              </div>

              {player.teams.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {player.teams.map(t => (
                    <span
                      key={t.id}
                      className="badge text-white text-xs"
                      style={{ backgroundColor: (t.color || '#e63946') + '33', border: `1px solid ${t.color || '#e63946'}40` }}
                    >
                      {t.name}
                    </span>
                  ))}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}

      {showModal && (
        <PlayerModal onSubmit={handleCreate} onClose={() => setShowModal(false)} />
      )}
    </div>
  );
}
