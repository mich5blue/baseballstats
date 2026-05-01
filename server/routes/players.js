const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');

// GET all players
router.get('/', async (req, res) => {
  try {
    const db = getDb();
    const players = await db.all(`
      SELECT p.*,
        GROUP_CONCAT(t.id || ':' || t.name || ':' || t.color, '|') as teams_raw
      FROM players p
      LEFT JOIN player_teams pt ON p.id = pt.player_id
      LEFT JOIN teams t ON pt.team_id = t.id
      GROUP BY p.id
      ORDER BY p.is_featured DESC, p.name
    `, []);

    const result = players.map(p => {
      const teams = p.teams_raw
        ? p.teams_raw.split('|').filter(Boolean).map(t => {
            const [id, name, color] = t.split(':');
            return { id: parseInt(id), name, color };
          })
        : [];
      delete p.teams_raw;
      return { ...p, teams };
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single player
router.get('/:id', async (req, res) => {
  try {
    const db = getDb();
    const player = await db.get('SELECT * FROM players WHERE id = ?', [req.params.id]);
    if (!player) return res.status(404).json({ error: 'Player not found' });

    const teams = await db.all(`
      SELECT t.*, pt.jersey_number, pt.position as team_position
      FROM teams t
      JOIN player_teams pt ON t.id = pt.team_id
      WHERE pt.player_id = ?
    `, [req.params.id]);

    res.json({ ...player, teams });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create player
router.post('/', async (req, res) => {
  try {
    const db = getDb();
    const { name, nickname, position, bats, throws, is_featured, notes, jersey_number } = req.body;
    if (!name) return res.status(400).json({ error: 'Player name is required' });

    // If marking as featured, unset all other featured players
    if (is_featured) {
      await db.run('UPDATE players SET is_featured = 0', []);
    }

    const result = await db.run(`
      INSERT INTO players (name, nickname, position, bats, throws, is_featured, notes, jersey_number)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      name,
      nickname || null,
      position || null,
      bats || 'R',
      throws || 'R',
      is_featured ? 1 : 0,
      notes || null,
      jersey_number || null,
    ]);

    const player = await db.get('SELECT * FROM players WHERE id = ?', [result.lastInsertRowid]);
    res.status(201).json(player);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update player
router.put('/:id', async (req, res) => {
  try {
    const db = getDb();
    const existing = await db.get('SELECT * FROM players WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Player not found' });

    const { name, nickname, position, bats, throws, is_featured, notes, jersey_number } = req.body;

    // If marking as featured, unset all other featured players
    if (is_featured) {
      await db.run('UPDATE players SET is_featured = 0 WHERE id != ?', [req.params.id]);
    }

    await db.run(`
      UPDATE players SET name = ?, nickname = ?, position = ?, bats = ?, throws = ?, is_featured = ?, notes = ?, jersey_number = ?
      WHERE id = ?
    `, [
      name !== undefined ? name : existing.name,
      nickname !== undefined ? nickname : existing.nickname,
      position !== undefined ? position : existing.position,
      bats !== undefined ? bats : existing.bats,
      throws !== undefined ? throws : existing.throws,
      is_featured !== undefined ? (is_featured ? 1 : 0) : existing.is_featured,
      notes !== undefined ? notes : existing.notes,
      jersey_number !== undefined ? jersey_number : existing.jersey_number,
      req.params.id
    ]);

    const player = await db.get('SELECT * FROM players WHERE id = ?', [req.params.id]);
    res.json(player);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE player
router.delete('/:id', async (req, res) => {
  try {
    const db = getDb();
    const existing = await db.get('SELECT * FROM players WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Player not found' });
    await db.run('DELETE FROM players WHERE id = ?', [req.params.id]);
    res.json({ message: 'Player deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST add player to team
router.post('/:id/teams', async (req, res) => {
  try {
    const db = getDb();
    const { team_id, jersey_number, position } = req.body;
    if (!team_id) return res.status(400).json({ error: 'team_id is required' });

    const player = await db.get('SELECT * FROM players WHERE id = ?', [req.params.id]);
    if (!player) return res.status(404).json({ error: 'Player not found' });

    const team = await db.get('SELECT * FROM teams WHERE id = ?', [team_id]);
    if (!team) return res.status(404).json({ error: 'Team not found' });

    try {
      await db.run(`
        INSERT INTO player_teams (player_id, team_id, jersey_number, position)
        VALUES (?, ?, ?, ?)
      `, [req.params.id, team_id, jersey_number || null, position || null]);
    } catch (e) {
      if (e.message.includes('UNIQUE')) {
        // Update existing
        await db.run(`
          UPDATE player_teams SET jersey_number = ?, position = ?
          WHERE player_id = ? AND team_id = ?
        `, [jersey_number || null, position || null, req.params.id, team_id]);
      } else throw e;
    }

    res.status(201).json({ message: 'Player added to team' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE remove player from team
router.delete('/:id/teams/:teamId', async (req, res) => {
  try {
    const db = getDb();
    await db.run('DELETE FROM player_teams WHERE player_id = ? AND team_id = ?', [req.params.id, req.params.teamId]);
    res.json({ message: 'Player removed from team' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
