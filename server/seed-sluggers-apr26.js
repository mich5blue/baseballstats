/**
 * Seed: Sluggers - Hamly 9U vs TBD, April 26 2026
 * Run from the server directory: node seed-sluggers-apr26.js
 */

const { initDatabase } = require('./db/sqlcompat');
const path = require('path');
const os = require('os');

// ── Data from: Sluggers - Hamly 9U vs TBD, Apr 26 2026 ───────────────────────

const TEAM_NAME = 'Sluggers - Hamly 9U';
const OPPONENT  = 'TBD';
const GAME_DATE = '2026-04-26';
// Home game, Sluggers win 16-9
const TEAM_SCORE     = 16;
const OPPONENT_SCORE = 9;

// Batting: [name, pos, ab, r, h, singles, doubles, triples, hr, rbi, bb, so, hbp]
// Hit types derived from 2B notes and total bases:
//   2B: B Borek, R Hamly
//   HBP: J Devereaux, B Borek, R Hamly
const BATTING = [
  ['C Bosker',    'SS',  4, 2, 2, 2, 0, 0, 0, 1, 0, 1, 0],
  ['J Devereaux', '2B',  2, 3, 2, 2, 0, 0, 0, 1, 1, 0, 1],
  ['R Hamly',     'CF',  2, 2, 1, 0, 1, 0, 0, 1, 1, 1, 1],
  ['B Borek',     '3B',  3, 1, 2, 1, 1, 0, 0, 3, 0, 1, 1],
  ['G Diaz',      '1B',  2, 1, 1, 1, 0, 0, 0, 2, 2, 1, 0],
  ['R Newman',    'P',   2, 2, 1, 1, 0, 0, 0, 1, 2, 1, 0],
  ['E Bruggema',  'RF',  1, 2, 1, 1, 0, 0, 0, 1, 3, 0, 0],
  ['F Williams',  'C',   2, 1, 0, 0, 0, 0, 0, 1, 2, 1, 0],
  ['P Knight',    'LF',  3, 0, 1, 1, 0, 0, 0, 1, 1, 2, 0],
  ['V Bozinoski', 'CF',  2, 1, 0, 0, 0, 0, 0, 0, 2, 1, 0],
  ['V Ahrens',    'LF',  2, 2, 0, 0, 0, 0, 0, 0, 1, 1, 0],
];

// Pitching: [name, ip, h, r, er, bb, so, pitches, strikes]
// P-S from page 2: R Hamly 10-9, P Knight 19-11, B Borek 22-8,
//                  E Bruggema 11-7, R Newman 25-11, C Bosker 13-3
const PITCHING = [
  ['R Hamly',    1.0, 0, 0, 0, 0, 0, 10,  9],
  ['P Knight',   1.0, 1, 0, 0, 0, 0, 19, 11],
  ['B Borek',    0.1, 2, 5, 4, 2, 1, 22,  8],
  ['E Bruggema', 0.2, 1, 0, 0, 0, 2, 11,  7],
  ['R Newman',   1.1, 0, 1, 1, 2, 3, 25, 11],
  ['C Bosker',   0.0, 0, 0, 0, 2, 0, 13,  3],
];

// ── Insert everything in one transaction ─────────────────────────────────────
function seed(db) {
  db.exec('BEGIN');
  try {
    // 1. Find or create team
    let team = db.prepare('SELECT * FROM teams WHERE name = ? COLLATE NOCASE').get(TEAM_NAME);
    if (!team) {
      const r = db.prepare(
        "INSERT INTO teams (name, season, league, color) VALUES (?, '2026', 'Little League', '#e63946')"
      ).run(TEAM_NAME);
      team = db.prepare('SELECT * FROM teams WHERE id = ?').get(r.lastInsertRowid);
      console.log(`  ✓ Created team: ${team.name}`);
    } else {
      console.log(`  → Team already exists: ${team.name} (id=${team.id})`);
    }

    // 2. Create game
    const gameResult = db.prepare(`
      INSERT INTO games (team_id, opponent, game_date, home_away, team_score, opponent_score)
      VALUES (?, ?, ?, 'home', ?, ?)
    `).run(team.id, OPPONENT, GAME_DATE, TEAM_SCORE, OPPONENT_SCORE);
    const gameId = gameResult.lastInsertRowid;
    console.log(`  ✓ Created game: ${TEAM_NAME} ${TEAM_SCORE} - ${OPPONENT_SCORE} ${OPPONENT} on ${GAME_DATE}`);

    // 3. Players + at-bats
    for (const [name, pos, ab, r, h, singles, doubles, triples, hr, rbi, bb, so, hbp] of BATTING) {
      let player = db.prepare('SELECT * FROM players WHERE name = ? COLLATE NOCASE').get(name);
      if (!player) {
        const pr = db.prepare('INSERT INTO players (name, position) VALUES (?, ?)').run(name, pos);
        player = db.prepare('SELECT * FROM players WHERE id = ?').get(pr.lastInsertRowid);
        console.log(`  ✓ Created player: ${name} (${pos})`);
      } else {
        console.log(`  → Player exists: ${name}`);
      }

      db.prepare('INSERT OR IGNORE INTO player_teams (player_id, team_id, position) VALUES (?, ?, ?)')
        .run(player.id, team.id, pos);

      db.prepare(`
        INSERT OR REPLACE INTO at_bats
          (player_id, game_id, team_id, ab, hits, singles, doubles, triples, home_runs,
           rbi, runs, walks, strikeouts, hit_by_pitch)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(player.id, gameId, team.id, ab, h, singles, doubles, triples, hr, rbi, r, bb, so, hbp);
    }

    // 4. Pitching stats
    for (const [name, ip, hits_allowed, runs_allowed, er, bb, so, pitches, strikes] of PITCHING) {
      let player = db.prepare('SELECT * FROM players WHERE name = ? COLLATE NOCASE').get(name);
      if (!player) {
        const pr = db.prepare('INSERT INTO players (name, position) VALUES (?, ?)').run(name, 'P');
        player = db.prepare('SELECT * FROM players WHERE id = ?').get(pr.lastInsertRowid);
      }

      db.prepare(`
        INSERT OR REPLACE INTO pitching_stats
          (player_id, game_id, team_id, innings_pitched, hits_allowed, runs_allowed,
           earned_runs, walks, strikeouts, pitches, strikes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(player.id, gameId, team.id, ip, hits_allowed, runs_allowed, er, bb, so, pitches, strikes);
      console.log(`  ✓ Pitching: ${name} — ${ip} IP, ${so} K, ${pitches} pitches (${strikes} strikes)`);
    }

    db.exec('COMMIT');
    return { teamId: team.id, gameId, playerCount: BATTING.length };
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

async function main() {
  const PROJECT_DB = path.join(__dirname, 'baseball.db');
  const TEMP_DB = path.join(os.tmpdir(), 'baseball_stats.db');

  let db;
  try {
    db = await initDatabase(PROJECT_DB);
    console.log('Using database:', PROJECT_DB);
  } catch (e) {
    console.warn('Falling back to temp db:', e.message);
    db = await initDatabase(TEMP_DB);
  }

  console.log('\nSeeding Sluggers - Hamly 9U vs TBD, Apr 26 2026...');
  try {
    const result = seed(db);
    console.log(`\n✅ Done! Team ID: ${result.teamId}, Game ID: ${result.gameId}, ${result.playerCount} players imported.`);
    console.log('   Open the app and go to Teams to see the updated stats.\n');
  } catch (err) {
    console.error('\n❌ Error:', err.message);
  }

  db.close();
}

main();
