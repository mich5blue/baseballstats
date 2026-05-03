import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getPlayerStats, updatePlayer } from '../api/client.js';
import SortableTable from '../components/SortableTable.jsx';
import SprayChart from '../components/SprayChart.jsx';
import SprayChartEditor from '../components/SprayChartEditor.jsx';

function formatDate(d) {
  if (!d) return '—';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function StatBadge({ label, value, color = 'text-white' }) {
  return (
    <div className="text-center p-3 bg-surface2 rounded-lg">
      <div className={`font-mono font-black text-2xl ${color}`}>{value ?? '---'}</div>
      <div className="text-muted text-xs uppercase tracking-wider mt-0.5">{label}</div>
    </div>
  );
}

function posColor(pos) {
  if (!pos) return '#e63946';
  if (pos === 'P') return '#e63946';
  if (pos === 'C') return '#f4a261';
  if (['1B','2B','3B','SS'].includes(pos)) return '#60a5fa';
  return '#4ade80';
}

// ── Jersey number avatar (click to edit inline) ───────────────────────────────
// Uses an uncontrolled input + ref so the save always reads the live DOM value,
// never a stale React state snapshot.
function JerseyAvatar({ value, pColor, onSave }) {
  const [editing, setEditing] = useState(false);
  const inputRef  = useRef(null);
  // stable ref so commit() is never stale
  const onSaveRef = useRef(onSave);
  useEffect(() => { onSaveRef.current = onSave; }, [onSave]);
  const valueRef  = useRef(value);
  useEffect(() => { valueRef.current = value; }, [value]);

  const start = () => setEditing(true);

  const commit = () => {
    const raw     = inputRef.current?.value ?? '';
    const trimmed = raw.replace(/\D/g, '').slice(0, 2);
    setEditing(false);
    const prev = String(valueRef.current ?? '');
    if (trimmed !== prev) onSaveRef.current(trimmed);
  };

  useEffect(() => {
    if (editing && inputRef.current) {
      // Pre-fill with current jersey, select all so the user can overwrite
      inputRef.current.value = String(value ?? '');
      inputRef.current.select();
    }
  }, [editing]);

  if (editing) {
    return (
      <div className="w-20 h-20 rounded-2xl flex items-center justify-center border-2 flex-shrink-0"
        style={{ backgroundColor: pColor + '20', borderColor: pColor }}>
        <input
          ref={inputRef}
          defaultValue={String(value ?? '')}
          onBlur={commit}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); commit(); } if (e.key === 'Escape') setEditing(false); }}
          className="w-12 text-center font-black text-3xl bg-transparent outline-none border-b-2"
          style={{ color: pColor, borderColor: pColor + '80' }}
          maxLength={2}
          inputMode="numeric"
          placeholder="#"
        />
      </div>
    );
  }

  return (
    <div
      onClick={start}
      title="Click to edit jersey number"
      className="w-20 h-20 rounded-2xl flex items-center justify-center font-black text-3xl border-2 flex-shrink-0 cursor-pointer hover:brightness-125 transition-all group relative"
      style={{ backgroundColor: pColor + '20', borderColor: pColor + '60', color: pColor }}
    >
      {value || '#'}
      <span className="absolute bottom-0 right-0 text-[9px] opacity-0 group-hover:opacity-60 transition-opacity pr-1 pb-0.5 text-white">
        edit
      </span>
    </div>
  );
}

// ── Cycle-click badge (L/R/S etc.) ────────────────────────────────────────────
// Clicking immediately cycles to the next value and saves.
function CycleBadge({ value, cycle, onSave, style }) {
  const [busy, setBusy] = useState(false);

  const handleClick = async () => {
    if (busy) return;
    const next = cycle[value] ?? Object.keys(cycle)[0];
    setBusy(true);
    try { await onSave(next); } finally { setBusy(false); }
  };

  return (
    <button
      onClick={handleClick}
      disabled={busy}
      title="Click to change"
      className={`badge font-bold cursor-pointer hover:opacity-80 transition-opacity ${busy ? 'opacity-40' : ''}`}
      style={style}
    >
      {value || '?'}
    </button>
  );
}

export default function PlayerProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [featuring, setFeaturing] = useState(false);
  const [editingZones, setEditingZones] = useState(false);
  // Patched zones: { [atBatId]: parsedZonesArray } — updated immediately on editor save
  const [zonePatches, setZonePatches] = useState({});

  const load = () => {
    getPlayerStats(id).then(d => { setData(d); setLoading(false); setZonePatches({}); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  const handleFeatureToggle = async () => {
    if (!data) return;
    setFeaturing(true);
    try {
      await updatePlayer(id, { is_featured: data.player.is_featured ? 0 : 1 });
      load();
    } finally { setFeaturing(false); }
  };

  const handlePlayerUpdate = useCallback(async (field, value) => {
    await updatePlayer(id, { [field]: value });
    load();
  }, [id]);

  // Called by SprayChartEditor when a game's zones are saved
  const handleZonesSaved = useCallback((atBatId, newZones) => {
    setZonePatches(prev => ({ ...prev, [atBatId]: newZones }));
  }, []);

  // Aggregate all hit_zones across all games for spray chart display
  // Uses zonePatches for any locally-edited games (live preview)
  const allHitZones = useMemo(() => {
    if (!data) return [];
    const zones = [];
    for (const teamData of data.batting.byTeam) {
      for (const game of teamData.games) {
        const patched = zonePatches[game.id];
        const raw = patched !== undefined ? patched : game.hit_zones;
        if (!raw) continue;
        try {
          const z = typeof raw === 'string' ? JSON.parse(raw) : raw;
          if (Array.isArray(z)) zones.push(...z);
        } catch (_) {}
      }
    }
    return zones;
  }, [data, zonePatches]);

  const battingGameCols = useMemo(() => [
    { header: 'Date', accessorKey: 'game_date', cell: i => formatDate(i.getValue()) },
    { header: 'Opponent', accessorKey: 'opponent', cell: i => <span className="text-white">{i.getValue() || '—'}</span> },
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
    { header: 'AVG', accessorKey: 'avg', cell: i => <span className="font-mono text-accent">{i.getValue()}</span> },
    { header: 'Zones', accessorKey: 'hit_zones',
      cell: i => {
        const raw = i.getValue();
        if (!raw) return <span className="text-muted text-xs">—</span>;
        try {
          const z = typeof raw === 'string' ? JSON.parse(raw) : raw;
          if (!Array.isArray(z) || z.length === 0) return <span className="text-muted text-xs">—</span>;
          return (
            <span className="text-xs font-mono flex gap-1 flex-wrap">
              {z.map((h, idx) => {
                const zone = typeof h === 'string' ? h : h.zone;
                const type = typeof h === 'string' ? 'ld' : (h.type || 'ld');
                const isGb = type === 'gb' || type === 'hop';
                return (
                  <span key={idx}
                    className={isGb ? 'text-[#4fc3f7]' : 'text-[#ffd060]'}
                    title={isGb ? 'Ground ball' : 'Line drive / fly ball'}>
                    {zone.toUpperCase()}
                  </span>
                );
              })}
            </span>
          );
        } catch (_) { return null; }
      }
    },
  ], []);

  const pitchingGameCols = useMemo(() => [
    { header: 'Date', accessorKey: 'game_date', cell: i => formatDate(i.getValue()) },
    { header: 'Opponent', accessorKey: 'opponent', cell: i => <span className="text-white">{i.getValue() || '—'}</span> },
    { header: 'W', accessorKey: 'win', cell: i => i.getValue() ? <span className="text-emerald-400 font-bold">W</span> : '' },
    { header: 'L', accessorKey: 'loss', cell: i => i.getValue() ? <span className="text-red-400">L</span> : '' },
    { header: 'SV', accessorKey: 'save_stat', cell: i => i.getValue() ? <span className="text-gold">S</span> : '' },
    { header: 'IP', accessorKey: 'innings_pitched', cell: i => <span className="font-mono">{(i.getValue() || 0).toFixed(1)}</span> },
    { header: 'H', accessorKey: 'hits_allowed' },
    { header: 'ER', accessorKey: 'earned_runs' },
    { header: 'BB', accessorKey: 'walks' },
    { header: 'K', accessorKey: 'strikeouts', cell: i => <span className="text-gold">{i.getValue()}</span> },
    { header: 'P', accessorKey: 'pitches', cell: i => <span className="text-muted">{i.getValue() || 0}</span> },
    { header: 'B', id: 'balls', accessorFn: r => (r.pitches||0) - (r.strikes||0), cell: i => <span className="text-muted">{i.getValue()}</span> },
    { header: 'S', accessorKey: 'strikes', cell: i => <span className="text-white">{i.getValue() || 0}</span> },
    { header: 'S%', id: 'spct', accessorFn: r => (r.strikes > 0 && r.pitches > 0) ? Math.round(r.strikes/r.pitches*100) : null,
      cell: i => { const v = i.getValue(); return <span className={`font-mono ${v >= 60 ? 'text-emerald-400' : v !== null && v < 50 ? 'text-red-400' : 'text-white'}`}>{v !== null ? v+'%' : '—'}</span>; }
    },
    { header: 'ERA', accessorKey: 'era', cell: i => <span className="font-mono text-accent">{i.getValue()}</span> },
    { header: 'WHIP', accessorKey: 'whip', cell: i => <span className="font-mono">{i.getValue()}</span> },
  ], []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!data) return (
    <div className="max-w-4xl mx-auto px-4 py-12 text-center">
      <p className="text-muted text-lg">Player not found.</p>
      <Link to="/roster" className="text-accent hover:underline mt-2 inline-block">← Roster</Link>
    </div>
  );

  const { player, teams, batting, pitching } = data;
  const overall = batting.overall;
  const overallPitching = pitching.overall;
  const hasPitching = pitching.byTeam.some(t => t.games.length > 0);

  const allBattingGames  = batting.byTeam.flatMap(b => b.games);
  const allPitchingGames = pitching.byTeam.flatMap(b => b.games);

  const pColor = posColor(player.position);
  const jersey = player.jersey_number || teams?.[0]?.jersey_number;

  // Games list for the zone editor (need at-bat ID + game info)
  const gamesForEditor = allBattingGames.map(g => ({
    id:        g.id,
    game_date: g.game_date,
    opponent:  g.opponent,
    hit_zones: zonePatches[g.id] !== undefined ? zonePatches[g.id] : g.hit_zones,
  }));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <Link to="/roster" className="text-muted text-sm hover:text-white mb-4 inline-block">← Roster</Link>

      {/* ── Player Hero Card ─────────────────────────────────────────────────── */}
      <div className="card p-6 mb-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 bottom-0 w-1.5 rounded-l"
          style={{ backgroundColor: pColor }} />
        <div className="pl-4">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="flex items-center gap-5">
              {/* Jersey number — click to edit */}
              <JerseyAvatar
                value={jersey}
                pColor={pColor}
                onSave={val => handlePlayerUpdate('jersey_number', val)}
              />
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <h1 className="text-4xl font-black text-white">{player.name}</h1>
                  {player.is_featured === 1 && <span className="text-gold text-2xl">⭐</span>}
                </div>
                {player.nickname && <p className="text-muted text-lg">"{player.nickname}"</p>}
                <div className="flex items-center gap-3 mt-1.5 flex-wrap text-sm">
                  {/* Bats — click cycles L → R → S → L */}
                  <span className="text-muted flex items-center gap-1">
                    Bats:&nbsp;
                    <CycleBadge
                      value={player.bats}
                      cycle={{ L: 'R', R: 'S', S: 'L' }}
                      onSave={val => handlePlayerUpdate('bats', val)}
                      style={{ backgroundColor: '#ffffff10', color: 'white' }}
                    />
                  </span>
                  {/* Throws — click toggles L ↔ R */}
                  <span className="text-muted flex items-center gap-1">
                    Throws:&nbsp;
                    <CycleBadge
                      value={player.throws}
                      cycle={{ L: 'R', R: 'L' }}
                      onSave={val => handlePlayerUpdate('throws', val)}
                      style={{ backgroundColor: '#ffffff10', color: 'white' }}
                    />
                  </span>
                  {teams.map(t => (
                    <span key={t.id} className="badge text-white text-xs"
                      style={{ backgroundColor: (t.color || '#e63946') + '33', border: `1px solid ${t.color || '#e63946'}40` }}>
                      {t.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <button
              onClick={handleFeatureToggle}
              disabled={featuring}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                player.is_featured ? 'bg-gold/20 text-gold border border-gold/30 hover:bg-gold/30' : 'btn-secondary'
              }`}
            >
              {player.is_featured ? '★ Featured' : '☆ Set Featured'}
            </button>
          </div>

          {/* Season batting totals */}
          {overall.ab > 0 && (
            <div className="mt-5 pt-5 border-t border-border grid grid-cols-4 sm:grid-cols-7 gap-3">
              <StatBadge label="AVG" value={overall.avg} color="text-accent" />
              <StatBadge label="OBP" value={overall.obp} color="text-gold" />
              <StatBadge label="SLG" value={overall.slg} color="text-blue-400" />
              <StatBadge label="OPS" value={overall.ops} color="text-purple-400" />
              <StatBadge label="HR" value={overall.home_runs ?? 0} color="text-accent" />
              <StatBadge label="RBI" value={overall.rbi ?? 0} color="text-gold" />
              <StatBadge label="G" value={overall.games ?? 0} color="text-muted" />
            </div>
          )}
        </div>
      </div>

      {/* ── Main Content: Spray Chart + Game Logs ────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Spray Chart / Editor */}
        <div className="lg:col-span-1">
          <div className="card p-5 sticky top-20">
            {editingZones && gamesForEditor.length > 0 ? (
              /* Edit mode */
              <SprayChartEditor
                games={gamesForEditor}
                onClose={() => setEditingZones(false)}
                onSaved={handleZonesSaved}
              />
            ) : (
              /* View mode */
              <>
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-lg font-bold text-white">Spray Chart</h3>
                  {allBattingGames.length > 0 && (
                    <button
                      onClick={() => setEditingZones(true)}
                      className="text-xs text-muted hover:text-accent transition-colors flex items-center gap-1 px-2 py-1 rounded hover:bg-white/5"
                      title="Edit hit zones"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                        <path d="M13.488 2.513a1.75 1.75 0 0 0-2.475 0L6.75 6.774a2.75 2.75 0 0 0-.596.892l-.848 2.047a.75.75 0 0 0 .98.98l2.047-.848a2.75 2.75 0 0 0 .892-.596l4.263-4.263a1.75 1.75 0 0 0 0-2.474ZM4.75 13.25a.75.75 0 0 0 0 1.5h6.5a.75.75 0 0 0 0-1.5h-6.5Z" />
                      </svg>
                      Edit
                    </button>
                  )}
                </div>
                <p className="text-muted text-xs mb-4">
                  {allHitZones.length > 0
                    ? `${allHitZones.length} hit${allHitZones.length !== 1 ? 's' : ''} charted`
                    : 'No zones recorded yet'}
                </p>
                <SprayChart hitZones={allHitZones} />
                {allHitZones.length === 0 && (
                  <p className="text-muted text-xs text-center mt-3">
                    Add hit zones when logging at-bats, or click Edit to place zones manually.
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        {/* Game Logs */}
        <div className="lg:col-span-2 space-y-8">

          {/* Pitching totals (if pitcher) */}
          {hasPitching && (
            <div className="card p-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3">Season Pitching</h3>
              <div className="grid grid-cols-4 sm:grid-cols-7 gap-3">
                <StatBadge label="ERA" value={overallPitching.era} color="text-accent" />
                <StatBadge label="WHIP" value={overallPitching.whip} color="text-gold" />
                <StatBadge label="IP" value={(overallPitching.innings_pitched || 0).toFixed(1)} color="text-blue-400" />
                <StatBadge label="K" value={overallPitching.strikeouts ?? 0} color="text-gold" />
                <StatBadge label="P" value={overallPitching.pitches ?? 0} color="text-white" />
                <StatBadge label="S" value={overallPitching.strikes ?? 0} color="text-white" />
                <StatBadge label="S%"
                  value={(overallPitching.pitches_tracked > 0)
                    ? Math.round((overallPitching.strikes || 0) / overallPitching.pitches_tracked * 100) + '%'
                    : '—'}
                  color={(overallPitching.pitches_tracked > 0 && Math.round((overallPitching.strikes||0)/overallPitching.pitches_tracked*100) >= 60) ? 'text-emerald-400' : 'text-white'}
                />
              </div>
            </div>
          )}

          {/* Batting game log */}
          {allBattingGames.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold text-white">Batting — Game Log</h3>
                <div className="text-muted text-sm">
                  <span className="text-accent font-mono font-bold">{overall.avg}</span> AVG
                  <span className="mx-2">·</span>
                  <span className="text-gold font-mono">{overall.ops}</span> OPS
                </div>
              </div>
              <SortableTable
                columns={battingGameCols}
                data={allBattingGames}
                defaultSortField="game_date"
                defaultSortDesc={true}
                onRowClick={row => row.game_id && navigate(`/games/${row.game_id}`)}
              />
            </div>
          )}

          {/* Pitching game log */}
          {hasPitching && allPitchingGames.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold text-white">Pitching — Game Log</h3>
                <div className="text-muted text-sm">
                  ERA: <span className="text-accent font-mono font-bold">{overallPitching.era}</span>
                  <span className="mx-2">·</span>
                  WHIP: <span className="font-mono">{overallPitching.whip}</span>
                </div>
              </div>
              <SortableTable
                columns={pitchingGameCols}
                data={allPitchingGames}
                defaultSortField="game_date"
                defaultSortDesc={true}
              />
            </div>
          )}

          {allBattingGames.length === 0 && !hasPitching && (
            <div className="card p-10 text-center">
              <p className="text-muted">No stats recorded yet for this player.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
