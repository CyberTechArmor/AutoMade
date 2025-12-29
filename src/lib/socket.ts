import { Server as SocketIOServer, Socket } from 'socket.io';
import { verifyAccessToken } from './jwt.js';
import { logger } from './logger.js';
import * as sessionService from '../modules/sessions/sessions.service.js';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  role?: string;
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

    // Join user-specific room
    if (socket.userId) {
      void socket.join(`user:${socket.userId}`);
    }

    // Session room management
    socket.on('session:join', async (sessionId: string) => {
      try {
        const session = await sessionService.getSessionById(sessionId);

        if (!session) {
          socket.emit('error', { message: 'Session not found' });
          return;
        }

        void socket.join(`session:${sessionId}`);
        logger.info({ userId: socket.userId, sessionId }, 'User joined session');

        socket.emit('session:joined', { sessionId });
      } catch (error) {
        logger.error({ error, sessionId }, 'Error joining session');
        socket.emit('error', { message: 'Failed to join session' });
      }
    });

    socket.on('session:leave', (sessionId: string) => {
      void socket.leave(`session:${sessionId}`);
      logger.info({ userId: socket.userId, sessionId }, 'User left session');
    });

    // Real-time chat message
    socket.on('session:message', async (data: { sessionId: string; content: string }) => {
      const { sessionId, content } = data;

      try {
        // Process message and get LLM response
        const result = await sessionService.processMessage(
          sessionId,
          content,
          (chunk) => {
            // Stream response chunks to all users in the session
            io.to(`session:${sessionId}`).emit('session:stream', {
              sessionId,
              chunk,
            });
          }
        );

        // Broadcast full transcripts
        io.to(`session:${sessionId}`).emit('session:transcripts', {
          sessionId,
          transcripts: result.transcripts,
        });
      } catch (error) {
        logger.error({ error, sessionId }, 'Error processing session message');
        socket.emit('error', { message: 'Failed to process message' });
      }
    });

    // Session state updates
    socket.on('session:update', async (data: { sessionId: string; state: string }) => {
      const { sessionId, state } = data;

      try {
        if (!socket.userId) {
          socket.emit('error', { message: 'User not authenticated' });
          return;
        }

        let session;

        if (state === 'in_progress') {
          session = await sessionService.startSession(sessionId, socket.userId);
        } else if (state === 'completed') {
          session = await sessionService.endSession(sessionId, socket.userId);
        } else {
          session = await sessionService.updateSession(
            sessionId,
            { state: state as 'scheduled' | 'pending' | 'in_progress' | 'paused' | 'completed' | 'cancelled' },
            socket.userId
          );
        }

        // Broadcast state change to all users in the session
        io.to(`session:${sessionId}`).emit('session:stateChanged', {
          sessionId,
          state: session.state,
          session,
        });
      } catch (error) {
        logger.error({ error, sessionId }, 'Error updating session state');
        socket.emit('error', { message: 'Failed to update session' });
      }
    });

    // Typing indicators
    socket.on('session:typing', (data: { sessionId: string; isTyping: boolean }) => {
      socket.to(`session:${data.sessionId}`).emit('session:userTyping', {
        userId: socket.userId,
        isTyping: data.isTyping,
      });
    });

    socket.on('disconnect', (reason) => {
      logger.info({ userId: socket.userId, socketId: socket.id, reason }, 'Client disconnected');
    });
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
