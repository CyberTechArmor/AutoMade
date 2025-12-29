import { pgEnum } from 'drizzle-orm/pg-core';

// User roles
export const userRoleEnum = pgEnum('user_role', [
  'admin',      // Fractionate founder - full access
  'manager',    // Future team members
  'client',     // Client users with portal access
]);

// Project stages
export const projectStageEnum = pgEnum('project_stage', [
  'discovery',      // Initial discovery phase
  'design',         // Design specification phase
  'development',    // Active development
  'deployment',     // Deploying to production
  'operation',      // Live and operating
  'completed',      // Project completed
  'on_hold',        // Temporarily paused
]);

// Session states
export const sessionStateEnum = pgEnum('session_state', [
  'scheduled',      // Scheduled for future
  'pending',        // Ready to start
  'in_progress',    // Currently running
  'paused',         // Temporarily paused (disconnected)
  'completed',      // Successfully completed
  'cancelled',      // Cancelled before completion
]);

// Session types
export const sessionTypeEnum = pgEnum('session_type', [
  'voice',          // Voice-only session
  'video',          // Video session
  'text',           // Text-only session
  'hybrid',         // Mixed mode
]);

// Document states
export const documentStateEnum = pgEnum('document_state', [
  'draft',          // Internal draft
  'review',         // Under review
  'approved',       // Approved internally
  'published',      // Published to client
  'archived',       // No longer active
]);

// Tracking entry types
export const trackingTypeEnum = pgEnum('tracking_type', [
  'time',           // Time entry
  'progress',       // Progress update
  'note',           // General note
  'milestone',      // Milestone reached
  'cost',           // Cost entry
]);

// Cost source types
export const costSourceEnum = pgEnum('cost_source', [
  'manual',         // Manually entered
  'twilio',         // Twilio API costs
  'elevenlabs',     // ElevenLabs voice synthesis
  'anthropic',      // Claude API
  'openai',         // OpenAI API
  'google',         // Google AI API
  'livekit',        // LiveKit usage
  'other',          // Other sources
]);

// Audit action types
export const auditActionEnum = pgEnum('audit_action', [
  'create',
  'read',
  'update',
  'delete',
  'login',
  'logout',
  'login_failed',
  'access_denied',
  'export',
  'config_change',
]);

// LLM provider types
export const llmProviderEnum = pgEnum('llm_provider', [
  'anthropic',      // Claude (primary)
  'openai',         // OpenAI (fallback)
  'google',         // Google Gemini (fallback)
]);
