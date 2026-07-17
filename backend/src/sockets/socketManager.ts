import { Server as HTTPServer } from 'http';
import { Server as SocketServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import config from '../config/env';
import logger from '../utils/logger';

let io: SocketServer;

interface JWTPayload {
  userId: string;
  role: string;
}

export const initSocket = (server: HTTPServer): SocketServer => {
  io = new SocketServer(server, {
    cors: {
      origin: config.CLIENT_URL,
      credentials: true,
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 30000,
    pingInterval: 10000,
  });

  // Auth middleware for Socket.IO
  io.use((socket: Socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = jwt.verify(token, config.JWT_SECRET) as JWTPayload;
      socket.data.userId = decoded.userId;
      socket.data.role = decoded.role;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const userId = socket.data.userId as string;
    logger.info(`Socket connected: ${socket.id} (user: ${userId})`);

    // Join user-specific room for targeted notifications
    socket.join(`user:${userId}`);

    socket.on('disconnect', (reason) => {
      logger.info(`Socket disconnected: ${socket.id} — ${reason}`);
    });

    // Ping/pong for connection health
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: Date.now() });
    });

    // Acknowledge connection
    socket.emit('connected', {
      message: 'Connected to FinVerse AI',
      userId,
      timestamp: new Date().toISOString(),
    });
  });

  logger.info('Socket.IO initialized');
  return io;
};

export const getIO = (): SocketServer => {
  if (!io) throw new Error('Socket.IO not initialized');
  return io;
};

/**
 * Emit a notification to a specific user's room.
 */
export const emitToUser = (userId: string, event: string, data: unknown): void => {
  if (!io) return;
  io.to(`user:${userId}`).emit(event, data);
};

/**
 * Broadcast dashboard updates to a user after data changes.
 */
export const emitDashboardUpdate = (userId: string): void => {
  emitToUser(userId, 'dashboard:update', { timestamp: new Date().toISOString() });
};

/**
 * Emit a notification event to a specific user.
 */
export const emitNotification = (
  userId: string,
  notification: {
    type: string;
    title: string;
    message: string;
    priority?: string;
    icon?: string;
  }
): void => {
  emitToUser(userId, 'notification:new', {
    ...notification,
    timestamp: new Date().toISOString(),
  });
};
