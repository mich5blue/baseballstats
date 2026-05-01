const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
const teamsRouter = require('./routes/teams');
const playersRouter = require('./routes/players');
const gamesRouter = require('./routes/games');
const atBatsRouter = require('./routes/atBats');
const pitchingRouter = require('./routes/pitching');
const statsRouter = require('./routes/stats');
const importRouter = require('./routes/importRoute');

app.use('/api/teams', teamsRouter);
app.use('/api/players', playersRouter);
app.use('/api/games', gamesRouter);
app.use('/api/at-bats', atBatsRouter);
app.use('/api/pitching', pitchingRouter);
app.use('/api/stats', statsRouter);
app.use('/api/import', importRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

module.exports = app;
