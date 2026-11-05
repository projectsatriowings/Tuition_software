import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { mobileApiFetch, setApiBaseUrl, getApiBaseUrl, setActiveBranchId } from '../services/api';
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
  memberships?: Array<{
    id: string;
    role: string;
    institute: MobileInstitute;
  }>;
}

export interface MobileInstitute {
  id: string;
  code: string;
  name: string;
}

export interface MobileBranch {
  id: string;
  instituteId: string;
  name: string;
  code: string;
  isDefault: boolean;
  isActive: boolean;
  address?: string | null;
  city?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  geofenceRadius?: number;
}

export interface PendingAuthSession {
  accessToken: string;
  refreshToken?: string;
  user: MobileUser;
  memberships: Array<{
    id: string;
    role: string;
    institute: MobileInstitute;
  }>;
  mustChangePassword?: boolean;
}

interface AuthContextType {
  user: MobileUser | null;
  institute: MobileInstitute | null;
  branches: MobileBranch[];
  activeBranch: MobileBranch | null;
  loading: boolean;
  isLoading: boolean;
  isAuthenticated: boolean;
  mustChangePassword: boolean;
  needsPasswordChange: boolean;
  apiBaseUrl: string;
  customHost: string;
  pendingAuthSession: PendingAuthSession | null;
  login: (
    identifier: string,
    password: string,
    instituteCode?: string
  ) => Promise<{ success: boolean; error?: string; pendingAuth?: boolean }>;
  selectInstituteAndCompleteLogin: (selectedInstitute: MobileInstitute) => Promise<void>;
  cancelPendingAuth: () => void;
  switchInstitute: (newInst: MobileInstitute) => Promise<void>;
  selectBranch: (branch: MobileBranch | null) => Promise<void>;
  loadBranches: () => Promise<void>;
  logout: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  updateApiBaseUrl: (newUrl: string) => void;
  setCustomHost: (newUrl: string) => void;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const isStaffManagedRole = (role?: string | null): boolean => {
  return role === 'STUDENT' || role === 'PARENT';
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<MobileUser | null>(null);
  const [institute, setInstitute] = useState<MobileInstitute | null>(null);
  const [branches, setBranches] = useState<MobileBranch[]>([]);
  const [activeBranch, setActiveBranch] = useState<MobileBranch | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [mustChangePassword, setMustChangePassword] = useState<boolean>(false);
  const [apiBaseUrl, setApiBaseUrlState] = useState<string>(getApiBaseUrl());
  const [pendingAuthSession, setPendingAuthSession] = useState<PendingAuthSession | null>(null);

  const loadBranches = useCallback(async () => {
    try {
      const res = await mobileApiFetch('/branches', { skipCache: true });
      if (res.success && Array.isArray(res.data)) {
        const branchList = res.data as MobileBranch[];
        setBranches(branchList);

        const storedBranchId = await MobileStorage.getItem(AppConfig.storageKeys.activeBranch);
        if (storedBranchId && storedBranchId !== 'all') {
          const matched = branchList.find((b) => b.id === storedBranchId);
          if (matched) {
            setActiveBranch(matched);
            await setActiveBranchId(matched.id);
            return;
          }
        }

        // If only 1 branch exists (HQ), set as default
        if (branchList.length === 1) {
          setActiveBranch(branchList[0]);
          await setActiveBranchId(branchList[0].id);
        } else {
          setActiveBranch(null);
          await setActiveBranchId(null);
        }
      }
    } catch {
      // Non-blocking error for branch fetch
    }
  }, []);

  const selectBranch = async (branch: MobileBranch | null) => {
    setActiveBranch(branch);
    if (branch) {
      await setActiveBranchId(branch.id);
      await MobileStorage.setItem(AppConfig.storageKeys.activeBranch, branch.id);
    } else {
      await setActiveBranchId(null);
      await MobileStorage.removeItem(AppConfig.storageKeys.activeBranch);
    }
  };

  useEffect(() => {
    checkExistingSession();
  }, []);

  useEffect(() => {
    if (institute?.id) {
      loadBranches();
    }
  }, [institute?.id, loadBranches]);

  const checkExistingSession = async () => {
    try {
      setLoading(true);
      const token = await MobileStorage.getItem(AppConfig.storageKeys.accessToken);
      const cachedUser = await MobileStorage.getItem(AppConfig.storageKeys.userProfile);
      const cachedInst = await MobileStorage.getItem(AppConfig.storageKeys.activeInstitute);

      if (token && cachedUser) {
        try {
          const parsedUser = JSON.parse(cachedUser);
          setUser(parsedUser);
          setMustChangePassword(!isStaffManagedRole(parsedUser.role) && !!parsedUser.mustChangePassword);
        } catch {
          // ignore corrupted user json
        }

        if (cachedInst) {
          try {
            setInstitute(JSON.parse(cachedInst));
          } catch {
            setInstitute({ id: cachedInst, code: '', name: 'Selected Institute' });
          }
        }

        // Background session verification
        const meRes = await mobileApiFetch('/auth/me');
        if (meRes.success && meRes.data?.user) {
          setUser(meRes.data.user);
          setMustChangePassword(!isStaffManagedRole(meRes.data.user.role) && !!meRes.data.user.mustChangePassword);
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
  ): Promise<{ success: boolean; error?: string; pendingAuth?: boolean }> => {
    try {
      const payload: Record<string, string | undefined> = {
        identifier: identifier.trim(),
        password,
      };
      if (instituteCode && instituteCode.trim()) {
        payload.instituteCode = instituteCode.trim();
      }

      const res = await mobileApiFetch('/auth/login', {
        method: 'POST',
        body: payload,
      });

      if (res.success && res.data) {
        const { accessToken, refreshToken, user: authUser, institute: authInst, memberships, mustChangePassword: needChange } = res.data;

        if (memberships && memberships.length > 1 && !instituteCode) {
          setPendingAuthSession({
            accessToken,
            refreshToken,
            user: authUser,
            memberships,
            mustChangePassword: !!needChange,
          });
          return { success: true, pendingAuth: true };
        }

        await MobileStorage.setItem(AppConfig.storageKeys.accessToken, accessToken);
        if (refreshToken) {
          await MobileStorage.setItem(AppConfig.storageKeys.refreshToken, refreshToken);
        }
        await MobileStorage.setItem(AppConfig.storageKeys.userProfile, JSON.stringify(authUser));
        if (authInst) {
          await MobileStorage.setItem(AppConfig.storageKeys.activeInstitute, JSON.stringify(authInst));
        } else {
          await MobileStorage.removeItem(AppConfig.storageKeys.activeInstitute);
        }

        setUser(authUser);
        setInstitute(authInst || null);
        setMustChangePassword(!isStaffManagedRole(authUser.role) && !!needChange);
        setPendingAuthSession(null);

        return { success: true };
      }

      return { success: false, error: res.error || 'Authentication failed. Please verify your credentials.' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Login request error' };
    }
  };

  const selectInstituteAndCompleteLogin = async (selectedInstitute: MobileInstitute) => {
    if (!pendingAuthSession) return;
    try {
      const { accessToken, refreshToken, user: authUser, mustChangePassword: needChange } = pendingAuthSession;
      await MobileStorage.setItem(AppConfig.storageKeys.accessToken, accessToken);
      if (refreshToken) {
        await MobileStorage.setItem(AppConfig.storageKeys.refreshToken, refreshToken);
      }
      await MobileStorage.setItem(AppConfig.storageKeys.userProfile, JSON.stringify(authUser));
      await MobileStorage.setItem(AppConfig.storageKeys.activeInstitute, JSON.stringify(selectedInstitute));

      setUser(authUser);
      setInstitute(selectedInstitute);
      setMustChangePassword(!isStaffManagedRole(authUser.role) && !!needChange);
      setPendingAuthSession(null);
    } catch (e) {
      console.error('Error completing institute selection', e);
    }
  };

  const cancelPendingAuth = () => {
    setPendingAuthSession(null);
  };

  const switchInstitute = async (newInst: MobileInstitute) => {
    setInstitute(newInst);
    await MobileStorage.setItem(AppConfig.storageKeys.activeInstitute, JSON.stringify(newInst));
    await selectBranch(null);
  };

  const logout = async () => {
    await MobileStorage.removeItem(AppConfig.storageKeys.accessToken);
    await MobileStorage.removeItem(AppConfig.storageKeys.refreshToken);
    await MobileStorage.removeItem(AppConfig.storageKeys.userProfile);
    await MobileStorage.removeItem(AppConfig.storageKeys.activeInstitute);
    await MobileStorage.removeItem(AppConfig.storageKeys.activeBranch);
    await setActiveBranchId(null);
    setUser(null);
    setInstitute(null);
    setBranches([]);
    setActiveBranch(null);
    setMustChangePassword(false);
    setPendingAuthSession(null);
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    if (isStaffManagedRole(user?.role)) {
      return {
        success: false,
        error: 'Forbidden: Student and Parent credentials are managed exclusively by institute staff.',
      };
    }
    try {
      const res = await mobileApiFetch('/auth/change-password', {
        method: 'POST',
        body: { currentPassword, newPassword },
      });
      if (res.success) {
        setMustChangePassword(false);
        if (user) {
          const updatedUser = { ...user, mustChangePassword: false };
          setUser(updatedUser);
          await MobileStorage.setItem(AppConfig.storageKeys.userProfile, JSON.stringify(updatedUser));
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
        branches,
        activeBranch,
        loading,
        isLoading: loading,
        isAuthenticated: !!user,
        mustChangePassword: false,
        needsPasswordChange: false,
        apiBaseUrl,
        customHost: apiBaseUrl,
        pendingAuthSession,
        login,
        selectInstituteAndCompleteLogin,
        cancelPendingAuth,
        switchInstitute,
        selectBranch,
        loadBranches,
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
