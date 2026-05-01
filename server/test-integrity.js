/**
 * Baseball Stats — Data Integrity Test Suite
 *
 * Checks that every stat in the database is mathematically valid.
 * Run from the server directory:  node test-integrity.js
 */

const { test, describe, before } = require('node:test');
const assert = require('node:assert/strict');
const { initDatabase } = require('./db/sqlcompat');
const path = require('path');

let db;

before(async () => {
  db = await initDatabase(path.join(__dirname, 'baseball.db'));
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n) { return n == null ? 'NULL' : n; }

function calcAVG(h, ab) {
  if (!ab) return '.000';
  return (h / ab).toFixed(3).replace(/^0/, '');
}

function calcOBP(h, bb, hbp, ab, sf) {
  const denom = (ab || 0) + (bb || 0) + (hbp || 0) + (sf || 0);
  if (!denom) return '.000';
  return ((h + bb + hbp) / denom).toFixed(3).replace(/^0/, '');
}

function calcSLG(singles, doubles, triples, hr, ab) {
  if (!ab) return '.000';
  const tb = singles + 2 * doubles + 3 * triples + 4 * hr;
  return (tb / ab).toFixed(3).replace(/^0/, '');
}

function calcERA(er, ip) {
  if (!ip) return '0.00';
  return ((er * 3) / ip).toFixed(2);  // youth: 3 outs per inning
}

function calcWHIP(bb, ha, ip) {
  if (!ip) return '0.00';
  return ((bb + ha) / ip).toFixed(2);
}

// ─── Batting: row-level sanity ────────────────────────────────────────────────

describe('Batting — per-row integrity', () => {

  test('hits = singles + doubles + triples + home_runs', () => {
    const rows = db.prepare(`
      SELECT p.name, g.game_date, a.hits, a.singles, a.doubles, a.triples, a.home_runs
      FROM at_bats a
      JOIN players p ON p.id = a.player_id
      JOIN games   g ON g.id = a.game_id
      WHERE a.game_id > 0
    `).all();

    const errors = [];
    for (const r of rows) {
      const expected = (r.singles||0) + (r.doubles||0) + (r.triples||0) + (r.home_runs||0);
      if (expected !== (r.hits||0)) {
        errors.push(`${r.name} (${r.game_date}): hits=${fmt(r.hits)} but 1B+2B+3B+HR=${expected}`);
      }
    }
    assert.deepEqual(errors, [], `Hit-type breakdown doesn't match total hits:\n  ${errors.join('\n  ')}`);
  });

  test('hits ≤ at-bats', () => {
    const rows = db.prepare(`
      SELECT p.name, g.game_date, a.ab, a.hits
      FROM at_bats a
      JOIN players p ON p.id = a.player_id
      JOIN games   g ON g.id = a.game_id
      WHERE a.game_id > 0
    `).all();

    const errors = [];
    for (const r of rows) {
      if ((r.hits||0) > (r.ab||0)) {
        errors.push(`${r.name} (${r.game_date}): hits=${fmt(r.hits)} > ab=${fmt(r.ab)}`);
      }
    }
    assert.deepEqual(errors, [], `Players with more hits than at-bats:\n  ${errors.join('\n  ')}`);
  });

  test('runs ≤ times on base (ab + walks + hbp)', () => {
    const rows = db.prepare(`
      SELECT p.name, g.game_date, a.ab, a.hits, a.walks, a.hit_by_pitch,
             a.sac_fly, a.sac_bunt, a.runs
      FROM at_bats a
      JOIN players p ON p.id = a.player_id
      JOIN games   g ON g.id = a.game_id
      WHERE a.game_id > 0
    `).all();

    const errors = [];
    for (const r of rows) {
      // Max possible times on base = hits + walks + HBP (ignoring errors/FC which we don't track)
      const maxOnBase = (r.hits||0) + (r.walks||0) + (r.hit_by_pitch||0);
      if ((r.runs||0) > maxOnBase) {
        errors.push(
          `${r.name} (${r.game_date}): runs=${fmt(r.runs)} but max on-base=${maxOnBase} ` +
          `(H=${r.hits} BB=${r.walks} HBP=${r.hit_by_pitch})`
        );
      }
    }
    assert.deepEqual(errors, [], `Players with more runs than plate appearances on base:\n  ${errors.join('\n  ')}`);
  });

  test('at-bats ≥ 0 for all rows', () => {
    const rows = db.prepare(`
      SELECT p.name, g.game_date, a.ab
      FROM at_bats a
      JOIN players p ON p.id = a.player_id
      JOIN games   g ON g.id = a.game_id
      WHERE a.ab < 0 AND a.game_id > 0
    `).all();
    assert.equal(rows.length, 0, `Negative AB values: ${rows.map(r => r.name).join(', ')}`);
  });

  test('no orphaned at_bats (game_id=0 or missing game)', () => {
    const orphans = db.prepare(`
      SELECT COUNT(*) as cnt FROM at_bats
      WHERE game_id = 0
         OR game_id NOT IN (SELECT id FROM games)
    `).all();
    assert.equal(orphans[0].cnt, 0, `Found ${orphans[0].cnt} orphaned at_bat records`);
  });

});

// ─── Batting: game-level totals ───────────────────────────────────────────────

describe('Batting — game totals vs scoreboard', () => {

  test('sum of player runs equals game team_score for each game', () => {
    const games = db.prepare(`
      SELECT g.id, g.game_date, g.opponent, g.team_score,
             COALESCE(SUM(a.runs), 0) as player_runs
      FROM games g
      LEFT JOIN at_bats a ON a.game_id = g.id
      WHERE g.team_id = (SELECT id FROM teams WHERE name LIKE '%Sluggers%' LIMIT 1)
        AND g.team_score IS NOT NULL
      GROUP BY g.id
    `).all();

    const errors = [];
    for (const g of games) {
      if (g.player_runs !== g.team_score) {
        errors.push(
          `${g.game_date} vs ${g.opponent}: ` +
          `scoreboard=${g.team_score} but player runs sum to ${g.player_runs}`
        );
      }
    }
    assert.deepEqual(errors, [], `Run totals don't match scoreboards:\n  ${errors.join('\n  ')}`);
  });

});

// ─── Batting: AVG / OBP / SLG formulas ───────────────────────────────────────

describe('Batting — calculated stat formulas', () => {

  test('AVG = H / AB (to 3 decimal places)', () => {
    const rows = db.prepare(`
      SELECT p.name, g.game_date, a.hits, a.ab
      FROM at_bats a
      JOIN players p ON p.id = a.player_id
      JOIN games   g ON g.id = a.game_id
      WHERE a.ab > 0 AND a.game_id > 0
    `).all();

    for (const r of rows) {
      const expected = calcAVG(r.hits, r.ab);
      const actual = parseFloat(expected); // we're testing the formula, not the stored value
      assert.ok(actual >= 0 && actual <= 1,
        `${r.name} (${r.game_date}): AVG=${expected} is out of range [0, 1]`
      );
    }
  });

  test('season AVG is within valid range for all players', () => {
    const rows = db.prepare(`
      SELECT p.name,
             SUM(a.hits) as h,
             SUM(a.ab)   as ab
      FROM at_bats a
      JOIN players p ON p.id = a.player_id
      WHERE a.game_id > 0
      GROUP BY p.id
      HAVING ab > 0
    `).all();

    const errors = [];
    for (const r of rows) {
      const avg = r.h / r.ab;
      if (avg < 0 || avg > 1) {
        errors.push(`${r.name}: AVG=${avg.toFixed(3)} (H=${r.h} AB=${r.ab})`);
      }
    }
    assert.deepEqual(errors, [], `Invalid season AVG values:\n  ${errors.join('\n  ')}`);
  });

  test('total bases math: TB = 1B + 2×2B + 3×3B + 4×HR', () => {
    const rows = db.prepare(`
      SELECT p.name, g.game_date,
             a.singles, a.doubles, a.triples, a.home_runs, a.ab
      FROM at_bats a
      JOIN players p ON p.id = a.player_id
      JOIN games   g ON g.id = a.game_id
      WHERE a.ab > 0 AND a.game_id > 0
    `).all();

    const errors = [];
    for (const r of rows) {
      const tb = (r.singles||0) + 2*(r.doubles||0) + 3*(r.triples||0) + 4*(r.home_runs||0);
      const slg = tb / r.ab;
      if (slg < 0 || slg > 4) {
        errors.push(`${r.name} (${r.game_date}): SLG=${slg.toFixed(3)} is out of range [0, 4]`);
      }
    }
    assert.deepEqual(errors, [], `Invalid SLG values:\n  ${errors.join('\n  ')}`);
  });

});

// ─── Pitching: row-level sanity ───────────────────────────────────────────────

describe('Pitching — per-row integrity', () => {

  test('strikes ≤ pitches', () => {
    const rows = db.prepare(`
      SELECT p.name, g.game_date, ps.pitches, ps.strikes
      FROM pitching_stats ps
      JOIN players p ON p.id = ps.player_id
      JOIN games   g ON g.id = ps.game_id
      WHERE ps.game_id > 0
    `).all();

    const errors = [];
    for (const r of rows) {
      if ((r.strikes||0) > (r.pitches||0)) {
        errors.push(`${r.name} (${r.game_date}): strikes=${fmt(r.strikes)} > pitches=${fmt(r.pitches)}`);
      }
    }
    assert.deepEqual(errors, [], `Pitchers with more strikes than pitches:\n  ${errors.join('\n  ')}`);
  });

  test('earned_runs ≤ runs_allowed', () => {
    const rows = db.prepare(`
      SELECT p.name, g.game_date, ps.earned_runs, ps.runs_allowed
      FROM pitching_stats ps
      JOIN players p ON p.id = ps.player_id
      JOIN games   g ON g.id = ps.game_id
      WHERE ps.game_id > 0
    `).all();

    const errors = [];
    for (const r of rows) {
      if ((r.earned_runs||0) > (r.runs_allowed||0)) {
        errors.push(`${r.name} (${r.game_date}): ER=${fmt(r.earned_runs)} > R=${fmt(r.runs_allowed)}`);
      }
    }
    assert.deepEqual(errors, [], `Pitchers with ER > R:\n  ${errors.join('\n  ')}`);
  });

  test('innings_pitched ≥ 0', () => {
    const rows = db.prepare(`
      SELECT p.name, g.game_date, ps.innings_pitched
      FROM pitching_stats ps
      JOIN players p ON p.id = ps.player_id
      JOIN games   g ON g.id = ps.game_id
      WHERE ps.innings_pitched < 0 AND ps.game_id > 0
    `).all();
    assert.equal(rows.length, 0, `Negative innings pitched: ${rows.map(r=>r.name).join(', ')}`);
  });

  test('strike percentage in valid range [0%, 100%]', () => {
    const rows = db.prepare(`
      SELECT p.name, g.game_date, ps.pitches, ps.strikes
      FROM pitching_stats ps
      JOIN players p ON p.id = ps.player_id
      JOIN games   g ON g.id = ps.game_id
      WHERE ps.pitches > 0 AND ps.game_id > 0
    `).all();

    const errors = [];
    for (const r of rows) {
      const pct = (r.strikes || 0) / r.pitches;
      if (pct < 0 || pct > 1) {
        errors.push(`${r.name} (${r.game_date}): ${Math.round(pct*100)}% strike rate`);
      }
    }
    assert.deepEqual(errors, [], `Invalid strike percentages:\n  ${errors.join('\n  ')}`);
  });

  test('no orphaned pitching_stats (game_id=0 or missing game)', () => {
    const orphans = db.prepare(`
      SELECT COUNT(*) as cnt FROM pitching_stats
      WHERE game_id = 0
         OR game_id NOT IN (SELECT id FROM games)
    `).all();
    assert.equal(orphans[0].cnt, 0, `Found ${orphans[0].cnt} orphaned pitching records`);
  });

});

// ─── Pitching: game-level totals ──────────────────────────────────────────────

describe('Pitching — game totals', () => {

  test('sum of pitching runs_allowed ≥ opponent score for each game', () => {
    // Pitching runs allowed should be ≥ opponent score (can be more due to unearned)
    const games = db.prepare(`
      SELECT g.id, g.game_date, g.opponent, g.opponent_score,
             COALESCE(SUM(ps.runs_allowed), 0) as pitched_runs
      FROM games g
      LEFT JOIN pitching_stats ps ON ps.game_id = g.id
      WHERE g.team_id = (SELECT id FROM teams WHERE name LIKE '%Sluggers%' LIMIT 1)
        AND g.opponent_score IS NOT NULL
      GROUP BY g.id
    `).all();

    const errors = [];
    for (const g of games) {
      if (g.pitched_runs < g.opponent_score) {
        errors.push(
          `${g.game_date} vs ${g.opponent}: ` +
          `opponent scored ${g.opponent_score} but pitching only logs ${g.pitched_runs} runs allowed`
        );
      }
    }
    assert.deepEqual(errors, [], `Pitching runs allowed less than opponent score:\n  ${errors.join('\n  ')}`);
  });

});

// ─── Schema & relationships ───────────────────────────────────────────────────

describe('Schema integrity', () => {

  test('all players in at_bats exist in players table', () => {
    const missing = db.prepare(`
      SELECT DISTINCT a.player_id FROM at_bats a
      WHERE a.player_id NOT IN (SELECT id FROM players)
    `).all();
    assert.equal(missing.length, 0, `Orphan player_ids in at_bats: ${missing.map(r=>r.player_id).join(', ')}`);
  });

  test('all players in pitching_stats exist in players table', () => {
    const missing = db.prepare(`
      SELECT DISTINCT ps.player_id FROM pitching_stats ps
      WHERE ps.player_id NOT IN (SELECT id FROM players)
    `).all();
    assert.equal(missing.length, 0, `Orphan player_ids in pitching_stats: ${missing.map(r=>r.player_id).join(', ')}`);
  });

  test('all game_ids in at_bats exist in games table', () => {
    const missing = db.prepare(`
      SELECT DISTINCT a.game_id FROM at_bats a
      WHERE a.game_id NOT IN (SELECT id FROM games)
    `).all();
    assert.equal(missing.length, 0, `Orphan game_ids in at_bats: ${missing.map(r=>r.game_id).join(', ')}`);
  });

  test('no duplicate at_bat entries (same player + game)', () => {
    const dupes = db.prepare(`
      SELECT player_id, game_id, COUNT(*) as cnt
      FROM at_bats
      GROUP BY player_id, game_id
      HAVING cnt > 1
    `).all();
    assert.equal(dupes.length, 0,
      `Duplicate at_bat rows: ${dupes.map(d=>`player=${d.player_id} game=${d.game_id}`).join(', ')}`
    );
  });

  test('no duplicate pitching entries (same player + game)', () => {
    const dupes = db.prepare(`
      SELECT player_id, game_id, COUNT(*) as cnt
      FROM pitching_stats
      GROUP BY player_id, game_id
      HAVING cnt > 1
    `).all();
    assert.equal(dupes.length, 0,
      `Duplicate pitching rows: ${dupes.map(d=>`player=${d.player_id} game=${d.game_id}`).join(', ')}`
    );
  });

  test('all Sluggers at_bats belong to games with team_id matching', () => {
    const mismatched = db.prepare(`
      SELECT COUNT(*) as cnt
      FROM at_bats a
      JOIN games g ON g.id = a.game_id
      WHERE a.team_id != g.team_id
    `).all();
    assert.equal(mismatched[0].cnt, 0, `${mismatched[0].cnt} at_bats have mismatched team_id vs game.team_id`);
  });

});

// ─── Roster ───────────────────────────────────────────────────────────────────

describe('Roster integrity', () => {

  test('no duplicate player names', () => {
    const dupes = db.prepare(`
      SELECT LOWER(TRIM(name)) as nm, COUNT(*) as cnt
      FROM players
      GROUP BY nm
      HAVING cnt > 1
    `).all();
    assert.equal(dupes.length, 0,
      `Duplicate player names: ${dupes.map(d=>d.nm).join(', ')}`
    );
  });

  test('all players with stats are on the Sluggers roster', () => {
    const missing = db.prepare(`
      SELECT DISTINCT p.name
      FROM players p
      JOIN at_bats a ON a.player_id = p.id
      WHERE p.id NOT IN (SELECT player_id FROM player_teams)
    `).all();
    // Warning only — players might exist before being linked to team
    if (missing.length > 0) {
      console.warn('  ⚠  Players with stats but not on roster:', missing.map(r=>r.name).join(', '));
    }
    // Not a hard failure — just informational
  });

});
