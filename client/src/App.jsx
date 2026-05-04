import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { TeamProvider } from './context/TeamContext.jsx';
import { useTeam } from './context/TeamContext.jsx';
import PinGate from './components/PinGate.jsx';
import Navbar from './components/Navbar.jsx';
import LoadingScreen from './components/LoadingScreen.jsx';
import Home from './pages/Home.jsx';
import Manage from './pages/Manage.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Roster from './pages/Roster.jsx';
import PlayerProfile from './pages/PlayerProfile.jsx';
import GameLog from './pages/GameLog.jsx';
import GameDetail from './pages/GameDetail.jsx';
import TeamStats from './pages/TeamStats.jsx';
import Import from './pages/Import.jsx';

function TeamLayout() {
  const { isLoading, slug, team } = useTeam();

  useEffect(() => {
    if (team?.name) {
      document.title = team.name;
    } else {
      document.title = 'Baseball Statistics';
    }
    return () => { document.title = 'Baseball Statistics'; };
  }, [team?.name]);

  if (isLoading) {
    const label = slug
      ? slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
      : 'Loading…';
    return <LoadingScreen label={label} />;
  }

  return (
    <div className="min-h-screen bg-field text-white">
      <Navbar />
      <main className="pt-4 pb-12">
        <PinGate>
          <Outlet />
        </PinGate>
      </main>
    </div>
  );
}

// If VITE_TEAM_SLUG is set, this deployment is locked to a single team.
// The home page redirects straight to that team's dashboard.
const FIXED_SLUG = import.meta.env.VITE_TEAM_SLUG || null;

function RootLayout() {
  return (
    <div className="min-h-screen bg-field text-white">
      <Navbar rootMode />
      <main className="pt-4 pb-12">
        <Outlet />
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Top-level pages — no team context */}
        <Route element={<RootLayout />}>
          <Route path="/" element={
            FIXED_SLUG
              ? <Navigate to={`/${FIXED_SLUG}/dashboard`} replace />
              : <Home />
          } />
          <Route path="/manage" element={<Manage />} />
        </Route>

        {/* Team-scoped pages — slug in URL */}
        <Route path="/:slug" element={<TeamProvider><TeamLayout /></TeamProvider>}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="roster" element={<Roster />} />
          <Route path="players/:id" element={<PlayerProfile />} />
          <Route path="games" element={<GameLog />} />
          <Route path="games/:id" element={<GameDetail />} />
          <Route path="stats" element={<TeamStats />} />
          <Route path="admin" element={<Import />} />
        </Route>

        {/* Legacy redirects */}
        <Route path="/import" element={<Navigate to="/" replace />} />
        <Route path="/players" element={<Navigate to="/" replace />} />
        <Route path="/teams" element={<Navigate to="/" replace />} />
        <Route path="/teams/:id" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
