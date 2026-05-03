import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTeamPath } from '../context/TeamContext.jsx';
import { importImage, commitBoxscore, importExcel, importScorebookAnalyze, applyHitZones } from '../api/client.js';

// ─── Drag-and-drop upload zone ────────────────────────────────────────────────
function DropZone({ accept, label, icon, onFile, loading }) {
  const [dragging, setDragging] = useState(false);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onFile(file);
  }, [onFile]);

  const handleChange = (e) => {
    const file = e.target.files?.[0];
    if (file) onFile(file);
    e.target.value = '';
  };

  return (
    <label
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={`flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-10 cursor-pointer transition-all
        ${dragging ? 'border-accent bg-accent/10' : 'border-border hover:border-accent/50 hover:bg-surface/50'}
        ${loading ? 'opacity-50 pointer-events-none' : ''}`}
    >
      <div className="text-5xl mb-3">{icon}</div>
      {loading ? (
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-muted text-sm">Analyzing image with AI…</p>
        </div>
      ) : (
        <>
          <p className="text-white font-semibold text-lg mb-1">{label}</p>
          <p className="text-muted text-sm">Drag & drop or click to browse</p>
        </>
      )}
      <input type="file" accept={accept} onChange={handleChange} className="hidden" />
    </label>
  );
}

// ─── Editable stat row for the review table ───────────────────────────────────
function PlayerRow({ player, onChange, onRemove, index }) {
  const fields = ['ab','hits','doubles','triples','home_runs','rbi','runs','walks','strikeouts','hit_by_pitch','stolen_bases'];

  const update = (field, val) => {
    const updated = { ...player, [field]: val };
    // Auto-recalculate singles when hits/doubles/triples/hr change
    if (['hits','doubles','triples','home_runs'].includes(field)) {
      const h = parseInt(field === 'hits' ? val : updated.hits) || 0;
      const d = parseInt(field === 'doubles' ? val : updated.doubles) || 0;
      const t = parseInt(field === 'triples' ? val : updated.triples) || 0;
      const hr = parseInt(field === 'home_runs' ? val : updated.home_runs) || 0;
      updated.singles = Math.max(0, h - d - t - hr);
    }
    onChange(index, updated);
  };

  return (
    <tr className="border-b border-border/50 hover:bg-surface/50">
      <td className="table-cell">
        <input
          value={player.name || ''}
          onChange={e => update('name', e.target.value)}
          className="bg-transparent border border-transparent hover:border-border focus:border-accent rounded px-2 py-1 w-36 text-white text-sm focus:outline-none"
          placeholder="Player name"
        />
      </td>
      <td className="table-cell">
        <input
          value={player.position || ''}
          onChange={e => update('position', e.target.value)}
          className="bg-transparent border border-transparent hover:border-border focus:border-accent rounded px-2 py-1 w-12 text-center text-muted text-sm focus:outline-none"
          placeholder="SS"
        />
      </td>
      {fields.map(f => (
        <td key={f} className="table-cell text-center">
          <input
            type="number"
            min="0"
            value={player[f] ?? 0}
            onChange={e => update(f, parseInt(e.target.value) || 0)}
            className="bg-transparent border border-transparent hover:border-border focus:border-accent rounded px-1 py-1 w-12 text-center text-sm focus:outline-none text-white"
          />
        </td>
      ))}
      <td className="table-cell text-center">
        <button
          onClick={() => onRemove(index)}
          className="text-red-400 hover:text-red-300 text-lg leading-none"
          title="Remove player"
        >×</button>
      </td>
    </tr>
  );
}

// ─── Editable pitching row ────────────────────────────────────────────────────
function PitchingRow({ player, onChange, onRemove, index }) {
  const update = (field, val) => onChange(index, { ...player, [field]: val });

  return (
    <tr className="border-b border-border/50 hover:bg-surface/50">
      <td className="table-cell">
        <input
          value={player.name || ''}
          onChange={e => update('name', e.target.value)}
          className="bg-transparent border border-transparent hover:border-border focus:border-accent rounded px-2 py-1 w-36 text-white text-sm focus:outline-none"
        />
      </td>
      {['innings_pitched','hits_allowed','earned_runs','walks','strikeouts','pitches'].map(f => (
        <td key={f} className="table-cell text-center">
          <input
            type="number"
            min="0"
            step={f === 'innings_pitched' ? '0.1' : '1'}
            value={player[f] ?? 0}
            onChange={e => update(f, parseFloat(e.target.value) || 0)}
            className="bg-transparent border border-transparent hover:border-border focus:border-accent rounded px-1 py-1 w-14 text-center text-sm focus:outline-none text-white"
          />
        </td>
      ))}
      <td className="table-cell text-center">
        <select
          value={player.win ? 'W' : player.loss ? 'L' : player.save_stat ? 'S' : '-'}
          onChange={e => {
            const v = e.target.value;
            onChange(index, { ...player, win: v === 'W' ? 1 : 0, loss: v === 'L' ? 1 : 0, save_stat: v === 'S' ? 1 : 0 });
          }}
          className="bg-surface border border-border text-white rounded px-1 py-1 text-sm"
        >
          <option value="-">—</option>
          <option value="W">W</option>
          <option value="L">L</option>
          <option value="S">S</option>
        </select>
      </td>
      <td className="table-cell text-center">
        <button onClick={() => onRemove(index)} className="text-red-400 hover:text-red-300 text-lg leading-none">×</button>
      </td>
    </tr>
  );
}

// ─── Review screen shown after successful parse ───────────────────────────────
function ReviewScreen({ parsed, fileName, onCommit, onReset }) {
  const [teamName, setTeamName] = useState(parsed.team_name || '');
  const [opponent, setOpponent] = useState(parsed.opponent || '');
  const [gameDate, setGameDate] = useState(parsed.game_date || '');
  const [teamScore, setTeamScore] = useState(parsed.team_score ?? '');
  const [opponentScore, setOpponentScore] = useState(parsed.opponent_score ?? '');
  const [location, setLocation] = useState(parsed.location || '');
  const [homeAway, setHomeAway] = useState('home');
  const [players, setPlayers] = useState(parsed.players || []);
  const [pitching, setPitching] = useState(parsed.pitching || []);
  const [committing, setCommitting] = useState(false);
  const [error, setError] = useState('');

  const updatePlayer = (i, val) => setPlayers(prev => prev.map((p, idx) => idx === i ? val : p));
  const removePlayer = (i) => setPlayers(prev => prev.filter((_, idx) => idx !== i));
  const addPlayer = () => setPlayers(prev => [...prev, { name: '', position: '', ab: 0, hits: 0, singles: 0, doubles: 0, triples: 0, home_runs: 0, rbi: 0, runs: 0, walks: 0, strikeouts: 0, hit_by_pitch: 0, sac_fly: 0, sac_bunt: 0, stolen_bases: 0, caught_stealing: 0 }]);

  const updatePitcher = (i, val) => setPitching(prev => prev.map((p, idx) => idx === i ? val : p));
  const removePitcher = (i) => setPitching(prev => prev.filter((_, idx) => idx !== i));
  const addPitcher = () => setPitching(prev => [...prev, { name: '', innings_pitched: 0, hits_allowed: 0, runs_allowed: 0, earned_runs: 0, walks: 0, strikeouts: 0, pitches: 0, win: 0, loss: 0, save_stat: 0 }]);

  const handleCommit = async () => {
    if (!teamName.trim()) return setError('Team name is required.');
    if (!opponent.trim()) return setError('Opponent name is required.');
    setError('');
    setCommitting(true);
    try {
      await onCommit({
        team_name: teamName.trim(),
        opponent: opponent.trim(),
        game_date: gameDate || null,
        team_score: teamScore !== '' ? parseInt(teamScore) : null,
        opponent_score: opponentScore !== '' ? parseInt(opponentScore) : null,
        location: location || null,
        home_away: homeAway,
        players,
        pitching
      });
    } catch (e) {
      setError(e.message || 'Import failed');
      setCommitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-white">Review Parsed Box Score</h2>
          <p className="text-muted text-sm mt-1">From: <span className="text-white">{fileName}</span> — edit anything before importing</p>
        </div>
        <button onClick={onReset} className="btn-secondary text-sm">← Upload Different Image</button>
      </div>

      {/* AI notes */}
      {parsed.notes && (
        <div className="bg-blue-900/20 border border-blue-700/40 rounded-xl p-4">
          <p className="text-blue-300 text-sm">💡 <span className="font-semibold">AI Note:</span> {parsed.notes}</p>
        </div>
      )}

      {/* Game info */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-muted uppercase tracking-wider mb-4">Game Details</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-xs text-muted block mb-1">Your Team Name *</label>
            <input value={teamName} onChange={e => setTeamName(e.target.value)}
              className="input-field" placeholder="e.g. Blue Jays" />
          </div>
          <div>
            <label className="text-xs text-muted block mb-1">Opponent *</label>
            <input value={opponent} onChange={e => setOpponent(e.target.value)}
              className="input-field" placeholder="e.g. Cardinals" />
          </div>
          <div>
            <label className="text-xs text-muted block mb-1">Game Date</label>
            <input type="date" value={gameDate} onChange={e => setGameDate(e.target.value)}
              className="input-field" />
          </div>
          <div>
            <label className="text-xs text-muted block mb-1">Your Score</label>
            <input type="number" min="0" value={teamScore} onChange={e => setTeamScore(e.target.value)}
              className="input-field" placeholder="0" />
          </div>
          <div>
            <label className="text-xs text-muted block mb-1">Opponent Score</label>
            <input type="number" min="0" value={opponentScore} onChange={e => setOpponentScore(e.target.value)}
              className="input-field" placeholder="0" />
          </div>
          <div>
            <label className="text-xs text-muted block mb-1">Home / Away</label>
            <select value={homeAway} onChange={e => setHomeAway(e.target.value)} className="select-field">
              <option value="home">Home</option>
              <option value="away">Away</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-muted block mb-1">Location</label>
            <input value={location} onChange={e => setLocation(e.target.value)}
              className="input-field" placeholder="Optional" />
          </div>
        </div>
      </div>

      {/* Batting stats table */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white">
            Batting Stats
            <span className="text-muted text-sm font-normal ml-2">({players.length} players)</span>
          </h3>
          <button onClick={addPlayer} className="btn-secondary text-sm">+ Add Player</button>
        </div>

        {players.length === 0 ? (
          <p className="text-muted text-sm text-center py-6">No batting stats found. Click "Add Player" to add manually.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead className="bg-surface">
                <tr>
                  {['Player','Pos','AB','H','2B','3B','HR','RBI','R','BB','K','HBP','SB',''].map(h => (
                    <th key={h} className="table-header text-center first:text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {players.map((p, i) => (
                  <PlayerRow key={i} player={p} index={i} onChange={updatePlayer} onRemove={removePlayer} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pitching stats table */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white">
            Pitching Stats
            <span className="text-muted text-sm font-normal ml-2">({pitching.length} pitchers)</span>
          </h3>
          <button onClick={addPitcher} className="btn-secondary text-sm">+ Add Pitcher</button>
        </div>

        {pitching.length === 0 ? (
          <p className="text-muted text-sm text-center py-6">No pitching stats detected. Click "Add Pitcher" to add manually.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead className="bg-surface">
                <tr>
                  {['Pitcher','IP','H','ER','BB','K','P','W/L/S',''].map(h => (
                    <th key={h} className="table-header text-center first:text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pitching.map((p, i) => (
                  <PitchingRow key={i} player={p} index={i} onChange={updatePitcher} onRemove={removePitcher} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Error + commit */}
      {error && (
        <div className="bg-red-900/40 border border-red-700 text-red-300 px-4 py-3 rounded-xl">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between pt-2">
        <p className="text-muted text-sm">
          New players and teams will be <span className="text-white">created automatically</span>. Existing ones will be matched by name.
        </p>
        <button
          onClick={handleCommit}
          disabled={committing}
          className="btn-primary px-8 py-3 text-base font-bold"
        >
          {committing ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Importing…
            </span>
          ) : '⚾ Import Everything'}
        </button>
      </div>
    </div>
  );
}

// ─── Success screen ───────────────────────────────────────────────────────────
function SuccessScreen({ result, onReset, tp }) {
  const navigate = useNavigate();
  return (
    <div className="text-center py-12 space-y-6">
      <div className="text-6xl">🎉</div>
      <h2 className="text-3xl font-black text-white">Import Complete!</h2>
      <p className="text-muted text-lg">{result.message}</p>
      <div className="flex items-center justify-center gap-4 flex-wrap">
        <button
          onClick={() => navigate(tp('/dashboard'))}
          className="btn-primary px-6 py-3"
        >
          View Team: {result.teamName} →
        </button>
        <button
          onClick={() => navigate(tp(`/games/${result.gameId}`))}
          className="btn-secondary px-6 py-3"
        >
          View Game →
        </button>
        <button onClick={onReset} className="btn-secondary px-6 py-3">
          Import Another
        </button>
      </div>
    </div>
  );
}

// ─── Scorebook import section ─────────────────────────────────────────────────
function ScorebookSection() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState('');
  const [applied, setApplied] = useState(null);

  const handleFile = async (file) => {
    setError(''); setResult(null); setApplied(null);
    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const data = await importScorebookAnalyze(formData);
      setResult(data.parsed);
    } catch (e) {
      setError(e?.response?.data?.error || e.message || 'Analysis failed');
    } finally { setLoading(false); }
  };

  const handleApply = async () => {
    if (!result) return;
    setApplying(true);
    try {
      const data = await applyHitZones({ game_date: result.game_date, hits: result.hits || [] });
      setApplied(data);
    } catch (e) {
      setError(e?.response?.data?.error || e.message);
    } finally { setApplying(false); }
  };

  const ZONE_COLORS = { ll: '#60a5fa', lc: '#4ade80', c: '#facc15', rc: '#fb923c', rl: '#f87171', if: '#c084fc' };

  return (
    <div className="card p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-lg bg-blue-900/30 flex items-center justify-center text-xl">📓</div>
        <div>
          <h2 className="text-xl font-bold text-white">Scorebook → Spray Chart</h2>
          <p className="text-muted text-sm">Upload a GameChanger scorebook PDF or photo — Claude reads the hit arrows and auto-populates spray chart zones</p>
        </div>
      </div>

      {!result ? (
        <DropZone
          accept="image/*,.pdf"
          label="Drop your GameChanger scorebook here"
          icon="📓"
          onFile={handleFile}
          loading={loading}
        />
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-semibold">{result.team_name}</p>
              <p className="text-muted text-sm">{result.game_date} · {result.hits?.length || 0} hits detected</p>
            </div>
            <button className="btn-secondary text-sm" onClick={() => { setResult(null); setApplied(null); }}>Reset</button>
          </div>

          {result.hits?.length > 0 ? (
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-surface">
                  <tr>
                    <th className="table-header">Player</th>
                    <th className="table-header">Inn</th>
                    <th className="table-header">Type</th>
                    <th className="table-header">Zone</th>
                  </tr>
                </thead>
                <tbody>
                  {result.hits.map((hit, i) => (
                    <tr key={i} className="border-b border-border/50">
                      <td className="table-cell text-white">{hit.player}</td>
                      <td className="table-cell text-muted">{hit.inning}</td>
                      <td className="table-cell">
                        <span className="text-accent font-mono font-bold">{hit.type}</span>
                      </td>
                      <td className="table-cell">
                        {hit.zone ? (
                          <span className="font-mono font-bold px-2 py-0.5 rounded text-xs"
                            style={{ backgroundColor: (ZONE_COLORS[hit.zone] || '#fff') + '25', color: ZONE_COLORS[hit.zone] || '#fff' }}>
                            {hit.zone.toUpperCase()}
                          </span>
                        ) : (
                          <span className="text-muted text-xs">unknown</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="card p-6 text-center text-muted text-sm">No hits detected in scorebook.</div>
          )}

          {!applied ? (
            <button onClick={handleApply} disabled={applying || !result.hits?.filter(h => h.zone).length}
              className="btn-primary w-full">
              {applying ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Applying zones…
                </span>
              ) : `Apply ${result.hits?.filter(h => h.zone).length || 0} zones to player profiles`}
            </button>
          ) : (
            <div className="bg-emerald-900/30 border border-emerald-700/50 text-emerald-300 rounded-xl p-4 text-sm">
              ✅ Updated {applied.updated} player{applied.updated !== 1 ? 's' : ''}.
              Spray charts are now live on player profiles.
            </div>
          )}
        </div>
      )}

      {error && <div className="mt-3 bg-red-900/40 border border-red-700 text-red-300 px-4 py-3 rounded-xl text-sm">{error}</div>}

      <div className="mt-4 bg-surface2 rounded-xl p-4 border border-border/50 text-xs text-muted">
        <strong className="text-white">Workflow:</strong> Import box score first (creates the game + players), then import the matching scorebook page to add spray chart data. Claude reads the directional arrows in each at-bat diamond.
      </div>
    </div>
  );
}

// ─── Excel import section ─────────────────────────────────────────────────────
function ExcelSection() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFile = async (file) => {
    setError('');
    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const data = await importExcel(formData);
      setResult({ ...data, fileName: file.name });
    } catch (e) {
      setError(e?.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-lg bg-emerald-900/30 flex items-center justify-center text-xl">📊</div>
        <div>
          <h2 className="text-xl font-bold text-white">Excel / CSV Import</h2>
          <p className="text-muted text-sm">Upload a GameChanger export or any batting stats spreadsheet</p>
        </div>
      </div>

      {!result ? (
        <DropZone
          accept=".xlsx,.xls,.csv"
          label="Drop your Excel or CSV file here"
          icon="📋"
          onFile={handleFile}
          loading={loading}
        />
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-white font-medium">{result.fileName}
              <span className="text-muted text-sm ml-2">· {result.rowCount} rows, {result.headers?.length} columns</span>
            </span>
            <button className="btn-secondary text-sm" onClick={() => setResult(null)}>Reset</button>
          </div>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-surface">
                <tr>{(result.headers || []).map(h => <th key={h} className="table-header">{h}</th>)}</tr>
              </thead>
              <tbody>
                {(result.rows || []).slice(0, 5).map((row, i) => (
                  <tr key={i} className="border-b border-border/50">
                    {(result.headers || []).map(h => <td key={h} className="table-cell text-muted">{String(row[h] ?? '')}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="bg-surface2 rounded-xl p-4 border border-border text-sm text-muted">
            Preview above shows first 5 rows. Use the <strong className="text-white">Game Detail page</strong> to enter stats per game, or use the screenshot import feature to auto-create everything from a box score image.
          </div>
        </div>
      )}

      {error && <div className="mt-3 bg-red-900/40 border border-red-700 text-red-300 px-4 py-3 rounded-xl text-sm">{error}</div>}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function Import() {
  const tp = useTeamPath();
  const [stage, setStage] = useState('upload'); // 'upload' | 'review' | 'success'
  const [parsed, setParsed] = useState(null);
  const [fileName, setFileName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successResult, setSuccessResult] = useState(null);

  const handleImageFile = async (file) => {
    setError('');
    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const data = await importImage(formData);
      if (data.success && data.parsed) {
        setParsed(data.parsed);
        setFileName(data.fileName || file.name);
        setStage('review');
      } else {
        setError(data.error || 'Could not parse the image.');
      }
    } catch (e) {
      const msg = e?.response?.data?.message || e?.response?.data?.error || e.message;
      const needsKey = e?.response?.data?.needsApiKey;
      if (needsKey) {
        setError('⚙️ ANTHROPIC_API_KEY not configured. Add it to a .env file in the server folder:\n\nANTHROPIC_API_KEY=sk-ant-...');
      } else {
        setError(msg || 'Image upload failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCommit = async (data) => {
    const result = await commitBoxscore(data);
    setSuccessResult(result);
    setStage('success');
  };

  const reset = () => {
    setStage('upload');
    setParsed(null);
    setFileName('');
    setError('');
    setSuccessResult(null);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-10">
      <div>
        <h1 className="text-3xl font-black text-white">Import Stats</h1>
        <p className="text-muted mt-1">Drop a box score screenshot and Claude will read the stats, create the team, and add all players automatically.</p>
      </div>

      {/* ── Screenshot / Box Score Import ── */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center text-xl">📸</div>
          <div>
            <h2 className="text-xl font-bold text-white">Box Score Screenshot Import</h2>
            <p className="text-muted text-sm">GameChanger, photos, any box score — Claude reads it and creates everything for you</p>
          </div>
        </div>

        {stage === 'upload' && (
          <div className="space-y-5">
            <div className="grid grid-cols-3 gap-3 mb-5">
              {[
                { icon: '📄', text: 'GameChanger PDFs' },
                { icon: '📷', text: 'Photos of score sheets' },
                { icon: '📱', text: 'App screenshots' }
              ].map(({ icon, text }) => (
                <div key={text} className="bg-surface2 rounded-xl p-3 text-center border border-border">
                  <div className="text-2xl mb-1">{icon}</div>
                  <p className="text-muted text-xs">{text}</p>
                </div>
              ))}
            </div>

            <DropZone
              accept="image/*,.pdf"
              label="Drop a screenshot or GameChanger PDF here"
              icon="⚾"
              onFile={handleImageFile}
              loading={loading}
            />

            {error && (
              <div className="bg-red-900/40 border border-red-700 text-red-300 px-4 py-4 rounded-xl text-sm whitespace-pre-line">
                {error}
              </div>
            )}

            <div className="bg-surface2 rounded-xl p-4 border border-border/50">
              <p className="text-gold text-xs font-semibold uppercase tracking-wider mb-2">Setup Required</p>
              <p className="text-muted text-sm">
                This feature uses the Claude AI API. Add your key to <code className="text-accent bg-surface px-1.5 py-0.5 rounded text-xs">server/.env</code>:
              </p>
              <pre className="mt-2 bg-field rounded-lg p-3 text-xs text-green-400 font-mono overflow-x-auto">ANTHROPIC_API_KEY=sk-ant-api03-...</pre>
              <p className="text-muted text-xs mt-2">Then restart the server. Get a key at <span className="text-accent">console.anthropic.com</span></p>
            </div>
          </div>
        )}

        {stage === 'review' && parsed && (
          <ReviewScreen
            parsed={parsed}
            fileName={fileName}
            onCommit={handleCommit}
            onReset={reset}
          />
        )}

        {stage === 'success' && successResult && (
          <SuccessScreen result={successResult} onReset={reset} tp={tp} />
        )}
      </div>

      {/* ── Scorebook Import ── */}
      <ScorebookSection />

      {/* ── Excel Import ── */}
      <ExcelSection />

      {/* ── Tips ── */}
      <div className="card p-5 border-l-4 border-l-gold">
        <h3 className="text-gold font-semibold mb-2">Import Tips</h3>
        <ul className="text-muted text-sm space-y-1.5">
          <li>• <strong className="text-white">Box score first</strong>, then scorebook — the box score creates the game and players, the scorebook adds spray chart locations</li>
          <li>• Player names are matched case-insensitively so existing players won't be duplicated</li>
          <li>• You can edit any parsed stat before confirming the import</li>
          <li>• After import, go to the Player Profile to mark your son as the Featured player (⭐)</li>
          <li>• Singles are auto-calculated as H − 2B − 3B − HR</li>
        </ul>
      </div>
    </div>
  );
}
