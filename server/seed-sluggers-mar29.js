/**
 * Seed: Sluggers - Hamly 9U vs Ada Lions 9U, March 29 2026
 * Run from the server directory: node seed-sluggers-mar29.js
 */

const { initDatabase } = require('./db/sqlcompat');
const path = require('path');
const os = require('os');

// Make sure schema exists
db.exec(`
  CREATE TABLE IF NOT EXISTS players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL, nickname TEXT, position TEXT,
    bats TEXT DEFAULT 'R', throws TEXT DEFAULT 'R',
    is_featured INTEGER DEFAULT 0, notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS teams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL, season TEXT, league TEXT,
    color TEXT DEFAULT '#e63946',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS player_teams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    jersey_number TEXT, position TEXT,
    UNIQUE(player_id, team_id)
  );
  CREATE TABLE IF NOT EXISTS games (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    opponent TEXT NOT NULL, game_date TEXT, location TEXT,
    home_away TEXT DEFAULT 'home',
    team_score INTEGER, opponent_score INTEGER, notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS at_bats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    team_id INTEGER NOT NULL REFERENCES teams(id),
    ab INTEGER DEFAULT 0, hits INTEGER DEFAULT 0,
    singles INTEGER DEFAULT 0, doubles INTEGER DEFAULT 0,
    triples INTEGER DEFAULT 0, home_runs INTEGER DEFAULT 0,
    rbi INTEGER DEFAULT 0, runs INTEGER DEFAULT 0,
    walks INTEGER DEFAULT 0, strikeouts INTEGER DEFAULT 0,
    hit_by_pitch INTEGER DEFAULT 0, sac_fly INTEGER DEFAULT 0,
    sac_bunt INTEGER DEFAULT 0, stolen_bases INTEGER DEFAULT 0,
    caught_stealing INTEGER DEFAULT 0, notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(player_id, game_id)
  );
  CREATE TABLE IF NOT EXISTS pitching_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    team_id INTEGER NOT NULL REFERENCES teams(id),
    innings_pitched REAL DEFAULT 0, hits_allowed INTEGER DEFAULT 0,
    runs_allowed INTEGER DEFAULT 0, earned_runs INTEGER DEFAULT 0,
    walks INTEGER DEFAULT 0, strikeouts INTEGER DEFAULT 0,
    home_runs_allowed INTEGER DEFAULT 0, pitches INTEGER DEFAULT 0,
    strikes INTEGER DEFAULT 0, win INTEGER DEFAULT 0,
    loss INTEGER DEFAULT 0, save_stat INTEGER DEFAULT 0, notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(player_id, game_id)
  );
`);

// ── Data from: Sluggers - Hamly 9U vs Ada Lions 9U, Mar 29 2026 ──────────────

const TEAM_NAME = 'Sluggers - Hamly 9U';
const OPPONENT  = 'Ada Lions 9U';
const GAME_DATE = '2026-03-29';

// Batting: [name, pos, ab, r, h, singles, doubles, triples, hr, rbi, bb, so, hbp]
const BATTING = [
  ['C Bosker',     'SS',  2, 2, 1, 1, 0, 0, 0, 2, 2, 0, 0],
  ['J Devereaux',  '2B',  4, 1, 3, 2, 1, 0, 0, 4, 0, 0, 0],
  ['R Newman',     'P',   2, 0, 0, 0, 0, 0, 0, 0, 0, 2, 1],
  ['A Langworthy', '1B',  1, 1, 0, 0, 0, 0, 0, 1, 1, 1, 1],
  ['G Diaz',       '1B',  2, 0, 0, 0, 0, 0, 0, 0, 0, 2, 1],
  ['R Hamly',      'CF',  1, 0, 1, 1, 0, 0, 0, 2, 1, 0, 1],
  ['B Borek',      '3B',  1, 1, 1, 1, 0, 0, 0, 1, 1, 0, 1],
  ['P Knight',     'LF',  2, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1],
  ['F Williams',   'C',   2, 1, 1, 1, 0, 0, 0, 0, 1, 1, 0],
  ['E Bruggema',   'RF',  1, 2, 0, 0, 0, 0, 0, 1, 1, 1, 1],
  ['V Bozinoski',  'CF',  1, 2, 0, 0, 0, 0, 0, 1, 1, 1, 1],
  ['V Ahrens',     'LF',  1, 2, 0, 0, 0, 0, 0, 1, 2, 1, 0],
];

// Pitching: [name, ip, h, r, er, bb, so, pitches]
const PITCHING = [
  ['R Newman',     1.0, 2, 4, 4, 3, 3, 37],
  ['A Langworthy', 1.0, 1, 0, 0, 1, 2, 20],
  ['C Bosker',     1.0, 0, 0, 0, 1, 1, 20],
  ['R Hamly',      1.0, 3, 0, 0, 1, 1, 19],
  ['J Devereaux',  1.0, 0, 0, 0, 1, 2, 14],
  ['B Borek',      1.0, 0, 0, 0, 2, 2, 22],
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
      console.log(`  → Team already exists: ${team.name}`);
    }

    // 2. Create game
    const gameResult = db.prepare(`
      INSERT INTO games (team_id, opponent, game_date, home_away, team_score, opponent_score)
      VALUES (?, ?, ?, 'away', 13, 4)
    `).run(team.id, OPPONENT, GAME_DATE);
    const gameId = gameResult.lastInsertRowid;
    console.log(`  ✓ Created game: ${TEAM_NAME} 13 - 4 ${OPPONENT} on ${GAME_DATE}`);

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
    for (const [name, ip, hits_allowed, runs_allowed, er, bb, so, pitches] of PITCHING) {
      let player = db.prepare('SELECT * FROM players WHERE name = ? COLLATE NOCASE').get(name);
      if (!player) {
        const pr = db.prepare('INSERT INTO players (name, position) VALUES (?, ?)').run(name, 'P');
        player = db.prepare('SELECT * FROM players WHERE id = ?').get(pr.lastInsertRowid);
      }

      db.prepare(`
        INSERT OR REPLACE INTO pitching_stats
          (player_id, game_id, team_id, innings_pitched, hits_allowed, runs_allowed,
           earned_runs, walks, strikeouts, pitches)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(player.id, gameId, team.id, ip, hits_allowed, runs_allowed, er, bb, so, pitches);
      console.log(`  ✓ Pitching: ${name} — ${ip} IP, ${so} K, ${pitches} pitches`);
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

  console.log('\nSeeding Sluggers - Hamly 9U box score...');
  try {
    const result = seed(db);
    console.log(`\n✅ Done! Team ID: ${result.teamId}, Game ID: ${result.gameId}, ${result.playerCount} players imported.`);
    console.log('   Open the app and go to Teams to see the data.\n');
  } catch (err) {
    console.error('\n❌ Error:', err.message);
  }

  db.close();
}

main();
