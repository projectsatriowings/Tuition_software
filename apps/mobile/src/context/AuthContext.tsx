import React, { createContext, useContext, useState, useEffect } from 'react';
import { mobileApiFetch, setApiBaseUrl, getApiBaseUrl } from '../services/api';
import { MobileStorage } from '../services/storage';
import { AppConfig } from '../config/index';

export interface MobileUser {
  id: string;
  fullName: string;
  email?: string | null;
  phone?: string | null;
  role: 'SUPER_ADMIN' | 'ACADEMIC_ADMIN' | 'STAFF' | 'PARENT' | 'STUDENT';
  instituteId?: string | null;
  mustChangePassword?: boolean;
}

export interface MobileInstitute {
  id: string;
  code: string;
  name: string;
}

interface AuthContextType {
  user: MobileUser | null;
  institute: MobileInstitute | null;
  loading: boolean;
  isLoading: boolean;
  isAuthenticated: boolean;
  mustChangePassword: boolean;
  needsPasswordChange: boolean;
  apiBaseUrl: string;
  customHost: string;
  login: (identifier: string, password: string, instituteCode?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  updateApiBaseUrl: (newUrl: string) => void;
  setCustomHost: (newUrl: string) => void;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<MobileUser | null>(null);
  const [institute, setInstitute] = useState<MobileInstitute | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [mustChangePassword, setMustChangePassword] = useState<boolean>(false);
  const [apiBaseUrl, setApiBaseUrlState] = useState<string>(getApiBaseUrl());

  useEffect(() => {
    checkExistingSession();
  }, []);

  const checkExistingSession = async () => {
    try {
      setLoading(true);
      const token = await MobileStorage.getItem(AppConfig.storageKeys.accessToken);
      const cachedUser = await MobileStorage.getItem(AppConfig.storageKeys.userProfile);
      const cachedInst = await MobileStorage.getItem(AppConfig.storageKeys.activeInstitute);

      if (token && cachedUser) {
        setUser(JSON.parse(cachedUser));
        if (cachedInst) setInstitute(JSON.parse(cachedInst));

        // Background verification
        const meRes = await mobileApiFetch('/auth/me');
        if (meRes.success && meRes.data?.user) {
          setUser(meRes.data.user);
          setMustChangePassword(!!meRes.data.user.mustChangePassword);
          await MobileStorage.setItem(AppConfig.storageKeys.userProfile, JSON.stringify(meRes.data.user));
        } else if (!meRes.success && meRes.error?.includes('401')) {
          await logout();
        }
      }
    } catch (e) {
      console.warn('Session restoration failed', e);
    } finally {
      setLoading(false);
    }
  };

  const login = async (
    identifier: string,
    password: string,
    instituteCode?: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await mobileApiFetch('/auth/login', {
        method: 'POST',
        body: {
          identifier: identifier.trim(),
          password,
          instituteCode: instituteCode?.trim() || undefined,
        },
      });

      if (res.success && res.data) {
        const { accessToken, refreshToken, user: authUser, institute: authInst, mustChangePassword: needChange } = res.data;

        await MobileStorage.setItem(AppConfig.storageKeys.accessToken, accessToken);
        if (refreshToken) {
          await MobileStorage.setItem(AppConfig.storageKeys.refreshToken, refreshToken);
        }
        await MobileStorage.setItem(AppConfig.storageKeys.userProfile, JSON.stringify(authUser));
        if (authInst) {
          await MobileStorage.setItem(AppConfig.storageKeys.activeInstitute, authInst.id);
        }

        setUser(authUser);
        setInstitute(authInst || null);
        setMustChangePassword(!!needChange);

        return { success: true };
      }

      return { success: false, error: res.error || 'Authentication failed' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Login request error' };
    }
  };

  const logout = async () => {
    await MobileStorage.removeItem(AppConfig.storageKeys.accessToken);
    await MobileStorage.removeItem(AppConfig.storageKeys.refreshToken);
    await MobileStorage.removeItem(AppConfig.storageKeys.userProfile);
    await MobileStorage.removeItem(AppConfig.storageKeys.activeInstitute);
    setUser(null);
    setInstitute(null);
    setMustChangePassword(false);
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    try {
      const res = await mobileApiFetch('/auth/change-password', {
        method: 'POST',
        body: { currentPassword, newPassword },
      });
      if (res.success) {
        setMustChangePassword(false);
        if (user) {
          setUser({ ...user, mustChangePassword: false });
        }
        return { success: true };
      }
      return { success: false, error: res.error || 'Failed to update password' };
    } catch (e: any) {
      return { success: false, error: e.message || 'Error updating password' };
    }
  };

  const updateApiBaseUrl = (newUrl: string) => {
    setApiBaseUrl(newUrl);
    setApiBaseUrlState(newUrl);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        institute,
        loading,
        isLoading: loading,
        isAuthenticated: !!user,
        mustChangePassword,
        needsPasswordChange: mustChangePassword,
        apiBaseUrl,
        customHost: apiBaseUrl,
        login,
        logout,
        changePassword,
        updateApiBaseUrl,
        setCustomHost: updateApiBaseUrl,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useMobileAuth = () => useContext(AuthContext);
