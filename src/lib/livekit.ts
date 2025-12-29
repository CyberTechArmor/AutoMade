import { AccessToken, RoomServiceClient } from 'livekit-server-sdk';
import { config } from '../config/index.js';
import { logger } from './logger.js';

// LiveKit configuration validation
function getLiveKitConfig(): { apiKey: string; apiSecret: string; url: string } {
  const { apiKey, apiSecret, url } = config.livekit;

  if (!apiKey || !apiSecret || !url) {
    throw new Error('LiveKit configuration is incomplete. Set LIVEKIT_API_KEY, LIVEKIT_API_SECRET, and LIVEKIT_URL');
  }

  return { apiKey, apiSecret, url };
}

// Room service client (lazy initialization)
let roomService: RoomServiceClient | null = null;

function getRoomService(): RoomServiceClient {
  if (!roomService) {
    const { apiKey, apiSecret, url } = getLiveKitConfig();
    roomService = new RoomServiceClient(url, apiKey, apiSecret);
  }
  return roomService;
}

export interface CreateRoomOptions {
  sessionId: string;
  emptyTimeout?: number; // seconds before empty room closes
  maxParticipants?: number;
}

export interface CreateTokenOptions {
  sessionId: string;
  participantId: string;
  participantName: string;
  canPublish?: boolean;
  canSubscribe?: boolean;
  ttl?: number; // token TTL in seconds
}

/**
 * Create a LiveKit room for a discovery session
 */
export async function createRoom(options: CreateRoomOptions): Promise<{
  roomName: string;
  roomSid: string;
}> {
  const { sessionId, emptyTimeout = 300, maxParticipants = 10 } = options;
  const roomName = `session-${sessionId}`;

  try {
    const service = getRoomService();

    const room = await service.createRoom({
      name: roomName,
      emptyTimeout,
      maxParticipants,
      metadata: JSON.stringify({ sessionId }),
    });

    logger.info({ roomName, roomSid: room.sid }, 'LiveKit room created');

    return {
      roomName: room.name,
      roomSid: room.sid,
    };
  } catch (error) {
    logger.error({ error, sessionId }, 'Failed to create LiveKit room');
    throw error;
  }
}

/**
 * Generate an access token for a participant to join a LiveKit room
 */
export function generateParticipantToken(options: CreateTokenOptions): string {
  const {
    sessionId,
    participantId,
    participantName,
    canPublish = true,
    canSubscribe = true,
    ttl = 3600, // 1 hour default
  } = options;

  const { apiKey, apiSecret } = getLiveKitConfig();
  const roomName = `session-${sessionId}`;

  const token = new AccessToken(apiKey, apiSecret, {
    identity: participantId,
    name: participantName,
    ttl,
  });

  token.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish,
    canSubscribe,
    canPublishData: true, // Allow data messages
  });

  return token.toJwt();
}

/**
 * Get room information
 */
export async function getRoom(sessionId: string): Promise<{
  name: string;
  sid: string;
  numParticipants: number;
  creationTime: number;
} | null> {
  const roomName = `session-${sessionId}`;

  try {
    const service = getRoomService();
    const rooms = await service.listRooms([roomName]);

    if (rooms.length === 0) {
      return null;
    }

    const room = rooms[0];
    return {
      name: room.name,
      sid: room.sid,
      numParticipants: room.numParticipants,
      creationTime: Number(room.creationTime),
    };
  } catch (error) {
    logger.error({ error, sessionId }, 'Failed to get LiveKit room');
    return null;
  }
}

/**
 * List participants in a room
 */
export async function listParticipants(sessionId: string): Promise<Array<{
  identity: string;
  name: string;
  joinedAt: number;
  isPublisher: boolean;
}>> {
  const roomName = `session-${sessionId}`;

  try {
    const service = getRoomService();
    const participants = await service.listParticipants(roomName);

    return participants.map(p => ({
      identity: p.identity,
      name: p.name,
      joinedAt: Number(p.joinedAt),
      isPublisher: (p.tracks?.length ?? 0) > 0,
    }));
  } catch (error) {
    logger.error({ error, sessionId }, 'Failed to list participants');
    return [];
  }
}

/**
 * Remove a participant from a room
 */
export async function removeParticipant(sessionId: string, participantId: string): Promise<boolean> {
  const roomName = `session-${sessionId}`;

  try {
    const service = getRoomService();
    await service.removeParticipant(roomName, participantId);
    logger.info({ sessionId, participantId }, 'Participant removed from LiveKit room');
    return true;
  } catch (error) {
    logger.error({ error, sessionId, participantId }, 'Failed to remove participant');
    return false;
  }
}

/**
 * Close a room (ends the session for all participants)
 */
export async function closeRoom(sessionId: string): Promise<boolean> {
  const roomName = `session-${sessionId}`;

  try {
    const service = getRoomService();
    await service.deleteRoom(roomName);
    logger.info({ sessionId }, 'LiveKit room closed');
    return true;
  } catch (error) {
    logger.error({ error, sessionId }, 'Failed to close LiveKit room');
    return false;
  }
}

/**
 * Send a data message to all participants in a room
 */
export async function sendDataToRoom(
  sessionId: string,
  data: Record<string, unknown>,
  destinationIdentities?: string[]
): Promise<boolean> {
  const roomName = `session-${sessionId}`;

  try {
    const service = getRoomService();
    const payload = new TextEncoder().encode(JSON.stringify(data));

    await service.sendData(roomName, payload, {
      destinationIdentities,
      topic: 'app-data',
    });

    return true;
  } catch (error) {
    logger.error({ error, sessionId }, 'Failed to send data to room');
    return false;
  }
}

/**
 * Mute/unmute a participant's track
 */
export async function muteParticipantTrack(
  sessionId: string,
  participantId: string,
  trackSid: string,
  muted: boolean
): Promise<boolean> {
  const roomName = `session-${sessionId}`;

  try {
    const service = getRoomService();
    await service.mutePublishedTrack(roomName, participantId, trackSid, muted);
    return true;
  } catch (error) {
    logger.error({ error, sessionId, participantId, trackSid }, 'Failed to mute track');
    return false;
  }
}

// Export types
export type { AccessToken, RoomServiceClient };
