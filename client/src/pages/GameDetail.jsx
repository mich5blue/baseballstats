import React, { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  getGame, updateGame, getAtBats, createAtBat, updateAtBat, deleteAtBat,
  getPitching, createPitching, updatePitching, deletePitching
} from '../api/client.js';
import GameForm from '../components/GameForm.jsx';
import AtBatForm from '../components/AtBatForm.jsx';
import PitchingForm from '../components/PitchingForm.jsx';
import SortableTable from '../components/SortableTable.jsx';

function formatDate(d) {
  if (!d) return '—';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
  });
}

function getResult(game) {
  if (game.team_score === null || game.opponent_score === null) return null;
  if (game.team_score > game.opponent_score) return 'W';
  if (game.team_score < game.opponent_score) return 'L';
  return 'T';
}

export default function GameDetail() {
  const { id } = useParams();
  const [game, setGame] = useState(null);
  const [atBats, setAtBats] = useState([]);
  const [pitching, setPitching] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editGame, setEditGame] = useState(false);
  const [atBatModal, setAtBatModal] = useState(null); // null | 'add' | record
  const [pitchingModal, setPitchingModal] = useState(null);

  const loadData = () => {
    Promise.all([
      getGame(id),
      getAtBats(id),
      getPitching(id)
    ]).then(([g, ab, p]) => {
      setGame(g);
      setAtBats(ab);
      setPitching(p);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, [id]);

  const result = game ? getResult(game) : null;

  const atBatCols = useMemo(() => [
    {
      header: 'Player', accessorKey: 'player_name',
      cell: i => (
        <Link to={`/players/${i.row.original.player_id}`} className="text-white hover:text-accent font-medium">
          {i.getValue()}
        </Link>
      )
    },
    { header: 'AB', accessorKey: 'ab' },
    { header: 'H', accessorKey: 'hits' },
    { header: '1B', accessorKey: 'singles' },
    { header: '2B', accessorKey: 'doubles' },
    { header: '3B', accessorKey: 'triples' },
    { header: 'HR', accessorKey: 'home_runs', cell: i => <span className={i.getValue() > 0 ? 'text-accent font-bold' : ''}>{i.getValue()}</span> },
    { header: 'RBI', accessorKey: 'rbi', cell: i => <span className={i.getValue() > 0 ? 'text-gold' : ''}>{i.getValue()}</span> },
    { header: 'R', accessorKey: 'runs' },
    { header: 'BB', accessorKey: 'walks' },
    { header: 'K', accessorKey: 'strikeouts' },
    { header: 'HBP', accessorKey: 'hit_by_pitch' },
    { header: 'SF', accessorKey: 'sac_fly' },
    { header: 'SB', accessorKey: 'stolen_bases' },
    {
      header: '', id: 'ab_actions',
      cell: i => (
        <div className="flex gap-1">
          <button
            className="text-muted hover:text-white p-1 text-sm transition-colors"
            onClick={e => { e.stopPropagation(); setAtBatModal(i.row.original); }}
          >✏️</button>
          <button
            className="text-muted hover:text-red-400 p-1 text-sm transition-colors"
            onClick={async e => {
              e.stopPropagation();
              if (!confirm('Delete this at-bat record?')) return;
              await deleteAtBat(i.row.original.id);
              loadData();
            }}
          >🗑️</button>
        </div>
      )
    }
  ], []);

  const pitchingCols = useMemo(() => [
    {
      header: 'Pitcher', accessorKey: 'player_name',
      cell: i => (
        <Link to={`/players/${i.row.original.player_id}`} className="text-white hover:text-accent font-medium">
          {i.getValue()}
        </Link>
      )
    },
    {
      header: 'DEC', id: 'decision',
      accessorFn: r => r.win ? 'W' : r.loss ? 'L' : r.save_stat ? 'SV' : '',
      cell: i => {
        const v = i.getValue();
        return <span className={v === 'W' ? 'text-emerald-400 font-bold' : v === 'L' ? 'text-red-400' : v === 'SV' ? 'text-gold font-bold' : 'text-muted'}>
          {v || '—'}
        </span>;
      }
    },
    { header: 'IP', accessorKey: 'innings_pitched', cell: i => <span className="font-mono">{(i.getValue() || 0).toFixed(1)}</span> },
    { header: 'H', accessorKey: 'hits_allowed' },
    { header: 'R', accessorKey: 'runs_allowed' },
    { header: 'ER', accessorKey: 'earned_runs' },
    { header: 'BB', accessorKey: 'walks' },
    { header: 'K', accessorKey: 'strikeouts', cell: i => <span className="text-gold">{i.getValue()}</span> },
    { header: 'HR', accessorKey: 'home_runs_allowed' },
    { header: 'P', accessorKey: 'pitches', cell: i => <span className="text-muted">{i.getValue() || 0}</span> },
    {
      header: 'B', id: 'balls',
      accessorFn: r => (r.pitches || 0) - (r.strikes || 0),
      cell: i => <span className="text-muted">{i.getValue()}</span>
    },
    { header: 'S', accessorKey: 'strikes', cell: i => <span className="text-white">{i.getValue() || 0}</span> },
    {
      header: 'S%', id: 'strike_pct',
      accessorFn: r => r.pitches > 0 ? Math.round((r.strikes || 0) / r.pitches * 100) : null,
      cell: i => {
        const v = i.getValue();
        return <span className={`font-mono ${v !== null && v >= 60 ? 'text-emerald-400' : v !== null && v < 50 ? 'text-red-400' : 'text-white'}`}>
          {v !== null ? v + '%' : '—'}
        </span>;
      }
    },
    {
      header: '', id: 'p_actions',
      cell: i => (
        <div className="flex gap-1">
          <button
            className="text-muted hover:text-white p-1 text-sm transition-colors"
            onClick={e => { e.stopPropagation(); setPitchingModal(i.row.original); }}
          >✏️</button>
          <button
            className="text-muted hover:text-red-400 p-1 text-sm transition-colors"
            onClick={async e => {
              e.stopPropagation();
              if (!confirm('Delete this pitching record?')) return;
              await deletePitching(i.row.original.id);
              loadData();
            }}
          >🗑️</button>
        </div>
      )
    }
  ], []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!game) return (
    <div className="max-w-7xl mx-auto px-4 py-12 text-center">
      <p className="text-muted text-lg">Game not found.</p>
      <Link to="/games" className="text-accent hover:underline mt-2 inline-block">← Back to Games</Link>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted mb-4">
        <Link to="/games" className="hover:text-white">Games</Link>
        <span>›</span>
        <Link to={`/teams/${game.team_id}`} className="hover:text-white" style={{ color: game.team_color }}>
          {game.team_name}
        </Link>
        <span>›</span>
        <span className="text-white">vs {game.opponent}</span>
      </div>

      {/* Game Header Card */}
      <div className="card p-6 mb-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 bottom-0 w-1.5" style={{ backgroundColor: game.team_color || '#e63946' }} />
        <div className="pl-4">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                {result && (
                  <span className={`text-4xl font-black ${result === 'W' ? 'text-emerald-400' : result === 'L' ? 'text-red-400' : 'text-yellow-400'}`}>
                    {result}
                  </span>
                )}
                {game.team_score !== null && (
                  <span className="font-mono font-black text-3xl text-white">
                    {game.team_score} – {game.opponent_score}
                  </span>
                )}
              </div>
              <h1 className="text-2xl font-bold">
                <span style={{ color: game.team_color || '#e63946' }}>{game.team_name}</span>
                <span className="text-muted mx-2">vs</span>
                <span className="text-white">{game.opponent}</span>
              </h1>
              <div className="flex items-center gap-3 mt-2 text-sm text-muted flex-wrap">
                <span>{formatDate(game.game_date)}</span>
                {game.location && <><span>·</span><span>{game.location}</span></>}
                <span>·</span>
                <span className="capitalize">{game.home_away}</span>
              </div>
              {game.notes && <p className="text-muted text-sm mt-2 italic">"{game.notes}"</p>}
            </div>
            <button
              className="btn-secondary text-sm"
              onClick={() => setEditGame(true)}
            >
              ✏️ Edit Game
            </button>
          </div>
        </div>
      </div>

      {/* Batting Stats */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="text-accent">🏏</span> Batting
            <span className="text-muted text-sm font-normal">({atBats.length} player{atBats.length !== 1 ? 's' : ''})</span>
          </h2>
          <button className="btn-primary" onClick={() => setAtBatModal('add')}>+ Add At-Bat</button>
        </div>
        <SortableTable
          columns={atBatCols}
          data={atBats}
          emptyMessage="No at-bat stats recorded for this game."
        />
        {atBats.length > 0 && (
          <div className="mt-3 grid grid-cols-5 sm:grid-cols-10 gap-2 text-center">
            {[
              { label: 'AB', val: atBats.reduce((s,r) => s + (r.ab||0), 0) },
              { label: 'H', val: atBats.reduce((s,r) => s + (r.hits||0), 0) },
              { label: 'HR', val: atBats.reduce((s,r) => s + (r.home_runs||0), 0), color: 'text-accent' },
              { label: 'RBI', val: atBats.reduce((s,r) => s + (r.rbi||0), 0), color: 'text-gold' },
              { label: 'R', val: atBats.reduce((s,r) => s + (r.runs||0), 0) },
              { label: 'BB', val: atBats.reduce((s,r) => s + (r.walks||0), 0) },
              { label: 'K', val: atBats.reduce((s,r) => s + (r.strikeouts||0), 0) },
              { label: '2B', val: atBats.reduce((s,r) => s + (r.doubles||0), 0) },
              { label: '3B', val: atBats.reduce((s,r) => s + (r.triples||0), 0) },
              { label: 'SB', val: atBats.reduce((s,r) => s + (r.stolen_bases||0), 0) },
            ].map(s => (
              <div key={s.label} className="bg-surface2 rounded p-2">
                <div className={`font-mono font-bold ${s.color || 'text-white'}`}>{s.val}</div>
                <div className="text-muted text-xs">{s.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pitching Stats */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="text-gold">⚾</span> Pitching
            <span className="text-muted text-sm font-normal">({pitching.length} pitcher{pitching.length !== 1 ? 's' : ''})</span>
          </h2>
          <button className="btn-primary" onClick={() => setPitchingModal('add')}>+ Add Pitching</button>
        </div>
        <SortableTable
          columns={pitchingCols}
          data={pitching}
          emptyMessage="No pitching stats recorded for this game."
        />
      </div>

      {/* Edit Game Modal */}
      {editGame && (
        <div className="modal-backdrop" onClick={() => setEditGame(false)}>
          <div className="card w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-5">Edit Game</h2>
            <GameForm
              initial={game}
              teamId={game.team_id}
              onSubmit={async (data) => {
                await updateGame(game.id, data);
                loadData();
                setEditGame(false);
              }}
              onCancel={() => setEditGame(false)}
            />
          </div>
        </div>
      )}

      {/* At-Bat Modal */}
      {atBatModal && (
        <div className="modal-backdrop" onClick={() => setAtBatModal(null)}>
          <div className="card w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-5">
              {atBatModal === 'add' ? 'Add At-Bat' : `Edit: ${atBatModal.player_name}`}
            </h2>
            <AtBatForm
              initial={atBatModal !== 'add' ? atBatModal : undefined}
              gameId={game.id}
              teamId={game.team_id}
              onSubmit={async (data) => {
                if (atBatModal === 'add') await createAtBat(data);
                else await updateAtBat(atBatModal.id, data);
                loadData();
                setAtBatModal(null);
              }}
              onCancel={() => setAtBatModal(null)}
            />
          </div>
        </div>
      )}

      {/* Pitching Modal */}
      {pitchingModal && (
        <div className="modal-backdrop" onClick={() => setPitchingModal(null)}>
          <div className="card w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-5">
              {pitchingModal === 'add' ? 'Add Pitching Stats' : `Edit: ${pitchingModal.player_name}`}
            </h2>
            <PitchingForm
              initial={pitchingModal !== 'add' ? pitchingModal : undefined}
              gameId={game.id}
              teamId={game.team_id}
              onSubmit={async (data) => {
                if (pitchingModal === 'add') await createPitching(data);
                else await updatePitching(pitchingModal.id, data);
                loadData();
                setPitchingModal(null);
              }}
              onCancel={() => setPitchingModal(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
