import React, { useState, useMemo, useCallback, useRef } from 'react';
import { updateAtBat } from '../api/client.js';

// ── Shared field geometry (mirrors SprayChart.jsx) ────────────────────────────
const HP = { x: 170, y: 268 };
const FENCE_R = 215;

function polar(r, deg) {
  const rad = (deg * Math.PI) / 180;
  return { x: HP.x + r * Math.sin(rad), y: HP.y - r * Math.cos(rad) };
}

function wedgePath(leftDeg, rightDeg) {
  const l = polar(FENCE_R, leftDeg);
  const r = polar(FENCE_R, rightDeg);
  return `M${HP.x},${HP.y} L${l.x.toFixed(1)},${l.y.toFixed(1)} A${FENCE_R},${FENCE_R},0,0,1,${r.x.toFixed(1)},${r.y.toFixed(1)} Z`;
}

const ZONES = {
  ll: { label: 'LL', desc: 'Left Line',    angleCtr: -32, width: 16, depthCtr: 145 },
  lc: { label: 'LC', desc: 'Left-Center',  angleCtr: -16, width: 16, depthCtr: 155 },
  c:  { label: 'C',  desc: 'Center',       angleCtr:   0, width: 16, depthCtr: 160 },
  rc: { label: 'RC', desc: 'Right-Center', angleCtr:  16, width: 16, depthCtr: 155 },
  rl: { label: 'RL', desc: 'Right Line',   angleCtr:  32, width: 16, depthCtr: 145 },
  if: { label: 'IF', desc: 'Infield',      angleCtr:   0, width: 50, depthCtr:  68 },
};

const BOUNDARIES = [-40, -24, -8, 8, 24, 40];
const ZONE_KEYS  = ['ll', 'lc', 'c', 'rc', 'rl'];

function prng(seed) {
  const s = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

function landingPosition(zone, index) {
  const cfg = ZONES[zone];
  if (!cfg) return null;
  const isIF = zone === 'if';
  const depthJitter = (prng(index * 7 + 1) - 0.5) * (isIF ? 25 : 40);
  const depth = cfg.depthCtr + depthJitter;
  const angleJitter = (prng(index * 13 + 3) - 0.5) * cfg.width * 0.75;
  const angle = cfg.angleCtr + angleJitter;
  return polar(depth, angle);
}

function parseZones(raw) {
  if (!raw) return [];
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!Array.isArray(parsed)) return [];
    return parsed.map(h => typeof h === 'string' ? { zone: h, type: 'ld' } : h);
  } catch (_) { return []; }
}

function fmtDate(d) {
  if (!d) return '?';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const COLOR_GROUND = '#4fc3f7';
const COLOR_AIR    = '#ffd060';
const COLOR_REMOVE = '#ff6b6b';

// ── SprayChartEditor ──────────────────────────────────────────────────────────
// Props:
//   games   — array of { id, game_date, opponent, hit_zones }
//   onClose — callback when user clicks "Done"
//   onSaved — callback(gameId, newZones) after a successful save
export default function SprayChartEditor({ games, onClose, onSaved }) {
  const [selIdx,   setSelIdx]   = useState(0);
  const [hitType,  setHitType]  = useState('ld');
  const [saving,   setSaving]   = useState(false);
  const [savedId,  setSavedId]  = useState(null);
  const [hovZone,  setHovZone]  = useState(null);

  // Local zone state keyed by at-bat ID
  const [zonesMap, setZonesMap] = useState(() =>
    Object.fromEntries(games.map(g => [g.id, parseZones(g.hit_zones)]))
  );

  const saveTimer = useRef(null);

  const game  = games[selIdx];
  const zones = game ? (zonesMap[game.id] || []) : [];

  const hits = useMemo(() =>
    zones.map((h, i) => {
      const pos = landingPosition(h.zone, i);
      return pos ? { ...pos, zone: h.zone, type: h.type, idx: i } : null;
    }).filter(Boolean),
  [zones]);

  const persist = useCallback((gameId, newZones) => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSaving(true);
      try {
        await updateAtBat(gameId, { hit_zones: newZones });
        setSavedId(gameId);
        onSaved?.(gameId, newZones);
        setTimeout(() => setSavedId(null), 1800);
      } catch (e) {
        console.error('SprayChartEditor save error', e);
      } finally {
        setSaving(false);
      }
    }, 350);
  }, [onSaved]);

  const addHit = useCallback((zoneName) => {
    if (!game) return;
    const next = [...zones, { zone: zoneName, type: hitType }];
    setZonesMap(m => ({ ...m, [game.id]: next }));
    persist(game.id, next);
  }, [game, zones, hitType, persist]);

  const removeHit = useCallback((hitIdx) => {
    if (!game) return;
    const next = zones.filter((_, i) => i !== hitIdx);
    setZonesMap(m => ({ ...m, [game.id]: next }));
    persist(game.id, next);
  }, [game, zones, persist]);

  // Fixed positions
  const b1 = polar(99,  45);
  const b2 = polar(140,  0);
  const b3 = polar(99, -45);
  const pm = polar(52,   0);

  if (!game) return null;

  const isSavedNow = savedId === game.id;

  return (
    <div className="flex flex-col gap-3">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Edit Zones</h3>
        <div className="flex items-center gap-2">
          {saving && (
            <span className="flex items-center gap-1 text-muted text-xs">
              <span className="w-3 h-3 border border-muted border-t-transparent rounded-full animate-spin inline-block" />
              Saving
            </span>
          )}
          {isSavedNow && !saving && (
            <span className="text-emerald-400 text-xs font-medium">✓ Saved</span>
          )}
          <button
            onClick={onClose}
            className="text-xs text-muted hover:text-white px-2.5 py-1 rounded-md hover:bg-white/5 border border-transparent hover:border-border transition-all"
          >
            Done ✕
          </button>
        </div>
      </div>

      {/* ── Game tabs ──────────────────────────────────────────────────────── */}
      {games.length > 1 ? (
        <div className="flex gap-1.5 flex-wrap">
          {games.map((g, i) => (
            <button
              key={g.id}
              onClick={() => setSelIdx(i)}
              className={`text-xs px-3 py-1.5 rounded-md font-medium transition-all ${
                i === selIdx
                  ? 'bg-accent/20 text-accent border border-accent/40'
                  : 'text-muted border border-border hover:text-white hover:border-white/20'
              }`}
            >
              {fmtDate(g.game_date)}
              {g.opponent ? ` vs ${g.opponent}` : ''}
            </button>
          ))}
        </div>
      ) : (
        <p className="text-muted text-xs">
          {fmtDate(game.game_date)}{game.opponent ? ` vs ${game.opponent}` : ''}
        </p>
      )}

      {/* ── Hit type toggle ────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        <span className="text-muted text-xs shrink-0">Hit type:</span>
        <div className="flex rounded-lg overflow-hidden border border-border text-xs font-medium">
          <button
            onClick={() => setHitType('gb')}
            className={`px-3 py-1.5 transition-colors ${
              hitType === 'gb'
                ? 'bg-[#4fc3f7]/15 text-[#4fc3f7]'
                : 'text-muted hover:text-white'
            }`}
          >
            Ground Ball
          </button>
          <div className="w-px bg-border" />
          <button
            onClick={() => setHitType('ld')}
            className={`px-3 py-1.5 transition-colors ${
              hitType === 'ld'
                ? 'bg-[#ffd060]/15 text-[#ffd060]'
                : 'text-muted hover:text-white'
            }`}
          >
            Line Drive
          </button>
        </div>
        {/* Colour swatch */}
        <span className="w-3 h-3 rounded-full shrink-0 transition-colors"
          style={{ backgroundColor: hitType === 'gb' ? COLOR_GROUND : COLOR_AIR }} />
      </div>

      {/* ── Interactive field SVG ──────────────────────────────────────────── */}
      <div>
        <svg
          viewBox="0 0 340 290"
          className="w-full max-w-xs mx-auto block"
          aria-label="Click a zone to add a hit; click an existing hit to remove it"
        >
          {/* Background */}
          <rect width="340" height="290" fill="#0a1628" />

          {/* Outfield zone fills — clickable */}
          {ZONE_KEYS.map((k, i) => {
            const isHov = hovZone === k;
            return (
              <path
                key={k}
                d={wedgePath(BOUNDARIES[i], BOUNDARIES[i + 1])}
                fill={isHov ? '#1e4a1e' : (i === 2 ? '#0e2b0e' : '#0b220b')}
                stroke={isHov ? '#4ade80' : '#193219'}
                strokeWidth={isHov ? 1 : 0.5}
                style={{ cursor: 'pointer', transition: 'fill 0.12s, stroke 0.12s' }}
                onClick={() => addHit(k)}
                onMouseEnter={() => setHovZone(k)}
                onMouseLeave={() => setHovZone(null)}
              />
            );
          })}

          {/* Infield grass */}
          <polygon
            points={`${HP.x},${HP.y} ${b1.x},${b1.y} ${b2.x},${b2.y} ${b3.x},${b3.y}`}
            fill="#0d2208"
            style={{ pointerEvents: 'none' }}
          />

          {/* Infield dirt — clickable (IF zone) */}
          <ellipse
            cx={HP.x} cy={HP.y - 80} rx={72} ry={68}
            fill={hovZone === 'if' ? '#3d2a12' : '#2b1c0a'}
            stroke={hovZone === 'if' ? '#c9a535' : 'none'}
            strokeWidth="1"
            opacity={hovZone === 'if' ? 1 : 0.85}
            style={{ cursor: 'pointer', transition: 'fill 0.12s' }}
            onClick={() => addHit('if')}
            onMouseEnter={() => setHovZone('if')}
            onMouseLeave={() => setHovZone(null)}
          />

          {/* Foul lines */}
          {[BOUNDARIES[0], BOUNDARIES[BOUNDARIES.length - 1]].map((deg, i) => {
            const p = polar(FENCE_R, deg);
            return (
              <line key={i} x1={HP.x} y1={HP.y} x2={p.x} y2={p.y}
                stroke="white" strokeWidth="1.5" opacity="0.35"
                style={{ pointerEvents: 'none' }}
              />
            );
          })}

          {/* Fence arc */}
          {(() => {
            const fl = polar(FENCE_R, -40);
            const fr = polar(FENCE_R,  40);
            return (
              <path
                d={`M${fl.x.toFixed(1)},${fl.y.toFixed(1)} A${FENCE_R},${FENCE_R},0,0,1,${fr.x.toFixed(1)},${fr.y.toFixed(1)}`}
                fill="none" stroke="#c9a535" strokeWidth="2" opacity="0.5"
                style={{ pointerEvents: 'none' }}
              />
            );
          })()}

          {/* Zone separators */}
          {BOUNDARIES.slice(1, -1).map((deg, i) => {
            const p = polar(FENCE_R, deg);
            return (
              <line key={i} x1={HP.x} y1={HP.y} x2={p.x} y2={p.y}
                stroke="#ffffff" strokeWidth="0.5" opacity="0.12" strokeDasharray="4 4"
                style={{ pointerEvents: 'none' }}
              />
            );
          })}

          {/* Zone labels */}
          {ZONE_KEYS.map((k, i) => {
            const midDeg = (BOUNDARIES[i] + BOUNDARIES[i + 1]) / 2;
            const p = polar(175, midDeg);
            return (
              <text key={k} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle"
                fill={hovZone === k ? '#ffffffcc' : '#ffffff40'}
                fontSize="9" fontWeight="700"
                style={{ pointerEvents: 'none', transition: 'fill 0.12s' }}
              >
                {ZONES[k].label}
              </text>
            );
          })}

          {/* IF label */}
          <text x={pm.x} y={pm.y - 22} textAnchor="middle"
            fill={hovZone === 'if' ? '#c9a535cc' : '#ffffff40'}
            fontSize="9" fontWeight="700"
            style={{ pointerEvents: 'none', transition: 'fill 0.12s' }}
          >
            IF
          </text>

          {/* Base paths */}
          <polygon
            points={`${HP.x},${HP.y} ${b1.x},${b1.y} ${b2.x},${b2.y} ${b3.x},${b3.y}`}
            fill="none" stroke="#ffffff40" strokeWidth="1"
            style={{ pointerEvents: 'none' }}
          />

          {/* Bases */}
          {[b1, b2, b3].map((b, i) => (
            <rect key={i} x={b.x - 4} y={b.y - 4} width="8" height="8"
              fill="white" opacity="0.7"
              transform={`rotate(45 ${b.x} ${b.y})`}
              style={{ pointerEvents: 'none' }}
            />
          ))}

          {/* Mound */}
          <circle cx={pm.x} cy={pm.y} r="5" fill="#3d2a10" stroke="#ffffff20" strokeWidth="0.5"
            style={{ pointerEvents: 'none' }}
          />

          {/* Home plate */}
          <polygon
            points={`${HP.x},${HP.y - 7} ${HP.x + 5},${HP.y - 2} ${HP.x + 4},${HP.y + 4} ${HP.x - 4},${HP.y + 4} ${HP.x - 5},${HP.y - 2}`}
            fill="white" opacity="0.75"
            style={{ pointerEvents: 'none' }}
          />

          {/* ── Hit lines + removable dots ──────────────────────────────────── */}
          {hits.map((d, i) => {
            const ground = d.type === 'gb' || d.type === 'hop';
            const color  = ground ? COLOR_GROUND : COLOR_AIR;
            const dash   = ground ? '5 3' : undefined;
            return (
              <g key={`hit-${i}`}>
                {/* Trajectory line */}
                <line
                  x1={HP.x} y1={HP.y} x2={d.x} y2={d.y}
                  stroke={color} strokeWidth="2" strokeDasharray={dash} opacity="0.55"
                  style={{ pointerEvents: 'none' }}
                />
                {/* Glow halo */}
                <circle cx={d.x} cy={d.y} r="7" fill={color} opacity="0.12"
                  style={{ pointerEvents: 'none' }} />
                {/* Dot — hover turns red to signal removal */}
                <circle
                  cx={d.x} cy={d.y} r="7"
                  fill={color} stroke="white" strokeWidth="1" opacity="0.9"
                  style={{ cursor: 'pointer' }}
                  onClick={() => removeHit(d.idx)}
                  onMouseEnter={e => {
                    e.currentTarget.setAttribute('fill', COLOR_REMOVE);
                    e.currentTarget.setAttribute('r', '8');
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.setAttribute('fill', color);
                    e.currentTarget.setAttribute('r', '7');
                  }}
                />
                {/* ✕ glyph — pointer-events none so the circle handles the click */}
                <text x={d.x} y={d.y} textAnchor="middle" dominantBaseline="middle"
                  fill="white" fontSize="7" fontWeight="900"
                  style={{ pointerEvents: 'none' }}
                >✕</text>
              </g>
            );
          })}
        </svg>

        {/* Instruction hint */}
        <p className="text-center text-muted text-[11px] mt-1.5">
          Click a zone to add · hover a hit and click to remove
        </p>
      </div>

      {/* ── Zone summary ───────────────────────────────────────────────────── */}
      {zones.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(
            zones.reduce((acc, h) => { acc[h.zone] = (acc[h.zone] || 0) + 1; return acc; }, {})
          ).map(([z, n]) => (
            <span key={z} className="text-xs px-2 py-0.5 rounded bg-white/5 text-muted">
              <span className="text-accent font-bold">{n}</span>
              {' '}{ZONES[z]?.label || z.toUpperCase()}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-muted text-xs text-center">No hits recorded for this game yet.</p>
      )}
    </div>
  );
}
