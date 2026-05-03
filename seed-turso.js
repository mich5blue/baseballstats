/**
 * seed-turso.js  —  Seeds all game data directly into Turso.
 * Run from the baseball-stats/ root:
 *   node seed-turso.js
 */

const path = require('path');

// Load .env
const fs = require('fs');
const envFile = path.join(__dirname, '.env');
if (fs.existsSync(envFile)) {
  fs.readFileSync(envFile, 'utf8').split('\n').forEach(line => {
    const m = line.match(/^\s*([^#=\s]+)\s*=\s*(.*)\s*$/);
    if (m) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  });
}

// Find @libsql/client
let createClient;
try {
  createClient = require('@libsql/client').createClient;
} catch (_) {
  createClient = require(path.join(__dirname, 'server', 'node_modules', '@libsql', 'client')).createClient;
}

const TURSO_URL   = process.env.TURSO_DATABASE_URL;
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN;

if (!TURSO_URL) { console.error('Missing TURSO_DATABASE_URL in .env'); process.exit(1); }

const db = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN });

// ── Game data ─────────────────────────────────────────────────────────────────

const TEAM_NAME  = 'Sluggers - Hamly 9U';
const TEAM_COLOR = '#e63946';

// Game 1: March 29 2026 — vs Ada Lions 9U (away, W 13-4)
// Batting: [name, ab, r, h, singles, doubles, triples, hr, rbi, bb, so, hbp]
const GAME1 = {
  opponent: 'Ada Lions 9U', date: '2026-03-29', homeAway: 'away',
  teamScore: 13, oppScore: 4,
  batting: [
    ['C Bosker',     2, 2, 1, 1, 0, 0, 0, 2, 2, 0, 0],
    ['J Devereaux',  4, 1, 3, 2, 1, 0, 0, 4, 0, 0, 0],
    ['R Newman',     2, 0, 0, 0, 0, 0, 0, 0, 0, 2, 1],
    ['A Langworthy', 1, 1, 0, 0, 0, 0, 0, 1, 1, 1, 1],
    ['G Diaz',       2, 0, 0, 0, 0, 0, 0, 0, 0, 2, 1],
    ['R Hamly',      1, 0, 1, 1, 0, 0, 0, 2, 1, 0, 1],
    ['B Borek',      1, 1, 1, 1, 0, 0, 0, 1, 1, 0, 1],
    ['P Knight',     2, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1],
    ['F Williams',   2, 1, 1, 1, 0, 0, 0, 0, 1, 1, 0],
    ['E Bruggema',   1, 2, 0, 0, 0, 0, 0, 1, 1, 1, 1],
    ['V Bozinoski',  1, 2, 0, 0, 0, 0, 0, 1, 1, 1, 1],
    ['V Ahrens',     1, 2, 0, 0, 0, 0, 0, 1, 2, 1, 0],
  ],
  // Pitching: [name, ip, h, r, er, bb, so, pitches, strikes]
  pitching: [
    ['R Newman',     1.0, 2, 4, 4, 3, 3, 37, 0],
    ['A Langworthy', 1.0, 1, 0, 0, 1, 2, 20, 0],
    ['C Bosker',     1.0, 0, 0, 0, 1, 1, 20, 0],
    ['R Hamly',      1.0, 3, 0, 0, 1, 1, 19, 0],
    ['J Devereaux',  1.0, 0, 0, 0, 1, 2, 14, 0],
    ['B Borek',      1.0, 0, 0, 0, 2, 2, 22, 0],
  ],
};

// Game 2: April 26 2026 — vs TBD (home, W 16-9)
const GAME2 = {
  opponent: 'TBD', date: '2026-04-26', homeAway: 'home',
  teamScore: 16, oppScore: 9,
  batting: [
    ['C Bosker',    4, 2, 2, 2, 0, 0, 0, 1, 0, 1, 0],
    ['J Devereaux', 2, 3, 2, 2, 0, 0, 0, 1, 1, 0, 1],
    ['R Hamly',     2, 2, 1, 0, 1, 0, 0, 1, 1, 1, 1],
    ['B Borek',     3, 1, 2, 1, 1, 0, 0, 3, 0, 1, 1],
    ['G Diaz',      2, 1, 1, 1, 0, 0, 0, 2, 2, 1, 0],
    ['R Newman',    2, 2, 1, 1, 0, 0, 0, 1, 2, 1, 0],
    ['E Bruggema',  1, 2, 1, 1, 0, 0, 0, 1, 3, 0, 0],
    ['F Williams',  2, 1, 0, 0, 0, 0, 0, 1, 2, 1, 0],
    ['P Knight',    3, 0, 1, 1, 0, 0, 0, 1, 1, 2, 0],
    ['V Bozinoski', 2, 1, 0, 0, 0, 0, 0, 0, 2, 1, 0],
    ['V Ahrens',    2, 2, 0, 0, 0, 0, 0, 0, 1, 1, 0],
  ],
  pitching: [
    ['R Hamly',    1.0, 0, 0, 0, 0, 0, 10,  9],
    ['P Knight',   1.0, 1, 0, 0, 0, 0, 19, 11],
    ['B Borek',    0.1, 2, 5, 4, 2, 1, 22,  8],
    ['E Bruggema', 0.2, 1, 0, 0, 0, 2, 11,  7],
    ['R Newman',   1.1, 0, 1, 1, 2, 3, 25, 11],
    ['C Bosker',   0.0, 0, 0, 0, 2, 0, 13,  3],
  ],
};

// ── Seeder ────────────────────────────────────────────────────────────────────

async function run(sql, args = []) {
  return db.execute({ sql, args });
}

async function getOrCreate(table, whereCol, whereVal, insertSql, insertArgs) {
  const r = await db.execute({ sql: `SELECT * FROM ${table} WHERE ${whereCol} = ?`, args: [whereVal] });
  if (r.rows[0]) return r.rows[0];
  const ins = await db.execute({ sql: insertSql, args: insertArgs });
  const r2 = await db.execute({ sql: `SELECT * FROM ${table} WHERE id = ?`, args: [Number(ins.lastInsertRowid)] });
  return r2.rows[0];
}

async function seedGame(teamId, game) {
  const gr = await run(
    'INSERT INTO games (team_id, opponent, game_date, home_away, team_score, opponent_score) VALUES (?,?,?,?,?,?)',
    [teamId, game.opponent, game.date, game.homeAway, game.teamScore, game.oppScore]
  );
  const gameId = Number(gr.lastInsertRowid);
  console.log(`  ✓ Game: vs ${game.opponent} on ${game.date} (${game.teamScore}-${game.oppScore})`);

  // Batting
  for (const [name, ab, r, h, singles, doubles, triples, hr, rbi, bb, so, hbp] of game.batting) {
    const player = await getOrCreate('players', 'name', name,
      'INSERT INTO players (name) VALUES (?)', [name]);
    const playerId = Number(player.id);
    await run('INSERT OR IGNORE INTO player_teams (player_id, team_id) VALUES (?,?)', [playerId, teamId]);
    await run(
      `INSERT OR IGNORE INTO at_bats
        (player_id,game_id,team_id,ab,hits,singles,doubles,triples,home_runs,rbi,runs,walks,strikeouts,hit_by_pitch)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [playerId, gameId, teamId, ab, h, singles, doubles, triples, hr, rbi, r, bb, so, hbp]
    );
  }

  // Pitching
  for (const [name, ip, hits_allowed, runs_allowed, er, bb, so, pitches, strikes] of game.pitching) {
    const player = await getOrCreate('players', 'name', name,
      'INSERT INTO players (name) VALUES (?)', [name]);
    const playerId = Number(player.id);
    await run(
      `INSERT OR IGNORE INTO pitching_stats
        (player_id,game_id,team_id,innings_pitched,hits_allowed,runs_allowed,earned_runs,walks,strikeouts,pitches,strikes)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [playerId, gameId, teamId, ip, hits_allowed, runs_allowed, er, bb, so, pitches, strikes]
    );
  }
}

async function main() {
  console.log(`\nConnecting to Turso: ${TURSO_URL}\n`);

  // Schema
  const schema = [
    `CREATE TABLE IF NOT EXISTS players (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, nickname TEXT, position TEXT, bats TEXT DEFAULT 'R', throws TEXT DEFAULT 'R', is_featured INTEGER DEFAULT 0, notes TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, jersey_number TEXT)`,
    `CREATE TABLE IF NOT EXISTS teams (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, season TEXT, league TEXT, color TEXT DEFAULT '#e63946', created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS player_teams (id INTEGER PRIMARY KEY AUTOINCREMENT, player_id INTEGER NOT NULL, team_id INTEGER NOT NULL, jersey_number TEXT, position TEXT, UNIQUE(player_id, team_id))`,
    `CREATE TABLE IF NOT EXISTS games (id INTEGER PRIMARY KEY AUTOINCREMENT, team_id INTEGER NOT NULL, opponent TEXT NOT NULL, game_date TEXT, location TEXT, home_away TEXT DEFAULT 'home', team_score INTEGER, opponent_score INTEGER, notes TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS at_bats (id INTEGER PRIMARY KEY AUTOINCREMENT, player_id INTEGER NOT NULL, game_id INTEGER NOT NULL, team_id INTEGER NOT NULL, ab INTEGER DEFAULT 0, hits INTEGER DEFAULT 0, singles INTEGER DEFAULT 0, doubles INTEGER DEFAULT 0, triples INTEGER DEFAULT 0, home_runs INTEGER DEFAULT 0, rbi INTEGER DEFAULT 0, runs INTEGER DEFAULT 0, walks INTEGER DEFAULT 0, strikeouts INTEGER DEFAULT 0, hit_by_pitch INTEGER DEFAULT 0, sac_fly INTEGER DEFAULT 0, sac_bunt INTEGER DEFAULT 0, stolen_bases INTEGER DEFAULT 0, caught_stealing INTEGER DEFAULT 0, notes TEXT, hit_zones TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, UNIQUE(player_id, game_id))`,
    `CREATE TABLE IF NOT EXISTS pitching_stats (id INTEGER PRIMARY KEY AUTOINCREMENT, player_id INTEGER NOT NULL, game_id INTEGER NOT NULL, team_id INTEGER NOT NULL, innings_pitched REAL DEFAULT 0, hits_allowed INTEGER DEFAULT 0, runs_allowed INTEGER DEFAULT 0, earned_runs INTEGER DEFAULT 0, walks INTEGER DEFAULT 0, strikeouts INTEGER DEFAULT 0, home_runs_allowed INTEGER DEFAULT 0, pitches INTEGER DEFAULT 0, strikes INTEGER DEFAULT 0, win INTEGER DEFAULT 0, loss INTEGER DEFAULT 0, save_stat INTEGER DEFAULT 0, notes TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, UNIQUE(player_id, game_id))`,
  ];
  for (const s of schema) await run(s);
  console.log('Schema ready ✓');

  // Team
  const team = await getOrCreate('teams', 'name', TEAM_NAME,
    "INSERT INTO teams (name, season, league, color) VALUES (?, '2026', 'Little League', ?)",
    [TEAM_NAME, TEAM_COLOR]);
  const teamId = Number(team.id);
  console.log(`Team: ${TEAM_NAME} (id=${teamId})\n`);

  await seedGame(teamId, GAME1);
  await seedGame(teamId, GAME2);

  // Verify
  const counts = await Promise.all([
    db.execute('SELECT COUNT(*) as n FROM players'),
    db.execute('SELECT COUNT(*) as n FROM games'),
    db.execute('SELECT COUNT(*) as n FROM at_bats'),
    db.execute('SELECT COUNT(*) as n FROM pitching_stats'),
  ]);
  console.log(`\n✅ Done!`);
  console.log(`   players: ${counts[0].rows[0].n}`);
  console.log(`   games:   ${counts[1].rows[0].n}`);
  console.log(`   at_bats: ${counts[2].rows[0].n}`);
  console.log(`   pitching: ${counts[3].rows[0].n}`);
}

main().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
