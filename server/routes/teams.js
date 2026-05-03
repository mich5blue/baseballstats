const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');

function makeSlug(name) {
  return String(name)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

// Strip pin from team object before sending to client
function sanitize(team) {
  if (!team) return team;
  const { pin, ...rest } = team;
  return { ...rest, has_pin: !!(pin && pin.trim()) };
}

const TEAM_COLS = `
  t.id, t.name, t.season, t.league, t.color, t.slug, t.created_at,
  !!(t.pin AND t.pin != '') as has_pin,
  (SELECT COUNT(*) FROM player_teams pt WHERE pt.team_id = t.id) as player_count,
  (SELECT COUNT(*) FROM games g WHERE g.team_id = t.id AND g.team_score > g.opponent_score) as wins,
  (SELECT COUNT(*) FROM games g WHERE g.team_id = t.id AND g.team_score < g.opponent_score) as losses,
  (SELECT COUNT(*) FROM games g WHERE g.team_id = t.id AND g.team_score = g.opponent_score AND g.team_score IS NOT NULL) as ties
`;

// GET all teams
router.get('/', async (req, res) => {
  try {
    const db = getDb();
    const teams = await db.all(`
      SELECT
        t.id, t.name, t.season, t.league, t.color, t.slug, t.created_at,
        CASE WHEN t.pin IS NOT NULL AND t.pin != '' THEN 1 ELSE 0 END as has_pin,
        (SELECT COUNT(*) FROM player_teams pt WHERE pt.team_id = t.id) as player_count,
        (SELECT COUNT(*) FROM games g WHERE g.team_id = t.id AND g.team_score > g.opponent_score) as wins,
        (SELECT COUNT(*) FROM games g WHERE g.team_id = t.id AND g.team_score < g.opponent_score) as losses,
        (SELECT COUNT(*) FROM games g WHERE g.team_id = t.id AND g.team_score = g.opponent_score AND g.team_score IS NOT NULL) as ties
      FROM teams t ORDER BY t.created_at DESC
    `, []);
    res.json(teams);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET team by slug  ← must come before /:id
router.get('/slug/:slug', async (req, res) => {
  try {
    const db = getDb();
    const team = await db.get(`
      SELECT
        t.id, t.name, t.season, t.league, t.color, t.slug, t.created_at,
        CASE WHEN t.pin IS NOT NULL AND t.pin != '' THEN 1 ELSE 0 END as has_pin,
        (SELECT COUNT(*) FROM player_teams pt WHERE pt.team_id = t.id) as player_count,
        (SELECT COUNT(*) FROM games g WHERE g.team_id = t.id AND g.team_score > g.opponent_score) as wins,
        (SELECT COUNT(*) FROM games g WHERE g.team_id = t.id AND g.team_score < g.opponent_score) as losses,
        (SELECT COUNT(*) FROM games g WHERE g.team_id = t.id AND g.team_score = g.opponent_score AND g.team_score IS NOT NULL) as ties
      FROM teams t WHERE t.slug = ?
    `, [req.params.slug]);
    if (!team) return res.status(404).json({ error: 'Team not found' });
    res.json(team);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST verify PIN for a slug
router.post('/verify-pin', async (req, res) => {
  try {
    const db = getDb();
    const { slug, pin } = req.body;
    const team = await db.get('SELECT pin FROM teams WHERE slug = ?', [slug]);
    if (!team) return res.status(404).json({ error: 'Team not found' });
    const valid = team.pin && team.pin.trim() === String(pin || '').trim();
    res.json({ valid: !!valid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single team by id
router.get('/:id', async (req, res) => {
  try {
    const db = getDb();
    const team = await db.get(`
      SELECT
        t.id, t.name, t.season, t.league, t.color, t.slug, t.created_at,
        CASE WHEN t.pin IS NOT NULL AND t.pin != '' THEN 1 ELSE 0 END as has_pin,
        (SELECT COUNT(*) FROM player_teams pt WHERE pt.team_id = t.id) as player_count,
        (SELECT COUNT(*) FROM games g WHERE g.team_id = t.id AND g.team_score > g.opponent_score) as wins,
        (SELECT COUNT(*) FROM games g WHERE g.team_id = t.id AND g.team_score < g.opponent_score) as losses,
        (SELECT COUNT(*) FROM games g WHERE g.team_id = t.id AND g.team_score = g.opponent_score AND g.team_score IS NOT NULL) as ties
      FROM teams t WHERE t.id = ?
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
    const { name, season, league, color, slug, pin } = req.body;
    if (!name) return res.status(400).json({ error: 'Team name is required' });
    const finalSlug = (slug || makeSlug(name));
    const result = await db.run(`
      INSERT INTO teams (name, season, league, color, slug, pin) VALUES (?, ?, ?, ?, ?, ?)
    `, [name, season || null, league || null, color || '#e63946', finalSlug, pin || null]);
    const team = await db.get(`
      SELECT t.id, t.name, t.season, t.league, t.color, t.slug, t.created_at,
        CASE WHEN t.pin IS NOT NULL AND t.pin != '' THEN 1 ELSE 0 END as has_pin
      FROM teams t WHERE t.id = ?
    `, [result.lastInsertRowid]);
    res.status(201).json(team);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update team
router.put('/:id', async (req, res) => {
  try {
    const db = getDb();
    const { name, season, league, color, slug, pin } = req.body;
    const existing = await db.get('SELECT * FROM teams WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Team not found' });
    const newSlug = slug !== undefined ? slug : (existing.slug || makeSlug(existing.name));
    // pin: empty string clears it, undefined keeps existing, string sets it
    const newPin = pin === '' ? null : (pin !== undefined ? pin : existing.pin);
    await db.run(`
      UPDATE teams SET name = ?, season = ?, league = ?, color = ?, slug = ?, pin = ? WHERE id = ?
    `, [
      name || existing.name,
      season !== undefined ? season : existing.season,
      league !== undefined ? league : existing.league,
      color || existing.color,
      newSlug,
      newPin,
      req.params.id,
    ]);
    const team = await db.get(`
      SELECT t.id, t.name, t.season, t.league, t.color, t.slug, t.created_at,
        CASE WHEN t.pin IS NOT NULL AND t.pin != '' THEN 1 ELSE 0 END as has_pin
      FROM teams t WHERE t.id = ?
    `, [req.params.id]);
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
