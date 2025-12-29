import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { config } from '../config/index.js';
import { logger } from './logger.js';

// LLM Provider interface
interface LLMMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface LLMResponse {
  content: string;
  model: string;
  provider: 'anthropic' | 'openai' | 'google';
  providerId?: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

interface LLMOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
  sessionId?: string;
  projectId?: string;
}

// Default models
const DEFAULT_MODELS = {
  anthropic: 'claude-sonnet-4-20250514',
  openai: 'gpt-4o',
  google: 'gemini-1.5-pro',
} as const;

// Provider types
type ProviderType = 'anthropic' | 'openai' | 'google';

// Cached provider instances (keyed by provider ID or 'env-{provider}')
const clientCache = new Map<string, Anthropic | OpenAI>();

/**
 * Get LLM providers from database (lazy import to avoid circular deps)
 */
async function getDatabaseProviders(): Promise<Array<{
  id: string;
  service: string;
  credentials: Record<string, string>;
  config: Record<string, unknown> | null;
  priority: number;
}>> {
  try {
    // Dynamic import to avoid circular dependencies
    const { getProvidersByType } = await import('../modules/providers/providers.service.js');
    const providers = await getProvidersByType('llm');
    return providers.map(p => ({
      id: p.id,
      service: p.service,
      credentials: p.credentials,
      config: p.config,
      priority: p.priority,
    }));
  } catch (error) {
    logger.debug({ error }, 'Could not load providers from database, using env vars');
    return [];
  }
}

/**
 * Log provider usage (lazy import)
 */
async function logUsage(
  providerId: string | undefined,
  data: {
    sessionId?: string;
    projectId?: string;
    requestType: string;
    inputTokens?: number;
    outputTokens?: number;
    durationMs?: number;
    success: boolean;
    errorMessage?: string;
    model?: string;
  }
): Promise<void> {
  if (!providerId || providerId.startsWith('env-')) {
    return; // Don't log usage for env-based providers
  }

  try {
    const { logProviderUsage } = await import('../modules/providers/providers.service.js');
    await logProviderUsage(providerId, data);
  } catch {
    // Ignore logging errors
  }
}

/**
 * Get or create Anthropic client
 */
function getAnthropicClient(apiKey: string, cacheKey: string): Anthropic {
  let client = clientCache.get(cacheKey) as Anthropic | undefined;
  if (!client) {
    client = new Anthropic({ apiKey });
    clientCache.set(cacheKey, client);
  }
  return client;
}

/**
 * Get or create OpenAI client
 */
function getOpenAIClient(apiKey: string, cacheKey: string, baseUrl?: string): OpenAI {
  let client = clientCache.get(cacheKey) as OpenAI | undefined;
  if (!client) {
    client = new OpenAI({ apiKey, baseURL: baseUrl });
    clientCache.set(cacheKey, client);
  }
  return client;
}

async function callAnthropic(
  messages: LLMMessage[],
  options: LLMOptions,
  apiKey: string,
  providerId?: string
): Promise<LLMResponse> {
  const client = getAnthropicClient(apiKey, providerId || 'env-anthropic');

  const systemPrompt = options.systemPrompt || messages.find(m => m.role === 'system')?.content;
  const conversationMessages = messages.filter(m => m.role !== 'system');

  const response = await client.messages.create({
    model: options.model || DEFAULT_MODELS.anthropic,
    max_tokens: options.maxTokens || 4096,
    temperature: options.temperature,
    system: systemPrompt,
    messages: conversationMessages.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
  });

  const textContent = response.content.find(c => c.type === 'text');

  return {
    content: textContent?.text ?? '',
    model: response.model,
    provider: 'anthropic',
    providerId,
    usage: {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    },
  };
}

async function callOpenAI(
  messages: LLMMessage[],
  options: LLMOptions,
  apiKey: string,
  providerId?: string,
  baseUrl?: string
): Promise<LLMResponse> {
  const client = getOpenAIClient(apiKey, providerId || 'env-openai', baseUrl);

  const openaiMessages = messages.map(m => ({
    role: m.role,
    content: m.content,
  }));

  if (options.systemPrompt && !messages.some(m => m.role === 'system')) {
    openaiMessages.unshift({ role: 'system', content: options.systemPrompt });
  }

  const response = await client.chat.completions.create({
    model: options.model || DEFAULT_MODELS.openai,
    max_tokens: options.maxTokens || 4096,
    temperature: options.temperature,
    messages: openaiMessages,
  });

  return {
    content: response.choices[0]?.message?.content ?? '',
    model: response.model,
    provider: 'openai',
    providerId,
    usage: response.usage ? {
      inputTokens: response.usage.prompt_tokens,
      outputTokens: response.usage.completion_tokens,
    } : undefined,
  };
}

async function callGoogle(
  messages: LLMMessage[],
  options: LLMOptions,
  apiKey: string,
  providerId?: string
): Promise<LLMResponse> {
  const model = options.model || DEFAULT_MODELS.google;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const systemPrompt = options.systemPrompt || messages.find(m => m.role === 'system')?.content;
  const conversationMessages = messages.filter(m => m.role !== 'system');

  const body = {
    contents: conversationMessages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    })),
    systemInstruction: systemPrompt ? { parts: [{ text: systemPrompt }] } : undefined,
    generationConfig: {
      maxOutputTokens: options.maxTokens || 4096,
      temperature: options.temperature,
    },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Google AI API error: ${response.statusText}`);
  }

  const data = await response.json() as {
    candidates: Array<{ content: { parts: Array<{ text: string }> } }>;
    usageMetadata?: { promptTokenCount: number; candidatesTokenCount: number };
  };

  return {
    content: data.candidates?.[0]?.content?.parts?.[0]?.text ?? '',
    model,
    provider: 'google',
    providerId,
    usage: data.usageMetadata ? {
      inputTokens: data.usageMetadata.promptTokenCount,
      outputTokens: data.usageMetadata.candidatesTokenCount,
    } : undefined,
  };
}

/**
 * Build provider list from database + env vars
 */
async function getProviderList(): Promise<Array<{
  id?: string;
  service: ProviderType;
  apiKey: string;
  baseUrl?: string;
  priority: number;
}>> {
  const providers: Array<{
    id?: string;
    service: ProviderType;
    apiKey: string;
    baseUrl?: string;
    priority: number;
  }> = [];

  // Try to load from database first
  const dbProviders = await getDatabaseProviders();

  for (const p of dbProviders) {
    if (p.credentials.apiKey) {
      providers.push({
        id: p.id,
        service: p.service as ProviderType,
        apiKey: p.credentials.apiKey,
        baseUrl: p.credentials.baseUrl,
        priority: p.priority,
      });
    }
  }

  // Add env-based providers as fallbacks (higher priority number = lower priority)
  if (config.llm.anthropic.apiKey && !providers.some(p => p.service === 'anthropic')) {
    providers.push({
      service: 'anthropic',
      apiKey: config.llm.anthropic.apiKey,
      priority: 1000,
    });
  }

  if (config.llm.openai.apiKey && !providers.some(p => p.service === 'openai')) {
    providers.push({
      service: 'openai',
      apiKey: config.llm.openai.apiKey,
      priority: 1001,
    });
  }

  if (config.llm.google.apiKey && !providers.some(p => p.service === 'google')) {
    providers.push({
      service: 'google',
      apiKey: config.llm.google.apiKey,
      priority: 1002,
    });
  }

  // Sort by priority
  return providers.sort((a, b) => a.priority - b.priority);
}

/**
 * Main chat function with fallback across providers
 */
export async function chat(
  messages: LLMMessage[],
  options: LLMOptions = {}
): Promise<LLMResponse> {
  const providers = await getProviderList();
  const errors: Array<{ provider: string; error: Error }> = [];
  const startTime = Date.now();

  if (providers.length === 0) {
    throw new Error('No LLM providers configured. Add API keys via admin panel or environment variables.');
  }

  for (const provider of providers) {
    try {
      let result: LLMResponse;

      switch (provider.service) {
        case 'anthropic':
          result = await callAnthropic(messages, options, provider.apiKey, provider.id);
          break;
        case 'openai':
          result = await callOpenAI(messages, options, provider.apiKey, provider.id, provider.baseUrl);
          break;
        case 'google':
          result = await callGoogle(messages, options, provider.apiKey, provider.id);
          break;
        default:
          continue;
      }

      // Log successful usage
      await logUsage(provider.id, {
        sessionId: options.sessionId,
        projectId: options.projectId,
        requestType: 'chat',
        inputTokens: result.usage?.inputTokens,
        outputTokens: result.usage?.outputTokens,
        durationMs: Date.now() - startTime,
        success: true,
        model: result.model,
      });

      return result;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      errors.push({ provider: provider.service, error: err });
      logger.warn({ provider: provider.service, providerId: provider.id, error: err.message }, 'LLM provider failed, trying fallback');

      // Log failed usage
      await logUsage(provider.id, {
        sessionId: options.sessionId,
        projectId: options.projectId,
        requestType: 'chat',
        durationMs: Date.now() - startTime,
        success: false,
        errorMessage: err.message,
      });
    }
  }

  throw new Error(`All LLM providers failed: ${errors.map(e => `${e.provider}: ${e.error.message}`).join('; ')}`);
}

// Discovery session prompts
export const DISCOVERY_PROMPTS = {
  facilitator: `You are an expert discovery facilitator for Fractionate, a software development consultancy.
Your role is to conduct discovery sessions with clients to understand their project requirements.

Your objectives:
1. Understand the client's problem and goals
2. Identify constraints and requirements
3. Surface assumptions and risks
4. Document success criteria
5. Capture technical requirements

Guidelines:
- Ask clarifying questions when needed
- Summarize key points regularly
- Flag inconsistencies or unclear requirements
- Be conversational but focused
- Take note of non-functional requirements (performance, security, compliance)
- Identify stakeholders and their needs

After the session, provide:
1. Executive summary
2. Key requirements
3. Constraints and assumptions
4. Suggested next steps
5. Items needing clarification`,

  summarizer: `Analyze the following discovery session transcript and extract:
1. Problem statement
2. Goals (what success looks like)
3. Non-goals (explicitly out of scope)
4. Constraints
5. Key requirements (functional and non-functional)
6. Stakeholders
7. Risks and assumptions
8. Suggested next steps
9. Items requiring clarification

Format the output as structured markdown.`,
};

/**
 * Streaming chat for real-time sessions
 */
export async function streamChat(
  messages: LLMMessage[],
  options: LLMOptions,
  onChunk: (chunk: string) => void
): Promise<LLMResponse> {
  const providers = await getProviderList();
  const startTime = Date.now();

  // Find Anthropic provider for streaming
  const anthropicProvider = providers.find(p => p.service === 'anthropic');

  if (!anthropicProvider) {
    throw new Error('Streaming requires Anthropic API. Configure via admin panel or ANTHROPIC_API_KEY.');
  }

  const client = getAnthropicClient(anthropicProvider.apiKey, anthropicProvider.id || 'env-anthropic');

  const systemPrompt = options.systemPrompt || messages.find(m => m.role === 'system')?.content;
  const conversationMessages = messages.filter(m => m.role !== 'system');

  let fullContent = '';
  const usage = { inputTokens: 0, outputTokens: 0 };

  try {
    const stream = client.messages.stream({
      model: options.model || DEFAULT_MODELS.anthropic,
      max_tokens: options.maxTokens || 4096,
      temperature: options.temperature,
      system: systemPrompt,
      messages: conversationMessages.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta') {
        const delta = event.delta;
        if ('text' in delta) {
          fullContent += delta.text;
          onChunk(delta.text);
        }
      } else if (event.type === 'message_delta') {
        if ('usage' in event && event.usage) {
          usage.outputTokens = event.usage.output_tokens;
        }
      }
    }

    const finalMessage = await stream.finalMessage();
    usage.inputTokens = finalMessage.usage.input_tokens;

    // Log successful usage
    await logUsage(anthropicProvider.id, {
      sessionId: options.sessionId,
      projectId: options.projectId,
      requestType: 'stream_chat',
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      durationMs: Date.now() - startTime,
      success: true,
      model: finalMessage.model,
    });

    return {
      content: fullContent,
      model: finalMessage.model,
      provider: 'anthropic',
      providerId: anthropicProvider.id,
      usage,
    };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));

    // Log failed usage
    await logUsage(anthropicProvider.id, {
      sessionId: options.sessionId,
      projectId: options.projectId,
      requestType: 'stream_chat',
      durationMs: Date.now() - startTime,
      success: false,
      errorMessage: err.message,
    });

    throw error;
  }
}

// Export types
export type { LLMMessage, LLMResponse, LLMOptions };
