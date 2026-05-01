const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');

// GET all games (optionally filtered by team)
router.get('/', async (req, res) => {
  try {
    const db = getDb();
    const { team_id } = req.query;
    let query = `
      SELECT g.*, t.name as team_name, t.color as team_color
      FROM games g
      JOIN teams t ON g.team_id = t.id
    `;
    const params = [];
    if (team_id) {
      query += ' WHERE g.team_id = ?';
      params.push(team_id);
    }
    query += ' ORDER BY g.game_date DESC, g.created_at DESC';
    const games = await db.all(query, params);
    res.json(games);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single game
router.get('/:id', async (req, res) => {
  try {
    const db = getDb();
    const game = await db.get(`
      SELECT g.*, t.name as team_name, t.color as team_color
      FROM games g
      JOIN teams t ON g.team_id = t.id
      WHERE g.id = ?
    `, [req.params.id]);
    if (!game) return res.status(404).json({ error: 'Game not found' });
    res.json(game);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create game
router.post('/', async (req, res) => {
  try {
    const db = getDb();
    const { team_id, opponent, game_date, location, home_away, team_score, opponent_score, notes } = req.body;
    if (!team_id) return res.status(400).json({ error: 'team_id is required' });
    if (!opponent) return res.status(400).json({ error: 'opponent is required' });

    const result = await db.run(`
      INSERT INTO games (team_id, opponent, game_date, location, home_away, team_score, opponent_score, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      team_id,
      opponent,
      game_date || null,
      location || null,
      home_away || 'home',
      team_score !== undefined ? team_score : null,
      opponent_score !== undefined ? opponent_score : null,
      notes || null
    ]);

    const game = await db.get(`
      SELECT g.*, t.name as team_name, t.color as team_color
      FROM games g
      JOIN teams t ON g.team_id = t.id
      WHERE g.id = ?
    `, [result.lastInsertRowid]);

    res.status(201).json(game);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update game
router.put('/:id', async (req, res) => {
  try {
    const db = getDb();
    const existing = await db.get('SELECT * FROM games WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Game not found' });

    const { team_id, opponent, game_date, location, home_away, team_score, opponent_score, notes } = req.body;

    await db.run(`
      UPDATE games SET team_id = ?, opponent = ?, game_date = ?, location = ?,
        home_away = ?, team_score = ?, opponent_score = ?, notes = ?
      WHERE id = ?
    `, [
      team_id || existing.team_id,
      opponent !== undefined ? opponent : existing.opponent,
      game_date !== undefined ? game_date : existing.game_date,
      location !== undefined ? location : existing.location,
      home_away !== undefined ? home_away : existing.home_away,
      team_score !== undefined ? team_score : existing.team_score,
      opponent_score !== undefined ? opponent_score : existing.opponent_score,
      notes !== undefined ? notes : existing.notes,
      req.params.id
    ]);

    const game = await db.get(`
      SELECT g.*, t.name as team_name, t.color as team_color
      FROM games g
      JOIN teams t ON g.team_id = t.id
      WHERE g.id = ?
    `, [req.params.id]);

    res.json(game);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE game
router.delete('/:id', async (req, res) => {
  try {
    const db = getDb();
    const existing = await db.get('SELECT * FROM games WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Game not found' });
    await db.run('DELETE FROM games WHERE id = ?', [req.params.id]);
    res.json({ message: 'Game deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
