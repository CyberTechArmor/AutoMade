import type {
  AuthResponse,
  LoginResponse,
  MfaSetupResponse,
  MfaCompleteResponse,
  User,
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
}

export const api = new ApiService();
