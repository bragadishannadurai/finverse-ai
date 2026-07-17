import { Server as HTTPServer } from 'http';
import { Server as SocketServer } from 'socket.io';
export declare const initSocket: (server: HTTPServer) => SocketServer;
export declare const getIO: () => SocketServer;
/**
 * Emit a notification to a specific user's room.
 */
export declare const emitToUser: (userId: string, event: string, data: unknown) => void;
/**
 * Broadcast dashboard updates to a user after data changes.
 */
export declare const emitDashboardUpdate: (userId: string) => void;
/**
 * Emit a notification event to a specific user.
 */
export declare const emitNotification: (userId: string, notification: {
    type: string;
    title: string;
    message: string;
    priority?: string;
    icon?: string;
}) => void;
//# sourceMappingURL=socketManager.d.ts.map