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
  Session,
  CreateSessionInput,
  UpdateSessionInput,
  SessionTranscript,
  SessionMessageResponse,
  PaginatedResponse,
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
}

export const api = new ApiService();
