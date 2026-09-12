import React, { useEffect } from 'react';
import { LandingPage } from '../pages/LandingPage';
import { RoomPage } from '../pages/RoomPage';
import { useRoomStore } from '../state/roomStore';
import { ToastProvider } from '../components/Toast';

export const AppContent: React.FC = () => {
  const roomId = useRoomStore((state) => state.roomId);
  const userName = useRoomStore((state) => state.userName);
  const setRoomId = useRoomStore((state) => state.setRoomId);
  const setUserName = useRoomStore((state) => state.setUserName);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlRoomId = params.get('room');
    if (urlRoomId) {
      setRoomId(urlRoomId.toUpperCase());
    }
  }, [setRoomId]);

  const handleJoinRoom = (targetRoomId: string, artistName: string) => {
    setUserName(artistName);
    setRoomId(targetRoomId);

    const url = new URL(window.location.href);
    url.searchParams.set('room', targetRoomId);
    window.history.pushState({}, '', url.toString());
  };

  const handleLeaveRoom = () => {
    setRoomId(null);
    const url = new URL(window.location.href);
    url.searchParams.delete('room');
    window.history.pushState({}, '', url.toString());
  };

  if (!roomId) {
    return <LandingPage onJoinRoom={handleJoinRoom} />;
  }

  return <RoomPage roomId={roomId} userName={userName} onLeave={handleLeaveRoom} />;
};

export const App: React.FC = () => {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
};
