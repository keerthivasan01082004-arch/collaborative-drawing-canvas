import React, { useState } from 'react';
import { useRoomStore } from '../../state/roomStore';
import { PresenceList } from '../PresenceList';
import { LogoIcon, CopyIcon, CheckIcon } from '../Icons';
import { useToast } from '../Toast';

interface TopBarProps {
  onLeave: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ onLeave }) => {
  const roomId = useRoomStore((state) => state.roomId);
  const status = useRoomStore((state) => state.status);
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    showToast('Room invite link copied to clipboard', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const getStatusText = () => {
    switch (status) {
      case 'connected':
        return 'Synced';
      case 'reconnecting':
        return 'Reconnecting...';
      case 'connecting':
        return 'Connecting...';
      default:
        return 'Disconnected';
    }
  };

  return (
    <header
      style={{
        height: '56px',
        backgroundColor: '#0f172a',
        color: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        borderBottom: '1px solid #1e293b',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        zIndex: 40,
      }}
    >
      {/* Left: Product Logo & Room Badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <LogoIcon size={22} color="#3b82f6" />
          <span style={{ fontWeight: 800, fontSize: '1.05rem', letterSpacing: '-0.02em', color: '#f8fafc' }}>
            CollabDraw
          </span>
        </div>

        <div style={{ height: '18px', width: '1px', backgroundColor: '#334155' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              fontSize: '0.85rem',
              fontWeight: 700,
              backgroundColor: '#1e293b',
              padding: '4px 10px',
              borderRadius: '6px',
              color: '#e2e8f0',
              border: '1px solid #334155',
              letterSpacing: '0.05em',
            }}
          >
            #{roomId}
          </span>
          <span style={{ fontSize: '0.75rem', color: status === 'connected' ? '#10b981' : '#f59e0b', fontWeight: 500 }}>
            {getStatusText()}
          </span>
        </div>
      </div>

      {/* Right: Presence, Copy Link, Leave Room */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <PresenceList />

        <button
          type="button"
          onClick={handleCopyLink}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            backgroundColor: '#1e293b',
            color: '#e2e8f0',
            border: '1px solid #334155',
            borderRadius: '6px',
            fontSize: '0.825rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'background-color 0.15s ease',
          }}
        >
          {copied ? <CheckIcon size={16} color="#10b981" /> : <CopyIcon size={16} color="#cbd5e1" />}
          <span>{copied ? 'Copied' : 'Copy Link'}</span>
        </button>

        <button
          type="button"
          onClick={onLeave}
          style={{
            padding: '6px 12px',
            backgroundColor: '#ef4444',
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            fontSize: '0.825rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'opacity 0.15s ease',
          }}
        >
          Leave
        </button>
      </div>
    </header>
  );
};
