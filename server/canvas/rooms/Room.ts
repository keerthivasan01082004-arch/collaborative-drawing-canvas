import { WebSocket } from 'ws';
import { Operation, ServerMessage } from '../../../shared/index.js';
import { OperationLog } from '../operations/OperationLog.js';

export interface RoomUser {
  userId: string;
  userName: string;
  socket: WebSocket;
  joinedAt: number;
}

export class Room {
  public readonly roomId: string;
  public readonly createdAt: number;
  public lastActivityAt: number;
  public readonly maxUsers: number;
  public readonly operationLog: OperationLog;
  public readonly users = new Map<string, RoomUser>();

  constructor(roomId: string, maxUsers = 10) {
    this.roomId = roomId;
    this.createdAt = Date.now();
    this.lastActivityAt = Date.now();
    this.maxUsers = maxUsers;
    this.operationLog = new OperationLog();
  }

  public isFull(): boolean {
    return this.users.size >= this.maxUsers;
  }

  public isEmpty(): boolean {
    return this.users.size === 0;
  }

  public addUser(socket: WebSocket, userName?: string): RoomUser {
    this.lastActivityAt = Date.now();
    const userId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const finalName = userName && userName.trim() ? userName.trim().substring(0, 32) : `Artist #${this.users.size + 1}`;

    const roomUser: RoomUser = {
      userId,
      userName: finalName,
      socket,
      joinedAt: Date.now(),
    };

    this.users.set(userId, roomUser);
    return roomUser;
  }

  public removeUser(userId: string): RoomUser | undefined {
    this.lastActivityAt = Date.now();
    const user = this.users.get(userId);
    if (user) {
      this.users.delete(userId);
    }
    return user;
  }

  public broadcast(message: ServerMessage, excludeUserId?: string): void {
    const jsonStr = JSON.stringify(message);
    for (const [uId, user] of this.users.entries()) {
      if (excludeUserId && uId === excludeUserId) continue;
      if (user.socket.readyState === WebSocket.OPEN) {
        try {
          user.socket.send(jsonStr);
        } catch {
          // Ignore socket write errors
        }
      }
    }
  }

  public getUsersList(): { userId: string; userName: string }[] {
    return Array.from(this.users.values()).map((u) => ({
      userId: u.userId,
      userName: u.userName,
    }));
  }
}
