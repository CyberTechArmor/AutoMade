export interface User {
  id: string;
  email: string;
  displayName: string;
  role: string;
  mfaEnabled?: boolean;
  timezone?: string;
  avatarUrl?: string | null;
  createdAt?: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface MfaRequiredResponse {
  mfaRequired: true;
  mfaToken: string;
  user: {
    id: string;
    email: string;
  };
}

export interface MfaSetupResponse {
  secret: string;
  qrCode: string;
  uri: string;
}

export interface MfaCompleteResponse {
  enabled: boolean;
  backupCodes: string[];
}

export type LoginResponse = AuthResponse | MfaRequiredResponse;

export interface ApiError {
  code: string;
  message: string;
}

// Pagination
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Client types
export interface BillingAddress {
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

export interface Client {
  id: string;
  name: string;
  description?: string | null;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  website?: string | null;
  industry?: string | null;
  logoUrl?: string | null;
  billingAddress?: BillingAddress | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateClientInput {
  name: string;
  description?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  website?: string;
  industry?: string;
  notes?: string;
}

export interface UpdateClientInput extends Partial<CreateClientInput> {}

// Project types
export type ProjectStage = 'discovery' | 'proposal' | 'contract' | 'development' | 'delivery' | 'maintenance' | 'closed';

export interface ProjectOverview {
  problem?: string;
  goals?: string[];
  nonGoals?: string[];
  constraints?: string[];
  successCriteria?: string[];
}

export interface Project {
  id: string;
  clientId: string;
  name: string;
  description?: string | null;
  stage: ProjectStage;
  startDate?: string | null;
  targetDate?: string | null;
  completedDate?: string | null;
  repositoryUrl?: string | null;
  documentationUrl?: string | null;
  productionUrl?: string | null;
  stagingUrl?: string | null;
  estimatedHours?: number | null;
  actualHours: number;
  estimatedCost?: number | null;
  actualCost: number;
  overview?: ProjectOverview | null;
  tags?: string[];
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  client?: Client;
  milestones?: ProjectMilestone[];
  sessions?: Session[];
}

export interface ProjectMilestone {
  id: string;
  projectId: string;
  name: string;
  description?: string | null;
  targetDate?: string | null;
  completedDate?: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectInput {
  clientId: string;
  name: string;
  description?: string;
  stage?: ProjectStage;
  startDate?: string;
  targetDate?: string;
  repositoryUrl?: string;
  estimatedHours?: number;
  estimatedCost?: number;
  tags?: string[];
  notes?: string;
}

export interface UpdateProjectInput {
  name?: string;
  description?: string;
  stage?: ProjectStage;
  startDate?: string | null;
  targetDate?: string | null;
  completedDate?: string | null;
  repositoryUrl?: string | null;
  documentationUrl?: string | null;
  productionUrl?: string | null;
  stagingUrl?: string | null;
  estimatedHours?: number | null;
  actualHours?: number;
  estimatedCost?: number | null;
  actualCost?: number;
  overview?: ProjectOverview;
  tags?: string[];
  notes?: string | null;
}

// Session types
export type SessionState = 'scheduled' | 'pending' | 'in_progress' | 'paused' | 'completed' | 'cancelled';
export type SessionType = 'voice' | 'video' | 'text' | 'hybrid';

export interface SessionConfig {
  maxDuration?: number;
  recordingEnabled?: boolean;
  transcriptionEnabled?: boolean;
  llmModel?: string;
  voiceId?: string;
}

export interface SessionOutput {
  summary?: string;
  keyInsights?: string[];
  actionItems?: string[];
  nextSteps?: string[];
}

export interface Session {
  id: string;
  projectId: string;
  title: string;
  description?: string | null;
  type: SessionType;
  state: SessionState;
  scheduledAt?: string | null;
  startedAt?: string | null;
  endedAt?: string | null;
  duration?: number | null;
  facilitatorId?: string | null;
  isAutonomous: boolean;
  llmProvider?: string | null;
  livekitRoom?: string | null;
  recordingUrl?: string | null;
  config?: SessionConfig | null;
  output?: SessionOutput | null;
  createdAt: string;
  updatedAt: string;
  project?: Project;
  participants?: SessionParticipant[];
  transcripts?: SessionTranscript[];
}

export interface SessionParticipant {
  id: string;
  sessionId: string;
  userId?: string | null;
  email: string;
  displayName?: string | null;
  joinedAt?: string | null;
  leftAt?: string | null;
  role: string;
  createdAt: string;
}

export interface SessionTranscript {
  id: string;
  sessionId: string;
  speakerId: string;
  speakerType: 'human' | 'llm';
  speakerName?: string | null;
  content: string;
  timestampMs: number;
  confidence?: string | null;
  flagged: boolean;
  flagReason?: string | null;
  createdAt: string;
}

export interface CreateSessionInput {
  projectId: string;
  title: string;
  description?: string;
  type?: SessionType;
  scheduledAt?: string;
  isAutonomous?: boolean;
  config?: SessionConfig;
}

export interface UpdateSessionInput {
  title?: string;
  description?: string;
  type?: SessionType;
  state?: SessionState;
  scheduledAt?: string | null;
  config?: SessionConfig;
  output?: SessionOutput;
}

export interface SessionMessageResponse {
  role: 'assistant';
  content: string;
  transcript: SessionTranscript;
}
