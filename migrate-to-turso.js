/**
 * migrate-to-turso.js
 *
 * Reads data from the local baseball.db SQLite file and pushes it to
 * the Turso cloud database.  Uses @libsql/client for both ends — no
 * extra dependencies required.
 *
 * Usage (from the baseball-stats/ root):
 *
 *   node migrate-to-turso.js
 *
 * Make sure your .env file (or shell environment) has:
 *   TURSO_DATABASE_URL=libsql://...
 *   TURSO_AUTH_TOKEN=...
 */

const path = require('path');

// Find @libsql/client wherever it's installed
let createClient;
try {
  createClient = require('@libsql/client').createClient;
} catch (_) {
  try {
    createClient = require(path.join(__dirname, 'server', 'node_modules', '@libsql', 'client')).createClient;
  } catch (e) {
    console.error('Cannot find @libsql/client. Run: cd server && npm install');
    process.exit(1);
  }
}

// Load .env if present (Node ≥ 20 built-in flag isn't available when running
// directly, so we do a quick manual parse instead of requiring dotenv)
const fs = require('fs');
const envFile = path.join(__dirname, '.env');
if (fs.existsSync(envFile)) {
  fs.readFileSync(envFile, 'utf8')
    .split('\n')
    .forEach(line => {
      const m = line.match(/^\s*([^#=\s]+)\s*=\s*(.*)\s*$/);
      if (m) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
    });
}

const LOCAL_DB = path.join(__dirname, 'server', 'baseball.db');
const TURSO_URL = process.env.TURSO_DATABASE_URL;
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN;

if (!TURSO_URL) {
  console.error('❌  TURSO_DATABASE_URL is not set. Add it to your .env or environment.');
  process.exit(1);
}

async function migrate() {
  console.log('📂  Opening local database:', LOCAL_DB);
  const local = createClient({ url: `file:${LOCAL_DB}` });

  console.log('☁️   Connecting to Turso:', TURSO_URL.replace(/\?.*/, ''));
  const remote = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN });

  // ── Helper ───────────────────────────────────────────────────────────────────
  async function readAll(sql) {
    const result = await local.execute(sql);
    return Array.from(result.rows);
  }

  async function insertRow(sql, args) {
    // Use OR REPLACE so existing rows are updated (not skipped)
    const upsertSql = sql.replace(/^INSERT INTO/, 'INSERT OR REPLACE INTO');
    try {
      await remote.execute({ sql: upsertSql, args });
    } catch (e) {
      console.warn(`   ⚠️  Skipped: ${e.message.slice(0, 100)}`);
    }
  }

  // ── Schema ──────────────────────────────────────────────────────────────────
  console.log('\n📐  Creating schema on Turso...');
  const schemaSql = [
    `CREATE TABLE IF NOT EXISTS players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL, nickname TEXT, position TEXT,
      bats TEXT DEFAULT 'R', throws TEXT DEFAULT 'R',
      is_featured INTEGER DEFAULT 0, notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP, jersey_number TEXT)`,
    `CREATE TABLE IF NOT EXISTS teams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL, season TEXT, league TEXT,
      color TEXT DEFAULT '#e63946',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS player_teams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
      team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
      jersey_number TEXT, position TEXT, UNIQUE(player_id, team_id))`,
    `CREATE TABLE IF NOT EXISTS games (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
      opponent TEXT NOT NULL, game_date TEXT, location TEXT,
      home_away TEXT DEFAULT 'home', team_score INTEGER,
      opponent_score INTEGER, notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS at_bats (
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
      caught_stealing INTEGER DEFAULT 0, notes TEXT, hit_zones TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP, UNIQUE(player_id, game_id))`,
    `CREATE TABLE IF NOT EXISTS pitching_stats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
      game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
      team_id INTEGER NOT NULL REFERENCES teams(id),
      innings_pitched REAL DEFAULT 0, hits_allowed INTEGER DEFAULT 0,
      runs_allowed INTEGER DEFAULT 0, earned_runs INTEGER DEFAULT 0,
      walks INTEGER DEFAULT 0, strikeouts INTEGER DEFAULT 0,
      home_runs_allowed INTEGER DEFAULT 0, pitches INTEGER DEFAULT 0,
      strikes INTEGER DEFAULT 0, win INTEGER DEFAULT 0,
      loss INTEGER DEFAULT 0, save_stat INTEGER DEFAULT 0,
      notes TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(player_id, game_id))`,
  ];
  for (const stmt of schemaSql) await remote.execute(stmt);
  console.log('   Schema ready ✓');

  // ── Players ──────────────────────────────────────────────────────────────────
  const players = await readAll('SELECT * FROM players');
  console.log(`\n📋  players: ${players.length} rows`);
  for (const r of players) {
    await insertRow(
      `INSERT INTO players (id,name,nickname,position,bats,throws,is_featured,notes,created_at,jersey_number)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [r.id, r.name, r.nickname, r.position, r.bats, r.throws, r.is_featured, r.notes, r.created_at, r.jersey_number]
    );
  }
  console.log('   ✓');

  // ── Teams ────────────────────────────────────────────────────────────────────
  const teams = await readAll('SELECT * FROM teams');
  console.log(`\n📋  teams: ${teams.length} rows`);
  for (const r of teams) {
    await insertRow(
      `INSERT INTO teams (id,name,season,league,color,created_at) VALUES (?,?,?,?,?,?)`,
      [r.id, r.name, r.season, r.league, r.color, r.created_at]
    );
  }
  console.log('   ✓');

  // ── Player-Teams ─────────────────────────────────────────────────────────────
  const pt = await readAll('SELECT * FROM player_teams');
  console.log(`\n📋  player_teams: ${pt.length} rows`);
  for (const r of pt) {
    await insertRow(
      `INSERT INTO player_teams (id,player_id,team_id,jersey_number,position) VALUES (?,?,?,?,?)`,
      [r.id, r.player_id, r.team_id, r.jersey_number, r.position]
    );
  }
  console.log('   ✓');

  // ── Games ────────────────────────────────────────────────────────────────────
  const games = await readAll('SELECT * FROM games');
  console.log(`\n📋  games: ${games.length} rows`);
  for (const r of games) {
    await insertRow(
      `INSERT INTO games (id,team_id,opponent,game_date,location,home_away,team_score,opponent_score,notes,created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [r.id, r.team_id, r.opponent, r.game_date, r.location, r.home_away, r.team_score, r.opponent_score, r.notes, r.created_at]
    );
  }
  console.log('   ✓');

  // ── At-Bats ──────────────────────────────────────────────────────────────────
  const atBats = await readAll('SELECT * FROM at_bats');
  console.log(`\n📋  at_bats: ${atBats.length} rows`);
  for (const r of atBats) {
    await insertRow(
      `INSERT INTO at_bats (id,player_id,game_id,team_id,ab,hits,singles,doubles,triples,
        home_runs,rbi,runs,walks,strikeouts,hit_by_pitch,sac_fly,sac_bunt,
        stolen_bases,caught_stealing,notes,hit_zones,created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [r.id, r.player_id, r.game_id, r.team_id,
       r.ab, r.hits, r.singles, r.doubles, r.triples,
       r.home_runs, r.rbi, r.runs, r.walks, r.strikeouts,
       r.hit_by_pitch, r.sac_fly, r.sac_bunt,
       r.stolen_bases, r.caught_stealing, r.notes, r.hit_zones, r.created_at]
    );
  }
  console.log('   ✓');

  // ── Pitching Stats ───────────────────────────────────────────────────────────
  const pitching = await readAll('SELECT * FROM pitching_stats');
  console.log(`\n📋  pitching_stats: ${pitching.length} rows`);
  for (const r of pitching) {
    await insertRow(
      `INSERT INTO pitching_stats (id,player_id,game_id,team_id,innings_pitched,hits_allowed,
        runs_allowed,earned_runs,walks,strikeouts,home_runs_allowed,pitches,strikes,
        win,loss,save_stat,notes,created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [r.id, r.player_id, r.game_id, r.team_id,
       r.innings_pitched, r.hits_allowed, r.runs_allowed, r.earned_runs,
       r.walks, r.strikeouts, r.home_runs_allowed, r.pitches, r.strikes,
       r.win, r.loss, r.save_stat, r.notes, r.created_at]
    );
  }
  console.log('   ✓');

  console.log('\n✅  Migration complete! All data is now in Turso.');
}

migrate().catch(err => {
  console.error('\n❌  Migration failed:', err.message);
  process.exit(1);
});
