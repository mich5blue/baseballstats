const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');

// GET all teams
router.get('/', async (req, res) => {
  try {
    const db = getDb();
    const teams = await db.all(`
      SELECT t.*,
        (SELECT COUNT(*) FROM player_teams pt WHERE pt.team_id = t.id) as player_count,
        (SELECT COUNT(*) FROM games g WHERE g.team_id = t.id AND g.team_score > g.opponent_score) as wins,
        (SELECT COUNT(*) FROM games g WHERE g.team_id = t.id AND g.team_score < g.opponent_score) as losses,
        (SELECT COUNT(*) FROM games g WHERE g.team_id = t.id AND g.team_score = g.opponent_score AND g.team_score IS NOT NULL) as ties
      FROM teams t
      ORDER BY t.created_at DESC
    `, []);
    res.json(teams);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single team
router.get('/:id', async (req, res) => {
  try {
    const db = getDb();
    const team = await db.get(`
      SELECT t.*,
        (SELECT COUNT(*) FROM player_teams pt WHERE pt.team_id = t.id) as player_count,
        (SELECT COUNT(*) FROM games g WHERE g.team_id = t.id AND g.team_score > g.opponent_score) as wins,
        (SELECT COUNT(*) FROM games g WHERE g.team_id = t.id AND g.team_score < g.opponent_score) as losses,
        (SELECT COUNT(*) FROM games g WHERE g.team_id = t.id AND g.team_score = g.opponent_score AND g.team_score IS NOT NULL) as ties
      FROM teams t
      WHERE t.id = ?
    `, [req.params.id]);
    if (!team) return res.status(404).json({ error: 'Team not found' });
    res.json(team);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create team
router.post('/', async (req, res) => {
  try {
    const db = getDb();
    const { name, season, league, color } = req.body;
    if (!name) return res.status(400).json({ error: 'Team name is required' });
    const result = await db.run(`
      INSERT INTO teams (name, season, league, color) VALUES (?, ?, ?, ?)
    `, [name, season || null, league || null, color || '#e63946']);
    const team = await db.get('SELECT * FROM teams WHERE id = ?', [result.lastInsertRowid]);
    res.status(201).json(team);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update team
router.put('/:id', async (req, res) => {
  try {
    const db = getDb();
    const { name, season, league, color } = req.body;
    const existing = await db.get('SELECT * FROM teams WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Team not found' });
    await db.run(`
      UPDATE teams SET name = ?, season = ?, league = ?, color = ? WHERE id = ?
    `, [
      name || existing.name,
      season !== undefined ? season : existing.season,
      league !== undefined ? league : existing.league,
      color || existing.color,
      req.params.id
    ]);
    const team = await db.get('SELECT * FROM teams WHERE id = ?', [req.params.id]);
    res.json(team);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE team
router.delete('/:id', async (req, res) => {
  try {
    const db = getDb();
    const existing = await db.get('SELECT * FROM teams WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Team not found' });
    await db.run('DELETE FROM teams WHERE id = ?', [req.params.id]);
    res.json({ message: 'Team deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET team roster
router.get('/:id/roster', async (req, res) => {
  try {
    const db = getDb();
    const players = await db.all(`
      SELECT p.*, pt.jersey_number, pt.position as team_position
      FROM players p
      JOIN player_teams pt ON p.id = pt.player_id
      WHERE pt.team_id = ?
      ORDER BY pt.jersey_number, p.name
    `, [req.params.id]);
    res.json(players);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
