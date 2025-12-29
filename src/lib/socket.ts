import { Server as SocketIOServer, Socket } from 'socket.io';
import { verifyAccessToken } from './jwt.js';
import { logger } from './logger.js';

/**
 * Socket.io is used ONLY for:
 * - Real-time notifications (e.g., new messages, project updates)
 * - UI state synchronization across devices
 * - Presence indicators
 *
 * For real-time voice/video communication, use LiveKit (see livekit.ts)
 */

interface AuthenticatedSocket extends Socket {
  userId?: string;
  role?: string;
}

// Notification types
export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: number;
  data?: Record<string, unknown>;
}

// UI sync event types
export interface UIStateUpdate {
  type: 'session' | 'project' | 'document' | 'user';
  action: 'created' | 'updated' | 'deleted' | 'started' | 'ended';
  entityId: string;
  data?: Record<string, unknown>;
}

export function setupSocketHandlers(io: SocketIOServer): void {
  // Authentication middleware
  io.use((socket: AuthenticatedSocket, next) => {
    const token = socket.handshake.auth.token as string | undefined;

    if (!token) {
      return next(new Error('Authentication required'));
    }

    const decoded = verifyAccessToken(token);

    if (!decoded) {
      return next(new Error('Invalid or expired token'));
    }

    socket.userId = decoded.userId;
    socket.role = decoded.role;
    next();
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    logger.info({ userId: socket.userId, socketId: socket.id }, 'Client connected');

    // Join user-specific room for personal notifications
    if (socket.userId) {
      void socket.join(`user:${socket.userId}`);
    }

    // Subscribe to entity updates (for multi-device sync)
    socket.on('subscribe', (data: { type: string; id: string }) => {
      const room = `${data.type}:${data.id}`;
      void socket.join(room);
      logger.debug({ userId: socket.userId, room }, 'Subscribed to updates');
    });

    socket.on('unsubscribe', (data: { type: string; id: string }) => {
      const room = `${data.type}:${data.id}`;
      void socket.leave(room);
      logger.debug({ userId: socket.userId, room }, 'Unsubscribed from updates');
    });

    // Presence tracking
    socket.on('presence:update', (data: { status: 'online' | 'away' | 'busy' }) => {
      if (socket.userId) {
        io.emit('presence:changed', {
          userId: socket.userId,
          status: data.status,
          timestamp: Date.now(),
        });
      }
    });

    // Typing indicators (for chat/text sessions only)
    socket.on('typing:start', (data: { entityType: string; entityId: string }) => {
      socket.to(`${data.entityType}:${data.entityId}`).emit('typing:update', {
        userId: socket.userId,
        isTyping: true,
      });
    });

    socket.on('typing:stop', (data: { entityType: string; entityId: string }) => {
      socket.to(`${data.entityType}:${data.entityId}`).emit('typing:update', {
        userId: socket.userId,
        isTyping: false,
      });
    });

    socket.on('disconnect', (reason) => {
      logger.info({ userId: socket.userId, socketId: socket.id, reason }, 'Client disconnected');

      // Notify presence change
      if (socket.userId) {
        io.emit('presence:changed', {
          userId: socket.userId,
          status: 'offline',
          timestamp: Date.now(),
        });
      }
    });
  });
}

/**
 * Send a notification to a specific user
 */
export function notifyUser(io: SocketIOServer, userId: string, notification: Notification): void {
  io.to(`user:${userId}`).emit('notification', notification);
}

/**
 * Send a notification to multiple users
 */
export function notifyUsers(io: SocketIOServer, userIds: string[], notification: Notification): void {
  for (const userId of userIds) {
    io.to(`user:${userId}`).emit('notification', notification);
  }
}

/**
 * Broadcast a UI state update to all subscribers of an entity
 */
export function broadcastUIUpdate(io: SocketIOServer, update: UIStateUpdate): void {
  const room = `${update.type}:${update.entityId}`;
  io.to(room).emit('ui:update', update);
}

/**
 * Broadcast a session-related update
 */
export function broadcastSessionUpdate(
  io: SocketIOServer,
  sessionId: string,
  action: UIStateUpdate['action'],
  data?: Record<string, unknown>
): void {
  broadcastUIUpdate(io, {
    type: 'session',
    action,
    entityId: sessionId,
    data,
  });
}

/**
 * Broadcast a project-related update
 */
export function broadcastProjectUpdate(
  io: SocketIOServer,
  projectId: string,
  action: UIStateUpdate['action'],
  data?: Record<string, unknown>
): void {
  broadcastUIUpdate(io, {
    type: 'project',
    action,
    entityId: projectId,
    data,
  });
}

/**
 * Send a transcript update (for LLM streaming responses during text sessions)
 */
export function streamTranscriptChunk(
  io: SocketIOServer,
  sessionId: string,
  chunk: string
): void {
  io.to(`session:${sessionId}`).emit('transcript:chunk', {
    sessionId,
    chunk,
    timestamp: Date.now(),
  });
}

/**
 * Send a complete transcript update
 */
export function sendTranscriptUpdate(
  io: SocketIOServer,
  sessionId: string,
  transcript: {
    id: string;
    speakerId: string;
    speakerName: string;
    content: string;
    timestampMs: number;
  }
): void {
  io.to(`session:${sessionId}`).emit('transcript:new', {
    sessionId,
    transcript,
  });
}

// Helper function to emit to specific user
export function emitToUser(io: SocketIOServer, userId: string, event: string, data: unknown): void {
  io.to(`user:${userId}`).emit(event, data);
}

// Helper function to emit to session
export function emitToSession(io: SocketIOServer, sessionId: string, event: string, data: unknown): void {
  io.to(`session:${sessionId}`).emit(event, data);
}
