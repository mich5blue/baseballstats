const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');

// GET at-bats for a specific game
router.get('/game/:gameId', async (req, res) => {
  try {
    const db = getDb();
    const atBats = await db.all(`
      SELECT ab.*, p.name as player_name, p.position as player_position
      FROM at_bats ab
      JOIN players p ON ab.player_id = p.id
      WHERE ab.game_id = ?
      ORDER BY p.name
    `, [req.params.gameId]);
    res.json(atBats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET all at-bats
router.get('/', async (req, res) => {
  try {
    const db = getDb();
    const { player_id, game_id, team_id } = req.query;
    let query = `
      SELECT ab.*, p.name as player_name, g.opponent, g.game_date
      FROM at_bats ab
      JOIN players p ON ab.player_id = p.id
      JOIN games g ON ab.game_id = g.id
      WHERE 1=1
    `;
    const params = [];
    if (player_id) { query += ' AND ab.player_id = ?'; params.push(player_id); }
    if (game_id) { query += ' AND ab.game_id = ?'; params.push(game_id); }
    if (team_id) { query += ' AND ab.team_id = ?'; params.push(team_id); }
    query += ' ORDER BY g.game_date DESC';
    const atBats = await db.all(query, params);
    res.json(atBats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single at-bat
router.get('/:id', async (req, res) => {
  try {
    const db = getDb();
    const atBat = await db.get(`
      SELECT ab.*, p.name as player_name
      FROM at_bats ab
      JOIN players p ON ab.player_id = p.id
      WHERE ab.id = ?
    `, [req.params.id]);
    if (!atBat) return res.status(404).json({ error: 'At-bat not found' });
    res.json(atBat);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create at-bat
router.post('/', async (req, res) => {
  try {
    const db = getDb();
    const {
      player_id, game_id, team_id, ab, hits, singles, doubles, triples,
      home_runs, rbi, runs, walks, strikeouts, hit_by_pitch, sac_fly,
      sac_bunt, stolen_bases, caught_stealing, notes, hit_zones
    } = req.body;

    if (!player_id || !game_id || !team_id) {
      return res.status(400).json({ error: 'player_id, game_id, and team_id are required' });
    }

    const result = await db.run(`
      INSERT INTO at_bats (
        player_id, game_id, team_id, ab, hits, singles, doubles, triples,
        home_runs, rbi, runs, walks, strikeouts, hit_by_pitch, sac_fly,
        sac_bunt, stolen_bases, caught_stealing, notes, hit_zones
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      player_id, game_id, team_id,
      ab || 0, hits || 0, singles || 0, doubles || 0, triples || 0,
      home_runs || 0, rbi || 0, runs || 0, walks || 0, strikeouts || 0,
      hit_by_pitch || 0, sac_fly || 0, sac_bunt || 0, stolen_bases || 0,
      caught_stealing || 0, notes || null,
      hit_zones ? (typeof hit_zones === 'string' ? hit_zones : JSON.stringify(hit_zones)) : null
    ]);

    const atBat = await db.get(`
      SELECT ab.*, p.name as player_name
      FROM at_bats ab
      JOIN players p ON ab.player_id = p.id
      WHERE ab.id = ?
    `, [result.lastInsertRowid]);

    res.status(201).json(atBat);
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'At-bat record already exists for this player/game. Use PUT to update.' });
    }
    res.status(500).json({ error: err.message });
  }
});

// PUT update at-bat
router.put('/:id', async (req, res) => {
  try {
    const db = getDb();
    const existing = await db.get('SELECT * FROM at_bats WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'At-bat not found' });

    const fields = [
      'ab', 'hits', 'singles', 'doubles', 'triples', 'home_runs', 'rbi',
      'runs', 'walks', 'strikeouts', 'hit_by_pitch', 'sac_fly', 'sac_bunt',
      'stolen_bases', 'caught_stealing', 'notes', 'hit_zones'
    ];

    const updates = {};
    fields.forEach(f => {
      updates[f] = req.body[f] !== undefined ? req.body[f] : existing[f];
    });

    // Normalise hit_zones to a JSON string
    if (updates.hit_zones && typeof updates.hit_zones !== 'string') {
      updates.hit_zones = JSON.stringify(updates.hit_zones);
    }

    await db.run(`
      UPDATE at_bats SET
        ab = ?, hits = ?, singles = ?, doubles = ?, triples = ?, home_runs = ?,
        rbi = ?, runs = ?, walks = ?, strikeouts = ?, hit_by_pitch = ?, sac_fly = ?,
        sac_bunt = ?, stolen_bases = ?, caught_stealing = ?, notes = ?, hit_zones = ?
      WHERE id = ?
    `, [
      updates.ab, updates.hits, updates.singles, updates.doubles, updates.triples,
      updates.home_runs, updates.rbi, updates.runs, updates.walks, updates.strikeouts,
      updates.hit_by_pitch, updates.sac_fly, updates.sac_bunt, updates.stolen_bases,
      updates.caught_stealing, updates.notes, updates.hit_zones || null, req.params.id
    ]);

    const atBat = await db.get(`
      SELECT ab.*, p.name as player_name
      FROM at_bats ab
      JOIN players p ON ab.player_id = p.id
      WHERE ab.id = ?
    `, [req.params.id]);

    res.json(atBat);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE at-bat
router.delete('/:id', async (req, res) => {
  try {
    const db = getDb();
    const existing = await db.get('SELECT * FROM at_bats WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'At-bat not found' });
    await db.run('DELETE FROM at_bats WHERE id = ?', [req.params.id]);
    res.json({ message: 'At-bat deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
