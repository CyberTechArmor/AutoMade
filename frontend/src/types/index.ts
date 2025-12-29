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
