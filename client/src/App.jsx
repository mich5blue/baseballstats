import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Roster from './pages/Roster.jsx';
import PlayerProfile from './pages/PlayerProfile.jsx';
import GameLog from './pages/GameLog.jsx';
import GameDetail from './pages/GameDetail.jsx';
import TeamStats from './pages/TeamStats.jsx';
import Import from './pages/Import.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-field text-white">
        <Navbar />
        <main className="pt-4 pb-12">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/roster" element={<Roster />} />
            <Route path="/players/:id" element={<PlayerProfile />} />
            <Route path="/games" element={<GameLog />} />
            <Route path="/games/:id" element={<GameDetail />} />
            <Route path="/stats" element={<TeamStats />} />
            <Route path="/admin" element={<Import />} />
            <Route path="/import" element={<Navigate to="/admin" replace />} />
            {/* Legacy redirects */}
            <Route path="/players" element={<Navigate to="/roster" replace />} />
            <Route path="/teams" element={<Navigate to="/" replace />} />
            <Route path="/teams/:id" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
