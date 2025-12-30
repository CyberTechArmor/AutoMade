# AI Provider Configuration Guide

**Project:** AutoMade
**Version:** 1.0
**Date:** 2025-12-30
**Author:** Fractionate LLC
**Status:** Approved

---

## 1. Overview

AutoMade supports multiple AI providers for different use cases. This document details how to configure each provider, select models, manage API keys, and set up fallback chains.

---

## 2. Use Case Mapping

| Use Case | Primary Provider | Fallback | Notes |
|----------|------------------|----------|-------|
| **Real-Time Agent (Voice)** | ElevenLabs | OpenAI TTS | Voice synthesis for LiveKit sessions |
| **Transcription** | OpenAI Whisper | Deepgram | Speech-to-text for sessions |
| **Document Creation** | Anthropic Claude | OpenAI GPT | Generating project documents |
| **Session Facilitation** | Anthropic Claude | OpenAI GPT → Google Gemini | AI-led discovery sessions |
| **Summarization** | Anthropic Claude | OpenAI GPT | Session and project summaries |

---

## 3. Provider Configuration

### 3.1 Database Schema

```sql
-- Service providers table (already exists)
CREATE TABLE service_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(50) NOT NULL,           -- 'llm', 'voice', 'transcription', etc.
  service VARCHAR(50) NOT NULL,         -- 'anthropic', 'openai', 'elevenlabs'
  name VARCHAR(255) NOT NULL,
  api_key_encrypted TEXT NOT NULL,
  config JSONB NOT NULL DEFAULT '{}',
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  priority INTEGER NOT NULL DEFAULT 0,  -- Lower = higher priority
  rate_limit INTEGER,                   -- Requests per minute
  last_used_at TIMESTAMPTZ,
  last_error TEXT,
  last_error_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for provider lookup
CREATE INDEX service_providers_type_priority_idx
  ON service_providers(type, priority)
  WHERE is_enabled = true;
```

### 3.2 Provider Types

| Type | Description | Supported Services |
|------|-------------|-------------------|
| `llm` | Large Language Models | anthropic, openai, google_ai |
| `voice` | Voice Synthesis (TTS) | elevenlabs, openai |
| `transcription` | Speech-to-Text | openai, deepgram, assemblyai |
| `storage` | File Storage | s3, local |
| `webrtc` | Real-Time Communication | livekit |
| `sms` | SMS Messaging | twilio |
| `email` | Email Delivery | sendgrid, smtp |

---

## 4. LLM Providers

### 4.1 Anthropic Claude

**Service ID:** `anthropic`

#### Configuration

```json
{
  "type": "llm",
  "service": "anthropic",
  "name": "Claude (Primary)",
  "priority": 0,
  "config": {
    "model": "claude-sonnet-4-20250514",
    "maxTokens": 4096,
    "temperature": 0.7,
    "topP": 0.9,
    "stopSequences": [],
    "anthropicVersion": "2023-06-01"
  }
}
```

#### Available Models

| Model ID | Context | Best For |
|----------|---------|----------|
| `claude-opus-4-20250514` | 200K | Complex reasoning, analysis |
| `claude-sonnet-4-20250514` | 200K | Balanced performance (recommended) |
| `claude-haiku-3-20240307` | 200K | Fast responses, simple tasks |

#### Environment Variables

```bash
ANTHROPIC_API_KEY=sk-ant-...
```

#### Usage Example

```typescript
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const response = await client.messages.create({
  model: 'claude-sonnet-4-20250514',
  max_tokens: 1024,
  system: 'You are a helpful project discovery facilitator.',
  messages: [
    { role: 'user', content: 'Help me define project requirements.' }
  ],
});
```

---

### 4.2 OpenAI GPT

**Service ID:** `openai`

#### Configuration

```json
{
  "type": "llm",
  "service": "openai",
  "name": "GPT-4o (Fallback)",
  "priority": 1,
  "config": {
    "model": "gpt-4o",
    "maxTokens": 4096,
    "temperature": 0.7,
    "topP": 0.9,
    "frequencyPenalty": 0,
    "presencePenalty": 0
  }
}
```

#### Available Models

| Model ID | Context | Best For |
|----------|---------|----------|
| `gpt-4o` | 128K | Latest GPT-4, multimodal |
| `gpt-4o-mini` | 128K | Cost-effective, fast |
| `gpt-4-turbo` | 128K | Previous generation |
| `o1-preview` | 128K | Advanced reasoning |

#### Environment Variables

```bash
OPENAI_API_KEY=sk-...
OPENAI_ORG_ID=org-... # Optional
```

---

### 4.3 Google Gemini

**Service ID:** `google_ai`

#### Configuration

```json
{
  "type": "llm",
  "service": "google_ai",
  "name": "Gemini (Fallback 2)",
  "priority": 2,
  "config": {
    "model": "gemini-1.5-pro",
    "maxOutputTokens": 4096,
    "temperature": 0.7,
    "topP": 0.9,
    "topK": 40
  }
}
```

#### Available Models

| Model ID | Context | Best For |
|----------|---------|----------|
| `gemini-1.5-pro` | 1M | Long context, multimodal |
| `gemini-1.5-flash` | 1M | Fast, cost-effective |
| `gemini-2.0-flash-exp` | 1M | Latest experimental |

#### Environment Variables

```bash
GOOGLE_AI_API_KEY=AIza...
```

---

## 5. Voice Providers

### 5.1 ElevenLabs

**Service ID:** `elevenlabs`

#### Configuration

```json
{
  "type": "voice",
  "service": "elevenlabs",
  "name": "ElevenLabs (Primary)",
  "priority": 0,
  "config": {
    "voiceId": "EXAVITQu4vr4xnSDxMaL",
    "modelId": "eleven_turbo_v2_5",
    "stability": 0.5,
    "similarityBoost": 0.75,
    "style": 0.0,
    "useSpeakerBoost": true,
    "optimizeStreamingLatency": 3
  }
}
```

#### Available Models

| Model ID | Latency | Quality | Notes |
|----------|---------|---------|-------|
| `eleven_turbo_v2_5` | ~300ms | High | **Recommended for real-time** |
| `eleven_multilingual_v2` | ~500ms | Highest | 29 languages |
| `eleven_monolingual_v1` | ~400ms | High | English only |

#### Voice Selection

ElevenLabs provides pre-made voices and custom voice cloning:

```typescript
// List available voices
const voices = await fetch('https://api.elevenlabs.io/v1/voices', {
  headers: { 'xi-api-key': apiKey }
}).then(r => r.json());

// Popular pre-made voices
const recommendedVoices = [
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah', style: 'warm, professional' },
  { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel', style: 'calm, articulate' },
  { id: 'AZnzlk1XvdvUeBnXmlld', name: 'Domi', style: 'strong, confident' },
];
```

#### Environment Variables

```bash
ELEVENLABS_API_KEY=...
ELEVENLABS_VOICE_ID=EXAVITQu4vr4xnSDxMaL
```

---

### 5.2 OpenAI TTS

**Service ID:** `openai_tts`

#### Configuration

```json
{
  "type": "voice",
  "service": "openai_tts",
  "name": "OpenAI TTS (Fallback)",
  "priority": 1,
  "config": {
    "model": "tts-1",
    "voice": "alloy",
    "speed": 1.0,
    "responseFormat": "mp3"
  }
}
```

#### Available Voices

| Voice | Description |
|-------|-------------|
| `alloy` | Neutral, balanced |
| `echo` | Male, warm |
| `fable` | British accent |
| `onyx` | Deep, authoritative |
| `nova` | Female, friendly |
| `shimmer` | Female, soft |

---

## 6. Transcription Providers

### 6.1 OpenAI Whisper

**Service ID:** `openai_whisper`

#### Configuration

```json
{
  "type": "transcription",
  "service": "openai_whisper",
  "name": "Whisper (Primary)",
  "priority": 0,
  "config": {
    "model": "whisper-1",
    "language": "en",
    "responseFormat": "verbose_json",
    "temperature": 0
  }
}
```

#### Environment Variables

```bash
OPENAI_API_KEY=sk-...  # Same as LLM
```

---

### 6.2 Deepgram

**Service ID:** `deepgram`

#### Configuration

```json
{
  "type": "transcription",
  "service": "deepgram",
  "name": "Deepgram (Real-time)",
  "priority": 0,
  "config": {
    "model": "nova-2",
    "language": "en",
    "smartFormat": true,
    "punctuate": true,
    "diarize": true,
    "utterances": true
  }
}
```

#### Environment Variables

```bash
DEEPGRAM_API_KEY=...
```

---

## 7. API Key Management

### 7.1 Encryption

API keys are encrypted at rest using AES-256-GCM:

```typescript
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ENCRYPTION_KEY = process.env.PROVIDER_ENCRYPTION_KEY!;
const ALGORITHM = 'aes-256-gcm';

function encrypt(text: string): string {
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

function decrypt(encryptedText: string): string {
  const [ivHex, authTagHex, encrypted] = encryptedText.split(':');

  const decipher = createDecipheriv(
    ALGORITHM,
    Buffer.from(ENCRYPTION_KEY, 'hex'),
    Buffer.from(ivHex, 'hex')
  );

  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
```

### 7.2 Key Validation

Validate API keys before saving:

```typescript
async function validateApiKey(service: string, apiKey: string): Promise<boolean> {
  switch (service) {
    case 'anthropic':
      return validateAnthropicKey(apiKey);
    case 'openai':
      return validateOpenAIKey(apiKey);
    case 'elevenlabs':
      return validateElevenLabsKey(apiKey);
    default:
      return true;
  }
}

async function validateAnthropicKey(apiKey: string): Promise<boolean> {
  try {
    const client = new Anthropic({ apiKey });
    await client.messages.create({
      model: 'claude-haiku-3-20240307',
      max_tokens: 1,
      messages: [{ role: 'user', content: 'test' }]
    });
    return true;
  } catch (error) {
    return false;
  }
}
```

### 7.3 Key Rotation

```typescript
// Rotate API key
async function rotateApiKey(providerId: string, newApiKey: string): Promise<void> {
  // Validate new key
  const provider = await getProvider(providerId);
  const isValid = await validateApiKey(provider.service, newApiKey);

  if (!isValid) {
    throw new Error('Invalid API key');
  }

  // Encrypt and update
  const encryptedKey = encrypt(newApiKey);

  await db
    .update(serviceProviders)
    .set({
      apiKeyEncrypted: encryptedKey,
      updatedAt: new Date()
    })
    .where(eq(serviceProviders.id, providerId));

  // Audit log
  await auditLog.create({
    action: 'provider.key_rotated',
    resourceType: 'service_provider',
    resourceId: providerId
  });
}
```

---

## 8. Fallback Chain

### 8.1 LLM Fallback Implementation

```typescript
// src/lib/llm.ts

interface LLMProvider {
  id: string;
  service: string;
  priority: number;
  client: any;
}

class LLMClient {
  private providers: LLMProvider[] = [];

  async initialize(): Promise<void> {
    const dbProviders = await db
      .select()
      .from(serviceProviders)
      .where(
        and(
          eq(serviceProviders.type, 'llm'),
          eq(serviceProviders.isEnabled, true)
        )
      )
      .orderBy(serviceProviders.priority);

    for (const provider of dbProviders) {
      const apiKey = decrypt(provider.apiKeyEncrypted);

      this.providers.push({
        id: provider.id,
        service: provider.service,
        priority: provider.priority,
        client: this.createClient(provider.service, apiKey, provider.config)
      });
    }
  }

  async complete(
    systemPrompt: string,
    userMessage: string,
    options: LLMOptions = {}
  ): Promise<LLMResponse> {
    let lastError: Error | null = null;

    for (const provider of this.providers) {
      try {
        const response = await this.callProvider(provider, systemPrompt, userMessage, options);

        // Log successful usage
        await this.logUsage(provider.id, response.usage);

        return response;
      } catch (error) {
        lastError = error as Error;

        // Log error
        await this.logError(provider.id, error);

        // Continue to next provider
        console.warn(`Provider ${provider.service} failed, trying next...`);
      }
    }

    throw new Error(`All LLM providers failed. Last error: ${lastError?.message}`);
  }

  private async callProvider(
    provider: LLMProvider,
    systemPrompt: string,
    userMessage: string,
    options: LLMOptions
  ): Promise<LLMResponse> {
    switch (provider.service) {
      case 'anthropic':
        return this.callAnthropic(provider.client, systemPrompt, userMessage, options);
      case 'openai':
        return this.callOpenAI(provider.client, systemPrompt, userMessage, options);
      case 'google_ai':
        return this.callGoogle(provider.client, systemPrompt, userMessage, options);
      default:
        throw new Error(`Unknown provider: ${provider.service}`);
    }
  }
}
```

### 8.2 Voice Fallback

```typescript
// src/lib/voice.ts

class VoiceClient {
  private providers: VoiceProvider[] = [];

  async synthesize(text: string, options: VoiceOptions = {}): Promise<Buffer> {
    for (const provider of this.providers) {
      try {
        return await this.callProvider(provider, text, options);
      } catch (error) {
        console.warn(`Voice provider ${provider.service} failed, trying next...`);
      }
    }

    throw new Error('All voice providers failed');
  }
}
```

---

## 9. Provider Management API

### 9.1 Endpoints

#### GET /api/providers

List all configured providers.

**Response:**
```json
{
  "providers": [
    {
      "id": "prov-1",
      "type": "llm",
      "service": "anthropic",
      "name": "Claude (Primary)",
      "priority": 0,
      "isEnabled": true,
      "config": {
        "model": "claude-sonnet-4-20250514"
      },
      "lastUsedAt": "2025-12-30T10:00:00Z"
    }
  ]
}
```

#### POST /api/providers

Create a new provider configuration.

**Request:**
```json
{
  "type": "llm",
  "service": "anthropic",
  "name": "Claude (Primary)",
  "apiKey": "sk-ant-...",
  "config": {
    "model": "claude-sonnet-4-20250514",
    "maxTokens": 4096
  },
  "priority": 0
}
```

#### PATCH /api/providers/:id

Update provider configuration.

#### POST /api/providers/:id/test

Test provider connectivity.

**Response:**
```json
{
  "success": true,
  "latencyMs": 245,
  "model": "claude-sonnet-4-20250514"
}
```

#### POST /api/providers/:id/rotate-key

Rotate API key.

**Request:**
```json
{
  "newApiKey": "sk-ant-new-key..."
}
```

---

## 10. Usage Monitoring

### 10.1 Usage Logging Schema

```sql
CREATE TABLE provider_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES service_providers(id),
  session_id UUID REFERENCES sessions(id),
  project_id UUID REFERENCES projects(id),

  -- Usage metrics
  input_tokens INTEGER,
  output_tokens INTEGER,
  audio_seconds DECIMAL(10,2),

  -- Cost (in USD cents)
  cost_cents INTEGER,

  -- Metadata
  model VARCHAR(100),
  operation VARCHAR(50),  -- 'completion', 'transcription', 'synthesis'
  request_id VARCHAR(100),
  latency_ms INTEGER,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX provider_usage_logs_provider_idx ON provider_usage_logs(provider_id, created_at);
CREATE INDEX provider_usage_logs_project_idx ON provider_usage_logs(project_id, created_at);
```

### 10.2 Cost Calculation

```typescript
const PRICING = {
  anthropic: {
    'claude-sonnet-4-20250514': { input: 3, output: 15 },  // per million tokens
    'claude-opus-4-20250514': { input: 15, output: 75 },
    'claude-haiku-3-20240307': { input: 0.25, output: 1.25 },
  },
  openai: {
    'gpt-4o': { input: 2.5, output: 10 },
    'gpt-4o-mini': { input: 0.15, output: 0.6 },
  },
  elevenlabs: {
    'eleven_turbo_v2_5': { perCharacter: 0.00003 },
  },
};

function calculateCost(
  service: string,
  model: string,
  usage: { inputTokens?: number; outputTokens?: number; characters?: number }
): number {
  const pricing = PRICING[service]?.[model];
  if (!pricing) return 0;

  if ('input' in pricing) {
    return (
      ((usage.inputTokens || 0) / 1_000_000) * pricing.input +
      ((usage.outputTokens || 0) / 1_000_000) * pricing.output
    );
  }

  if ('perCharacter' in pricing) {
    return (usage.characters || 0) * pricing.perCharacter;
  }

  return 0;
}
```

### 10.3 Usage Dashboard

```typescript
// GET /api/providers/usage

interface UsageSummary {
  providerId: string;
  providerName: string;
  period: 'day' | 'week' | 'month';
  totalRequests: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCostCents: number;
  averageLatencyMs: number;
  errorRate: number;
}

async function getUsageSummary(
  period: 'day' | 'week' | 'month'
): Promise<UsageSummary[]> {
  const since = {
    day: subDays(new Date(), 1),
    week: subWeeks(new Date(), 1),
    month: subMonths(new Date(), 1),
  }[period];

  return db
    .select({
      providerId: providerUsageLogs.providerId,
      providerName: serviceProviders.name,
      totalRequests: count(),
      totalInputTokens: sum(providerUsageLogs.inputTokens),
      totalOutputTokens: sum(providerUsageLogs.outputTokens),
      totalCostCents: sum(providerUsageLogs.costCents),
      averageLatencyMs: avg(providerUsageLogs.latencyMs),
    })
    .from(providerUsageLogs)
    .leftJoin(serviceProviders, eq(providerUsageLogs.providerId, serviceProviders.id))
    .where(gte(providerUsageLogs.createdAt, since))
    .groupBy(providerUsageLogs.providerId, serviceProviders.name);
}
```

---

## 11. Configuration UI Components

### 11.1 Provider Settings Page

```tsx
// frontend/src/pages/ProvidersPage.tsx

export function ProvidersPage() {
  const { data: providers } = useQuery(['providers'], fetchProviders);

  return (
    <div className="space-y-6">
      <h1 className="text-h1 font-semibold">AI Provider Configuration</h1>

      <div className="grid gap-4">
        {/* LLM Providers */}
        <ProviderSection
          title="Language Models"
          type="llm"
          providers={providers?.filter(p => p.type === 'llm')}
        />

        {/* Voice Providers */}
        <ProviderSection
          title="Voice Synthesis"
          type="voice"
          providers={providers?.filter(p => p.type === 'voice')}
        />

        {/* Transcription Providers */}
        <ProviderSection
          title="Transcription"
          type="transcription"
          providers={providers?.filter(p => p.type === 'transcription')}
        />
      </div>
    </div>
  );
}
```

### 11.2 Provider Configuration Modal

```tsx
// frontend/src/components/providers/ProviderConfigModal.tsx

interface ProviderConfigModalProps {
  provider?: Provider;
  type: ProviderType;
  onSave: (data: ProviderFormData) => void;
  onClose: () => void;
}

export function ProviderConfigModal({
  provider,
  type,
  onSave,
  onClose
}: ProviderConfigModalProps) {
  const { register, handleSubmit } = useForm<ProviderFormData>({
    defaultValues: provider || { type }
  });

  return (
    <Modal onClose={onClose}>
      <form onSubmit={handleSubmit(onSave)}>
        <h2 className="text-h2 font-semibold mb-4">
          {provider ? 'Edit Provider' : 'Add Provider'}
        </h2>

        {/* Service Selection */}
        <div className="mb-4">
          <label className="block text-sm text-neon-text-secondary mb-1">
            Service
          </label>
          <select {...register('service')} className="input">
            {getServicesForType(type).map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        {/* API Key */}
        <div className="mb-4">
          <label className="block text-sm text-neon-text-secondary mb-1">
            API Key
          </label>
          <input
            type="password"
            {...register('apiKey')}
            className="input"
            placeholder="Enter API key..."
          />
        </div>

        {/* Model Selection (for LLM) */}
        {type === 'llm' && (
          <div className="mb-4">
            <label className="block text-sm text-neon-text-secondary mb-1">
              Model
            </label>
            <select {...register('config.model')} className="input">
              {getModelsForService(watch('service')).map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Priority */}
        <div className="mb-4">
          <label className="block text-sm text-neon-text-secondary mb-1">
            Priority (lower = higher priority)
          </label>
          <input
            type="number"
            {...register('priority', { valueAsNumber: true })}
            className="input"
            min={0}
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 mt-6">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" className="btn-primary">
            Save
          </button>
        </div>
      </form>
    </Modal>
  );
}
```

---

## 12. Environment Variables Summary

```bash
# ===========================================
# AI Provider Configuration
# ===========================================

# Encryption key for storing API keys (32 bytes hex)
PROVIDER_ENCRYPTION_KEY=your-64-character-hex-string

# ----- LLM Providers -----

# Anthropic (Primary)
ANTHROPIC_API_KEY=sk-ant-...

# OpenAI (Fallback 1)
OPENAI_API_KEY=sk-...
OPENAI_ORG_ID=org-...  # Optional

# Google AI (Fallback 2)
GOOGLE_AI_API_KEY=AIza...

# ----- Voice Providers -----

# ElevenLabs (Primary)
ELEVENLABS_API_KEY=...
ELEVENLABS_VOICE_ID=EXAVITQu4vr4xnSDxMaL

# OpenAI TTS uses same key as LLM

# ----- Transcription -----

# Uses OPENAI_API_KEY for Whisper

# Deepgram (Alternative)
DEEPGRAM_API_KEY=...

# ----- Real-Time -----

# LiveKit
LIVEKIT_URL=wss://your-livekit-server.com
LIVEKIT_API_KEY=...
LIVEKIT_API_SECRET=...
```

---

## 13. Best Practices

### 13.1 API Key Security

- Never log or expose API keys
- Use encrypted storage for all keys
- Rotate keys periodically (quarterly recommended)
- Use separate keys for dev/staging/production
- Monitor for unusual usage patterns

### 13.2 Fallback Configuration

- Configure at least 2 LLM providers for redundancy
- Set appropriate priorities based on cost/quality trade-offs
- Test fallback chains regularly
- Monitor fallback frequency as health indicator

### 13.3 Cost Management

- Set rate limits per provider
- Configure usage alerts
- Use cheaper models for non-critical operations
- Cache responses where appropriate
- Monitor cost per session/project

### 13.4 Performance Optimization

- Use streaming responses for real-time feedback
- Implement connection pooling for LLM clients
- Cache voice synthesis for repeated content
- Pre-warm connections for session start

---

*Document maintained by Fractionate LLC. Last updated: December 2025*
