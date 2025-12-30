# Real-Time Integration Specification

**Project:** AutoMade
**Version:** 1.0
**Date:** 2025-12-30
**Author:** Fractionate LLC
**Status:** Approved

---

## 1. Overview

This document specifies the real-time communication architecture for AutoMade, including LiveKit WebRTC integration, ElevenLabs voice synthesis, and real-time transcription.

---

## 2. Architecture

### 2.1 System Context

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           AutoMade Real-Time Stack                           │
│                                                                               │
│  ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐        │
│  │   Web Client    │────▶│  AutoMade API   │────▶│   PostgreSQL    │        │
│  │  (React/Vite)   │     │   (Express)     │     │   (Sessions)    │        │
│  └────────┬────────┘     └────────┬────────┘     └─────────────────┘        │
│           │                       │                                           │
│           │ WebRTC               │ REST/WebSocket                            │
│           ▼                       ▼                                           │
│  ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐        │
│  │    LiveKit      │────▶│   AI Agent      │────▶│   ElevenLabs    │        │
│  │   SFU Server    │     │   (Node.js)     │     │   Voice API     │        │
│  └────────┬────────┘     └────────┬────────┘     └─────────────────┘        │
│           │                       │                                           │
│           │ Egress               │ LLM                                       │
│           ▼                       ▼                                           │
│  ┌─────────────────┐     ┌─────────────────┐                                │
│  │   S3 Storage    │     │ Claude/GPT/     │                                │
│  │  (Recordings)   │     │ Gemini          │                                │
│  └─────────────────┘     └─────────────────┘                                │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Components

| Component | Purpose | Technology |
|-----------|---------|------------|
| Web Client | User interface | React + @livekit/components-react |
| AutoMade API | Session management | Express.js + livekit-server-sdk |
| LiveKit SFU | Media routing | LiveKit Cloud or self-hosted |
| AI Agent | Session facilitator | Node.js + LiveKit Agent SDK |
| ElevenLabs | Voice synthesis | ElevenLabs WebSocket API |
| LLM Provider | Response generation | Claude/GPT/Gemini |
| S3 Storage | Recording storage | MinIO or AWS S3 |

---

## 3. LiveKit Integration

### 3.1 Configuration

#### Environment Variables

```bash
# LiveKit Server
LIVEKIT_URL=wss://your-livekit-server.com
LIVEKIT_API_KEY=your-api-key
LIVEKIT_API_SECRET=your-api-secret

# Optional: Self-hosted settings
LIVEKIT_REDIS_URL=redis://localhost:6379
LIVEKIT_TURN_SERVERS=turn:turn.example.com:3478
```

#### Server SDK Setup

```typescript
// src/lib/livekit.ts
import { RoomServiceClient, AccessToken, EgressClient } from 'livekit-server-sdk';

const livekitHost = process.env.LIVEKIT_URL;
const apiKey = process.env.LIVEKIT_API_KEY;
const apiSecret = process.env.LIVEKIT_API_SECRET;

export const roomService = new RoomServiceClient(livekitHost, apiKey, apiSecret);
export const egressClient = new EgressClient(livekitHost, apiKey, apiSecret);
```

### 3.2 Room Management

#### Create Room

```typescript
interface CreateRoomOptions {
  sessionId: string;
  maxParticipants?: number;
  emptyTimeout?: number;  // seconds
  metadata?: Record<string, string>;
}

async function createRoom(options: CreateRoomOptions): Promise<Room> {
  const room = await roomService.createRoom({
    name: `session-${options.sessionId}`,
    maxParticipants: options.maxParticipants || 10,
    emptyTimeout: options.emptyTimeout || 300,
    metadata: JSON.stringify(options.metadata || {}),
  });

  return room;
}
```

#### Generate Participant Token

```typescript
interface TokenOptions {
  identity: string;
  name: string;
  roomName: string;
  permissions: {
    canPublish: boolean;
    canSubscribe: boolean;
    canPublishData: boolean;
    canUpdateOwnMetadata: boolean;
  };
  ttl?: number;  // seconds
}

function generateToken(options: TokenOptions): string {
  const token = new AccessToken(apiKey, apiSecret, {
    identity: options.identity,
    name: options.name,
    ttl: options.ttl || 3600,
  });

  token.addGrant({
    roomJoin: true,
    room: options.roomName,
    canPublish: options.permissions.canPublish,
    canSubscribe: options.permissions.canSubscribe,
    canPublishData: options.permissions.canPublishData,
    canUpdateOwnMetadata: options.permissions.canUpdateOwnMetadata,
  });

  return token.toJwt();
}
```

### 3.3 API Endpoints

#### POST /api/sessions/:id/livekit-token

Generate a token for joining a session room.

**Request:**
```json
{
  "participantName": "John Doe"
}
```

**Response (200):**
```json
{
  "token": "eyJ...",
  "url": "wss://livekit.example.com",
  "roomName": "session-abc123"
}
```

**Response (404):**
```json
{
  "code": "SESSION_NOT_FOUND",
  "message": "Session not found"
}
```

#### POST /api/sessions/:id/start

Start a session and create the LiveKit room.

**Response (200):**
```json
{
  "session": {
    "id": "abc123",
    "status": "in_progress",
    "livekitRoom": "session-abc123",
    "startedAt": "2025-12-30T10:00:00Z"
  }
}
```

#### POST /api/sessions/:id/end

End a session and stop the LiveKit room.

**Response (200):**
```json
{
  "session": {
    "id": "abc123",
    "status": "completed",
    "endedAt": "2025-12-30T11:00:00Z",
    "duration": 3600
  }
}
```

### 3.4 Webhook Events

Configure LiveKit to send webhooks to `/api/webhooks/livekit`.

```typescript
// Webhook handler
app.post('/api/webhooks/livekit', async (req, res) => {
  const event = req.body;

  switch (event.event) {
    case 'room_started':
      await handleRoomStarted(event.room);
      break;
    case 'room_finished':
      await handleRoomFinished(event.room);
      break;
    case 'participant_joined':
      await handleParticipantJoined(event.room, event.participant);
      break;
    case 'participant_left':
      await handleParticipantLeft(event.room, event.participant);
      break;
    case 'egress_started':
      await handleEgressStarted(event.egressInfo);
      break;
    case 'egress_ended':
      await handleEgressEnded(event.egressInfo);
      break;
  }

  res.status(200).send('OK');
});
```

### 3.5 Frontend Components

#### LiveKitRoom Component

```tsx
// frontend/src/components/session/LiveKitRoom.tsx
import { LiveKitRoom, VideoConference } from '@livekit/components-react';
import '@livekit/components-styles';

interface LiveKitSessionProps {
  token: string;
  serverUrl: string;
  onDisconnected?: () => void;
}

export function LiveKitSession({ token, serverUrl, onDisconnected }: LiveKitSessionProps) {
  return (
    <LiveKitRoom
      token={token}
      serverUrl={serverUrl}
      connect={true}
      audio={true}
      video={true}
      onDisconnected={onDisconnected}
    >
      <VideoConference />
    </LiveKitRoom>
  );
}
```

#### Custom Video Grid

```tsx
// frontend/src/components/session/VideoGrid.tsx
import {
  useParticipants,
  useLocalParticipant,
  VideoTrack,
  AudioTrack
} from '@livekit/components-react';

export function VideoGrid() {
  const participants = useParticipants();
  const { localParticipant } = useLocalParticipant();

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 p-4">
      {participants.map((participant) => (
        <div
          key={participant.identity}
          className="relative aspect-video bg-neon-surface rounded-lg overflow-hidden"
        >
          <VideoTrack
            participant={participant}
            source="camera"
            className="w-full h-full object-cover"
          />
          <AudioTrack participant={participant} />
          <div className="absolute bottom-2 left-2 bg-black/50 px-2 py-1 rounded text-sm">
            {participant.name || participant.identity}
            {participant === localParticipant && ' (You)'}
          </div>
        </div>
      ))}
    </div>
  );
}
```

#### Session Controls

```tsx
// frontend/src/components/session/SessionControls.tsx
import {
  useLocalParticipant,
  useRoomContext
} from '@livekit/components-react';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Monitor } from 'lucide-react';

export function SessionControls() {
  const { localParticipant } = useLocalParticipant();
  const room = useRoomContext();

  const isMuted = !localParticipant?.isMicrophoneEnabled;
  const isVideoOff = !localParticipant?.isCameraEnabled;

  const toggleMicrophone = () => {
    localParticipant?.setMicrophoneEnabled(!localParticipant.isMicrophoneEnabled);
  };

  const toggleCamera = () => {
    localParticipant?.setCameraEnabled(!localParticipant.isCameraEnabled);
  };

  const startScreenShare = async () => {
    await localParticipant?.setScreenShareEnabled(true);
  };

  const leaveSession = () => {
    room.disconnect();
  };

  return (
    <div className="flex items-center justify-center gap-4 p-4 bg-neon-surface">
      <button
        onClick={toggleMicrophone}
        className={`p-3 rounded-full ${isMuted ? 'bg-red-500' : 'bg-neon-border'}`}
      >
        {isMuted ? <MicOff /> : <Mic />}
      </button>

      <button
        onClick={toggleCamera}
        className={`p-3 rounded-full ${isVideoOff ? 'bg-red-500' : 'bg-neon-border'}`}
      >
        {isVideoOff ? <VideoOff /> : <Video />}
      </button>

      <button
        onClick={startScreenShare}
        className="p-3 rounded-full bg-neon-border"
      >
        <Monitor />
      </button>

      <button
        onClick={leaveSession}
        className="p-3 rounded-full bg-red-500"
      >
        <PhoneOff />
      </button>
    </div>
  );
}
```

---

## 4. Recording System

### 4.1 Recording Configuration

```typescript
interface RecordingConfig {
  format: 'webm' | 'mp4';
  videoCodec: 'vp8' | 'h264';
  audioCodec: 'opus' | 'aac';
  resolution: {
    width: number;
    height: number;
  };
  framerate: number;
  audioBitrate: number;
  videoBitrate: number;
}

const defaultConfig: RecordingConfig = {
  format: 'webm',
  videoCodec: 'vp8',
  audioCodec: 'opus',
  resolution: { width: 1920, height: 1080 },
  framerate: 30,
  audioBitrate: 128000,
  videoBitrate: 3000000,
};
```

### 4.2 Start Recording (Egress)

```typescript
import { EncodedFileOutput, EncodedFileType, SegmentedFileOutput } from 'livekit-server-sdk';

async function startRecording(sessionId: string, roomName: string) {
  const output: EncodedFileOutput = {
    fileType: EncodedFileType.MP4,
    filepath: `recordings/sessions/${sessionId}/recording-{time}.mp4`,
    s3: {
      bucket: process.env.S3_BUCKET,
      accessKey: process.env.S3_ACCESS_KEY,
      secret: process.env.S3_SECRET_KEY,
      region: process.env.S3_REGION,
      endpoint: process.env.S3_ENDPOINT,
    },
  };

  const egress = await egressClient.startRoomCompositeEgress(
    roomName,
    output,
    {
      layout: 'grid',
      audioOnly: false,
    }
  );

  return egress;
}
```

### 4.3 Storage Structure

```
/data/recordings/
└── sessions/
    └── {session-id}/
        ├── recording-2025-12-30T10-00-00.mp4  # Combined recording
        ├── track-video-user-1.webm            # Individual video tracks
        ├── track-video-user-2.webm
        ├── track-audio-user-1.opus            # Individual audio tracks
        ├── track-audio-user-2.opus
        └── metadata.json                      # Recording metadata
```

### 4.4 Recording Metadata Schema

```json
{
  "sessionId": "abc123",
  "roomName": "session-abc123",
  "startedAt": "2025-12-30T10:00:00Z",
  "endedAt": "2025-12-30T11:00:00Z",
  "duration": 3600000,
  "participants": [
    {
      "identity": "user-1",
      "name": "John Doe",
      "joinedAt": "2025-12-30T10:00:15Z",
      "leftAt": "2025-12-30T11:00:00Z"
    }
  ],
  "tracks": [
    {
      "type": "combined",
      "filename": "recording-2025-12-30T10-00-00.mp4",
      "fileSize": 157286400,
      "duration": 3600000,
      "mimeType": "video/mp4"
    }
  ]
}
```

### 4.5 Recording Playback API

#### GET /api/sessions/:id/recordings

List recordings for a session.

**Response:**
```json
{
  "recordings": [
    {
      "id": "rec-123",
      "filename": "recording-2025-12-30T10-00-00.mp4",
      "duration": 3600000,
      "fileSize": 157286400,
      "trackType": "combined",
      "createdAt": "2025-12-30T11:00:00Z"
    }
  ]
}
```

#### GET /api/recordings/:id/stream

Stream recording with range request support.

**Headers:**
- `Range: bytes=0-1023` (optional)

**Response Headers:**
- `Content-Type: video/mp4`
- `Content-Length: 157286400`
- `Accept-Ranges: bytes`
- `Content-Range: bytes 0-1023/157286400` (if range requested)

---

## 5. ElevenLabs Voice Integration

### 5.1 Configuration

```bash
# ElevenLabs
ELEVENLABS_API_KEY=your-api-key
ELEVENLABS_VOICE_ID=default-voice-id
ELEVENLABS_MODEL_ID=eleven_turbo_v2_5
```

### 5.2 Voice Synthesis Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ LLM Response│────▶│  ElevenLabs │────▶│   LiveKit   │────▶│   Client    │
│   (Text)    │     │   (TTS)     │     │   (Audio)   │     │   (Audio)   │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
```

### 5.3 WebSocket Streaming API

```typescript
// src/lib/elevenlabs.ts
import WebSocket from 'ws';

interface ElevenLabsConfig {
  apiKey: string;
  voiceId: string;
  modelId: string;
  optimizeStreamingLatency?: number;
}

class ElevenLabsClient {
  private ws: WebSocket | null = null;
  private config: ElevenLabsConfig;

  constructor(config: ElevenLabsConfig) {
    this.config = config;
  }

  async connect(): Promise<void> {
    const url = `wss://api.elevenlabs.io/v1/text-to-speech/${this.config.voiceId}/stream-input?model_id=${this.config.modelId}&optimize_streaming_latency=${this.config.optimizeStreamingLatency || 3}`;

    this.ws = new WebSocket(url, {
      headers: {
        'xi-api-key': this.config.apiKey,
      },
    });

    return new Promise((resolve, reject) => {
      this.ws!.on('open', () => {
        // Send initial configuration
        this.ws!.send(JSON.stringify({
          text: ' ',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
          generation_config: {
            chunk_length_schedule: [120, 160, 250, 290],
          },
        }));
        resolve();
      });

      this.ws!.on('error', reject);
    });
  }

  sendText(text: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ text }));
    }
  }

  flush(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ text: '' }));
    }
  }

  onAudio(callback: (audio: Buffer) => void): void {
    this.ws?.on('message', (data) => {
      const message = JSON.parse(data.toString());
      if (message.audio) {
        const audioBuffer = Buffer.from(message.audio, 'base64');
        callback(audioBuffer);
      }
    });
  }

  disconnect(): void {
    this.ws?.close();
  }
}
```

### 5.4 Voice Selection

```typescript
interface Voice {
  id: string;
  name: string;
  preview_url: string;
  category: 'premade' | 'cloned' | 'generated';
  labels: Record<string, string>;
}

async function getVoices(): Promise<Voice[]> {
  const response = await fetch('https://api.elevenlabs.io/v1/voices', {
    headers: {
      'xi-api-key': process.env.ELEVENLABS_API_KEY!,
    },
  });

  const data = await response.json();
  return data.voices;
}
```

### 5.5 AI Agent Voice Output

```typescript
// In the AI agent
import { AudioSource, LocalAudioTrack } from 'livekit-client';

class VoiceAgent {
  private elevenlabs: ElevenLabsClient;
  private audioSource: AudioSource;
  private audioTrack: LocalAudioTrack;

  async speakText(text: string): Promise<void> {
    // Stream text to ElevenLabs
    this.elevenlabs.sendText(text);

    // Handle audio chunks
    this.elevenlabs.onAudio((audioBuffer) => {
      // Convert to PCM and push to LiveKit track
      const pcmData = this.convertToPCM(audioBuffer);
      this.audioSource.captureFrame(pcmData);
    });

    // Signal end of text
    this.elevenlabs.flush();
  }
}
```

---

## 6. Real-Time Transcription

### 6.1 Transcription Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   LiveKit   │────▶│ Transcriber │────▶│   AutoMade  │────▶│  PostgreSQL │
│   (Audio)   │     │   (Whisper) │     │     API     │     │ (Transcripts)│
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
```

### 6.2 Transcription Provider Options

| Provider | Model | Latency | Cost | Notes |
|----------|-------|---------|------|-------|
| OpenAI Whisper | whisper-1 | ~2s | $0.006/min | Best accuracy |
| Deepgram | nova-2 | <500ms | $0.0043/min | Real-time streaming |
| AssemblyAI | best | ~1s | $0.00025/sec | Speaker diarization |
| Google Cloud | latest_long | ~1s | $0.016/min | Enterprise |

### 6.3 Transcript Schema

```sql
CREATE TABLE session_transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id),
  speaker_id VARCHAR(100),
  speaker_name VARCHAR(255),
  content TEXT NOT NULL,
  timestamp_ms INTEGER NOT NULL,
  duration_ms INTEGER,
  confidence DECIMAL(4,3),
  is_final BOOLEAN NOT NULL DEFAULT true,
  flagged BOOLEAN NOT NULL DEFAULT false,
  flag_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX session_transcripts_session_idx ON session_transcripts(session_id);
CREATE INDEX session_transcripts_timestamp_idx ON session_transcripts(session_id, timestamp_ms);
```

### 6.4 Real-Time Transcript Updates

```typescript
// Socket.IO events for transcript updates
io.on('connection', (socket) => {
  socket.on('join_session', (sessionId) => {
    socket.join(`session:${sessionId}`);
  });
});

// Emit transcript updates
function emitTranscript(sessionId: string, transcript: TranscriptEntry) {
  io.to(`session:${sessionId}`).emit('transcript', transcript);
}
```

### 6.5 Transcript Endpoint

#### GET /api/sessions/:id/transcripts

**Query Parameters:**
- `from`: Start timestamp (ms)
- `to`: End timestamp (ms)
- `speaker`: Filter by speaker ID

**Response:**
```json
{
  "transcripts": [
    {
      "id": "trans-1",
      "speakerId": "user-1",
      "speakerName": "John Doe",
      "content": "Hello, I'd like to discuss the project requirements.",
      "timestampMs": 15000,
      "durationMs": 3500,
      "confidence": 0.95,
      "isFinal": true
    }
  ],
  "pagination": {
    "total": 150,
    "page": 1,
    "limit": 50
  }
}
```

---

## 7. AI Agent Architecture

### 7.1 Agent Components

```
┌─────────────────────────────────────────────────────────────┐
│                        AI Agent                              │
│                                                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   Audio     │  │   Speech    │  │   LLM       │         │
│  │   Input     │──│  Recognition│──│  Processor  │         │
│  │  (LiveKit)  │  │  (Whisper)  │  │  (Claude)   │         │
│  └─────────────┘  └─────────────┘  └──────┬──────┘         │
│                                            │                  │
│  ┌─────────────┐  ┌─────────────┐  ┌──────▼──────┐         │
│  │   Audio     │──│   Voice     │──│   Response  │         │
│  │   Output    │  │  Synthesis  │  │  Generator  │         │
│  │  (LiveKit)  │  │ (ElevenLabs)│  │             │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### 7.2 Agent State Machine

```
                     ┌─────────────┐
                     │    IDLE     │
                     └──────┬──────┘
                            │ User speaks
                            ▼
                     ┌─────────────┐
                     │  LISTENING  │
                     └──────┬──────┘
                            │ Speech ends
                            ▼
                     ┌─────────────┐
                     │  THINKING   │
                     └──────┬──────┘
                            │ Response ready
                            ▼
                     ┌─────────────┐
                     │  SPEAKING   │
                     └──────┬──────┘
                            │ Speech ends
                            ▼
                     ┌─────────────┐
                     │    IDLE     │
                     └─────────────┘
```

### 7.3 Agent Configuration

```typescript
interface AgentConfig {
  // LLM settings
  llmProvider: 'anthropic' | 'openai' | 'google';
  llmModel: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;

  // Voice settings
  voiceProvider: 'elevenlabs' | 'openai';
  voiceId: string;
  voiceModel: string;

  // Behavior
  interruptible: boolean;
  silenceThreshold: number;  // ms before agent can speak
  maxSpeakDuration: number;  // ms max speaking time
}

const defaultAgentConfig: AgentConfig = {
  llmProvider: 'anthropic',
  llmModel: 'claude-sonnet-4-20250514',
  temperature: 0.7,
  maxTokens: 1024,
  systemPrompt: 'You are a helpful project discovery facilitator...',

  voiceProvider: 'elevenlabs',
  voiceId: 'EXAVITQu4vr4xnSDxMaL',
  voiceModel: 'eleven_turbo_v2_5',

  interruptible: true,
  silenceThreshold: 500,
  maxSpeakDuration: 30000,
};
```

---

## 8. Error Handling

### 8.1 Connection Errors

```typescript
const connectionRetryPolicy = {
  maxRetries: 5,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
};

async function connectWithRetry<T>(
  connect: () => Promise<T>,
  policy = connectionRetryPolicy
): Promise<T> {
  let lastError: Error;
  let delay = policy.initialDelayMs;

  for (let i = 0; i < policy.maxRetries; i++) {
    try {
      return await connect();
    } catch (error) {
      lastError = error as Error;
      await sleep(delay);
      delay = Math.min(delay * policy.backoffMultiplier, policy.maxDelayMs);
    }
  }

  throw lastError!;
}
```

### 8.2 Fallback Strategies

| Service | Fallback Strategy |
|---------|-------------------|
| LiveKit | Retry connection, then show error modal |
| ElevenLabs | Fall back to OpenAI TTS |
| LLM (Claude) | Fall back to OpenAI, then Google |
| Transcription | Queue for offline processing |

### 8.3 Error Codes

| Code | Description | User Message |
|------|-------------|--------------|
| `ROOM_NOT_FOUND` | LiveKit room doesn't exist | "Session not available" |
| `TOKEN_EXPIRED` | Participant token expired | "Session expired, please rejoin" |
| `MEDIA_PERMISSION_DENIED` | User denied camera/mic | "Please allow camera/microphone access" |
| `VOICE_SYNTHESIS_FAILED` | ElevenLabs error | "Voice temporarily unavailable" |
| `TRANSCRIPTION_FAILED` | Speech-to-text error | "Transcription paused" |

---

## 9. Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| Video latency (glass-to-glass) | < 150ms | WebRTC stats |
| Audio latency | < 100ms | WebRTC stats |
| Voice synthesis latency | < 500ms | Time from text to audio start |
| Transcription latency | < 2s | Time from speech to text |
| LLM response time (p95) | < 3s | API timing |
| Room join time | < 2s | Client measurement |

---

## 10. Security Considerations

### 10.1 Token Security

- Tokens are short-lived (1 hour default)
- Tokens include specific room grants
- Server validates session access before issuing tokens
- Tokens are single-use (new token for each join)

### 10.2 Recording Security

- Recordings stored with encryption at rest
- Access requires session participant or admin role
- Signed URLs with expiration for playback
- Audit logging for recording access

### 10.3 Data Privacy

- Transcripts stored per session with access controls
- Option to disable recording/transcription
- GDPR-compliant data retention policies
- Participant consent recorded at session start

---

## 11. Dependencies

### 11.1 Backend

```json
{
  "livekit-server-sdk": "^2.9.0",
  "ws": "^8.x"
}
```

### 11.2 Frontend

```json
{
  "@livekit/components-react": "^2.x",
  "livekit-client": "^2.x"
}
```

### 11.3 AI Agent (Separate Service)

```json
{
  "livekit-agents": "^0.x",
  "@anthropic-ai/sdk": "^0.32.0",
  "openai": "^4.x"
}
```

---

*Document maintained by Fractionate LLC. Last updated: December 2025*
