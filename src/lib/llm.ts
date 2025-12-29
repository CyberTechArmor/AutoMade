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
}

// Initialize providers
const anthropic = config.llm.anthropic.apiKey
  ? new Anthropic({ apiKey: config.llm.anthropic.apiKey })
  : null;

const openai = config.llm.openai.apiKey
  ? new OpenAI({ apiKey: config.llm.openai.apiKey })
  : null;

// Default models
const DEFAULT_MODELS = {
  anthropic: 'claude-sonnet-4-20250514',
  openai: 'gpt-4o',
  google: 'gemini-1.5-pro',
} as const;

// Provider order for fallback
const PROVIDER_ORDER: Array<'anthropic' | 'openai' | 'google'> = ['anthropic', 'openai', 'google'];

async function callAnthropic(
  messages: LLMMessage[],
  options: LLMOptions
): Promise<LLMResponse> {
  if (!anthropic) {
    throw new Error('Anthropic client not initialized');
  }

  const systemPrompt = options.systemPrompt || messages.find(m => m.role === 'system')?.content;
  const conversationMessages = messages.filter(m => m.role !== 'system');

  const response = await anthropic.messages.create({
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
    usage: {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    },
  };
}

async function callOpenAI(
  messages: LLMMessage[],
  options: LLMOptions
): Promise<LLMResponse> {
  if (!openai) {
    throw new Error('OpenAI client not initialized');
  }

  const openaiMessages = messages.map(m => ({
    role: m.role,
    content: m.content,
  }));

  if (options.systemPrompt && !messages.some(m => m.role === 'system')) {
    openaiMessages.unshift({ role: 'system', content: options.systemPrompt });
  }

  const response = await openai.chat.completions.create({
    model: options.model || DEFAULT_MODELS.openai,
    max_tokens: options.maxTokens || 4096,
    temperature: options.temperature,
    messages: openaiMessages,
  });

  return {
    content: response.choices[0]?.message?.content ?? '',
    model: response.model,
    provider: 'openai',
    usage: response.usage ? {
      inputTokens: response.usage.prompt_tokens,
      outputTokens: response.usage.completion_tokens,
    } : undefined,
  };
}

async function callGoogle(
  messages: LLMMessage[],
  options: LLMOptions
): Promise<LLMResponse> {
  // Note: Using REST API for Google AI
  if (!config.llm.google.apiKey) {
    throw new Error('Google AI API key not configured');
  }

  const model = options.model || DEFAULT_MODELS.google;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.llm.google.apiKey}`;

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
    usage: data.usageMetadata ? {
      inputTokens: data.usageMetadata.promptTokenCount,
      outputTokens: data.usageMetadata.candidatesTokenCount,
    } : undefined,
  };
}

// Main function with fallback
export async function chat(
  messages: LLMMessage[],
  options: LLMOptions = {}
): Promise<LLMResponse> {
  const errors: Array<{ provider: string; error: Error }> = [];

  for (const provider of PROVIDER_ORDER) {
    try {
      switch (provider) {
        case 'anthropic':
          if (anthropic) return await callAnthropic(messages, options);
          break;
        case 'openai':
          if (openai) return await callOpenAI(messages, options);
          break;
        case 'google':
          if (config.llm.google.apiKey) return await callGoogle(messages, options);
          break;
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      errors.push({ provider, error: err });
      logger.warn({ provider, error: err.message }, 'LLM provider failed, trying fallback');
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

// Streaming chat for real-time sessions
export async function streamChat(
  messages: LLMMessage[],
  options: LLMOptions,
  onChunk: (chunk: string) => void
): Promise<LLMResponse> {
  if (!anthropic) {
    throw new Error('Streaming requires Anthropic API');
  }

  const systemPrompt = options.systemPrompt || messages.find(m => m.role === 'system')?.content;
  const conversationMessages = messages.filter(m => m.role !== 'system');

  let fullContent = '';
  let usage = { inputTokens: 0, outputTokens: 0 };

  const stream = anthropic.messages.stream({
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

  return {
    content: fullContent,
    model: finalMessage.model,
    provider: 'anthropic',
    usage,
  };
}
