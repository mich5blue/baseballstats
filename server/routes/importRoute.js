const express = require('express');
const router = express.Router();
const multer = require('multer');
const https = require('https');
const XLSX = require('xlsx');
const { getDb } = require('../db/database');

let pdfParse;
try { pdfParse = require('pdf-parse'); } catch (_) { pdfParse = null; }

// Use memory storage — works in serverless environments (no persistent disk)
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    const allowed = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif'
    ];
    if (allowed.includes(file.mimetype) || file.originalname.match(/\.(xlsx|xls|csv|pdf)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Accepted: Excel/CSV, PDF, or image files.'));
    }
  },
  limits: { fileSize: 20 * 1024 * 1024 }
});

// ─── Shared JSON output format prompt ────────────────────────────────────────
const BOX_SCORE_PROMPT = `You are parsing a baseball box score (GameChanger PDF, screenshot, or photo).

Extract all stats and return ONLY a raw JSON object in this exact format:

{
  "team_name": "string — the home/primary team name, or null",
  "opponent": "string — the opposing team name, or null",
  "game_date": "YYYY-MM-DD or null",
  "team_score": number or null,
  "opponent_score": number or null,
  "location": "string or null",
  "players": [
    {
      "name": "Full Name",
      "position": "SS",
      "jersey_number": "12" or null,
      "ab": number,
      "hits": number,
      "singles": number,
      "doubles": number,
      "triples": number,
      "home_runs": number,
      "rbi": number,
      "runs": number,
      "walks": number,
      "strikeouts": number,
      "hit_by_pitch": number,
      "sac_fly": number,
      "sac_bunt": number,
      "stolen_bases": number,
      "caught_stealing": number
    }
  ],
  "pitching": [
    {
      "name": "Full Name",
      "innings_pitched": number,
      "hits_allowed": number,
      "runs_allowed": number,
      "earned_runs": number,
      "walks": number,
      "strikeouts": number,
      "pitches": number,
      "win": 0 or 1,
      "loss": 0 or 1,
      "save_stat": 0 or 1
    }
  ],
  "notes": "anything you could not read or had to infer"
}

Rules:
- Only include the BATTING team's stats (not the opponent's) in players[]. If both teams are shown, use the first/home team listed.
- singles = hits - doubles - triples - home_runs. Calculate this if not shown.
- HBP players are often listed in a note line like "HBP: Player A, Player B" — set hit_by_pitch=1 for those players.
- Use 0 for any stat whose value is zero. Use null only if a column is entirely absent.
- Return ONLY the raw JSON — no markdown, no code fences, no explanation.`;

// ─── Helper: call Anthropic API with vision (for images) ──────────────────────
function callAnthropicVision(imageBase64, mediaType, prompt) {
  return new Promise((resolve, reject) => {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return reject(new Error('ANTHROPIC_API_KEY environment variable is not set.'));

    const body = JSON.stringify({
      model: 'claude-opus-4-6',
      max_tokens: 4096,
      messages: [{ role: 'user', content: [
        { type: 'image', source: { type: 'base64', media_type: mediaType, data: imageBase64 } },
        { type: 'text', text: prompt }
      ]}]
    });

    const options = {
      hostname: 'api.anthropic.com', path: '/v1/messages', method: 'POST',
      headers: {
        'Content-Type': 'application/json', 'x-api-key': apiKey,
        'anthropic-version': '2023-06-01', 'Content-Length': Buffer.byteLength(body)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) return reject(new Error(parsed.error.message || 'Anthropic API error'));
          resolve(parsed);
        } catch (e) { reject(new Error('Failed to parse Anthropic response')); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ─── Helper: call Anthropic API with plain text (for PDFs) ───────────────────
function callAnthropicText(textContent, prompt) {
  return new Promise((resolve, reject) => {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return reject(new Error('ANTHROPIC_API_KEY environment variable is not set.'));

    const body = JSON.stringify({
      model: 'claude-opus-4-6',
      max_tokens: 4096,
      messages: [{ role: 'user', content: `${prompt}\n\nHere is the box score text:\n\n${textContent}` }]
    });

    const options = {
      hostname: 'api.anthropic.com', path: '/v1/messages', method: 'POST',
      headers: {
        'Content-Type': 'application/json', 'x-api-key': apiKey,
        'anthropic-version': '2023-06-01', 'Content-Length': Buffer.byteLength(body)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) return reject(new Error(parsed.error.message || 'Anthropic API error'));
          resolve(parsed);
        } catch (e) { reject(new Error('Failed to parse Anthropic response')); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ─── Helper: call Anthropic API with PDF document ────────────────────────────
function callAnthropicDocument(docBase64, mediaType, prompt) {
  return new Promise((resolve, reject) => {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return reject(new Error('ANTHROPIC_API_KEY environment variable is not set.'));

    const body = JSON.stringify({
      model: 'claude-opus-4-6',
      max_tokens: 4096,
      messages: [{ role: 'user', content: [
        { type: 'document', source: { type: 'base64', media_type: mediaType, data: docBase64 } },
        { type: 'text', text: prompt }
      ]}]
    });

    const options = {
      hostname: 'api.anthropic.com', path: '/v1/messages', method: 'POST',
      headers: {
        'Content-Type': 'application/json', 'x-api-key': apiKey,
        'anthropic-version': '2023-06-01', 'Content-Length': Buffer.byteLength(body)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) return reject(new Error(parsed.error.message || 'Anthropic API error'));
          resolve(parsed);
        } catch (e) { reject(new Error('Failed to parse Anthropic response')); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function parseClaudeBoxScoreResponse(response) {
  const textContent = response.content?.find(c => c.type === 'text')?.text || '';
  const cleaned = textContent
    .replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
  return JSON.parse(cleaned);
}

// ─── POST /api/import/excel ───────────────────────────────────────────────────
router.post('/excel', upload.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

    if (rows.length === 0) return res.json({ headers: [], rows: [] });

    const headers = rows[0].map(h => String(h).trim());
    const dataRows = rows.slice(1).filter(row => row.some(cell => cell !== ''));

    res.json({
      headers,
      rows: dataRows.map(row => {
        const obj = {};
        headers.forEach((h, i) => { obj[h] = row[i] !== undefined ? row[i] : ''; });
        return obj;
      }),
      rowCount: dataRows.length,
      fileName: req.file.originalname
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/import/image ───────────────────────────────────────────────────
router.post('/image', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const isPdf = req.file.mimetype === 'application/pdf'
      || req.file.originalname.toLowerCase().endsWith('.pdf');

    let response;

    if (isPdf) {
      // PDF: extract text via pdf-parse → Claude text API
      if (!pdfParse) {
        return res.status(503).json({ error: 'pdf-parse not installed', needsInstall: true });
      }
      let pdfText;
      try {
        const data = await pdfParse(req.file.buffer);
        pdfText = data.text;
      } catch (e) {
        return res.status(503).json({ error: e.message });
      }
      response = await callAnthropicText(pdfText, BOX_SCORE_PROMPT);
    } else {
      // Image: base64 → Claude Vision API
      const imageBase64 = req.file.buffer.toString('base64');
      const mediaType = req.file.mimetype || 'image/jpeg';
      response = await callAnthropicVision(imageBase64, mediaType, BOX_SCORE_PROMPT);
    }

    let parsed;
    try {
      parsed = parseClaudeBoxScoreResponse(response);
    } catch (e) {
      const raw = response.content?.find(c => c.type === 'text')?.text || '';
      return res.status(422).json({
        error: 'Could not parse AI response into structured data.',
        raw: raw.slice(0, 500)
      });
    }

    res.json({ success: true, parsed, fileName: req.file.originalname, method: isPdf ? 'pdf-text' : 'vision' });
  } catch (err) {
    if (err.message?.includes('ANTHROPIC_API_KEY')) {
      return res.status(503).json({ error: 'ANTHROPIC_API_KEY not configured', needsApiKey: true });
    }
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/import/commit-boxscore ────────────────────────────────────────
router.post('/commit-boxscore', express.json(), async (req, res) => {
  const db = getDb();
  const {
    team_name, opponent, game_date, team_score, opponent_score,
    location, home_away, players = [], pitching = []
  } = req.body;

  if (!team_name) return res.status(400).json({ error: 'team_name is required' });
  if (!opponent)  return res.status(400).json({ error: 'opponent is required' });

  try {
    // 1. Find or create team
    let team = await db.get('SELECT * FROM teams WHERE name = ?', [team_name]);
    if (!team) {
      const r = await db.run(
        'INSERT INTO teams (name, season, league, color) VALUES (?, ?, ?, ?)',
        [team_name, new Date().getFullYear().toString(), '', '#e63946']
      );
      team = await db.get('SELECT * FROM teams WHERE id = ?', [r.lastInsertRowid]);
    }

    // 2. Create game
    const gameResult = await db.run(`
      INSERT INTO games (team_id, opponent, game_date, location, home_away, team_score, opponent_score)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [team.id, opponent, game_date || null, location || null,
        home_away || 'home', team_score ?? null, opponent_score ?? null]);
    const gameId = gameResult.lastInsertRowid;
    let playersCreated = 0;

    // 3. Batting players
    for (const p of players) {
      if (!p.name?.trim()) continue;
      const playerName = p.name.trim();

      let player = await db.get('SELECT * FROM players WHERE name = ?', [playerName]);
      if (!player) {
        const pr = await db.run(
          'INSERT INTO players (name, position) VALUES (?, ?)',
          [playerName, p.position || null]
        );
        player = await db.get('SELECT * FROM players WHERE id = ?', [pr.lastInsertRowid]);
      }

      await db.run(
        'INSERT OR IGNORE INTO player_teams (player_id, team_id, jersey_number, position) VALUES (?, ?, ?, ?)',
        [player.id, team.id, p.jersey_number || null, p.position || null]
      );

      await db.run(`
        INSERT OR REPLACE INTO at_bats
          (player_id, game_id, team_id, ab, hits, singles, doubles, triples, home_runs,
           rbi, runs, walks, strikeouts, hit_by_pitch, sac_fly, sac_bunt, stolen_bases, caught_stealing)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [player.id, gameId, team.id,
          p.ab||0, p.hits||0, p.singles||0, p.doubles||0, p.triples||0, p.home_runs||0,
          p.rbi||0, p.runs||0, p.walks||0, p.strikeouts||0, p.hit_by_pitch||0,
          p.sac_fly||0, p.sac_bunt||0, p.stolen_bases||0, p.caught_stealing||0]);
      playersCreated++;
    }

    // 4. Pitching players
    for (const p of pitching) {
      if (!p.name?.trim()) continue;
      const playerName = p.name.trim();

      let player = await db.get('SELECT * FROM players WHERE name = ?', [playerName]);
      if (!player) {
        const pr = await db.run(
          'INSERT INTO players (name, position) VALUES (?, ?)',
          [playerName, p.position || 'P']
        );
        player = await db.get('SELECT * FROM players WHERE id = ?', [pr.lastInsertRowid]);
      }

      await db.run(
        'INSERT OR IGNORE INTO player_teams (player_id, team_id, position) VALUES (?, ?, ?)',
        [player.id, team.id, p.position || 'P']
      );

      await db.run(`
        INSERT OR REPLACE INTO pitching_stats
          (player_id, game_id, team_id, innings_pitched, hits_allowed, runs_allowed,
           earned_runs, walks, strikeouts, pitches, win, loss, save_stat)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [player.id, gameId, team.id,
          p.innings_pitched||0, p.hits_allowed||0, p.runs_allowed||0,
          p.earned_runs||0, p.walks||0, p.strikeouts||0, p.pitches||0,
          p.win||0, p.loss||0, p.save_stat||0]);
    }

    res.json({
      success: true, teamId: team.id, teamName: team.name, gameId, playersCreated,
      message: `Created game, ${playersCreated} player records under "${team.name}"`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Scorebook Vision Prompt ──────────────────────────────────────────────────
const SCOREBOOK_PROMPT = `You are analyzing a GameChanger baseball scorebook page.

The scorebook has rows for each player and columns for each inning (1–9). Each at-bat cell shows the play outcome plus a small baseball diamond diagram. When a hit occurred, there is an arrow or line drawn inside the diamond showing the direction the ball went.

For the HOME team (Sluggers), look at each player row and each inning column.
For each at-bat that shows a HIT (labeled 1B, 2B, 3B, or HR), look at the arrow direction in the diamond diagram and map it to one of these zones:
  "ll"  = Left field line      (arrow goes to upper-left corner)
  "lc"  = Left-center field    (arrow goes upper-left, not as extreme)
  "c"   = Center field         (arrow goes straight up / upper-center)
  "rc"  = Right-center field   (arrow goes upper-right, not as extreme)
  "rl"  = Right field line     (arrow goes to upper-right corner)
  "if"  = Infield hit          (arrow stays within infield / ground ball area)

Return ONLY raw JSON in this exact format:
{
  "team_name": "team name from page header",
  "game_date": "YYYY-MM-DD",
  "hits": [
    {"player": "C. Bosker", "inning": 1, "type": "1B", "zone": "lc"},
    {"player": "B. Borek",  "inning": 2, "type": "2B", "zone": "rc"}
  ]
}

Only include HITS (1B/2B/3B/HR). Skip all other outcomes (K, BB, out, HBP, etc.).
If you cannot determine the direction for a hit, include it with zone set to null.
Return ONLY raw JSON — no markdown fences, no explanation.`;

// ─── POST /api/import/scorebook ───────────────────────────────────────────────
router.post('/scorebook', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const isPdf = req.file.mimetype === 'application/pdf'
      || req.file.originalname.toLowerCase().endsWith('.pdf');

    const fileBase64 = req.file.buffer.toString('base64');

    let response;
    if (isPdf) {
      response = await callAnthropicDocument(fileBase64, 'application/pdf', SCOREBOOK_PROMPT);
    } else {
      response = await callAnthropicVision(fileBase64, req.file.mimetype || 'image/jpeg', SCOREBOOK_PROMPT);
    }

    let parsed;
    try {
      const textContent = response.content?.find(c => c.type === 'text')?.text || '';
      const cleaned = textContent
        .replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
      parsed = JSON.parse(cleaned);
    } catch (e) {
      const raw = response.content?.find(c => c.type === 'text')?.text || '';
      return res.status(422).json({ error: 'Could not parse scorebook data', raw: raw.slice(0, 500) });
    }

    res.json({ success: true, parsed });
  } catch (err) {
    if (err.message?.includes('ANTHROPIC_API_KEY')) {
      return res.status(503).json({ error: 'ANTHROPIC_API_KEY not configured', needsApiKey: true });
    }
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/import/apply-zones ────────────────────────────────────────────
router.post('/apply-zones', express.json(), async (req, res) => {
  const db = getDb();
  const { game_date, hits = [] } = req.body;

  if (!hits.length) return res.json({ success: true, updated: 0, results: [] });

  const normName = n => n.replace(/\./g, '').replace(/\s+/g, ' ').trim().toLowerCase();

  // Group zones by player
  const byPlayer = {};
  for (const hit of hits) {
    if (!hit.player || !hit.zone) continue;
    const key = normName(hit.player);
    if (!byPlayer[key]) byPlayer[key] = { original: hit.player, zones: [] };
    byPlayer[key].zones.push(hit.zone);
  }

  const allPlayers = await db.all('SELECT * FROM players', []);
  const results = [];
  let updated = 0;

  for (const [normKey, { original, zones }] of Object.entries(byPlayer)) {
    let player = allPlayers.find(p => normName(p.name) === normKey);
    if (!player) {
      const lastName = normKey.split(' ').pop();
      const firstInitial = normKey[0];
      player = allPlayers.find(p => {
        const n = normName(p.name);
        return n.endsWith(' ' + lastName) && n[0] === firstInitial;
      });
    }
    if (!player) { results.push({ player: original, status: 'not_found' }); continue; }

    const atBat = game_date
      ? await db.get(`
          SELECT ab.* FROM at_bats ab
          JOIN games g ON ab.game_id = g.id
          WHERE ab.player_id = ? AND g.game_date = ?
          ORDER BY g.created_at DESC LIMIT 1
        `, [player.id, game_date])
      : await db.get(
          'SELECT * FROM at_bats WHERE player_id = ? ORDER BY created_at DESC LIMIT 1',
          [player.id]
        );

    if (!atBat) { results.push({ player: original, status: 'no_at_bat' }); continue; }

    let existing = [];
    try { existing = atBat.hit_zones ? JSON.parse(atBat.hit_zones) : []; } catch (_) {}
    const merged = [...existing, ...zones].slice(0, Math.max(atBat.hits || 0, zones.length));

    await db.run('UPDATE at_bats SET hit_zones = ? WHERE id = ?', [JSON.stringify(merged), atBat.id]);

    results.push({ player: original, status: 'updated', zones: merged });
    updated++;
  }

  res.json({ success: true, updated, results });
});

module.exports = router;
