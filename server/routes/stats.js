const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');

function calcBattingStats(row) {
  const ab = row.ab || 0;
  const hits = row.hits || 0;
  const walks = row.walks || 0;
  const hbp = row.hit_by_pitch || 0;
  const sf = row.sac_fly || 0;
  const singles = row.singles || 0;
  const doubles = row.doubles || 0;
  const triples = row.triples || 0;
  const hr = row.home_runs || 0;

  const avg = ab > 0 ? (hits / ab).toFixed(3) : '---';
  const obpDenom = ab + walks + hbp + sf;
  const obp = obpDenom > 0 ? ((hits + walks + hbp) / obpDenom).toFixed(3) : '---';
  const slg = ab > 0 ? ((singles + 2 * doubles + 3 * triples + 4 * hr) / ab).toFixed(3) : '---';
  const ops = obp !== '---' && slg !== '---'
    ? (parseFloat(obp) + parseFloat(slg)).toFixed(3)
    : '---';

  return { avg, obp, slg, ops };
}

function calcPitchingStats(row) {
  const ip = row.innings_pitched || 0;
  const er = row.earned_runs || 0;
  const walks = row.walks || 0;
  const hits = row.hits_allowed || 0;

  const era = ip > 0 ? ((er / ip) * 9).toFixed(2) : '---';
  const whip = ip > 0 ? ((walks + hits) / ip).toFixed(2) : '---';

  return { era, whip };
}

// GET aggregate stats for all players on a team
router.get('/team/:teamId', async (req, res) => {
  try {
    const db = getDb();
    const { teamId } = req.params;

    const battingRows = await db.all(`
      SELECT
        p.id as player_id,
        p.name as player_name,
        p.position,
        COUNT(DISTINCT ab.game_id) as games,
        SUM(ab.ab) as ab,
        SUM(ab.hits) as hits,
        SUM(ab.singles) as singles,
        SUM(ab.doubles) as doubles,
        SUM(ab.triples) as triples,
        SUM(ab.home_runs) as home_runs,
        SUM(ab.rbi) as rbi,
        SUM(ab.runs) as runs,
        SUM(ab.walks) as walks,
        SUM(ab.strikeouts) as strikeouts,
        SUM(ab.hit_by_pitch) as hit_by_pitch,
        SUM(ab.sac_fly) as sac_fly,
        SUM(ab.sac_bunt) as sac_bunt,
        SUM(ab.stolen_bases) as stolen_bases,
        SUM(ab.caught_stealing) as caught_stealing
      FROM players p
      JOIN at_bats ab ON p.id = ab.player_id
      WHERE ab.team_id = ?
      GROUP BY p.id
      ORDER BY p.name
    `, [teamId]);

    const batting = battingRows.map(row => ({ ...row, ...calcBattingStats(row) }));

    const pitchingRows = await db.all(`
      SELECT
        p.id as player_id,
        p.name as player_name,
        COUNT(DISTINCT ps.game_id) as games,
        SUM(ps.innings_pitched) as innings_pitched,
        SUM(ps.hits_allowed) as hits_allowed,
        SUM(ps.runs_allowed) as runs_allowed,
        SUM(ps.earned_runs) as earned_runs,
        SUM(ps.walks) as walks,
        SUM(ps.strikeouts) as strikeouts,
        SUM(ps.home_runs_allowed) as home_runs_allowed,
        SUM(ps.pitches) as pitches,
        SUM(ps.strikes) as strikes,
        SUM(CASE WHEN ps.strikes > 0 THEN ps.pitches ELSE 0 END) as pitches_tracked,
        SUM(ps.win) as wins,
        SUM(ps.loss) as losses,
        SUM(ps.save_stat) as saves
      FROM players p
      JOIN pitching_stats ps ON p.id = ps.player_id
      WHERE ps.team_id = ?
      GROUP BY p.id
      ORDER BY ps.innings_pitched DESC
    `, [teamId]);

    const pitching = pitchingRows.map(row => ({ ...row, ...calcPitchingStats(row) }));

    res.json({ batting, pitching });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET per-team breakdown + overall totals for one player
router.get('/player/:playerId', async (req, res) => {
  try {
    const db = getDb();
    const { playerId } = req.params;

    const player = await db.get('SELECT * FROM players WHERE id = ?', [playerId]);
    if (!player) return res.status(404).json({ error: 'Player not found' });

    const teams = await db.all(`
      SELECT t.*, pt.jersey_number, pt.position as team_position
      FROM teams t
      JOIN player_teams pt ON t.id = pt.team_id
      WHERE pt.player_id = ?
    `, [playerId]);

    // Per-team batting — parallel fetch with Promise.all
    const teamBattingStats = await Promise.all(teams.map(async team => {
      const rows = await db.all(`
        SELECT ab.*, g.opponent, g.game_date, g.team_score, g.opponent_score
        FROM at_bats ab
        JOIN games g ON ab.game_id = g.id
        WHERE ab.player_id = ? AND ab.team_id = ?
        ORDER BY g.game_date
      `, [playerId, team.id]);

      const totals = rows.reduce((acc, row) => {
        ['ab', 'hits', 'singles', 'doubles', 'triples', 'home_runs', 'rbi', 'runs',
          'walks', 'strikeouts', 'hit_by_pitch', 'sac_fly', 'sac_bunt', 'stolen_bases', 'caught_stealing'
        ].forEach(f => acc[f] = (acc[f] || 0) + (row[f] || 0));
        return acc;
      }, {});

      return {
        team,
        games: rows.map(row => ({ ...row, ...calcBattingStats(row) })),
        totals: { ...totals, ...calcBattingStats(totals), games: rows.length },
      };
    }));

    const overallBatting = await db.get(`
      SELECT
        SUM(ab) as ab, SUM(hits) as hits, SUM(singles) as singles,
        SUM(doubles) as doubles, SUM(triples) as triples,
        SUM(home_runs) as home_runs, SUM(rbi) as rbi, SUM(runs) as runs,
        SUM(walks) as walks, SUM(strikeouts) as strikeouts,
        SUM(hit_by_pitch) as hit_by_pitch, SUM(sac_fly) as sac_fly,
        SUM(sac_bunt) as sac_bunt, SUM(stolen_bases) as stolen_bases,
        SUM(caught_stealing) as caught_stealing,
        COUNT(DISTINCT game_id) as games
      FROM at_bats WHERE player_id = ?
    `, [playerId]);

    // Per-team pitching — parallel fetch
    const teamPitchingStats = await Promise.all(teams.map(async team => {
      const rows = await db.all(`
        SELECT ps.*, g.opponent, g.game_date
        FROM pitching_stats ps
        JOIN games g ON ps.game_id = g.id
        WHERE ps.player_id = ? AND ps.team_id = ?
        ORDER BY g.game_date
      `, [playerId, team.id]);

      const totals = rows.reduce((acc, row) => {
        ['innings_pitched', 'hits_allowed', 'runs_allowed', 'earned_runs', 'walks',
          'strikeouts', 'home_runs_allowed', 'pitches', 'strikes', 'win', 'loss', 'save_stat'
        ].forEach(f => acc[f] = (acc[f] || 0) + (row[f] || 0));
        // Only count pitches from games where strikes were tracked
        acc.pitches_tracked = (acc.pitches_tracked || 0) + ((row.strikes || 0) > 0 ? (row.pitches || 0) : 0);
        return acc;
      }, {});

      return {
        team,
        games: rows.map(row => ({ ...row, ...calcPitchingStats(row) })),
        totals: { ...totals, ...calcPitchingStats(totals), games: rows.length },
      };
    }));

    const overallPitching = await db.get(`
      SELECT
        SUM(innings_pitched) as innings_pitched, SUM(hits_allowed) as hits_allowed,
        SUM(runs_allowed) as runs_allowed, SUM(earned_runs) as earned_runs,
        SUM(walks) as walks, SUM(strikeouts) as strikeouts,
        SUM(home_runs_allowed) as home_runs_allowed, SUM(pitches) as pitches,
        SUM(strikes) as strikes,
        SUM(CASE WHEN strikes > 0 THEN pitches ELSE 0 END) as pitches_tracked,
        SUM(win) as wins, SUM(loss) as losses, SUM(save_stat) as saves,
        COUNT(DISTINCT game_id) as games
      FROM pitching_stats WHERE player_id = ?
    `, [playerId]);

    res.json({
      player,
      teams,
      batting: {
        byTeam: teamBattingStats,
        overall: { ...overallBatting, ...calcBattingStats(overallBatting || {}) },
      },
      pitching: {
        byTeam: teamPitchingStats,
        overall: { ...overallPitching, ...calcPitchingStats(overallPitching || {}) },
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET featured player stats (for dashboard)
router.get('/featured', async (req, res) => {
  try {
    const db = getDb();
    const player = await db.get('SELECT * FROM players WHERE is_featured = 1 LIMIT 1', []);
    if (!player) return res.json(null);

    const batting = await db.get(`
      SELECT
        SUM(ab) as ab, SUM(hits) as hits, SUM(singles) as singles,
        SUM(doubles) as doubles, SUM(triples) as triples,
        SUM(home_runs) as home_runs, SUM(rbi) as rbi, SUM(runs) as runs,
        SUM(walks) as walks, SUM(strikeouts) as strikeouts,
        SUM(hit_by_pitch) as hit_by_pitch, SUM(sac_fly) as sac_fly,
        COUNT(DISTINCT game_id) as games
      FROM at_bats WHERE player_id = ?
    `, [player.id]);

    res.json({ player, stats: { ...batting, ...calcBattingStats(batting || {}) } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
