"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.emitNotification = exports.emitDashboardUpdate = exports.emitToUser = exports.getIO = exports.initSocket = void 0;
const socket_io_1 = require("socket.io");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = __importDefault(require("../config/env"));
const logger_1 = __importDefault(require("../utils/logger"));
let io;
const initSocket = (server) => {
    io = new socket_io_1.Server(server, {
        cors: {
            origin: env_1.default.CLIENT_URL,
            credentials: true,
            methods: ['GET', 'POST'],
        },
        transports: ['websocket', 'polling'],
        pingTimeout: 30000,
        pingInterval: 10000,
    });
    // Auth middleware for Socket.IO
    io.use((socket, next) => {
        try {
            const token = socket.handshake.auth?.token ||
                socket.handshake.headers?.authorization?.replace('Bearer ', '');
            if (!token) {
                return next(new Error('Authentication required'));
            }
            const decoded = jsonwebtoken_1.default.verify(token, env_1.default.JWT_SECRET);
            socket.data.userId = decoded.userId;
            socket.data.role = decoded.role;
            next();
        }
        catch {
            next(new Error('Invalid token'));
        }
    });
    io.on('connection', (socket) => {
        const userId = socket.data.userId;
        logger_1.default.info(`Socket connected: ${socket.id} (user: ${userId})`);
        // Join user-specific room for targeted notifications
        socket.join(`user:${userId}`);
        socket.on('disconnect', (reason) => {
            logger_1.default.info(`Socket disconnected: ${socket.id} — ${reason}`);
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
    logger_1.default.info('Socket.IO initialized');
    return io;
};
exports.initSocket = initSocket;
const getIO = () => {
    if (!io)
        throw new Error('Socket.IO not initialized');
    return io;
};
exports.getIO = getIO;
/**
 * Emit a notification to a specific user's room.
 */
const emitToUser = (userId, event, data) => {
    if (!io)
        return;
    io.to(`user:${userId}`).emit(event, data);
};
exports.emitToUser = emitToUser;
/**
 * Broadcast dashboard updates to a user after data changes.
 */
const emitDashboardUpdate = (userId) => {
    (0, exports.emitToUser)(userId, 'dashboard:update', { timestamp: new Date().toISOString() });
};
exports.emitDashboardUpdate = emitDashboardUpdate;
/**
 * Emit a notification event to a specific user.
 */
const emitNotification = (userId, notification) => {
    (0, exports.emitToUser)(userId, 'notification:new', {
        ...notification,
        timestamp: new Date().toISOString(),
    });
};
exports.emitNotification = emitNotification;
//# sourceMappingURL=socketManager.js.map