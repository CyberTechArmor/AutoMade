import type {
  AuthResponse,
  LoginResponse,
  MfaSetupResponse,
  MfaCompleteResponse,
  User,
  Client,
  CreateClientInput,
  UpdateClientInput,
  Project,
  CreateProjectInput,
  UpdateProjectInput,
  ProjectMilestone,
  CreateMilestoneInput,
  Session,
  CreateSessionInput,
  UpdateSessionInput,
  SessionTranscript,
  SessionMessageResponse,
  PaginatedResponse,
  Document,
  CreateDocumentInput,
  DocumentVersion,
  DocumentAttachment,
  TimeEntry,
  ProjectMetrics,
  CreateTimeEntryInput,
  CalendarEvent,
  SearchResponse,
  Recording,
  Provider,
  CreateProviderInput,
} from '../types';

const API_BASE = '/api';

class ApiService {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private refreshPromise: Promise<boolean> | null = null;

  constructor() {
    this.accessToken = localStorage.getItem('accessToken');
    this.refreshToken = localStorage.getItem('refreshToken');
  }

  setTokens(accessToken: string, refreshToken: string) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
  }

  clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.accessToken) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${this.accessToken}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    // Handle 401 - try to refresh token
    if (response.status === 401 && this.refreshToken) {
      const refreshed = await this.tryRefreshToken();
      if (refreshed) {
        // Retry the request with new token
        (headers as Record<string, string>)['Authorization'] = `Bearer ${this.accessToken}`;
        const retryResponse = await fetch(`${API_BASE}${endpoint}`, {
          ...options,
          headers,
        });
        if (!retryResponse.ok) {
          const error = await retryResponse.json();
          throw new Error(error.message || 'Request failed');
        }
        return retryResponse.json();
      }
    }

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Request failed');
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return undefined as T;
    }

    return response.json();
  }

  private async tryRefreshToken(): Promise<boolean> {
    // Prevent multiple simultaneous refresh attempts
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = (async () => {
      try {
        const response = await fetch(`${API_BASE}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: this.refreshToken }),
        });

        if (!response.ok) {
          this.clearTokens();
          return false;
        }

        const data = await response.json();
        this.setTokens(data.accessToken, data.refreshToken);
        return true;
      } catch {
        this.clearTokens();
        return false;
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  // Auth endpoints
  async login(email: string, password: string): Promise<LoginResponse> {
    return this.request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async verifyMfa(mfaToken: string, code: string): Promise<AuthResponse> {
    return this.request<AuthResponse>('/auth/mfa/verify', {
      method: 'POST',
      body: JSON.stringify({ mfaToken, code }),
    });
  }

  async verifyBackupCode(mfaToken: string, backupCode: string): Promise<AuthResponse> {
    return this.request<AuthResponse>('/auth/mfa/backup', {
      method: 'POST',
      body: JSON.stringify({ mfaToken, backupCode }),
    });
  }

  async register(
    email: string,
    password: string,
    displayName: string
  ): Promise<AuthResponse> {
    return this.request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, displayName }),
    });
  }

  async logout(): Promise<void> {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } finally {
      this.clearTokens();
    }
  }

  async getMe(): Promise<User> {
    return this.request<User>('/auth/me');
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await this.request('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  }

  // MFA setup endpoints
  async beginMfaSetup(): Promise<MfaSetupResponse> {
    return this.request<MfaSetupResponse>('/auth/mfa/setup', {
      method: 'POST',
    });
  }

  async completeMfaSetup(code: string): Promise<MfaCompleteResponse> {
    return this.request<MfaCompleteResponse>('/auth/mfa/setup/complete', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
  }

  async disableMfa(password: string): Promise<void> {
    await this.request('/auth/mfa/disable', {
      method: 'POST',
      body: JSON.stringify({ password }),
    });
  }

  // Client endpoints
  async listClients(params?: {
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<Client>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    const query = searchParams.toString();
    return this.request<PaginatedResponse<Client>>(`/clients${query ? `?${query}` : ''}`);
  }

  async getClient(id: string): Promise<Client> {
    return this.request<Client>(`/clients/${id}`);
  }

  async createClient(data: CreateClientInput): Promise<Client> {
    return this.request<Client>('/clients', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateClient(id: string, data: UpdateClientInput): Promise<Client> {
    return this.request<Client>(`/clients/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteClient(id: string): Promise<void> {
    await this.request(`/clients/${id}`, { method: 'DELETE' });
  }

  // Project endpoints
  async listProjects(params?: {
    clientId?: string;
    stage?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<Project>> {
    const searchParams = new URLSearchParams();
    if (params?.clientId) searchParams.set('clientId', params.clientId);
    if (params?.stage) searchParams.set('stage', params.stage);
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    const query = searchParams.toString();
    return this.request<PaginatedResponse<Project>>(`/projects${query ? `?${query}` : ''}`);
  }

  async getProject(id: string): Promise<Project> {
    return this.request<Project>(`/projects/${id}`);
  }

  async createProject(data: CreateProjectInput): Promise<Project> {
    return this.request<Project>('/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateProject(id: string, data: UpdateProjectInput): Promise<Project> {
    return this.request<Project>(`/projects/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteProject(id: string): Promise<void> {
    await this.request(`/projects/${id}`, { method: 'DELETE' });
  }

  // Session endpoints
  async listSessions(params?: {
    projectId?: string;
    state?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<Session>> {
    const searchParams = new URLSearchParams();
    if (params?.projectId) searchParams.set('projectId', params.projectId);
    if (params?.state) searchParams.set('state', params.state);
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    const query = searchParams.toString();
    return this.request<PaginatedResponse<Session>>(`/sessions${query ? `?${query}` : ''}`);
  }

  async getSession(id: string): Promise<Session> {
    return this.request<Session>(`/sessions/${id}`);
  }

  async createSession(data: CreateSessionInput): Promise<Session> {
    return this.request<Session>('/sessions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateSession(id: string, data: UpdateSessionInput): Promise<Session> {
    return this.request<Session>(`/sessions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async startSession(id: string): Promise<Session> {
    return this.request<Session>(`/sessions/${id}/start`, {
      method: 'POST',
    });
  }

  async endSession(id: string): Promise<Session> {
    return this.request<Session>(`/sessions/${id}/end`, {
      method: 'POST',
    });
  }

  async getSessionTranscripts(id: string): Promise<SessionTranscript[]> {
    return this.request<SessionTranscript[]>(`/sessions/${id}/transcripts`);
  }

  async sendSessionMessage(id: string, content: string): Promise<SessionMessageResponse> {
    return this.request<SessionMessageResponse>(`/sessions/${id}/message`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  }

  async summarizeSession(id: string): Promise<Session['output']> {
    return this.request<Session['output']>(`/sessions/${id}/summarize`, {
      method: 'POST',
    });
  }

  // LiveKit endpoints
  async getSessionToken(sessionId: string, options?: { canPublish?: boolean; canSubscribe?: boolean }): Promise<{ token: string }> {
    return this.request<{ token: string }>(`/sessions/${sessionId}/token`, {
      method: 'POST',
      body: JSON.stringify(options || {}),
    });
  }

  async createSessionRoom(sessionId: string): Promise<{ roomName: string; roomSid: string }> {
    return this.request<{ roomName: string; roomSid: string }>(`/sessions/${sessionId}/room`, {
      method: 'POST',
    });
  }

  async getSessionRoomStatus(sessionId: string): Promise<{
    exists: boolean;
    numParticipants: number;
    participants: Array<{ identity: string; name: string; joinedAt: number; isPublisher: boolean }>;
  }> {
    return this.request(`/sessions/${sessionId}/room`);
  }

  // Document endpoints
  async listDocuments(projectId: string, params?: { type?: string; state?: string; page?: number; limit?: number }): Promise<PaginatedResponse<Document>> {
    const searchParams = new URLSearchParams();
    if (params?.type) searchParams.set('type', params.type);
    if (params?.state) searchParams.set('state', params.state);
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    const query = searchParams.toString();
    return this.request<PaginatedResponse<Document>>(`/projects/${projectId}/documents${query ? `?${query}` : ''}`);
  }

  async getDocument(projectId: string, documentId: string): Promise<{ document: Document; versions: DocumentVersion[]; attachments: DocumentAttachment[] }> {
    return this.request(`/projects/${projectId}/documents/${documentId}`);
  }

  async createDocument(projectId: string, data: CreateDocumentInput): Promise<Document> {
    return this.request<Document>(`/projects/${projectId}/documents`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateDocument(projectId: string, documentId: string, data: Partial<Document>): Promise<Document> {
    return this.request<Document>(`/projects/${projectId}/documents/${documentId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async createDocumentVersion(projectId: string, documentId: string, data: { content: string; changeReason?: string }): Promise<DocumentVersion> {
    return this.request<DocumentVersion>(`/projects/${projectId}/documents/${documentId}/versions`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteDocument(projectId: string, documentId: string): Promise<void> {
    await this.request(`/projects/${projectId}/documents/${documentId}`, { method: 'DELETE' });
  }

  // Milestone endpoints
  async listMilestones(projectId: string): Promise<{ data: ProjectMilestone[] }> {
    return this.request(`/projects/${projectId}/milestones`);
  }

  async createMilestone(projectId: string, data: CreateMilestoneInput): Promise<ProjectMilestone> {
    return this.request<ProjectMilestone>(`/projects/${projectId}/milestones`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateMilestone(projectId: string, milestoneId: string, data: Partial<ProjectMilestone>): Promise<ProjectMilestone> {
    return this.request<ProjectMilestone>(`/projects/${projectId}/milestones/${milestoneId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteMilestone(projectId: string, milestoneId: string): Promise<void> {
    await this.request(`/projects/${projectId}/milestones/${milestoneId}`, { method: 'DELETE' });
  }

  async reorderMilestones(projectId: string, milestoneIds: string[]): Promise<{ data: ProjectMilestone[] }> {
    return this.request(`/projects/${projectId}/milestones/reorder`, {
      method: 'POST',
      body: JSON.stringify({ milestoneIds }),
    });
  }

  // Metrics endpoints
  async getProjectMetrics(projectId: string, params?: { startDate?: string; endDate?: string }): Promise<ProjectMetrics> {
    const searchParams = new URLSearchParams();
    if (params?.startDate) searchParams.set('startDate', params.startDate);
    if (params?.endDate) searchParams.set('endDate', params.endDate);
    const query = searchParams.toString();
    return this.request<ProjectMetrics>(`/projects/${projectId}/metrics${query ? `?${query}` : ''}`);
  }

  async listTimeEntries(projectId: string, params?: { startDate?: string; endDate?: string; page?: number; limit?: number }): Promise<PaginatedResponse<TimeEntry>> {
    const searchParams = new URLSearchParams();
    if (params?.startDate) searchParams.set('startDate', params.startDate);
    if (params?.endDate) searchParams.set('endDate', params.endDate);
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    const query = searchParams.toString();
    return this.request<PaginatedResponse<TimeEntry>>(`/projects/${projectId}/metrics/time-entries${query ? `?${query}` : ''}`);
  }

  async createTimeEntry(projectId: string, data: CreateTimeEntryInput): Promise<TimeEntry> {
    return this.request<TimeEntry>(`/projects/${projectId}/metrics/time-entries`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Search endpoint
  async search(query: string, params?: { types?: string; page?: number; limit?: number }): Promise<SearchResponse> {
    const searchParams = new URLSearchParams();
    searchParams.set('q', query);
    if (params?.types) searchParams.set('types', params.types);
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    return this.request(`/search?${searchParams.toString()}`);
  }

  // Calendar endpoints
  async getCalendarEvents(start: string, end: string, projectId?: string): Promise<{ data: CalendarEvent[] }> {
    const searchParams = new URLSearchParams();
    searchParams.set('start', start);
    searchParams.set('end', end);
    if (projectId) searchParams.set('projectId', projectId);
    return this.request(`/calendar/events?${searchParams.toString()}`);
  }

  // Recording endpoints
  async listRecordings(sessionId: string): Promise<{ data: Recording[] }> {
    return this.request(`/sessions/${sessionId}/recordings`);
  }

  async getTranscript(sessionId: string, format: 'json' | 'text' | 'vtt' | 'srt' = 'json'): Promise<{ data: SessionTranscript[] } | string> {
    return this.request(`/sessions/${sessionId}/recordings/transcript?format=${format}`);
  }

  // Provider endpoints
  async listProviders(): Promise<{ data: Provider[] }> {
    return this.request('/providers');
  }

  async getProvider(id: string): Promise<Provider> {
    return this.request<Provider>(`/providers/${id}`);
  }

  async createProvider(data: CreateProviderInput): Promise<Provider> {
    return this.request<Provider>('/providers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateProvider(id: string, data: Partial<CreateProviderInput>): Promise<Provider> {
    return this.request<Provider>(`/providers/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteProvider(id: string): Promise<void> {
    await this.request(`/providers/${id}`, { method: 'DELETE' });
  }

  async rotateProviderKey(id: string, newApiKey: string): Promise<Provider> {
    return this.request<Provider>(`/providers/${id}/rotate-key`, {
      method: 'POST',
      body: JSON.stringify({ apiKey: newApiKey }),
    });
  }

  async testProvider(id: string): Promise<{ success: boolean; message: string }> {
    return this.request(`/providers/${id}/test`, { method: 'POST' });
  }
}

export const api = new ApiService();
