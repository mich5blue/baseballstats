import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3001/api',
  headers: { 'Content-Type': 'application/json' }
});

// Teams
export const getTeams = () => api.get('/teams').then(r => r.data);
export const getTeam = (id) => api.get(`/teams/${id}`).then(r => r.data);
export const createTeam = (data) => api.post('/teams', data).then(r => r.data);
export const updateTeam = (id, data) => api.put(`/teams/${id}`, data).then(r => r.data);
export const deleteTeam = (id) => api.delete(`/teams/${id}`).then(r => r.data);
export const getTeamRoster = (id) => api.get(`/teams/${id}/roster`).then(r => r.data);

// Players
export const getPlayers = () => api.get('/players').then(r => r.data);
export const getPlayer = (id) => api.get(`/players/${id}`).then(r => r.data);
export const createPlayer = (data) => api.post('/players', data).then(r => r.data);
export const updatePlayer = (id, data) => api.put(`/players/${id}`, data).then(r => r.data);
export const deletePlayer = (id) => api.delete(`/players/${id}`).then(r => r.data);
export const addPlayerToTeam = (playerId, data) => api.post(`/players/${playerId}/teams`, data).then(r => r.data);
export const removePlayerFromTeam = (playerId, teamId) => api.delete(`/players/${playerId}/teams/${teamId}`).then(r => r.data);

// Games
export const getGames = (teamId) => api.get('/games', { params: teamId ? { team_id: teamId } : {} }).then(r => r.data);
export const getGame = (id) => api.get(`/games/${id}`).then(r => r.data);
export const createGame = (data) => api.post('/games', data).then(r => r.data);
export const updateGame = (id, data) => api.put(`/games/${id}`, data).then(r => r.data);
export const deleteGame = (id) => api.delete(`/games/${id}`).then(r => r.data);

// At-bats
export const getAtBats = (gameId) => api.get(`/at-bats/game/${gameId}`).then(r => r.data);
export const getAtBat = (id) => api.get(`/at-bats/${id}`).then(r => r.data);
export const createAtBat = (data) => api.post('/at-bats', data).then(r => r.data);
export const updateAtBat = (id, data) => api.put(`/at-bats/${id}`, data).then(r => r.data);
export const deleteAtBat = (id) => api.delete(`/at-bats/${id}`).then(r => r.data);

// Pitching
export const getPitching = (gameId) => api.get(`/pitching/game/${gameId}`).then(r => r.data);
export const getPitchingStat = (id) => api.get(`/pitching/${id}`).then(r => r.data);
export const createPitching = (data) => api.post('/pitching', data).then(r => r.data);
export const updatePitching = (id, data) => api.put(`/pitching/${id}`, data).then(r => r.data);
export const deletePitching = (id) => api.delete(`/pitching/${id}`).then(r => r.data);

// Stats
export const getTeamStats = (teamId) => api.get(`/stats/team/${teamId}`).then(r => r.data);
export const getPlayerStats = (playerId) => api.get(`/stats/player/${playerId}`).then(r => r.data);
export const getFeaturedStats = () => api.get('/stats/featured').then(r => r.data);

// Import
export const importExcel = (formData) => api.post('/import/excel', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
}).then(r => r.data);

export const importImage = (formData) => api.post('/import/image', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
}).then(r => r.data);

export const commitBoxscore = (data) => api.post('/import/commit-boxscore', data).then(r => r.data);

export const importScorebookAnalyze = (formData) => api.post('/import/scorebook', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
}).then(r => r.data);

export const applyHitZones = (data) => api.post('/import/apply-zones', data).then(r => r.data);

export default api;
