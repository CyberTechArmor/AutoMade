import { db, schema } from '../../db/index.js';
import { eq, and, isNull, asc } from 'drizzle-orm';
import { NotFoundError } from '../../lib/errors.js';
import { audit } from '../../lib/audit.js';
import { storage, storagePaths } from '../../lib/storage.js';
import type { CreateRecordingInput } from './recordings.schemas.js';
import { Readable } from 'stream';

export async function listRecordings(
  sessionId: string,
  trackType?: string
): Promise<Array<typeof schema.sessionRecordings.$inferSelect>> {
  // Verify session exists
  const [session] = await db
    .select()
    .from(schema.sessions)
    .where(and(eq(schema.sessions.id, sessionId), isNull(schema.sessions.deletedAt)))
    .limit(1);

  if (!session) {
    throw new NotFoundError('Session');
  }

  const conditions = [eq(schema.sessionRecordings.sessionId, sessionId)];

  if (trackType) {
    conditions.push(eq(schema.sessionRecordings.trackType, trackType));
  }

  return db
    .select()
    .from(schema.sessionRecordings)
    .where(and(...conditions))
    .orderBy(asc(schema.sessionRecordings.createdAt));
}

export async function getRecordingById(
  sessionId: string,
  recordingId: string
): Promise<typeof schema.sessionRecordings.$inferSelect | null> {
  const [recording] = await db
    .select()
    .from(schema.sessionRecordings)
    .where(
      and(
        eq(schema.sessionRecordings.id, recordingId),
        eq(schema.sessionRecordings.sessionId, sessionId)
      )
    )
    .limit(1);

  return recording ?? null;
}

export async function getRecordingStream(
  sessionId: string,
  recordingId: string
): Promise<{
  recording: typeof schema.sessionRecordings.$inferSelect;
  stream: Readable;
} | null> {
  const recording = await getRecordingById(sessionId, recordingId);

  if (!recording) {
    return null;
  }

  const stream = await storage.download(recording.storagePath);

  return { recording, stream };
}

export async function createRecording(
  sessionId: string,
  input: CreateRecordingInput['body'],
  file: { buffer: Buffer; size: number },
  userId: string,
  ip?: string,
  requestId?: string
): Promise<typeof schema.sessionRecordings.$inferSelect> {
  // Verify session exists
  const [session] = await db
    .select()
    .from(schema.sessions)
    .where(and(eq(schema.sessions.id, sessionId), isNull(schema.sessions.deletedAt)))
    .limit(1);

  if (!session) {
    throw new NotFoundError('Session');
  }

  // Upload to storage
  const storagePath = storagePaths.recordings(sessionId, input.filename);
  await storage.upload(storagePath, file.buffer);

  const [recording] = await db
    .insert(schema.sessionRecordings)
    .values({
      sessionId,
      filename: input.filename,
      fileSize: file.size,
      duration: input.duration,
      mimeType: input.mimeType,
      trackType: input.trackType,
      participantId: input.participantId,
      participantName: input.participantName,
      storagePath,
      egressId: input.egressId,
    })
    .returning();

  if (!recording) {
    throw new Error('Failed to create recording');
  }

  // Update session recording URL
  if (input.trackType === 'combined') {
    const signedUrl = await storage.getSignedUrl(storagePath);
    await db
      .update(schema.sessions)
      .set({
        recordingUrl: signedUrl,
        updatedAt: new Date(),
      })
      .where(eq(schema.sessions.id, sessionId));
  }

  await audit.create(userId, 'recording', recording.id, { sessionId, filename: input.filename }, ip, requestId);

  return recording;
}

export async function deleteRecording(
  sessionId: string,
  recordingId: string,
  userId: string,
  ip?: string,
  requestId?: string
): Promise<void> {
  const recording = await getRecordingById(sessionId, recordingId);

  if (!recording) {
    throw new NotFoundError('Recording');
  }

  // Delete from storage
  await storage.delete(recording.storagePath);

  // Delete record
  await db
    .delete(schema.sessionRecordings)
    .where(eq(schema.sessionRecordings.id, recordingId));

  await audit.delete(userId, 'recording', recordingId, recording, ip, requestId);
}

export interface TranscriptEntry {
  id: string;
  speakerId: string;
  speakerType: string;
  speakerName: string | null;
  content: string;
  timestampMs: number;
  confidence: string | null;
}

export async function getTranscript(
  sessionId: string,
  format: 'json' | 'text' | 'vtt' | 'srt' = 'json'
): Promise<TranscriptEntry[] | string> {
  // Verify session exists
  const [session] = await db
    .select()
    .from(schema.sessions)
    .where(and(eq(schema.sessions.id, sessionId), isNull(schema.sessions.deletedAt)))
    .limit(1);

  if (!session) {
    throw new NotFoundError('Session');
  }

  const transcripts = await db
    .select()
    .from(schema.sessionTranscripts)
    .where(eq(schema.sessionTranscripts.sessionId, sessionId))
    .orderBy(asc(schema.sessionTranscripts.timestampMs));

  const entries: TranscriptEntry[] = transcripts.map((t) => ({
    id: t.id,
    speakerId: t.speakerId,
    speakerType: t.speakerType,
    speakerName: t.speakerName,
    content: t.content,
    timestampMs: t.timestampMs,
    confidence: t.confidence,
  }));

  if (format === 'json') {
    return entries;
  }

  if (format === 'text') {
    return entries
      .map((e) => `[${formatTime(e.timestampMs)}] ${e.speakerName || e.speakerId}: ${e.content}`)
      .join('\n');
  }

  if (format === 'vtt') {
    let vtt = 'WEBVTT\n\n';
    entries.forEach((e, i) => {
      const startTime = formatVTTTime(e.timestampMs);
      const endTime = formatVTTTime(e.timestampMs + 5000); // Assume 5s duration
      vtt += `${i + 1}\n`;
      vtt += `${startTime} --> ${endTime}\n`;
      vtt += `<v ${e.speakerName || e.speakerId}>${e.content}\n\n`;
    });
    return vtt;
  }

  if (format === 'srt') {
    let srt = '';
    entries.forEach((e, i) => {
      const startTime = formatSRTTime(e.timestampMs);
      const endTime = formatSRTTime(e.timestampMs + 5000); // Assume 5s duration
      srt += `${i + 1}\n`;
      srt += `${startTime} --> ${endTime}\n`;
      srt += `${e.speakerName || e.speakerId}: ${e.content}\n\n`;
    });
    return srt;
  }

  return entries;
}

function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const secs = seconds % 60;
  const mins = minutes % 60;

  if (hours > 0) {
    return `${hours}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

function formatVTTTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const secs = seconds % 60;
  const mins = minutes % 60;
  const millis = ms % 1000;

  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(millis).padStart(3, '0')}`;
}

function formatSRTTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const secs = seconds % 60;
  const mins = minutes % 60;
  const millis = ms % 1000;

  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(millis).padStart(3, '0')}`;
}
