import React, { useState, useEffect } from 'react';
import { getTeamRoster } from '../api/client.js';

export default function PitchingForm({ initial, onSubmit, onCancel, gameId, teamId }) {
  const [players, setPlayers] = useState([]);
  const [form, setForm] = useState({
    player_id: '',
    game_id: gameId || '',
    team_id: teamId || '',
    innings_pitched: 0,
    hits_allowed: 0,
    runs_allowed: 0,
    earned_runs: 0,
    walks: 0,
    strikeouts: 0,
    home_runs_allowed: 0,
    pitches: 0,
    strikes: 0,
    win: false,
    loss: false,
    save_stat: false,
    notes: '',
    ...initial
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (teamId) {
      getTeamRoster(teamId).then(setPlayers).catch(() => {});
    }
  }, [teamId]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox') {
      setForm(prev => ({ ...prev, [name]: checked }));
    } else if (type === 'number') {
      setForm(prev => ({ ...prev, [name]: value === '' ? 0 : parseFloat(value) || 0 }));
    } else {
      setForm(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.player_id) { setError('Please select a player'); return; }
    setLoading(true);
    setError('');
    try {
      await onSubmit(form);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  const numField = (name, label, step = 1) => (
    <div>
      <label className="block text-xs text-muted uppercase tracking-wider mb-1">{label}</label>
      <input
        type="number"
        name={name}
        value={form[name]}
        onChange={handleChange}
        className="input-field text-center"
        min="0"
        step={step}
      />
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-900/40 border border-red-700 text-red-300 px-4 py-2 rounded-lg text-sm">{error}</div>
      )}

      {!initial?.id && (
        <div>
          <label className="block text-xs text-muted uppercase tracking-wider mb-1">Pitcher *</label>
          <select name="player_id" value={form.player_id} onChange={handleChange} className="select-field" required>
            <option value="">Select pitcher...</option>
            {players.map(p => (
              <option key={p.id} value={p.id}>
                {p.jersey_number ? `#${p.jersey_number} ` : ''}{p.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        {numField('innings_pitched', 'IP', 0.1)}
        {numField('hits_allowed', 'H')}
        {numField('runs_allowed', 'R')}
        {numField('earned_runs', 'ER')}
        {numField('walks', 'BB')}
        {numField('strikeouts', 'K')}
        {numField('home_runs_allowed', 'HR')}
        {numField('pitches', 'Pitches')}
        {numField('strikes', 'Strikes')}
      </div>

      <div className="flex gap-6">
        {[['win', 'Win'], ['loss', 'Loss'], ['save_stat', 'Save']].map(([name, label]) => (
          <label key={name} className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              name={name}
              checked={!!form[name]}
              onChange={handleChange}
              className="w-4 h-4 accent-accent rounded"
            />
            <span className="text-sm text-white">{label}</span>
          </label>
        ))}
      </div>

      <div>
        <label className="block text-xs text-muted uppercase tracking-wider mb-1">Notes</label>
        <textarea name="notes" value={form.notes} onChange={handleChange} className="input-field" rows={2} placeholder="Notes..." />
      </div>

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={loading} className="btn-primary flex-1">
          {loading ? 'Saving...' : (initial?.id ? 'Update Stats' : 'Add Pitching')}
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
      </div>
    </form>
  );
}
