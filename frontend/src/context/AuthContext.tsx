import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { api } from '../services/api';
import type { User, AuthResponse, MfaRequiredResponse } from '../types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  mfaPending: MfaRequiredResponse | null;
  login: (email: string, password: string) => Promise<boolean>;
  verifyMfa: (code: string) => Promise<void>;
  verifyBackupCode: (code: string) => Promise<void>;
  cancelMfa: () => void;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mfaPending, setMfaPending] = useState<MfaRequiredResponse | null>(null);

  const refreshUser = useCallback(async () => {
    try {
      if (!api.getAccessToken()) {
        setUser(null);
        return;
      }
      const userData = await api.getMe();
      setUser(userData);
    } catch {
      setUser(null);
      api.clearTokens();
    }
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      setIsLoading(true);
      await refreshUser();
      setIsLoading(false);
    };
    initAuth();
  }, [refreshUser]);

  const login = async (email: string, password: string): Promise<boolean> => {
    const response = await api.login(email, password);

    // Check if MFA is required
    if ('mfaRequired' in response && response.mfaRequired) {
      setMfaPending(response);
      return false; // MFA step required
    }

    // Full auth response - no MFA
    const authResponse = response as AuthResponse;
    api.setTokens(authResponse.accessToken, authResponse.refreshToken);
    setUser(authResponse.user);
    setMfaPending(null);
    return true;
  };

  const verifyMfa = async (code: string) => {
    if (!mfaPending) {
      throw new Error('No MFA verification pending');
    }

    const response = await api.verifyMfa(mfaPending.mfaToken, code);
    api.setTokens(response.accessToken, response.refreshToken);
    setUser(response.user);
    setMfaPending(null);
  };

  const verifyBackupCode = async (code: string) => {
    if (!mfaPending) {
      throw new Error('No MFA verification pending');
    }

    const response = await api.verifyBackupCode(mfaPending.mfaToken, code);
    api.setTokens(response.accessToken, response.refreshToken);
    setUser(response.user);
    setMfaPending(null);
  };

  const cancelMfa = () => {
    setMfaPending(null);
  };

  const register = async (email: string, password: string, displayName: string) => {
    const response = await api.register(email, password, displayName);
    api.setTokens(response.accessToken, response.refreshToken);
    setUser(response.user);
  };

  const logout = async () => {
    await api.logout();
    setUser(null);
    setMfaPending(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        mfaPending,
        login,
        verifyMfa,
        verifyBackupCode,
        cancelMfa,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
