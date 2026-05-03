import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getTeams, createTeam, updateTeam, deleteTeam } from '../api/client.js';

function TeamModal({ initial, onSubmit, onClose }) {
  const [form, setForm] = useState({
    name: '', season: '', league: '', color: '#e63946', ...initial
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Team name is required'); return; }
    setLoading(true);
    setError('');
    try {
      await onSubmit(form);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to save team');
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="card w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <h2 className="text-xl font-bold mb-5">{initial?.id ? 'Edit Team' : 'Add Team'}</h2>
        {error && <div className="bg-red-900/40 border border-red-700 text-red-300 px-4 py-2 rounded-lg text-sm mb-4">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-muted uppercase tracking-wider mb-1">Team Name *</label>
            <input name="name" value={form.name} onChange={handleChange} className="input-field" placeholder="e.g. River City Rockets" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-muted uppercase tracking-wider mb-1">Season</label>
              <input name="season" value={form.season} onChange={handleChange} className="input-field" placeholder="e.g. 2024" />
            </div>
            <div>
              <label className="block text-xs text-muted uppercase tracking-wider mb-1">League</label>
              <input name="league" value={form.league} onChange={handleChange} className="input-field" placeholder="e.g. Little League" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-muted uppercase tracking-wider mb-1">Team Color</label>
            <div className="flex gap-3 items-center">
              <input type="color" name="color" value={form.color} onChange={handleChange} className="w-10 h-10 rounded cursor-pointer bg-transparent border-0" />
              <input name="color" value={form.color} onChange={handleChange} className="input-field flex-1" placeholder="#e63946" />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? 'Saving...' : (initial?.id ? 'Update Team' : 'Create Team')}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Teams() {
  const queryClient = useQueryClient();
  const [modal, setModal] = useState(null); // null | 'add' | team object

  const { data: teams = [], isLoading: loading } = useQuery({ queryKey: ['teams'], queryFn: getTeams });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['teams'] });

  const handleCreate = async (data) => {
    await createTeam(data);
    invalidate();
  };

  const handleUpdate = async (data) => {
    await updateTeam(modal.id, data);
    invalidate();
  };

  const handleDelete = async (team, e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`Delete "${team.name}"? This will also delete all games and stats for this team.`)) return;
    await deleteTeam(team.id);
    invalidate();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-black text-white">Teams</h1>
          <p className="text-muted text-sm mt-1">{teams.length} team{teams.length !== 1 ? 's' : ''} total</p>
        </div>
        <button className="btn-primary" onClick={() => setModal('add')}>+ Add Team</button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : teams.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-6xl mb-4">🏟️</div>
          <p className="text-white font-semibold text-lg mb-2">No teams yet</p>
          <p className="text-muted mb-6">Create your first team to get started tracking stats.</p>
          <button className="btn-primary" onClick={() => setModal('add')}>Create First Team</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {teams.map(team => (
            <Link
              key={team.id}
              to={`/teams/${team.id}`}
              className="card p-5 hover:border-accent/30 transition-all group relative overflow-hidden"
            >
              {/* Color accent bar */}
              <div
                className="absolute top-0 left-0 right-0 h-1"
                style={{ backgroundColor: team.color || '#e63946' }}
              />

              <div className="flex items-start justify-between mt-1">
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-lg text-white group-hover:text-accent transition-colors truncate">
                    {team.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {team.season && (
                      <span className="badge bg-surface2 text-muted">{team.season}</span>
                    )}
                    {team.league && (
                      <span className="badge bg-surface2 text-muted">{team.league}</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-1 ml-2">
                  <button
                    className="p-1.5 text-muted hover:text-white rounded transition-colors"
                    onClick={e => { e.preventDefault(); e.stopPropagation(); setModal(team); }}
                    title="Edit"
                  >
                    ✏️
                  </button>
                  <button
                    className="p-1.5 text-muted hover:text-red-400 rounded transition-colors"
                    onClick={e => handleDelete(team, e)}
                    title="Delete"
                  >
                    🗑️
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 mt-4">
                <div className="text-center">
                  <div className="font-mono font-bold text-xl text-white">{team.player_count || 0}</div>
                  <div className="text-muted text-xs">Players</div>
                </div>
                <div className="text-center">
                  <div className="font-mono font-bold text-xl text-emerald-400">{team.wins || 0}</div>
                  <div className="text-muted text-xs">Wins</div>
                </div>
                <div className="text-center">
                  <div className="font-mono font-bold text-xl text-red-400">{team.losses || 0}</div>
                  <div className="text-muted text-xs">Losses</div>
                </div>
              </div>

              {(team.wins !== null || team.losses !== null) && (
                <div className="mt-3 pt-3 border-t border-border">
                  <div className="text-muted text-sm text-center">
                    Record: <span className="text-white font-semibold">{team.wins || 0}–{team.losses || 0}{team.ties > 0 ? `–${team.ties}` : ''}</span>
                  </div>
                </div>
              )}
            </Link>
          ))}
        </div>
      )}

      {modal && (
        <TeamModal
          initial={modal === 'add' ? undefined : modal}
          onSubmit={modal === 'add' ? handleCreate : handleUpdate}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
