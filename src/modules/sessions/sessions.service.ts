import { db, schema } from '../../db/index.js';
import { eq, and, isNull, desc, sql } from 'drizzle-orm';
import { NotFoundError } from '../../lib/errors.js';
import { audit } from '../../lib/audit.js';
import { chat, streamChat, DISCOVERY_PROMPTS } from '../../lib/llm.js';
import * as livekit from '../../lib/livekit.js';
import type { CreateSessionInput, UpdateSessionInput, AddTranscriptInput } from './sessions.schemas.js';

interface ListSessionsOptions {
  projectId?: string;
  state?: string;
  page: number;
  limit: number;
}

interface LLMMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export async function listSessions(options: ListSessionsOptions): Promise<{
  data: Array<typeof schema.sessions.$inferSelect>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}> {
  const conditions = [isNull(schema.sessions.deletedAt)];

  if (options.projectId) {
    conditions.push(eq(schema.sessions.projectId, options.projectId));
  }

  if (options.state) {
    conditions.push(eq(schema.sessions.state, options.state as typeof schema.sessions.state.enumValues[number]));
  }

  const whereClause = and(...conditions);
  const offset = (options.page - 1) * options.limit;

  const [sessions, countResult] = await Promise.all([
    db
      .select()
      .from(schema.sessions)
      .where(whereClause)
      .orderBy(desc(schema.sessions.createdAt))
      .limit(options.limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(schema.sessions)
      .where(whereClause),
  ]);

  const total = Number(countResult[0]?.count ?? 0);

  return {
    data: sessions,
    pagination: {
      page: options.page,
      limit: options.limit,
      total,
      totalPages: Math.ceil(total / options.limit),
    },
  };
}

export async function getSessionById(id: string): Promise<typeof schema.sessions.$inferSelect | null> {
  const [session] = await db
    .select()
    .from(schema.sessions)
    .where(and(eq(schema.sessions.id, id), isNull(schema.sessions.deletedAt)))
    .limit(1);

  return session ?? null;
}

export async function getSessionWithDetails(id: string): Promise<{
  session: typeof schema.sessions.$inferSelect;
  project: typeof schema.projects.$inferSelect | null;
  participants: Array<typeof schema.sessionParticipants.$inferSelect>;
  transcriptCount: number;
} | null> {
  const session = await getSessionById(id);

  if (!session) {
    return null;
  }

  const [project, participants, transcriptCount] = await Promise.all([
    db
      .select()
      .from(schema.projects)
      .where(eq(schema.projects.id, session.projectId))
      .limit(1)
      .then(rows => rows[0] ?? null),
    db
      .select()
      .from(schema.sessionParticipants)
      .where(eq(schema.sessionParticipants.sessionId, id)),
    db
      .select({ count: sql<number>`count(*)` })
      .from(schema.sessionTranscripts)
      .where(eq(schema.sessionTranscripts.sessionId, id))
      .then(rows => Number(rows[0]?.count ?? 0)),
  ]);

  return { session, project, participants, transcriptCount };
}

export async function createSession(
  input: CreateSessionInput,
  userId: string,
  ip?: string,
  requestId?: string
): Promise<typeof schema.sessions.$inferSelect> {
  const [session] = await db
    .insert(schema.sessions)
    .values({
      ...input,
      scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : undefined,
      facilitatorId: input.isAutonomous ? undefined : userId,
    })
    .returning();

  if (!session) {
    throw new Error('Failed to create session');
  }

  await audit.create(userId, 'session', session.id, { title: session.title }, ip, requestId);

  return session;
}

export async function updateSession(
  id: string,
  input: UpdateSessionInput['body'],
  userId: string,
  ip?: string,
  requestId?: string
): Promise<typeof schema.sessions.$inferSelect> {
  const existing = await getSessionById(id);

  if (!existing) {
    throw new NotFoundError('Session');
  }

  const updateData: Record<string, unknown> = {
    ...input,
    updatedAt: new Date(),
  };

  if (input.scheduledAt !== undefined) {
    updateData.scheduledAt = input.scheduledAt ? new Date(input.scheduledAt) : null;
  }

  const [updated] = await db
    .update(schema.sessions)
    .set(updateData)
    .where(eq(schema.sessions.id, id))
    .returning();

  if (!updated) {
    throw new Error('Failed to update session');
  }

  await audit.update(userId, 'session', id, existing, updated, ip, requestId);

  return updated;
}

export async function startSession(
  id: string,
  userId: string,
  ip?: string,
  requestId?: string
): Promise<typeof schema.sessions.$inferSelect> {
  return updateSession(
    id,
    { state: 'in_progress' },
    userId,
    ip,
    requestId
  ).then(async (session) => {
    await db
      .update(schema.sessions)
      .set({ startedAt: new Date() })
      .where(eq(schema.sessions.id, id));
    return { ...session, startedAt: new Date() };
  });
}

export async function endSession(
  id: string,
  userId: string,
  ip?: string,
  requestId?: string
): Promise<typeof schema.sessions.$inferSelect> {
  const session = await getSessionById(id);

  if (!session) {
    throw new NotFoundError('Session');
  }

  const endedAt = new Date();
  const duration = session.startedAt
    ? Math.floor((endedAt.getTime() - session.startedAt.getTime()) / 1000)
    : 0;

  const [updated] = await db
    .update(schema.sessions)
    .set({
      state: 'completed',
      endedAt,
      duration,
      updatedAt: new Date(),
    })
    .where(eq(schema.sessions.id, id))
    .returning();

  if (!updated) {
    throw new Error('Failed to end session');
  }

  await audit.update(userId, 'session', id, session, updated, ip, requestId);

  return updated;
}

export async function addTranscript(
  sessionId: string,
  input: AddTranscriptInput['body']
): Promise<typeof schema.sessionTranscripts.$inferSelect> {
  const [transcript] = await db
    .insert(schema.sessionTranscripts)
    .values({
      sessionId,
      ...input,
    })
    .returning();

  if (!transcript) {
    throw new Error('Failed to add transcript');
  }

  return transcript;
}

export async function getTranscripts(
  sessionId: string
): Promise<Array<typeof schema.sessionTranscripts.$inferSelect>> {
  return db
    .select()
    .from(schema.sessionTranscripts)
    .where(eq(schema.sessionTranscripts.sessionId, sessionId))
    .orderBy(schema.sessionTranscripts.timestampMs);
}

export async function processMessage(
  sessionId: string,
  userMessage: string,
  onChunk?: (chunk: string) => void
): Promise<{
  response: string;
  transcripts: Array<typeof schema.sessionTranscripts.$inferSelect>;
}> {
  const session = await getSessionById(sessionId);

  if (!session) {
    throw new NotFoundError('Session');
  }

  // Get existing transcripts to build conversation history
  const existingTranscripts = await getTranscripts(sessionId);

  // Build messages array
  const messages: LLMMessage[] = [
    { role: 'system', content: DISCOVERY_PROMPTS.facilitator },
  ];

  for (const transcript of existingTranscripts) {
    messages.push({
      role: transcript.speakerType === 'llm' ? 'assistant' : 'user',
      content: transcript.content,
    });
  }

  // Add new user message
  messages.push({ role: 'user', content: userMessage });

  // Calculate timestamp for new transcripts
  const now = Date.now();
  const sessionStart = session.startedAt?.getTime() ?? now;
  const timestampMs = now - sessionStart;

  // Add user transcript
  const userTranscript = await addTranscript(sessionId, {
    speakerId: 'user',
    speakerType: 'human',
    speakerName: 'User',
    content: userMessage,
    timestampMs,
  });

  // Get LLM response
  let llmResponse: string;

  if (onChunk) {
    const result = await streamChat(messages, {}, onChunk);
    llmResponse = result.content;
  } else {
    const result = await chat(messages, {});
    llmResponse = result.content;
  }

  // Add LLM transcript
  const llmTimestamp = Date.now() - sessionStart;
  const llmTranscript = await addTranscript(sessionId, {
    speakerId: 'llm',
    speakerType: 'llm',
    speakerName: 'Discovery AI',
    content: llmResponse,
    timestampMs: llmTimestamp,
  });

  return {
    response: llmResponse,
    transcripts: [userTranscript, llmTranscript],
  };
}

export async function generateSessionSummary(
  sessionId: string
): Promise<{
  summary: string;
  keyInsights: string[];
  actionItems: string[];
  nextSteps: string[];
}> {
  const transcripts = await getTranscripts(sessionId);

  if (transcripts.length === 0) {
    return {
      summary: 'No conversation recorded.',
      keyInsights: [],
      actionItems: [],
      nextSteps: [],
    };
  }

  // Build transcript text
  const transcriptText = transcripts
    .map(t => `${t.speakerName || t.speakerId}: ${t.content}`)
    .join('\n\n');

  const messages: LLMMessage[] = [
    { role: 'system', content: DISCOVERY_PROMPTS.summarizer },
    { role: 'user', content: transcriptText },
  ];

  const result = await chat(messages, { maxTokens: 2000 });

  // Parse the response (simplified - in production you'd want structured output)
  const content = result.content;

  return {
    summary: content,
    keyInsights: [], // Would parse from content
    actionItems: [], // Would parse from content
    nextSteps: [], // Would parse from content
  };
}

// ============================================================================
// LiveKit Integration for Real-time Voice/Video Sessions
// ============================================================================

/**
 * Create a LiveKit room for a session (voice/video sessions)
 */
export async function createSessionRoom(sessionId: string): Promise<{
  roomName: string;
  roomSid: string;
}> {
  const session = await getSessionById(sessionId);

  if (!session) {
    throw new NotFoundError('Session');
  }

  // Only create rooms for voice/video sessions
  if (session.type === 'text') {
    throw new Error('Text sessions do not require a LiveKit room');
  }

  const room = await livekit.createRoom({
    sessionId,
    emptyTimeout: 600, // 10 minutes
    maxParticipants: 20,
  });

  // Update session with room info
  await db
    .update(schema.sessions)
    .set({
      livekitRoom: room.roomName,
      updatedAt: new Date(),
    })
    .where(eq(schema.sessions.id, sessionId));

  return room;
}

/**
 * Generate a LiveKit access token for a participant
 */
export async function generateParticipantToken(
  sessionId: string,
  userId: string,
  userName: string,
  options?: {
    canPublish?: boolean;
    canSubscribe?: boolean;
  }
): Promise<string> {
  const session = await getSessionById(sessionId);

  if (!session) {
    throw new NotFoundError('Session');
  }

  // Ensure room exists
  if (!session.livekitRoom) {
    await createSessionRoom(sessionId);
  }

  return livekit.generateParticipantToken({
    sessionId,
    participantId: userId,
    participantName: userName,
    canPublish: options?.canPublish ?? true,
    canSubscribe: options?.canSubscribe ?? true,
  });
}

/**
 * Get LiveKit room status
 */
export async function getSessionRoomStatus(sessionId: string): Promise<{
  exists: boolean;
  numParticipants: number;
  participants: Array<{
    identity: string;
    name: string;
    joinedAt: number;
    isPublisher: boolean;
  }>;
} | null> {
  const room = await livekit.getRoom(sessionId);

  if (!room) {
    return { exists: false, numParticipants: 0, participants: [] };
  }

  const participants = await livekit.listParticipants(sessionId);

  return {
    exists: true,
    numParticipants: room.numParticipants,
    participants,
  };
}

/**
 * Close a session's LiveKit room
 */
export async function closeSessionRoom(sessionId: string): Promise<boolean> {
  return livekit.closeRoom(sessionId);
}

/**
 * Remove a participant from the session's LiveKit room
 */
export async function removeSessionParticipant(
  sessionId: string,
  participantId: string
): Promise<boolean> {
  return livekit.removeParticipant(sessionId, participantId);
}

/**
 * Send data to all participants in the session room
 */
export async function broadcastToSessionRoom(
  sessionId: string,
  data: Record<string, unknown>
): Promise<boolean> {
  return livekit.sendDataToRoom(sessionId, data);
}
