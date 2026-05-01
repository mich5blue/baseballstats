import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getFeaturedStats, getGames, getTeams, getTeamStats } from '../api/client.js';

function formatDate(d) {
  if (!d) return '—';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getResult(game) {
  if (game.team_score === null || game.opponent_score === null) return null;
  if (game.team_score > game.opponent_score) return 'W';
  if (game.team_score < game.opponent_score) return 'L';
  return 'T';
}

function StatBadge({ label, value, color = 'text-white', size = 'text-3xl' }) {
  return (
    <div className="text-center">
      <div className={`font-mono font-black ${size} ${color}`}>{value ?? '---'}</div>
      <div className="text-muted text-xs uppercase tracking-wider mt-1">{label}</div>
    </div>
  );
}

function TeamTotalTile({ label, value, sub, color = 'text-white' }) {
  return (
    <div className="bg-surface rounded-lg p-3 text-center">
      <div className={`font-mono font-black text-2xl ${color}`}>{value ?? '—'}</div>
      <div className="text-muted text-xs uppercase tracking-wider mt-0.5">{label}</div>
      {sub && <div className="text-muted text-xs mt-0.5">{sub}</div>}
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [featured, setFeatured] = useState(null);
  const [games, setGames] = useState([]);
  const [battingLeaders, setBattingLeaders] = useState([]);
  const [pitchingLeaders, setPitchingLeaders] = useState([]);
  const [teamTotals, setTeamTotals] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getFeaturedStats().catch(() => null),
      getGames().catch(() => []),
      getTeams().catch(() => [])
    ]).then(async ([feat, allGames, teams]) => {
      setFeatured(feat);
      setGames(allGames.sort((a, b) => (b.game_date || '').localeCompare(a.game_date || '')));

      if (teams.length > 0) {
        try {
          const stats = await getTeamStats(teams[0].id);

          // Batting leaders — sorted by AVG, min 3 AB
          const batting = (stats.batting || [])
            .filter(p => p.ab >= 3)
            .sort((a, b) => parseFloat(b.avg) - parseFloat(a.avg))
            .slice(0, 5);

          // Pitching leaders — sorted by strike %, min 0.1 IP, show S% + WHIP
          const pitching = (stats.pitching || [])
            .filter(p => p.innings_pitched > 0 && p.pitches > 0)
            .map(p => ({
              ...p,
              strike_pct: p.pitches > 0 ? Math.round((p.strikes || 0) / p.pitches * 100) : 0,
            }))
            .sort((a, b) => b.strike_pct - a.strike_pct)
            .slice(0, 5);

          setBattingLeaders(batting);
          setPitchingLeaders(pitching);

          // Team season totals — sum all batting rows
          const bat = stats.batting || [];
          const pit = stats.pitching || [];
          const totalAB   = bat.reduce((s, p) => s + (p.ab || 0), 0);
          const totalH    = bat.reduce((s, p) => s + (p.hits || 0), 0);
          const totalR    = bat.reduce((s, p) => s + (p.runs || 0), 0);
          const totalRBI  = bat.reduce((s, p) => s + (p.rbi || 0), 0);
          const totalBB   = bat.reduce((s, p) => s + (p.walks || 0), 0);
          const totalK    = bat.reduce((s, p) => s + (p.strikeouts || 0), 0);
          const totalHR   = bat.reduce((s, p) => s + (p.home_runs || 0), 0);
          const totalSB   = bat.reduce((s, p) => s + (p.stolen_bases || 0), 0);
          const totalHBP  = bat.reduce((s, p) => s + (p.hit_by_pitch || 0), 0);
          const teamAVG   = totalAB > 0 ? (totalH / totalAB).toFixed(3).replace(/^0/, '') : '.000';
          const obpNum    = totalAB > 0 ? (totalH + totalBB + totalHBP) / (totalAB + totalBB + totalHBP) : 0;
          const teamOBP   = obpNum > 0 ? obpNum.toFixed(3).replace(/^0/, '') : '.000';

          // Pitching totals
          const totalPitches  = pit.reduce((s, p) => s + (p.pitches || 0), 0);
          const totalStrikes  = pit.reduce((s, p) => s + (p.strikes || 0), 0);
          const teamSPct      = totalPitches > 0 ? Math.round(totalStrikes / totalPitches * 100) : null;
          const totalPitchK   = pit.reduce((s, p) => s + (p.strikeouts || 0), 0);

          setTeamTotals({ totalR, totalH, totalRBI, totalHR, totalBB, totalK, totalSB, teamAVG, teamOBP, teamSPct, totalPitchK });
        } catch (_) {}
      }
      setLoading(false);
    });
  }, []);

  const wins = games.filter(g => getResult(g) === 'W').length;
  const losses = games.filter(g => getResult(g) === 'L').length;
  const recentGames = games.slice(0, 5);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 border-2 border-accent border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">

      {/* ── Team Hero Banner ─────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border border-accent/20"
        style={{ background: 'linear-gradient(135deg, #060c1e 0%, #0b1a3a 50%, #0f2040 100%)' }}>
        <div className="absolute right-0 top-0 bottom-0 opacity-[0.07] flex items-center pr-4 select-none pointer-events-none">
          <img src="/sluggers-s.svg" alt="" className="h-48 w-48" />
        </div>
        <div className="relative p-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div>
              <div className="text-accent text-xs uppercase tracking-widest font-semibold mb-1">2026 Season</div>
              <h1 className="text-5xl font-black text-white tracking-tight leading-none">
                Sluggers
                <span className="text-gold"> Hamly</span>
              </h1>
              <p className="text-muted mt-1">9U Travel Ball</p>
            </div>
            <div className="flex items-center gap-8">
              <div className="text-center">
                <div className="font-mono font-black text-5xl text-emerald-400">{wins}</div>
                <div className="text-muted text-xs uppercase tracking-wider mt-1">Wins</div>
              </div>
              <div className="text-muted text-3xl font-thin">–</div>
              <div className="text-center">
                <div className="font-mono font-black text-5xl text-red-400">{losses}</div>
                <div className="text-muted text-xs uppercase tracking-wider mt-1">Losses</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Featured Player ───────────────────────────────────────────────────── */}
      {featured && (
        <div className="card p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 bottom-0 w-1 bg-gold rounded-l" />
          <div className="pl-4">
            <div className="flex items-start justify-between flex-wrap gap-4 mb-5">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-gold text-xs uppercase tracking-widest font-semibold">Featured Player</span>
                  <span className="text-gold">★</span>
                </div>
                <h2 className="text-3xl font-black text-white">{featured.player.name}</h2>
                {featured.player.nickname && <p className="text-muted">"{featured.player.nickname}"</p>}
                <div className="flex items-center gap-3 mt-1 text-sm text-muted flex-wrap">
                  {featured.player.position && <span className="badge bg-accent/20 text-accent">{featured.player.position}</span>}
                  <span>Bats {featured.player.bats} · Throws {featured.player.throws}</span>
                </div>
              </div>
              <Link to={`/players/${featured.player.id}`} className="btn-secondary text-sm">
                View Profile →
              </Link>
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-4">
              <StatBadge label="AVG" value={featured.stats?.avg} color="text-accent" />
              <StatBadge label="OBP" value={featured.stats?.obp} color="text-gold" />
              <StatBadge label="SLG" value={featured.stats?.slg} color="text-blue-400" />
              <StatBadge label="OPS" value={featured.stats?.ops} color="text-purple-400" />
              <StatBadge label="HR" value={featured.stats?.home_runs ?? 0} color="text-accent" />
              <StatBadge label="RBI" value={featured.stats?.rbi ?? 0} color="text-gold" />
              <StatBadge label="G" value={featured.stats?.games ?? 0} color="text-muted" size="text-2xl" />
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* ── Left column: Recent Games + Team Season Totals ─────────────────── */}
        <div className="space-y-6">

          {/* Recent Games */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">Recent Games</h2>
              <Link to="/games" className="text-accent text-sm hover:underline">All games →</Link>
            </div>
            {recentGames.length === 0 ? (
              <div className="card p-8 text-center">
                <p className="text-muted text-sm mb-3">No games logged yet.</p>
                <Link to="/import" className="btn-primary text-sm">Import Box Score</Link>
              </div>
            ) : (
              <div className="space-y-2">
                {recentGames.map(game => {
                  const result = getResult(game);
                  return (
                    <button key={game.id} onClick={() => navigate(`/games/${game.id}`)}
                      className="w-full card p-4 flex items-center justify-between hover:border-accent/30 transition-all group text-left">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-black text-base flex-shrink-0 ${
                          result === 'W' ? 'bg-emerald-900/50 text-emerald-400' :
                          result === 'L' ? 'bg-red-900/50 text-red-400' : 'bg-surface2 text-muted'
                        }`}>
                          {result || '?'}
                        </div>
                        <div>
                          <div className="font-semibold text-white text-sm group-hover:text-accent transition-colors">
                            vs {game.opponent}
                          </div>
                          <div className="text-muted text-xs">{formatDate(game.game_date)} · {game.home_away}</div>
                        </div>
                      </div>
                      {game.team_score !== null && (
                        <div className="font-mono font-bold text-white">
                          {game.team_score} – {game.opponent_score}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Team Season Totals */}
          {teamTotals && (
            <div>
              <h2 className="text-lg font-bold text-white mb-3">Team Season Totals</h2>
              <div className="card p-4 space-y-4">
                <div>
                  <div className="text-muted text-xs uppercase tracking-widest mb-2">Batting</div>
                  <div className="grid grid-cols-4 gap-2">
                    <TeamTotalTile label="AVG" value={teamTotals.teamAVG} color="text-accent" />
                    <TeamTotalTile label="OBP" value={teamTotals.teamOBP} color="text-gold" />
                    <TeamTotalTile label="Runs" value={teamTotals.totalR} color="text-emerald-400" />
                    <TeamTotalTile label="RBI" value={teamTotals.totalRBI} color="text-gold" />
                    <TeamTotalTile label="Hits" value={teamTotals.totalH} color="text-white" />
                    <TeamTotalTile label="HR" value={teamTotals.totalHR} color="text-accent" />
                    <TeamTotalTile label="BB" value={teamTotals.totalBB} color="text-blue-400" />
                    <TeamTotalTile label="SB" value={teamTotals.totalSB} color="text-purple-400" />
                  </div>
                </div>
                <div className="border-t border-border pt-4">
                  <div className="text-muted text-xs uppercase tracking-widest mb-2">Pitching</div>
                  <div className="grid grid-cols-3 gap-2">
                    <TeamTotalTile label="K's" value={teamTotals.totalPitchK} color="text-gold" />
                    <TeamTotalTile label="Strike %" value={teamTotals.teamSPct !== null ? teamTotals.teamSPct + '%' : '—'}
                      color={teamTotals.teamSPct >= 60 ? 'text-emerald-400' : teamTotals.teamSPct >= 50 ? 'text-white' : 'text-red-400'} />
                    <TeamTotalTile label="Opp K's" value={teamTotals.totalK} color="text-muted" />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Right column: Batting + Pitching Leaders ──────────────────────── */}
        <div className="space-y-6">

          {/* Batting Leaders */}
          {battingLeaders.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <span className="text-accent text-base">⚾</span> Batting Leaders
                </h2>
                <Link to="/stats" className="text-accent text-sm hover:underline">Full stats →</Link>
              </div>
              <div className="space-y-2">
                {battingLeaders.map((p, i) => (
                  <Link key={p.player_id} to={`/players/${p.player_id}`}
                    className="card p-3 flex items-center justify-between hover:border-accent/30 transition-all group">
                    <div className="flex items-center gap-3">
                      <span className="text-muted text-xs w-4 font-mono">{i + 1}</span>
                      <div>
                        <div className="text-white text-sm font-semibold group-hover:text-accent transition-colors">
                          {p.player_name}
                        </div>
                        <div className="text-muted text-xs">{p.games}G · {p.ab}AB · {p.hits}H</div>
                      </div>
                    </div>
                    <div className="flex gap-4 text-right">
                      <div>
                        <div className="font-mono font-bold text-accent">{p.avg}</div>
                        <div className="text-muted text-xs">AVG</div>
                      </div>
                      <div>
                        <div className="font-mono text-gold">{p.ops}</div>
                        <div className="text-muted text-xs">OPS</div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Pitching Leaders — sorted by Strike %, showing S% + WHIP */}
          {pitchingLeaders.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <span className="text-gold text-base">💪</span> Pitching Leaders
                </h2>
                <Link to="/stats" className="text-gold text-sm hover:underline">Full stats →</Link>
              </div>
              <div className="space-y-2">
                {pitchingLeaders.map((p, i) => (
                  <Link key={p.player_id} to={`/players/${p.player_id}`}
                    className="card p-3 flex items-center justify-between hover:border-accent/30 transition-all group">
                    <div className="flex items-center gap-3">
                      <span className="text-muted text-xs w-4 font-mono">{i + 1}</span>
                      <div>
                        <div className="text-white text-sm font-semibold group-hover:text-accent transition-colors">
                          {p.player_name}
                        </div>
                        <div className="text-muted text-xs">{p.innings_pitched?.toFixed(1)} IP · {p.strikeouts}K · {p.pitches}P</div>
                      </div>
                    </div>
                    <div className="flex gap-4 text-right">
                      <div>
                        <div className={`font-mono font-bold ${p.strike_pct >= 60 ? 'text-emerald-400' : p.strike_pct < 50 ? 'text-red-400' : 'text-white'}`}>
                          {p.strike_pct}%
                        </div>
                        <div className="text-muted text-xs">S%</div>
                      </div>
                      <div>
                        <div className="font-mono text-gold">{p.whip}</div>
                        <div className="text-muted text-xs">WHIP</div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
