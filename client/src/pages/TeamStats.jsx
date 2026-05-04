import React, { useState, useMemo } from 'react';
import BaseballSpinner from '../components/BaseballSpinner.jsx';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTeam, useTeamPath } from '../context/TeamContext.jsx';
import { getTeamStats, getGames } from '../api/client.js';
import SortableTable from '../components/SortableTable.jsx';
import {
  IcoBaseball, IcoDiamond, IcoHomePlate, IcoRunner, IcoFourBalls,
  IcoBatContact, IcoBases, IcoSteal, IcoFlame, IcoStrikeout, IcoPitcher,
} from '../components/Icons.jsx';

// ── Helpers ───────────────────────────────────────────────────────────────────

function calcTeamBatting(rows) {
  if (!rows.length) return null;
  const t = rows.reduce((acc, r) => {
    ['ab','hits','singles','doubles','triples','home_runs','rbi','runs',
     'walks','strikeouts','hit_by_pitch','sac_fly','sac_bunt','stolen_bases','caught_stealing','games'
    ].forEach(f => acc[f] = (acc[f] || 0) + (Number(r[f]) || 0));
    return acc;
  }, {});
  const obpDenom = t.ab + t.walks + t.hit_by_pitch + t.sac_fly;
  t.avg  = t.ab > 0 ? (t.hits / t.ab).toFixed(3) : '---';
  t.obp  = obpDenom > 0 ? ((t.hits + t.walks + t.hit_by_pitch) / obpDenom).toFixed(3) : '---';
  t.slg  = t.ab > 0 ? ((t.singles + 2*t.doubles + 3*t.triples + 4*t.home_runs) / t.ab).toFixed(3) : '---';
  t.ops  = t.obp !== '---' && t.slg !== '---'
    ? (parseFloat(t.obp) + parseFloat(t.slg)).toFixed(3) : '---';
  return t;
}

function calcTeamPitching(rows) {
  if (!rows.length) return null;
  const t = rows.reduce((acc, r) => {
    ['innings_pitched','hits_allowed','runs_allowed','earned_runs','walks',
     'strikeouts','home_runs_allowed','pitches','strikes','wins','losses','saves','games'
    ].forEach(f => acc[f] = (acc[f] || 0) + (Number(r[f]) || 0));
    // Only count pitches from games where strikes were tracked
    acc.pitches_tracked = (acc.pitches_tracked || 0) + ((Number(r.strikes) || 0) > 0 ? (Number(r.pitches) || 0) : 0);
    return acc;
  }, {});
  t.era  = t.innings_pitched > 0 ? ((t.earned_runs / t.innings_pitched) * 9).toFixed(2) : '---';
  t.whip = t.innings_pitched > 0 ? ((t.walks + t.hits_allowed) / t.innings_pitched).toFixed(2) : '---';
  return t;
}

function statFmt(val, decimals = 3) {
  if (val === null || val === undefined || val === '---') return '---';
  const n = parseFloat(val);
  if (isNaN(n)) return '---';
  return n.toFixed(decimals);
}

function LeaderCard({ label, icon: Icon, players, statKey, statLabel, format, higherBetter = true, link = true, tp = x => x }) {
  const sorted = [...players]
    .filter(p => p[statKey] !== null && p[statKey] !== undefined && p[statKey] !== '---')
    .sort((a, b) => higherBetter
      ? parseFloat(b[statKey]) - parseFloat(a[statKey])
      : parseFloat(a[statKey]) - parseFloat(b[statKey])
    )
    .slice(0, 5);

  if (!sorted.length) return null;

  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 mb-3">
        {Icon && <Icon className="w-4 h-4 text-accent flex-shrink-0" />}
        <span className="text-xs font-bold tracking-widest uppercase text-muted">{label}</span>
      </div>
      <div className="space-y-2">
        {sorted.map((p, i) => (
          <div key={p.player_id} className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className={`text-xs font-black w-4 flex-shrink-0 ${i === 0 ? 'text-gold' : 'text-muted'}`}>
                {i + 1}
              </span>
              {link ? (
                <Link to={tp(`/players/${p.player_id}`)}
                  className={`text-sm truncate font-semibold hover:text-accent transition-colors ${i === 0 ? 'text-white' : 'text-muted'}`}>
                  {p.player_name}
                </Link>
              ) : (
                <span className={`text-sm truncate font-semibold ${i === 0 ? 'text-white' : 'text-muted'}`}>
                  {p.player_name}
                </span>
              )}
            </div>
            <span className={`font-mono font-bold text-sm flex-shrink-0 ${i === 0 ? 'text-accent' : 'text-muted'}`}>
              {format ? format(p[statKey]) : p[statKey]}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-2 pt-2 border-t border-border/50">
        <span className="text-xs text-muted/60">{statLabel}</span>
      </div>
    </div>
  );
}

function StatBubble({ label, value, sub, accent }) {
  return (
    <div className="card p-4 text-center">
      <div className={`text-3xl font-black ${accent || 'text-white'}`}>{value}</div>
      <div className="text-xs font-bold tracking-widest uppercase text-muted mt-0.5">{label}</div>
      {sub && <div className="text-xs text-muted/60 mt-0.5">{sub}</div>}
    </div>
  );
}

// ── Totals row component ──────────────────────────────────────────────────────
function TotalsRow({ data, columns }) {
  return (
    <tr className="border-t-2 border-accent/40 bg-accent/5">
      {columns.map((col, ci) => {
        const key = col.accessorKey || col.id;
        const val = data[key];
        const cellClass = 'px-3 py-2.5 text-right text-xs font-bold text-accent whitespace-nowrap';
        if (ci === 0) return (
          <td key={ci} className="px-3 py-2.5 text-left text-xs font-black text-accent tracking-widest uppercase whitespace-nowrap">
            TEAM
          </td>
        );
        if (val === undefined || val === null) return <td key={ci} className={cellClass}>—</td>;
        if (col.totalsCell) return <td key={ci} className={cellClass}>{col.totalsCell(val)}</td>;
        return <td key={ci} className={cellClass}>{val}</td>;
      })}
    </tr>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function TeamStats() {
  const { teamId, team: currentTeam } = useTeam();
  const tp = useTeamPath();
  const [tab, setTab] = useState('batting');

  const { data: stats = { batting: [], pitching: [] }, isLoading: statsLoading } = useQuery({
    queryKey: ['team', teamId, 'stats'],
    queryFn: () => getTeamStats(teamId),
    enabled: !!teamId,
  });
  const { data: games = [], isLoading: gamesLoading } = useQuery({
    queryKey: ['games', teamId],
    queryFn: () => getGames(teamId),
    enabled: !!teamId,
  });
  const loading = statsLoading || gamesLoading;

  // ── Derived numbers ─────────────────────────────────────────────────────────
  const record = useMemo(() => {
    const played = games.filter(g => g.team_score !== null && g.opponent_score !== null);
    const w = played.filter(g => g.team_score > g.opponent_score).length;
    const l = played.filter(g => g.team_score < g.opponent_score).length;
    const t2 = played.filter(g => g.team_score === g.opponent_score).length;
    const runsFor = played.reduce((s, g) => s + (g.team_score || 0), 0);
    const runsAgainst = played.reduce((s, g) => s + (g.opponent_score || 0), 0);
    return { w, l, t: t2, played: played.length, runsFor, runsAgainst };
  }, [games]);

  const teamBat  = useMemo(() => calcTeamBatting(stats.batting), [stats.batting]);
  const teamPitch = useMemo(() => calcTeamPitching(stats.pitching), [stats.pitching]);

  // Enrich batting rows with derived counting stats for leader cards
  const battingEnriched = useMemo(() => stats.batting.map(p => ({
    ...p,
    xbh: (Number(p.doubles) || 0) + (Number(p.triples) || 0) + (Number(p.home_runs) || 0),
    tb:  (Number(p.singles) || 0)
       + (Number(p.doubles) || 0) * 2
       + (Number(p.triples) || 0) * 3
       + (Number(p.home_runs) || 0) * 4,
  })), [stats.batting]);

  const hasStolenBases = useMemo(() =>
    stats.batting.some(p => (Number(p.stolen_bases) || 0) > 0),
  [stats.batting]);

  // ── Batting columns ─────────────────────────────────────────────────────────
  const battingCols = useMemo(() => [
    { header: 'Player', accessorKey: 'player_name', defaultSort: false,
      cell: i => (
        <Link to={tp(`/players/${i.row.original.player_id}`)}
          className="text-white hover:text-accent font-semibold whitespace-nowrap">
          {i.getValue()}
        </Link>
      )
    },
    { header: 'G',   accessorKey: 'games' },
    { header: 'AB',  accessorKey: 'ab' },
    { header: 'R',   accessorKey: 'runs' },
    { header: 'H',   accessorKey: 'hits' },
    { header: '2B',  accessorKey: 'doubles' },
    { header: '3B',  accessorKey: 'triples' },
    { header: 'HR',  accessorKey: 'home_runs',
      cell: i => <span className={i.getValue() > 0 ? 'text-accent font-bold' : ''}>{i.getValue()}</span>,
      totalsCell: v => <span className={v > 0 ? 'text-accent' : ''}>{v}</span>
    },
    { header: 'RBI', accessorKey: 'rbi',
      cell: i => <span className={i.getValue() > 0 ? 'text-gold' : ''}>{i.getValue()}</span>,
      totalsCell: v => <span className={v > 0 ? 'text-gold' : ''}>{v}</span>
    },
    { header: 'BB',  accessorKey: 'walks' },
    { header: 'K',   accessorKey: 'strikeouts' },
    { header: 'SB',  accessorKey: 'stolen_bases' },
    { header: 'HBP', accessorKey: 'hit_by_pitch' },
    { header: 'AVG', accessorKey: 'avg',
      cell: i => <span className="font-mono font-bold text-accent">{i.getValue()}</span>,
      totalsCell: v => <span className="text-accent">{v}</span>
    },
    { header: 'OBP', accessorKey: 'obp',
      cell: i => <span className="font-mono">{i.getValue()}</span>
    },
    { header: 'SLG', accessorKey: 'slg',
      cell: i => <span className="font-mono">{i.getValue()}</span>
    },
    { header: 'OPS', accessorKey: 'ops',
      cell: i => <span className={`font-mono font-bold ${parseFloat(i.getValue()) >= 0.9 ? 'text-emerald-400' : parseFloat(i.getValue()) >= 0.7 ? 'text-gold' : 'text-white'}`}>{i.getValue()}</span>,
      totalsCell: v => <span>{v}</span>
    },
  ], []);

  // ── Pitching columns ─────────────────────────────────────────────────────────
  const pitchingCols = useMemo(() => [
    { header: 'Player', accessorKey: 'player_name', defaultSort: false,
      cell: i => (
        <Link to={tp(`/players/${i.row.original.player_id}`)}
          className="text-white hover:text-accent font-semibold whitespace-nowrap">
          {i.getValue()}
        </Link>
      )
    },
    { header: 'G',   accessorKey: 'games' },
    { header: 'W',   accessorKey: 'wins',
      cell: i => <span className="text-emerald-400 font-bold">{i.getValue()}</span>,
      totalsCell: v => <span className="text-emerald-400">{v}</span>
    },
    { header: 'L',   accessorKey: 'losses',
      cell: i => <span className="text-red-400">{i.getValue()}</span>,
      totalsCell: v => <span className="text-red-400">{v}</span>
    },
    { header: 'SV',  accessorKey: 'saves' },
    { header: 'IP',  accessorKey: 'innings_pitched',
      cell: i => <span className="font-mono">{(i.getValue() || 0).toFixed(1)}</span>,
      totalsCell: v => <span className="font-mono">{v.toFixed(1)}</span>
    },
    { header: 'H',   accessorKey: 'hits_allowed' },
    { header: 'R',   accessorKey: 'runs_allowed' },
    { header: 'ER',  accessorKey: 'earned_runs' },
    { header: 'BB',  accessorKey: 'walks' },
    { header: 'K',   accessorKey: 'strikeouts',
      cell: i => <span className="text-gold font-bold">{i.getValue()}</span>,
      totalsCell: v => <span className="text-gold">{v}</span>
    },
    { header: 'HR',  accessorKey: 'home_runs_allowed' },
    { header: 'S%',  id: 'spct',
      accessorFn: r => r.pitches_tracked > 0 ? Math.round((r.strikes || 0) / r.pitches_tracked * 100) : null,
      cell: i => {
        const v = i.getValue();
        return <span className={`font-mono ${v >= 60 ? 'text-emerald-400' : v < 50 ? 'text-red-400' : 'text-white'}`}>
          {v !== null ? v + '%' : '—'}
        </span>;
      },
      totalsCell: v => {
        const pct = teamPitch?.pitches_tracked > 0
          ? Math.round((teamPitch.strikes || 0) / teamPitch.pitches_tracked * 100) : null;
        return <span>{pct !== null ? pct + '%' : '—'}</span>;
      }
    },
    { header: 'ERA', accessorKey: 'era',
      cell: i => <span className={`font-mono font-bold ${parseFloat(i.getValue()) < 3 ? 'text-emerald-400' : parseFloat(i.getValue()) > 6 ? 'text-red-400' : 'text-accent'}`}>{i.getValue()}</span>,
      totalsCell: v => <span className="font-mono">{v}</span>
    },
    { header: 'WHIP', accessorKey: 'whip',
      cell: i => <span className={`font-mono ${parseFloat(i.getValue()) < 1.2 ? 'text-emerald-400' : parseFloat(i.getValue()) > 1.8 ? 'text-red-400' : 'text-white'}`}>{i.getValue()}</span>,
      totalsCell: v => <span className="font-mono">{v}</span>
    },
  ], [teamPitch]);

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

      {/* Header + team selector */}
      <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-black text-white">Team Stats</h1>
          {currentTeam && (
            <p className="text-muted text-sm mt-0.5">
              {currentTeam.name}
              {currentTeam.season ? ` · ${currentTeam.season}` : ''}
              {currentTeam.league ? ` · ${currentTeam.league}` : ''}
            </p>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <BaseballSpinner size="md" />
        </div>
      ) : (
        <>
          {/* ── Record & key totals ─────────────────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
            <div className="card p-4 text-center col-span-2 sm:col-span-1 lg:col-span-1">
              <div className="text-3xl font-black text-white">
                {record.w}–{record.l}{record.t > 0 ? `–${record.t}` : ''}
              </div>
              <div className="text-xs font-bold tracking-widest uppercase text-muted mt-0.5">Record</div>
              <div className="text-xs text-muted/60 mt-0.5">{record.played} games</div>
            </div>

            <StatBubble label="Runs Scored" value={record.runsFor} accent="text-emerald-400" />
            <StatBubble label="Runs Allowed" value={record.runsAgainst} accent="text-red-400" />

            {teamBat && <>
              <StatBubble label="Team AVG"  value={teamBat.avg}  accent="text-accent"  sub={`${teamBat.hits} H / ${teamBat.ab} AB`} />
              <StatBubble label="Team OPS"  value={teamBat.ops}  accent="text-gold" />
              <StatBubble label="Team RBI"  value={teamBat.rbi} />
              <StatBubble label="Team SB"   value={teamBat.stolen_bases} />
            </>}
          </div>

          {/* ── Stat leaders ────────────────────────────────────────────────── */}
          {(stats.batting.length > 0 || stats.pitching.length > 0) && (
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-3 mb-6">
              <LeaderCard tp={tp} label="AVG"   icon={IcoBaseball}   players={battingEnriched} statKey="avg"          statLabel="Batting Average" />
              <LeaderCard tp={tp} label="OBP"   icon={IcoDiamond}    players={battingEnriched} statKey="obp"          statLabel="On-Base %" />
              <LeaderCard tp={tp} label="RBI"   icon={IcoHomePlate}  players={battingEnriched} statKey="rbi"          statLabel="Runs Batted In" />
              <LeaderCard tp={tp} label="R"     icon={IcoRunner}     players={battingEnriched} statKey="runs"         statLabel="Runs Scored" />
              <LeaderCard tp={tp} label="BB"    icon={IcoFourBalls}  players={battingEnriched} statKey="walks"        statLabel="Walks" />
              <LeaderCard tp={tp} label="XBH"   icon={IcoBatContact} players={battingEnriched} statKey="xbh"          statLabel="Extra Base Hits" />
              <LeaderCard tp={tp} label="TB"    icon={IcoBases}      players={battingEnriched} statKey="tb"           statLabel="Total Bases" />
              {hasStolenBases && (
                <LeaderCard tp={tp} label="SB"  icon={IcoSteal}      players={battingEnriched} statKey="stolen_bases" statLabel="Stolen Bases" />
              )}
              {stats.pitching.length > 0 && <>
                <LeaderCard tp={tp} label="ERA" icon={IcoFlame}      players={stats.pitching}  statKey="era"          statLabel="Earned Run Avg" higherBetter={false} format={v => parseFloat(v).toFixed(2)} />
                <LeaderCard tp={tp} label="K"   icon={IcoStrikeout}  players={stats.pitching}  statKey="strikeouts"   statLabel="Strikeouts" />
              </>}
            </div>
          )}

          {/* ── Tabs ────────────────────────────────────────────────────────── */}
          <div className="flex border-b border-border mb-1 gap-6">
            {['batting', 'pitching'].map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`pb-3 text-sm font-medium capitalize ${tab === t ? 'tab-active' : 'tab-inactive'}`}>
                {t === 'batting'
                  ? <span className="flex items-center gap-1.5"><IcoBaseball className="w-4 h-4" /> Batting</span>
                  : <span className="flex items-center gap-1.5"><IcoPitcher className="w-4 h-4" /> Pitching</span>
                }
              </button>
            ))}
          </div>

          {/* ── Batting table ────────────────────────────────────────────────── */}
          {tab === 'batting' && (
            stats.batting.length === 0 ? (
              <div className="card p-12 text-center">
                <p className="text-muted">No batting stats recorded yet.</p>
              </div>
            ) : (
              <SortableTable
                columns={battingCols}
                data={stats.batting}
                defaultSortField="avg"
                defaultSortDesc={true}
                footerRow={teamBat ? <TotalsRow data={teamBat} columns={battingCols} /> : null}
              />
            )
          )}

          {/* ── Pitching table ───────────────────────────────────────────────── */}
          {tab === 'pitching' && (
            stats.pitching.length === 0 ? (
              <div className="card p-12 text-center">
                <p className="text-muted">No pitching stats recorded yet.</p>
              </div>
            ) : (
              <SortableTable
                columns={pitchingCols}
                data={stats.pitching}
                defaultSortField="era"
                defaultSortDesc={false}
                footerRow={teamPitch ? <TotalsRow data={teamPitch} columns={pitchingCols} /> : null}
              />
            )
          )}
        </>
      )}
    </div>
  );
}
