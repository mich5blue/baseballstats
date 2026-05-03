import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getTeams, createTeam, updateTeam, deleteTeam } from '../api/client.js';

function makeSlug(name) {
  return name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').replace(/-+/g, '-');
}

const COLOR_PRESETS = ['#e63946','#f4a261','#2a9d8f','#457b9d','#6a4c93','#c9a535','#e76f51','#4ade80'];

function TeamForm({ initial = {}, onSubmit, onClose, title }) {
  const [form, setForm] = useState({
    name: initial.name || '',
    season: initial.season || '',
    league: initial.league || '',
    color: initial.color || '#e63946',
    slug: initial.slug || '',
    pin: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [clearPin, setClearPin] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleNameBlur = () => {
    if (!form.slug && form.name) set('slug', makeSlug(form.name));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Team name is required'); return; }
    if (!form.slug.trim()) { setError('Team URL is required'); return; }
    setLoading(true);
    setError('');
    try {
      const payload = { ...form };
      // If editing and PIN field left blank + not clearing → don't change it
      if (initial.id && !form.pin && !clearPin) delete payload.pin;
      if (clearPin) payload.pin = '';
      await onSubmit(payload);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="card w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
        <h2 className="text-xl font-bold mb-5">{title}</h2>
        {error && <div className="bg-red-900/40 border border-red-700 text-red-300 px-3 py-2 rounded text-sm mb-4">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-muted block mb-1">Team Name *</label>
            <input value={form.name} onChange={e => set('name', e.target.value)} onBlur={handleNameBlur}
              className="input-field" placeholder="Sluggers Hamly 9U" required />
          </div>
          <div>
            <label className="text-xs text-muted block mb-1">
              Team URL * <span className="text-muted font-normal">— short name used in the URL, e.g. /sluggers/dashboard</span>
            </label>
            <input value={form.slug} onChange={e => set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              className="input-field font-mono" placeholder="team-name" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted block mb-1">Season</label>
              <input value={form.season} onChange={e => set('season', e.target.value)}
                className="input-field" placeholder="2026" />
            </div>
            <div>
              <label className="text-xs text-muted block mb-1">League</label>
              <input value={form.league} onChange={e => set('league', e.target.value)}
                className="input-field" placeholder="Little League" />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted block mb-2">Team Color</label>
            <div className="flex items-center gap-2 flex-wrap">
              {COLOR_PRESETS.map(c => (
                <button key={c} type="button" onClick={() => set('color', c)}
                  className={`w-7 h-7 rounded-full border-2 transition-all ${form.color === c ? 'border-white scale-110' : 'border-transparent'}`}
                  style={{ backgroundColor: c }} />
              ))}
              <input type="color" value={form.color} onChange={e => set('color', e.target.value)}
                className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent" title="Custom color" />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted block mb-1">
              PIN <span className="font-normal">— optional, leave blank for open access</span>
            </label>
            {initial.id && initial.has_pin && !clearPin ? (
              <div className="flex items-center gap-3">
                <span className="text-muted text-sm">PIN is set</span>
                <button type="button" onClick={() => { setClearPin(true); set('pin', ''); }}
                  className="text-red-400 text-xs hover:underline">Remove PIN</button>
                <button type="button" onClick={() => set('pin', '___CHANGE___')}
                  className="text-accent text-xs hover:underline">Change PIN</button>
              </div>
            ) : (
              <input value={clearPin ? '' : form.pin}
                onChange={e => { setClearPin(false); set('pin', e.target.value); }}
                className="input-field" placeholder="e.g. 1234  (leave blank = no PIN)" />
            )}
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? 'Saving…' : 'Save Team'}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Manage() {
  const queryClient = useQueryClient();
  const [modal, setModal] = useState(null); // null | 'add' | team object
  const { data: teams = [], isLoading } = useQuery({ queryKey: ['teams'], queryFn: getTeams });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['teams'] });

  const handleCreate = async (data) => { await createTeam(data); invalidate(); };
  const handleUpdate = async (data) => { await updateTeam(modal.id, data); invalidate(); };
  const handleDelete = async (team) => {
    if (!confirm(`Delete "${team.name}"? This removes ALL games and stats for this team.`)) return;
    await deleteTeam(team.id);
    invalidate();
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <Link to="/" className="text-muted text-sm hover:text-white mb-2 inline-block">← All Teams</Link>
          <h1 className="text-3xl font-black text-white">Manage Teams</h1>
        </div>
        <button className="btn-primary" onClick={() => setModal('add')}>+ New Team</button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : teams.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-muted mb-4">No teams yet. Add your first one.</p>
          <button className="btn-primary" onClick={() => setModal('add')}>+ Add Team</button>
        </div>
      ) : (
        <div className="space-y-3">
          {teams.map(team => (
            <div key={team.id} className="card p-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-3 h-10 rounded-full flex-shrink-0" style={{ backgroundColor: team.color }} />
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-white">{team.name}</span>
                    {team.has_pin && <span className="text-xs bg-surface2 text-muted px-2 py-0.5 rounded">PIN</span>}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    {team.slug ? (
                      <Link to={`/${team.slug}/dashboard`} className="text-accent text-xs font-mono hover:underline">
                        /{team.slug}
                      </Link>
                    ) : (
                      <span className="text-yellow-500 text-xs">⚠ no URL set</span>
                    )}
                    {(team.season || team.league) && (
                      <span className="text-muted text-xs">{[team.season, team.league].filter(Boolean).join(' · ')}</span>
                    )}
                    <span className="text-muted text-xs">{team.wins}W–{team.losses}L · {team.player_count} players</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {team.slug && (
                  <Link to={`/${team.slug}/dashboard`} className="btn-secondary text-xs px-3 py-1.5">View</Link>
                )}
                <button onClick={() => setModal(team)} className="btn-secondary text-xs px-3 py-1.5">Edit</button>
                <button onClick={() => handleDelete(team)} className="text-red-400 hover:text-red-300 text-xs px-3 py-1.5 rounded transition-colors">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal === 'add' && (
        <TeamForm title="Add Team" onSubmit={handleCreate} onClose={() => setModal(null)} />
      )}
      {modal && modal !== 'add' && (
        <TeamForm title="Edit Team" initial={modal} onSubmit={handleUpdate} onClose={() => setModal(null)} />
      )}
    </div>
  );
}
