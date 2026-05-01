import React, { useState, useEffect } from 'react';
import { getTeamRoster } from '../api/client.js';
import SprayChart from './SprayChart.jsx';

const FIELD_ZONES = [
  { key: 'll', label: 'LL', desc: 'Left Line' },
  { key: 'lc', label: 'LC', desc: 'Left-Ctr' },
  { key: 'c',  label: 'C',  desc: 'Center' },
  { key: 'rc', label: 'RC', desc: 'Rt-Ctr' },
  { key: 'rl', label: 'RL', desc: 'Right Line' },
  { key: 'if', label: 'IF', desc: 'Infield' },
];

export default function AtBatForm({ initial, onSubmit, onCancel, gameId, teamId }) {
  const [players, setPlayers] = useState([]);
  const [form, setForm] = useState({
    player_id: '',
    game_id: gameId || '',
    team_id: teamId || '',
    ab: 0, hits: 0, singles: 0, doubles: 0, triples: 0, home_runs: 0,
    rbi: 0, runs: 0, walks: 0, strikeouts: 0, hit_by_pitch: 0,
    sac_fly: 0, sac_bunt: 0, stolen_bases: 0, caught_stealing: 0,
    notes: '',
    ...initial
  });
  const [hitZones, setHitZones] = useState(() => {
    if (initial?.hit_zones) {
      try { return JSON.parse(initial.hit_zones); } catch (_) { return []; }
    }
    return [];
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (teamId) getTeamRoster(teamId).then(setPlayers).catch(() => {});
  }, [teamId]);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === 'number' ? (value === '' ? 0 : parseInt(value) || 0) : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.player_id) { setError('Please select a player'); return; }
    setLoading(true);
    setError('');
    try {
      await onSubmit({ ...form, hit_zones: hitZones.length > 0 ? JSON.stringify(hitZones) : null });
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  const totalHits = form.hits || 0;

  const addZone = (zoneKey) => {
    if (hitZones.length >= totalHits) return;
    setHitZones(prev => [...prev, zoneKey]);
  };

  const removeZone = (i) => {
    setHitZones(prev => prev.filter((_, idx) => idx !== i));
  };

  const numField = (name, label, min = 0) => (
    <div>
      <label className="block text-xs text-muted uppercase tracking-wider mb-1">{label}</label>
      <input type="number" name={name} value={form[name]} onChange={handleChange}
        className="input-field text-center" min={min} />
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-900/40 border border-red-700 text-red-300 px-4 py-2 rounded-lg text-sm">{error}</div>
      )}

      {!initial?.id && (
        <div>
          <label className="block text-xs text-muted uppercase tracking-wider mb-1">Player *</label>
          <select name="player_id" value={form.player_id} onChange={handleChange} className="select-field" required>
            <option value="">Select player...</option>
            {players.map(p => (
              <option key={p.id} value={p.id}>
                {p.jersey_number ? `#${p.jersey_number} ` : ''}{p.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        {numField('ab', 'AB')}
        {numField('hits', 'H')}
        {numField('singles', '1B')}
        {numField('doubles', '2B')}
        {numField('triples', '3B')}
        {numField('home_runs', 'HR')}
        {numField('rbi', 'RBI')}
        {numField('runs', 'R')}
        {numField('walks', 'BB')}
        {numField('strikeouts', 'K')}
        {numField('hit_by_pitch', 'HBP')}
        {numField('sac_fly', 'SF')}
        {numField('sac_bunt', 'SAC')}
        {numField('stolen_bases', 'SB')}
        {numField('caught_stealing', 'CS')}
      </div>

      {/* ── Hit Zone Tracker ────────────────────────────────────────────── */}
      {totalHits > 0 && (
        <div className="bg-surface2 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-white">Spray Chart Zones</p>
              <p className="text-xs text-muted">Optional — click to record where each hit went</p>
            </div>
            <span className={`text-xs font-mono px-2 py-1 rounded ${hitZones.length === totalHits ? 'bg-emerald-900/40 text-emerald-400' : 'bg-surface text-muted'}`}>
              {hitZones.length}/{totalHits}
            </span>
          </div>

          {/* Zone buttons */}
          <div className="grid grid-cols-6 gap-1.5">
            {FIELD_ZONES.map(z => {
              const count = hitZones.filter(h => h === z.key).length;
              const disabled = hitZones.length >= totalHits;
              return (
                <button
                  key={z.key}
                  type="button"
                  onClick={() => addZone(z.key)}
                  disabled={disabled}
                  className={`py-2 rounded text-xs font-bold transition-all relative ${
                    disabled ? 'opacity-40 cursor-not-allowed bg-surface text-muted' :
                    'bg-surface hover:bg-accent/20 hover:text-accent text-white cursor-pointer active:scale-95'
                  }`}
                >
                  {z.label}
                  {count > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-accent rounded-full text-[10px] flex items-center justify-center font-black text-white">
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Assigned zones (chips to remove) */}
          {hitZones.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {hitZones.map((z, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => removeZone(i)}
                  className="px-2.5 py-1 text-xs bg-accent/20 text-accent border border-accent/30 rounded-full hover:bg-red-900/30 hover:text-red-400 hover:border-red-500/30 transition-colors"
                >
                  {z.toUpperCase()} ×
                </button>
              ))}
              <button type="button" onClick={() => setHitZones([])}
                className="px-2 py-1 text-xs text-muted hover:text-red-400 transition-colors">
                clear all
              </button>
            </div>
          )}

          {/* Live mini preview */}
          {hitZones.length > 0 && (
            <SprayChart hitZones={hitZones} compact={true} />
          )}
        </div>
      )}

      <div>
        <label className="block text-xs text-muted uppercase tracking-wider mb-1">Notes</label>
        <textarea name="notes" value={form.notes} onChange={handleChange}
          className="input-field" rows={2} placeholder="Notes..." />
      </div>

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={loading} className="btn-primary flex-1">
          {loading ? 'Saving...' : (initial?.id ? 'Update Stats' : 'Add At-Bat')}
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
      </div>
    </form>
  );
}
