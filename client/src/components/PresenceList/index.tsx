import React from 'react';
import { useRoomStore } from '../../state/roomStore';

export const PresenceList: React.FC = () => {
  const users = useRoomStore((state) => state.users);
  const status = useRoomStore((state) => state.status);

  const getStatusBadge = () => {
    switch (status) {
      case 'connected':
        return <span style={{ background: '#22c55e', width: '8px', height: '8px', borderRadius: '50%', display: 'inline-block' }} title="Connected" />;
      case 'reconnecting':
        return <span style={{ background: '#f59e0b', width: '8px', height: '8px', borderRadius: '50%', display: 'inline-block' }} title="Reconnecting..." />;
      default:
        return <span style={{ background: '#ef4444', width: '8px', height: '8px', borderRadius: '50%', display: 'inline-block' }} title="Disconnected" />;
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>
        {getStatusBadge()}
        <span>{users.length} online</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', marginLeft: '0.5rem' }}>
        {users.map((user) => {
          const initial = user.userName ? user.userName.charAt(0).toUpperCase() : '?';
          return (
            <div
              key={user.userId}
              title={user.userName}
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                backgroundColor: user.color,
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '0.75rem',
                border: '2px solid #ffffff',
                marginLeft: '-6px',
                boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
              }}
            >
              {initial}
            </div>
          );
        })}
      </div>
    </div>
  );
};
