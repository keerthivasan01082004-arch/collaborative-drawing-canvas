import { describe, it, expect } from 'vitest';
import { RoomManager } from '../RoomManager.js';
import { WebSocket } from 'ws';

describe('Room & RoomManager', () => {
  it('creates and retrieves rooms by roomId', () => {
    const manager = new RoomManager();
    const room = manager.getOrCreateRoom('room_1');

    expect(room.roomId).toBe('room_1');
    expect(manager.getRoom('room_1')).toBe(room);
    manager.destroy();
  });

  it('assigns unique server-authoritative userId on user join', () => {
    const manager = new RoomManager();
    const room = manager.getOrCreateRoom('room_2');

    const fakeSocket1 = {} as WebSocket;
    const fakeSocket2 = {} as WebSocket;

    const user1 = room.addUser(fakeSocket1, 'Alice');
    const user2 = room.addUser(fakeSocket2, 'Bob');

    expect(user1.userId).not.toBe(user2.userId);
    expect(user1.userName).toBe('Alice');
    expect(user2.userName).toBe('Bob');
    expect(room.getUsersList()).toHaveLength(2);
    manager.destroy();
  });

  it('enforces room capacity limit maxUsers', () => {
    const manager = new RoomManager();
    const room = manager.getOrCreateRoom('room_small');
    (room as any).maxUsers = 1;

    const fakeSocket1 = {} as WebSocket;
    room.addUser(fakeSocket1, 'Alice');

    expect(room.isFull()).toBe(true);
    manager.destroy();
  });
});
