import { z } from 'zod';

// Provider types
export const providerTypes = [
  'llm',
  'voice',
  'transcription',
  'storage',
  'webrtc',
  'sms',
  'email',
] as const;

// Service identifiers
export const serviceIdentifiers = [
  'anthropic',
  'openai',
  'google_ai',
  'elevenlabs',
  'livekit',
  's3',
  'twilio',
  'sendgrid',
  'smtp',
] as const;

// Credential schemas for different service types
const llmCredentialsSchema = z.object({
  apiKey: z.string().min(1, 'API key is required'),
  baseUrl: z.string().url().optional(),
});

const voiceCredentialsSchema = z.object({
  apiKey: z.string().min(1, 'API key is required'),
  voiceId: z.string().optional(),
});

const storageCredentialsSchema = z.object({
  endpoint: z.string().url('Invalid endpoint URL'),
  accessKey: z.string().min(1, 'Access key is required'),
  secretKey: z.string().min(1, 'Secret key is required'),
  bucket: z.string().min(1, 'Bucket name is required'),
  region: z.string().optional(),
});

const webrtcCredentialsSchema = z.object({
  apiKey: z.string().min(1, 'API key is required'),
  apiSecret: z.string().min(1, 'API secret is required'),
  url: z.string().url('Invalid WebSocket URL'),
});

const smsCredentialsSchema = z.object({
  accountSid: z.string().min(1, 'Account SID is required'),
  authToken: z.string().min(1, 'Auth token is required'),
  phoneNumber: z.string().optional(),
});

const emailCredentialsSchema = z.object({
  apiKey: z.string().optional(),
  host: z.string().optional(),
  port: z.number().optional(),
  username: z.string().optional(),
  password: z.string().optional(),
  from: z.string().email().optional(),
});

// Generic credentials schema (validates based on type)
const credentialsSchema = z.record(z.string());

// Config schema
const configSchema = z.record(z.unknown()).optional();

// Create provider schema
export const createProviderSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required').max(100),
    type: z.enum(providerTypes),
    service: z.enum(serviceIdentifiers),
    enabled: z.boolean().optional().default(true),
    isPrimary: z.boolean().optional().default(false),
    priority: z.number().int().min(0).max(1000).optional().default(100),
    credentials: credentialsSchema,
    config: configSchema,
  }),
});

export type CreateProviderInput = z.infer<typeof createProviderSchema>['body'];

// Update provider schema
export const updateProviderSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid provider ID'),
  }),
  body: z.object({
    name: z.string().min(1).max(100).optional(),
    enabled: z.boolean().optional(),
    isPrimary: z.boolean().optional(),
    priority: z.number().int().min(0).max(1000).optional(),
    credentials: credentialsSchema.optional(),
    config: configSchema,
  }),
});

export type UpdateProviderInput = {
  params: z.infer<typeof updateProviderSchema>['params'];
  body: z.infer<typeof updateProviderSchema>['body'];
};

// Get provider schema
export const getProviderSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid provider ID'),
  }),
});

// List providers schema
export const listProvidersSchema = z.object({
  query: z.object({
    type: z.enum(providerTypes).optional(),
    service: z.enum(serviceIdentifiers).optional(),
    enabled: z.enum(['true', 'false']).optional(),
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  }),
});

export type ListProvidersQuery = z.infer<typeof listProvidersSchema>['query'];

// Test provider schema
export const testProviderSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid provider ID'),
  }),
});

// Delete provider schema
export const deleteProviderSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid provider ID'),
  }),
});

// Validation helpers for specific credential types
export function validateCredentials(
  type: typeof providerTypes[number],
  service: typeof serviceIdentifiers[number],
  credentials: Record<string, string>
): { valid: boolean; errors?: string[] } {
  try {
    switch (type) {
      case 'llm':
        llmCredentialsSchema.parse(credentials);
        break;
      case 'voice':
        voiceCredentialsSchema.parse(credentials);
        break;
      case 'storage':
        storageCredentialsSchema.parse(credentials);
        break;
      case 'webrtc':
        webrtcCredentialsSchema.parse(credentials);
        break;
      case 'sms':
        smsCredentialsSchema.parse(credentials);
        break;
      case 'email':
        emailCredentialsSchema.parse(credentials);
        break;
      default:
        // For unknown types, just ensure it's not empty
        if (Object.keys(credentials).length === 0) {
          return { valid: false, errors: ['Credentials cannot be empty'] };
        }
    }
    return { valid: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        valid: false,
        errors: error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
      };
    }
    return { valid: false, errors: ['Invalid credentials format'] };
  }
}

// Get provider usage schema
export const getProviderUsageSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid provider ID'),
  }),
  query: z.object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
  }),
});

// Get all providers usage schema
export const getAllProvidersUsageSchema = z.object({
  query: z.object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
  }),
});

// Rotate provider key schema
export const rotateProviderKeySchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid provider ID'),
  }),
  body: z.object({
    credentials: z.record(z.string()),
  }),
});

export type RotateProviderKeyInput = {
  params: z.infer<typeof rotateProviderKeySchema>['params'];
  body: z.infer<typeof rotateProviderKeySchema>['body'];
};
