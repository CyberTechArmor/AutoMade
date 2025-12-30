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

export interface CreateMilestoneInput {
  name: string;
  description?: string;
  targetDate?: string;
  sortOrder?: number;
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

// Document types
export type DocumentType = 'proposal' | 'contract' | 'specification' | 'report' | 'notes' | 'other';
export type DocumentState = 'draft' | 'review' | 'approved' | 'published' | 'archived';

export interface DocumentVersion {
  id: string;
  documentId: string;
  version: number;
  content: string;
  authorId: string;
  changeReason?: string | null;
  comments?: DocumentComment[];
  createdAt: string;
}

export interface DocumentComment {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  timestamp: string;
}

export interface DocumentAttachment {
  id: string;
  documentId: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  storageUrl: string;
  uploadedBy: string;
  createdAt: string;
}

export interface Document {
  id: string;
  projectId: string;
  title: string;
  type: DocumentType;
  description?: string | null;
  clientVisible: boolean;
  state: DocumentState;
  currentVersion: number;
  tags?: string[];
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentWithVersions {
  document: Document;
  versions: DocumentVersion[];
  attachments: DocumentAttachment[];
}

export interface CreateDocumentInput {
  title: string;
  type: DocumentType;
  description?: string;
  content: string;
  clientVisible?: boolean;
  tags?: string[];
}

export interface UpdateDocumentInput {
  title?: string;
  type?: DocumentType;
  description?: string | null;
  clientVisible?: boolean;
  state?: DocumentState;
  tags?: string[];
}

export interface CreateVersionInput {
  content: string;
  changeReason?: string;
}

// Metrics types
export interface TimeEntry {
  id: string;
  projectId: string;
  userId: string;
  entryDate: string;
  hours: string;
  description?: string | null;
  milestoneId?: string | null;
  billable: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CostEntry {
  id: string;
  projectId: string;
  source: 'manual' | 'twilio' | 'elevenlabs' | 'anthropic' | 'openai' | 'google' | 'livekit' | 'other';
  description: string;
  amountCents: number;
  currency: string;
  incurredAt: string;
  sessionId?: string | null;
  externalId?: string | null;
  breakdown?: {
    items?: Array<{
      name: string;
      quantity: number;
      unitPrice: number;
      total: number;
    }>;
  };
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface ProjectMetrics {
  totalHours: number;
  billableHours: number;
  totalCost: number;
  costBreakdown: {
    source: string;
    amount: number;
    percentage: number;
  }[];
  hoursOverTime: {
    date: string;
    hours: number;
  }[];
  milestoneProgress: {
    total: number;
    completed: number;
    progress: number;
  };
  estimatedVsActual: {
    estimatedHours: number | null;
    actualHours: number;
    estimatedCost: number | null;
    actualCost: number;
  };
}

export interface CreateTimeEntryInput {
  entryDate: string;
  hours: string;
  description?: string;
  milestoneId?: string;
  billable?: boolean;
}

export interface CreateCostEntryInput {
  source: CostEntry['source'];
  description: string;
  amountCents: number;
  currency?: string;
  incurredAt: string;
  sessionId?: string;
  externalId?: string;
  breakdown?: CostEntry['breakdown'];
  metadata?: Record<string, unknown>;
}

// Calendar types
export interface CalendarEvent {
  id: string;
  title: string;
  description?: string | null;
  start: string;
  end?: string | null;
  allDay: boolean;
  type: 'session' | 'milestone' | 'deadline' | 'meeting' | 'other';
  projectId?: string | null;
  sessionId?: string | null;
  milestoneId?: string | null;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEventInput {
  title: string;
  description?: string;
  start: string;
  end?: string;
  allDay?: boolean;
  type: CalendarEvent['type'];
  projectId?: string;
  sessionId?: string;
  milestoneId?: string;
  metadata?: Record<string, unknown>;
}

// Search types
export interface SearchResult {
  id: string;
  type: 'client' | 'project' | 'session' | 'document';
  title: string;
  description: string | null;
  url: string;
  highlight?: string;
  metadata?: Record<string, unknown>;
  updatedAt: string;
}

export interface SearchResponse {
  data: SearchResult[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Recording types
export interface Recording {
  id: string;
  sessionId: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  durationMs?: number | null;
  startedAt: string;
  endedAt?: string | null;
  storageUrl: string;
  transcriptUrl?: string | null;
  status: 'recording' | 'processing' | 'ready' | 'error';
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface RecordingWithTranscript {
  recording: Recording;
  transcript?: {
    entries: Array<{
      speakerId: string;
      speakerName?: string;
      content: string;
      startMs: number;
      endMs: number;
    }>;
  };
}

// Provider types
export interface Provider {
  id: string;
  name: string;
  type: 'llm' | 'voice' | 'transcription' | 'storage' | 'webrtc' | 'sms' | 'email';
  service: string;
  enabled: boolean;
  isPrimary: boolean;
  priority: number;
  config?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ProviderUsage {
  provider: Provider;
  usage: {
    totalRequests: number;
    totalCostCents: number;
    lastUsed?: string;
  };
}

export interface CreateProviderInput {
  name: string;
  type: Provider['type'];
  service: string;
  enabled?: boolean;
  isPrimary?: boolean;
  priority?: number;
  credentials: Record<string, string>;
  config?: Record<string, unknown>;
}

export interface UpdateProviderInput {
  name?: string;
  enabled?: boolean;
  isPrimary?: boolean;
  priority?: number;
  credentials?: Record<string, string>;
  config?: Record<string, unknown>;
}
