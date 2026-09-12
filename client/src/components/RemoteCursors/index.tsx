import React from 'react';
import { Point } from '@shared/index';
import { useRoomStore } from '../../state/roomStore';

export interface RemoteCursorData {
  userId: string;
  position: Point;
}

interface RemoteCursorsProps {
  cursors: Map<string, Point>;
  containerWidth: number;
  containerHeight: number;
}

export const RemoteCursors: React.FC<RemoteCursorsProps> = ({ cursors, containerWidth, containerHeight }) => {
  const users = useRoomStore((state) => state.users);

  if (cursors.size === 0) return null;

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 30,
        overflow: 'hidden',
      }}
    >
      {Array.from(cursors.entries()).map(([userId, pos]) => {
        const userInfo = users.find((u) => u.userId === userId);
        const userColor = userInfo?.color || '#3b82f6';
        const userName = userInfo?.userName || 'Artist';

        const pixelX = pos.x * containerWidth;
        const pixelY = pos.y * containerHeight;

        return (
          <div
            key={userId}
            style={{
              position: 'absolute',
              transform: `translate3d(${pixelX}px, ${pixelY}px, 0)`,
              transition: 'transform 0.05s linear',
              pointerEvents: 'none',
            }}
          >
            {/* SVG Pointer Arrowhead */}
            <svg width="18" height="18" viewBox="0 0 24 24" fill={userColor} stroke="#ffffff" strokeWidth="1.5">
              <path d="M3 3l7 18 3-7 7-3L3 3z" />
            </svg>

            {/* Name Tag Pill */}
            <div
              style={{
                marginLeft: '12px',
                marginTop: '-4px',
                backgroundColor: userColor,
                color: '#ffffff',
                fontSize: '0.7rem',
                fontWeight: 700,
                padding: '2px 6px',
                borderRadius: '4px',
                whiteSpace: 'nowrap',
                boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
              }}
            >
              {userName}
            </div>
          </div>
        );
      })}
    </div>
  );
};
