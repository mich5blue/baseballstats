import React, { useMemo } from 'react';

// ── Field geometry ────────────────────────────────────────────────────────────
const HP = { x: 170, y: 268 }; // home plate
const FENCE_R = 215;            // fence radius (px)

// Convert (radius, degrees-from-CF) to SVG x,y
function polar(r, deg) {
  const rad = (deg * Math.PI) / 180;
  return { x: HP.x + r * Math.sin(rad), y: HP.y - r * Math.cos(rad) };
}

// SVG arc path for one zone wedge
function wedgePath(leftDeg, rightDeg) {
  const l = polar(FENCE_R, leftDeg);
  const r = polar(FENCE_R, rightDeg);
  return `M${HP.x},${HP.y} L${l.x.toFixed(1)},${l.y.toFixed(1)} A${FENCE_R},${FENCE_R},0,0,1,${r.x.toFixed(1)},${r.y.toFixed(1)} Z`;
}

// Zone configs: angle = center of zone (degrees from CF), width used for scatter
const ZONES = {
  ll: { label: 'LL', desc: 'Left Line',    angleCtr: -32, width: 16, depthCtr: 145 },
  lc: { label: 'LC', desc: 'Left-Center',  angleCtr: -16, width: 16, depthCtr: 155 },
  c:  { label: 'C',  desc: 'Center',       angleCtr:   0, width: 16, depthCtr: 160 },
  rc: { label: 'RC', desc: 'Right-Center', angleCtr:  16, width: 16, depthCtr: 155 },
  rl: { label: 'RL', desc: 'Right Line',   angleCtr:  32, width: 16, depthCtr: 145 },
  if: { label: 'IF', desc: 'Infield',      angleCtr:   0, width: 50, depthCtr:  68 },
};

const BOUNDARIES = [-40, -24, -8, 8, 24, 40];
const ZONE_KEYS = ['ll', 'lc', 'c', 'rc', 'rl'];

// Deterministic pseudo-random for scatter
function prng(seed) {
  const s = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

// Compute landing position for a hit in a given zone
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

// Parse hit entry — supports legacy string "lc" or new object {"zone":"lc","type":"gb"}
// Types: "gb" = ground ball, "hop" = one-hopper, "ld" = line drive, "fly" = fly ball
function parseHit(raw) {
  if (!raw) return null;
  if (typeof raw === 'string') return { zone: raw, type: 'ld' }; // legacy: default to line drive
  if (typeof raw === 'object' && raw.zone) return { zone: raw.zone, type: raw.type || 'ld' };
  return null;
}

// Ground balls and one-hoppers get dashed lines; fly balls and line drives get solid lines
function isGround(type) {
  return type === 'gb' || type === 'hop';
}

export default function SprayChart({ hitZones = [], compact = false }) {
  const hits = useMemo(() => {
    return hitZones.map((raw, i) => {
      const h = parseHit(raw);
      if (!h) return null;
      const pos = landingPosition(h.zone, i);
      return pos ? { ...pos, zone: h.zone, type: h.type } : null;
    }).filter(Boolean);
  }, [hitZones]);

  // Zone counts for labels
  const counts = useMemo(() => {
    const c = {};
    for (const raw of hitZones) {
      const h = parseHit(raw);
      if (h) c[h.zone] = (c[h.zone] || 0) + 1;
    }
    return c;
  }, [hitZones]);

  // Base positions
  const b1 = polar(99, 45);
  const b2 = polar(140, 0);
  const b3 = polar(99, -45);
  const pm = polar(52, 0);

  const size = compact ? 'max-w-[200px]' : 'max-w-xs';

  // Ground-ball color: sky blue; Air-ball color: warm gold
  const COLOR_GROUND = '#4fc3f7';
  const COLOR_AIR    = '#ffd060';

  return (
    <div>
      <svg
        viewBox="0 0 340 290"
        className={`w-full ${size} mx-auto block`}
        aria-label="Spray chart"
      >
        {/* Sky background */}
        <rect width="340" height="290" fill="#0a1628" />

        {/* Outfield zone fills */}
        {ZONE_KEYS.map((k, i) => (
          <path
            key={k}
            d={wedgePath(BOUNDARIES[i], BOUNDARIES[i + 1])}
            fill={i === 2 ? '#0e2b0e' : '#0b220b'}
            stroke="#193219"
            strokeWidth="0.5"
          />
        ))}

        {/* Infield grass inside diamond */}
        <polygon
          points={`${HP.x},${HP.y} ${b1.x},${b1.y} ${b2.x},${b2.y} ${b3.x},${b3.y}`}
          fill="#0d2208"
        />

        {/* Infield dirt */}
        <ellipse cx={HP.x} cy={HP.y - 80} rx={72} ry={68} fill="#2b1c0a" opacity="0.85" />

        {/* Foul lines */}
        {[BOUNDARIES[0], BOUNDARIES[BOUNDARIES.length - 1]].map((deg, i) => {
          const p = polar(FENCE_R, deg);
          return (
            <line key={i} x1={HP.x} y1={HP.y} x2={p.x} y2={p.y}
              stroke="white" strokeWidth="1.5" opacity="0.35" />
          );
        })}

        {/* Fence arc */}
        {(() => {
          const fl = polar(FENCE_R, -40);
          const fr = polar(FENCE_R, 40);
          return (
            <path
              d={`M${fl.x.toFixed(1)},${fl.y.toFixed(1)} A${FENCE_R},${FENCE_R},0,0,1,${fr.x.toFixed(1)},${fr.y.toFixed(1)}`}
              fill="none" stroke="#c9a535" strokeWidth="2" opacity="0.5"
            />
          );
        })()}

        {/* Zone separators */}
        {BOUNDARIES.slice(1, -1).map((deg, i) => {
          const p = polar(FENCE_R, deg);
          return (
            <line key={i} x1={HP.x} y1={HP.y} x2={p.x} y2={p.y}
              stroke="#ffffff" strokeWidth="0.5" opacity="0.1" strokeDasharray="4 4" />
          );
        })}

        {/* Zone labels */}
        {ZONE_KEYS.map((k, i) => {
          const midDeg = (BOUNDARIES[i] + BOUNDARIES[i + 1]) / 2;
          const p = polar(175, midDeg);
          const cnt = counts[k];
          return (
            <g key={k}>
              <text x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle"
                fill={cnt ? '#ffffffaa' : '#ffffff30'} fontSize="9" fontWeight="600">
                {ZONES[k].label}
              </text>
              {cnt ? (
                <text x={p.x} y={p.y + 11} textAnchor="middle" dominantBaseline="middle"
                  fill="#c9a535" fontSize="10" fontWeight="900">
                  {cnt}
                </text>
              ) : null}
            </g>
          );
        })}

        {/* Base paths */}
        <polygon
          points={`${HP.x},${HP.y} ${b1.x},${b1.y} ${b2.x},${b2.y} ${b3.x},${b3.y}`}
          fill="none" stroke="#ffffff40" strokeWidth="1"
        />

        {/* Bases */}
        {[b1, b2, b3].map((b, i) => (
          <rect key={i} x={b.x - 4} y={b.y - 4} width="8" height="8"
            fill="white" opacity="0.7"
            transform={`rotate(45 ${b.x} ${b.y})`}
          />
        ))}

        {/* Pitcher's mound */}
        <circle cx={pm.x} cy={pm.y} r="5" fill="#3d2a10" stroke="#ffffff20" strokeWidth="0.5" />

        {/* Home plate */}
        <polygon
          points={`${HP.x},${HP.y - 7} ${HP.x + 5},${HP.y - 2} ${HP.x + 4},${HP.y + 4} ${HP.x - 4},${HP.y + 4} ${HP.x - 5},${HP.y - 2}`}
          fill="white" opacity="0.75"
        />

        {/* IF zone label */}
        {counts['if'] ? (
          <text x={pm.x} y={pm.y - 14} textAnchor="middle"
            fill="#c9a535" fontSize="10" fontWeight="900">
            IF:{counts['if']}
          </text>
        ) : null}

        {/* ── Hit lines from home plate to landing spot ─────────────────────── */}
        {hits.map((d, i) => {
          const ground = isGround(d.type);
          const color = ground ? COLOR_GROUND : COLOR_AIR;
          const dash = ground ? '5 3' : undefined;
          return (
            <g key={i}>
              {/* Line from home plate */}
              <line
                x1={HP.x} y1={HP.y}
                x2={d.x}  y2={d.y}
                stroke={color}
                strokeWidth="2"
                strokeDasharray={dash}
                opacity="0.8"
              />
              {/* Glow halo at endpoint */}
              <circle cx={d.x} cy={d.y} r="6" fill={color} opacity="0.15" />
              {/* Endpoint dot */}
              <circle cx={d.x} cy={d.y} r="3.5"
                fill={color} opacity="0.95"
                stroke="white" strokeWidth="0.75"
              />
            </g>
          );
        })}

        {/* Empty state */}
        {hitZones.length === 0 && (
          <text x="170" y="160" textAnchor="middle" fill="#ffffff25" fontSize="11">
            No hit locations recorded yet
          </text>
        )}
      </svg>

      {/* Legend — always show when not compact */}
      {!compact && (
        <div className="flex justify-center gap-5 mt-2 text-xs text-muted">
          <div className="flex items-center gap-1.5">
            <svg width="22" height="6">
              <line x1="0" y1="3" x2="22" y2="3" stroke={COLOR_AIR} strokeWidth="2.5" />
            </svg>
            <span>Line drive / fly ball</span>
          </div>
          <div className="flex items-center gap-1.5">
            <svg width="22" height="6">
              <line x1="0" y1="3" x2="22" y2="3" stroke={COLOR_GROUND} strokeWidth="2.5" strokeDasharray="5 3" />
            </svg>
            <span>Ground ball</span>
          </div>
        </div>
      )}

      {/* Zone summary */}
      {!compact && Object.keys(counts).length > 0 && (
        <div className="flex justify-center gap-3 mt-2 flex-wrap text-xs text-muted">
          {Object.entries(counts).map(([z, n]) => (
            <span key={z}>
              <span className="text-accent font-bold">{n}</span>
              {' '}
              <span>{ZONES[z]?.desc || z.toUpperCase()}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
