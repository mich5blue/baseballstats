const { createClient } = require('@libsql/client');
const path = require('path');

let client = null;

async function initDb() {
  const url = process.env.TURSO_DATABASE_URL
    || `file:${path.join(__dirname, '..', 'baseball.db')}`;
  const authToken = process.env.TURSO_AUTH_TOKEN || undefined;

  client = createClient({ url, authToken });
  console.log(`[DB] Connected to: ${url.startsWith('file:') ? url : url.replace(/\?.*/, '')}`);

  await initSchema();
}

// Returns a thin async wrapper used by all route files
function getDb() {
  if (!client) throw new Error('[DB] Database not initialised — did initDb() run?');
  return {
    /** Return all matching rows */
    async all(sql, args = []) {
      const result = await client.execute({ sql, args });
      return Array.from(result.rows);
    },
    /** Return first matching row or undefined */
    async get(sql, args = []) {
      const result = await client.execute({ sql, args });
      return result.rows[0] ?? undefined;
    },
    /** Run INSERT / UPDATE / DELETE — returns { lastInsertRowid, changes } */
    async run(sql, args = []) {
      const result = await client.execute({ sql, args });
      return {
        lastInsertRowid: Number(result.lastInsertRowid ?? 0),
        changes: result.rowsAffected ?? 0,
      };
    },
    /** Run one or more DDL statements (no parameters) */
    async exec(sql) {
      const stmts = sql.split(';').map(s => s.trim()).filter(Boolean);
      for (const stmt of stmts) {
        await client.execute(stmt);
      }
    },
  };
}

async function initSchema() {
  const statements = [
    `CREATE TABLE IF NOT EXISTS players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      nickname TEXT,
      position TEXT,
      bats TEXT DEFAULT 'R',
      throws TEXT DEFAULT 'R',
      is_featured INTEGER DEFAULT 0,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      jersey_number TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS teams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      season TEXT,
      league TEXT,
      color TEXT DEFAULT '#e63946',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS player_teams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
      team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
      jersey_number TEXT,
      position TEXT,
      UNIQUE(player_id, team_id)
    )`,
    `CREATE TABLE IF NOT EXISTS games (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
      opponent TEXT NOT NULL,
      game_date TEXT,
      location TEXT,
      home_away TEXT DEFAULT 'home',
      team_score INTEGER,
      opponent_score INTEGER,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS at_bats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
      game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
      team_id INTEGER NOT NULL REFERENCES teams(id),
      ab INTEGER DEFAULT 0,
      hits INTEGER DEFAULT 0,
      singles INTEGER DEFAULT 0,
      doubles INTEGER DEFAULT 0,
      triples INTEGER DEFAULT 0,
      home_runs INTEGER DEFAULT 0,
      rbi INTEGER DEFAULT 0,
      runs INTEGER DEFAULT 0,
      walks INTEGER DEFAULT 0,
      strikeouts INTEGER DEFAULT 0,
      hit_by_pitch INTEGER DEFAULT 0,
      sac_fly INTEGER DEFAULT 0,
      sac_bunt INTEGER DEFAULT 0,
      stolen_bases INTEGER DEFAULT 0,
      caught_stealing INTEGER DEFAULT 0,
      notes TEXT,
      hit_zones TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(player_id, game_id)
    )`,
    `CREATE TABLE IF NOT EXISTS pitching_stats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
      game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
      team_id INTEGER NOT NULL REFERENCES teams(id),
      innings_pitched REAL DEFAULT 0,
      hits_allowed INTEGER DEFAULT 0,
      runs_allowed INTEGER DEFAULT 0,
      earned_runs INTEGER DEFAULT 0,
      walks INTEGER DEFAULT 0,
      strikeouts INTEGER DEFAULT 0,
      home_runs_allowed INTEGER DEFAULT 0,
      pitches INTEGER DEFAULT 0,
      strikes INTEGER DEFAULT 0,
      win INTEGER DEFAULT 0,
      loss INTEGER DEFAULT 0,
      save_stat INTEGER DEFAULT 0,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(player_id, game_id)
    )`,
  ];

  for (const stmt of statements) {
    await client.execute(stmt);
  }

  // Safe migrations — ignore errors if column already exists
  const migrations = [
    'ALTER TABLE at_bats ADD COLUMN hit_zones TEXT',
    'ALTER TABLE players ADD COLUMN jersey_number TEXT',
    'ALTER TABLE teams ADD COLUMN slug TEXT',
    'ALTER TABLE teams ADD COLUMN pin TEXT',
  ];
  for (const m of migrations) {
    try { await client.execute(m); } catch (_) { /* already exists */ }
  }

  // Auto-generate slugs for any teams that don't have one yet
  try {
    const teamsWithoutSlug = await client.execute(
      "SELECT id, name FROM teams WHERE slug IS NULL OR slug = ''"
    );
    for (const row of teamsWithoutSlug.rows) {
      const slug = String(row.name)
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
      await client.execute({ sql: 'UPDATE teams SET slug = ? WHERE id = ?', args: [slug, row.id] });
    }
  } catch (_) { /* best effort */ }
}

module.exports = { initDb, getDb };
