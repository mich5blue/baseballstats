const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');

// GET pitching stats for a specific game
router.get('/game/:gameId', async (req, res) => {
  try {
    const db = getDb();
    const stats = await db.all(`
      SELECT ps.*, p.name as player_name, p.position as player_position
      FROM pitching_stats ps
      JOIN players p ON ps.player_id = p.id
      WHERE ps.game_id = ?
      ORDER BY p.name
    `, [req.params.gameId]);
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET all pitching stats
router.get('/', async (req, res) => {
  try {
    const db = getDb();
    const { player_id, game_id, team_id } = req.query;
    let query = `
      SELECT ps.*, p.name as player_name, g.opponent, g.game_date
      FROM pitching_stats ps
      JOIN players p ON ps.player_id = p.id
      JOIN games g ON ps.game_id = g.id
      WHERE 1=1
    `;
    const params = [];
    if (player_id) { query += ' AND ps.player_id = ?'; params.push(player_id); }
    if (game_id) { query += ' AND ps.game_id = ?'; params.push(game_id); }
    if (team_id) { query += ' AND ps.team_id = ?'; params.push(team_id); }
    query += ' ORDER BY g.game_date DESC';
    const stats = await db.all(query, params);
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single pitching stat
router.get('/:id', async (req, res) => {
  try {
    const db = getDb();
    const stat = await db.get(`
      SELECT ps.*, p.name as player_name
      FROM pitching_stats ps
      JOIN players p ON ps.player_id = p.id
      WHERE ps.id = ?
    `, [req.params.id]);
    if (!stat) return res.status(404).json({ error: 'Pitching stat not found' });
    res.json(stat);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create pitching stat
router.post('/', async (req, res) => {
  try {
    const db = getDb();
    const {
      player_id, game_id, team_id, innings_pitched, hits_allowed, runs_allowed,
      earned_runs, walks, strikeouts, home_runs_allowed, pitches, strikes,
      win, loss, save_stat, notes
    } = req.body;

    if (!player_id || !game_id || !team_id) {
      return res.status(400).json({ error: 'player_id, game_id, and team_id are required' });
    }

    const result = await db.run(`
      INSERT INTO pitching_stats (
        player_id, game_id, team_id, innings_pitched, hits_allowed, runs_allowed,
        earned_runs, walks, strikeouts, home_runs_allowed, pitches, strikes,
        win, loss, save_stat, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      player_id, game_id, team_id,
      innings_pitched || 0, hits_allowed || 0, runs_allowed || 0,
      earned_runs || 0, walks || 0, strikeouts || 0, home_runs_allowed || 0,
      pitches || 0, strikes || 0, win ? 1 : 0, loss ? 1 : 0, save_stat ? 1 : 0,
      notes || null
    ]);

    const stat = await db.get(`
      SELECT ps.*, p.name as player_name
      FROM pitching_stats ps
      JOIN players p ON ps.player_id = p.id
      WHERE ps.id = ?
    `, [result.lastInsertRowid]);

    res.status(201).json(stat);
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Pitching stat already exists for this player/game. Use PUT to update.' });
    }
    res.status(500).json({ error: err.message });
  }
});

// PUT update pitching stat
router.put('/:id', async (req, res) => {
  try {
    const db = getDb();
    const existing = await db.get('SELECT * FROM pitching_stats WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Pitching stat not found' });

    const fields = [
      'innings_pitched', 'hits_allowed', 'runs_allowed', 'earned_runs', 'walks',
      'strikeouts', 'home_runs_allowed', 'pitches', 'strikes', 'win', 'loss',
      'save_stat', 'notes'
    ];

    const updates = {};
    fields.forEach(f => {
      updates[f] = req.body[f] !== undefined ? req.body[f] : existing[f];
    });

    await db.run(`
      UPDATE pitching_stats SET
        innings_pitched = ?, hits_allowed = ?, runs_allowed = ?, earned_runs = ?,
        walks = ?, strikeouts = ?, home_runs_allowed = ?, pitches = ?, strikes = ?,
        win = ?, loss = ?, save_stat = ?, notes = ?
      WHERE id = ?
    `, [
      updates.innings_pitched, updates.hits_allowed, updates.runs_allowed,
      updates.earned_runs, updates.walks, updates.strikeouts, updates.home_runs_allowed,
      updates.pitches, updates.strikes, updates.win ? 1 : 0, updates.loss ? 1 : 0,
      updates.save_stat ? 1 : 0, updates.notes, req.params.id
    ]);

    const stat = await db.get(`
      SELECT ps.*, p.name as player_name
      FROM pitching_stats ps
      JOIN players p ON ps.player_id = p.id
      WHERE ps.id = ?
    `, [req.params.id]);

    res.json(stat);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE pitching stat
router.delete('/:id', async (req, res) => {
  try {
    const db = getDb();
    const existing = await db.get('SELECT * FROM pitching_stats WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Pitching stat not found' });
    await db.run('DELETE FROM pitching_stats WHERE id = ?', [req.params.id]);
    res.json({ message: 'Pitching stat deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
