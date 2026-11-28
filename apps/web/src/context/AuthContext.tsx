import React, { createContext, useState, useEffect } from 'react';
import { User } from '../types';
import { apiFetch, invalidateApiCache } from '../services/api';

export function getDefaultRouteForRole(role?: string): string {
  switch (role) {
    case 'SUPER_ADMIN':
      return '/super_admin_dashboard';
    case 'ACADEMIC_ADMIN':
      return '/academic_dashboard';
    case 'STAFF':
      return '/my_attendance';
    case 'PARENT':
      return '/parent_dashboard';
    case 'STUDENT':
      return '/student_portal';
    default:
      return '/academic_dashboard';
  }
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  activeInstitute: { id: string; name: string; code: string } | null;
  loading: boolean;
  login: (token: string, user: User, institute?: { id: string; name: string; code: string } | null) => void;
  logout: () => void;
  setActiveInstitute: (institute: { id: string; name: string; code: string } | null) => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('tuition_token'));
  const [activeInstitute, setActiveInstituteState] = useState<{ id: string; name: string; code: string } | null>(() => {
    const saved = localStorage.getItem('tuition_active_institute');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const handleStorageSync = (e: StorageEvent) => {
      if (e.key === 'tuition_token') {
        const nextToken = e.newValue;
        setToken(nextToken);
        if (!nextToken) {
          setUser(null);
          setActiveInstituteState(null);
          invalidateApiCache();
        }
      }
    };
    window.addEventListener('storage', handleStorageSync);
    return () => window.removeEventListener('storage', handleStorageSync);
  }, []);

  useEffect(() => {
    if (token) {
      apiFetch('/auth/me')
        .then((res) => {
          if (res.data?.user) {
            setUser(res.data.user);
            const targetInst = activeInstitute || res.data.user.memberships?.[0]?.institute;
            if (targetInst) {
              setActiveInstituteState(targetInst);
              localStorage.setItem('tuition_active_institute', JSON.stringify(targetInst));
              localStorage.setItem('tuition_active_institute_id', targetInst.id);
            }
          }
        })
        .catch(() => {
          logout();
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = (newToken: string, newUser: User, institute?: { id: string; name: string; code: string } | null) => {
    invalidateApiCache();
    localStorage.removeItem('tuition_access_token');
    localStorage.removeItem('tuition_mobile_access_token');
    localStorage.removeItem('token');
    localStorage.removeItem('accessToken');
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('tuition_token', newToken);
    localStorage.setItem('tuition_user', JSON.stringify(newUser));

    if (institute) {
      setActiveInstituteState(institute);
      localStorage.setItem('tuition_active_institute', JSON.stringify(institute));
      localStorage.setItem('tuition_active_institute_id', institute.id);
    } else {
      setActiveInstituteState(null);
      localStorage.removeItem('tuition_active_institute');
      localStorage.removeItem('tuition_active_institute_id');
    }

    if (typeof window !== 'undefined') {
      window.history.replaceState({}, '', getDefaultRouteForRole(newUser.role));
    }
  };

  const logout = () => {
    invalidateApiCache();
    setUser(null);
    setToken(null);
    setActiveInstituteState(null);
    localStorage.removeItem('tuition_token');
    localStorage.removeItem('tuition_access_token');
    localStorage.removeItem('tuition_mobile_access_token');
    localStorage.removeItem('token');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('tuition_user');
    localStorage.removeItem('tuition_mobile_user');
    localStorage.removeItem('tuition_active_institute');
    localStorage.removeItem('tuition_mobile_institute');
    localStorage.removeItem('tuition_active_institute_id');
    localStorage.removeItem('tuition_active_branch_id');
    if (typeof window !== 'undefined') {
      window.history.replaceState({}, '', '/');
    }
  };

  const setActiveInstitute = (institute: { id: string; name: string; code: string } | null) => {
    setActiveInstituteState(institute);
    if (institute) {
      localStorage.setItem('tuition_active_institute', JSON.stringify(institute));
      localStorage.setItem('tuition_active_institute_id', institute.id);
    } else {
      localStorage.removeItem('tuition_active_institute');
      localStorage.removeItem('tuition_active_institute_id');
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, activeInstitute, loading, login, logout, setActiveInstitute }}>
      {children}
    </AuthContext.Provider>
  );
};
