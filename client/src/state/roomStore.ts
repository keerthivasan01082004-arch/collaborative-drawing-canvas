import { create } from 'zustand';
import { ConnectionStatus } from '../collaboration/ConnectionManager';

export interface UserPresence {
  userId: string;
  userName: string;
  color: string;
}

const USER_COLORS = ['#ef4444', '#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4'];

interface RoomStoreState {
  roomId: string | null;
  userId: string | null;
  userName: string;
  status: ConnectionStatus;
  users: UserPresence[];
  error: string | null;

  setRoomId: (roomId: string | null) => void;
  setUserId: (userId: string | null) => void;
  setUserName: (userName: string) => void;
  setStatus: (status: ConnectionStatus) => void;
  addUser: (userId: string, userName?: string) => void;
  removeUser: (userId: string) => void;
  setUsers: (users: { userId: string; userName?: string }[]) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useRoomStore = create<RoomStoreState>((set) => ({
  roomId: null,
  userId: null,
  userName: 'Artist',
  status: 'disconnected',
  users: [],
  error: null,

  setRoomId: (roomId) => set({ roomId }),
  setUserId: (userId) => set({ userId }),
  setUserName: (userName) => set({ userName }),
  setStatus: (status) => set({ status }),
  setError: (error) => set({ error }),

  addUser: (userId, userName) =>
    set((state) => {
      if (state.users.some((u) => u.userId === userId)) return state;
      const colorIndex = state.users.length % USER_COLORS.length;
      const color = USER_COLORS[colorIndex];
      const name = userName || `Artist ${state.users.length + 1}`;
      return { users: [...state.users, { userId, userName: name, color }] };
    }),

  removeUser: (userId) =>
    set((state) => ({
      users: state.users.filter((u) => u.userId !== userId),
    })),

  setUsers: (usersList) =>
    set(() => ({
      users: usersList.map((u, i) => ({
        userId: u.userId,
        userName: u.userName || `Artist ${i + 1}`,
        color: USER_COLORS[i % USER_COLORS.length],
      })),
    })),

  reset: () =>
    set({
      roomId: null,
      userId: null,
      status: 'disconnected',
      users: [],
      error: null,
    }),
}));
