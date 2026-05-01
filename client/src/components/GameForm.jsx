import React, { useState, useEffect } from 'react';
import { getTeams } from '../api/client.js';

export default function GameForm({ initial, onSubmit, onCancel, teamId }) {
  const [teams, setTeams] = useState([]);
  const [form, setForm] = useState({
    team_id: teamId || '',
    opponent: '',
    game_date: '',
    location: '',
    home_away: 'home',
    team_score: '',
    opponent_score: '',
    notes: '',
    ...initial
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!teamId) {
      getTeams().then(setTeams).catch(() => {});
    }
  }, [teamId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.team_id) { setError('Please select a team'); return; }
    if (!form.opponent.trim()) { setError('Opponent is required'); return; }
    setLoading(true);
    setError('');
    try {
      await onSubmit({
        ...form,
        team_score: form.team_score !== '' ? parseInt(form.team_score) : null,
        opponent_score: form.opponent_score !== '' ? parseInt(form.opponent_score) : null
      });
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to save game');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-900/40 border border-red-700 text-red-300 px-4 py-2 rounded-lg text-sm">{error}</div>
      )}

      {!teamId && (
        <div>
          <label className="block text-xs text-muted uppercase tracking-wider mb-1">Team *</label>
          <select name="team_id" value={form.team_id} onChange={handleChange} className="select-field" required>
            <option value="">Select team...</option>
            {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
      )}

      <div>
        <label className="block text-xs text-muted uppercase tracking-wider mb-1">Opponent *</label>
        <input name="opponent" value={form.opponent} onChange={handleChange} className="input-field" placeholder="Opponent team name" required />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-muted uppercase tracking-wider mb-1">Date</label>
          <input type="date" name="game_date" value={form.game_date} onChange={handleChange} className="input-field" />
        </div>
        <div>
          <label className="block text-xs text-muted uppercase tracking-wider mb-1">Home / Away</label>
          <select name="home_away" value={form.home_away} onChange={handleChange} className="select-field">
            <option value="home">Home</option>
            <option value="away">Away</option>
            <option value="neutral">Neutral</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs text-muted uppercase tracking-wider mb-1">Location</label>
        <input name="location" value={form.location} onChange={handleChange} className="input-field" placeholder="Field / ballpark name" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-muted uppercase tracking-wider mb-1">Our Score</label>
          <input type="number" name="team_score" value={form.team_score} onChange={handleChange} className="input-field" min="0" placeholder="—" />
        </div>
        <div>
          <label className="block text-xs text-muted uppercase tracking-wider mb-1">Opponent Score</label>
          <input type="number" name="opponent_score" value={form.opponent_score} onChange={handleChange} className="input-field" min="0" placeholder="—" />
        </div>
      </div>

      <div>
        <label className="block text-xs text-muted uppercase tracking-wider mb-1">Notes</label>
        <textarea name="notes" value={form.notes} onChange={handleChange} className="input-field" rows={2} placeholder="Game notes..." />
      </div>

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={loading} className="btn-primary flex-1">
          {loading ? 'Saving...' : (initial?.id ? 'Update Game' : 'Add Game')}
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
      </div>
    </form>
  );
}
