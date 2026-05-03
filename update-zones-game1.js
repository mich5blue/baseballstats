/**
 * update-zones-game1.js
 *
 * Applies spray chart hit zones for Game 1 (Mar 29 2026 vs Ada Lions 9U)
 * extracted from the GameChanger scorebook PDF.
 *
 * Run from the baseball-stats/ root:
 *   node update-zones-game1.js
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

// ── Spray chart zones from scorebook ─────────────────────────────────────────
//
// Each hit arrow was read from the GameChanger scorebook field diagrams.
// Zone keys:  ll=left line, lc=left-center, c=center, rc=right-center, rl=right line, if=infield
// Type keys:  ld=line drive/fly ball, gb=ground ball
//
// Hits per player:
//   C Bosker    – 1B (inn 6)  → right-center
//   J Devereaux – 1B (inn 2)  → right-center
//               – 1B (inn 4)  → right-center
//               – 2B (inn 6)  → left-center gap
//   R Hamly     – 1B (inn 6)  → right field line
//   B Borek     – 1B (inn 6)  → right-center
//   F Williams  – 1B (inn 6)  → center
//
const GAME1_ZONES = {
  'C Bosker':    [{ zone: 'rc', type: 'ld' }],
  'J Devereaux': [{ zone: 'rc', type: 'ld' }, { zone: 'rc', type: 'ld' }, { zone: 'lc', type: 'ld' }],
  'R Hamly':     [{ zone: 'rl', type: 'ld' }],
  'B Borek':     [{ zone: 'rc', type: 'ld' }],
  'F Williams':  [{ zone: 'c',  type: 'ld' }],
};

async function main() {
  console.log('Connecting to Turso…\n');

  // Find game
  const gameRes = await db.execute({
    sql:  "SELECT id FROM games WHERE game_date = '2026-03-29' AND opponent LIKE '%Ada%' LIMIT 1",
    args: [],
  });

  if (!gameRes.rows.length) {
    console.error('❌  Game (Mar 29 vs Ada Lions) not found in database.');
    process.exit(1);
  }

  const gameId = Number(gameRes.rows[0].id);
  console.log(`✓  Found game id=${gameId} (Mar 29 vs Ada Lions 9U)\n`);

  for (const [playerName, zones] of Object.entries(GAME1_ZONES)) {
    const playerRes = await db.execute({
      sql:  'SELECT id FROM players WHERE name = ? LIMIT 1',
      args: [playerName],
    });

    if (!playerRes.rows.length) {
      console.warn(`⚠️   Player not found: "${playerName}" — skipping`);
      continue;
    }

    const playerId = Number(playerRes.rows[0].id);

    const updateRes = await db.execute({
      sql:  'UPDATE at_bats SET hit_zones = ? WHERE player_id = ? AND game_id = ?',
      args: [JSON.stringify(zones), playerId, gameId],
    });

    const changed = Number(updateRes.rowsAffected ?? 0);
    if (changed) {
      const desc = zones.map(z => `${z.zone.toUpperCase()}(${z.type})`).join(', ');
      console.log(`  ✓  ${playerName.padEnd(16)} → ${desc}`);
    } else {
      console.warn(`  ⚠️   ${playerName}: at_bat row not found for this game`);
    }
  }

  console.log('\n✅  Done — spray chart zones applied for Game 1.');
  console.log('    Open any player profile to see their spray chart.');
  console.log('\n    NOTE: Zones were read from the scorebook arrows.');
  console.log('    You can fine-tune them via the Edit button on each player\'s spray chart.\n');
}

main().catch(err => {
  console.error('\n❌  Failed:', err.message);
  process.exit(1);
});
