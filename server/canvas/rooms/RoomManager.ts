import { WebSocket } from 'ws';
import { Room, RoomUser } from './Room.js';

export class RoomManager {
  private rooms = new Map<string, Room>();
  private socketToRoomUser = new Map<WebSocket, { room: Room; user: RoomUser }>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(private emptyRoomTtlMs = 300000) {
    // 5 minutes TTL
    this.startCleanupTimer();
  }

  public getOrCreateRoom(roomId: string): Room {
    let room = this.rooms.get(roomId);
    if (!room) {
      room = new Room(roomId);
      this.rooms.set(roomId, room);
    }
    return room;
  }

  public getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  public registerUserSession(socket: WebSocket, room: Room, user: RoomUser): void {
    this.socketToRoomUser.set(socket, { room, user });
  }

  public getSession(socket: WebSocket): { room: Room; user: RoomUser } | undefined {
    return this.socketToRoomUser.get(socket);
  }

  public removeSession(socket: WebSocket): { room: Room; user: RoomUser } | undefined {
    const session = this.socketToRoomUser.get(socket);
    if (session) {
      this.socketToRoomUser.delete(socket);
      session.room.removeUser(session.user.userId);
      if (session.room.isEmpty()) {
        session.room.lastActivityAt = Date.now();
      }
    }
    return session;
  }

  public destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.rooms.clear();
    this.socketToRoomUser.clear();
  }

  private startCleanupTimer(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [roomId, room] of this.rooms.entries()) {
        if (room.isEmpty() && now - room.lastActivityAt > this.emptyRoomTtlMs) {
          this.rooms.delete(roomId);
        }
      }
    }, 60000);
  }
}
