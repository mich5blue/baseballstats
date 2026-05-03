/**
 * update-stolen-bases.js
 *
 * Applies stolen base data for both games, extracted from GameChanger PDFs.
 * Also applies spray chart hit zones for Game 1 (from play-by-play scorebook).
 *
 * Run from the baseball-stats/ root:
 *   node update-stolen-bases.js
 */

const path = require('path');
const fs   = require('fs');

// Load .env
const envFile = path.join(__dirname, '.env');
if (fs.existsSync(envFile)) {
  fs.readFileSync(envFile, 'utf8').split('\n').forEach(line => {
    const m = line.match(/^\s*([^#=\s]+)\s*=\s*(.*)\s*$/);
    if (m) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  });
}

let createClient;
try {
  createClient = require('@libsql/client').createClient;
} catch (_) {
  createClient = require(path.join(__dirname, 'server', 'node_modules', '@libsql', 'client')).createClient;
}

const db = createClient({
  url:       process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// ── Game 1: Mar 29 vs Ada Lions 9U ───────────────────────────────────────────
// Source: Play-by-play scorebook (no SB visible in text layer)
// SB data NOT available from this PDF — leaving at 0 pending manual entry.
// Spray zones extracted from hit arrow directions in the field diagrams.
const GAME1 = {
  date:     '2026-03-29',
  opponent: 'Ada Lions',
  // stolen_bases: not readable from the play-by-play scorebook text layer
  // Update these manually if you have the GC app's box score for this game
  stolen_bases: {
    // 'C Bosker': 0,   // add numbers if known
  },
  hit_zones: {
    'C Bosker':    [{ zone: 'rc', type: 'ld' }],                                                          // 1B inn 6
    'J Devereaux': [{ zone: 'rc', type: 'ld' }, { zone: 'rc', type: 'ld' }, { zone: 'lc', type: 'ld' }], // 1B, 1B, 2B
    'R Hamly':     [{ zone: 'rl', type: 'ld' }],                                                          // 1B inn 6
    'B Borek':     [{ zone: 'rc', type: 'ld' }],                                                          // 1B inn 6
    'F Williams':  [{ zone: 'c',  type: 'ld' }],                                                          // 1B inn 6
  },
};

// ── Game 2: Apr 26 vs Wawie Hawks 9U ─────────────────────────────────────────
// Source: GameChanger box score PDF — full stats confirmed.
// SB: V Ahrens 2, V Bozinoski 1, E Bruggema 1, C Bosker 2, J Devereaux 1,
//     R Newman 2, B Borek 2, R Hamly 1, F Williams 1
const GAME2 = {
  date:     '2026-04-26',
  opponent: 'Wawie Hawks',
  stolen_bases: {
    'C Bosker':   2,
    'J Devereaux':1,
    'R Hamly':    1,
    'B Borek':    2,
    'G Diaz':     0,
    'R Newman':   2,
    'E Bruggema': 1,
    'F Williams': 1,
    'P Knight':   0,
    'V Bozinoski':1,
    'V Ahrens':   2,
  },
  // Spray zones extracted from play-by-play scorebook field diagrams (Apr 26).
  hit_zones: {
    'C Bosker':    [{ zone: 'rc', type: 'ld' }, { zone: 'rc', type: 'ld' }],
    'J Devereaux': [{ zone: 'c',  type: 'ld' }, { zone: 'rc', type: 'ld' }],
    'R Hamly':     [{ zone: 'rc', type: 'ld' }],              // 2B
    'B Borek':     [{ zone: 'rc', type: 'ld' }, { zone: 'rl', type: 'ld' }], // 2B + 1B
    'G Diaz':      [{ zone: 'c',  type: 'ld' }],
    'R Newman':    [{ zone: 'rc', type: 'ld' }],
    'E Bruggema':  [{ zone: 'c',  type: 'ld' }],
    'P Knight':    [{ zone: 'if', type: 'gb' }],              // infield single
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

async function findGame(date, opponentLike) {
  const r = await db.execute({
    sql:  `SELECT id FROM games WHERE game_date = ? AND opponent LIKE ? LIMIT 1`,
    args: [date, `%${opponentLike}%`],
  });
  return r.rows.length ? Number(r.rows[0].id) : null;
}

async function findPlayer(name) {
  const r = await db.execute({
    sql:  'SELECT id FROM players WHERE name = ? LIMIT 1',
    args: [name],
  });
  return r.rows.length ? Number(r.rows[0].id) : null;
}

async function processGame(gameCfg, label) {
  console.log(`\n── ${label} ──────────────────────────────────`);

  const gameId = await findGame(gameCfg.date, gameCfg.opponent);
  if (!gameId) {
    console.error(`  ❌  Game not found (${gameCfg.date} vs ${gameCfg.opponent})`);
    return;
  }
  console.log(`  ✓  Game id=${gameId}`);

  // ── Stolen bases
  const sbEntries = Object.entries(gameCfg.stolen_bases);
  if (sbEntries.length) {
    console.log(`\n  Stolen bases:`);
    for (const [name, sb] of sbEntries) {
      const playerId = await findPlayer(name);
      if (!playerId) { console.warn(`    ⚠️  Player not found: ${name}`); continue; }
      const r = await db.execute({
        sql:  'UPDATE at_bats SET stolen_bases = ? WHERE player_id = ? AND game_id = ?',
        args: [sb, playerId, gameId],
      });
      if (Number(r.rowsAffected)) {
        console.log(`    ✓  ${name.padEnd(16)} SB = ${sb}`);
      } else {
        console.warn(`    ⚠️  No at_bat row found for ${name}`);
      }
    }
  } else {
    console.log(`  (No SB data for this game)`);
  }

  // ── Hit zones
  const zoneEntries = Object.entries(gameCfg.hit_zones);
  if (zoneEntries.length) {
    console.log(`\n  Spray chart zones:`);
    for (const [name, zones] of zoneEntries) {
      const playerId = await findPlayer(name);
      if (!playerId) { console.warn(`    ⚠️  Player not found: ${name}`); continue; }
      const r = await db.execute({
        sql:  'UPDATE at_bats SET hit_zones = ? WHERE player_id = ? AND game_id = ?',
        args: [JSON.stringify(zones), playerId, gameId],
      });
      if (Number(r.rowsAffected)) {
        const desc = zones.map(z => `${z.zone.toUpperCase()}`).join(', ');
        console.log(`    ✓  ${name.padEnd(16)} → ${desc}`);
      } else {
        console.warn(`    ⚠️  No at_bat row found for ${name}`);
      }
    }
  }
}

async function main() {
  console.log('Connecting to Turso…');
  await processGame(GAME1, 'Game 1 — Mar 29 vs Ada Lions 9U');
  await processGame(GAME2, 'Game 2 — Apr 26 vs Wawie Hawks 9U');

  // Verify totals
  console.log('\n── Verification ─────────────────────────────────────────');
  const totals = await db.execute({
    sql: `
      SELECT p.name,
             SUM(ab.stolen_bases) as sb,
             SUM(ab.caught_stealing) as cs
      FROM players p
      JOIN at_bats ab ON p.id = ab.player_id
      GROUP BY p.id
      HAVING sb > 0
      ORDER BY sb DESC
    `,
    args: [],
  });
  console.log('\n  Season SB leaders:');
  for (const r of totals.rows) {
    console.log(`    ${String(r.name).padEnd(16)}  SB: ${r.sb}  CS: ${r.cs}`);
  }

  console.log('\n✅  All updates applied.\n');
}

main().catch(err => {
  console.error('\n❌  Failed:', err.message);
  process.exit(1);
});
