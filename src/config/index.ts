import 'dotenv/config';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optionalEnv(name: string, defaultValue: string): string {
  return process.env[name] ?? defaultValue;
}

export const config = {
  env: optionalEnv('NODE_ENV', 'development'),
  port: parseInt(optionalEnv('PORT', '3000'), 10),
  host: optionalEnv('HOST', '0.0.0.0'),

  api: {
    url: optionalEnv('API_URL', 'http://localhost:3000'),
    frontendUrl: optionalEnv('FRONTEND_URL', 'http://localhost:5173'),
  },

  database: {
    url: requireEnv('DATABASE_URL'),
  },

  redis: {
    url: optionalEnv('REDIS_URL', 'redis://localhost:6379'),
  },

  jwt: {
    secret: requireEnv('JWT_SECRET'),
    issuer: optionalEnv('JWT_ISSUER', 'automade'),
    accessExpiry: optionalEnv('JWT_ACCESS_EXPIRY', '15m'),
    refreshExpiry: optionalEnv('JWT_REFRESH_EXPIRY', '7d'),
  },

  encryption: {
    key: process.env.ENCRYPTION_KEY ?? '',
  },

  llm: {
    anthropic: {
      apiKey: process.env.ANTHROPIC_API_KEY ?? '',
    },
    openai: {
      apiKey: process.env.OPENAI_API_KEY ?? '',
    },
    google: {
      apiKey: process.env.GOOGLE_AI_API_KEY ?? '',
    },
  },

  livekit: {
    apiKey: process.env.LIVEKIT_API_KEY ?? '',
    apiSecret: process.env.LIVEKIT_API_SECRET ?? '',
    url: process.env.LIVEKIT_URL ?? '',
  },

  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID ?? '',
    authToken: process.env.TWILIO_AUTH_TOKEN ?? '',
    phoneNumber: process.env.TWILIO_PHONE_NUMBER ?? '',
  },

  elevenlabs: {
    apiKey: process.env.ELEVENLABS_API_KEY ?? '',
    voiceId: process.env.ELEVENLABS_VOICE_ID ?? '',
  },

  s3: {
    endpoint: process.env.S3_ENDPOINT ?? '',
    accessKey: process.env.S3_ACCESS_KEY ?? '',
    secretKey: process.env.S3_SECRET_KEY ?? '',
    bucket: optionalEnv('S3_BUCKET', 'automade'),
    region: optionalEnv('S3_REGION', 'garage'),
  },

  storage: {
    provider: optionalEnv('STORAGE_PROVIDER', 'local') as 'local' | 's3',
    localPath: optionalEnv('STORAGE_LOCAL_PATH', './data'),
  },

  logging: {
    level: optionalEnv('LOG_LEVEL', 'info'),
  },
} as const;

export type Config = typeof config;
