import React, { useState } from 'react';
import { LogoIcon } from '../components/Icons';

interface LandingPageProps {
  onJoinRoom: (roomId: string, userName: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onJoinRoom }) => {
  const [userName, setUserName] = useState('');
  const [joinRoomId, setJoinRoomId] = useState('');

  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    const newRoomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    onJoinRoom(newRoomId, userName.trim() || 'Artist');
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinRoomId.trim()) return;
    onJoinRoom(joinRoomId.trim().toUpperCase(), userName.trim() || 'Artist');
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: '#0f172a',
        color: '#f8fafc',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        padding: '1.5rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem' }}>
        <LogoIcon size={36} color="#3b82f6" />
        <span style={{ fontSize: '2rem', fontWeight: 900, letterSpacing: '-0.03em', color: '#ffffff' }}>
          CollabDraw
        </span>
      </div>

      <div
        style={{
          width: '100%',
          maxWidth: '420px',
          backgroundColor: '#1e293b',
          borderRadius: '16px',
          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3), 0 8px 10px -6px rgba(0,0,0,0.2)',
          padding: '2.5rem 2rem',
          border: '1px solid #334155',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f8fafc', margin: '0 0 0.5rem 0' }}>
            Real-Time Whiteboard
          </h1>
          <p style={{ fontSize: '0.9rem', color: '#94a3b8', margin: 0, lineHeight: 1.5 }}>
            Collaborative vector canvas for teams and creators
          </p>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label
            htmlFor="artist-name"
            style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}
          >
            Your Display Name
          </label>
          <input
            id="artist-name"
            type="text"
            placeholder="e.g. Alex"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              border: '1px solid #475569',
              backgroundColor: '#0f172a',
              color: '#ffffff',
              fontSize: '0.95rem',
              boxSizing: 'border-box',
              outline: 'none',
            }}
          />
        </div>

        <form onSubmit={handleCreateRoom} style={{ marginBottom: '1.5rem' }}>
          <button
            type="submit"
            style={{
              width: '100%',
              padding: '0.85rem 1rem',
              backgroundColor: '#2563eb',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.95rem',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
              transition: 'background-color 0.15s ease',
            }}
          >
            Create New Studio Room
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', margin: '1.5rem 0' }}>
          <div style={{ flex: 1, borderBottom: '1px solid #334155' }} />
          <span style={{ padding: '0 0.75rem', fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
            OR JOIN EXISTING
          </span>
          <div style={{ flex: 1, borderBottom: '1px solid #334155' }} />
        </div>

        <form onSubmit={handleJoinRoom} style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            type="text"
            placeholder="Room Code (e.g. A1B2C3)"
            value={joinRoomId}
            onChange={(e) => setJoinRoomId(e.target.value.toUpperCase())}
            style={{
              flex: 1,
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              border: '1px solid #475569',
              backgroundColor: '#0f172a',
              color: '#ffffff',
              fontSize: '0.95rem',
              boxSizing: 'border-box',
              outline: 'none',
              letterSpacing: '0.05em',
            }}
          />
          <button
            type="submit"
            style={{
              padding: '0.75rem 1.25rem',
              backgroundColor: '#334155',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.95rem',
              cursor: 'pointer',
              transition: 'background-color 0.15s ease',
            }}
          >
            Join
          </button>
        </form>
      </div>

      <div style={{ marginTop: '2rem', fontSize: '0.8rem', color: '#64748b' }}>
        CollabDraw Canvas — Server Authoritative Real-Time Architecture
      </div>
    </div>
  );
};
