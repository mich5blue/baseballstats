# BaseballStats

A full-stack baseball statistics tracking application with a dark ESPN-style UI.

## Stack

- **Backend**: Node.js + Express + SQLite (better-sqlite3)
- **Frontend**: React 18 + Vite + TailwindCSS + React Router v6
- **Tables**: @tanstack/react-table v8 (sortable columns)
- **Charts**: recharts
- **File upload**: multer + xlsx

## Setup

### Prerequisites
- Node.js 18+
- npm 9+

### Installation

```bash
# 1. Install root dependencies (concurrently)
npm install

# 2. Install server dependencies
cd server && npm install && cd ..

# 3. Install client dependencies
cd client && npm install && cd ..
```

### Running

```bash
# Start both server and client concurrently
npm run dev
```

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001/api

### Individual services

```bash
# Server only
npm run server

# Client only
npm run client
```

## Features

- **Dashboard**: Featured player hero stats banner, recent games, quick stats
- **Teams**: Create/manage teams with color accents, W/L records
- **Team Detail**: Roster management, game log, aggregate batting/pitching stats
- **Players**: Searchable player grid, mark a featured player (your son)
- **Player Profile**: Per-team and all-teams batting/pitching stats with game logs
- **Game Log**: Filterable game history with sortable columns
- **Game Detail**: Full at-bat and pitching stats entry per game
- **Import**: Excel/CSV file upload with column mapping, screenshot upload

## Stats Calculated

- **Batting**: AVG, OBP, SLG, OPS
- **Pitching**: ERA, WHIP

## Database

SQLite database stored at `server/baseball.db`. Created automatically on first run.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET/POST | /api/teams | List/create teams |
| GET/PUT/DELETE | /api/teams/:id | Get/update/delete team |
| GET | /api/teams/:id/roster | Get team roster |
| GET/POST | /api/players | List/create players |
| GET/PUT/DELETE | /api/players/:id | Get/update/delete player |
| POST | /api/players/:id/teams | Add player to team |
| DELETE | /api/players/:id/teams/:teamId | Remove player from team |
| GET/POST | /api/games | List/create games |
| GET/PUT/DELETE | /api/games/:id | Get/update/delete game |
| GET/POST | /api/at-bats | List/create at-bats |
| GET | /api/at-bats/game/:gameId | Get at-bats for a game |
| GET/PUT/DELETE | /api/at-bats/:id | Get/update/delete at-bat |
| GET/POST | /api/pitching | List/create pitching stats |
| GET | /api/pitching/game/:gameId | Get pitching for a game |
| GET/PUT/DELETE | /api/pitching/:id | Get/update/delete pitching stat |
| GET | /api/stats/team/:teamId | Aggregate stats per player for a team |
| GET | /api/stats/player/:playerId | Per-team + overall stats for a player |
| GET | /api/stats/featured | Stats for the featured player |
| POST | /api/import/excel | Parse Excel/CSV file |
| POST | /api/import/image | Upload screenshot (requires Claude API) |
